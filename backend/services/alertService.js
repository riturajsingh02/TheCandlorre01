/**
 * THE Candlorre — AUTOMATED ALERT & NOTIFICATION ENGINE
 * Monitors inventory, orders, payments, products, prices, and system events with deduplication.
 */

import { EmailService } from './emailService.js';
import { InventorySnapshot } from '../models/InventorySnapshot.js';
import { AlertSettings } from '../models/AlertSettings.js';
import { StoreActivity } from '../models/StoreActivity.js';
import { db } from '../db/index.js';
import { config } from '../config/env.js';

export class AlertService {
  /**
   * Safe URL helper for Shopify Admin Product
   */
  static getShopifyProductAdminUrl(productId) {
    const cleanId = String(productId || '').replace(/^gid:\/\/shopify\/Product\//, '');
    const domain = config.shopify.storeDomain ? config.shopify.storeDomain.replace(/^https?:\/\//, '') : 'admin.shopify.com';
    return `https://${domain}/admin/products/${cleanId}`;
  }

  /**
   * Safe URL helper for Shopify Admin Order
   */
  static getShopifyOrderAdminUrl(orderId) {
    const cleanId = String(orderId || '').replace(/^gid:\/\/shopify\/Order\//, '');
    const domain = config.shopify.storeDomain ? config.shopify.storeDomain.replace(/^https?:\/\//, '') : 'admin.shopify.com';
    return `https://${domain}/admin/orders/${cleanId}`;
  }

  // =========================================================================
  // 1-4. INVENTORY & STOCK ALERTS WITH DEDUPLICATION
  // =========================================================================

  /**
   * Process an inventory update for a product variant and trigger alerts on state transitions
   */
  static async evaluateVariantInventory({
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
    const settings = AlertSettings.get();
    const result = await InventorySnapshot.recordOrUpdate({
      productId,
      variantId,
      sku,
      productTitle,
      variantTitle,
      productHandle,
      imageUrl,
      price,
      quantity
    });

    const { snapshot, transition } = result;
    const adminUrl = this.getShopifyProductAdminUrl(productId);

    // Record activity log
    if (transition.quantityDifference !== 0 && !transition.isNew) {
      await StoreActivity.record({
        type: 'inventory',
        title: `Inventory ${transition.quantityDifference > 0 ? 'Restocked' : 'Adjusted'}`,
        description: `${productTitle} (${variantTitle}) changed from ${transition.previousQty} to ${transition.currentQty} units.`,
        severity: transition.currentState === 'OUT_OF_STOCK' ? 'critical' : 'info',
        metadata: { productId, variantId, sku, previousQty: transition.previousQty, currentQty: transition.currentQty }
      });
    }

    // Check for Price Change Alert
    if (transition.priceChanged && !transition.isNew && settings.enabledAlerts.priceChange) {
      await this.sendPriceChangeAlert({
        productTitle,
        variantTitle,
        sku: snapshot.sku,
        previousPrice: transition.previousPrice,
        newPrice: transition.currentPrice,
        difference: transition.priceDifference,
        productId,
        productHandle,
        imageUrl: snapshot.imageUrl
      });
    }

    // STATE TRANSITION DEDUPLICATION
    // Only dispatch alerts when entering a new threshold state!
    const { currentState, previousState, isNew } = transition;

    // Case 1: Out of Stock Alert (Inventory = 0, Transition Available -> Out of Stock)
    if (currentState === 'OUT_OF_STOCK' && (previousState !== 'OUT_OF_STOCK' || isNew)) {
      if (settings.enabledAlerts.outOfStock) {
        await this.sendOutOfStockAlert({
          productTitle,
          variantTitle,
          sku: snapshot.sku,
          lastQty: transition.previousQty || 0,
          currentQty: 0,
          productId,
          productHandle,
          imageUrl: snapshot.imageUrl,
          adminUrl
        });
        await InventorySnapshot.markAlertSent(productId, variantId, 'OUT_OF_STOCK');
      }
      return;
    }

    // Case 2: Back in Stock Alert (Transition Out of Stock -> Available)
    if (previousState === 'OUT_OF_STOCK' && currentState !== 'OUT_OF_STOCK') {
      if (settings.enabledAlerts.backInStock) {
        await this.sendBackInStockAlert({
          productTitle,
          variantTitle,
          sku: snapshot.sku,
          newStock: transition.currentQty,
          productId,
          productHandle,
          imageUrl: snapshot.imageUrl,
          adminUrl
        });
        await InventorySnapshot.markAlertSent(productId, variantId, 'BACK_IN_STOCK');
      }
      return;
    }

    // Case 3: Critical Stock Alert (1-2 units, Transition to Critical)
    if (currentState === 'CRITICAL' && previousState !== 'CRITICAL') {
      if (settings.enabledAlerts.criticalStock) {
        await this.sendCriticalStockAlert({
          productTitle,
          variantTitle,
          sku: snapshot.sku,
          currentStock: transition.currentQty,
          previousStock: transition.previousQty,
          threshold: settings.criticalStockThreshold,
          productId,
          productHandle,
          imageUrl: snapshot.imageUrl,
          adminUrl
        });
        await InventorySnapshot.markAlertSent(productId, variantId, 'CRITICAL_STOCK');
      }
      return;
    }

    // Case 4: Low Stock Alert (3-5 units, Transition to Low from higher state)
    if (currentState === 'LOW' && (previousState === 'IN_STOCK' || previousState === 'WARNING' || isNew)) {
      if (settings.enabledAlerts.lowStock) {
        await this.sendLowStockAlert({
          productTitle,
          variantTitle,
          sku: snapshot.sku,
          currentStock: transition.currentQty,
          previousStock: transition.previousQty,
          threshold: settings.lowStockThreshold,
          productId,
          productHandle,
          imageUrl: snapshot.imageUrl,
          adminUrl
        });
        await InventorySnapshot.markAlertSent(productId, variantId, 'LOW_STOCK');
      }
      return;
    }
  }

  /**
   * 1. Low Stock Alert Email
   */
  static async sendLowStockAlert({ productTitle, variantTitle, sku, currentStock, previousStock, threshold, productId, productHandle, imageUrl, adminUrl }) {
    const content = `
      <p>A product variant has reached the <strong>Low Stock Threshold</strong> of &le; ${threshold} units.</p>
      
      <div class="product-box">
        <table style="width: 100%;">
          <tr>
            ${imageUrl ? `<td style="width: 70px; vertical-align: top;"><img src="${imageUrl}" alt="${productTitle}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #EAE5D9;"></td>` : ''}
            <td style="vertical-align: top;">
              <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #2B050B;">${productTitle}</h3>
              <p style="margin: 0 0 4px 0; color: #666; font-size: 13px;">Variant: <strong>${variantTitle}</strong> &bull; SKU: <code>${sku || 'N/A'}</code></p>
              <p style="margin: 0; font-size: 14px;">Current Inventory: <span class="stat-badge" style="background-color: #FEF3C7; color: #92400E;">${currentStock} units remaining</span></p>
            </td>
          </tr>
        </table>
      </div>

      <table class="info-table">
        <tr><th>Metric</th><th>Details</th></tr>
        <tr><td>Product Reference</td><td>${productTitle} (${variantTitle})</td></tr>
        <tr><td>SKU</td><td><code>${sku || 'N/A'}</code></td></tr>
        <tr><td>Current Stock</td><td><strong>${currentStock}</strong> units</td></tr>
        <tr><td>Previous Stock</td><td>${previousStock !== null && previousStock !== undefined ? `${previousStock} units` : 'N/A'}</td></tr>
        <tr><td>Threshold Trigger</td><td>&le; ${threshold} units (Low Stock)</td></tr>
        <tr><td>Status</td><td><span style="color: #D97706; font-weight: 600;">LOW STOCK WARNING</span></td></tr>
      </table>

      <p style="margin-top: 16px; color: #555;"><strong>Recommended Action:</strong> Plan a micro-batch pour or reorder botanical wax/wicks for this fragrance line.</p>
    `;

    return await EmailService.sendEmail({
      subject: `⚠️ The Candlorre — Low Stock Alert (${productTitle} - ${variantTitle})`,
      severity: 'warning',
      badgeText: 'Low Stock Alert',
      title: `Low Stock: ${productTitle}`,
      contentHtml: content,
      alertType: 'LOW_STOCK',
      actionButton: { label: 'Manage Inventory in Shopify', url: adminUrl },
      metadata: { productId, sku, currentStock }
    });
  }

  /**
   * 1b. Critical Stock Alert Email
   */
  static async sendCriticalStockAlert({ productTitle, variantTitle, sku, currentStock, previousStock, threshold, productId, productHandle, imageUrl, adminUrl }) {
    const content = `
      <p style="color: #991B1B; font-weight: 600; font-size: 15px;">Immediate attention required: Inventory for this candle has dropped to critical levels.</p>
      
      <div class="product-box" style="border-left: 4px solid #DC2626;">
        <table style="width: 100%;">
          <tr>
            ${imageUrl ? `<td style="width: 70px; vertical-align: top;"><img src="${imageUrl}" alt="${productTitle}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #EAE5D9;"></td>` : ''}
            <td style="vertical-align: top;">
              <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #2B050B;">${productTitle}</h3>
              <p style="margin: 0 0 4px 0; color: #666; font-size: 13px;">Variant: <strong>${variantTitle}</strong> &bull; SKU: <code>${sku || 'N/A'}</code></p>
              <p style="margin: 0; font-size: 14px;">Current Inventory: <span class="stat-badge" style="background-color: #FEE2E2; color: #991B1B; font-weight: bold;">${currentStock} unit${currentStock === 1 ? '' : 's'} left</span></p>
            </td>
          </tr>
        </table>
      </div>

      <table class="info-table">
        <tr><th>Metric</th><th>Details</th></tr>
        <tr><td>Product Reference</td><td>${productTitle} (${variantTitle})</td></tr>
        <tr><td>SKU</td><td><code>${sku || 'N/A'}</code></td></tr>
        <tr><td>Current Stock</td><td><strong style="color: #DC2626; font-size: 15px;">${currentStock}</strong> units remaining</td></tr>
        <tr><td>Previous Stock</td><td>${previousStock !== null && previousStock !== undefined ? `${previousStock} units` : 'N/A'}</td></tr>
        <tr><td>Critical Threshold</td><td>&le; ${threshold} units</td></tr>
        <tr><td>Severity</td><td><strong style="color: #DC2626;">CRITICAL RESTOCK NEEDED</strong></td></tr>
      </table>

      <p style="margin-top: 16px; color: #555;"><strong>Recommended Action:</strong> Restock this botanical candle variant immediately to prevent out-of-stock disruption on the storefront.</p>
    `;

    return await EmailService.sendEmail({
      subject: `🚨 Critical Stock Alert — The Candlorre (${productTitle} - ${variantTitle})`,
      severity: 'critical',
      badgeText: 'Critical Stock Alert',
      title: `Critical Stock: ${productTitle}`,
      contentHtml: content,
      alertType: 'CRITICAL_STOCK',
      actionButton: { label: 'Restock Variant in Shopify', url: adminUrl },
      metadata: { productId, sku, currentStock }
    });
  }

  /**
   * 2. Out of Stock Alert Email
   */
  static async sendOutOfStockAlert({ productTitle, variantTitle, sku, lastQty, currentQty, productId, productHandle, imageUrl, adminUrl }) {
    const timeStr = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
    const content = `
      <p style="color: #991B1B; font-weight: 600; font-size: 15px;">🔴 This product variant is now completely sold out and unavailable for purchase on the storefront.</p>
      
      <div class="product-box" style="border-left: 4px solid #DC2626; background-color: #FEF2F2;">
        <table style="width: 100%;">
          <tr>
            ${imageUrl ? `<td style="width: 70px; vertical-align: top;"><img src="${imageUrl}" alt="${productTitle}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #EAE5D9;"></td>` : ''}
            <td style="vertical-align: top;">
              <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #2B050B;">${productTitle}</h3>
              <p style="margin: 0 0 4px 0; color: #666; font-size: 13px;">Variant: <strong>${variantTitle}</strong> &bull; SKU: <code>${sku || 'N/A'}</code></p>
              <p style="margin: 0; font-size: 14px;"><span class="stat-badge" style="background-color: #DC2626; color: #FFFFFF; font-weight: bold;">0 UNITS &bull; OUT OF STOCK</span></p>
            </td>
          </tr>
        </table>
      </div>

      <table class="info-table">
        <tr><th>Metric</th><th>Details</th></tr>
        <tr><td>Product Name</td><td>${productTitle}</td></tr>
        <tr><td>Variant</td><td>${variantTitle}</td></tr>
        <tr><td>SKU</td><td><code>${sku || 'N/A'}</code></td></tr>
        <tr><td>Last Available Qty</td><td>${lastQty} unit(s)</td></tr>
        <tr><td>Current Inventory</td><td><strong>0</strong> (Sold Out)</td></tr>
        <tr><td>Depleted At</td><td>${timeStr} IST</td></tr>
        <tr><td>Storefront Status</td><td>Purchasing Disabled / Sold Out Badge Active</td></tr>
      </table>

      <p style="margin-top: 16px; color: #555;"><strong>Suggested Action:</strong> Initiate inventory restock or adjust production queue for this luxury candle item.</p>
    `;

    return await EmailService.sendEmail({
      subject: `🔴 OUT OF STOCK — ${productTitle} (${variantTitle})`,
      severity: 'critical',
      badgeText: 'Out of Stock Alert',
      title: `Out of Stock: ${productTitle}`,
      contentHtml: content,
      alertType: 'OUT_OF_STOCK',
      actionButton: { label: 'Update Shopify Stock', url: adminUrl },
      metadata: { productId, sku, currentQty: 0 }
    });
  }

  /**
   * 3. Back in Stock Alert Email
   */
  static async sendBackInStockAlert({ productTitle, variantTitle, sku, newStock, productId, productHandle, imageUrl, adminUrl }) {
    const timeStr = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
    const content = `
      <p style="color: #166534; font-weight: 600; font-size: 15px;">🟢 Good news: A previously sold-out candle has received fresh inventory and is now active for client orders.</p>
      
      <div class="product-box" style="border-left: 4px solid #16A34A; background-color: #F0FDF4;">
        <table style="width: 100%;">
          <tr>
            ${imageUrl ? `<td style="width: 70px; vertical-align: top;"><img src="${imageUrl}" alt="${productTitle}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #EAE5D9;"></td>` : ''}
            <td style="vertical-align: top;">
              <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #2B050B;">${productTitle}</h3>
              <p style="margin: 0 0 4px 0; color: #666; font-size: 13px;">Variant: <strong>${variantTitle}</strong> &bull; SKU: <code>${sku || 'N/A'}</code></p>
              <p style="margin: 0; font-size: 14px;"><span class="stat-badge" style="background-color: #DCFCE7; color: #166534; font-weight: bold;">+${newStock} UNITS IN STOCK</span></p>
            </td>
          </tr>
        </table>
      </div>

      <table class="info-table">
        <tr><th>Metric</th><th>Details</th></tr>
        <tr><td>Product Name</td><td>${productTitle}</td></tr>
        <tr><td>Variant</td><td>${variantTitle}</td></tr>
        <tr><td>SKU</td><td><code>${sku || 'N/A'}</code></td></tr>
        <tr><td>New Stock Level</td><td><strong>${newStock}</strong> units available</td></tr>
        <tr><td>Restock Time</td><td>${timeStr} IST</td></tr>
        <tr><td>Store Status</td><td>Active &amp; Ready for Purchase</td></tr>
      </table>
    `;

    return await EmailService.sendEmail({
      subject: `🟢 Back in Stock — ${productTitle} (${variantTitle})`,
      severity: 'info',
      badgeText: 'Back in Stock',
      title: `Back in Stock: ${productTitle}`,
      contentHtml: content,
      alertType: 'BACK_IN_STOCK',
      actionButton: { label: 'View Product on Store', url: adminUrl },
      metadata: { productId, sku, newStock }
    });
  }

  /**
   * 12. Price Change Alert Email
   */
  static async sendPriceChangeAlert({ productTitle, variantTitle, sku, previousPrice, newPrice, difference, productId, productHandle, imageUrl }) {
    const isIncrease = difference > 0;
    const adminUrl = this.getShopifyProductAdminUrl(productId);

    const content = `
      <p>A price modification has been detected for <strong>${productTitle}</strong> (${variantTitle}).</p>

      <table class="info-table">
        <tr><th>Property</th><th>Value</th></tr>
        <tr><td>Product Reference</td><td>${productTitle}</td></tr>
        <tr><td>Variant</td><td>${variantTitle}</td></tr>
        <tr><td>SKU</td><td><code>${sku || 'N/A'}</code></td></tr>
        <tr><td>Previous Price</td><td>₹${previousPrice.toLocaleString('en-IN')}</td></tr>
        <tr><td>New Price</td><td><strong>₹${newPrice.toLocaleString('en-IN')}</strong></td></tr>
        <tr><td>Price Shift</td><td><strong style="color: ${isIncrease ? '#16A34A' : '#DC2626'};">${isIncrease ? '+' : ''}₹${difference.toLocaleString('en-IN')}</strong></td></tr>
      </table>

      <p style="color: #666; font-size: 13px;">If this price change was unintentional, please review your Shopify pricing catalog immediately.</p>
    `;

    return await EmailService.sendEmail({
      subject: `⚠️ Product Price Changed — ${productTitle} (${variantTitle})`,
      severity: 'warning',
      badgeText: 'Price Change Alert',
      title: `Price Changed: ${productTitle}`,
      contentHtml: content,
      alertType: 'PRICE_CHANGED',
      actionButton: { label: 'Review in Shopify', url: adminUrl },
      metadata: { productId, previousPrice, newPrice, difference }
    });
  }

  // =========================================================================
  // 7-10. ORDER & PAYMENT ALERTS
  // =========================================================================

  /**
   * 7 & 8 & 9. New Order Alert (Prepaid & COD)
   */
  static async handleNewOrder(order) {
    const settings = AlertSettings.get();
    const isCod = String(order.paymentMethod || order.gateway || '').toLowerCase().includes('cod') ||
                  String(order.financial_status || '').toLowerCase() === 'pending';

    const orderNumber = order.order_number || order.orderNumber || order.id || 'N/A';
    const orderId = order.id;
    const adminUrl = this.getShopifyOrderAdminUrl(orderId);

    const customerName = `${order.customer?.first_name || order.shipping_address?.first_name || 'Valued'} ${order.customer?.last_name || order.shipping_address?.last_name || 'Client'}`.trim();
    const customerEmail = order.email || order.customer?.email || 'N/A';
    const customerPhone = order.phone || order.customer?.phone || order.shipping_address?.phone || 'N/A';

    const items = order.line_items || order.items || [];
    const totalPrice = parseFloat(order.total_price || order.totalPrice || order.total || 0);
    const currency = order.currency || 'INR';

    const itemsHtml = items.map(it => `
      <tr>
        <td><strong>${it.title || it.name}</strong> ${it.variant_title ? `<br><small style="color:#666;">${it.variant_title}</small>` : ''}</td>
        <td><code>${it.sku || 'N/A'}</code></td>
        <td style="text-align: center;">${it.quantity}</td>
        <td style="text-align: right;">₹${parseFloat(it.price || 0).toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

    const shipping = order.shipping_address || {};
    const addressStr = [
      shipping.address1,
      shipping.address2,
      shipping.city,
      shipping.province,
      shipping.zip || shipping.pincode,
      shipping.country
    ].filter(Boolean).join(', ') || 'Standard Shipping';

    // Record Activity
    await StoreActivity.record({
      type: 'order',
      title: `New ${isCod ? 'COD' : 'Prepaid'} Order #${orderNumber}`,
      description: `${customerName} placed order for ₹${totalPrice.toLocaleString('en-IN')} (${items.length} items).`,
      severity: isCod ? 'warning' : 'info',
      metadata: { orderId, orderNumber, totalPrice, isCod }
    });

    if (isCod) {
      if (!settings.enabledAlerts.codOrder) return;

      const content = `
        <p style="color: #9A3412; font-weight: 600; font-size: 15px;">💵 A new Cash on Delivery (COD) order has been received and awaits verification.</p>

        <table class="info-table">
          <tr><th>Order Reference</th><th>Order #${orderNumber}</th></tr>
          <tr><td>Order Total</td><td><strong>₹${totalPrice.toLocaleString('en-IN')} ${currency}</strong></td></tr>
          <tr><td>Payment Method</td><td><span class="stat-badge" style="background-color: #FEF3C7; color: #92400E; font-weight: bold;">CASH ON DELIVERY (COD)</span></td></tr>
          <tr><td>Customer Name</td><td><strong>${customerName}</strong></td></tr>
          <tr><td>Customer Email</td><td>${customerEmail}</td></tr>
          ${customerPhone !== 'N/A' ? `<tr><td>Contact Phone</td><td><strong>${customerPhone}</strong></td></tr>` : ''}
          <tr><td>Delivery Address</td><td>${addressStr}</td></tr>
        </table>

        <h4 style="margin: 20px 0 8px 0; color: #2B050B; text-transform: uppercase; letter-spacing: 0.5px; font-size: 12px;">Ordered Candle Items</h4>
        <table class="info-table">
          <thead>
            <tr><th>Item</th><th>SKU</th><th style="text-align: center;">Qty</th><th style="text-align: right;">Price</th></tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <p style="margin-top: 16px; color: #666; font-size: 13px;"><strong>Recommended Step:</strong> Review address authenticity or trigger automated SMS confirmation prior to fulfillment.</p>
      `;

      return await EmailService.sendEmail({
        subject: `💵 The Candlorre — New COD Order #${orderNumber} (₹${totalPrice.toLocaleString('en-IN')})`,
        severity: 'important',
        badgeText: 'New COD Order',
        title: `COD Order #${orderNumber}`,
        contentHtml: content,
        alertType: 'NEW_COD_ORDER',
        actionButton: { label: 'View Order in Shopify', url: adminUrl },
        metadata: { orderId, orderNumber, totalPrice, isCod: true }
      });
    } else {
      if (!settings.enabledAlerts.newOrder) return;

      const content = `
        <p style="color: #166534; font-weight: 600; font-size: 15px;">🛍️ A new prepaid order has been successfully placed and payment captured.</p>

        <table class="info-table">
          <tr><th>Order Reference</th><th>Order #${orderNumber}</th></tr>
          <tr><td>Gross Value</td><td><strong style="color: #166534; font-size: 15px;">₹${totalPrice.toLocaleString('en-IN')} ${currency}</strong></td></tr>
          <tr><td>Payment Status</td><td><span class="stat-badge" style="background-color: #DCFCE7; color: #166534; font-weight: bold;">PAID / CONFIRMED</span></td></tr>
          <tr><td>Customer</td><td>${customerName} (${customerEmail})</td></tr>
          <tr><td>Shipping Address</td><td>${addressStr}</td></tr>
        </table>

        <h4 style="margin: 20px 0 8px 0; color: #2B050B; text-transform: uppercase; letter-spacing: 0.5px; font-size: 12px;">Ordered Botanical Items</h4>
        <table class="info-table">
          <thead>
            <tr><th>Item</th><th>SKU</th><th style="text-align: center;">Qty</th><th style="text-align: right;">Price</th></tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      `;

      return await EmailService.sendEmail({
        subject: `🛍️ The Candlorre — New Order Received #${orderNumber} (₹${totalPrice.toLocaleString('en-IN')})`,
        severity: 'info',
        badgeText: 'New Order Received',
        title: `Order #${orderNumber}`,
        contentHtml: content,
        alertType: 'NEW_ORDER',
        actionButton: { label: 'View Order in Shopify', url: adminUrl },
        metadata: { orderId, orderNumber, totalPrice, isCod: false }
      });
    }
  }

  /**
   * 8. Payment Alerts (Failure, Verification Failure, Refunds)
   */
  static async handlePaymentEvent({ orderId, orderNumber, eventType, amount, reason, paymentGateway = 'Razorpay' }) {
    const settings = AlertSettings.get();
    const adminUrl = this.getShopifyOrderAdminUrl(orderId);

    if (eventType === 'PAYMENT_FAILED' || eventType === 'PAYMENT_VERIFICATION_FAILED') {
      if (!settings.enabledAlerts.paymentFailed) return;

      const content = `
        <p style="color: #991B1B; font-weight: 600; font-size: 15px;">⚠️ Payment processing or signature verification failed for Order #${orderNumber || orderId}.</p>

        <table class="info-table">
          <tr><th>Order Reference</th><th>#${orderNumber || orderId}</th></tr>
          <tr><td>Attempted Amount</td><td>₹${parseFloat(amount || 0).toLocaleString('en-IN')}</td></tr>
          <tr><td>Gateway</td><td>${paymentGateway}</td></tr>
          <tr><td>Failure Reason</td><td><strong style="color: #DC2626;">${EmailService.sanitizeText(reason || 'Transaction declined or signature mismatch')}</strong></td></tr>
          <tr><td>Status</td><td><span class="stat-badge" style="background-color: #FEE2E2; color: #991B1B;">PAYMENT FAILED</span></td></tr>
        </table>

        <p style="color: #666; font-size: 13px;">No credentials were exposed. The customer has been prompted to re-attempt checkout.</p>
      `;

      return await EmailService.sendEmail({
        subject: `⚠️ The Candlorre — Payment Verification Failed (Order #${orderNumber || orderId})`,
        severity: 'critical',
        badgeText: 'Payment Alert',
        title: `Payment Failed: Order #${orderNumber || orderId}`,
        contentHtml: content,
        alertType: 'PAYMENT_FAILED',
        actionButton: { label: 'Inspect Order in Shopify', url: adminUrl },
        metadata: { orderId, orderNumber, amount, reason }
      });
    }

    if (eventType === 'REFUND_ISSUED') {
      if (!settings.enabledAlerts.refundIssued) return;

      const content = `
        <p>A refund has been processed for Order #${orderNumber || orderId}.</p>

        <table class="info-table">
          <tr><th>Order Reference</th><th>#${orderNumber || orderId}</th></tr>
          <tr><td>Refunded Amount</td><td><strong style="color: #EA580C;">₹${parseFloat(amount || 0).toLocaleString('en-IN')}</strong></td></tr>
          <tr><td>Reason</td><td>${reason || 'Customer return or cancellation request'}</td></tr>
        </table>
      `;

      return await EmailService.sendEmail({
        subject: `↩️ The Candlorre — Refund Issued (Order #${orderNumber || orderId})`,
        severity: 'important',
        badgeText: 'Refund Processed',
        title: `Refund: Order #${orderNumber || orderId}`,
        contentHtml: content,
        alertType: 'REFUND_ISSUED',
        actionButton: { label: 'View Refund in Shopify', url: adminUrl },
        metadata: { orderId, orderNumber, amount, reason }
      });
    }
  }

  /**
   * 10. Order Status Lifecycle Alert (Fulfilled, Shipped, Delivered, Cancelled)
   */
  static async handleOrderStatusChange({ orderId, orderNumber, status, trackingNumber, trackingCompany }) {
    const settings = AlertSettings.get();
    if (!settings.enabledAlerts.orderStatus) return;

    const adminUrl = this.getShopifyOrderAdminUrl(orderId);
    const statusMap = {
      fulfilled: { title: 'Order Fulfilled', severity: 'info', icon: '📦' },
      shipped: { title: 'Order Dispatched / Shipped', severity: 'info', icon: '🚚' },
      delivered: { title: 'Order Delivered', severity: 'info', icon: '✨' },
      cancelled: { title: 'Order Cancelled', severity: 'important', icon: '🚫' }
    };

    const info = statusMap[status.toLowerCase()] || { title: `Order Status: ${status}`, severity: 'info', icon: '📋' };

    const content = `
      <p>Order #${orderNumber || orderId} status has updated to <strong>${status.toUpperCase()}</strong>.</p>

      <table class="info-table">
        <tr><th>Order Reference</th><th>#${orderNumber || orderId}</th></tr>
        <tr><td>Current Status</td><td><strong>${status.toUpperCase()}</strong></td></tr>
        ${trackingNumber ? `<tr><td>Tracking Number</td><td><code>${trackingNumber}</code> (${trackingCompany || 'Courier'})</td></tr>` : ''}
      </table>
    `;

    return await EmailService.sendEmail({
      subject: `${info.icon} The Candlorre — ${info.title} #${orderNumber || orderId}`,
      severity: info.severity,
      badgeText: info.title,
      title: `${info.title}: #${orderNumber || orderId}`,
      contentHtml: content,
      alertType: 'ORDER_STATUS',
      actionButton: { label: 'View Order Details', url: adminUrl },
      metadata: { orderId, orderNumber, status, trackingNumber }
    });
  }

  // =========================================================================
  // 11. PRODUCT LIFECYCLE ALERTS
  // =========================================================================

  static async handleProductCreated(product) {
    const settings = AlertSettings.get();
    if (!settings.enabledAlerts.productCreated) return;

    const adminUrl = this.getShopifyProductAdminUrl(product.id);
    const variants = product.variants || [];

    const variantsHtml = variants.map(v => `
      <tr>
        <td><strong>${v.title}</strong></td>
        <td><code>${v.sku || 'N/A'}</code></td>
        <td>₹${parseFloat(v.price || 0).toLocaleString('en-IN')}</td>
        <td>${v.stock ?? v.quantity ?? 'N/A'} units</td>
      </tr>
    `).join('');

    const content = `
      <p>A new luxury botanical candle product has been published to the catalog.</p>

      <div class="product-box">
        <h3 style="margin: 0 0 6px 0; color: #2B050B;">${product.title}</h3>
        <p style="margin: 0 0 6px 0; color: #666; font-size: 13px;">Handle: <code>${product.handle}</code> &bull; Type: ${product.productType || 'Candle'}</p>
      </div>

      <h4 style="margin: 16px 0 8px 0; font-size: 12px; text-transform: uppercase;">Product Variants</h4>
      <table class="info-table">
        <thead>
          <tr><th>Variant</th><th>SKU</th><th>Price</th><th>Initial Stock</th></tr>
        </thead>
        <tbody>
          ${variantsHtml || '<tr><td colspan="4">No variants defined</td></tr>'}
        </tbody>
      </table>
    `;

    return await EmailService.sendEmail({
      subject: `🆕 The Candlorre — New Product Added (${product.title})`,
      severity: 'info',
      badgeText: 'New Product Added',
      title: `Product Added: ${product.title}`,
      contentHtml: content,
      alertType: 'PRODUCT_CREATED',
      actionButton: { label: 'View in Shopify Admin', url: adminUrl },
      metadata: { productId: product.id, title: product.title }
    });
  }

  // =========================================================================
  // 13. SYSTEM & BACKEND ERROR ALERTS
  // =========================================================================

  static async sendSystemErrorAlert({ serviceName, error, context = {} }) {
    const settings = AlertSettings.get();
    if (!settings.enabledAlerts.systemError) return;

    const rawError = error?.message || String(error || 'Unknown exception');
    const safeError = EmailService.sanitizeText(rawError);
    const env = config.server.env || 'production';
    const timestamp = new Date().toISOString();

    const content = `
      <p style="color: #991B1B; font-weight: 600; font-size: 15px;">A critical backend or synchronization operation has reported an exception.</p>

      <table class="info-table">
        <tr><th>Service / Subsystem</th><th>${EmailService.sanitizeText(serviceName)}</th></tr>
        <tr><td>Environment</td><td><code>${env}</code></td></tr>
        <tr><td>Timestamp</td><td>${timestamp}</td></tr>
        <tr><td>Safe Error Message</td><td><strong style="color: #DC2626;">${safeError}</strong></td></tr>
      </table>

      <p style="color: #666; font-size: 12px;"><strong>Security Note:</strong> All secret tokens, API keys, and customer passwords have been redacted automatically from this notification.</p>
    `;

    // Record activity
    await StoreActivity.record({
      type: 'system',
      title: `System Error in ${serviceName}`,
      description: safeError,
      severity: 'critical',
      metadata: { serviceName, safeError }
    });

    return await EmailService.sendEmail({
      subject: `🔥 The Candlorre — Critical System Error (${serviceName})`,
      severity: 'critical',
      badgeText: 'System Error',
      title: `Error: ${serviceName}`,
      contentHtml: content,
      alertType: 'SYSTEM_ERROR',
      metadata: { serviceName, safeError }
    });
  }

  // =========================================================================
  // 5. DAILY INVENTORY REPORT
  // =========================================================================

  static async generateDailyInventoryReport() {
    const summary = InventorySnapshot.getSummary();
    const dateStr = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full' });

    const lowStockRows = summary.lowStockItems.map(it => `
      <tr>
        <td><strong>${it.productTitle}</strong></td>
        <td>${it.variantTitle}</td>
        <td><code>${it.sku || 'N/A'}</code></td>
        <td style="color: #D97706; font-weight: bold;">${it.quantity}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" style="color: #666; text-align:center;">No items currently in low stock state.</td></tr>';

    const criticalRows = summary.criticalItems.map(it => `
      <tr>
        <td><strong>${it.productTitle}</strong></td>
        <td>${it.variantTitle}</td>
        <td><code>${it.sku || 'N/A'}</code></td>
        <td style="color: #DC2626; font-weight: bold;">${it.quantity}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" style="color: #666; text-align:center;">No items currently in critical stock state.</td></tr>';

    const outOfStockRows = summary.outOfStockItems.map(it => `
      <tr>
        <td><strong>${it.productTitle}</strong></td>
        <td>${it.variantTitle}</td>
        <td><code>${it.sku || 'N/A'}</code></td>
      </tr>
    `).join('') || '<tr><td colspan="3" style="color: #666; text-align:center;">All candle variants are currently in stock.</td></tr>';

    const restockedRows = summary.recentlyRestocked.map(it => `
      <tr>
        <td><strong>${it.productTitle}</strong></td>
        <td>${it.variantTitle}</td>
        <td style="color: #16A34A; font-weight: bold;">${it.quantity} units</td>
      </tr>
    `).join('') || '<tr><td colspan="3" style="color: #666; text-align:center;">No restocks recorded in the last 24 hours.</td></tr>';

    const content = `
      <p>Daily automated stock reconciliation report for <strong>${dateStr}</strong>.</p>

      <div style="display: flex; gap: 10px; margin: 16px 0; text-align: center;">
        <div style="flex: 1; background: #FCFAF8; border: 1px solid #EAE5D9; padding: 12px; border-radius: 6px;">
          <div style="font-size: 11px; color: #666; text-transform: uppercase;">Total Units</div>
          <div style="font-size: 20px; font-weight: bold; color: #2B050B;">${summary.totalUnits}</div>
        </div>
        <div style="flex: 1; background: #FCFAF8; border: 1px solid #EAE5D9; padding: 12px; border-radius: 6px;">
          <div style="font-size: 11px; color: #666; text-transform: uppercase;">In Stock</div>
          <div style="font-size: 20px; font-weight: bold; color: #16A34A;">${summary.inStockCount}</div>
        </div>
        <div style="flex: 1; background: #FCFAF8; border: 1px solid #EAE5D9; padding: 12px; border-radius: 6px;">
          <div style="font-size: 11px; color: #666; text-transform: uppercase;">Low / Critical</div>
          <div style="font-size: 20px; font-weight: bold; color: #D97706;">${summary.lowStockCount + summary.criticalStockCount}</div>
        </div>
        <div style="flex: 1; background: #FCFAF8; border: 1px solid #EAE5D9; padding: 12px; border-radius: 6px;">
          <div style="font-size: 11px; color: #666; text-transform: uppercase;">Sold Out</div>
          <div style="font-size: 20px; font-weight: bold; color: #DC2626;">${summary.outOfStockCount}</div>
        </div>
      </div>

      <h4 style="margin: 20px 0 6px 0; color: #991B1B; font-size: 12px; text-transform: uppercase;">🚨 Critical Stock (1-2 Units)</h4>
      <table class="info-table">
        <thead><tr><th>Product</th><th>Variant</th><th>SKU</th><th>Stock</th></tr></thead>
        <tbody>${criticalRows}</tbody>
      </table>

      <h4 style="margin: 20px 0 6px 0; color: #D97706; font-size: 12px; text-transform: uppercase;">⚠️ Low Stock (3-5 Units)</h4>
      <table class="info-table">
        <thead><tr><th>Product</th><th>Variant</th><th>SKU</th><th>Stock</th></tr></thead>
        <tbody>${lowStockRows}</tbody>
      </table>

      <h4 style="margin: 20px 0 6px 0; color: #DC2626; font-size: 12px; text-transform: uppercase;">🔴 Out of Stock (0 Units)</h4>
      <table class="info-table">
        <thead><tr><th>Product</th><th>Variant</th><th>SKU</th></tr></thead>
        <tbody>${outOfStockRows}</tbody>
      </table>

      <h4 style="margin: 20px 0 6px 0; color: #16A34A; font-size: 12px; text-transform: uppercase;">🟢 Recently Restocked</h4>
      <table class="info-table">
        <thead><tr><th>Product</th><th>Variant</th><th>New Stock</th></tr></thead>
        <tbody>${restockedRows}</tbody>
      </table>
    `;

    return await EmailService.sendEmail({
      subject: `📊 The Candlorre — Daily Inventory Report (${dateStr})`,
      severity: summary.criticalStockCount > 0 ? 'warning' : 'info',
      badgeText: 'Daily Inventory Report',
      title: 'Daily Inventory Report',
      contentHtml: content,
      alertType: 'DAILY_INVENTORY_REPORT',
      actionButton: { label: 'Open Shopify Inventory', url: `https://${config.shopify.storeDomain || 'admin.shopify.com'}/admin/products/inventory` },
      metadata: summary
    });
  }

  // =========================================================================
  // 6. DAILY SALES REPORT
  // =========================================================================

  static async generateDailySalesReport() {
    const orders = db.orders.find();
    const dateStr = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full' });

    // Aggregate metrics
    let totalGrossSales = 0;
    let totalItemsSold = 0;
    let codOrdersCount = 0;
    let prepaidOrdersCount = 0;
    let cancelledCount = 0;
    let refundedCount = 0;

    const productSalesMap = {};

    orders.forEach(ord => {
      const isCancelled = String(ord.status || '').toLowerCase() === 'cancelled';
      const isRefunded = String(ord.status || '').toLowerCase() === 'refunded';

      if (isCancelled) {
        cancelledCount++;
        return;
      }
      if (isRefunded) {
        refundedCount++;
        return;
      }

      const total = parseFloat(ord.total || ord.total_price || 0);
      totalGrossSales += total;

      const isCod = String(ord.paymentMethod || ord.gateway || '').toLowerCase().includes('cod');
      if (isCod) codOrdersCount++;
      else prepaidOrdersCount++;

      const items = ord.items || ord.line_items || [];
      items.forEach(it => {
        const qty = parseInt(it.quantity || 1, 10);
        totalItemsSold += qty;
        const name = it.title || it.name || 'Candle';
        productSalesMap[name] = (productSalesMap[name] || 0) + qty;
      });
    });

    const activeOrdersCount = orders.length - cancelledCount;
    const aov = activeOrdersCount > 0 ? Math.round(totalGrossSales / activeOrdersCount) : 0;

    const topSelling = Object.entries(productSalesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topSellingHtml = topSelling.map(([name, qty], idx) => `
      <tr>
        <td>#${idx + 1} <strong>${name}</strong></td>
        <td style="text-align: right; font-weight: bold; color: #2B050B;">${qty} units</td>
      </tr>
    `).join('') || '<tr><td colspan="2" style="text-align:center; color:#666;">No item sales registered today.</td></tr>';

    const content = `
      <p>Daily store sales &amp; performance summary for <strong>${dateStr}</strong>.</p>

      <div style="display: flex; gap: 10px; margin: 16px 0; text-align: center;">
        <div style="flex: 1; background: #FCFAF8; border: 1px solid #EAE5D9; padding: 12px; border-radius: 6px;">
          <div style="font-size: 11px; color: #666; text-transform: uppercase;">Gross Sales</div>
          <div style="font-size: 20px; font-weight: bold; color: #166534;">₹${totalGrossSales.toLocaleString('en-IN')}</div>
        </div>
        <div style="flex: 1; background: #FCFAF8; border: 1px solid #EAE5D9; padding: 12px; border-radius: 6px;">
          <div style="font-size: 11px; color: #666; text-transform: uppercase;">Total Orders</div>
          <div style="font-size: 20px; font-weight: bold; color: #2B050B;">${orders.length}</div>
        </div>
        <div style="flex: 1; background: #FCFAF8; border: 1px solid #EAE5D9; padding: 12px; border-radius: 6px;">
          <div style="font-size: 11px; color: #666; text-transform: uppercase;">Units Sold</div>
          <div style="font-size: 20px; font-weight: bold; color: #2B050B;">${totalItemsSold}</div>
        </div>
        <div style="flex: 1; background: #FCFAF8; border: 1px solid #EAE5D9; padding: 12px; border-radius: 6px;">
          <div style="font-size: 11px; color: #666; text-transform: uppercase;">Avg Order (AOV)</div>
          <div style="font-size: 20px; font-weight: bold; color: #2B050B;">₹${aov.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <table class="info-table">
        <tr><th>Sales Metric</th><th>Daily Breakdown</th></tr>
        <tr><td>Total Orders Registered</td><td><strong>${orders.length}</strong> orders</td></tr>
        <tr><td>Prepaid Orders</td><td><strong>${prepaidOrdersCount}</strong> orders</td></tr>
        <tr><td>Cash on Delivery (COD)</td><td><strong>${codOrdersCount}</strong> orders</td></tr>
        <tr><td>Cancelled Orders</td><td>${cancelledCount}</td></tr>
        <tr><td>Refunded Orders</td><td>${refundedCount}</td></tr>
        <tr><td>Total Botanical Candle Units</td><td><strong>${totalItemsSold}</strong> items</td></tr>
      </table>

      <h4 style="margin: 20px 0 6px 0; color: #2B050B; font-size: 12px; text-transform: uppercase;">🏆 Best-Selling Fragrances Today</h4>
      <table class="info-table">
        <thead><tr><th>Candle Fragrance</th><th style="text-align: right;">Quantity Sold</th></tr></thead>
        <tbody>${topSellingHtml}</tbody>
      </table>
    `;

    return await EmailService.sendEmail({
      subject: `📈 The Candlorre — Daily Sales Report (${dateStr})`,
      severity: 'info',
      badgeText: 'Daily Sales Report',
      title: 'Daily Sales Report',
      contentHtml: content,
      alertType: 'DAILY_SALES_REPORT',
      actionButton: { label: 'View Shopify Analytics', url: `https://${config.shopify.storeDomain || 'admin.shopify.com'}/admin/analytics` },
      metadata: { totalGrossSales, totalOrders: orders.length, totalItemsSold, aov }
    });
  }
}

export default AlertService;
