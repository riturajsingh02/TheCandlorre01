/**
 * THE Candlorre — ALERT LOG MODEL
 * Stores persistent alert history, delivery status, retries, and deduplication states.
 */

import crypto from 'crypto';
import { db } from '../db/index.js';

export class AlertLog {
  static createId() {
    return `alt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  static async log({
    type,
    severity = 'info', // 'info' | 'warning' | 'important' | 'critical'
    subject,
    recipient,
    status = 'PENDING', // 'PENDING' | 'SENT' | 'FAILED' | 'RETRYING'
    htmlBody = '',
    error = null,
    metadata = {}
  }) {
    const id = this.createId();
    const now = new Date().toISOString();
    const record = {
      id,
      type,
      severity,
      subject,
      recipient,
      status,
      htmlBody,
      error: error ? (error.message || String(error)) : null,
      metadata,
      retryCount: 0,
      maxRetries: 3,
      nextRetryAt: status === 'FAILED' ? new Date(Date.now() + 60 * 1000).toISOString() : null,
      createdAt: now,
      sentAt: status === 'SENT' ? now : null
    };

    return await db.alertLogs.create(record);
  }

  static async markSent(id) {
    return await db.alertLogs.updateById(id, {
      status: 'SENT',
      sentAt: new Date().toISOString(),
      error: null
    });
  }

  static async markFailed(id, error) {
    const existing = db.alertLogs.findById(id);
    if (!existing) return null;

    const retryCount = (existing.retryCount || 0) + 1;
    const canRetry = retryCount <= (existing.maxRetries || 3);
    // Exponential backoff: 1 min, 5 min, 15 min
    const delayMinutes = Math.pow(3, retryCount);
    const nextRetryAt = canRetry
      ? new Date(Date.now() + delayMinutes * 60 * 1000).toISOString()
      : null;

    return await db.alertLogs.updateById(id, {
      status: canRetry ? 'RETRYING' : 'FAILED',
      retryCount,
      nextRetryAt,
      error: error ? (error.message || String(error)) : 'Delivery error'
    });
  }

  static getAll(filter = {}) {
    const { type, severity, status, search, limit = 100 } = filter;
    let list = db.alertLogs.find();

    if (type && type !== 'all') {
      list = list.filter(it => it.type.toLowerCase().includes(type.toLowerCase()));
    }
    if (severity && severity !== 'all') {
      list = list.filter(it => it.severity === severity);
    }
    if (status && status !== 'all') {
      list = list.filter(it => it.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(it =>
        (it.subject && it.subject.toLowerCase().includes(q)) ||
        (it.type && it.type.toLowerCase().includes(q)) ||
        (it.recipient && it.recipient.toLowerCase().includes(q))
      );
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list.slice(0, parseInt(limit, 10) || 100);
  }

  static getPendingRetries() {
    const now = new Date().toISOString();
    return db.alertLogs.find(it =>
      (it.status === 'RETRYING' || it.status === 'PENDING') &&
      it.nextRetryAt &&
      it.nextRetryAt <= now &&
      it.retryCount < (it.maxRetries || 3)
    );
  }

  static getById(id) {
    return db.alertLogs.findById(id);
  }

  static getCounts() {
    const all = db.alertLogs.find();
    return {
      total: all.length,
      sent: all.filter(it => it.status === 'SENT').length,
      pending: all.filter(it => it.status === 'PENDING').length,
      retrying: all.filter(it => it.status === 'RETRYING').length,
      failed: all.filter(it => it.status === 'FAILED').length,
      critical: all.filter(it => it.severity === 'critical').length,
      warning: all.filter(it => it.severity === 'warning').length,
      important: all.filter(it => it.severity === 'important').length,
      info: all.filter(it => it.severity === 'info').length
    };
  }
}

export default AlertLog;
