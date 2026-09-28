/**
 * THE Candlorre — PASSWORD RESET OTP MODEL
 * Cryptographically random OTP generator with rate limiting and secure verification.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db from '../db/index.js';
import config from '../config/env.js';

export class PasswordResetOTP {
  /**
   * Generate a secure 6-digit OTP code and record in database
   */
  static async createForUser(userId, identifier, deliveryType = 'sms') {
    // Purge any prior unused OTPs for this user
    await db.otps.deleteMany(o => o.userId === userId && !o.isUsed);

    // Cryptographically secure 6-digit random number (100000 - 999999)
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(rawOtp, 8);

    const expiryMinutes = config.auth.otpExpiresInMinutes || 10;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    const otpRecord = await db.otps.create({
      userId,
      identifier,
      deliveryType,
      otpHash,
      attemptsCount: 0,
      isUsed: false,
      expiresAt
    });

    return {
      otpRecord,
      rawOtp // only returned at creation time for SMS/email transmission
    };
  }

  /**
   * Check rate limits for requesting OTPs (max 3 per 10 minutes)
   */
  static checkRateLimit(userId) {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const recentOtps = db.otps.find(
      o => o.userId === userId && o.createdAt >= tenMinutesAgo
    );

    if (recentOtps.length >= 3) {
      return {
        allowed: false,
        message: 'Too many OTP requests. Please wait a few minutes before trying again.'
      };
    }
    return { allowed: true };
  }

  /**
   * Verify an OTP code
   */
  static async verifyCode(userId, plainOtp) {
    if (!userId || !plainOtp) {
      return { success: false, message: 'User ID and OTP code are required.' };
    }

    const now = new Date().toISOString();
    const record = db.otps.findOne(
      o => o.userId === userId && !o.isUsed && o.expiresAt > now
    );

    if (!record) {
      return {
        success: false,
        message: 'Invalid or expired OTP code. Please request a new verification code.'
      };
    }

    if (record.attemptsCount >= config.auth.maxOtpAttempts) {
      await db.otps.updateById(record.id, { isUsed: true });
      return {
        success: false,
        message: 'Maximum OTP verification attempts exceeded. Please request a new code.'
      };
    }

    const isValid = await bcrypt.compare(String(plainOtp).trim(), record.otpHash);
    if (!isValid) {
      await db.otps.updateById(record.id, {
        attemptsCount: (record.attemptsCount || 0) + 1
      });
      return {
        success: false,
        message: 'Incorrect OTP code. Please check and try again.'
      };
    }

    // Mark OTP as used
    await db.otps.updateById(record.id, { isUsed: true });

    // Generate a temporary single-use reset token valid for 15 minutes
    const resetToken = `rst_${crypto.randomBytes(24).toString('hex')}`;
    const resetTokenHash = await bcrypt.hash(resetToken, 6);

    // Store reset token record in otps or users
    await db.users.updateById(userId, {
      tempResetTokenHash: resetTokenHash,
      tempResetTokenExpiry: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    });

    return {
      success: true,
      resetToken
    };
  }

  /**
   * Verify single-use reset token prior to password update
   */
  static async verifyResetToken(user, resetToken) {
    if (!user || !user.tempResetTokenHash || !user.tempResetTokenExpiry || !resetToken) {
      return false;
    }

    if (new Date(user.tempResetTokenExpiry) < new Date()) {
      return false;
    }

    return await bcrypt.compare(resetToken, user.tempResetTokenHash);
  }

  /**
   * Clear reset token after successful password change
   */
  static async clearResetToken(userId) {
    return await db.users.updateById(userId, {
      tempResetTokenHash: null,
      tempResetTokenExpiry: null
    });
  }
}

export default PasswordResetOTP;
