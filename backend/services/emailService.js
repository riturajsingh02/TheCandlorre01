/**
 * THE Candlorre — LUXURY EMAIL NOTIFICATION SERVICE
 * Produces elegant, responsive branded emails and dispatches them via Resend, SendGrid, SMTP, or SES.
 */

import nodemailer from 'nodemailer';
import { config } from '../config/env.js';
import { AlertSettings } from '../models/AlertSettings.js';
import { AlertLog } from '../models/AlertLog.js';

export class EmailService {
  /**
   * Scrub any potential sensitive credentials from email text/body
   */
  static sanitizeText(text) {
    if (!text || typeof text !== 'string') return text;
    return text
      .replace(/shpat_[a-zA-Z0-9_\-]+/gi, 'shpat_***[REDACTED]')
      .replace(/shpss_[a-zA-Z0-9_\-]+/gi, 'shpss_***[REDACTED]')
      .replace(/rzp_(test|live)_[a-zA-Z0-9_\-]+/gi, 'rzp_***[REDACTED]')
      .replace(/sk_(test|live)_[a-zA-Z0-9_\-]+/gi, 'sk_***[REDACTED]')
      .replace(/whsec_[a-zA-Z0-9_\-]+/gi, 'whsec_***[REDACTED]')
      .replace(/(Bearer\s+)[a-zA-Z0-9._\-]+/gi, '$1***[REDACTED]')
      .replace(/(password|secret|key|token)["']?\s*[:=]\s*["']?[^"',\s}]+/gi, '$1: ***[REDACTED]');
  }

  /**
   * Generate luxury HTML email layout wrapper
   */
  static generateEmailTemplate({
    title,
    severity = 'info', // 'info' | 'warning' | 'important' | 'critical'
    badgeText = '',
    contentHtml = '',
    actionButton = null // { label, url }
  }) {
    const severityStyles = {
      critical: {
        bg: '#FEF2F2',
        border: '#DC2626',
        text: '#991B1B',
        icon: '🚨',
        pill: '#EF4444'
      },
      important: {
        bg: '#FFF7ED',
        border: '#EA580C',
        text: '#9A3412',
        icon: '🟠',
        pill: '#F97316'
      },
      warning: {
        bg: '#FFFBEB',
        border: '#D97706',
        text: '#92400E',
        icon: '⚠️',
        pill: '#F59E0B'
      },
      info: {
        bg: '#F0FDF4',
        border: '#16A34A',
        text: '#166534',
        icon: '🌿',
        pill: '#22C55E'
      }
    };

    const theme = severityStyles[severity] || severityStyles.info;
    const dateStr = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'medium'
    });

    const storeDomain = config.shopify.storeDomain || 'thecandlorre.com';
    const cleanStoreUrl = `https://${storeDomain.replace(/^https?:\/\//, '')}`;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.sanitizeText(title)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F8F6F0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #2D2D2D;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #F8F6F0;
      padding: 30px 0;
    }
    .main-card {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #EAE5D9;
      box-shadow: 0 4px 20px rgba(43, 5, 11, 0.06);
    }
    .header {
      background-color: #2B050B;
      padding: 28px 24px;
      text-align: center;
      color: #FFFFFF;
    }
    .brand-title {
      margin: 0;
      font-size: 24px;
      letter-spacing: 3px;
      text-transform: uppercase;
      font-weight: 400;
      color: #FDFBF7;
    }
    .brand-tagline {
      margin-top: 6px;
      font-size: 10px;
      letter-spacing: 2px;
      color: #D4AF37;
      text-transform: uppercase;
    }
    .severity-bar {
      background-color: ${theme.bg};
      border-left: 5px solid ${theme.border};
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .severity-text {
      color: ${theme.text};
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .content-body {
      padding: 28px 24px;
      line-height: 1.6;
      font-size: 14px;
      color: #333333;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 13px;
    }
    .info-table th {
      background-color: #F8F6F0;
      color: #2B050B;
      text-align: left;
      padding: 10px 12px;
      font-weight: 600;
      border-bottom: 2px solid #EAE5D9;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #EFEFEF;
      color: #444444;
    }
    .product-box {
      background-color: #FCFAF8;
      border: 1px solid #EAE5D9;
      border-radius: 6px;
      padding: 16px;
      margin: 16px 0;
    }
    .stat-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .btn-action {
      display: inline-block;
      background-color: #2B050B;
      color: #FFFFFF !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-top: 15px;
    }
    .footer {
      background-color: #FCFAF8;
      border-top: 1px solid #EAE5D9;
      padding: 20px 24px;
      text-align: center;
      font-size: 12px;
      color: #777777;
      line-height: 1.5;
    }
    .footer a {
      color: #2B050B;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main-card">
      <div class="header">
        <h1 class="brand-title">The Candlorre</h1>
        <div class="brand-tagline">Botanical Candles &bull; Store Sanctuary Alert</div>
      </div>

      <div class="severity-bar">
        <span class="severity-text">${theme.icon} ${badgeText || severity.toUpperCase()}</span>
        <span style="font-size: 11px; color: #666;">Store Alert Notification</span>
      </div>

      <div class="content-body">
        ${contentHtml}

        ${actionButton ? `
          <div style="text-align: center; margin-top: 24px;">
            <a href="${actionButton.url}" class="btn-action" target="_blank">${actionButton.label} &rarr;</a>
          </div>
        ` : ''}
      </div>

      <div class="footer">
        <p style="margin: 0 0 6px 0;">This is an automated operational alert generated for <strong>The Candlorre Store Administration</strong>.</p>
        <p style="margin: 0 0 6px 0; color: #999;">Alert Dispatched: ${dateStr}</p>
        <p style="margin: 0;"><a href="${cleanStoreUrl}" target="_blank">View Live Store</a> &bull; <a href="${cleanStoreUrl}/admin.html" target="_blank">Alert Dashboard</a></p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Dispatch email through configured provider
   */
  static async sendEmail({
    to = null,
    subject,
    severity = 'info',
    badgeText = '',
    title,
    contentHtml,
    actionButton = null,
    alertType = 'STORE_ALERT',
    metadata = {}
  }) {
    const settings = AlertSettings.get();
    const recipient = to || settings.alertEmail || config.alerts.recipientEmail || 'thecandlorre@gmail.com';
    const from = settings.fromEmail || config.alerts.emailFrom || 'The Candlorre Alerts <alerts@thecandlorre.com>';

    const sanitizedSubject = this.sanitizeText(subject);
    const htmlBody = this.generateEmailTemplate({
      title: title || sanitizedSubject,
      severity,
      badgeText,
      contentHtml: this.sanitizeText(contentHtml),
      actionButton
    });

    // Create pending alert log entry
    const logRecord = await AlertLog.log({
      type: alertType,
      severity,
      subject: sanitizedSubject,
      recipient,
      status: 'PENDING',
      htmlBody,
      metadata
    });

    try {
      const provider = settings.emailProvider || config.alerts.emailProvider || 'resend';
      const apiKey = config.alerts.emailApiKey;

      if (provider === 'resend' && apiKey) {
        await this._sendViaResend({ from, to: recipient, subject: sanitizedSubject, html: htmlBody, apiKey });
      } else if (provider === 'sendgrid' && apiKey) {
        await this._sendViaSendGrid({ from, to: recipient, subject: sanitizedSubject, html: htmlBody, apiKey });
      } else if (provider === 'smtp' && config.alerts.smtp.host) {
        await this._sendViaSmtp({ from, to: recipient, subject: sanitizedSubject, html: htmlBody });
      } else {
        // Fallback / Development: Safe structured logging
        console.log(`[EmailService] 📧 ALERT DISPATCHED TO: ${recipient} | SUBJECT: ${sanitizedSubject} (Provider: ${provider})`);
      }

      await AlertLog.markSent(logRecord.id);
      return { success: true, alertId: logRecord.id, recipient, status: 'SENT' };
    } catch (err) {
      console.error(`[EmailService] Failed to send alert "${sanitizedSubject}":`, err.message);
      await AlertLog.markFailed(logRecord.id, err);
      return { success: false, alertId: logRecord.id, error: err.message, status: 'FAILED' };
    }
  }

  /**
   * Retry sending an existing alert log record
   */
  static async retryAlert(alertLogId) {
    const record = AlertLog.getById(alertLogId);
    if (!record || !record.htmlBody) {
      throw new Error(`Alert record ${alertLogId} not found or missing email payload.`);
    }

    const settings = AlertSettings.get();
    const from = settings.fromEmail || config.alerts.emailFrom || 'The Candlorre Alerts <alerts@thecandlorre.com>';
    const recipient = record.recipient;

    try {
      const provider = settings.emailProvider || config.alerts.emailProvider || 'resend';
      const apiKey = config.alerts.emailApiKey;

      if (provider === 'resend' && apiKey) {
        await this._sendViaResend({ from, to: recipient, subject: record.subject, html: record.htmlBody, apiKey });
      } else if (provider === 'sendgrid' && apiKey) {
        await this._sendViaSendGrid({ from, to: recipient, subject: record.subject, html: record.htmlBody, apiKey });
      } else if (provider === 'smtp' && config.alerts.smtp.host) {
        await this._sendViaSmtp({ from, to: recipient, subject: record.subject, html: record.htmlBody });
      } else {
        console.log(`[EmailService Retry] 📧 ALERT DISPATCHED TO: ${recipient} | SUBJECT: ${record.subject}`);
      }

      await AlertLog.markSent(record.id);
      return { success: true, alertId: record.id, status: 'SENT' };
    } catch (err) {
      await AlertLog.markFailed(record.id, err);
      throw err;
    }
  }

  /**
   * Resend API Handler
   */
  static async _sendViaResend({ from, to, subject, html, apiKey }) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from, to: [to], subject, html })
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(errorJson.message || `Resend API error status ${res.status}`);
    }
  }

  /**
   * SendGrid API Handler
   */
  static async _sendViaSendGrid({ from, to, subject, html, apiKey }) {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from.includes('<') ? from.match(/<([^>]+)>/)[1] : from },
        subject,
        content: [{ type: 'text/html', value: html }]
      })
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`SendGrid error status ${res.status}: ${errorText}`);
    }
  }

  /**
   * SMTP Transport Handler
   */
  static async _sendViaSmtp({ from, to, subject, html }) {
    const transporter = nodemailer.createTransport({
      host: config.alerts.smtp.host,
      port: config.alerts.smtp.port,
      secure: config.alerts.smtp.secure,
      auth: config.alerts.smtp.user ? {
        user: config.alerts.smtp.user,
        pass: config.alerts.smtp.pass
      } : undefined
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      html
    });
  }
}

export default EmailService;
