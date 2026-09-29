/* =========================================================
   9. CHECKOUT SYSTEM (PREPAID & COD)
   ========================================================= */
async function populateCheckoutSavedAddresses() {
  const container = document.getElementById('checkoutSavedAddressPicker');
  const custName = document.getElementById('custName');
  const custPhone = document.getElementById('custPhone');
  const custAddress = document.getElementById('custAddress');
  const custCity = document.getElementById('custCity');
  const custPincode = document.getElementById('custPincode');
  const form = document.getElementById('checkoutForm');

  if (!form) return;

  // Check if customer is available
  if (!window.ShopifyService) return;
  try {
    const customer = await window.ShopifyService.getCustomer();
    if (!customer || !customer.addresses || customer.addresses.length === 0) {
      if (container) container.remove();
      return;
    }

    let picker = document.getElementById('checkoutSavedAddressPicker');
    if (!picker) {
      picker = document.createElement('div');
      picker.id = 'checkoutSavedAddressPicker';
      picker.className = 'form-group checkout-address-selector-wrap';
      picker.style.marginBottom = '1.25rem';
      picker.style.padding = '0.75rem 1rem';
      picker.style.background = 'var(--cream-card, #FFFDF8)';
      picker.style.border = '1px solid var(--border-gold, rgba(197, 160, 89, 0.4))';
      picker.style.borderRadius = '8px';

      const label = document.createElement('label');
      label.textContent = 'Deliver to Saved Address';
      label.style.display = 'block';
      label.style.fontFamily = 'var(--font-heading, "Playfair Display", serif)';
      label.style.fontSize = '0.9rem';
      label.style.color = 'var(--cabernet, #2B050B)';
      label.style.fontWeight = '600';
      label.style.marginBottom = '0.4rem';

      const select = document.createElement('select');
      select.id = 'checkoutAddressSelect';
      select.className = 'form-select';
      select.style.width = '100%';
      select.style.padding = '0.6rem 0.75rem';
      select.style.fontSize = '0.85rem';
      select.style.background = '#FFFFFF';
      select.style.border = '1px solid var(--border-subtle, #E6DDD4)';
      select.style.borderRadius = '4px';
      select.style.color = 'var(--cabernet, #2B050B)';

      picker.appendChild(label);
      picker.appendChild(select);
      form.insertBefore(picker, form.firstChild);

      select.addEventListener('change', (e) => {
        const selectedId = e.target.value;
        const addr = customer.addresses.find(a => a.id === selectedId);
        if (addr) {
          fillCheckoutFields(addr);
        }
      });
    }

    const select = document.getElementById('checkoutAddressSelect');
    if (select) {
      const defaultAddr = customer.defaultAddress || customer.addresses[0];
      select.innerHTML = customer.addresses.map(a => {
        const isDef = (a.id === defaultAddr?.id);
        const tag = (a.tag || 'Address').toUpperCase();
        return `<option value="${a.id}" ${isDef ? 'selected' : ''}>[${tag}] ${a.firstName} ${a.lastName || ''} – ${a.city}, ${a.zip}${isDef ? ' (Default)' : ''}</option>`;
      }).join('');

      // Auto-fill default address
      if (defaultAddr && (!custName.value || custName.value === '')) {
        fillCheckoutFields(defaultAddr);
      }
    }
  } catch (err) {
    console.warn('Could not populate checkout addresses:', err);
  }

  function fillCheckoutFields(addr) {
    if (custName) custName.value = `${addr.firstName || ''} ${addr.lastName || ''}`.trim();
    if (custPhone) custPhone.value = (addr.phone || '').replace('+91', '').replace(/\s+/g, '').slice(-10);
    if (custAddress) custAddress.value = `${addr.address1 || ''}${addr.address2 ? ', ' + addr.address2 : ''}`.trim();
    if (custCity) custCity.value = addr.city || '';
    if (custPincode) custPincode.value = addr.zip || '';
  }
}

let appliedCouponCode = null;

function renderCheckoutSummary() {
  const summaryList = document.getElementById('checkoutSummaryList');
  const summaryCount = document.getElementById('checkoutSummaryCount');
  const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);

  if (summaryCount) {
    summaryCount.textContent = `${totalCount} ${totalCount === 1 ? 'item' : 'items'}`;
  }

  if (!summaryList) return;

  if (cart.length === 0) {
    summaryList.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">Your shopping bag is empty.</p>`;
    return;
  }

  summaryList.innerHTML = cart.map(item => `
    <div class="checkout-summary-item">
      <img src="${item.image}" alt="${item.title}" />
      <div class="checkout-summary-item-info">
        <p class="checkout-summary-item-name">${item.title}</p>
        <p class="checkout-summary-item-sub">${item.selectedVariant || 'Standard'} × ${item.qty}</p>
      </div>
      <div class="checkout-summary-item-price">₹${(item.price * item.qty).toLocaleString('en-IN')}</div>
    </div>
  `).join('');
}

