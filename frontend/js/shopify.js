/* =========================================================
   THE Candlorre — REUSABLE SHOPIFY SERVICE LAYER
   Customer Authentication, Storefront GraphQL API,
   Orders, Tracking, Profile, & Session Management.
   ========================================================= */

(function (window) {
  'use strict';

  const TOKEN_KEY = 'theCandlorre_cust_token';
  const TOKEN_EXP_KEY = 'theCandlorre_cust_token_exp';
  const CUST_CACHE_KEY = 'theCandlorre_cust_profile';
  const DEMO_MODE_KEY = 'theCandlorre_demo_active';

  // Helper to reliably detect and strip the default sample demo address across all browser sessions
  function isSampleAddress(addr) {
    if (!addr) return false;
    const str = `${addr.id || ''} ${addr.firstName || ''} ${addr.lastName || ''} ${addr.phone || ''} ${addr.address1 || ''} ${addr.address2 || ''} ${addr.city || ''} ${addr.province || ''} ${addr.zip || ''}`.toLowerCase();
    return str.includes('botanical') ||
           str.includes('aarav') ||
           str.includes('gurugram') ||
           str.includes('orchid') ||
           str.includes('sector 42') ||
           str.includes('122002') ||
           str.includes('9876543210') ||
           addr.id === 'addr_101';
  }

  // Helper to detect and strip legacy sample orders (TC10234, TC10189, etc.)
  function isSampleOrder(order) {
    if (!order) return false;
    const str = `${order.id || ''} ${order.orderNumber || ''} ${order.name || ''}`.toLowerCase();
    return str.includes('tc10234') ||
           str.includes('tc10189') ||
           str.includes('tc10235') ||
           str.includes('tc10236') ||
           str.includes('8920194') ||
           str.includes('8710291');
  }

  const ShopifyService = {
    // Config getter
    getConfig: function () {
      const globalConfig = window.Candlorre_CONFIG || {};
      return {
        storeDomain: globalConfig.shopifyStoreDomain || '',
        storefrontToken: globalConfig.shopifyStorefrontToken || '',
        apiVersion: globalConfig.shopifyApiVersion || '2024-07',
        trackingEndpoint: globalConfig.orderTrackingEndpoint || ''
      };
    },

    isConfigured: function () {
      const cfg = this.getConfig();
      return Boolean(cfg.storeDomain && cfg.storefrontToken);
    },

    // Session Management
    getToken: function () {
      return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
    },

    setSession: function (token, expiresAt, remember) {
      if (remember) {
        localStorage.setItem(TOKEN_KEY, token);
        if (expiresAt) localStorage.setItem(TOKEN_EXP_KEY, expiresAt);
      } else {
        sessionStorage.setItem(TOKEN_KEY, token);
        if (expiresAt) sessionStorage.setItem(TOKEN_EXP_KEY, expiresAt);
      }
      // Also sync across storages for resilience
      localStorage.setItem(TOKEN_KEY, token);
      if (expiresAt) localStorage.setItem(TOKEN_EXP_KEY, expiresAt);
      sessionStorage.setItem(TOKEN_KEY, token);
      if (expiresAt) sessionStorage.setItem(TOKEN_EXP_KEY, expiresAt);

      window.dispatchEvent(new CustomEvent('Candlorre:authChange', { detail: { authenticated: true } }));
    },

    clearSession: function () {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_EXP_KEY);
      sessionStorage.removeItem(CUST_CACHE_KEY);
      sessionStorage.removeItem(DEMO_MODE_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXP_KEY);
      localStorage.removeItem(CUST_CACHE_KEY);
      localStorage.removeItem(DEMO_MODE_KEY);
      window.dispatchEvent(new CustomEvent('Candlorre:authChange', { detail: { authenticated: false } }));
    },

    isAuthenticated: function () {
      const token = this.getToken();
      if (!token) return false;
      const exp = localStorage.getItem(TOKEN_EXP_KEY) || sessionStorage.getItem(TOKEN_EXP_KEY);
      if (exp && new Date(exp) < new Date()) {
        this.clearSession();
        return false;
      }
      return true;
    },

    async requireAuth(redirectPage = 'account.html') {
      if (!this.isAuthenticated()) {
        const target = encodeURIComponent(redirectPage || window.location.pathname.split('/').pop() || 'account.html');
        window.location.replace(`login.html?redirect=${target}`);
        return null;
      }
      const customer = await this.getCustomer();
      if (!customer) {
        const target = encodeURIComponent(redirectPage || window.location.pathname.split('/').pop() || 'account.html');
        window.location.replace(`login.html?redirect=${target}`);
        return null;
      }
      return customer;
    },

    // GraphQL request executor for Storefront API (used for live catalog sync if configured)
    async graphqlRequest(query, variables = {}) {
      const cfg = this.getConfig();
      if (!this.isConfigured()) {
        throw new Error('Shopify Storefront credentials are not yet configured in Candlorre_CONFIG.');
      }
      const endpoint = `https://${cfg.storeDomain.replace(/\/$/, '')}/api/${cfg.apiVersion}/graphql.json`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': cfg.storefrontToken
        },
        body: JSON.stringify({ query, variables })
      });
      if (!response.ok) {
        throw new Error(`Shopify API error: HTTP ${response.status}`);
      }
      const json = await response.json();
      if (json.errors && json.errors.length) {
        throw new Error(json.errors.map(e => e.message).join(', '));
      }
      return json.data;
    },

    // 1. Customer Authentication (Login) - Real Backend Verification
    async login(identifier, password, remember = false) {
      if (!identifier || !password) {
        throw new Error('Please enter your email / mobile and password.');
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier, password, remember })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Invalid email or password. Please verify your credentials.');
      }

      const token = data.token || data.accessToken;
      if (token) {
        this.setSession(token, data.expiresAt, remember);
      }

      const rawUser = data.user || data.customer;
      if (rawUser) {
        const formatted = {
          id: rawUser.id,
          firstName: rawUser.firstName || (rawUser.name ? rawUser.name.split(' ')[0] : ''),
          lastName: rawUser.lastName || (rawUser.name ? rawUser.name.split(' ').slice(1).join(' ') : ''),
          displayName: rawUser.displayName || rawUser.name || `${rawUser.firstName || ''} ${rawUser.lastName || ''}`.trim() || 'Client',
          email: rawUser.email,
          phone: rawUser.phone || '',
          createdAt: rawUser.createdAt,
          tier: rawUser.tier || 'Sanctuary Connoisseur',
          defaultAddress: null,
          addresses: [],
          orders: []
        };
        const storage = remember ? localStorage : sessionStorage;
        storage.setItem(CUST_CACHE_KEY, JSON.stringify(formatted));
        localStorage.setItem(CUST_CACHE_KEY, JSON.stringify(formatted));
        return formatted;
      }

      return await this.getCustomer(true);
    },

    // 2. Customer Registration (Sign up) - Real Backend Database Persistence
    async register({ firstName, lastName, email, phone, password, confirmPassword, agreeTerms = true }) {
      if (!firstName) throw new Error('First name is required.');
      if (!email) throw new Error('Email address is required.');
      if (!password) throw new Error('Password is required.');
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters in length.');
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName,
          lastName,
          name: `${firstName || ''} ${lastName || ''}`.trim(),
          email,
          phone,
          password,
          confirmPassword,
          agreeTerms
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Could not complete registration. Please verify your details.');
      }

      const token = data.token || data.accessToken;
      if (token) {
        this.setSession(token, data.expiresAt, true);
      }

      const rawUser = data.user || data.customer;
      if (rawUser) {
        const formatted = {
          id: rawUser.id,
          firstName: rawUser.firstName || (rawUser.name ? rawUser.name.split(' ')[0] : ''),
          lastName: rawUser.lastName || (rawUser.name ? rawUser.name.split(' ').slice(1).join(' ') : ''),
          displayName: rawUser.displayName || rawUser.name || `${rawUser.firstName || ''} ${rawUser.lastName || ''}`.trim() || 'Client',
          email: rawUser.email,
          phone: rawUser.phone || '',
          createdAt: rawUser.createdAt,
          tier: rawUser.tier || 'Sanctuary Connoisseur',
          defaultAddress: null,
          addresses: [],
          orders: []
        };
        localStorage.setItem(CUST_CACHE_KEY, JSON.stringify(formatted));
        sessionStorage.setItem(CUST_CACHE_KEY, JSON.stringify(formatted));
        return formatted;
      }

      return await this.getCustomer(true);
    },

    // 3. Password Recovery - Step 1: Send OTP
    async recoverPassword(identifier) {
      if (!identifier) throw new Error('Please enter your registered email address or mobile number.');

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Unable to process reset request. Please check your contact details.');
      }

      return data;
    },

    // Step 2: Verify OTP
    async verifyOtp(userId, identifier, otp) {
      if (!otp) throw new Error('Please enter the 6-digit verification code.');

      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, identifier, otp })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Invalid or expired verification code.');
      }

      return data;
    },

    // Step 3: Reset Password
    async resetPassword(userId, resetToken, newPassword, confirmPassword) {
      if (!newPassword || newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long.');
      }

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, resetToken, newPassword, confirmPassword })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Unable to update password. Please retry the recovery process.');
      }

      return data;
    },

    // 4. Google OAuth Sign-In
    async googleLogin(payload) {
      if (!payload) throw new Error('Google authentication payload missing.');
      const body = typeof payload === 'string' ? { idToken: payload } : payload;

      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Google sign-in failed. Please try again.');
      }

      const tokenVal = data.accessToken || data.token;
      if (tokenVal) {
        this.setSession(tokenVal, data.expiresAt, true);
      }

      const rawUser = data.user || data.customer;
      if (rawUser) {
        const formatted = {
          id: rawUser.id,
          firstName: rawUser.firstName || (rawUser.name ? rawUser.name.split(' ')[0] : ''),
          lastName: rawUser.lastName || (rawUser.name ? rawUser.name.split(' ').slice(1).join(' ') : ''),
          displayName: rawUser.displayName || rawUser.name || `${rawUser.firstName || ''} ${rawUser.lastName || ''}`.trim() || 'Client',
          email: rawUser.email,
          phone: rawUser.phone || '',
          createdAt: rawUser.createdAt,
          tier: rawUser.tier || 'Sanctuary Connoisseur',
          defaultAddress: null,
          addresses: [],
          orders: []
        };
        localStorage.setItem(CUST_CACHE_KEY, JSON.stringify(formatted));
        sessionStorage.setItem(CUST_CACHE_KEY, JSON.stringify(formatted));
        return formatted;
      }

      return await this.getCustomer(true);
    },

    // 5. Customer Profile Fetch - Real Database Record
    async getCustomer(forceRefresh = false) {
      if (!this.isAuthenticated()) {
        return null;
      }

      const cached = sessionStorage.getItem(CUST_CACHE_KEY) || localStorage.getItem(CUST_CACHE_KEY);
      if (cached && !forceRefresh) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.email) {
            return parsed;
          }
        } catch (e) {}
      }

      try {
        const token = this.getToken();
        const response = await fetch('/api/customer/me', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          credentials: 'include'
        });

        if (!response.ok) {
          if (response.status === 401) {
            this.clearSession();
            return null;
          }
          throw new Error('Could not fetch customer profile');
        }

        const data = await response.json();
        const raw = data.user || data.customer || data;
        const addresses = data.addresses || raw.addresses || [];
        const orders = data.orders || raw.orders || [];

        const defaultAddr = addresses.find(a => a.isDefault) || addresses[0] || null;

        const formatted = {
          id: raw.id,
          firstName: raw.firstName || (raw.name ? raw.name.split(' ')[0] : ''),
          lastName: raw.lastName || (raw.name ? raw.name.split(' ').slice(1).join(' ') : ''),
          displayName: raw.name || `${raw.firstName || ''} ${raw.lastName || ''}`.trim() || 'Client',
          email: raw.email,
          phone: raw.phone || '',
          createdAt: raw.createdAt,
          tier: 'Sanctuary Connoisseur',
          defaultAddress: defaultAddr,
          addresses: addresses,
          orders: orders
        };

        localStorage.setItem(CUST_CACHE_KEY, JSON.stringify(formatted));
        sessionStorage.setItem(CUST_CACHE_KEY, JSON.stringify(formatted));
        return formatted;
      } catch (err) {
        console.warn('[The Candlorre] Could not fetch remote customer profile:', err);
        return null;
      }
    },

    // 6. Update Customer Profile
    async updateProfile(profileData) {
      if (!this.isAuthenticated()) throw new Error('Authentication required.');

      const token = this.getToken();
      const response = await fetch('/api/customer/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify(profileData)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Could not update profile information.');
      }

      return await this.getCustomer(true);
    },

    // 7. Orders
    async getOrders() {
      if (!this.isAuthenticated()) return [];
      try {
        const token = this.getToken();
        const response = await fetch('/api/customer/orders', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          return (data.orders || []).filter(o => !isSampleOrder(o));
        }
      } catch (e) {
        console.warn('Could not fetch remote orders:', e);
      }

      const cust = await this.getCustomer();
      return (cust?.orders || []).filter(o => !isSampleOrder(o));
    },

    async getOrder(orderIdOrNumber) {
      if (!orderIdOrNumber) return null;
      const cleanTarget = String(orderIdOrNumber).replace(/^#/, '').trim();

      // First query server order endpoint directly
      try {
        const token = this.getToken();
        const resp = await fetch(`/api/orders/${encodeURIComponent(cleanTarget)}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          credentials: 'include'
        });
        if (resp.ok) {
          const json = await resp.json();
          const order = json.data?.order || json.order;
          if (order) return order;
        }
      } catch (e) {}

      // Fallback check user's loaded orders
      const orders = await this.getOrders();
      return orders.find(o => {
        const num = String(o.orderNumber || '').replace(/^#/, '').toLowerCase().trim();
        const name = String(o.name || '').replace(/^#/, '').toLowerCase().trim();
        const id = String(o.id || '').toLowerCase().trim();
        return num === cleanTarget.toLowerCase() || name === cleanTarget.toLowerCase() || id === cleanTarget.toLowerCase();
      }) || null;
    },

    // 8. Tracking Lookup — Real Database and Shiprocket Scans
    async trackShipment(identifier) {
      if (!identifier || !identifier.trim()) {
        throw new Error('Please enter an Order ID or Waybill Number.');
      }
      const queryClean = identifier.replace(/^#/, '').trim();

      // Primary tracking lookup via /api/tracking/:identifier
      try {
        const resp = await fetch(`/api/tracking/${encodeURIComponent(queryClean)}`, {
          credentials: 'include'
        });
        if (resp.ok) {
          const json = await resp.json();
          const resData = (json && json.data) ? json.data : json;
          if (resData && (resData.found || resData.orderNumber || resData.trackingNumber)) {
            return resData;
          }
        }
      } catch (e) {}

      // Secondary check via /api/customer/orders/track
      try {
        const resp2 = await fetch(`/api/customer/orders/track?identifier=${encodeURIComponent(queryClean)}`, {
          credentials: 'include'
        });
        if (resp2.ok) {
          const json2 = await resp2.json();
          const resData2 = (json2 && json2.data) ? json2.data : json2;
          if (resData2 && resData2.found) {
            return resData2;
          }
        }
      } catch (e) {}

      // Fallback check user's loaded orders
      const orders = await this.getOrders();
      const match = orders.find(o => {
        const orderNum = String(o.orderNumber || '').replace(/^#/, '').toLowerCase();
        const trackingNum = String(o.tracking?.trackingNumber || '').toLowerCase();
        return orderNum === queryClean.toLowerCase() || trackingNum === queryClean.toLowerCase();
      });

      if (match) {
        return {
          found: true,
          orderNumber: match.orderNumber,
          orderId: match.id,
          date: match.processedAt || match.createdAt,
          courier: match.tracking?.courier || null,
          trackingNumber: match.tracking?.trackingNumber || null,
          trackingUrl: match.tracking?.trackingUrl || null,
          status: match.tracking?.status || match.status || 'Order Placed',
          hasAwbAssigned: Boolean(match.tracking?.trackingNumber),
          estimatedDelivery: match.tracking?.estimatedDelivery || 'Calculated upon courier pickup',
          destination: match.shippingAddress?.city ? `${match.shippingAddress.city}, ${match.shippingAddress.state || 'India'}` : 'India',
          timeline: match.timeline || [],
          items: match.lineItems || []
        };
      }

      return {
        found: false,
        message: `No active order or parcel was found matching "${queryClean}". Please verify your Order Number or Waybill and try again.`
      };
    },

    // 9. Saved Addresses
    async getAddresses() {
      if (!this.isAuthenticated()) return [];
      try {
        const token = this.getToken();
        const response = await fetch('/api/customer/addresses', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          return (data.addresses || []).filter(a => !isSampleAddress(a));
        }
      } catch (e) {}

      const cust = await this.getCustomer();
      return (cust?.addresses || []).filter(a => !isSampleAddress(a));
    },

    async getDefaultAddress() {
      const addresses = await this.getAddresses();
      return addresses.find(a => a.isDefault) || addresses[0] || null;
    },

    async addAddress(addressData) {
      if (!this.isAuthenticated()) throw new Error('Authentication required.');

      const token = this.getToken();
      const response = await fetch('/api/customer/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify(addressData)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Could not save address.');
      }

      const updatedCust = await this.getCustomer(true);
      window.dispatchEvent(new CustomEvent('Candlorre:addressChange', { detail: { customer: updatedCust } }));
      return updatedCust;
    },

    async updateAddress(addressId, addressData) {
      if (!this.isAuthenticated()) throw new Error('Authentication required.');

      const token = this.getToken();
      const response = await fetch(`/api/customer/addresses/${addressId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify(addressData)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Could not update address.');
      }

      const updatedCust = await this.getCustomer(true);
      window.dispatchEvent(new CustomEvent('Candlorre:addressChange', { detail: { customer: updatedCust } }));
      return updatedCust;
    },

    async deleteAddress(addressId) {
      if (!this.isAuthenticated()) throw new Error('Authentication required.');

      const token = this.getToken();
      const response = await fetch(`/api/customer/addresses/${addressId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Could not remove address.');
      }

      const updatedCust = await this.getCustomer(true);
      window.dispatchEvent(new CustomEvent('Candlorre:addressChange', { detail: { customer: updatedCust } }));
      return updatedCust;
    },

    async setDefaultAddress(addressId) {
      if (!this.isAuthenticated()) throw new Error('Authentication required.');

      const token = this.getToken();
      const response = await fetch(`/api/customer/addresses/${addressId}/default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Could not set default address.');
      }

      const updatedCust = await this.getCustomer(true);
      window.dispatchEvent(new CustomEvent('Candlorre:addressChange', { detail: { customer: updatedCust } }));
      return updatedCust;
    },

    // 10. Logout - Invalidate Server Session
    async logout() {
      try {
        const token = this.getToken();
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          credentials: 'include'
        });
      } catch (e) {
        console.warn('Logout notification to backend failed:', e);
      }
      this.clearSession();
      window.location.href = 'login.html';
    },

    // 10. Storefront Products & Collections Queries
    async fetchProducts(first = 50) {
      if (!this.isConfigured()) {
        return window.CANDLE_INVENTORY || [];
      }
      try {
        const query = `
          query getProducts($first: Int!) {
            products(first: $first) {
              edges {
                node {
                  id
                  title
                  handle
                  description
                  availableForSale
                  productType
                  tags
                  variants(first: 10) {
                    edges {
                      node {
                        id
                        title
                        availableForSale
                        priceV2 {
                          amount
                          currencyCode
                        }
                        compareAtPriceV2 {
                          amount
                          currencyCode
                        }
                      }
                    }
                  }
                  images(first: 5) {
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
        const data = await this.graphqlRequest(query, { first });
        return (data?.products?.edges || []).map(e => {
          const p = e.node;
          const firstVariant = p.variants?.edges?.[0]?.node;
          const price = parseFloat(firstVariant?.priceV2?.amount || 0);
          const origPrice = parseFloat(firstVariant?.compareAtPriceV2?.amount || price);
          return {
            id: p.id,
            shopifyId: p.id,
            handle: p.handle,
            title: p.title,
            desc: p.description,
            category: p.productType || 'Premium Luxury Candles',
            price: price,
            origPrice: origPrice > price ? origPrice : price,
            burn: '30-55 Hours',
            badge: p.tags?.includes('bestseller') ? 'BESTSELLER' : (p.tags?.includes('new') ? 'NEW ARRIVAL' : ''),
            notes: { top: 'Premium Soy Wax', heart: 'Essential Oils', base: 'Therapeutic Fragrance' },
            image: p.images?.edges?.[0]?.node?.url || 'asset/one.jpg',
            variants: (p.variants?.edges || []).map(ve => ({
              id: ve.node.id,
              shopifyVariantId: ve.node.id,
              title: ve.node.title,
              price: parseFloat(ve.node.priceV2?.amount || 0),
              available: ve.node.availableForSale
            }))
          };
        });
      } catch (err) {
        console.warn('Could not fetch live Shopify products:', err);
        return window.CANDLE_INVENTORY || [];
      }
    },

    async fetchCollections() {
      if (!this.isConfigured()) {
        return window.storeCategories || [];
      }
      try {
        const query = `
          query getCollections {
            collections(first: 20) {
              edges {
                node {
                  id
                  title
                  handle
                  description
                }
              }
            }
          }
        `;
        const data = await this.graphqlRequest(query);
        return (data?.collections?.edges || []).map(e => e.node);
      } catch (err) {
        console.warn('Could not fetch live Shopify collections:', err);
        return window.storeCategories || [];
      }
    },

    // 11. Storefront Cart Mutations
    async createCart(lines = [], discountCodes = []) {
      if (!this.isConfigured()) return null;
      const query = `
        mutation cartCreate($input: CartInput!) {
          cartCreate(input: $input) {
            cart {
              id
              checkoutUrl
              cost {
                totalAmount {
                  amount
                  currencyCode
                }
                subtotalAmount {
                  amount
                  currencyCode
                }
              }
              discountCodes {
                code
                applicable
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
      const data = await this.graphqlRequest(query, {
        input: {
          lines: lines,
          discountCodes: discountCodes.filter(Boolean)
        }
      });
      return data?.cartCreate?.cart || null;
    },

    // 12. Route Protection Guard
    async requireAuth(intendedRedirect) {
      if (!this.isAuthenticated()) {
        const redirectParam = intendedRedirect ? `?redirect=${encodeURIComponent(intendedRedirect)}` : '';
        window.location.href = `login.html${redirectParam}`;
        return null;
      }
      const customer = await this.getCustomer();
      if (!customer) {
        window.location.href = `login.html`;
        return null;
      }
      return customer;
    },

    // 13. Header & Navigation Sync across all pages
    syncHeaderAuth: function () {
      const isAuth = this.isAuthenticated();
      const accountBtns = document.querySelectorAll('.action-btn[href="login.html"], .action-btn[href="account.html"], #accountHeaderBtn');
      const mobileAccountLinks = document.querySelectorAll('.mobile-nav-link[href="login.html"], .mobile-nav-link[href="account.html"]');

      if (isAuth) {
        accountBtns.forEach(btn => {
          btn.setAttribute('href', 'account.html');
          btn.setAttribute('title', 'My Account');
          btn.setAttribute('aria-label', 'My Account');
          btn.classList.add('authenticated');
        });

        mobileAccountLinks.forEach(link => {
          link.setAttribute('href', 'account.html');
          const span = link.querySelector('span:first-child');
          if (span) span.textContent = 'My Account';
        });

        // Add mobile drawer extra account shortcuts if not present
        const mobileList = document.querySelector('.mobile-nav-list');
        if (mobileList && !document.getElementById('mobAccountGroup')) {
          const group = document.createElement('li');
          group.id = 'mobAccountGroup';
          group.className = 'mob-account-group';
          group.innerHTML = `
            <div class="mob-account-sublinks">
              <a href="orders.html" class="mob-sub-link">My Orders</a>
              <a href="tracking.html" class="mob-sub-link">Track Parcel</a>
              <a href="addresses.html" class="mob-sub-link">Saved Addresses</a>
              <a href="edit-profile.html" class="mob-sub-link">Personal Info</a>
              <button type="button" class="mob-sub-link mob-logout-btn" onclick="ShopifyService.logout()">Sign Out</button>
            </div>
          `;
          mobileList.appendChild(group);
        }
      } else {
        accountBtns.forEach(btn => {
          btn.setAttribute('href', 'login.html');
          btn.setAttribute('title', 'Sign In');
          btn.setAttribute('aria-label', 'Client Sign In');
          btn.classList.remove('authenticated');
        });

        mobileAccountLinks.forEach(link => {
          link.setAttribute('href', 'login.html');
          const span = link.querySelector('span:first-child');
          if (span) span.textContent = 'Client Sign In';
        });

        const mobGroup = document.getElementById('mobAccountGroup');
        if (mobGroup) mobGroup.remove();
      }
    }
  };

  // Expose globally
  window.ShopifyService = ShopifyService;

  // Auto-sync immediately, on DOM ready, and on auth changes
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ShopifyService.syncHeaderAuth();
    });
  } else {
    ShopifyService.syncHeaderAuth();
  }

  window.addEventListener('Candlorre:authChange', () => {
    ShopifyService.syncHeaderAuth();
  });

})(window);
