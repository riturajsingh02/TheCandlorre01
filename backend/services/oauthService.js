/**
 * THE Candlorre — GOOGLE OAUTH SERVICE
 * Verifies Google tokens and authorization codes securely using Google OAuth 2.0 / Identity Services.
 */

import config from '../config/env.js';
import { AuthError } from '../utils/errors.js';

export class OAuthService {
  /**
   * Generate Google OAuth 2.0 Authorization URL
   */
  static getGoogleAuthUrl(redirectUri, state = '') {
    const clientId = config.oauth.google.clientId;
    if (!clientId) {
      throw new AuthError('Google OAuth is not configured. Missing GOOGLE_CLIENT_ID.');
    }

    const callback = redirectUri || config.oauth.google.callbackUrl;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callback,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
      state: state || 'google_auth_Candlorre'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange OAuth 2.0 authorization code for tokens and user profile
   */
  static async exchangeAuthorizationCode(code, redirectUri) {
    if (!code) {
      throw new AuthError('Authorization code is required.');
    }

    const clientId = config.oauth.google.clientId;
    const clientSecret = config.oauth.google.clientSecret;
    const callback = redirectUri || config.oauth.google.callbackUrl;

    if (!clientId) {
      throw new AuthError('Google OAuth is not configured. Missing GOOGLE_CLIENT_ID.');
    }

    try {
      const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: callback,
          grant_type: 'authorization_code'
        }).toString()
      });

      const tokenData = await tokenResp.json();
      if (!tokenResp.ok) {
        throw new AuthError(tokenData.error_description || tokenData.error || 'Failed to exchange authorization code with Google.');
      }

      if (tokenData.id_token) {
        return await this.verifyGoogleIdToken(tokenData.id_token);
      }

      if (tokenData.access_token) {
        const userinfoResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`
          }
        });

        if (userinfoResp.ok) {
          const userinfo = await userinfoResp.json();
          return {
            googleId: userinfo.sub,
            email: userinfo.email,
            emailVerified: userinfo.email_verified === true || userinfo.email_verified === 'true',
            firstName: userinfo.given_name || userinfo.name?.split(' ')[0] || 'Client',
            lastName: userinfo.family_name || userinfo.name?.split(' ').slice(1).join(' ') || '',
            displayName: userinfo.name || `${userinfo.given_name || ''} ${userinfo.family_name || ''}`.trim() || 'Client',
            picture: userinfo.picture || null
          };
        }
      }

      throw new AuthError('Could not retrieve user profile from Google.');
    } catch (err) {
      if (err instanceof AuthError) throw err;
      throw new AuthError(err.message || 'Google authorization code exchange failed.');
    }
  }

  /**
   * Verify Google Credential / ID Token via Google tokeninfo endpoint
   */
  static async verifyGoogleIdToken(idToken) {
    if (!idToken) {
      throw new AuthError('Google authentication token is required.');
    }

    try {
      const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new AuthError(errJson.error_description || 'Invalid or expired Google authentication token.');
      }

      const payload = await response.json();

      // Check audience if client ID is configured
      if (config.oauth.google.clientId && payload.aud && payload.aud !== config.oauth.google.clientId) {
        console.warn(`[Google OAuth] aud mismatch: token aud ${payload.aud} vs configured ${config.oauth.google.clientId}`);
      }

      if (!payload.email) {
        throw new AuthError('Google account does not provide an email address.');
      }

      return {
        googleId: payload.sub,
        email: payload.email.toLowerCase().trim(),
        emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
        firstName: payload.given_name || payload.name?.split(' ')[0] || 'Client',
        lastName: payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '',
        displayName: payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim() || 'Client',
        picture: payload.picture || null
      };
    } catch (err) {
      if (err instanceof AuthError) throw err;
      throw new AuthError('Failed to verify Google credentials with Google Identity Services.');
    }
  }
}

export default OAuthService;
