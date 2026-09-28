/**
 * THE Candlorre — SESSION MODEL
 * Manages active user sessions, tokens, and revocations.
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';
import config from '../config/env.js';

export class Session {
  /**
   * Create and sign a new session for a user
   */
  static async create({ userId, userAgent = '', ipAddress = '', remember = false }) {
    const sessionId = `sess_${crypto.randomBytes(16).toString('hex')}`;
    const tokenSecret = config.auth.jwtSecret;
    const expiresIn = remember ? '30d' : config.auth.jwtExpiresIn;

    // Generate JWT token containing payload
    const token = jwt.sign(
      {
        sessionId,
        userId,
        iat: Math.floor(Date.now() / 1000)
      },
      tokenSecret,
      { expiresIn }
    );

    // Calculate expiry timestamp
    const days = remember ? 30 : 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const sessionRecord = await db.sessions.create({
      id: sessionId,
      userId,
      token,
      userAgent,
      ipAddress,
      remember,
      isRevoked: false,
      expiresAt
    });

    return {
      session: sessionRecord,
      token,
      expiresAt
    };
  }

  /**
   * Verify token and retrieve active session
   */
  static async verify(token) {
    if (!token) return null;

    try {
      const decoded = jwt.verify(token, config.auth.jwtSecret);
      const session = db.sessions.findById(decoded.sessionId);

      if (!session || session.isRevoked) {
        return null;
      }

      // Check if session has expired
      if (new Date(session.expiresAt) < new Date()) {
        await this.revoke(session.id);
        return null;
      }

      return session;
    } catch (err) {
      return null;
    }
  }

  /**
   * Revoke a single session (Logout)
   */
  static async revoke(sessionId) {
    if (!sessionId) return false;
    return await db.sessions.updateById(sessionId, { isRevoked: true });
  }

  /**
   * Revoke all sessions for a user (e.g. after password reset)
   */
  static async revokeAllForUser(userId) {
    if (!userId) return false;
    const userSessions = db.sessions.find({ userId });
    for (const s of userSessions) {
      await db.sessions.updateById(s.id, { isRevoked: true });
    }
    return true;
  }

  /**
   * Clean up expired sessions from DB
   */
  static async purgeExpired() {
    const now = new Date().toISOString();
    return await db.sessions.deleteMany(s => s.expiresAt < now || s.isRevoked);
  }
}

export default Session;
