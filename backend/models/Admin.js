/**
 * THE Candlorre — ADMIN MODEL
 * Secure administration credentials, bcrypt password hashing, and brute-force lockout protection.
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db/index.js';
import config from '../config/env.js';

export class Admin {
  static findById(id) {
    if (!id) return null;
    return db.admins.findById(id);
  }

  static findByEmail(email) {
    if (!email) return null;
    const clean = String(email).trim().toLowerCase();
    return db.admins.findOne(a => String(a.email || '').toLowerCase() === clean);
  }

  static isLocked(admin) {
    if (!admin.lockoutUntil) return false;
    return new Date(admin.lockoutUntil) > new Date();
  }

  static async recordFailedAttempt(admin) {
    const attempts = (admin.failedAttempts || 0) + 1;
    const updates = { failedAttempts: attempts };
    if (attempts >= config.auth.maxLoginAttempts) {
      updates.lockoutUntil = new Date(Date.now() + config.auth.lockoutDurationMinutes * 60 * 1000).toISOString();
    }
    return await db.admins.updateById(admin.id, updates);
  }

  static async recordSuccessfulLogin(admin, ip = '') {
    return await db.admins.updateById(admin.id, {
      failedAttempts: 0,
      lockoutUntil: null,
      lastLoginAt: new Date().toISOString(),
      lastLoginIp: ip
    });
  }

  static async verifyPassword(admin, plainPassword) {
    if (!admin.passwordHash || !plainPassword) return false;
    return await bcrypt.compare(plainPassword, admin.passwordHash);
  }

  static async create({ email, password, name = 'Store Administrator', role = 'superadmin' }) {
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    const id = `adm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    return await db.admins.create({
      id,
      email: email.toLowerCase().trim(),
      name,
      role,
      passwordHash,
      failedAttempts: 0,
      lockoutUntil: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Initializes store admin from environment variables if no admin is present
   */
  static async ensureDefaultAdmin() {
    const count = db.admins.count();
    if (count === 0) {
      const email = config.admin.email || 'thecandlorre@gmail.com';
      const password = config.admin.password || 'Candlorre@Admin2026!';
      console.log(`[Admin Security] Bootstrapping master administrator account: ${email}`);
      await this.create({
        email,
        password,
        name: 'The Candlorre Admin',
        role: 'superadmin'
      });
    }
  }

  static toSafeObject(admin) {
    if (!admin) return null;
    const { passwordHash, failedAttempts, lockoutUntil, ...safe } = admin;
    return safe;
  }
}

export default Admin;
