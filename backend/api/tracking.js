/**
 * THE Candlorre — ORDER TRACKING API ROUTE
 * Real shipment tracking lookup against database records and live Shiprocket status.
 * Never generates fake tracking waybills, fake couriers, or simulated milestones.
 */

import { Router } from 'express';
import Order from '../models/Order.js';
import shiprocketService from '../services/shiprocket.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

/**
 * GET or POST /api/tracking/:identifier
 * Queries real shipment tracking status by Order ID, Order Number, or AWB
 */
router.all(['/', '/:identifier'], async (req, res) => {
  try {
    const rawIdentifier = req.params.identifier || req.query.identifier || req.body?.identifier;
    if (!rawIdentifier || !String(rawIdentifier).trim()) {
      return sendError(res, 'Please enter a valid Order ID (e.g. TC10001) or Waybill Number.', 400);
    }

    const clean = String(rawIdentifier).trim().replace(/^#/, '');

    // 1. Look up in local database
    const order = Order.findByOrderNumber(clean) || Order.findById(clean);

    if (order) {
      let liveTracking = null;

      // If order has a real Shiprocket AWB, attempt to fetch live scan updates
      if (order.shiprocket?.awbCode && shiprocketService.isConfigured()) {
        try {
          const srTracking = await shiprocketService.getTrackingByAwb(order.shiprocket.awbCode);
          if (srTracking.found) {
            liveTracking = srTracking;
          }
        } catch (srErr) {
          console.warn('[Tracking Service Notice] Shiprocket live tracking lookup:', srErr.message);
        }
      }

      const courier = liveTracking?.courier || order.tracking?.courier || null;
      const trackingNumber = liveTracking?.awbCode || order.tracking?.trackingNumber || null;
      const trackingUrl = order.tracking?.trackingUrl || (trackingNumber ? `https://shiprocket.co/tracking/${trackingNumber}` : null);
      const status = liveTracking?.status || order.tracking?.status || order.status || 'Order Placed';

      return sendSuccess(res, {
        found: true,
        orderNumber: order.orderNumber,
        orderId: order.id,
        date: order.createdAt,
        orderStatus: order.status,
        financialStatus: order.financialStatus,
        courier,
        trackingNumber,
        trackingUrl,
        status,
        hasAwbAssigned: Boolean(trackingNumber),
        estimatedDelivery: liveTracking?.estimatedDelivery || 'Calculated upon courier pickup',
        timeline: liveTracking?.scans?.length > 0 ? liveTracking.scans : (order.timeline || []),
        items: (order.lineItems || []).map(i => ({
          title: i.title,
          quantity: i.quantity,
          variant: i.selectedVariant,
          image: i.image
        }))
      });
    }

    // 2. If not found by local order, check if clean identifier is a direct Shiprocket AWB
    if (clean.length >= 8 && shiprocketService.isConfigured()) {
      try {
        const directAwb = await shiprocketService.getTrackingByAwb(clean);
        if (directAwb.found) {
          return sendSuccess(res, {
            found: true,
            orderNumber: `AWB-${clean}`,
            courier: directAwb.courier,
            trackingNumber: clean,
            status: directAwb.status,
            estimatedDelivery: directAwb.estimatedDelivery,
            timeline: directAwb.scans
          });
        }
      } catch (e) {
        // Fall through to not found
      }
    }

    // 3. REAL DATA ONLY: If no record exists, return honest not found response
    return sendSuccess(res, {
      found: false,
      query: clean,
      message: `No active order or parcel was found matching "${clean}". Please verify your Order Number or Waybill and try again.`
    });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

export default router;
