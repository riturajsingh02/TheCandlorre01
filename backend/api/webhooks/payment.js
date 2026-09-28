/**
 * THE Candlorre — PAYMENT GATEWAY WEBHOOK HANDLER
 * Handles verified server-to-server notifications from Razorpay.
 * Idempotent, cryptographically validated signature check.
 */

import { Router } from 'express';
import PaymentService from '../../services/payment.js';
import db from '../../db/index.js';
import Order, { ORDER_STATES } from '../../models/Order.js';

const router = Router();

router.post('/', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);

  // 1. Authenticate signature
  if (!PaymentService.verifyRazorpayWebhook(rawBody, signature)) {
    console.warn('[Payment Webhook] Rejected: Invalid Razorpay webhook signature.');
    return res.status(401).json({ error: 'Unauthorized webhook signature.' });
  }

  const event = req.body?.event;
  const payload = req.body?.payload;
  const webhookId = req.headers['x-razorpay-event-id'] || `rp_evt_${req.body?.created_at}_${event}`;

  // 2. Idempotency Check
  const existing = db.webhookEvents.findById(webhookId);
  if (existing) {
    console.log(`[Payment Webhook] Duplicate event ignored: ${webhookId}`);
    return res.status(200).json({ received: true, duplicate: true });
  }

  await db.webhookEvents.create({
    id: webhookId,
    topic: event,
    processedAt: new Date().toISOString()
  });

  try {
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload?.payment?.entity;
      const orderEntity = payload?.order?.entity;

      const rpOrderId = paymentEntity?.order_id || orderEntity?.id;
      const rpPaymentId = paymentEntity?.id;
      const amountPaise = paymentEntity?.amount || orderEntity?.amount_paid || 0;

      if (rpOrderId) {
        // Find matching local order
        const localOrder = db.orders.findOne(o =>
          o.paymentDetails?.gatewayOrderId === rpOrderId ||
          o.paymentDetails?.orderId === rpOrderId
        );

        if (localOrder) {
          await PaymentService.verifyRazorpayPayment({
            razorpay_order_id: rpOrderId,
            razorpay_payment_id: rpPaymentId,
            razorpay_signature: signature,
            orderId: localOrder.id,
            expectedAmountPaise: amountPaise
          });
          console.log(`[Payment Webhook] Order ${localOrder.orderNumber} successfully marked PAID via webhook.`);
        }
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = payload?.payment?.entity;
      const rpOrderId = paymentEntity?.order_id;
      if (rpOrderId) {
        const localOrder = db.orders.findOne(o => o.paymentDetails?.gatewayOrderId === rpOrderId);
        if (localOrder && localOrder.status !== ORDER_STATES.PAID) {
          await Order.updateStatus(localOrder.id, ORDER_STATES.FAILED, `Payment failed: ${paymentEntity.error_description || 'Declined'}`, 'gateway_webhook');
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[Payment Webhook Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
