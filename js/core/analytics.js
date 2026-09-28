/* =========================================================
   THE Candlorre — ANALYTICS & E-COMMERCE TRACKING ENGINE
   Google Analytics 4 (GA4) & Meta Pixel (Facebook Pixel)
   ========================================================= */

window.CandlorreAnalytics = (function () {
  'use strict';

  let ga4Id = (typeof Candlorre_CONFIG !== 'undefined' && Candlorre_CONFIG.ga4MeasurementId) || '';
  let metaPixelId = (typeof Candlorre_CONFIG !== 'undefined' && Candlorre_CONFIG.metaPixelId) || '';

  // Initialize scripts if IDs are present
  function init(config) {
    if (config) {
      if (config.ga4MeasurementId) ga4Id = config.ga4MeasurementId;
      if (config.metaPixelId) metaPixelId = config.metaPixelId;
    }

    // Initialize Google Analytics 4 if measurement ID exists and not already loaded
    if (ga4Id && !window.gtag) {
      try {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`;
        document.head.appendChild(script);

        window.dataLayer = window.dataLayer || [];
        function gtag() { window.dataLayer.push(arguments); }
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', ga4Id, { send_page_view: true });
      } catch (e) {
        console.warn('[Analytics] GA4 init notice:', e.message);
      }
    }

    // Initialize Meta Pixel if ID exists and not already loaded
    if (metaPixelId && !window.fbq) {
      try {
        /* eslint-disable */
        (function (f, b, e, v, n, t, s) {
          if (f.fbq) return; n = f.fbq = function () {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
          };
          if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
          n.queue = []; t = b.createElement(e); t.async = !0;
          t.src = v; s = b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t, s);
        })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
        /* eslint-enable */
        if (window.fbq) {
          window.fbq('init', metaPixelId);
          window.fbq('track', 'PageView');
        }
      } catch (e) {
        console.warn('[Analytics] Meta Pixel init notice:', e.message);
      }
    }
  }

  // Safe tracking helper for GA4
  function trackGA4(eventName, params) {
    if (typeof window.gtag === 'function') {
      try {
        window.gtag('event', eventName, params || {});
      } catch (err) {
        console.debug('[GA4 Event]', eventName, params);
      }
    }
  }

  // Safe tracking helper for Meta Pixel
  function trackMeta(eventName, params) {
    if (typeof window.fbq === 'function') {
      try {
        if (params) {
          window.fbq('track', eventName, params);
        } else {
          window.fbq('track', eventName);
        }
      } catch (err) {
        console.debug('[Meta Event]', eventName, params);
      }
    }
  }

  return {
    init: init,

    // 1. Page View
    trackPageView: function (pagePath, pageTitle) {
      trackGA4('page_view', {
        page_path: pagePath || window.location.pathname,
        page_title: pageTitle || document.title
      });
      trackMeta('PageView');
    },

    // 2. View Item (Product Details Page)
    trackViewItem: function (product) {
      if (!product) return;
      const price = typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0;
      
      trackGA4('view_item', {
        currency: 'INR',
        value: price,
        items: [{
          item_id: String(product.id || product.handle || ''),
          item_name: product.title || '',
          item_category: product.category || 'Candles',
          price: price,
          quantity: 1
        }]
      });

      trackMeta('ViewContent', {
        content_name: product.title || '',
        content_category: product.category || 'Candles',
        content_ids: [String(product.id || product.handle || '')],
        content_type: 'product',
        value: price,
        currency: 'INR'
      });
    },

    // 3. Search
    trackSearch: function (searchTerm) {
      if (!searchTerm) return;
      trackGA4('search', {
        search_term: searchTerm
      });
      trackMeta('Search', {
        search_string: searchTerm
      });
    },

    // 4. Add to Cart
    trackAddToCart: function (product, quantity, size) {
      if (!product) return;
      const qty = quantity || 1;
      const price = typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0;
      const totalVal = price * qty;

      trackGA4('add_to_cart', {
        currency: 'INR',
        value: totalVal,
        items: [{
          item_id: String(product.id || product.handle || ''),
          item_name: product.title || '',
          item_category: product.category || 'Candles',
          item_variant: size || product.size || '',
          price: price,
          quantity: qty
        }]
      });

      trackMeta('AddToCart', {
        content_name: product.title || '',
        content_category: product.category || 'Candles',
        content_ids: [String(product.id || product.handle || '')],
        content_type: 'product',
        value: totalVal,
        currency: 'INR'
      });
    },

    // 5. Remove from Cart
    trackRemoveFromCart: function (product, quantity) {
      if (!product) return;
      const qty = quantity || 1;
      const price = typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0;

      trackGA4('remove_from_cart', {
        currency: 'INR',
        value: price * qty,
        items: [{
          item_id: String(product.id || product.handle || ''),
          item_name: product.title || '',
          item_category: product.category || 'Candles',
          price: price,
          quantity: qty
        }]
      });
    },

    // 6. View Cart
    trackViewCart: function (cartItems, totalValue) {
      const items = (cartItems || []).map(i => ({
        item_id: String(i.id || ''),
        item_name: i.title || '',
        price: i.price || 0,
        quantity: i.quantity || 1
      }));

      trackGA4('view_cart', {
        currency: 'INR',
        value: totalValue || 0,
        items: items
      });
    },

    // 7. Begin Checkout
    trackBeginCheckout: function (cartItems, totalValue, couponCode) {
      const items = (cartItems || []).map(i => ({
        item_id: String(i.id || ''),
        item_name: i.title || '',
        price: i.price || 0,
        quantity: i.quantity || 1
      }));

      trackGA4('begin_checkout', {
        currency: 'INR',
        value: totalValue || 0,
        coupon: couponCode || undefined,
        items: items
      });

      trackMeta('InitiateCheckout', {
        content_ids: (cartItems || []).map(i => String(i.id || '')),
        num_items: (cartItems || []).reduce((acc, cur) => acc + (cur.quantity || 1), 0),
        value: totalValue || 0,
        currency: 'INR'
      });
    },

    // 8. Purchase Event
    trackPurchase: function (order) {
      if (!order) return;
      const items = (order.lineItems || []).map(i => ({
        item_id: String(i.id || i.title || ''),
        item_name: i.title || '',
        price: i.price || 0,
        quantity: i.quantity || 1
      }));

      trackGA4('purchase', {
        transaction_id: String(order.orderNumber || order.name || order.id || Date.now()),
        value: order.totalPrice || order.subtotal || 0,
        currency: 'INR',
        shipping: order.shippingFee || 0,
        items: items
      });

      trackMeta('Purchase', {
        value: order.totalPrice || order.subtotal || 0,
        currency: 'INR',
        content_type: 'product',
        content_ids: (order.lineItems || []).map(i => String(i.id || i.title || '')),
        num_items: (order.lineItems || []).reduce((acc, cur) => acc + (cur.quantity || 1), 0)
      });
    }
  };
})();

// Auto-run initialization on document ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    window.CandlorreAnalytics.init();
  });
} else {
  window.CandlorreAnalytics.init();
}
