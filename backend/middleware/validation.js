/**
 * THE Candlorre — VALIDATION MIDDLEWARE
 * Enforces strict validation rules on authentication and customer inputs.
 */

import { ValidationError } from '../utils/errors.js';

// Regex Helpers
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^[0-9+-\s()]{8,15}$/;

/**
 * Validate Signup Data
 */
export function validateSignup(req, res, next) {
  const { firstName, email, phone, password, confirmPassword, agreeTerms } = req.body;

  if (!firstName || typeof firstName !== 'string' || firstName.trim().length < 2) {
    return next(new ValidationError('Please provide a valid first name (minimum 2 characters).'));
  }

  if (!email || !EMAIL_REGEX.test(email.trim())) {
    return next(new ValidationError('Please provide a valid email address.'));
  }

  if (phone && !PHONE_REGEX.test(phone.trim())) {
    return next(new ValidationError('Please provide a valid mobile phone number.'));
  }

  if (!password || typeof password !== 'string') {
    return next(new ValidationError('Password is required.'));
  }

  if (password.length < 8) {
    return next(new ValidationError('Password must be at least 8 characters in length.'));
  }

  // Strong password checks: at least 1 uppercase, 1 lowercase, 1 number or symbol
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigitOrSpecial = /[\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasUpper || !hasLower || !hasDigitOrSpecial) {
    return next(
      new ValidationError(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number or special character.'
      )
    );
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return next(new ValidationError('Passwords do not match. Please verify both fields.'));
  }

  if (agreeTerms !== undefined && agreeTerms !== true && agreeTerms !== 'true' && agreeTerms !== 1 && agreeTerms !== '1') {
    return next(new ValidationError('You must agree to the Terms & Conditions to create an account.'));
  }

  next();
}

/**
 * Validate Login Data
 */
export function validateLogin(req, res, next) {
  const { identifier, email, phone, password } = req.body;
  const userIdentifier = identifier || email || phone;

  if (!userIdentifier || typeof userIdentifier !== 'string' || !userIdentifier.trim()) {
    return next(new ValidationError('Email address or mobile number is required.'));
  }

  if (!password || typeof password !== 'string') {
    return next(new ValidationError('Password is required.'));
  }

  next();
}

/**
 * Validate Forgot Password Request
 */
export function validateForgotPassword(req, res, next) {
  const { identifier, email, phone } = req.body;
  const target = identifier || email || phone;

  if (!target || typeof target !== 'string' || !target.trim()) {
    return next(new ValidationError('Please provide your registered email address or mobile number.'));
  }

  next();
}

/**
 * Validate OTP Verification
 */
export function validateVerifyOtp(req, res, next) {
  const { userId, identifier, otp } = req.body;

  if (!userId && !identifier) {
    return next(new ValidationError('User identification is required for OTP verification.'));
  }

  if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
    return next(new ValidationError('Please enter a valid 6-digit OTP verification code.'));
  }

  next();
}

/**
 * Validate Password Reset
 */
export function validateResetPassword(req, res, next) {
  const { userId, resetToken, newPassword, confirmPassword } = req.body;

  if (!userId || !resetToken) {
    return next(new ValidationError('Invalid or missing password reset token.'));
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return next(new ValidationError('New password must be at least 8 characters in length.'));
  }

  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigitOrSpecial = /[\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);

  if (!hasUpper || !hasLower || !hasDigitOrSpecial) {
    return next(
      new ValidationError(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number or special character.'
      )
    );
  }

  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    return next(new ValidationError('Passwords do not match.'));
  }

  next();
}

/**
 * Validate Address
 */
export function validateAddress(req, res, next) {
  const { firstName, phone, address1, city, zip, pincode } = req.body;

  if (!firstName || !firstName.trim()) {
    return next(new ValidationError('Recipient full name is required.'));
  }

  if (!phone || !phone.trim()) {
    return next(new ValidationError('Contact phone number is required.'));
  }

  if (!address1 || !address1.trim()) {
    return next(new ValidationError('Street address line is required.'));
  }

  if (!city || !city.trim()) {
    return next(new ValidationError('City is required.'));
  }

  const pin = zip || pincode;
  if (!pin || !pin.trim()) {
    return next(new ValidationError('Postal PIN code is required.'));
  }

  next();
}
