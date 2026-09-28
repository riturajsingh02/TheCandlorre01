/**
 * THE Candlorre — AUTHENTICATION SERVICE
 * Core business logic for Registration, Login, OAuth, and Password Recovery.
 */

import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { Address } from '../models/Address.js';
import { Order } from '../models/Order.js';
import { PasswordResetOTP } from '../models/PasswordResetOTP.js';
import { SMSService } from './smsService.js';
import { EmailService } from './emailService.js';
import { OAuthService } from './oauthService.js';
import { AppError, AuthError, ValidationError } from '../utils/errors.js';

export class AuthService {
  /**
   * Register a new customer
   */
  static async register({ firstName, lastName = '', email, phone = '', password, userAgent = '', ipAddress = '' }) {
    // 1. Check if email already registered
    const existingByEmail = User.findByEmail(email);
    if (existingByEmail) {
      throw new AppError('An account with this email address already exists. Please sign in.', 409, 'EMAIL_EXISTS');
    }

    // 2. Check if phone already registered (if provided)
    if (phone) {
      const existingByPhone = User.findByPhone(phone);
      if (existingByPhone) {
        throw new AppError('An account with this mobile number already exists.', 409, 'PHONE_EXISTS');
      }
    }

    // 3. Create user in database
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      authProvider: 'local'
    });

    // 4. Create initial authenticated session
    const { token, expiresAt, session } = await Session.create({
      userId: user.id,
      userAgent,
      ipAddress,
      remember: true
    });

    const safeUser = User.toSafeObject(user, [], []);

    return {
      user: safeUser,
      token,
      expiresAt,
      session
    };
  }

  /**
   * Authenticate user with Email/Phone & Password
   */
  static async login({ identifier, email, phone, password, remember = false, userAgent = '', ipAddress = '' }) {
    const query = identifier || email || phone;
    const user = User.findByEmailOrPhone(query);

    if (!user) {
      throw new AppError('Invalid credentials. No account found with these details.', 401, 'INVALID_CREDENTIALS');
    }

    // Check account lockout
    if (User.isLocked(user)) {
      const lockExpiry = new Date(user.lockoutUntil);
      const remainingMinutes = Math.ceil((lockExpiry - new Date()) / (60 * 1000));
      throw new AppError(
        `Account temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s) or reset your password.`,
        423,
        'ACCOUNT_LOCKED'
      );
    }

    // Verify password
    const isMatch = await User.verifyPassword(user, password);
    if (!isMatch) {
      await User.recordFailedAttempt(user);
      throw new AppError('Invalid email or password. Please verify your credentials.', 401, 'INVALID_CREDENTIALS');
    }

    // Successful login - reset attempts & record timestamp
    await User.recordSuccessfulLogin(user);

    // Create session
    const { token, expiresAt, session } = await Session.create({
      userId: user.id,
      userAgent,
      ipAddress,
      remember
    });

    const addresses = Address.getByUserId(user.id);
    const orders = Order.getByUserId(user.id);
    const safeUser = User.toSafeObject(user, addresses, orders);

    return {
      user: safeUser,
      token,
      expiresAt,
      session
    };
  }

  /**
   * Authenticate via Google OAuth
   */
  static async googleLogin({ idToken, userAgent = '', ipAddress = '' }) {
    const googleProfile = await OAuthService.verifyGoogleIdToken(idToken);

    let user = User.findByGoogleId(googleProfile.googleId);

    if (!user && googleProfile.email) {
      user = User.findByEmail(googleProfile.email);
    }

    if (!user) {
      // Create new user linked to Google
      user = await User.create({
        firstName: googleProfile.firstName,
        lastName: googleProfile.lastName,
        email: googleProfile.email,
        googleId: googleProfile.googleId,
        authProvider: 'google',
        isEmailVerified: googleProfile.emailVerified
      });
    }

    const { token, expiresAt, session } = await Session.create({
      userId: user.id,
      userAgent,
      ipAddress,
      remember: true
    });

    const addresses = Address.getByUserId(user.id);
    const orders = Order.getByUserId(user.id);
    const safeUser = User.toSafeObject(user, addresses, orders);

    return {
      user: safeUser,
      token,
      expiresAt,
      session
    };
  }

  /**
   * Request OTP for password reset
   */
  static async requestPasswordReset({ identifier }) {
    const user = User.findByEmailOrPhone(identifier);
    if (!user) {
      // For security, do not expose whether user exists, but give friendly confirmation
      return {
        success: true,
        message: 'If an account exists with these details, a verification code has been dispatched.'
      };
    }

    // Check rate limit
    const rateCheck = PasswordResetOTP.checkRateLimit(user.id);
    if (!rateCheck.allowed) {
      throw new AppError(rateCheck.message, 429, 'RATE_LIMIT_EXCEEDED');
    }

    const deliveryTarget = user.phone || user.email;
    const deliveryType = user.phone ? 'sms' : 'email';

    const { rawOtp } = await PasswordResetOTP.createForUser(user.id, deliveryTarget, deliveryType);

    if (user.phone) {
      await SMSService.sendOtp({ phone: user.phone, otp: rawOtp });
    } else {
      await EmailService.sendAlert({
        type: 'PASSWORD_RESET',
        severity: 'info',
        subject: 'Your Password Reset Verification Code — The Candlorre',
        badgeText: 'SECURITY VERIFICATION',
        recipient: user.email,
        contentHtml: `
          <p style="font-size: 15px; color: #3A322D; line-height: 1.6; margin-bottom: 20px;">
            A password reset was requested for your account sanctuary. Use the 6-digit code below to complete verification:
          </p>
          <div style="text-align: center; margin: 28px 0; background: #FAF7F2; padding: 20px; border-radius: 8px; border: 1px dashed #D4AF37;">
            <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2B050B;">${rawOtp}</span>
          </div>
          <p style="font-size: 13px; color: #7B7169; line-height: 1.5;">
            This code will expire in 10 minutes. If you did not request this verification, please disregard this email or secure your account.
          </p>
        `
      }).catch(err => {
        console.error('[AuthService] Failed to dispatch password reset email:', err.message);
      });
    }

    const maskedTarget = user.phone
      ? `${user.phone.slice(0, 3)}******${user.phone.slice(-3)}`
      : `${user.email.slice(0, 3)}***@${user.email.split('@')[1]}`;

    return {
      success: true,
      userId: user.id,
      maskedTarget,
      deliveryType,
      message: `Verification code sent to ${maskedTarget}.`
    };
  }

  /**
   * Verify OTP code and issue a short-lived reset token
   */
  static async verifyOtp({ userId, identifier, otp }) {
    let targetUserId = userId;
    if (!targetUserId && identifier) {
      const user = User.findByEmailOrPhone(identifier);
      if (user) targetUserId = user.id;
    }

    if (!targetUserId) {
      throw new ValidationError('Invalid user or verification session.');
    }

    const result = await PasswordResetOTP.verifyCode(targetUserId, otp);
    if (!result.success) {
      throw new AppError(result.message, 400, 'INVALID_OTP');
    }

    return {
      success: true,
      userId: targetUserId,
      resetToken: result.resetToken,
      message: 'Verification successful. You may now enter your new password.'
    };
  }

  /**
   * Complete password reset with verified token
   */
  static async resetPassword({ userId, resetToken, newPassword }) {
    const user = User.findById(userId);
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const isTokenValid = await PasswordResetOTP.verifyResetToken(user, resetToken);
    if (!isTokenValid) {
      throw new AppError('Invalid or expired password reset token. Please request a new code.', 400, 'INVALID_RESET_TOKEN');
    }

    // Update password in DB
    await User.updatePassword(userId, newPassword);

    // Invalidate reset token
    await PasswordResetOTP.clearResetToken(userId);

    // Revoke all active sessions for security
    await Session.revokeAllForUser(userId);

    return {
      success: true,
      message: 'Your password has been successfully updated. Please sign in with your new credentials.'
    };
  }
}

export default AuthService;
