/**
 * THE Candlorre — COD OTP VERIFICATION SERVICE
 * Real OTP dispatch, cryptographic SHA-256 hashing, rate limiting, and expiry enforcement.
 * Never stores or returns plaintext OTPs.
 */

import crypto from 'crypto';
import db from '../db/index.js';
import config from '../config/env.js';
import SMSService from './smsService.js';
import Order, { ORDER_STATES } from '../models/Order.js';

export class CodService {
  /**
   * Hashes plain OTP using SHA-256 with server secret salt
   */
  static hashOtp(otp, phone) {
    return crypto
      .createHmac('sha256', config.auth.jwtSecret)
      .update(`${phone}:${otp}`)
      .digest('hex');
  }

  /**
   * Generate cryptographically secure 6-digit numeric code
   */
  static generateSecureOtp() {
    return crypto.randomInt(100000, 1000000).toString();
  }

  /**
   * Initialize COD verification and dispatch OTP to mobile number
   */
  static async initiateVerification(orderId, phone) {
    const order = Order.findById(orderId);
    if (!order) throw new Error('Order not found.');

    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      throw new Error('Please provide a valid 10-digit Indian mobile number.');
    }

    // Check resend cooldown (minimum 60 seconds between OTP requests)
    const existing = db.codVerifications.findOne({ orderId, status: 'PENDING' });
    if (existing) {
      const timeSinceCreation = (Date.now() - new Date(existing.createdAt).getTime()) / 1000;
      if (timeSinceCreation < 60) {
        const waitSeconds = Math.ceil(60 - timeSinceCreation);
        throw new Error(`Please wait ${waitSeconds} seconds before requesting a new verification code.`);
      }
      // Invalidate previous pending verification for this order
      await db.codVerifications.updateById(existing.id, { status: 'SUPERSEDED' });
    }

    // Generate random 6-digit OTP
    const rawOtp = this.generateSecureOtp();
    const otpHash = this.hashOtp(rawOtp, cleanPhone);
    const expiresAt = new Date(Date.now() + config.auth.otpExpiresInMinutes * 60 * 1000).toISOString();

    const verificationRecord = await db.codVerifications.create({
      orderId: order.id,
      orderNumber: order.orderNumber,
      phone: cleanPhone,
      otpHash,
      expiresAt,
      attempts: 0,
      verifiedAt: null,
      status: 'PENDING'
    });

    // Real SMS dispatch
    const smsResult = await SMSService.sendOtp({
      phone: cleanPhone,
      otp: rawOtp,
      template: 'cod_verification'
    });

    if (!smsResult.success) {
      // If SMS provider failed, mark order verification failed
      await db.codVerifications.updateById(verificationRecord.id, { status: 'DISPATCH_FAILED' });
      throw new Error(`Failed to deliver OTP via SMS: ${smsResult.error || 'Gateway unreachable'}. Order remains unverified.`);
    }

    // Mask phone number for display in client UI
    const maskedPhone = `${cleanPhone.slice(0, 2)}******${cleanPhone.slice(-2)}`;

    return {
      success: true,
      verificationId: verificationRecord.id,
      orderNumber: order.orderNumber,
      maskedPhone,
      expiresInMinutes: config.auth.otpExpiresInMinutes,
      message: `Verification code sent to ${maskedPhone}.`
    };
  }

  /**
   * Verify entered OTP code against stored hash
   */
  static async verifyOtp(orderId, inputOtp) {
    if (!orderId || !inputOtp) {
      throw new Error('Order ID and verification code are required.');
    }

    const order = Order.findById(orderId);
    if (!order) throw new Error('Order not found.');

    const verification = db.codVerifications.findOne({ orderId: order.id, status: 'PENDING' });
    if (!verification) {
      throw new Error('No active verification session found for this order. Please request a new code.');
    }

    // Check expiry
    if (new Date() > new Date(verification.expiresAt)) {
      await db.codVerifications.updateById(verification.id, { status: 'EXPIRED' });
      throw new Error('Verification code has expired. Please request a new code.');
    }

    // Check maximum attempts (5 attempts limit)
    const attempts = (verification.attempts || 0) + 1;
    if (attempts > config.auth.maxOtpAttempts) {
      await db.codVerifications.updateById(verification.id, { status: 'ATTEMPTS_EXCEEDED', attempts });
      await Order.updateStatus(order.id, ORDER_STATES.FAILED, 'Maximum COD OTP attempts exceeded.');
      throw new Error('Maximum verification attempts exceeded. Order verification failed.');
    }

    await db.codVerifications.updateById(verification.id, { attempts });

    // Compare hash
    const cleanPhone = verification.phone;
    const computedHash = this.hashOtp(String(inputOtp).trim(), cleanPhone);

    const isMatch = crypto.timingSafeEqual(
      Buffer.from(computedHash, 'hex'),
      Buffer.from(verification.otpHash, 'hex')
    );

    if (!isMatch) {
      const remaining = config.auth.maxOtpAttempts - attempts;
      throw new Error(`Invalid verification code. ${remaining} attempt(s) remaining.`);
    }

    // Success: Mark verification verified
    const now = new Date().toISOString();
    await db.codVerifications.updateById(verification.id, {
      status: 'VERIFIED',
      verifiedAt: now
    });

    // Advance order to CONFIRMED
    await Order.updateStatus(order.id, ORDER_STATES.CONFIRMED, 'Client verified COD order via OTP.', 'customer');
    await db.orders.updateById(order.id, {
      financialStatus: 'CONFIRMED_COD'
    });

    return {
      success: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
      verified: true,
      message: 'Cash on Delivery order verified successfully!'
    };
  }
}

export default CodService;
