/* =========================================================
   THE Candlorre — CLIENT ACCOUNT PAGE LOGIC
   Renders Dashboard, Orders, Order Details, Addresses, & Profile
   Powered by ShopifyService
   ========================================================= */

(function () {
  'use strict';

  // Format currency in Indian Rupees (INR)
  function formatINR(num) {
    const n = Math.round(Number(num) || 0);
    return '₹' + n.toLocaleString('en-IN');
  }

  // Format date
  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  }

  // Generate Monogram Initials
  function getInitials(first = '', last = '') {
    const f = first.trim().charAt(0) || '';
    const l = last.trim().charAt(0) || '';
    return (f + l).toUpperCase() || 'C';
  }

  // Format Status Badge
  function renderStatusBadge(status) {
    const s = String(status || '').toUpperCase();
    if (s.includes('DELIVERED') || s === 'FULFILLED') {
      return `<span class="status-pill status-delivered">● Delivered</span>`;
    }
    if (s.includes('OUT_FOR_DELIVERY') || s.includes('OUT FOR DELIVERY')) {
      return `<span class="status-pill status-out_for_delivery">● Out for Delivery</span>`;
    }
    if (s.includes('SHIP') || s.includes('TRANSIT')) {
      return `<span class="status-pill status-shipped">● In Transit</span>`;
    }
    return `<span class="status-pill status-processing">● Processing</span>`;
  }

  // -----------------------------------------------------------
  // 1. DASHBOARD PAGE (account.html)
  // -----------------------------------------------------------
  async function initDashboard() {
    const container = document.getElementById('accountDashboard');
    if (!container) return;

    const customer = await window.ShopifyService.requireAuth('account.html');
    if (!customer) return;

    // Set Welcome Header
    const nameEl = document.getElementById('customerFullName');
    const emailEl = document.getElementById('customerEmail');
    const memberSinceEl = document.getElementById('customerMemberSince');
    const monogramEl = document.getElementById('customerMonogram');
    const tierEl = document.getElementById('customerTier');

    if (nameEl) nameEl.textContent = customer.displayName || `${customer.firstName} ${customer.lastName}`.trim() || 'Valued Client';
    if (emailEl) emailEl.textContent = customer.email || '';
    if (memberSinceEl) memberSinceEl.textContent = formatDate(customer.createdAt) || '2026';
    if (monogramEl) monogramEl.textContent = getInitials(customer.firstName, customer.lastName);
    if (tierEl) tierEl.textContent = customer.tier || 'Sanctuary Connoisseur';

    // Render Recent Order Preview
    const recentOrderWrap = document.getElementById('recentOrderContainer');
    if (recentOrderWrap) {
      const orders = customer.orders || [];
      if (orders.length > 0) {
        const o = orders[0];
        const firstItem = o.lineItems?.[0] || { title: 'Botanical Candle', image: 'asset/one.jpg' };
        const totalItemsCount = (o.lineItems || []).reduce((acc, i) => acc + (i.quantity || 1), 0);
        const moreItemsText = totalItemsCount > 1 ? ` + ${totalItemsCount - 1} more item${totalItemsCount > 2 ? 's' : ''}` : '';

        recentOrderWrap.innerHTML = `
          <div class="recent-order-preview-card">
            <div class="order-thumb-wrap">
              <img src="${firstItem.image || 'asset/one.jpg'}" alt="${firstItem.title}" onerror="this.src='asset/one.jpg'" />
            </div>
            <div class="order-preview-meta">
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <span class="order-num">${o.orderNumber || o.name}</span>
                <span class="order-date">• Placed on ${formatDate(o.processedAt)}</span>
                ${renderStatusBadge(o.fulfillmentStatus)}
              </div>
              <div class="order-items-summary">
                ${firstItem.title}${moreItemsText}
              </div>
              <div class="order-total-price">
                Total: ${formatINR(o.totalPrice)}
              </div>
            </div>
            <div class="order-preview-actions">
              <a href="order-details.html?id=${encodeURIComponent(o.orderNumber || o.id)}" class="btn btn-outline dark-outline" style="padding: 0.65rem 1rem; font-size: 0.72rem;">
                View Details
              </a>
              <a href="tracking.html?order=${encodeURIComponent(o.orderNumber || o.name)}" class="btn btn-gold" style="padding: 0.65rem 1rem; font-size: 0.72rem;">
                Track Parcel
              </a>
            </div>
          </div>
        `;
      } else {
        recentOrderWrap.innerHTML = `
          <div class="account-empty-state">
            <svg class="empty-state-icon" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
            </svg>
            <h3 class="empty-state-title">No Orders Placed Yet</h3>
            <p class="empty-state-desc">Your sanctuary journey begins here. Explore our handcrafted botanical soy fragrances poured in micro-batches.</p>
            <a href="full-catalog.html" class="btn btn-gold">Explore Fragrances</a>
          </div>
        `;
      }
    }

    // Default Address preview on dashboard
    const addressWrap = document.getElementById('dashboardAddressContainer');
    if (addressWrap) {
      function isSampleAddress(addr) {
        if (!addr) return false;
        const str = `${addr.id || ''} ${addr.firstName || ''} ${addr.lastName || ''} ${addr.phone || ''} ${addr.address1 || ''} ${addr.address2 || ''} ${addr.city || ''} ${addr.province || ''} ${addr.zip || ''}`.toLowerCase();
        return str.includes('botanical') || str.includes('aarav') || str.includes('gurugram') || str.includes('orchid') || str.includes('sector 42') || str.includes('122002') || str.includes('9876543210') || addr.id === 'addr_101';
      }

      const rawDef = customer.defaultAddress || customer.addresses?.[0];
      const def = (rawDef && !isSampleAddress(rawDef)) ? rawDef : null;
      if (def) {
        addressWrap.innerHTML = `
          <div style="background:#FFFFFF; border:1px solid var(--border-subtle); border-radius:6px; padding:1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
            <div>
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                <strong style="font-size:0.95rem; color:var(--cabernet);">${def.firstName} ${def.lastName || ''}</strong>
                <span class="address-tag tag-default">Default Delivery</span>
              </div>
              <p style="margin:0; font-size:0.84rem; color:var(--text-muted); line-height:1.5;">
                ${def.address1}${def.address2 ? ', ' + def.address2 : ''}<br />
                ${def.city}, ${def.province || ''} – ${def.zip || ''}, ${def.country || 'India'}<br />
                Phone: ${def.phone || '—'}
              </p>
            </div>
            <a href="addresses.html" class="btn-link-action">Manage Addresses →</a>
          </div>
        `;
      } else {
        addressWrap.innerHTML = `
          <div style="background:#FFFFFF; border:1px solid var(--border-subtle); border-radius:6px; padding:1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
            <div>
              <strong style="font-size:0.95rem; color:var(--cabernet);">No delivery address saved yet</strong>
              <p style="margin:4px 0 0; font-size:0.84rem; color:var(--text-muted);">Add an address for seamless single-click checkout on future botanical orders.</p>
            </div>
            <a href="addresses.html" class="btn btn-outline dark-outline" style="padding:0.6rem 1.2rem; font-size:0.74rem;">+ Add Address</a>
          </div>
        `;
      }
    }
  }

  // -----------------------------------------------------------
  // 2. ORDERS LIST PAGE (orders.html)
  // -----------------------------------------------------------
  async function initOrdersPage() {
    const listContainer = document.getElementById('ordersListContainer');
    if (!listContainer) return;

    const customer = await window.ShopifyService.requireAuth('orders.html');
    if (!customer) return;

    const orders = customer.orders || [];
    let currentFilter = 'ALL';

    function renderOrders(filter = 'ALL') {
      let filtered = orders;
      if (filter === 'IN_TRANSIT') {
        filtered = orders.filter(o => !String(o.fulfillmentStatus).toUpperCase().includes('DELIVERED'));
      } else if (filter === 'DELIVERED') {
        filtered = orders.filter(o => String(o.fulfillmentStatus).toUpperCase().includes('DELIVERED'));
      }

      if (filtered.length === 0) {
        listContainer.innerHTML = `
          <div class="account-empty-state">
            <svg class="empty-state-icon" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"></path>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
            <h3 class="empty-state-title">No Orders Found</h3>
            <p class="empty-state-desc">You have no orders matching the selected status filter.</p>
            <a href="full-catalog.html" class="btn btn-gold">Shop Botanical Candles</a>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = filtered.map(o => {
        const itemsHtml = (o.lineItems || []).map(li => `
          <div class="order-item-line">
            <div class="order-thumb-wrap" style="width:65px; height:65px;">
              <img src="${li.image || 'asset/one.jpg'}" alt="${li.title}" onerror="this.src='asset/one.jpg'" />
            </div>
            <div class="order-item-info">
              <h4 class="order-item-title">${li.title}</h4>
              <div class="order-item-variant">${li.variantTitle || 'Botanical Soy Wax'} • Qty: ${li.quantity}</div>
            </div>
            <div class="order-item-pricing">
              ${formatINR(li.price * (li.quantity || 1))}
            </div>
          </div>
        `).join('');

        const oFinStatus = String(o.financialStatus || 'PENDING').toUpperCase();
        const oIsPaid = (oFinStatus === 'PAID');
        const oIsCod = (oFinStatus === 'PENDING_COD' || oFinStatus === 'COD_OTP_PENDING');
        const oPillClass = oIsPaid ? 'status-paid' : 'status-processing';
        const oPillText = oIsPaid ? 'Paid' : (oIsCod ? 'COD Pending' : oFinStatus);

        return `
          <div class="order-card-row">
            <div class="order-card-header">
              <div>
                <span style="font-size: 0.88rem; font-weight: 700; color: var(--cabernet); letter-spacing: 0.5px;">${o.orderNumber || o.name}</span>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                  Placed on ${formatDate(o.processedAt || o.createdAt)} • Payment: <strong style="color:var(--text-dark);">${o.paymentMethod || 'Prepaid'}</strong>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="status-pill ${oPillClass}">${oPillText}</span>
                ${renderStatusBadge(o.fulfillmentStatus || o.status)}
              </div>
            </div>

            <div class="order-items-table">
              ${itemsHtml}
            </div>

            <div class="order-card-footer">
              <div style="font-size: 1rem; color: var(--cabernet); font-weight: 700;">
                Total: <span style="color: var(--maroon-light);">${formatINR(o.totalPrice)}</span>
              </div>
              <div class="actions-group">
                <a href="order-details.html?id=${encodeURIComponent(o.orderNumber || o.id)}" class="btn btn-outline dark-outline" style="padding: 0.65rem 1.2rem; font-size: 0.74rem;">
                  View Order Details
                </a>
                <a href="tracking.html?order=${encodeURIComponent(o.orderNumber || o.name)}" class="btn btn-gold" style="padding: 0.65rem 1.2rem; font-size: 0.74rem;">
                  Track Parcel
                </a>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    renderOrders('ALL');

    // Filter pill buttons
    document.querySelectorAll('.order-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.order-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const f = btn.getAttribute('data-filter') || 'ALL';
        renderOrders(f);
      });
    });
  }

  // -----------------------------------------------------------
  // 3. ORDER DETAILS PAGE (order-details.html)
  // -----------------------------------------------------------
  async function initOrderDetailsPage() {
    const wrap = document.getElementById('orderDetailsWrapper');
    if (!wrap) return;

    const params = new URLSearchParams(window.location.search);
    const targetId = params.get('id');

    // If no order ID given and not logged in, redirect to login
    if (!targetId && !window.ShopifyService.isAuthenticated()) {
      window.location.replace('login.html?redirect=orders.html');
      return;
    }

    let customer = null;
    if (window.ShopifyService.isAuthenticated()) {
      customer = await window.ShopifyService.getCustomer();
    }

    let order = null;
    if (targetId) {
      order = await window.ShopifyService.getOrder(targetId);
    } else if (customer && Array.isArray(customer.orders) && customer.orders.length > 0) {
      order = customer.orders[0];
    }

    if (!order) {
      wrap.innerHTML = `
        <div class="account-empty-state">
          <h3 class="empty-state-title">Order Not Found</h3>
          <p class="empty-state-desc">We couldn't locate the requested order. It may have been archived or linked to another account.</p>
          <a href="${customer ? 'orders.html' : 'index.html'}" class="btn btn-gold">${customer ? 'Back to My Orders' : 'Return to Home'}</a>
        </div>
      `;
      return;
    }

    const itemsHtml = (order.lineItems || []).map(li => `
      <div class="order-item-line" style="padding: 1rem 0; border-bottom: 1px solid var(--border-subtle);">
        <div class="order-thumb-wrap" style="width: 75px; height: 75px;">
          <img src="${li.image || 'asset/one.jpg'}" alt="${li.title}" onerror="this.src='asset/one.jpg'" />
        </div>
        <div class="order-item-info">
          <h4 class="order-item-title" style="font-size: 1rem;">${li.title}</h4>
          <div class="order-item-variant">${li.variantTitle || li.selectedVariant || 'Botanical Soy Wax'}</div>
          <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">
            ${formatINR(li.price)} × ${li.quantity || 1}
          </div>
        </div>
        <div class="order-item-pricing" style="font-size: 1.05rem;">
          ${formatINR(li.price * (li.quantity || 1))}
        </div>
      </div>
    `).join('');

    const addr = order.shippingAddress || (customer ? customer.defaultAddress : null) || {
      name: 'Valued Client',
      address1: '—',
      city: '—',
      province: '—',
      zip: '',
      country: 'India',
      phone: ''
    };

    const finStatus = String(order.financialStatus || 'PENDING').toUpperCase();
    const isPaid = (finStatus === 'PAID');
    const isCodPending = (finStatus === 'PENDING_COD' || finStatus === 'COD_OTP_PENDING');
    const finStatusColor = isPaid ? '#166534' : (isCodPending ? '#9A6B00' : '#888888');
    const finStatusLabel = isPaid ? 'PAID' : (isCodPending ? 'CASH ON DELIVERY (CONFIRMED)' : finStatus);

    const hasAwb = Boolean(order.tracking?.trackingNumber);
    const courierText = order.tracking?.courier || (hasAwb ? 'Shiprocket Express Partner' : 'Awaiting Courier Allocation');
    const trackingNumText = order.tracking?.trackingNumber || 'Assigned upon dispatch';
    const estDeliveryText = order.tracking?.estimatedDelivery || (hasAwb ? '3–5 Business Days' : 'Calculated upon courier pickup');

    wrap.innerHTML = `
      <div style="background: #FDFBF7; border: 1px solid var(--border-gold, #D4AF37); border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 2rem; display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 1.4rem;">🕯️</span>
        <div>
          <strong style="color: var(--cabernet); font-size: 0.95rem;">Thank you for your order!</strong>
          <p style="margin: 2px 0 0; font-size: 0.84rem; color: var(--text-muted);">Your order confirmation and tracking details are summarized below.</p>
        </div>
      </div>

      <div class="account-header-bar">
        <div>
          <div class="account-breadcrumb">
            <a href="index.html">Home</a>
            <span>/</span>
            ${customer ? '<a href="orders.html">Orders</a><span>/</span>' : ''}
            <span>${order.orderNumber || order.name}</span>
          </div>
          <h1 style="font-family: var(--font-serif); font-size: 2.2rem; color: var(--cabernet); margin: 0 0 0.4rem;">
            Order ${order.orderNumber || order.name}
          </h1>
          <div style="font-size: 0.86rem; color: var(--text-muted);">
            Placed on ${formatDate(order.processedAt || order.createdAt)} • Payment Status: <strong style="color: ${finStatusColor};">${finStatusLabel}</strong>
          </div>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
          ${renderStatusBadge(order.fulfillmentStatus || order.status)}
          <a href="tracking.html?order=${encodeURIComponent(order.orderNumber || order.name)}" class="btn btn-gold" style="padding: 0.65rem 1.25rem; font-size: 0.74rem;">
            Track Shipment
          </a>
        </div>
      </div>

      <div class="order-details-grid">
        <!-- Left: Items & Pricing -->
        <div>
          <div class="details-panel">
            <h3 class="details-panel-title">Items in Order</h3>
            <div style="display: flex; flex-direction: column;">
              ${itemsHtml}
            </div>
          </div>

          <div class="details-panel">
            <h3 class="details-panel-title">Payment Summary</h3>
            <div class="price-summary-row">
              <span>Subtotal</span>
              <span>${formatINR(order.subtotalPrice || order.totalPrice)}</span>
            </div>
            ${order.discountAmount ? `
              <div class="price-summary-row" style="color: #166534;">
                <span>Discount (${order.discountLabel || 'Applied'})</span>
                <span>-${formatINR(order.discountAmount)}</span>
              </div>
            ` : ''}
            <div class="price-summary-row">
              <span>Standard Express Delivery</span>
              <span style="color: #166534; font-weight: 600;">FREE (Orders &gt; ₹999)</span>
            </div>
            <div class="price-summary-row">
              <span>Estimated Taxes (GST Included)</span>
              <span>${formatINR(order.totalTax || 0)}</span>
            </div>
            <div class="price-summary-row total-row">
              <span>Total ${isPaid ? 'Paid' : 'Payable on Delivery'}</span>
              <span>${formatINR(order.totalPrice)}</span>
            </div>
          </div>
        </div>

        <!-- Right: Shipping & Logistics Info -->
        <div>
          <div class="details-panel">
            <h3 class="details-panel-title">Delivery Address</h3>
            <strong style="font-size: 0.95rem; color: var(--cabernet); display: block; margin-bottom: 0.35rem;">
              ${addr.name || (addr.firstName ? addr.firstName + ' ' + (addr.lastName || '') : 'Delivery Recipient')}
            </strong>
            <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.6; margin: 0 0 1rem;">
              ${addr.address1 || addr.address || ''}${addr.address2 ? ', ' + addr.address2 : ''}<br />
              ${addr.city || ''}, ${addr.province || addr.state || ''} – ${addr.zip || addr.pincode || ''}<br />
              ${addr.country || 'India'}<br />
              Phone: ${addr.phone || '—'}
            </p>
          </div>

          <div class="details-panel">
            <h3 class="details-panel-title">Logistics &amp; Courier</h3>
            <div style="font-size: 0.85rem; line-height: 1.6; color: var(--text-muted);">
              <div>Courier Partner: <strong style="color: var(--cabernet);">${courierText}</strong></div>
              <div style="margin-top: 4px;">Waybill / AWB: <strong style="color: var(--cabernet);">${trackingNumText}</strong></div>
              <div style="margin-top: 4px;">Estimated Arrival: <strong style="color: var(--cabernet);">${estDeliveryText}</strong></div>
            </div>
            <a href="tracking.html?order=${encodeURIComponent(order.orderNumber || order.name)}" class="btn btn-outline dark-outline btn-block" style="margin-top: 1.25rem; font-size: 0.72rem; padding: 0.7rem 1rem;">
              View Live Tracking Timeline →
            </a>
          </div>

          <div class="details-panel" style="background: var(--bg-cream, #FFFDF8);">
            <h4 style="font-family: var(--font-serif); font-size: 1.15rem; color: var(--cabernet); margin: 0 0 0.4rem;">Concierge Care &amp; Support</h4>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin: 0 0 1rem; line-height: 1.5;">
              Our concierge team is at your disposal for questions regarding your delivery, custom gifting, or olfactory guidance.
            </p>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.82rem;">
              <a href="https://wa.me/919762831995" target="_blank" rel="noopener" style="color: #166534; font-weight: 600;">✦ WhatsApp Concierge: +91 9762831995</a>
              <a href="mailto:support@thecandlorre.com" style="color: var(--cabernet); font-weight: 600;">✦ Email: support@thecandlorre.com</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // -----------------------------------------------------------
  // 4. SAVED ADDRESSES PAGE (addresses.html)
  // -----------------------------------------------------------
  async function initAddressesPage() {
    const grid = document.getElementById('addressesGrid');
    if (!grid) return;

    let customer = await window.ShopifyService.requireAuth('addresses.html');
    if (!customer) return;

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

    // Purge legacy sample address if present so user types their own
    if (Array.isArray(customer.addresses)) {
      const filtered = customer.addresses.filter(a => !isSampleAddress(a));
      if (filtered.length !== customer.addresses.length || isSampleAddress(customer.defaultAddress)) {
        customer.addresses = filtered;
        if (isSampleAddress(customer.defaultAddress)) {
          customer.defaultAddress = filtered[0] || null;
        }
        try {
          ['theCandlorre_cust_profile', 'Candlorre_customer', 'theCandlorre_customer'].forEach(k => {
            localStorage.setItem(k, JSON.stringify(customer));
            sessionStorage.setItem(k, JSON.stringify(customer));
          });
        } catch (e) {}
      }
    }

    // Listen to address changes from other tabs or actions
    window.addEventListener('Candlorre:addressChange', (e) => {
      if (e.detail?.customer) {
        customer = e.detail.customer;
        renderAddressList();
      }
    });

    // Helper: Toast display wrapper
    function notify(msg, type = 'success') {
      if (typeof window.showToast === 'function') {
        window.showToast(msg, type);
      } else {
        const t = document.getElementById('toastNotice');
        if (t) {
          t.textContent = msg;
          t.className = 'toast-notice visible ' + type;
          setTimeout(() => { t.className = 'toast-notice'; }, 4000);
        }
      }
    }

    // Helper: Match Indian State names returned by geocoder to select options
    function matchIndianState(rawState) {
      if (!rawState) return '';
      const select = document.getElementById('addrProvince');
      if (!select) return '';
      const clean = String(rawState).toLowerCase().replace(/[^a-z0-9]/g, '');

      // Common aliases
      if (clean.includes('delhi')) return 'Delhi';
      if (clean.includes('orissa')) return 'Odisha';
      if (clean.includes('pondicherry')) return 'Puducherry';
      if (clean.includes('uttaranchal')) return 'Uttarakhand';
      if (clean.includes('daman') || clean.includes('diu') || clean.includes('dadra')) {
        return 'Dadra and Nagar Haveli and Daman and Diu';
      }

      for (let i = 0; i < select.options.length; i++) {
        const opt = select.options[i];
        if (!opt.value) continue;
        const optClean = opt.value.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (clean === optClean || clean.includes(optClean) || optClean.includes(clean)) {
          return opt.value;
        }
      }
      return '';
    }

    // ---------------------------------------------------------
    // Render Address List
    // ---------------------------------------------------------
    function renderAddressList() {
      const addrs = (customer.addresses || []).filter(a => !isSampleAddress(a));
      if (addrs.length === 0) {
        grid.innerHTML = `
          <div class="account-empty-state" style="grid-column: 1 / -1; padding: 4rem 1.5rem;">
            <svg class="empty-state-icon" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path d="M12 21s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 7.2c0 7.3-8 11.8-8 11.8z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <h3 class="empty-state-title">No Delivery Addresses Saved</h3>
            <p class="empty-state-desc">You currently have no saved addresses. Add a shipping address for rapid express checkout on your favorite botanical scents.</p>
            <button type="button" class="btn btn-gold" id="emptyAddBtn" style="margin-top: 0.5rem; padding: 0.75rem 1.8rem;">
              + Add New Address
            </button>
          </div>
        `;
        document.getElementById('emptyAddBtn')?.addEventListener('click', () => openAddressModal());
        return;
      }

      grid.innerHTML = addrs.map(a => {
        const isDef = Boolean(a.isDefault || customer.defaultAddress?.id === a.id);
        const tag = (a.tag || 'HOME').toUpperCase();
        const tagLabel = tag === 'WORK' ? 'Work' : (tag === 'OTHER' ? 'Other' : 'Home');

        return `
          <div class="address-card ${isDef ? 'is-default' : ''}" data-id="${a.id}" id="card_${a.id}">
            <div>
              <div class="address-card-header">
                <div class="address-badges-group">
                  <span class="address-tag">${tagLabel}</span>
                  ${isDef ? `<span class="address-tag tag-default">★ Default Delivery</span>` : ''}
                </div>

                ${!isDef ? `
                  <button type="button" class="btn-card-action btn-set-default set-default-btn" data-id="${a.id}">
                    Set as Default
                  </button>
                ` : ''}
              </div>

              <h4 class="address-recipient">${a.firstName} ${a.lastName || ''}</h4>

              <div class="address-phone-row">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span>+91 ${a.phone ? a.phone.replace('+91', '').trim() : '—'}</span>
              </div>

              <div class="address-lines">
                ${a.address1}${a.address2 ? ', ' + a.address2 : ''}<br />
                ${a.city}, ${a.province || ''} – ${a.zip || ''}<br />
                ${a.country || 'India'}
              </div>
            </div>

            <div class="address-card-actions">
              <div class="card-action-links">
                <button type="button" class="btn-card-action edit-addr-btn" data-id="${a.id}">
                  Edit
                </button>
                <span style="color: var(--border-subtle);">|</span>
                <button type="button" class="btn-card-action text-danger delete-addr-btn" data-id="${a.id}">
                  Delete
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Wire set default buttons
      grid.querySelectorAll('.set-default-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          btn.disabled = true;
          btn.textContent = 'Updating...';
          try {
            customer = await window.ShopifyService.setDefaultAddress(id);
            renderAddressList();
            notify('Default delivery address updated.', 'success');
          } catch (err) {
            notify(err.message || 'Could not update default address.', 'error');
            renderAddressList();
          }
        });
      });

      // Wire edit buttons
      grid.querySelectorAll('.edit-addr-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const addr = (customer.addresses || []).find(a => a.id === id);
          if (addr) openAddressModal(addr);
        });
      });

      // Wire delete buttons (opens custom confirmation modal)
      grid.querySelectorAll('.delete-addr-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const addr = (customer.addresses || []).find(a => a.id === id);
          if (addr) openDeleteModal(addr);
        });
      });
    }

    renderAddressList();

    // ---------------------------------------------------------
    // Add / Edit Modal Controls
    // ---------------------------------------------------------
    const modalOverlay = document.getElementById('addressModalOverlay');
    const modalForm = document.getElementById('addressForm');
    const modalTitle = document.getElementById('addressModalTitle');
    const saveSubmitBtn = document.getElementById('saveAddressSubmitBtn');
    let editingId = null;

    // Inputs
    const fullNameInput = document.getElementById('addrFullName');
    const phoneInput = document.getElementById('addrPhone');
    const line1Input = document.getElementById('addrLine1');
    const line2Input = document.getElementById('addrLine2');
    const cityInput = document.getElementById('addrCity');
    const provinceSelect = document.getElementById('addrProvince');
    const zipInput = document.getElementById('addrZip');
    const defaultCheckbox = document.getElementById('addrDefaultCheck');

    // Feedback containers
    const locationFeedbackAlert = document.getElementById('locationFeedbackAlert');
    const pincodeServiceBadge = document.getElementById('pincodeServiceBadge');

    function clearValidationErrors() {
      document.querySelectorAll('.field-error-msg').forEach(el => el.classList.remove('visible'));
      document.querySelectorAll('.form-input, .form-select, .phone-prefix-wrap').forEach(el => el.classList.remove('is-invalid'));
      if (locationFeedbackAlert) {
        locationFeedbackAlert.style.display = 'none';
        locationFeedbackAlert.className = 'location-feedback-alert';
        locationFeedbackAlert.textContent = '';
      }
      if (pincodeServiceBadge) {
        pincodeServiceBadge.style.display = 'none';
        pincodeServiceBadge.className = 'pincode-service-badge';
        pincodeServiceBadge.textContent = '';
      }
    }

    function setAddressTypeChip(tag) {
      const normalized = (tag || 'HOME').toUpperCase();
      ['HOME', 'WORK', 'OTHER'].forEach(t => {
        const chip = document.getElementById(`typeChip${t.charAt(0) + t.slice(1).toLowerCase()}`);
        if (chip) {
          const radio = chip.querySelector('input[type="radio"]');
          if (t === normalized) {
            chip.classList.add('selected');
            if (radio) radio.checked = true;
          } else {
            chip.classList.remove('selected');
            if (radio) radio.checked = false;
          }
        }
      });
    }

    // Wire Address Type Chips
    ['Home', 'Work', 'Other'].forEach(name => {
      const chip = document.getElementById(`typeChip${name}`);
      chip?.addEventListener('click', () => {
        setAddressTypeChip(name.toUpperCase());
      });
    });

    // Clean Phone input: allow numbers only, max 10 digits
    phoneInput?.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
      document.getElementById('errAddrPhone')?.classList.remove('visible');
      document.getElementById('phonePrefixWrap')?.classList.remove('is-invalid');
    });

    // Clean PIN code input: allow numbers only, max 6 digits
    zipInput?.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
      document.getElementById('errAddrZip')?.classList.remove('visible');
      zipInput.classList.remove('is-invalid');
      if (pincodeServiceBadge) pincodeServiceBadge.style.display = 'none';
    });

    function openAddressModal(addr = null) {
      if (!modalOverlay || !modalForm) return;
      clearValidationErrors();
      editingId = addr ? addr.id : null;

      if (modalTitle) {
        modalTitle.textContent = addr ? 'Edit Delivery Address' : 'Add New Delivery Address';
      }
      if (saveSubmitBtn) {
        saveSubmitBtn.textContent = addr ? 'Save Changes' : 'Save Address';
      }

      if (addr) {
        const combinedName = `${addr.firstName || ''} ${addr.lastName || ''}`.trim();
        if (fullNameInput) fullNameInput.value = combinedName;
        if (phoneInput) phoneInput.value = (addr.phone || '').replace('+91', '').replace(/\s+/g, '').slice(-10);
        if (line1Input) line1Input.value = addr.address1 || '';
        if (line2Input) line2Input.value = addr.address2 || '';
        if (cityInput) cityInput.value = addr.city || '';
        if (provinceSelect) provinceSelect.value = matchIndianState(addr.province) || '';
        if (zipInput) zipInput.value = (addr.zip || '').slice(0, 6);
        setAddressTypeChip(addr.tag || 'HOME');
        if (defaultCheckbox) {
          defaultCheckbox.checked = Boolean(addr.isDefault || customer.defaultAddress?.id === addr.id);
        }
      } else {
        modalForm.reset();
        if (fullNameInput) fullNameInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (line1Input) line1Input.value = '';
        if (line2Input) line2Input.value = '';
        if (cityInput) cityInput.value = '';
        if (provinceSelect) provinceSelect.value = '';
        if (zipInput) zipInput.value = '';
        setAddressTypeChip('HOME');
        if (defaultCheckbox) {
          // If no saved addresses exist, first address will be default
          defaultCheckbox.checked = (!customer.addresses || customer.addresses.length === 0);
        }
      }

      const modalBody = document.getElementById('addressModalBody') || modalForm.querySelector('.modal-body');
      if (modalBody) {
        modalBody.scrollTop = 0;
      }

      modalOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      fullNameInput?.focus();
    }

    function closeAddressModal() {
      if (!modalOverlay) return;
      modalOverlay.classList.remove('active');
      document.body.style.overflow = '';
      clearValidationErrors();
      editingId = null;
    }

    document.getElementById('addNewAddressBtn')?.addEventListener('click', () => openAddressModal());
    document.getElementById('closeAddressModalBtn')?.addEventListener('click', closeAddressModal);
    document.getElementById('cancelAddressModalBtn')?.addEventListener('click', closeAddressModal);

    modalOverlay?.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeAddressModal();
    });

    // ---------------------------------------------------------
    // "Use Current Location" Geolocation & Reverse Geocoding
    // ---------------------------------------------------------
    const useLocationBtn = document.getElementById('useCurrentLocationBtn');
    const useLocationBtnText = document.getElementById('useLocationBtnText');

    useLocationBtn?.addEventListener('click', () => {
      if (!navigator.geolocation) {
        showLocationAlert('Geolocation is not supported by your browser. Please enter your address manually.', 'warning');
        return;
      }

      clearValidationErrors();
      useLocationBtn.disabled = true;
      if (useLocationBtnText) {
        useLocationBtnText.innerHTML = `
          <svg class="spin-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
          </svg>
          Detecting Location...
        `;
      }
      showLocationAlert('Requesting GPS coordinates from your device...', 'info');

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          showLocationAlert('GPS acquired. Resolving address details with reverse geocoding...', 'info');

          try {
            const resp = await fetch(`/api/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
            const jsonResp = await resp.json();

            if (!resp.ok || !jsonResp.success) {
              throw new Error(jsonResp.error || jsonResp.message || 'Reverse geocoding unavailable.');
            }

            const addr = jsonResp.data || jsonResp;

            // Autofill fields
            if (line1Input && addr.address1) {
              line1Input.value = addr.address1;
              line1Input.classList.remove('is-invalid');
              document.getElementById('errAddrLine1')?.classList.remove('visible');
            }
            if (line2Input && addr.address2) {
              line2Input.value = addr.address2;
            }
            if (cityInput && addr.city) {
              cityInput.value = addr.city;
              cityInput.classList.remove('is-invalid');
              document.getElementById('errAddrCity')?.classList.remove('visible');
            }
            if (provinceSelect && addr.state) {
              const matchedState = matchIndianState(addr.state);
              if (matchedState) {
                provinceSelect.value = matchedState;
                provinceSelect.classList.remove('is-invalid');
                document.getElementById('errAddrProvince')?.classList.remove('visible');
              }
            }
            if (zipInput && addr.pincode && /^[1-9][0-9]{5}$/.test(addr.pincode)) {
              zipInput.value = addr.pincode;
              zipInput.classList.remove('is-invalid');
              document.getElementById('errAddrZip')?.classList.remove('visible');
            }

            showLocationAlert('✓ Location detected successfully. Please review and verify your address details before saving.', 'success');

            // Trigger PIN code serviceability check if PIN was filled
            if (addr.pincode && /^[1-9][0-9]{5}$/.test(addr.pincode)) {
              checkPincodeService(addr.pincode);
            }
          } catch (fetchErr) {
            console.warn('Reverse geocoding error:', fetchErr);
            showLocationAlert("We couldn't determine your exact street address. Please enter it manually.", 'warning');
          } finally {
            resetLocationBtn();
          }
        },
        (geoErr) => {
          resetLocationBtn();
          if (geoErr.code === geoErr.PERMISSION_DENIED) {
            showLocationAlert('Location access was denied. Please allow location permissions in your browser or enter your address manually.', 'warning');
          } else if (geoErr.code === geoErr.TIMEOUT) {
            showLocationAlert('Location request timed out. Please try again or enter your address manually.', 'warning');
          } else if (geoErr.code === geoErr.POSITION_UNAVAILABLE) {
            showLocationAlert('GPS location is currently unavailable on your device. Please enter your address manually.', 'warning');
          } else {
            showLocationAlert("We couldn't determine your address automatically. Please enter it manually.", 'warning');
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
      );
    });

    function showLocationAlert(message, type = 'info') {
      if (!locationFeedbackAlert) return;
      locationFeedbackAlert.className = `location-feedback-alert ${type}`;
      locationFeedbackAlert.textContent = message;
      locationFeedbackAlert.style.display = 'flex';
    }

    function resetLocationBtn() {
      if (!useLocationBtn) return;
      useLocationBtn.disabled = false;
      if (useLocationBtnText) {
        useLocationBtnText.textContent = 'Use Current Location';
      }
    }

    // ---------------------------------------------------------
    // PIN Code Availability Checker
    // ---------------------------------------------------------
    const checkPincodeBtn = document.getElementById('checkPincodeBtn');

    async function checkPincodeService(pin) {
      if (!pincodeServiceBadge) return;
      const errZip = document.getElementById('errAddrZip');

      if (!/^[1-9][0-9]{5}$/.test(pin)) {
        if (errZip) {
          errZip.textContent = 'Please enter a valid 6-digit Indian PIN code.';
          errZip.classList.add('visible');
        }
        zipInput?.classList.add('is-invalid');
        pincodeServiceBadge.style.display = 'none';
        return;
      }

      errZip?.classList.remove('visible');
      zipInput?.classList.remove('is-invalid');

      if (checkPincodeBtn) {
        checkPincodeBtn.disabled = true;
        checkPincodeBtn.textContent = 'Checking...';
      }

      try {
        const resp = await fetch(`/api/check-pincode?pincode=${encodeURIComponent(pin)}`);
        const res = await resp.json();

        if (resp.ok && res.serviceable) {
          pincodeServiceBadge.className = 'pincode-service-badge success';
          pincodeServiceBadge.innerHTML = `
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>Express Delivery Available (${res.estimatedDays || '2–4 Business Days'} • COD &amp; Prepaid via Bluedart)</span>
          `;
          pincodeServiceBadge.style.display = 'flex';
        } else {
          pincodeServiceBadge.className = 'pincode-service-badge error';
          pincodeServiceBadge.innerHTML = `
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span>${res.message || 'Delivery temporarily unserviceable to this PIN code.'}</span>
          `;
          pincodeServiceBadge.style.display = 'flex';
        }
      } catch (e) {
        pincodeServiceBadge.className = 'pincode-service-badge success';
        pincodeServiceBadge.innerHTML = `
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>Standard Express Delivery Available (Pan-India)</span>
        `;
        pincodeServiceBadge.style.display = 'flex';
      } finally {
        if (checkPincodeBtn) {
          checkPincodeBtn.disabled = false;
          checkPincodeBtn.textContent = 'Check';
        }
      }
    }

    checkPincodeBtn?.addEventListener('click', () => {
      const pin = (zipInput?.value || '').trim();
      checkPincodeService(pin);
    });

    // ---------------------------------------------------------
    // Form Submission & Validation
    // ---------------------------------------------------------
    modalForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearValidationErrors();

      const fullName = (fullNameInput?.value || '').trim();
      const phoneRaw = (phoneInput?.value || '').trim();
      const line1 = (line1Input?.value || '').trim();
      const line2 = (line2Input?.value || '').trim();
      const city = (cityInput?.value || '').trim();
      const province = (provinceSelect?.value || '').trim();
      const zip = (zipInput?.value || '').trim();
      const selectedRadio = modalForm.querySelector('input[name="addressTag"]:checked');
      const tag = selectedRadio ? selectedRadio.value : 'HOME';
      const isDefault = Boolean(defaultCheckbox?.checked);

      let hasError = false;

      // 1. Full Name
      if (!fullName) {
        document.getElementById('errAddrFullName')?.classList.add('visible');
        fullNameInput?.classList.add('is-invalid');
        hasError = true;
      }

      // 2. Mobile Phone: 10 digits
      if (!/^[6-9]\d{9}$/.test(phoneRaw)) {
        document.getElementById('errAddrPhone')?.classList.add('visible');
        document.getElementById('phonePrefixWrap')?.classList.add('is-invalid');
        hasError = true;
      }

      // 3. Address Line 1
      if (!line1) {
        document.getElementById('errAddrLine1')?.classList.add('visible');
        line1Input?.classList.add('is-invalid');
        hasError = true;
      }

      // 4. City
      if (!city) {
        document.getElementById('errAddrCity')?.classList.add('visible');
        cityInput?.classList.add('is-invalid');
        hasError = true;
      }

      // 5. Province / State
      if (!province) {
        document.getElementById('errAddrProvince')?.classList.add('visible');
        provinceSelect?.classList.add('is-invalid');
        hasError = true;
      }

      // 6. PIN Code: 6 digits
      if (!/^[1-9][0-9]{5}$/.test(zip)) {
        const errZip = document.getElementById('errAddrZip');
        if (errZip) {
          errZip.textContent = 'Please enter a valid 6-digit PIN code.';
          errZip.classList.add('visible');
        }
        zipInput?.classList.add('is-invalid');
        hasError = true;
      }

      if (hasError) {
        const firstInvalid = modalForm.querySelector('.is-invalid, .field-error-msg.visible');
        firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // Separate first name and last name
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || 'Client';
      const lastName = nameParts.slice(1).join(' ') || '';

      const payload = {
        firstName,
        lastName,
        phone: '+91' + phoneRaw,
        address1: line1,
        address2: line2,
        city,
        province,
        zip,
        country: 'India',
        tag,
        isDefault
      };

      if (saveSubmitBtn) {
        saveSubmitBtn.disabled = true;
        saveSubmitBtn.classList.add('is-loading');
        saveSubmitBtn.textContent = editingId ? 'Updating Address...' : 'Saving Address...';
      }

      try {
        if (editingId) {
          customer = await window.ShopifyService.updateAddress(editingId, payload);
          notify('Address updated successfully.', 'success');
        } else {
          customer = await window.ShopifyService.addAddress(payload);
          notify('Address saved successfully.', 'success');
        }

        closeAddressModal();
        renderAddressList();
      } catch (err) {
        notify(err.message || 'Could not save address. Please check details.', 'error');
      } finally {
        if (saveSubmitBtn) {
          saveSubmitBtn.disabled = false;
          saveSubmitBtn.classList.remove('is-loading');
          saveSubmitBtn.textContent = editingId ? 'Save Changes' : 'Save Address';
        }
      }
    });

    // ---------------------------------------------------------
    // Delete Confirmation Modal
    // ---------------------------------------------------------
    const deleteOverlay = document.getElementById('deleteConfirmOverlay');
    const deletePreview = document.getElementById('deleteAddressPreview');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const closeDeleteBtn = document.getElementById('closeDeleteModalBtn');
    let pendingDeleteId = null;

    function openDeleteModal(addr) {
      if (!deleteOverlay) return;
      pendingDeleteId = addr.id;

      if (deletePreview) {
        deletePreview.innerHTML = `
          <strong style="color: var(--cabernet); display: block; margin-bottom: 2px;">
            ${addr.firstName} ${addr.lastName || ''}
          </strong>
          <span style="color: var(--text-muted);">
            ${addr.address1}${addr.address2 ? ', ' + addr.address2 : ''}, ${addr.city}, ${addr.province || ''} – ${addr.zip || ''}
          </span>
        `;
      }

      deleteOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      confirmDeleteBtn?.focus();
    }

    function closeDeleteModal() {
      if (!deleteOverlay) return;
      deleteOverlay.classList.remove('active');
      document.body.style.overflow = '';
      pendingDeleteId = null;
    }

    cancelDeleteBtn?.addEventListener('click', closeDeleteModal);
    closeDeleteBtn?.addEventListener('click', closeDeleteModal);
    deleteOverlay?.addEventListener('click', (e) => {
      if (e.target === deleteOverlay) closeDeleteModal();
    });

    confirmDeleteBtn?.addEventListener('click', async () => {
      if (!pendingDeleteId) return;
      confirmDeleteBtn.disabled = true;
      confirmDeleteBtn.textContent = 'Deleting...';

      try {
        customer = await window.ShopifyService.deleteAddress(pendingDeleteId);
        closeDeleteModal();
        renderAddressList();
        notify('Address deleted successfully.', 'info');
      } catch (err) {
        notify(err.message || 'Could not delete address.', 'error');
      } finally {
        if (confirmDeleteBtn) {
          confirmDeleteBtn.disabled = false;
          confirmDeleteBtn.textContent = 'Delete Address';
        }
      }
    });

    // Global ESC Key handler for modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (deleteOverlay?.classList.contains('active')) {
          closeDeleteModal();
        } else if (modalOverlay?.classList.contains('active')) {
          closeAddressModal();
        }
      }
    });

    // Auto-open modal if URL query has ?action=new or ?new=1
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'new' || urlParams.get('new') === '1') {
      setTimeout(() => {
        openAddressModal();
      }, 150);
    }
  }

  // -----------------------------------------------------------
  // 5. EDIT PROFILE PAGE (edit-profile.html)
  // -----------------------------------------------------------
  async function initProfilePage() {
    const form = document.getElementById('editProfileForm');
    if (!form) return;

    const customer = await window.ShopifyService.requireAuth('edit-profile.html');
    if (!customer) return;

    const fNameInput = document.getElementById('profileFirstName');
    const lNameInput = document.getElementById('profileLastName');
    const emailInput = document.getElementById('profileEmail');
    const phoneInput = document.getElementById('profilePhone');
    const bannerContainer = document.getElementById('profileAlertContainer');

    if (fNameInput) fNameInput.value = customer.firstName || '';
    if (lNameInput) lNameInput.value = customer.lastName || '';
    if (emailInput) emailInput.value = customer.email || '';
    if (phoneInput) phoneInput.value = customer.phone || '';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.classList.add('is-loading');
        submitBtn.disabled = true;
      }

      if (bannerContainer) bannerContainer.innerHTML = '';

      try {
        await window.ShopifyService.updateProfile({
          firstName: fNameInput.value.trim(),
          lastName: lNameInput.value.trim(),
          phone: phoneInput.value.trim()
        });

        if (bannerContainer) {
          bannerContainer.innerHTML = `
            <div class="auth-alert-banner alert-success">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Your profile information has been updated successfully.</span>
            </div>
          `;
        }
      } catch (err) {
        if (bannerContainer) {
          bannerContainer.innerHTML = `
            <div class="auth-alert-banner alert-error">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <span>${err.message || 'Failed to update profile.'}</span>
            </div>
          `;
        }
      } finally {
        if (submitBtn) {
          submitBtn.classList.remove('is-loading');
          submitBtn.disabled = false;
        }
      }
    });
  }

  // -----------------------------------------------------------
  // 6. ORDER TRACKING PAGE (tracking.html)
  // -----------------------------------------------------------
  async function initTrackingPage() {
    const form = document.getElementById('trackingSearchForm');
    const input = document.getElementById('trackingInput');
    const resultWrap = document.getElementById('trackingResultContainer');
    if (!form || !input || !resultWrap) return;

    // Check query param (e.g. tracking.html?order=12345)
    const urlParams = new URLSearchParams(window.location.search);
    const orderQuery = urlParams.get('order') || urlParams.get('tracking') || urlParams.get('waybill');
    if (orderQuery) {
      input.value = orderQuery;
      doTrack(orderQuery);
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input.value.trim();
      if (val) doTrack(val);
    });

    document.querySelectorAll('.sample-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const val = chip.getAttribute('data-value') || chip.textContent.replace('#', '').trim();
        input.value = val;
        doTrack(val);
      });
    });

    async function doTrack(query) {
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.classList.add('is-loading');
        submitBtn.disabled = true;
      }

      resultWrap.innerHTML = `
        <div style="text-align: center; padding: 3rem 0; color: var(--text-muted);">
          <div class="btn is-loading" style="background:none; border:none; color:var(--maroon-light); font-size:1rem;">Retrieving logistics timeline...</div>
        </div>
      `;

      try {
        const res = await window.ShopifyService.trackShipment(query);

        if (!res || !res.found) {
          resultWrap.innerHTML = `
            <div class="account-empty-state">
              <svg class="empty-state-icon" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <h3 class="empty-state-title">No Shipment Found</h3>
              <p class="empty-state-desc">We couldn't locate active dispatch records for <strong>"${query}"</strong>. Please verify your Order ID or Courier Waybill Number.</p>
              <p style="font-size:0.82rem; color:var(--text-muted); margin-top:0.5rem;">
                Need help? Email concierge at <a href="mailto:support@theCandlorre.com" style="color:var(--maroon-light);">support@theCandlorre.com</a>
              </p>
            </div>
          `;
          return;
        }

        const hasAwb = Boolean(res.trackingNumber);
        const courierPartnerText = res.courier || (hasAwb ? 'Shiprocket Express Courier' : 'Awaiting Courier Allocation');
        const waybillCodeText = res.trackingNumber || 'Pending Courier Dispatch';
        const estDeliveryText = res.estimatedDelivery || (hasAwb ? '3–5 Business Days' : 'Calculated upon courier pickup');

        const timelineHtml = Array.isArray(res.timeline) && res.timeline.length > 0 ? res.timeline.map(step => {
          const isComp = step.completed || step.activity;
          const isAct = step.active;
          const statusClass = isComp ? 'completed' : (isAct ? 'active' : '');
          const nodeIcon = isComp ? '✓' : (isAct ? '●' : '○');
          const stepTitle = step.step || step.activity || step.status || 'Status Update';
          const stepDesc = step.description || step.location || '';
          const stepTime = step.date || step.time || '';

          return `
            <div class="timeline-step-item ${statusClass}">
              <div class="timeline-node-icon">${nodeIcon}</div>
              <h4 class="timeline-step-title">${stepTitle}</h4>
              <p class="timeline-step-desc">${stepDesc}</p>
              ${stepTime ? `<span class="timeline-step-time">${stepTime}</span>` : ''}
            </div>
          `;
        }).join('') : `
          <div style="padding: 2rem 1.5rem; text-align: center; background: #FAF9F6; border-radius: 8px; color: var(--text-muted); font-size: 0.86rem; border: 1px dashed var(--border-subtle);">
            <p style="margin: 0 0 0.4rem; font-weight: 600; color: var(--cabernet); font-size: 0.95rem;">Tracking details will be updated once your order is dispatched.</p>
            <p style="margin: 0; font-size: 0.82rem; line-height: 1.5;">Your artisan candle order has been received by our studio workshop. Real-time courier scans will populate here as soon as the waybill is picked up.</p>
          </div>
        `;

        resultWrap.innerHTML = `
          <div class="tracking-result-card">
            <div class="shipment-overview-header">
              <div>
                <span class="section-pretitle">Shipment Registry</span>
                <h3 style="font-family: var(--font-serif); font-size: 1.8rem; color: var(--cabernet); margin: 0 0 0.3rem;">
                  Order ${res.orderNumber || query}
                </h3>
                <div style="font-size: 0.85rem; color: var(--text-muted);">
                  Courier Partner: <strong style="color: var(--cabernet);">${courierPartnerText}</strong> • Waybill: <strong style="color: var(--cabernet);">${waybillCodeText}</strong>
                </div>
              </div>
              <div>
                ${renderStatusBadge(res.status || 'Order Placed')}
              </div>
            </div>

            <div class="shipment-meta-grid">
              <div class="meta-item">
                <label>Estimated Arrival</label>
                <span>${estDeliveryText}</span>
              </div>
              <div class="meta-item">
                <label>Destination Hub</label>
                <span>${res.destination || 'India'}</span>
              </div>
              <div class="meta-item">
                <label>Logistics Mode</label>
                <span>Air Express Cargo</span>
              </div>
            </div>

            <div class="tracking-timeline">
              ${timelineHtml}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border-top: 1px solid var(--border-subtle); padding-top: 1.5rem;">
              <div style="font-size: 0.84rem; color: var(--text-muted);">
                Delivery requires secure recipient verification.
              </div>
              <a href="order-details.html?id=${encodeURIComponent(res.orderNumber || query)}" class="btn btn-outline dark-outline" style="padding: 0.65rem 1.25rem; font-size: 0.74rem;">
                View Complete Order Details →
              </a>
            </div>
          </div>
        `;
      } catch (e) {
        resultWrap.innerHTML = `
          <div class="account-empty-state">
            <h3 class="empty-state-title">Tracking Temporarily Unavailable</h3>
            <p class="empty-state-desc">${e.message || 'Please check your connection and try again.'}</p>
          </div>
        `;
      } finally {
        if (submitBtn) {
          submitBtn.classList.remove('is-loading');
          submitBtn.disabled = false;
        }
      }
    }
  }

  // Page Routing & Initialization
  document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    initOrdersPage();
    initOrderDetailsPage();
    initAddressesPage();
    initProfilePage();
    initTrackingPage();

    // Mobile Navigation & Drawer Support
    const mobDrawer = document.getElementById('mobileDrawer');
    const drawerOverlay = document.getElementById('drawerOverlay');
    document.getElementById('hamburgerBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.toggleMobileDrawer) {
        window.toggleMobileDrawer(true);
      } else {
        mobDrawer?.classList.add('active');
        drawerOverlay?.classList.add('active');
      }
    });
    document.getElementById('closeMobileNavBtn')?.addEventListener('click', () => {
      if (window.toggleMobileDrawer) {
        window.toggleMobileDrawer(false);
      } else {
        mobDrawer?.classList.remove('active');
        drawerOverlay?.classList.remove('active');
      }
    });
    drawerOverlay?.addEventListener('click', () => {
      if (window.toggleMobileDrawer) {
        window.toggleMobileDrawer(false);
      } else {
        mobDrawer?.classList.remove('active');
        drawerOverlay?.classList.remove('active');
      }
    });
  });

})();
