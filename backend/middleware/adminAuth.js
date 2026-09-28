/**
 * THE Candlorre — ADMIN AUTHENTICATION MIDDLEWARE
 * Guards administrative API endpoints and enforces JWT signature & session verification.
 */

import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import Admin from '../models/Admin.js';
import { AuthError, ForbiddenError } from '../utils/errors.js';

export function extractAdminToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  if (req.cookies && req.cookies.candlorre_admin_token) {
    return req.cookies.candlorre_admin_token;
  }
  if (req.headers['x-admin-token']) {
    return req.headers['x-admin-token'];
  }
  return null;
}

export async function requireAdminAuth(req, res, next) {
  try {
    const token = extractAdminToken(req);
    if (!token) {
      throw new AuthError('Admin authentication required. Please sign in to the administration portal.', 401);
    }

    let payload;
    try {
      payload = jwt.verify(token, config.admin.jwtSecret);
    } catch (jwtErr) {
      throw new AuthError('Admin session token has expired or is invalid. Please sign in again.', 401);
    }

    if (!payload.adminId) {
      throw new AuthError('Malformed admin token.', 401);
    }

    const admin = Admin.findById(payload.adminId);
    if (!admin) {
      throw new AuthError('Admin account not found.', 401);
    }

    if (Admin.isLocked(admin)) {
      throw new ForbiddenError('Admin account is locked due to security policy.', 403);
    }

    req.admin = Admin.toSafeObject(admin);
    req.adminToken = token;
    next();
  } catch (err) {
    next(err);
  }
}

export default requireAdminAuth;
