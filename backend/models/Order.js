/**
 * THE Candlorre — PRODUCTION ORDER MODEL & STATE MACHINE
 * Manages customer and admin order lifecycle with strict state transition validation.
 * No fake tracking numbers, no random mock statuses.
 */

import crypto from 'crypto';
import db from '../db/index.js';

export const ORDER_STATES = {
  PENDING: 'PENDING',
  COD_OTP_PENDING: 'COD_OTP_PENDING',
  CONFIRMED: 'CONFIRMED',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  PAID: 'PAID',
  PROCESSING: 'PROCESSING',
  PACKED: 'PACKED',
  SHIPPED: 'SHIPPED',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  RETURN_REQUESTED: 'RETURNED_REQUESTED',
  RETURNED: 'RETURNED',
  FAILED: 'FAILED'
};

const ALLOWED_TRANSITIONS = {
  PENDING: ['COD_OTP_PENDING', 'PAYMENT_PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED'],
  COD_OTP_PENDING: ['CONFIRMED', 'CANCELLED', 'FAILED'],
  PAYMENT_PENDING: ['PAID', 'CANCELLED', 'FAILED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'IN_TRANSIT', 'FAILED'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED', 'DELIVERED'],
  RETURNED: [],
  CANCELLED: [],
  FAILED: []
};

