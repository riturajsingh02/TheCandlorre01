/**
 * THE Candlorre — SHOPIFY SERVICE LAYER
 * Core GraphQL communicator for Shopify Storefront API
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';
import { ShopifyError } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ShopifyService {
  /**
   * Check if Shopify Storefront API credentials are configured
   */
  static isConfigured() {
    return Boolean(config.shopify.storeDomain && config.shopify.storefrontAccessToken);
  }

  /**
   * Execute a GraphQL query or mutation against Shopify Storefront API
   */
  static async request(query, variables = {}) {
    if (!this.isConfigured()) {
      throw new ShopifyError(
        'Shopify Storefront credentials are not configured on the server. Please set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN.',
        503
      );
    }

    const domain = config.shopify.storeDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const endpoint = `https://${domain}/api/${config.shopify.apiVersion}/graphql.json`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': config.shopify.storefrontAccessToken
        },
        body: JSON.stringify({ query, variables })
      });

      if (!response.ok) {
        throw new ShopifyError(`Shopify API responded with HTTP status ${response.status}`, response.status);
      }

      const json = await response.json();

      if (json.errors && json.errors.length > 0) {
        const errorMsg = json.errors.map(e => e.message).join('; ');
        throw new ShopifyError(errorMsg, 400, json.errors);
      }

      return json.data;
    } catch (err) {
      if (err instanceof ShopifyError) throw err;
      throw new ShopifyError(`Failed to connect to Shopify: ${err.message}`, 502);
    }
  }

  /**
   * Helper to load local catalog fallback
   */
  static getFallbackProducts() {
    try {
      const p = path.join(__dirname, '..', 'data', 'products.json');
      if (fs.existsSync(p)) {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      }
    } catch (e) {
      console.warn('[ShopifyService] Error reading products fallback:', e.message);
    }
    return [];
  }

  /**
   * Fetch live products from Shopify
   */
  static async getProducts({ first = 50, query = '', sortKey = 'BEST_SELLING', reverse = false } = {}) {
    try {
      const gql = `
        query getProducts($first: Int!, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
          products(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse) {
            edges {
              node {
                id
                title
                handle
                description
                availableForSale
                productType
                tags
                metafields(identifiers: [
                  { namespace: "custom", key: "burn_time" },
                  { namespace: "custom", key: "fragrance_notes" },
                  { namespace: "custom", key: "wax_type" },
                  { namespace: "custom", key: "dimensions" }
                ]) {
                  key
                  value
                }
                variants(first: 10) {
                  edges {
                    node {
                      id
                      title
                      availableForSale
                      quantityAvailable
                      priceV2 {
                        amount
                        currencyCode
                      }
                      compareAtPriceV2 {
                        amount
                        currencyCode
                      }
                      sku
                    }
                  }
                }
                images(first: 6) {
                  edges {
                    node {
                      url
                      altText
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const data = await this.request(gql, { first, query: query || null, sortKey, reverse });
      return (data?.products?.edges || []).map(edge => this.formatProduct(edge.node));
    } catch (err) {
      console.warn(`[ShopifyService] Live Shopify unreachable (${err.message}). Using local catalog fallback.`);
      let products = this.getFallbackProducts();
      if (query) {
        const cleanQ = query.toLowerCase();
        products = products.filter(p =>
          (p.title || '').toLowerCase().includes(cleanQ) ||
          (p.desc || '').toLowerCase().includes(cleanQ) ||
          (p.category || '').toLowerCase().includes(cleanQ) ||
          (p.notes?.top || '').toLowerCase().includes(cleanQ) ||
          (p.notes?.heart || '').toLowerCase().includes(cleanQ) ||
          (p.notes?.base || '').toLowerCase().includes(cleanQ) ||
          (Array.isArray(p.variants) && p.variants.some(v => (v.title || '').toLowerCase().includes(cleanQ)))
        );
      }
      return products.slice(0, first);
    }
  }

  /**
   * Fetch single product by handle
   */
  static async getProductByHandle(handle) {
    try {
      const gql = `
        query getProductByHandle($handle: String!) {
          product(handle: $handle) {
            id
            title
            handle
            description
            descriptionHtml
            availableForSale
            productType
            tags
            metafields(identifiers: [
              { namespace: "custom", key: "burn_time" },
              { namespace: "custom", key: "fragrance_notes" },
              { namespace: "custom", key: "wax_type" },
              { namespace: "custom", key: "dimensions" }
            ]) {
              key
              value
            }
            variants(first: 15) {
              edges {
                node {
                  id
                  title
                  availableForSale
                  quantityAvailable
                  priceV2 {
                    amount
                    currencyCode
                  }
                  compareAtPriceV2 {
                    amount
                    currencyCode
                  }
                  sku
                }
              }
            }
            images(first: 10) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
          }
        }
      `;

      const data = await this.request(gql, { handle });
      if (data?.product) return this.formatProduct(data.product);
    } catch (err) {
      console.warn(`[ShopifyService] Live Shopify product query failed (${err.message}). Checking local fallback.`);
    }

    const products = this.getFallbackProducts();
    return products.find(p => p.handle === handle || String(p.id) === String(handle)) || null;
  }

  /**
   * Fetch collections from Shopify
   */
  static async getCollections(first = 20) {
    try {
      const gql = `
        query getCollections($first: Int!) {
          collections(first: $first) {
            edges {
              node {
                id
                title
                handle
                description
                image {
                  url
                  altText
                }
              }
            }
          }
        }
      `;

      const data = await this.request(gql, { first });
      if (data?.collections?.edges?.length > 0) {
        return (data.collections.edges || []).map(e => e.node);
      }
    } catch (err) {
      console.warn(`[ShopifyService] Live Shopify collections query failed (${err.message}). Returning fallback categories.`);
    }

    return [
      { id: 'cat_1', title: 'Premium Luxury Candles', handle: 'luxury-candles', available: true },
      { id: 'cat_2', title: 'Metal Collection', handle: 'metal-collection', available: true },
      { id: 'cat_3', title: 'Glass Jar Collection', handle: 'glass-jar-collection', available: true },
      { id: 'cat_4', title: 'Diffusers and Aromas', handle: 'diffusers-aromas', available: true },
      { id: 'cat_5', title: 'Wooden Collection', handle: 'wooden-collection', available: true },
      { id: 'cat_6', title: 'Seven Chakra- Positivity collection', handle: 'seven-chakra', available: true },
      { id: 'cat_7', title: 'Candle Accessories', handle: 'candle-accessories', available: true }
    ];
  }

  /**
   * Format Shopify Product into unified Candlorre Product Object
   */
  static formatProduct(node) {
    const variants = (node.variants?.edges || []).map(v => ({
      id: v.node.id,
      title: v.node.title,
      price: parseFloat(v.node.priceV2?.amount || 0),
      origPrice: parseFloat(v.node.compareAtPriceV2?.amount || v.node.priceV2?.amount || 0),
      currency: v.node.priceV2?.currencyCode || 'INR',
      available: v.node.availableForSale,
      stock: v.node.quantityAvailable ?? 10,
      sku: v.node.sku || ''
    }));

    const primaryVariant = variants[0] || { price: 0, origPrice: 0, available: false, stock: 0 };
    const images = (node.images?.edges || []).map(img => img.node.url);

    // Parse metafields
    const metafields = {};
    (node.metafields || []).forEach(mf => {
      if (mf && mf.key) metafields[mf.key] = mf.value;
    });

    return {
      id: node.id,
      shopifyId: node.id,
      handle: node.handle,
      title: node.title,
      desc: node.description || '',
      category: node.productType || 'Premium Luxury Candles',
      price: primaryVariant.price,
      origPrice: primaryVariant.origPrice,
      currency: primaryVariant.currency,
      stock: primaryVariant.stock,
      available: node.availableForSale,
      image: images[0] || 'asset/one.jpg',
      images: images.length > 0 ? images : ['asset/one.jpg'],
      badge: node.tags?.includes('bestseller') ? 'BESTSELLER' : (node.tags?.includes('new') ? 'NEW ARRIVAL' : ''),
      burn: metafields.burn_time || '35-50 Hours',
      dimensions: metafields.dimensions || '8cm × 9.5cm (220g)',
      wax: metafields.wax_type || '100% Pure Botanical Soy Wax',
      notes: {
        top: metafields.fragrance_notes || 'Pure Botanical Soy',
        heart: 'Therapeutic Essential Oils',
        base: 'Fine IFRA-Certified Fragrance'
      },
      variants
    };
  }

  /**
   * Check if Shopify Admin API credentials are configured
   */
  static isAdminConfigured() {
    return Boolean(config.shopify.storeDomain && config.shopify.adminAccessToken);
  }

  /**
   * Make request to Shopify Admin REST / GraphQL API
   */
  static async adminRequest(endpointPath, method = 'GET', body = null) {
    if (!this.isAdminConfigured()) {
      throw new ShopifyError(
        'Shopify Admin API credentials not configured. Please set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN in environment variables.',
        503
      );
    }

    const domain = config.shopify.storeDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const cleanPath = endpointPath.replace(/^\//, '');
    const url = `https://${domain}/admin/api/${config.shopify.apiVersion}/${cleanPath}`;

    const headers = {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': config.shopify.adminAccessToken
    };

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data.errors ? JSON.stringify(data.errors) : `HTTP ${res.status}`;
      throw new ShopifyError(`Shopify Admin API error: ${msg}`, res.status, data.errors);
    }

    return data;
  }

  /**
   * Create or update fulfillment on Shopify with real carrier & tracking information
   */
  static async createFulfillment({ shopifyOrderId, trackingNumber, trackingCompany, trackingUrl }) {
    if (!this.isAdminConfigured()) {
      console.warn('[Shopify Admin] Cannot push fulfillment: Admin token not configured.');
      return null;
    }

    const numericId = String(shopifyOrderId).replace(/\D/g, '');
    if (!numericId) throw new Error('Invalid Shopify Order ID for fulfillment.');

    // Fetch fulfillment orders first for Shopify 2023+ fulfillment API
    const foData = await this.adminRequest(`orders/${numericId}/fulfillment_orders.json`);
    const fulfillmentOrders = foData.fulfillment_orders || [];

    if (fulfillmentOrders.length === 0) {
      throw new Error(`No fulfillment orders found for Shopify order ${numericId}`);
    }

    const fulfillmentOrderId = fulfillmentOrders[0].id;
    const payload = {
      fulfillment: {
        line_items_by_fulfillment_order: [
          {
            fulfillment_order_id: fulfillmentOrderId
          }
        ],
        tracking_info: {
          number: trackingNumber,
          company: trackingCompany || 'Other',
          url: trackingUrl || ''
        },
        notify_customer: true
      }
    };

    return await this.adminRequest('fulfillments.json', 'POST', payload);
  }
}

export default ShopifyService;
