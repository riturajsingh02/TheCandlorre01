/**
 * THE Candlorre — ERROR HANDLING SYSTEM
 * Standardized application error hierarchy.
 * Ensures internal stack traces are never exposed to clients in production.
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthError extends AppError {
  constructor(message = 'Authentication required.') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden.') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found.') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ShopifyError extends AppError {
  constructor(message, statusCode = 502, details = null) {
    super(message, statusCode, 'SHOPIFY_API_ERROR', details);
  }
}

/**
 * Global Express error handling middleware
 */
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const isProduction = process.env.NODE_ENV === 'production';

  // Log error internally for operational monitoring
  console.error(`[Error] [${req.method} ${req.originalUrl}] [${err.code || 'UNKNOWN'}]:`, err.message);
  if (!isProduction && err.stack) {
    console.error(err.stack);
  }

  // Safe client response (no internal paths or stack traces)
  res.status(statusCode).json({
    success: false,
    error: err.message || 'An unexpected error occurred while processing your request.',
    code: err.code || 'INTERNAL_ERROR',
    details: err.details || undefined
  });
}
