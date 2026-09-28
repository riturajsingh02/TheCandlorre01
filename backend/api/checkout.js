/**
 * THE Candlorre — PRODUCTION CHECKOUT API ROUTE
 * Real payment processing, cryptographic signature verification,
 * mandatory COD OTP confirmation, and formal Order entity persistence.
 * Real data only — no fake order IDs, no simulated payments, no mock tracking.
 */

import { Router } from 'express';
import PaymentService from '../services/payment.js';
import CodService from '../services/cod.service.js';
import Order, { ORDER_STATES } from '../models/Order.js';
import Address from '../models/Address.js';
import { extractToken } from '../middleware/authMiddleware.js';
import { Session } from '../models/Session.js';
import { sendSuccess, sendError } from '../utils/response.js';
import config from '../config/env.js';

const router = Router();

/**
 * POST /api/checkout
 * Calculates order totals and prepares checkout configuration
 */
router.post('/', async (req, res) => {
  try {
    const { items = [], couponCode = null, paymentMethod = 'prepaid' } = req.body;

    if (!items || items.length === 0) {
      return sendError(res, 'Cannot initiate checkout with an empty shopping bag.', 400);
    }

    const totals = PaymentService.calculateTotals(items, couponCode, paymentMethod);

    return sendSuccess(res, {
      totals,
      paymentMethod,
      razorpayKeyId: config.payments.razorpay.keyId || null,
      isRazorpayConfigured: PaymentService.isRazorpayConfigured()
    }, 'Checkout session initialized.');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
});

/**
 * POST /api/checkout/razorpay-order
 * Creates a verified Razorpay order with the gateway
 * REAL GATEWAY ONLY: Never returns a fake order ID.
 */
router.post('/razorpay-order', async (req, res) => {
  try {
    const { items = [], couponCode = null } = req.body;
    if (!items || items.length === 0) {
      return sendError(res, 'Shopping bag is empty.', 400);
    }

    if (!PaymentService.isRazorpayConfigured()) {
      return sendError(
        res,
        'Online payments are temporarily unavailable: Payment gateway credentials are not configured on this server. Please contact support or choose Cash on Delivery.',
        503
      );
    }

    const totals = PaymentService.calculateTotals(items, couponCode, 'prepaid');
    const amountInPaise = Math.round(totals.finalTotal * 100);

    const rpOrder = await PaymentService.createRazorpayOrder({
      amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${Date.now().toString(36)}`,
      notes: { store: 'The Candlorre' }
    });

    return sendSuccess(res, {
      orderId: rpOrder.id,
      amount: rpOrder.amount,
      currency: rpOrder.currency,
      keyId: config.payments.razorpay.keyId,
      totals
    }, 'Official Razorpay order initialized.');
  } catch (err) {
    console.error('[Razorpay Order Creation Error]:', err.message);
    return sendError(res, err.message, 500);
  }
});

/**
 * POST /api/checkout/process
 * Confirms order:
 * - For Prepaid: strictly verifies Razorpay signature & gateway status before creating paid order
 * - For COD: creates pending order and initiates OTP confirmation flow
 */
router.post('/process', async (req, res) => {
  try {
    const {
      items = [],
      shippingAddress = {},
      paymentMethod = 'prepaid',
      couponCode = null,
      paymentDetails = null
    } = req.body;

    if (!items || items.length === 0) {
      return sendError(res, 'Cannot place order with an empty shopping bag.', 400);
    }

    // Required address validation
    const { name, phone, address, city, pincode } = shippingAddress;
    if (!name || !phone || !address || !city || !pincode) {
      return sendError(res, 'Please provide complete delivery details (Name, Mobile Number, Street Address, City, and PIN Code).', 400);
    }

    // Identify user if logged in
    let userId = null;
    const token = extractToken(req);
    if (token) {
      try {
        const session = await Session.verify(token);
        if (session && session.userId) userId = session.userId;
      } catch (e) {
        // Continue as guest if token invalid
      }
    }

    const totals = PaymentService.calculateTotals(items, couponCode, paymentMethod);
    const isPrepaid = (paymentMethod === 'prepaid');

    // 1. PREPAID VERIFICATION
    if (isPrepaid) {
      if (!paymentDetails || !paymentDetails.razorpay_payment_id || !paymentDetails.razorpay_order_id || !paymentDetails.razorpay_signature) {
        return sendError(res, 'Payment verification details missing. Online orders require verified gateway confirmation.', 400);
      }

      const expectedAmountPaise = Math.round(totals.finalTotal * 100);

      // Cryptographically verify signature and fetch real transaction from gateway
      await PaymentService.verifyRazorpayPayment({
        razorpay_order_id: paymentDetails.razorpay_order_id,
        razorpay_payment_id: paymentDetails.razorpay_payment_id,
        razorpay_signature: paymentDetails.razorpay_signature,
        expectedAmountPaise
      });
    }

    // Format line items
    const lineItems = items.map(item => ({
      title: item.title || 'Botanical Candle',
      quantity: Number(item.qty || item.quantity || 1),
      price: Number(item.price || 0),
      selectedVariant: item.selectedVariant || 'Standard',
      image: item.image || 'asset/one.jpg',
      sku: item.sku || '',
      productId: item.productId || item.id || null,
      variantId: item.variantId || item.shopifyVariantId || null
    }));

    // Create formal order in database
    const initialStatus = isPrepaid ? ORDER_STATES.PAID : ORDER_STATES.COD_OTP_PENDING;
    const financialStatus = isPrepaid ? 'PAID' : 'PENDING_COD';

    const newOrder = await Order.create(userId, {
      status: initialStatus,
      financialStatus,
      currencyCode: 'INR',
      totalPrice: totals.finalTotal,
      subtotalPrice: totals.subtotal,
      discountAmount: totals.discountAmount,
      discountLabel: totals.discountLabel,
      shippingPrice: 0,
      paymentMethod: isPrepaid ? 'Prepaid (Razorpay)' : 'Cash on Delivery (COD)',
      paymentDetails: isPrepaid ? {
        gateway: 'Razorpay',
        paymentId: paymentDetails.razorpay_payment_id,
        gatewayOrderId: paymentDetails.razorpay_order_id
      } : { method: 'COD' },
      shippingAddress: {
        name,
        phone,
        address1: address,
        city,
        zip: pincode,
        state: shippingAddress.state || 'India',
        country: 'India'
      },
      lineItems
    });

    // Auto-save address if user logged in and has no addresses
    if (userId) {
      try {
        const existingAddresses = Address.getByUserId(userId);
        if (existingAddresses.length === 0) {
          const parts = String(name).trim().split(' ');
          await Address.create(userId, {
            firstName: parts[0] || 'Client',
            lastName: parts.slice(1).join(' ') || '',
            phone,
            address1: address,
            city,
            zip: pincode,
            province: shippingAddress.state || 'Maharashtra',
            country: 'India',
            isDefault: true,
            tag: 'home'
          });
        }
      } catch (addrErr) {
        console.warn('Auto-save checkout address notice:', addrErr.message);
      }
    }

    // 2. COD FLOW: Trigger OTP dispatch
    if (!isPrepaid) {
      try {
        const otpResult = await CodService.initiateVerification(newOrder.id, phone);
        return sendSuccess(res, {
          order: newOrder,
          orderNumber: newOrder.orderNumber,
          orderId: newOrder.id,
          requiresOtp: true,
          phone: otpResult.maskedPhone,
          expiresInMinutes: otpResult.expiresInMinutes,
          message: otpResult.message
        }, 'Order created! Please enter the 6-digit verification code sent to your mobile.');
      } catch (otpErr) {
        console.error('[COD OTP Error]:', otpErr.message);
        return sendError(res, `Order created (${newOrder.orderNumber}), but SMS verification failed: ${otpErr.message}. Please contact support to verify your order.`, 400);
      }
    }

    // Prepaid success
    return sendSuccess(res, {
      order: newOrder,
      orderNumber: newOrder.orderNumber,
      orderId: newOrder.id,
      financialStatus: newOrder.financialStatus,
      totalPrice: newOrder.totalPrice
    }, 'Payment verified! Your order has been placed successfully.');
  } catch (err) {
    console.error('[Checkout Process Error]:', err);
    return sendError(res, err.message || 'Failed to process checkout.', 500);
  }
});

/**
 * POST /api/checkout/cod/verify-otp
 * Verifies entered OTP for a COD order
 */
router.post('/cod/verify-otp', async (req, res) => {
  try {
    const { orderId, otp } = req.body;
    if (!orderId || !otp) {
      return sendError(res, 'Order ID and verification code are required.', 400);
    }

    const result = await CodService.verifyOtp(orderId, otp);
    return sendSuccess(res, result, result.message);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
});

/**
 * POST /api/checkout/cod/resend-otp
 * Resends OTP for a COD order if cooldown expired
 */
router.post('/cod/resend-otp', async (req, res) => {
  try {
    const { orderId, phone } = req.body;
    if (!orderId) {
      return sendError(res, 'Order ID is required to resend verification code.', 400);
    }

    const order = Order.findById(orderId);
    if (!order) return sendError(res, 'Order not found.', 404);

    const targetPhone = phone || order.shippingAddress?.phone;
    const result = await CodService.initiateVerification(order.id, targetPhone);
    return sendSuccess(res, result, result.message);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
});

export default router;
