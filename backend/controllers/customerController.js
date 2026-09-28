/**
 * THE Candlorre — CUSTOMER CONTROLLER
 * Handles customer profile updates, saved addresses, and orders.
 */

import { User } from '../models/User.js';
import { Address } from '../models/Address.js';
import { Order } from '../models/Order.js';
import shiprocketService from '../services/shiprocket.service.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/errors.js';

export class CustomerController {
  /**
   * GET /api/customer/profile
   */
  static async getProfile(req, res, next) {
    try {
      const addresses = Address.getByUserId(req.user.id);
      const orders = Order.getByUserId(req.user.id);
      const safeUser = User.toSafeObject(req.user, addresses, orders);
      return sendSuccess(res, safeUser);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/customer/profile
   */
  static async updateProfile(req, res, next) {
    try {
      const { firstName, lastName, phone } = req.body;
      const updatedUser = await User.updateProfile(req.user.id, { firstName, lastName, phone });
      const addresses = Address.getByUserId(req.user.id);
      const orders = Order.getByUserId(req.user.id);
      const safeUser = User.toSafeObject(updatedUser, addresses, orders);

      return sendSuccess(res, safeUser, 'Profile updated successfully.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/customer/addresses
   */
  static async getAddresses(req, res, next) {
    try {
      const addresses = Address.getByUserId(req.user.id);
      return sendSuccess(res, addresses);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/customer/addresses
   */
  static async addAddress(req, res, next) {
    try {
      const newAddress = await Address.create(req.user.id, req.body);
      const allAddresses = Address.getByUserId(req.user.id);
      return sendSuccess(res, { address: newAddress, addresses: allAddresses }, 'Address added successfully.', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/customer/addresses/:id
   */
  static async updateAddress(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await Address.update(id, req.user.id, req.body);
      if (!updated) {
        throw new AppError('Address not found or unauthorized.', 404);
      }
      const allAddresses = Address.getByUserId(req.user.id);
      return sendSuccess(res, { address: updated, addresses: allAddresses }, 'Address updated successfully.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/customer/addresses/:id
   */
  static async deleteAddress(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = await Address.delete(id, req.user.id);
      if (!deleted) {
        throw new AppError('Address not found or unauthorized.', 404);
      }
      const allAddresses = Address.getByUserId(req.user.id);
      return sendSuccess(res, { addresses: allAddresses }, 'Address deleted successfully.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/customer/addresses/:id/default
   */
  static async setDefaultAddress(req, res, next) {
    try {
      const { id } = req.params;
      const success = await Address.setDefault(id, req.user.id);
      if (!success) {
        throw new AppError('Address not found or unauthorized.', 404);
      }
      const allAddresses = Address.getByUserId(req.user.id);
      return sendSuccess(res, { addresses: allAddresses }, 'Default address updated successfully.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/customer/orders
   */
  static async getOrders(req, res, next) {
    try {
      const orders = Order.getByUserId(req.user.id);
      return sendSuccess(res, orders);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/customer/orders/track
   * Allows public or authenticated tracking lookup by Order ID, Order Number, or Courier AWB.
   * Real data only from database or Shiprocket.
   */
  static async trackOrder(req, res, next) {
    try {
      const identifier = req.params.identifier || req.query.identifier || req.query.query || req.query.id;
      if (!identifier || !String(identifier).trim()) {
        return sendSuccess(res, {
          found: false,
          message: 'Please enter a valid Order ID or Courier Tracking Number.'
        });
      }

      const clean = String(identifier).trim().replace(/^#/, '');
      const order = Order.findByOrderNumber(clean) || Order.findById(clean);

      if (order) {
        let liveTracking = null;
        if (order.shiprocket?.awbCode && shiprocketService.isConfigured()) {
          try {
            const sr = await shiprocketService.getTrackingByAwb(order.shiprocket.awbCode);
            if (sr.found) liveTracking = sr;
          } catch (e) {
            console.warn('[Customer Tracking Notice] Live Shiprocket lookup error:', e.message);
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
          statusCode: order.status,
          hasAwbAssigned: Boolean(trackingNumber),
          estimatedDelivery: liveTracking?.estimatedDelivery || 'Calculated upon courier pickup',
          destination: order.shippingAddress?.city ? `${order.shippingAddress.city}, ${order.shippingAddress.province || order.shippingAddress.state || 'India'}` : 'India',
          timeline: liveTracking?.scans?.length > 0 ? liveTracking.scans : (order.timeline || []),
          items: (order.lineItems || []).map(i => ({
            title: i.title,
            quantity: i.quantity,
            variant: i.selectedVariant,
            image: i.image
          }))
        });
      }

      // Check direct Shiprocket AWB if configured
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
        } catch (e) {}
      }

      // Real data only: if not found, return honest not found
      return sendSuccess(res, {
        found: false,
        query: clean,
        message: `No active order or parcel was found matching "${clean}". Please verify your Order Number or Waybill and try again.`
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/customer/orders/:id
   */
  static async getOrderById(req, res, next) {
    try {
      const { id } = req.params;
      const order = Order.findById(id) || Order.findByOrderNumber(id);
      if (!order || order.userId !== req.user.id) {
        throw new AppError('Order not found.', 404);
      }
      return sendSuccess(res, order);
    } catch (err) {
      next(err);
    }
  }
}

export default CustomerController;