function calculateCheckoutTotals() {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);

  let discountAmount = 0;
  let discountLabel = '';

  // 1. Check applied coupon code
  if (appliedCouponCode === 'SAVE5') {
    discountAmount = Math.round(subtotal * 0.05);
    discountLabel = 'Discount (SAVE5 – 5%)';
  } else if (appliedCouponCode === 'BUY2') {
    if (totalCount >= 2) {
      discountAmount = Math.round(subtotal * 0.10);
      discountLabel = 'Discount (BUY2 – 10%)';
    } else {
      // Not eligible yet
      discountAmount = 0;
      discountLabel = '';
    }
  }

  // 2. Prepaid promotion discount
  // If payment method is prepaid:
  // If no coupon code is applied, the 5% Prepaid discount applies to the checkout!
  // If a coupon code is applied (e.g. SAVE5 or BUY2), the promotion is reflected.
  let isPrepaidActive = (selectedPaymentMethod === 'prepaid');
  if (isPrepaidActive && !appliedCouponCode) {
    discountAmount = Math.round(subtotal * 0.05);
    discountLabel = 'Prepaid Discount (5%)';
  }

  const shipping = 0; // FREE Delivery on checkout
  const finalTotal = Math.max(0, subtotal - discountAmount + shipping);

  return {
    subtotal,
    discountAmount,
    discountLabel,
    shipping,
    finalTotal,
    totalCount
  };
}

function updateCheckoutUI() {
  renderCheckoutSummary();

  const totals = calculateCheckoutTotals();

  // 1. Subtotal Display
  const subtotalEl = document.getElementById('checkoutBreakdownSubtotal');
  if (subtotalEl) {
    subtotalEl.textContent = `₹${totals.subtotal.toLocaleString('en-IN')}`;
  }

  // 2. Discount Breakdown Row
  const discountRow = document.getElementById('checkoutBreakdownDiscountRow');
  const discountLabelEl = document.getElementById('checkoutBreakdownDiscountLabel');
  const discountValEl = document.getElementById('checkoutBreakdownDiscountVal');

  if (discountRow) {
    if (totals.discountAmount > 0) {
      discountRow.style.display = 'flex';
      if (discountLabelEl) discountLabelEl.textContent = totals.discountLabel;
      if (discountValEl) discountValEl.textContent = `-₹${totals.discountAmount.toLocaleString('en-IN')}`;
    } else {
      discountRow.style.display = 'none';
    }
  }

  // 3. Final Total Displays
  const finalTotalEl = document.getElementById('checkoutFinalTotal');
  if (finalTotalEl) {
    finalTotalEl.textContent = totals.finalTotal.toLocaleString('en-IN');
  }

  if (dom.checkoutAmountTotal) {
    dom.checkoutAmountTotal.textContent = totals.finalTotal.toLocaleString('en-IN');
  }

  // 4. Update Discount Offer Cards Visual State
  const cardSave5 = document.getElementById('discountCardSave5');
  const actionBtnSave5 = document.getElementById('actionBtnSave5');
  const isSave5Applied = (appliedCouponCode === 'SAVE5');
  if (cardSave5) {
    cardSave5.classList.toggle('active-applied', isSave5Applied);
    if (actionBtnSave5) {
      actionBtnSave5.textContent = isSave5Applied ? 'Applied ✓' : 'Apply';
    }
  }

  const cardPrepaid = document.getElementById('discountCardPrepaid');
  const prepaidBadge = document.getElementById('prepaidBadge');
  const isPrepaid = (selectedPaymentMethod === 'prepaid');
  if (cardPrepaid) {
    cardPrepaid.classList.toggle('active-applied', isPrepaid);
    if (prepaidBadge) {
      if (isPrepaid) {
        prepaidBadge.textContent = 'Active';
        prepaidBadge.className = 'discount-status-badge';
      } else {
        prepaidBadge.textContent = 'Prepaid Only';
        prepaidBadge.className = 'discount-status-badge inactive';
      }
    }
  }

  const cardBuy2 = document.getElementById('discountCardBuy2');
  const actionBtnBuy2 = document.getElementById('actionBtnBuy2');
  const isBuy2Applied = (appliedCouponCode === 'BUY2');
  if (cardBuy2) {
    cardBuy2.classList.toggle('active-applied', isBuy2Applied);
    if (actionBtnBuy2) {
      actionBtnBuy2.textContent = isBuy2Applied ? 'Applied ✓' : 'Apply';
    }
  }

  // 5. Promo Input Feedback
  const promoInput = document.getElementById('checkoutPromoInput');
  const promoMsg = document.getElementById('checkoutPromoMsg');
  if (promoMsg) {
    if (appliedCouponCode) {
      if (promoInput) promoInput.value = appliedCouponCode;
      promoMsg.style.display = 'block';
      promoMsg.className = 'checkout-promo-msg success';
      promoMsg.innerHTML = `<span>✓ Code <strong>"${appliedCouponCode}"</strong> applied</span> <button type="button" onclick="removeCheckoutCoupon()" style="background:none;border:none;color:#C62828;text-decoration:underline;cursor:pointer;font-size:0.75rem;margin-left:8px;">Remove</button>`;
    } else {
      if (promoInput && !promoInput.matches(':focus')) {
        promoInput.value = '';
      }
      promoMsg.style.display = 'none';
      promoMsg.textContent = '';
    }
  }
}