export class Order {
  static getAll(filter = {}) {
    let orders = db.orders.find();
    if (filter.financialStatus) {
      orders = orders.filter(o => o.financialStatus === filter.financialStatus);
    }
    if (filter.orderStatus) {
      orders = orders.filter(o => o.status === filter.orderStatus);
    }
    if (filter.search) {
      const q = String(filter.search).toLowerCase().trim();
      orders = orders.filter(o =>
        (o.orderNumber || '').toLowerCase().includes(q) ||
        (o.shippingAddress?.name || '').toLowerCase().includes(q) ||
        (o.shippingAddress?.phone || '').includes(q) ||
        (o.tracking?.trackingNumber || '').toLowerCase().includes(q)
      );
    }
    return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static getByUserId(userId) {
    if (!userId) return [];
    return db.orders.find({ userId }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static findById(id) {
    if (!id) return null;
    return db.orders.findById(id);
  }

  static findByOrderNumber(orderNumber) {
    if (!orderNumber) return null;
    const clean = String(orderNumber).replace(/^#/, '').toLowerCase().trim();
    const cleanAlpha = clean.replace(/[^a-z0-9]/g, '');
    return db.orders.findOne(o => {
      const num = String(o.orderNumber || '').replace(/^#/, '').toLowerCase().trim();
      const numAlpha = num.replace(/[^a-z0-9]/g, '');
      const name = String(o.name || '').replace(/^#/, '').toLowerCase().trim();
      const nameAlpha = name.replace(/[^a-z0-9]/g, '');
      const track = String(o.tracking?.trackingNumber || '').toLowerCase().trim();
      const trackAlpha = track.replace(/[^a-z0-9]/g, '');
      const oId = String(o.id || '').toLowerCase().trim();
      const oIdAlpha = oId.replace(/[^a-z0-9]/g, '');

      return num === clean ||
        (cleanAlpha && numAlpha === cleanAlpha) ||
        name === clean ||
        (cleanAlpha && nameAlpha === cleanAlpha) ||
        oId === clean ||
        (cleanAlpha && oIdAlpha === cleanAlpha) ||
        (track && (track === clean || (cleanAlpha && trackAlpha === cleanAlpha)));
    });
  }

  /**
   * Generates next formal sequential business order number
   */
  static generateOrderNumber() {
    const totalOrders = db.orders.count();
    const seq = 10001 + totalOrders;
    return `TC${seq}`;
  }

  /**
   * Validate state transition
   */
  static canTransition(currentStatus, nextStatus) {
    if (!currentStatus) return true;
    if (currentStatus === nextStatus) return true;
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    return allowed.includes(nextStatus);
  }

  /**
   * Create a new formal order
   */
  static async create(userId, orderData) {
    const orderNumber = orderData.orderNumber || this.generateOrderNumber();
    const orderId = orderData.id || `ord_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const initialStatus = orderData.status || (orderData.paymentMethod === 'cod' ? ORDER_STATES.COD_OTP_PENDING : ORDER_STATES.PENDING);

    const newOrder = await db.orders.create({
      id: orderId,
      userId: userId || null,
      orderNumber,
      name: `#${orderNumber}`,
      status: initialStatus,
      financialStatus: orderData.financialStatus || (orderData.paymentMethod === 'cod' ? 'PENDING_COD' : 'PENDING_PAYMENT'),
      fulfillmentStatus: 'UNFULFILLED',
      currencyCode: orderData.currencyCode || 'INR',
      totalPrice: Number(orderData.totalPrice || 0),
      subtotalPrice: Number(orderData.subtotalPrice || 0),
      discountAmount: Number(orderData.discountAmount || 0),
      discountLabel: orderData.discountLabel || '',
      shippingPrice: Number(orderData.shippingPrice || 0),
      paymentMethod: orderData.paymentMethod || 'prepaid',
      paymentDetails: orderData.paymentDetails || null,
      shippingAddress: orderData.shippingAddress || null,
      // REAL DATA ONLY: Tracking starts empty until Shiprocket or Courier assigns AWB
      tracking: orderData.tracking || {
        courier: null,
        trackingNumber: null,
        trackingUrl: null,
        status: 'Order Placed — Awaiting Fulfillment',
        assignedAt: null
      },
      shiprocket: {
        orderId: null,
        shipmentId: null,
        awbCode: null,
        courierName: null,
        status: null,
        syncedAt: null
      },
      shopify: {
        orderId: orderData.shopifyOrderId || null,
        fulfillmentId: null,
        syncedAt: null
      },
      lineItems: (orderData.lineItems || []).map((item, idx) => ({
        id: item.id || `item_${idx}_${crypto.randomBytes(4).toString('hex')}`,
        title: item.title,
        quantity: Number(item.quantity || item.qty || 1),
        price: Number(item.price || 0),
        selectedVariant: item.selectedVariant || 'Standard',
        image: item.image || 'asset/one.jpg',
        sku: item.sku || '',
        productId: item.productId || null,
        variantId: item.variantId || null
      })),
      timeline: [
        {
          status: initialStatus,
          message: 'Order placed by client.',
          timestamp: new Date().toISOString()
        }
      ],
      processedAt: orderData.processedAt || new Date().toISOString()
    });

    // Record line items in orderItems table
    for (const item of newOrder.lineItems) {
      await db.orderItems.create({
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        ...item
      });
    }

    return newOrder;
  }

  /**
   * Transition order to a new state with validation and audit trail
   */
  static async updateStatus(orderId, newStatus, reason = '', actor = 'system') {
    const order = this.findById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);

    if (!this.canTransition(order.status, newStatus)) {
      throw new Error(`Invalid order state transition from ${order.status} to ${newStatus}.`);
    }

    const previousStatus = order.status;
    const timelineEntry = {
      status: newStatus,
      previousStatus,
      reason,
      actor,
      timestamp: new Date().toISOString()
    };

    const updated = await db.orders.updateById(orderId, {
      status: newStatus,
      timeline: [...(order.timeline || []), timelineEntry]
    });

    // Log to audit logs
    await db.auditLogs.create({
      action: 'ORDER_STATUS_CHANGED',
      orderId,
      orderNumber: order.orderNumber,
      actor,
      metadata: { previousStatus, newStatus, reason }
    });

    return updated;
  }

  /**
   * Update tracking with verified carrier information
   */
  static async updateTracking(orderId, trackingInfo) {
    const order = this.findById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);

    const currentTracking = order.tracking || {};
    const updatedTracking = {
      ...currentTracking,
      ...trackingInfo,
      assignedAt: trackingInfo.assignedAt || currentTracking.assignedAt || new Date().toISOString()
    };

    const updated = await db.orders.updateById(orderId, {
      tracking: updatedTracking
    });

    return updated;
  }
}

export default Order;
