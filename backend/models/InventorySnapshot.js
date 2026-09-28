/**
 * THE Candlorre — INVENTORY SNAPSHOT MODEL
 * Variant-level real-time inventory tracking, price comparison, and state transition monitoring.
 */

import { db } from '../db/index.js';
import { AlertSettings } from './AlertSettings.js';

export class InventorySnapshot {
  static getSnapshotId(productId, variantId) {
    const cleanProd = String(productId || '').replace(/^gid:\/\/shopify\/Product\//, '');
    const cleanVar = String(variantId || '').replace(/^gid:\/\/shopify\/ProductVariant\//, '');
    return `${cleanProd}_${cleanVar}`;
  }

  static calculateState(quantity, thresholds = null) {
    const t = thresholds || AlertSettings.get();
    const critical = t.criticalStockThreshold ?? 2;
    const low = t.lowStockThreshold ?? 5;
    const warning = t.warningStockThreshold ?? 10;
    const qty = parseInt(quantity, 10) || 0;

    if (qty <= 0) return 'OUT_OF_STOCK';
    if (qty <= critical) return 'CRITICAL';
    if (qty <= low) return 'LOW';
    if (qty <= warning) return 'WARNING';
    return 'IN_STOCK';
  }

  static getAll() {
    return db.inventorySnapshots.find();
  }

  static getById(productId, variantId) {
    const id = this.getSnapshotId(productId, variantId);
    return db.inventorySnapshots.findById(id);
  }

  static async recordOrUpdate({
    productId,
    variantId,
    sku = '',
    productTitle = '',
    variantTitle = '',
    productHandle = '',
    imageUrl = '',
    price = 0,
    quantity = 0
  }) {
    const id = this.getSnapshotId(productId, variantId);
    const existing = db.inventorySnapshots.findById(id);
    const settings = AlertSettings.get();
    const newState = this.calculateState(quantity, settings);
    const now = new Date().toISOString();

    const currentPrice = typeof price === 'number' ? price : parseFloat(price) || 0;
    const currentQty = parseInt(quantity, 10) || 0;

    if (!existing) {
      const newSnapshot = {
        id,
        productId: String(productId),
        variantId: String(variantId),
        sku: sku || 'N/A',
        productTitle: productTitle || 'Candlorre Luxury Candle',
        variantTitle: variantTitle || 'Standard',
        productHandle: productHandle || '',
        imageUrl: imageUrl || '',
        price: currentPrice,
        lastPrice: currentPrice,
        quantity: currentQty,
        previousQuantity: currentQty,
        state: newState,
        previousState: newState,
        lastAlertSentAt: null,
        lastAlertSentType: null,
        lastRestockAt: currentQty > 0 ? now : null,
        lastOutOfStockAt: currentQty <= 0 ? now : null,
        createdAt: now,
        updatedAt: now
      };
      await db.inventorySnapshots.create(newSnapshot);
      return {
        snapshot: newSnapshot,
        transition: {
          isNew: true,
          stateChanged: false,
          priceChanged: false,
          previousState: newState,
          currentState: newState,
          previousQty: currentQty,
          currentQty,
          previousPrice: currentPrice,
          currentPrice
        }
      };
    }

    const previousQty = existing.quantity;
    const previousState = existing.state;
    const previousPrice = existing.price;
    const stateChanged = previousState !== newState;
    const priceChanged = Math.abs(previousPrice - currentPrice) >= 0.01;

    const updates = {
      sku: sku || existing.sku,
      productTitle: productTitle || existing.productTitle,
      variantTitle: variantTitle || existing.variantTitle,
      productHandle: productHandle || existing.productHandle,
      imageUrl: imageUrl || existing.imageUrl,
      price: currentPrice,
      lastPrice: previousPrice,
      quantity: currentQty,
      previousQuantity: previousQty,
      state: newState,
      previousState: previousState,
      updatedAt: now
    };

    if (previousQty <= 0 && currentQty > 0) {
      updates.lastRestockAt = now;
    }
    if (previousQty > 0 && currentQty <= 0) {
      updates.lastOutOfStockAt = now;
    }

    const updatedSnapshot = await db.inventorySnapshots.updateById(id, updates);

    return {
      snapshot: updatedSnapshot,
      transition: {
        isNew: false,
        stateChanged,
        priceChanged,
        priceDifference: currentPrice - previousPrice,
        previousState,
        currentState: newState,
        previousQty,
        currentQty,
        quantityDifference: currentQty - previousQty,
        previousPrice,
        currentPrice
      }
    };
  }

  static async markAlertSent(productId, variantId, alertType) {
    const id = this.getSnapshotId(productId, variantId);
    return await db.inventorySnapshots.updateById(id, {
      lastAlertSentAt: new Date().toISOString(),
      lastAlertSentType: alertType
    });
  }

  static getSummary() {
    const all = this.getAll();
    const settings = AlertSettings.get();

    let totalUnits = 0;
    let inStockCount = 0;
    let warningCount = 0;
    let lowStockCount = 0;
    let criticalStockCount = 0;
    let outOfStockCount = 0;

    const criticalItems = [];
    const lowStockItems = [];
    const outOfStockItems = [];
    const recentlyRestocked = [];

    const distinctProductIds = new Set();

    all.forEach(item => {
      distinctProductIds.add(item.productId);
      const qty = item.quantity || 0;
      totalUnits += qty;

      if (item.state === 'OUT_OF_STOCK') {
        outOfStockCount++;
        outOfStockItems.push(item);
      } else if (item.state === 'CRITICAL') {
        criticalStockCount++;
        criticalItems.push(item);
      } else if (item.state === 'LOW') {
        lowStockCount++;
        lowStockItems.push(item);
      } else if (item.state === 'WARNING') {
        warningCount++;
      } else {
        inStockCount++;
      }

      if (item.lastRestockAt) {
        const restockedTime = new Date(item.lastRestockAt).getTime();
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        if (restockedTime >= oneDayAgo) {
          recentlyRestocked.push(item);
        }
      }
    });

    return {
      totalProducts: distinctProductIds.size,
      totalVariants: all.length,
      totalUnits,
      inStockCount,
      warningCount,
      lowStockCount,
      criticalStockCount,
      outOfStockCount,
      criticalItems,
      lowStockItems,
      outOfStockItems,
      recentlyRestocked,
      all
    };
  }
}

export default InventorySnapshot;
