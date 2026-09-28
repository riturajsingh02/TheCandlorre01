/**
 * THE Candlorre — USER MODEL
 * Secure User entity with bcrypt password hashing and brute force protection.
 */

import bcrypt from 'bcryptjs';
import db from '../db/index.js';
import config from '../config/env.js';

export class User {
  /**
   * Find user by unique identifier (ID)
   */
  static findById(id) {
    return db.users.findById(id);
  }

  /**
   * Find user by Email (case-insensitive)
   */
  static findByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    return db.users.findOne(u => u.email && u.email.toLowerCase() === cleanEmail);
  }

  /**
   * Find user by Mobile Phone (normalized)
   */
  static findByPhone(phone) {
    if (!phone) return null;
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const raw10 = cleanPhone.slice(-10);
    return db.users.findOne(u => {
      if (!u.phone) return false;
      const uClean = u.phone.replace(/[^\d+]/g, '');
      return uClean.slice(-10) === raw10;
    });
  }

  /**
   * Find user by Google ID
   */
  static findByGoogleId(googleId) {
    if (!googleId) return null;
    return db.users.findOne({ googleId });
  }

  /**
   * Find user by Email OR Phone
   */
  static findByEmailOrPhone(identifier) {
    if (!identifier) return null;
    const isEmail = identifier.includes('@');
    if (isEmail) {
      return this.findByEmail(identifier);
    }
    return this.findByPhone(identifier);
  }

  /**
   * Create a new User
   */
  static async create({
    firstName,
    lastName = '',
    email,
    phone = '',
    password,
    googleId = null,
    authProvider = 'local',
    role = 'customer',
    isEmailVerified = false,
    isPhoneVerified = false
  }) {
    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, config.auth.saltRounds);
    }

    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const cleanPhone = phone ? phone.trim() : '';

    const user = await db.users.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      displayName: `${firstName.trim()} ${lastName.trim()}`.trim() || 'Client',
      email: cleanEmail,
      phone: cleanPhone,
      passwordHash,
      googleId,
      authProvider,
      role,
      tier: 'Sanctuary Connoisseur',
      isEmailVerified,
      isPhoneVerified,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      lastLoginAt: null
    });

    return user;
  }

  /**
   * Link Google account to existing user
   */
  static async linkGoogleAccount(userId, googleId, isEmailVerified = true) {
    if (!userId || !googleId) return null;
    return await db.users.updateById(userId, {
      googleId,
      isEmailVerified: Boolean(isEmailVerified),
      failedLoginAttempts: 0,
      lockoutUntil: null,
      lastLoginAt: new Date().toISOString()
    });
  }

  /**
   * Verify password with bcrypt
   */
  static async verifyPassword(user, plainPassword) {
    if (!user || !user.passwordHash || !plainPassword) {
      return false;
    }
    return await bcrypt.compare(plainPassword, user.passwordHash);
  }

  /**
   * Check if account is locked due to brute-force attempts
   */
  static isLocked(user) {
    if (!user || !user.lockoutUntil) return false;
    const now = new Date();
    const lockTime = new Date(user.lockoutUntil);
    return lockTime > now;
  }

  /**
   * Record a failed login attempt; lock if threshold exceeded
   */
  static async recordFailedAttempt(user) {
    if (!user) return;
    const attempts = (user.failedLoginAttempts || 0) + 1;
    let lockoutUntil = user.lockoutUntil;

    if (attempts >= config.auth.maxLoginAttempts) {
      const lockExpiry = new Date();
      lockExpiry.setMinutes(lockExpiry.getMinutes() + config.auth.lockoutDurationMinutes);
      lockoutUntil = lockExpiry.toISOString();
    }

    return await db.users.updateById(user.id, {
      failedLoginAttempts: attempts,
      lockoutUntil
    });
  }

  /**
   * Reset failed login attempts on successful sign-in
   */
  static async recordSuccessfulLogin(user) {
    if (!user) return;
    return await db.users.updateById(user.id, {
      failedLoginAttempts: 0,
      lockoutUntil: null,
      lastLoginAt: new Date().toISOString()
    });
  }

  /**
   * Update User Password
   */
  static async updatePassword(userId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, config.auth.saltRounds);
    return await db.users.updateById(userId, {
      passwordHash,
      failedLoginAttempts: 0,
      lockoutUntil: null
    });
  }

  /**
   * Update Profile Details
   */
  static async updateProfile(userId, { firstName, lastName, phone }) {
    const updates = {};
    if (firstName !== undefined) updates.firstName = firstName.trim();
    if (lastName !== undefined) updates.lastName = lastName.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (firstName !== undefined || lastName !== undefined) {
      const current = this.findById(userId);
      const f = firstName !== undefined ? firstName.trim() : (current?.firstName || '');
      const l = lastName !== undefined ? lastName.trim() : (current?.lastName || '');
      updates.displayName = `${f} ${l}`.trim() || 'Client';
    }

    return await db.users.updateById(userId, updates);
  }

  /**
   * Format safe public user object (strip sensitive fields)
   */
  static toSafeObject(user, addresses = [], orders = []) {
    if (!user) return null;
    const { passwordHash, failedLoginAttempts, lockoutUntil, ...safeUser } = user;
    const defaultAddress = addresses.find(a => a.isDefault) || addresses[0] || null;

    return {
      ...safeUser,
      displayName: safeUser.displayName || `${safeUser.firstName || ''} ${safeUser.lastName || ''}`.trim() || 'Client',
      defaultAddress,
      addresses,
      orders
    };
  }
}

export default User;
