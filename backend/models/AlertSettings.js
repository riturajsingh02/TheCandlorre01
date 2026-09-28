/**
 * THE Candlorre — ALERT SETTINGS MODEL
 * Manages store alert thresholds, recipient emails, and report schedules.
 */

import { db } from '../db/index.js';
import { config } from '../config/env.js';

const SETTINGS_KEY = 'global_store_alert_settings';

export class AlertSettings {
  static getDefaultSettings() {
    return {
      id: SETTINGS_KEY,
      alertEmail: config.alerts.recipientEmail || 'thecandlorre@gmail.com',
      fromEmail: config.alerts.emailFrom || 'The Candlorre Alerts <alerts@thecandlorre.com>',
      emailProvider: config.alerts.emailProvider || 'resend',
      lowStockThreshold: config.alerts.thresholds.lowStock || 5,
      criticalStockThreshold: config.alerts.thresholds.criticalStock || 2,
      warningStockThreshold: config.alerts.thresholds.warningStock || 10,
      enableDailyInventoryReport: true,
      enableDailySalesReport: true,
      enableWeeklyReport: config.alerts.reports.enableWeeklyReport || false,
      dailyInventoryReportHour: config.alerts.reports.dailyInventoryHour || 9,
      dailySalesReportHour: config.alerts.reports.dailySalesHour || 21,
      enabledAlerts: {
        lowStock: true,
        criticalStock: true,
        outOfStock: true,
        backInStock: true,
        inventoryChange: true,
        newOrder: true,
        codOrder: true,
        paymentFailed: true,
        paymentConfirmed: true,
        refundIssued: true,
        orderStatus: true,
        priceChange: true,
        productCreated: true,
        productUpdated: true,
        productDeleted: true,
        systemError: true
      }
    };
  }

  static get() {
    const existing = db.alertSettings.findById(SETTINGS_KEY);
    if (!existing) {
      const defaults = this.getDefaultSettings();
      db.alertSettings.create(defaults);
      return defaults;
    }
    return {
      ...this.getDefaultSettings(),
      ...existing,
      enabledAlerts: {
        ...this.getDefaultSettings().enabledAlerts,
        ...(existing.enabledAlerts || {})
      }
    };
  }

  static async update(updates) {
    const current = this.get();
    const sanitized = {
      ...current,
      ...updates,
      id: SETTINGS_KEY,
      enabledAlerts: {
        ...current.enabledAlerts,
        ...(updates.enabledAlerts || {})
      },
      updatedAt: new Date().toISOString()
    };
    await db.alertSettings.upsert(SETTINGS_KEY, sanitized);
    return sanitized;
  }
}

export default AlertSettings;