function applyCheckoutCoupon(rawCode) {
  const code = (rawCode || '').trim().toUpperCase();
  const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const promoMsg = document.getElementById('checkoutPromoMsg');

  if (!code) {
    if (promoMsg) {
      promoMsg.style.display = 'block';
      promoMsg.className = 'checkout-promo-msg error';
      promoMsg.textContent = 'Please enter a coupon code.';
    }
    return false;
  }

  if (code === 'SAVE5') {
    appliedCouponCode = 'SAVE5';
    showToast('SAVE5 applied: Flat 5% off your first order');
    updateCheckoutUI();
    return true;
  }

  if (code === 'BUY2') {
    if (totalCount < 2) {
      if (promoMsg) {
        promoMsg.style.display = 'block';
        promoMsg.className = 'checkout-promo-msg error';
        promoMsg.textContent = 'BUY2 requires 2 or more items in your shopping bag.';
      }
      showToast('BUY2 requires 2 or more candles in your bag');
      return false;
    }
    appliedCouponCode = 'BUY2';
    showToast('BUY2 applied: 10% off purchase of 2 items');
    updateCheckoutUI();
    return true;
  }

  // Custom or external Shopify code
  if (promoMsg) {
    promoMsg.style.display = 'block';
    promoMsg.className = 'checkout-promo-msg error';
    promoMsg.textContent = `Coupon "${code}" is invalid. Available codes: SAVE5, BUY2.`;
  }
  showToast(`Invalid coupon code "${code}"`);
  return false;
}

function copyAndApplyCoupon(code) {
  // 1. Copy code to clipboard
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => {
      showToast(`${code} copied`);
    }).catch(() => {
      showToast(`${code} copied`);
    });
  } else {
    showToast(`${code} copied`);
  }

  // 2. Toggle / Apply the coupon
  if (appliedCouponCode === code) {
    removeCheckoutCoupon();
  } else {
    applyCheckoutCoupon(code);
  }
}

function removeCheckoutCoupon() {
  appliedCouponCode = null;
  const promoInput = document.getElementById('checkoutPromoInput');
  if (promoInput) promoInput.value = '';
  updateCheckoutUI();
  showToast('Coupon code removed');
}

function initCheckoutDiscounts() {
  // Bind discount card clicks
  document.getElementById('discountCardSave5')?.addEventListener('click', () => {
    copyAndApplyCoupon('SAVE5');
  });

  document.getElementById('discountCardBuy2')?.addEventListener('click', () => {
    copyAndApplyCoupon('BUY2');
  });

  document.getElementById('discountCardPrepaid')?.addEventListener('click', () => {
    setPaymentSelection('prepaid');
    const radio = document.querySelector('input[name="paymentType"][value="prepaid"]');
    if (radio) radio.checked = true;
    showToast('Prepaid payment selected: Extra 5% off applied');
  });

  // Bind promo manual input & apply button
  const applyBtn = document.getElementById('checkoutPromoApplyBtn');
  const promoInput = document.getElementById('checkoutPromoInput');

  applyBtn?.addEventListener('click', () => {
    if (promoInput) applyCheckoutCoupon(promoInput.value);
  });

  promoInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyCheckoutCoupon(promoInput.value);
    }
  });
}

// Attach checkout discount event listeners on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCheckoutDiscounts);
} else {
  initCheckoutDiscounts();
}

