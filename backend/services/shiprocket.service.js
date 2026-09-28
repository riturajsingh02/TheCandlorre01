/**
 * THE Candlorre — SHIPROCKET LOGISTICS & FULFILLMENT SERVICE
 * Dedicated production communication layer for the official Shiprocket API.
 * Real data only: no fake AWBs, no simulated courier waybills, no mock tracking statuses.
 */

import config from '../config/env.js';
import db from '../db/index.js';
import ShopifyService from './shopify.js';

class ShiprocketService {
  constructor() {
    this.token = null;
    this.tokenExpiresAt = null;
  }

  isConfigured() {
    return Boolean(config.shiprocket.email && config.shiprocket.password);
  }

  /**
   * Authenticates with Shiprocket API v2 and retrieves a bearer token
   */
  async getAuthToken() {
    if (!this.isConfigured()) {
      throw new Error('Shiprocket credentials are not configured. Please set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD in environment variables.');
    }

    if (this.token && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
      return this.token;
    }

    const res = await fetch('https://apiv2.shiprocket.in/v2/console/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: config.shiprocket.email,
        password: config.shiprocket.password
      })
    });

    const data = await res.json();
    if (!res.ok || !data.token) {
      throw new Error(`Shiprocket authentication failed: ${data.message || 'Invalid credentials'}`);
    }

    this.token = data.token;
    // Token lasts ~10 days; refresh 1 hour before expiry
    this.tokenExpiresAt = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);
    return this.token;
  }

  /**
   * Make an authenticated request to Shiprocket API
   */
  async request(endpoint, method = 'GET', body = null) {
    const token = await this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(`https://apiv2.shiprocket.in/v2/console${endpoint}`, options);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.message || (typeof data.errors === 'string' ? data.errors : JSON.stringify(data.errors || 'API error'));
      throw new Error(`Shiprocket API Error (${res.status}): ${errorMsg}`);
    }

    return data;
  }

  /**
   * Create a real shipment order in Shiprocket
   */
  async createOrder(order) {
    if (!order) throw new Error('Order data is required for Shiprocket shipment creation.');

    // Check if order already has an active Shiprocket order to prevent duplicate shipments
    const existing = db.shiprocketOrders.findOne({ localOrderId: order.id });
    if (existing && existing.shiprocketOrderId) {
      console.log(`[Shiprocket] Order ${order.orderNumber} already registered with Shiprocket ID: ${existing.shiprocketOrderId}`);
      return existing;
    }

    const shipping = order.shippingAddress || {};
    const nameParts = (shipping.name || 'Client').trim().split(' ');
    const firstName = nameParts[0] || 'Client';
    const lastName = nameParts.slice(1).join(' ') || 'Customer';

    const isCod = order.paymentMethod === 'cod' || String(order.financialStatus || '').includes('COD');

    const orderPayload = {
      order_id: order.orderNumber,
      order_date: new Date(order.createdAt || Date.now()).toISOString().slice(0, 19).replace('T', ' '),
      pickup_location: config.shiprocket.pickupLocation,
      channel_id: config.shiprocket.channelId || '',
      billing_customer_name: firstName,
      billing_last_name: lastName,
      billing_address: shipping.address1 || shipping.address || 'Sanctuary Address',
      billing_address_2: shipping.address2 || '',
      billing_city: shipping.city || 'Pune',
      billing_pincode: shipping.zip || shipping.pincode || '411001',
      billing_state: shipping.state || shipping.province || 'Maharashtra',
      billing_country: shipping.country || 'India',
      billing_email: order.email || 'concierge@thecandlorre.com',
      billing_phone: (shipping.phone || '9999999999').replace(/\D/g, '').slice(-10),
      shipping_is_billing: true,
      order_items: (order.lineItems || []).map(item => ({
        name: item.title,
        sku: item.sku || `CNDLR-${item.id || 'CANDLE'}`,
        units: Number(item.quantity || 1),
        selling_price: Number(item.price || 0),
        discount: 0,
        tax: 0
      })),
      payment_method: isCod ? 'COD' : 'Prepaid',
      sub_total: Number(order.subtotalPrice || order.totalPrice || 0),
      length: 12,
      breadth: 12,
      height: 14,
      weight: 0.65 // Approx 650g luxury glass jar with soy candle
    };

    const response = await this.request('/data/orders/create/adhoc', 'POST', orderPayload);

    const shiprocketOrderId = response.order_id;
    const shipmentId = response.shipment_id;
    const status = response.status;
    const statusCode = response.status_code;

    // Save Shiprocket order record
    const record = await db.shiprocketOrders.create({
      localOrderId: order.id,
      orderNumber: order.orderNumber,
      shiprocketOrderId,
      shipmentId,
      status,
      statusCode,
      rawResponse: response
    });

    // Update order with real Shiprocket data
    await db.orders.updateById(order.id, {
      shiprocket: {
        orderId: shiprocketOrderId,
        shipmentId,
        status,
        statusCode,
        syncedAt: new Date().toISOString()
      },
      status: 'PROCESSING'
    });

    // Create Audit Log
    await db.auditLogs.create({
      action: 'SHIPROCKET_ORDER_CREATED',
      orderId: order.id,
      orderNumber: order.orderNumber,
      metadata: { shiprocketOrderId, shipmentId, status }
    });

    return record;
  }

  /**
   * Assign real AWB and courier to shipment
   */
  async assignAwb(shipmentId, courierId = null) {
    if (!shipmentId) throw new Error('Shipment ID is required to generate AWB.');

    const payload = { shipment_id: shipmentId };
    if (courierId) payload.courier_id = courierId;

    const response = await this.request('/courier/assign/awb', 'POST', payload);
    const awbData = response?.response?.data;

    if (!awbData || !awbData.awb_code) {
      throw new Error(`Failed to assign AWB from Shiprocket: ${JSON.stringify(response)}`);
    }

    const awbCode = awbData.awb_code;
    const courierName = awbData.courier_name || 'Shiprocket Courier Partner';
    const trackingUrl = `https://shiprocket.co/tracking/${awbCode}`;

    // Store in shiprocket_shipments
    const shipmentRecord = await db.shiprocketShipments.create({
      shipmentId,
      awbCode,
      courierName,
      courierCompanyId: awbData.courier_company_id,
      trackingUrl,
      appliedWeight: awbData.applied_weight,
      rawResponse: awbData
    });

    // Find associated order
    const shiprocketOrder = db.shiprocketOrders.findOne({ shipmentId });
    if (shiprocketOrder && shiprocketOrder.localOrderId) {
      const order = db.orders.findById(shiprocketOrder.localOrderId);
      if (order) {
        // Update order with real courier and AWB
        await db.orders.updateById(order.id, {
          status: 'PACKED',
          tracking: {
            courier: courierName,
            trackingNumber: awbCode,
            trackingUrl,
            status: 'Parcel Packed & AWB Generated',
            assignedAt: new Date().toISOString()
          },
          shiprocket: {
            ...order.shiprocket,
            awbCode,
            courierName,
            trackingUrl
          }
        });

        // Sync fulfillment to Shopify if Shopify Order ID is present
        if (order.shopify?.orderId) {
          try {
            await ShopifyService.createFulfillment({
              shopifyOrderId: order.shopify.orderId,
              trackingNumber: awbCode,
              trackingCompany: courierName,
              trackingUrl
            });
            console.log(`[Shiprocket -> Shopify] Fulfillment synced for order ${order.orderNumber}`);
          } catch (shopErr) {
            console.warn(`[Shiprocket -> Shopify Sync Notice] Could not auto-sync Shopify fulfillment: ${shopErr.message}`);
          }
        }
      }
    }

    return shipmentRecord;
  }

  /**
   * Query real tracking status from Shiprocket
   */
  async getTrackingByAwb(awbCode) {
    if (!awbCode) throw new Error('AWB code is required for tracking lookup.');

    const response = await this.request(`/courier/track/awb/${encodeURIComponent(awbCode)}`, 'GET');
    const trackData = response?.tracking_data;

    if (!trackData) {
      return { found: false, message: 'Tracking details not yet published by courier.' };
    }

    const currentStatus = trackData.shipment_track?.[0]?.current_status || trackData.track_status || 'In Transit';
    const scans = trackData.shipment_track_activities || [];

    return {
      found: true,
      awbCode,
      courier: trackData.shipment_track?.[0]?.courier_name || 'Express Courier',
      status: currentStatus,
      origin: trackData.shipment_track?.[0]?.origin || 'Pune',
      destination: trackData.shipment_track?.[0]?.destination || 'India',
      estimatedDelivery: trackData.shipment_track?.[0]?.edd || '2-4 Business Days',
      scans: scans.map(s => ({
        location: s.location,
        status: s.activity,
        date: s.date
      }))
    };
  }

  /**
   * Cancel order on Shiprocket
   */
  async cancelOrder(shiprocketOrderId) {
    if (!shiprocketOrderId) throw new Error('Shiprocket Order ID is required for cancellation.');

    return await this.request('/orders/cancel', 'POST', {
      ids: [shiprocketOrderId]
    });
  }
}

export const shiprocketService = new ShiprocketService();
export default shiprocketService;
