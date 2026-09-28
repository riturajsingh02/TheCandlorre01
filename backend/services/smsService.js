/**
 * THE Candlorre — PRODUCTION SMS & NOTIFICATION SERVICE
 * Real SMS gateway integration (Twilio / MSG91).
 * Never exposes OTPs to client responses.
 * Fails honestly when credentials are not configured or dispatch fails.
 */

import config from '../config/env.js';

export class SMSService {
  static isConfigured() {
    const { twilio, msg91 } = config.sms;
    const hasTwilio = Boolean(twilio && twilio.accountSid && twilio.authToken && twilio.fromPhone);
    const hasMsg91 = Boolean(msg91 && msg91.authKey);
    return hasTwilio || hasMsg91;
  }

  /**
   * Send an OTP code to a mobile number
   */
  static async sendOtp({ phone, otp, template = 'login' }) {
    if (!phone || !otp) {
      throw new Error('Phone number and OTP code are required.');
    }

    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    const message = `Your verification code for The Candlorre is ${otp}. Valid for 10 minutes. Do NOT share this code with anyone.`;

    const { twilio, msg91 } = config.sms;
    const errors = [];

    // 1. Try Twilio Provider if configured
    if (twilio && twilio.accountSid && twilio.authToken && twilio.fromPhone) {
      try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`;
        const auth = Buffer.from(`${twilio.accountSid}:${twilio.authToken}`).toString('base64');
        const formattedTo = cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`;
        const params = new URLSearchParams({
          To: formattedTo,
          From: twilio.fromPhone,
          Body: message
        });

        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString()
        });

        if (resp.ok) {
          console.log(`[SMS-Twilio] OTP dispatched to ${cleanPhone.slice(0, 3)}****${cleanPhone.slice(-2)}`);
          return { success: true, provider: 'twilio' };
        }
        const errJson = await resp.json();
        errors.push(`Twilio error: ${errJson.message || resp.statusText}`);
      } catch (err) {
        errors.push(`Twilio network: ${err.message}`);
      }
    }

    // 2. Try MSG91 Provider if configured
    if (msg91 && msg91.authKey) {
      try {
        const url = 'https://api.msg91.com/api/v5/otp';
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authkey: msg91.authKey
          },
          body: JSON.stringify({
            template_id: msg91.templateId || undefined,
            mobile: `91${cleanPhone}`,
            otp: otp
          })
        });

        if (resp.ok) {
          console.log(`[SMS-MSG91] OTP dispatched to ${cleanPhone.slice(0, 3)}****${cleanPhone.slice(-2)}`);
          return { success: true, provider: 'msg91' };
        }
        const errJson = await resp.json();
        errors.push(`MSG91 error: ${errJson.message || resp.statusText}`);
      } catch (err) {
        errors.push(`MSG91 network: ${err.message}`);
      }
    }

    // If no provider is configured, report honest configuration error
    if (!this.isConfigured()) {
      const errorMsg = 'SMS Gateway is not configured. Please configure TWILIO or MSG91 in Render environment variables.';
      console.error(`[SMS Error] ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    // If providers failed
    const errorSummary = errors.join('; ') || 'All configured SMS gateways failed to deliver message.';
    console.error(`[SMS Dispatch Error] ${errorSummary}`);
    return { success: false, error: errorSummary };
  }
}

export default SMSService;