function ensureCheckoutFormFields() {
  const form = document.getElementById('checkoutForm');
  if (!form) return;

  // 1. Ensure Email field exists in customer info
  if (!document.getElementById('custEmail')) {
    const custName = document.getElementById('custName');
    const nameGroup = custName ? custName.closest('.form-group') : null;
    if (nameGroup) {
      const emailGroup = document.createElement('div');
      emailGroup.className = 'form-group';
      emailGroup.innerHTML = `
        <label for="custEmail">Email Address (For Invoice &amp; Dispatch Updates)</label>
        <input type="email" id="custEmail" required placeholder="Enter your email address" autocomplete="email" />
      `;
      nameGroup.insertAdjacentElement('afterend', emailGroup);
    }
  }

  // 2. Ensure State field exists in shipping address
  if (!document.getElementById('custState')) {
    const custCity = document.getElementById('custCity');
    const cityGroup = custCity ? custCity.closest('.form-group') : null;
    if (cityGroup) {
      const stateGroup = document.createElement('div');
      stateGroup.className = 'form-group';
      stateGroup.innerHTML = `
        <label for="custState">State</label>
        <select id="custState" required style="width:100%; padding:0.6rem 0.75rem; font-size:0.85rem; border:1px solid var(--border-subtle, #E6DDD4); border-radius:4px; background:#FFF; color:var(--cabernet, #2B050B);">
          <option value="">Select State / UT</option>
          <option value="Delhi">Delhi (NCR)</option>
          <option value="Maharashtra" selected>Maharashtra</option>
          <option value="Karnataka">Karnataka</option>
          <option value="Tamil Nadu">Tamil Nadu</option>
          <option value="Uttar Pradesh">Uttar Pradesh</option>
          <option value="Haryana">Haryana</option>
          <option value="Telangana">Telangana</option>
          <option value="Gujarat">Gujarat</option>
          <option value="West Bengal">West Bengal</option>
          <option value="Rajasthan">Rajasthan</option>
          <option value="Punjab">Punjab</option>
          <option value="Kerala">Kerala</option>
          <option value="Andhra Pradesh">Andhra Pradesh</option>
          <option value="Madhya Pradesh">Madhya Pradesh</option>
          <option value="Goa">Goa</option>
          <option value="Bihar">Bihar</option>
          <option value="Odisha">Odisha</option>
          <option value="Assam">Assam</option>
          <option value="Jharkhand">Jharkhand</option>
          <option value="Chhattisgarh">Chhattisgarh</option>
          <option value="Uttarakhand">Uttarakhand</option>
          <option value="Himachal Pradesh">Himachal Pradesh</option>
          <option value="Jammu and Kashmir">Jammu and Kashmir</option>
          <option value="Chandigarh">Chandigarh</option>
          <option value="Puducherry">Puducherry</option>
        </select>
      `;
      cityGroup.insertAdjacentElement('afterend', stateGroup);
    }
  }

  // 3. Ensure COD Notice Banner exists
  if (!document.getElementById('codNoticeBanner')) {
    const paymentFieldset = form.querySelector('.payment-fieldset');
    if (paymentFieldset) {
      const banner = document.createElement('div');
      banner.id = 'codNoticeBanner';
      banner.style.display = selectedPaymentMethod === 'cod' ? 'block' : 'none';
      banner.style.padding = '0.75rem 1rem';
      banner.style.background = '#FFF9E6';
      banner.style.border = '1px solid #D4AF37';
      banner.style.borderRadius = '6px';
      banner.style.fontSize = '0.84rem';
      banner.style.color = '#7A5300';
      banner.style.marginBottom = '1.25rem';
      banner.style.lineHeight = '1.4';
      banner.innerHTML = '<strong>✦ Cash on Delivery Notice:</strong> OTP verification is required to confirm your COD order upon submission.';
      paymentFieldset.insertAdjacentElement('afterend', banner);
    }
  }

  // 4. Ensure Billing Address Checkbox exists
  if (!document.getElementById('billingSameAsShipping')) {
    const breakdown = document.getElementById('checkoutBreakdown');
    if (breakdown) {
      const billingWrap = document.createElement('div');
      billingWrap.className = 'form-group checkout-billing-toggle';
      billingWrap.style.margin = '1rem 0';
      billingWrap.innerHTML = `
        <label style="display:flex; align-items:center; gap:8px; font-size:0.84rem; cursor:pointer; color:var(--cabernet,#2B050B);">
          <input type="checkbox" id="billingSameAsShipping" checked style="accent-color:var(--cabernet,#2B050B);" />
          <span>Billing address is same as delivery address</span>
        </label>
      `;
      breakdown.insertAdjacentElement('beforebegin', billingWrap);
    }
  }
}

function openCheckout() {
  if (cart.length === 0) {
    showToast("Please add candles to your bag first.");
    return;
  }
  toggleCartDrawer(false);

  ensureCheckoutFormFields();
  updateCheckoutUI();
  populateCheckoutSavedAddresses();

  const totals = calculateCheckoutTotals();
  if (window.CandlorreAnalytics && typeof window.CandlorreAnalytics.trackBeginCheckout === 'function') {
    window.CandlorreAnalytics.trackBeginCheckout(cart, totals.finalTotal, appliedCouponCode);
  }

  dom.checkoutModal?.classList.add('active');
  dom.drawerOverlay?.classList.add('active');
}

function closeCheckout() {
  dom.checkoutModal?.classList.remove('active');
  dom.drawerOverlay?.classList.remove('active');
}

function setPaymentSelection(method) {
  selectedPaymentMethod = method;
  if (dom.labelPrepaid && dom.labelCod) {
    dom.labelPrepaid.classList.toggle('selected', method === 'prepaid');
    dom.labelCod.classList.toggle('selected', method === 'cod');
  }
  const codNotice = document.getElementById('codNoticeBanner');
  if (codNotice) {
    codNotice.style.display = method === 'cod' ? 'block' : 'none';
  }
  updateCheckoutUI();
}

async function createShopifyCheckout(items, discountCodes = []) {
  try {
    const endpoint = `https://${Candlorre_CONFIG.shopifyStoreDomain}/api/${Candlorre_CONFIG.shopifyApiVersion}/graphql.json`;
    const lines = items
      .filter(item => item.shopifyVariantId)
      .map(item => ({ quantity: item.qty, merchandiseId: item.shopifyVariantId }));
    
    if (!lines.length) {
      return null;
    }

    const mutation = `mutation CartCreate($lines: [CartLineInput!], $discountCodes: [String!]) {
      cartCreate(input: {lines: $lines, discountCodes: $discountCodes}) {
        cart {
          checkoutUrl
          cost {
            totalAmount {
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
          message
        }
      }
    }`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': Candlorre_CONFIG.shopifyStorefrontToken
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          lines,
          discountCodes: discountCodes.filter(Boolean)
        }
      })
    });
    const data = await response.json();
    return data?.data?.cartCreate?.cart?.checkoutUrl || null;
  } catch (error) {
    console.error('Shopify checkout error:', error);
    return null;
  }
}

