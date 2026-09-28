/**
 * THE Candlorre — BACKGROUND SCHEDULER & RECONCILIATION ENGINE
 * Handles automated daily reporting, periodic inventory monitoring, and email retries.
 */

import { AlertService } from './alertService.js';
import { EmailService } from './emailService.js';
import { AlertLog } from '../models/AlertLog.js';
import { AlertSettings } from '../models/AlertSettings.js';
import { ShopifyService } from './shopify.js';

class Scheduler {
  constructor() {
    this.intervalHandle = null;
    this.lastInventoryReportDate = null;
    this.lastSalesReportDate = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[Scheduler] ⏰ The Candlorre background alert & report scheduler started.');

    // Run tick every 60 seconds
    this.intervalHandle = setInterval(() => this.tick(), 60 * 1000);

    // Initial check after 5 seconds
    setTimeout(() => this.tick(), 5000);
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.isRunning = false;
  }

  async tick() {
    try {
      await this.processPendingRetries();
      await this.checkDailyReports();
    } catch (err) {
      console.error('[Scheduler Error]:', err.message);
    }
  }

  /**
   * Retry failed emails with exponential backoff
   */
  async processPendingRetries() {
    const pending = AlertLog.getPendingRetries();
    if (!pending || pending.length === 0) return;

    for (const record of pending) {
      try {
        console.log(`[Scheduler] Retrying alert ${record.id} (${record.subject})...`);
        await EmailService.retryAlert(record.id);
      } catch (err) {
        console.warn(`[Scheduler] Retry failed for ${record.id}:`, err.message);
      }
    }
  }

  /**
   * Check and trigger Daily Inventory & Sales Reports at scheduled hours
   */
  async checkDailyReports() {
    const settings = AlertSettings.get();
    const now = new Date();
    // Get Indian Standard Time hour and date string
    const istDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now); // YYYY-MM-DD
    const istHour = parseInt(
      new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(now),
      10
    );

    // Daily Inventory Report
    if (settings.enableDailyInventoryReport && istHour >= settings.dailyInventoryReportHour) {
      if (this.lastInventoryReportDate !== istDate) {
        this.lastInventoryReportDate = istDate;
        console.log(`[Scheduler] Triggering Daily Inventory Report for ${istDate}...`);
        try {
          await AlertService.generateDailyInventoryReport();
        } catch (err) {
          console.error('[Scheduler] Error in daily inventory report:', err);
        }
      }
    }

    // Daily Sales Report
    if (settings.enableDailySalesReport && istHour >= settings.dailySalesReportHour) {
      if (this.lastSalesReportDate !== istDate) {
        this.lastSalesReportDate = istDate;
        console.log(`[Scheduler] Triggering Daily Sales Report for ${istDate}...`);
        try {
          await AlertService.generateDailySalesReport();
        } catch (err) {
          console.error('[Scheduler] Error in daily sales report:', err);
        }
      }
    }
  }

  /**
   * Full inventory sync from Shopify
   */
  async syncInventoryFromShopify() {
    if (!ShopifyService.isConfigured()) return { synced: 0, configured: false };

    try {
      const products = await ShopifyService.getProducts({ first: 100 });
      let count = 0;
      for (const prod of products) {
        for (const variant of prod.variants || []) {
          await AlertService.evaluateVariantInventory({
            productId: prod.id,
            variantId: variant.id,
            sku: variant.sku,
            productTitle: prod.title,
            variantTitle: variant.title,
            productHandle: prod.handle,
            imageUrl: prod.image,
            price: variant.price,
            quantity: variant.stock
          });
          count++;
        }
      }
      return { synced: count, configured: true };
    } catch (err) {
      await AlertService.sendSystemErrorAlert({
        serviceName: 'Shopify Inventory Sync',
        error: err
      });
      throw err;
    }
  }
}

export const scheduler = new Scheduler();
export default scheduler;
