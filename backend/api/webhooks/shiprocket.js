/**
 * THE Candlorre — SHIPROCKET WEBHOOK HANDLER
 * Receives real-time shipment milestone and tracking updates directly from Shiprocket.
 * Automatically synchronizes order tracking and Shopify fulfillment status.
 */

import { Router } from 'express';
import config from '../../config/env.js';
import db from '../../db/index.js';
import Order, { ORDER_STATES } from '../../models/Order.js';
import ShopifyService from '../../services/shopify.js';

const router = Router();

router.post('/', async (req, res) => {
  // Optional security token check if configured in Render
  if (config.shiprocket.webhookToken) {
    const headerToken = req.headers['x-api-key'] || req.headers['authorization'];
    if (headerToken !== config.shiprocket.webhookToken && headerToken !== `Bearer ${config.shiprocket.webhookToken}`) {
      console.warn('[Shiprocket Webhook] Rejected: Invalid webhook token.');
      return res.status(401).json({ error: 'Unauthorized webhook' });
    }
  }

  const payload = req.body;
  const awb = payload?.awb || payload?.awb_code;
  const currentStatus = (payload?.current_status || payload?.status || '').toUpperCase();
  const orderId = payload?.order_id;
  const courier = payload?.courier_name || 'Express Courier';

  if (!awb && !orderId) {
    return res.status(400).json({ error: 'Missing AWB or Order reference in webhook payload.' });
  }

  const webhookId = `sr_evt_${awb || orderId}_${currentStatus}_${Date.now()}`;

  // Idempotent event recording
  await db.shipmentEvents.create({
    id: webhookId,
    awb,
    orderId,
    status: currentStatus,
    courier,
    rawPayload: payload,
    receivedAt: new Date().toISOString()
  });

  // Find local order
  let order = null;
  if (orderId) {
    order = Order.findByOrderNumber(orderId) || Order.findById(orderId);
  }
  if (!order && awb) {
    order = db.orders.findOne(o => o.shiprocket?.awbCode === awb || o.tracking?.trackingNumber === awb);
  }

  if (order) {
    const trackingUrl = `https://shiprocket.co/tracking/${awb || order.tracking?.trackingNumber}`;

    // Map Shiprocket courier status to Candlorre Order State Machine
    let targetState = null;
    if (currentStatus.includes('IN TRANSIT') || currentStatus.includes('REACHED')) {
      targetState = ORDER_STATES.IN_TRANSIT;
    } else if (currentStatus.includes('OUT FOR DELIVERY')) {
      targetState = ORDER_STATES.OUT_FOR_DELIVERY;
    } else if (currentStatus.includes('DELIVERED')) {
      targetState = ORDER_STATES.DELIVERED;
    } else if (currentStatus.includes('PICKED UP') || currentStatus.includes('SHIPPED')) {
      targetState = ORDER_STATES.SHIPPED;
    } else if (currentStatus.includes('CANCELED') || currentStatus.includes('CANCELLED')) {
      targetState = ORDER_STATES.CANCELLED;
    }

    // Update tracking
    await Order.updateTracking(order.id, {
      courier,
      trackingNumber: awb || order.tracking?.trackingNumber,
      trackingUrl,
      status: payload?.current_status || currentStatus
    });

    if (targetState && Order.canTransition(order.status, targetState)) {
      await Order.updateStatus(order.id, targetState, `Shiprocket status updated: ${currentStatus}`, 'shiprocket_webhook');
    }

    // If order has Shopify link, sync fulfillment
    if (order.shopify?.orderId && awb) {
      try {
        await ShopifyService.createFulfillment({
          shopifyOrderId: order.shopify.orderId,
          trackingNumber: awb,
          trackingCompany: courier,
          trackingUrl
        });
      } catch (e) {
        console.warn('[Shiprocket -> Shopify Auto-sync Notice]:', e.message);
      }
    }
  }

  return res.status(200).json({ received: true });
});

export default router;
