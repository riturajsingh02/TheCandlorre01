/**
 * THE Candlorre — CONTACT & CONCIERGE API ROUTE
 * POST /api/contact
 */

import { Router } from 'express';
import { isValidEmail, sanitizeString } from '../utils/validation.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { config } from '../config/env.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return sendError(res, 'Name, email, and message are required.', 400);
    }

    if (!isValidEmail(email)) {
      return sendError(res, 'Please provide a valid email address.', 400);
    }

    const cleanName = sanitizeString(name, 100);
    const cleanEmail = sanitizeString(email, 100);
    const cleanPhone = sanitizeString(phone || '', 30);
    const cleanSubject = sanitizeString(subject || 'General Inquiry', 150);
    const cleanMessage = sanitizeString(message, 3000);

    // Build WhatsApp direct message link
    const waNumber = config.contact.whatsappNumber.replace(/\D/g, '');
    const waText = encodeURIComponent(`Hello The Candlorre Concierge,\n\nName: ${cleanName}\nEmail: ${cleanEmail}\nSubject: ${cleanSubject}\n\nMessage: ${cleanMessage}`);
    const whatsappLink = `https://wa.me/${waNumber}?text=${waText}`;

    return sendSuccess(res, {
      received: true,
      whatsappLink,
      supportEmail: config.contact.supportEmail,
      supportPhone: config.contact.supportPhone
    }, 'Thank you for reaching out. Our concierge team has received your message.');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
});

export default router;
