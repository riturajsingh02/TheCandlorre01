/**
 * THE Candlorre — AUTHENTICATION MIDDLEWARE
 * Verifies JWT tokens, HTTP-only cookies, and active database sessions.
 */

import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { AuthError } from '../utils/errors.js';

/**
 * Extract token from request headers or cookies
 */
export function extractToken(req) {
  // 1. Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 2. Custom header
  if (req.headers['x-customer-token']) {
    return req.headers['x-customer-token'];
  }

  // 3. HTTP-only cookie
  if (req.cookies && req.cookies.Candlorre_auth_token) {
    return req.cookies.Candlorre_auth_token;
  }

  // 4. Query param (fallback for download links or previews)
  if (req.query && req.query.token) {
    return req.query.token;
  }

  return null;
}

/**
 * Mandatory Auth Guard — Rejects unauthenticated requests
 */
export async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new AuthError('Authentication required. Please sign in to access your account sanctuary.');
    }

    const session = await Session.verify(token);
    if (!session) {
      throw new AuthError('Your session has expired or was revoked. Please sign in again.');
    }

    const user = User.findById(session.userId);
    if (!user) {
      throw new AuthError('User account not found. Please sign in again.');
    }

    // Attach to request
    req.user = user;
    req.session = session;
    req.token = token;

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional Auth Middleware — Attaches user if authenticated, continues otherwise
 */
export async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (token) {
      const session = await Session.verify(token);
      if (session) {
        const user = User.findById(session.userId);
        if (user) {
          req.user = user;
          req.session = session;
          req.token = token;
        }
      }
    }
  } catch (err) {
    // Silently continue for optional authentication
  }
  next();
}
