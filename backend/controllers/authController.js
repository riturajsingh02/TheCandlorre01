/**
 * THE Candlorre — AUTHENTICATION CONTROLLER
 * Express request handlers for all authentication flows.
 */

import { AuthService } from '../services/authService.js';
import { OAuthService } from '../services/oauthService.js';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { Address } from '../models/Address.js';
import { Order } from '../models/Order.js';
import { sendSuccess } from '../utils/response.js';
import config from '../config/env.js';

// Helper to set HTTP-only cookie
function setAuthCookie(res, token, remember = false) {
  const maxAge = remember ? 30 * 24 * 60 * 60 * 1000 : config.auth.cookieMaxAge;
  res.cookie('Candlorre_auth_token', token, {
    httpOnly: true,
    secure: config.server.isProduction,
    sameSite: config.server.isProduction ? 'none' : 'lax',
    maxAge: maxAge,
    path: '/'
  });
}

function clearAuthCookie(res) {
  res.clearCookie('Candlorre_auth_token', {
    httpOnly: true,
    secure: config.server.isProduction,
    sameSite: config.server.isProduction ? 'none' : 'lax',
    path: '/'
  });
}

export class AuthController {
  /**
   * GET /api/auth/config
   */
  static async getConfig(req, res, next) {
    try {
      return sendSuccess(res, {
        googleClientId: config.oauth.google.clientId || null,
        environment: config.server.env
      }, 'Auth configuration retrieved.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/auth/google/url
   */
  static async getGoogleAuthUrl(req, res, next) {
    try {
      const { redirectUri, state } = req.query;
      const url = OAuthService.getGoogleAuthUrl(redirectUri, state);
      return sendSuccess(res, { url }, 'Google authentication URL generated.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/auth/google/callback
   */
  static async googleCallback(req, res, next) {
    try {
      const { code, error, error_description } = req.query;

      if (error) {
        const errorHtml = `<!DOCTYPE html>
<html>
<head><title>Google Authentication</title></head>
<body>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: ${JSON.stringify(error_description || error)} }, '*');
      window.close();
    } else {
      window.location.href = '/login.html?error=' + encodeURIComponent(${JSON.stringify(error_description || error)});
    }
  </script>
  <p>Authentication canceled or failed. You may close this window.</p>
</body>
</html>`;
        return res.status(400).send(errorHtml);
      }

      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.ip || req.connection?.remoteAddress || '';
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const defaultCallback = `${protocol}://${host}/api/auth/google/callback`;

      const result = await AuthService.googleLogin({
        code,
        redirectUri: config.oauth.google.callbackUrl || defaultCallback,
        userAgent,
        ipAddress
      });

      setAuthCookie(res, result.token, true);

      const successHtml = `<!DOCTYPE html>
<html>
<head><title>Google Authentication Success</title></head>
<body>
  <script>
    if (window.opener) {
      window.opener.postMessage({
        type: 'GOOGLE_AUTH_SUCCESS',
        token: ${JSON.stringify(result.token)},
        expiresAt: ${JSON.stringify(result.expiresAt)},
        customer: ${JSON.stringify(result.user)}
      }, '*');
      window.close();
    } else {
      window.location.href = '/account.html';
    }
  </script>
  <p>Authenticated successfully. Redirecting...</p>
</body>
</html>`;
      return res.send(successHtml);
    } catch (err) {
      const errorHtml = `<!DOCTYPE html>
<html>
<head><title>Google Authentication Failed</title></head>
<body>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: ${JSON.stringify(err.message || 'Authentication failed.')} }, '*');
      window.close();
    } else {
      window.location.href = '/login.html?error=' + encodeURIComponent(${JSON.stringify(err.message)});
    }
  </script>
  <p>Authentication failed: ${err.message || 'Error'}. You may close this window.</p>
</body>
</html>`;
      return res.status(400).send(errorHtml);
    }
  }

  /**
   * POST /api/customer/register OR /api/auth/register
   */
  static async register(req, res, next) {
    try {
      const { firstName, lastName, email, phone, password, remember } = req.body;
      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.ip || req.connection?.remoteAddress || '';

      const result = await AuthService.register({
        firstName,
        lastName,
        email,
        phone,
        password,
        userAgent,
        ipAddress
      });

      setAuthCookie(res, result.token, Boolean(remember));

      return sendSuccess(res, {
        customer: result.user,
        accessToken: result.token,
        expiresAt: result.expiresAt
      }, 'Account created successfully.', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/customer/login OR /api/auth/login
   */
  static async login(req, res, next) {
    try {
      const { identifier, email, phone, password, remember } = req.body;
      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.ip || req.connection?.remoteAddress || '';

      const result = await AuthService.login({
        identifier,
        email,
        phone,
        password,
        remember: Boolean(remember),
        userAgent,
        ipAddress
      });

      setAuthCookie(res, result.token, Boolean(remember));

      return sendSuccess(res, {
        customer: result.user,
        accessToken: result.token,
        expiresAt: result.expiresAt
      }, 'Authenticated successfully.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/google
   */
  static async googleAuth(req, res, next) {
    try {
      const { idToken, credential, code, redirectUri } = req.body;
      const token = idToken || credential;
      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.ip || req.connection?.remoteAddress || '';

      const result = await AuthService.googleLogin({
        idToken: token,
        code,
        redirectUri,
        userAgent,
        ipAddress
      });

      setAuthCookie(res, result.token, true);

      return sendSuccess(res, {
        customer: result.user,
        accessToken: result.token,
        expiresAt: result.expiresAt
      }, 'Google sign-in successful.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/customer/recover OR /api/auth/forgot-password
   */
  static async forgotPassword(req, res, next) {
    try {
      const { identifier, email, phone } = req.body;
      const target = identifier || email || phone;

      const result = await AuthService.requestPasswordReset({ identifier: target });
      return sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/verify-otp
   */
  static async verifyOtp(req, res, next) {
    try {
      const { userId, identifier, otp } = req.body;
      const result = await AuthService.verifyOtp({ userId, identifier, otp });
      return sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/reset-password
   */
  static async resetPassword(req, res, next) {
    try {
      const { userId, resetToken, newPassword } = req.body;
      const result = await AuthService.resetPassword({ userId, resetToken, newPassword });
      clearAuthCookie(res);
      return sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/logout OR /api/customer/logout
   */
  static async logout(req, res, next) {
    try {
      if (req.session && req.session.id) {
        await Session.revoke(req.session.id);
      }
      clearAuthCookie(res);
      return sendSuccess(res, { loggedOut: true }, 'Signed out successfully.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/customer/me OR /api/auth/me
   */
  static async getMe(req, res, next) {
    try {
      const addresses = Address.getByUserId(req.user.id);
      const orders = Order.getByUserId(req.user.id);
      const safeUser = User.toSafeObject(req.user, addresses, orders);

      return sendSuccess(res, safeUser);
    } catch (err) {
      next(err);
    }
  }
}

export default AuthController;