async function loadRazorpaySDK() {
  if (window.Razorpay) return true;
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Dedicated, Secure COD OTP Verification Modal
 * Strictly verifies against backend API. Never stores or logs plaintext OTP.
 */
function openCodOtpModal(orderData, onComplete) {
  let modal = document.getElementById('codOtpModal');
  let overlay = document.getElementById('codOtpOverlay');

  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'codOtpModal';
    modal.className = 'modal cod-otp-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'codOtpTitle');
    modal.style.maxWidth = '460px';
    modal.style.padding = '0';
    modal.style.border = '1px solid rgba(212, 175, 55, 0.4)';
    modal.style.borderRadius = '12px';
    modal.style.boxShadow = '0 24px 60px rgba(43, 5, 11, 0.28)';

    modal.innerHTML = `
      <div style="padding: 2.2rem 2rem; text-align: center; position: relative;">
        <button type="button" class="modal-close-btn" id="closeCodOtpBtn" aria-label="Cancel verification" style="top: 12px; right: 12px;">✕</button>
        
        <div style="width: 54px; height: 54px; margin: 0 auto 1.2rem; background: rgba(212, 175, 55, 0.12); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--cabernet, #2B050B);">
          <svg width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
            <line x1="12" y1="18" x2="12.01" y2="18"></line>
          </svg>
        </div>

        <h3 id="codOtpTitle" style="font-family: var(--font-serif, 'Playfair Display', serif); font-size: 1.6rem; color: var(--cabernet, #2B050B); margin: 0 0 0.4rem;">Verify Mobile Number</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted, #666); margin: 0 0 0.4rem; line-height: 1.5;">
          A 6-digit confirmation code was sent via SMS to confirm your Cash on Delivery order:
        </p>
        <div id="codOtpPhoneDisplay" style="font-weight: 700; font-size: 1.05rem; letter-spacing: 1px; color: var(--cabernet, #2B050B); margin-bottom: 1.5rem;">
          ${orderData.phone || 'Your Mobile Number'}
        </div>

        <div class="otp-inputs-row" style="display: flex; justify-content: center; gap: 8px; margin-bottom: 1.25rem;">
          <input type="text" maxlength="1" class="otp-digit" data-idx="0" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" style="width: 44px; height: 50px; text-align: center; font-size: 1.4rem; font-weight: 700; border: 1.5px solid #D5C8BD; border-radius: 6px; color: var(--cabernet, #2B050B); background: #FAF9F6;" />
          <input type="text" maxlength="1" class="otp-digit" data-idx="1" inputmode="numeric" pattern="[0-9]*" style="width: 44px; height: 50px; text-align: center; font-size: 1.4rem; font-weight: 700; border: 1.5px solid #D5C8BD; border-radius: 6px; color: var(--cabernet, #2B050B); background: #FAF9F6;" />
          <input type="text" maxlength="1" class="otp-digit" data-idx="2" inputmode="numeric" pattern="[0-9]*" style="width: 44px; height: 50px; text-align: center; font-size: 1.4rem; font-weight: 700; border: 1.5px solid #D5C8BD; border-radius: 6px; color: var(--cabernet, #2B050B); background: #FAF9F6;" />
          <input type="text" maxlength="1" class="otp-digit" data-idx="3" inputmode="numeric" pattern="[0-9]*" style="width: 44px; height: 50px; text-align: center; font-size: 1.4rem; font-weight: 700; border: 1.5px solid #D5C8BD; border-radius: 6px; color: var(--cabernet, #2B050B); background: #FAF9F6;" />
          <input type="text" maxlength="1" class="otp-digit" data-idx="4" inputmode="numeric" pattern="[0-9]*" style="width: 44px; height: 50px; text-align: center; font-size: 1.4rem; font-weight: 700; border: 1.5px solid #D5C8BD; border-radius: 6px; color: var(--cabernet, #2B050B); background: #FAF9F6;" />
          <input type="text" maxlength="1" class="otp-digit" data-idx="5" inputmode="numeric" pattern="[0-9]*" style="width: 44px; height: 50px; text-align: center; font-size: 1.4rem; font-weight: 700; border: 1.5px solid #D5C8BD; border-radius: 6px; color: var(--cabernet, #2B050B); background: #FAF9F6;" />
        </div>

        <div id="codOtpFeedback" style="display: none; padding: 0.65rem 0.85rem; border-radius: 6px; font-size: 0.84rem; margin-bottom: 1.25rem;"></div>

        <button type="button" id="codOtpVerifyBtn" class="btn btn-gold btn-block" style="padding: 0.85rem; font-size: 0.82rem; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">
          Verify &amp; Confirm Order
        </button>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.25rem; font-size: 0.82rem;">
          <span id="codOtpTimerText" style="color: var(--text-muted, #777);">Resend code in <strong id="codOtpCountdown">60</strong>s</span>
          <button type="button" id="codOtpResendBtn" disabled style="background: none; border: none; color: var(--gold-primary, #C5A059); font-weight: 600; cursor: pointer; padding: 4px 6px; text-decoration: underline; opacity: 0.5;">
            Resend OTP
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'codOtpOverlay';
    overlay.className = 'drawer-overlay';
    document.body.appendChild(overlay);
  }

  // Update phone display
  const phoneEl = document.getElementById('codOtpPhoneDisplay');
  if (phoneEl) phoneEl.textContent = orderData.phone || 'Your Mobile Number';

  const feedbackEl = document.getElementById('codOtpFeedback');
  if (feedbackEl) {
    feedbackEl.style.display = 'none';
    feedbackEl.textContent = '';
  }

  const inputs = modal.querySelectorAll('.otp-digit');
  inputs.forEach(input => {
    input.value = '';
    input.style.borderColor = '#D5C8BD';
  });

  const verifyBtn = document.getElementById('codOtpVerifyBtn');
  const resendBtn = document.getElementById('codOtpResendBtn');
  const timerText = document.getElementById('codOtpTimerText');
  const countdownSpan = document.getElementById('codOtpCountdown');
  const closeBtn = document.getElementById('closeCodOtpBtn');

  if (verifyBtn) {
    verifyBtn.disabled = false;
    verifyBtn.innerHTML = 'Verify &amp; Confirm Order';
  }

  // Cooldown countdown timer
  let secondsRemaining = 60;
  if (window._codOtpTimerInterval) clearInterval(window._codOtpTimerInterval);

  function updateTimer() {
    if (secondsRemaining > 0) {
      if (countdownSpan) countdownSpan.textContent = String(secondsRemaining);
      if (timerText) timerText.innerHTML = `Resend code in <strong>${secondsRemaining}</strong>s`;
      if (resendBtn) {
        resendBtn.disabled = true;
        resendBtn.style.opacity = '0.5';
        resendBtn.style.cursor = 'not-allowed';
      }
      secondsRemaining--;
    } else {
      clearInterval(window._codOtpTimerInterval);
      if (timerText) timerText.textContent = "Didn't receive code?";
      if (resendBtn) {
        resendBtn.disabled = false;
        resendBtn.style.opacity = '1';
        resendBtn.style.cursor = 'pointer';
      }
    }
  }

  updateTimer();
  window._codOtpTimerInterval = setInterval(updateTimer, 1000);

  // Focus and keyboard events for 6 digit boxes
  inputs.forEach((input, index) => {
    input.oninput = (e) => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val ? val[0] : '';
      if (val && index < 5) {
        inputs[index + 1].focus();
      }
      if (feedbackEl) feedbackEl.style.display = 'none';
    };

    input.onkeydown = (e) => {
      if (e.key === 'Backspace' && !input.value && index > 0) {
        inputs[index - 1].focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        verifyBtn?.click();
      }
    };

    input.onpaste = (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      if (pasteData) {
        for (let i = 0; i < 6; i++) {
          if (inputs[i]) inputs[i].value = pasteData[i] || '';
        }
        if (inputs[Math.min(pasteData.length, 5)]) {
          inputs[Math.min(pasteData.length, 5)].focus();
        }
      }
    };
  });

  // Resend OTP action
  resendBtn.onclick = async () => {
    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending...';

    try {
      const res = await fetch('/api/checkout/cod/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderData.orderId })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        feedbackEl.style.display = 'block';
        feedbackEl.style.background = '#F0FDF4';
        feedbackEl.style.border = '1px solid #86EFAC';
        feedbackEl.style.color = '#166534';
        feedbackEl.textContent = 'A new 6-digit verification code has been dispatched to your mobile.';

        secondsRemaining = 60;
        updateTimer();
        window._codOtpTimerInterval = setInterval(updateTimer, 1000);
        inputs[0].focus();
      } else {
        throw new Error(data.message || data.error || 'Could not resend OTP code.');
      }
    } catch (err) {
      feedbackEl.style.display = 'block';
      feedbackEl.style.background = '#FEF2F2';
      feedbackEl.style.border = '1px solid #FCA5A5';
      feedbackEl.style.color = '#991B1B';
      feedbackEl.textContent = err.message || 'OTP resend failed.';
      resendBtn.disabled = false;
    } finally {
      resendBtn.textContent = 'Resend OTP';
    }
  };

  // Verify OTP action
  verifyBtn.onclick = async () => {
    const enteredCode = Array.from(inputs).map(inp => inp.value).join('').trim();
    if (enteredCode.length !== 6) {
      feedbackEl.style.display = 'block';
      feedbackEl.style.background = '#FEF2F2';
      feedbackEl.style.border = '1px solid #FCA5A5';
      feedbackEl.style.color = '#991B1B';
      feedbackEl.textContent = 'Please enter the complete 6-digit verification code.';
      inputs.forEach(inp => { if (!inp.value) inp.style.borderColor = '#EF4444'; });
      return;
    }

    verifyBtn.disabled = true;
    verifyBtn.innerHTML = 'Verifying Code…';

    try {
      const verifyRes = await fetch('/api/checkout/cod/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderData.orderId, otp: enteredCode })
      });
      const verifyData = await verifyRes.json();

      if (verifyRes.ok && verifyData.success) {
        clearInterval(window._codOtpTimerInterval);
        feedbackEl.style.display = 'block';
        feedbackEl.style.background = '#F0FDF4';
        feedbackEl.style.border = '1px solid #86EFAC';
        feedbackEl.style.color = '#166534';
        feedbackEl.textContent = 'COD order confirmed. Redirecting to your order confirmation…';

        setTimeout(() => {
          modal.classList.remove('active');
          overlay.classList.remove('active');
          if (typeof onComplete === 'function') onComplete(orderData);
        }, 800);
      } else {
        const errorText = verifyData.message || verifyData.error || 'Invalid OTP.';
        const isExpired = errorText.toLowerCase().includes('expired');
        feedbackEl.style.display = 'block';
        feedbackEl.style.background = '#FEF2F2';
        feedbackEl.style.border = '1px solid #FCA5A5';
        feedbackEl.style.color = '#991B1B';
        feedbackEl.textContent = isExpired ? 'OTP expired. Please request a new OTP.' : 'Invalid OTP. Please check the code sent to your phone and try again.';
        inputs.forEach(inp => { inp.style.borderColor = '#EF4444'; });
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = 'Verify &amp; Confirm Order';
        inputs[0].focus();
      }
    } catch (err) {
      feedbackEl.style.display = 'block';
      feedbackEl.style.background = '#FEF2F2';
      feedbackEl.style.border = '1px solid #FCA5A5';
      feedbackEl.style.color = '#991B1B';
      feedbackEl.textContent = err.message || 'Verification connection failed. Please try again.';
      verifyBtn.disabled = false;
      verifyBtn.innerHTML = 'Verify &amp; Confirm Order';
    }
  };

  // Close handlers
  const closeModal = () => {
    clearInterval(window._codOtpTimerInterval);
    modal.classList.remove('active');
    overlay.classList.remove('active');
    showToast('Your order was saved as PENDING. Please verify the code to complete confirmation.');
  };

  closeBtn.onclick = closeModal;
  overlay.onclick = closeModal;

  // Open modal
  modal.classList.add('active');
  overlay.classList.add('active');
  setTimeout(() => inputs[0].focus(), 100);
}

async function processOrder(e) {
  if (e && e.preventDefault) e.preventDefault();

  if (!cart || cart.length === 0) {
    showToast('Your shopping bag is empty. Please add items to proceed.');
    return;
  }

  // Stock inventory pre-check against database catalog
  for (const item of cart) {
    const matched = (window.CANDLE_INVENTORY || []).find(p => p.id === item.id || String(p.id) === String(item.id));
    if (matched) {
      let availableStock = matched.stock;
      if (Array.isArray(matched.variants)) {
        const v = matched.variants.find(va => va.id === item.selectedVariant || va.title?.toLowerCase() === item.selectedVariant?.toLowerCase());
        if (v && typeof v.stock === 'number') availableStock = v.stock;
      }
      if (availableStock <= 0) {
        showToast(`"${item.title}" is currently Out of Stock. Please remove it from your bag to proceed.`);
        return;
      }
      if (item.qty > availableStock) {
        showToast(`Only ${availableStock} units of "${item.title}" available in stock. Please adjust quantity.`);
        return;
      }
    }
  }

  // 1. Gather delivery inputs
  const custName = (document.getElementById('custName')?.value || '').trim();
  const custEmail = (document.getElementById('custEmail')?.value || '').trim();
  const custPhone = (document.getElementById('custPhone')?.value || '').replace(/\D/g, '').slice(-10);
  const custAddress = (document.getElementById('custAddress')?.value || '').trim();
  const custCity = (document.getElementById('custCity')?.value || '').trim();
  const custPincode = (document.getElementById('custPincode')?.value || '').trim();
  const custState = (document.getElementById('custState')?.value || '').trim() || 'Maharashtra';
  const billingSame = document.getElementById('billingSameAsShipping')?.checked ?? true;

  if (!custName) {
    showToast('Please enter your full name for delivery.');
    document.getElementById('custName')?.focus();
    return;
  }
  if (custEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(custEmail)) {
    showToast('Please enter a valid email address.');
    document.getElementById('custEmail')?.focus();
    return;
  }
  if (!custPhone || custPhone.length !== 10) {
    showToast('Please enter a valid 10-digit Indian mobile number.');
    document.getElementById('custPhone')?.focus();
    return;
  }
  if (!custAddress) {
    showToast('Please enter your complete street address.');
    document.getElementById('custAddress')?.focus();
    return;
  }
  if (!custCity) {
    showToast('Please enter your city.');
    document.getElementById('custCity')?.focus();
    return;
  }
  if (!custPincode || !/^[1-9][0-9]{5}$/.test(custPincode)) {
    showToast('Please enter a valid 6-digit Indian PIN code.');
    document.getElementById('custPincode')?.focus();
    return;
  }

  const shippingAddress = {
    name: custName,
    email: custEmail,
    phone: custPhone,
    address: custAddress,
    city: custCity,
    pincode: custPincode,
    state: custState,
    country: 'India',
    billingSameAsShipping: billingSame
  };

  const totals = calculateCheckoutTotals();
  const activeCodes = appliedCouponCode ? [appliedCouponCode] : [];

  const submitBtn = document.getElementById('placeOrderBtn');
  const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Confirm Order';

  const setLoading = (loading, text) => {
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.innerHTML = loading ? `<span>${text || 'Processing...'}</span>` : originalBtnText;
    }
  };

  // 2. Track begin checkout analytics
  if (window.CandlorreAnalytics && typeof window.CandlorreAnalytics.trackBeginCheckout === 'function') {
    window.CandlorreAnalytics.trackBeginCheckout(cart, totals.finalTotal, appliedCouponCode);
  }

  // 3. Native Payment Execution (Prepaid Razorpay or Cash on Delivery)
  try {
    setLoading(true, selectedPaymentMethod === 'prepaid' ? 'Opening Secure Payment Gateway…' : 'Submitting Order Request…');

    if (selectedPaymentMethod === 'prepaid') {
      await loadRazorpaySDK();

      let razorpayData = null;
      try {
        const rpRes = await fetch('/api/checkout/razorpay-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: cart, couponCode: appliedCouponCode })
        });
        const rpJson = await rpRes.json();
        const rpData = (rpJson && rpJson.data) ? rpJson.data : rpJson;
        if (rpJson && (rpJson.success || rpData?.keyId)) {
          razorpayData = rpData;
        } else {
          throw new Error(rpJson.message || rpJson.error || 'Payment gateway could not initialize session.');
        }
      } catch (rpErr) {
        setLoading(false);
        showToast(rpErr.message || 'Online payment initialization failed. Please choose Cash on Delivery.');
        return;
      }

      const activeKeyId = razorpayData?.keyId || Candlorre_CONFIG?.razorpayKeyId;
      if (window.Razorpay && razorpayData && activeKeyId) {
        const rzpOptions = {
          key: activeKeyId,
          amount: razorpayData.amount,
          currency: razorpayData.currency || 'INR',
          name: 'The Candlorre',
          description: 'Artisan Botanical Candles Order',
          image: 'asset/logo.png',
          order_id: (razorpayData.orderId && !razorpayData.orderId.startsWith('order_rp_')) ? razorpayData.orderId : undefined,
          prefill: {
            name: custName,
            contact: custPhone,
            email: custEmail || (window.ShopifyService && typeof window.ShopifyService.getCustomerProfile === 'function' ? window.ShopifyService.getCustomerProfile()?.email : '') || ''
          },
          theme: {
            color: '#2B050B'
          },
          handler: async function (response) {
            setLoading(true, 'Verifying Payment with Gateway…');
            if (!response.razorpay_payment_id || !response.razorpay_signature) {
              setLoading(false);
              showToast('Payment verification details incomplete. Please contact support.');
              return;
            }

            await finalizeOrderSubmission({
              items: cart,
              shippingAddress,
              paymentMethod: 'prepaid',
              couponCode: appliedCouponCode,
              paymentDetails: {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id || razorpayData.orderId,
                razorpay_signature: response.razorpay_signature
              }
            });
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
              showToast('Payment window closed. You can retry whenever ready.');
            }
          }
        };

        const rzp = new window.Razorpay(rzpOptions);
        rzp.on('payment.failed', function (resp) {
          setLoading(false);
          showToast('Payment Failed: ' + (resp.error?.description || 'Transaction could not be completed. You can retry safely.'));
        });
        rzp.open();
        return;
      } else {
        setLoading(false);
        showToast('Online payment gateway unavailable. Please choose Cash on Delivery.');
        return;
      }
    }

    // COD Submission: Submit to backend and launch OTP modal
    await finalizeOrderSubmission({
      items: cart,
      shippingAddress,
      paymentMethod: selectedPaymentMethod,
      couponCode: appliedCouponCode,
      paymentDetails: { method: 'COD' }
    });

  } catch (err) {
    setLoading(false);
    console.error('Order placement error:', err);
    showToast(err.message || 'Could not place order. Please check your connection and try again.');
  }

  async function finalizeOrderSubmission(payload) {
    try {
      const response = await fetch('/api/checkout/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(window.ShopifyService?.token ? { 'Authorization': `Bearer ${window.ShopifyService.token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'Failed to place order.');
      }

      const resData = result.data || result;
      const orderNumber = resData.orderNumber || 'TC2026';

      // COD Flow: Launch verification modal
      if (resData.requiresOtp) {
        setLoading(false);
        closeCheckout();

        openCodOtpModal(resData, (confirmedData) => {
          // Clear cart on confirmed OTP
          cart = [];
          if (typeof saveCart === 'function') saveCart();
          if (typeof updateCartUI === 'function') updateCartUI();

          showToast(`🎉 COD Order Confirmed! Order #${orderNumber}`);
          setTimeout(() => {
            window.location.href = `order-details.html?id=${encodeURIComponent(orderNumber)}`;
          }, 800);
        });
        return;
      }

      // Prepaid Flow: Confirmed by verified signature
      const confirmedOrder = resData.order || resData;
      if (window.CandlorreAnalytics && typeof window.CandlorreAnalytics.trackPurchase === 'function') {
        window.CandlorreAnalytics.trackPurchase(confirmedOrder);
      }

      // Clear Shopping Bag
      cart = [];
      if (typeof saveCart === 'function') saveCart();
      if (typeof updateCartUI === 'function') updateCartUI();

      closeCheckout();
      showToast(`🎉 Payment Verified! Order #${orderNumber} placed successfully.`);

      setTimeout(() => {
        window.location.href = `order-details.html?id=${encodeURIComponent(orderNumber)}`;
      }, 1000);

    } catch (finalErr) {
      setLoading(false);
      showToast(finalErr.message || 'An error occurred during order confirmation.');
    }
  }
}

// Expose handlers globally for inline attributes or external callers
window.copyAndApplyCoupon = copyAndApplyCoupon;
window.applyCheckoutCoupon = applyCheckoutCoupon;
window.removeCheckoutCoupon = removeCheckoutCoupon;
window.setPaymentSelection = setPaymentSelection;
window.updateCheckoutUI = updateCheckoutUI;
window.processOrder = processOrder;
window.openCodOtpModal = openCodOtpModal;
