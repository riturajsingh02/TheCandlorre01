/**
 * THE Candlorre — PRODUCTION SERVER
 * Express engine with security headers (Helmet), CORS, rate limiting,
 * protected admin portal, verified webhook routing, and real database persistence.
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

import apiRouter from './backend/api/index.js';
import { errorHandler } from './backend/utils/errors.js';
import config from './backend/config/env.js';
import { scheduler } from './backend/services/scheduler.js';
import Admin from './backend/models/Admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Render / Cloud Run / Reverse Proxies
app.set('trust proxy', 1);

// Security Headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: false, // Disabled to permit Razorpay inline frame, OSM maps, and Google Fonts
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS Configuration
const allowedOrigins = [
  config.server.corsOrigin,
  'https://thecandlorre.com',
  'https://www.thecandlorre.com'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o)) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    return callback(null, true); // Allow during transition but enforce credentials
  },
  credentials: true
}));

// Rate Limiting for Auth Endpoints to mitigate brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: { success: false, error: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

app.use('/api/admin/login', authLimiter);
app.use('/api/auth/login', authLimiter);

// Cookie parser middleware
app.use(cookieParser(config.auth.sessionSecret));

// Body parsing middleware with raw body capture for webhook HMAC checks
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Helper to resolve frontend files exclusively from frontend folder
function resolveFrontendFile(...subpaths) {
  return path.join(__dirname, 'frontend', ...subpaths);
}

// Sitemaps & robots
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.sendFile(resolveFrontendFile('sitemap.xml'));
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(resolveFrontendFile('robots.txt'));
});

// Admin Login Route
app.get(['/admin-login', '/admin-login.html'], (req, res) => {
  res.sendFile(resolveFrontendFile('admin-login.html'));
});

// Helper to check admin authentication
function checkAdminAccess(req) {
  const token = req.cookies?.candlorre_admin_token ||
                (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
  if (!token) return false;

  try {
    const payload = jwt.verify(token, config.admin.jwtSecret);
    return Boolean(payload?.adminId);
  } catch (err) {
    return false;
  }
}

// Protected Admin Portal Route
app.get(['/admin', '/admin.html'], (req, res, next) => {
  if (checkAdminAccess(req)) {
    return res.sendFile(resolveFrontendFile('admin.html'));
  }
  return res.redirect('/admin-login.html');
});

// Mount modular Backend API routes under /api
app.use('/api', apiRouter);

// Prevent direct unauthenticated static access to admin.html
app.use((req, res, next) => {
  if (req.path === '/admin.html' || req.path === '/frontend/admin.html') {
    if (!checkAdminAccess(req)) {
      return res.redirect('/admin-login.html');
    }
  }
  next();
});

// Serve static frontend and asset files
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/asset', express.static(path.join(__dirname, 'asset')));

// Direct page routes
app.get('/', (req, res) => {
  res.sendFile(resolveFrontendFile('index.html'));
});

// Global Error Handler
app.use(errorHandler);

// Listen only when executed directly
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`The Candlorre production server active at http://0.0.0.0:${PORT}`);

    // Ensure default master admin exists
    try {
      await Admin.ensureDefaultAdmin();
    } catch (e) {
      console.warn('[Admin Init Notice]:', e.message);
    }

    // Start automated scheduler for stock checks, daily reports, and email retries
    scheduler.start();
  });
}

export default app;
