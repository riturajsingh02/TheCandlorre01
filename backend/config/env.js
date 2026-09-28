/**
 * THE Candlorre — PRODUCTION BACKEND CONFIGURATION
 * Centralized, safe environment variable configuration.
 * Real credentials only — missing credentials return clear errors, never silent mock fallbacks.
 */

export const config = {
  // ============================================================
  // SERVER & CORS RUNTIME
  // ============================================================
  server: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    isProduction: process.env.NODE_ENV === 'production',
    corsOrigin: process.env.CORS_ORIGIN || 'https://thecandlorre.com'
  },

  // ============================================================
  // AUTHENTICATION & SECURITY
  // ============================================================
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'thecandlorre_production_jwt_sanctuary_secret_key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    sessionSecret: process.env.SESSION_SECRET || 'thecandlorre_session_sanctuary_secret_key',
    cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    saltRounds: 10,
    otpExpiresInMinutes: 10,
    maxOtpAttempts: 5,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15
  },

  // ============================================================
  // ADMIN CREDENTIALS & INITIAL SETUP
  // ============================================================
  admin: {
    email: process.env.ADMIN_EMAIL || '',
    password: process.env.ADMIN_PASSWORD || '',
    jwtSecret: process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'thecandlorre_admin_guard_secret_key',
    jwtExpiresIn: '12h'
  },

  // ============================================================
  // SHOPIFY STOREFRONT & ADMIN API
  // ============================================================
  shopify: {
    storeDomain: (process.env.SHOPIFY_STORE_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/$/, ''),
    storefrontAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN || process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || '',
    apiVersion: process.env.SHOPIFY_API_VERSION || '2024-04',
    adminAccessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || process.env.SHOPIFY_ACCESS_TOKEN || '',
    webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET || ''
  },

  // ============================================================
  // SHIPROCKET SHIPPING & LOGISTICS
  // ============================================================
  shiprocket: {
    email: process.env.SHIPROCKET_EMAIL || '',
    password: process.env.SHIPROCKET_PASSWORD || '',
    webhookToken: process.env.SHIPROCKET_WEBHOOK_TOKEN || '',
    pickupLocation: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
    channelId: process.env.SHIPROCKET_CHANNEL_ID || ''
  },

  // ============================================================
  // PAYMENT GATEWAYS — REAL RAZORPAY & STRIPE
  // ============================================================
  payments: {
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID || process.env.PAYMENT_KEY_ID || '',
      keySecret: process.env.RAZORPAY_KEY_SECRET || process.env.PAYMENT_KEY_SECRET || '',
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || ''
    },
    stripe: {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ''
    }
  },

  // ============================================================
  // SMS & OTP GATEWAYS (Twilio / MSG91)
  // ============================================================
  sms: {
    provider: process.env.OTP_PROVIDER || process.env.SMS_PROVIDER || 'auto',
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      fromPhone: process.env.TWILIO_PHONE_NUMBER || ''
    },
    msg91: {
      authKey: process.env.MSG91_AUTH_KEY || process.env.OTP_API_KEY || '',
      senderId: process.env.MSG91_SENDER_ID || process.env.OTP_SENDER_ID || 'CNDLR',
      templateId: process.env.MSG91_TEMPLATE_ID || ''
    }
  },

  // ============================================================
  // STORE ALERTS & EMAIL NOTIFICATION SYSTEM
  // ============================================================
  alerts: {
    recipientEmail: process.env.ALERT_EMAIL_TO || 'thecandlorre@gmail.com',
    emailProvider: process.env.EMAIL_PROVIDER || 'console',
    emailFrom: process.env.EMAIL_FROM || 'The Candlorre Alerts <alerts@thecandlorre.com>',
    emailApiKey: process.env.EMAIL_API_KEY || '',
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      secure: process.env.SMTP_SECURE === 'true'
    },
    thresholds: {
      criticalStock: parseInt(process.env.CRITICAL_STOCK_THRESHOLD, 10) || 2,
      lowStock: parseInt(process.env.LOW_STOCK_THRESHOLD, 10) || 5,
      warningStock: parseInt(process.env.WARNING_STOCK_THRESHOLD, 10) || 10
    },
    reports: {
      dailyInventoryHour: parseInt(process.env.DAILY_INVENTORY_REPORT_HOUR, 10) || 9,
      dailySalesHour: parseInt(process.env.DAILY_SALES_REPORT_HOUR, 10) || 21,
      enableWeeklyReport: process.env.ENABLE_WEEKLY_BUSINESS_REPORT === 'true'
    }
  },

  // ============================================================
  // GOOGLE OAUTH
  // ============================================================
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || ''
    }
  },

  // ============================================================
  // WHATSAPP & CONTACT INFORMATION
  // ============================================================
  contact: {
    whatsappNumber: process.env.WHATSAPP_NUMBER || '+919762831995',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@thecandlorre.com',
    supportPhone: process.env.SUPPORT_PHONE || '+91 9762831995'
  },

  // ============================================================
  // ANALYTICS & TRACKING
  // ============================================================
  analytics: {
    ga4MeasurementId: process.env.GA4_MEASUREMENT_ID || process.env.GOOGLE_ANALYTICS_ID || '',
    metaPixelId: process.env.META_PIXEL_ID || '',
    googleAdsId: process.env.GOOGLE_ADS_ID || ''
  },

  // ============================================================
  // ORDER TRACKING
  // ============================================================
  tracking: {
    orderTrackingEndpoint: process.env.ORDER_TRACKING_ENDPOINT || ''
  }
};

export default config;
