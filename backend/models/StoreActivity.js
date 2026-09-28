/**
 * THE Candlorre — STORE ACTIVITY MODEL
 * Audit log of real store events (inventory adjustments, orders, payments, webhooks, system health).
 */

import crypto from 'crypto';
import { db } from '../db/index.js';

export class StoreActivity {
  static async record({
    type, // 'inventory', 'order', 'payment', 'product', 'system', 'webhook'
    title,
    description,
    severity = 'info', // 'info' | 'warning' | 'critical'
    metadata = {}
  }) {
    const id = `act_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const record = {
      id,
      type,
      title,
      description,
      severity,
      metadata,
      createdAt: new Date().toISOString()
    };
    await db.storeActivity.create(record);
    return record;
  }

  static getAll(filter = {}) {
    const { type, limit = 50 } = filter;
    let list = db.storeActivity.find();

    if (type && type !== 'all') {
      list = list.filter(it => it.type === type);
    }

    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list.slice(0, parseInt(limit, 10) || 50);
  }
}

export default StoreActivity;
