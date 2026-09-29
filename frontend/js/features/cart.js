/* =========================================================
   6. CART OPERATIONS & FREE SHIPPING METER
   Multi-Variant Support (Baobab Luxury Cart Experience)
   ========================================================= */

function updateCartUI() {
  const totalCount = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
  const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || 1)), 0);

  if (dom.cartCount) dom.cartCount.textContent = totalCount;
  if (dom.cartItemCountDisplay) dom.cartItemCountDisplay.textContent = totalCount;
  const mobCartCount = document.getElementById('mobCartCount');
  if (mobCartCount) mobCartCount.textContent = totalCount;
  if (dom.cartSubtotalText) dom.cartSubtotalText.textContent = `₹${subtotal.toLocaleString('en-IN')}`;

  // Free shipping progress logic (Threshold: ₹999)
  const freeThreshold = 999;
  if (dom.meterBarFill && dom.shippingMeterText) {
    if (subtotal >= freeThreshold) {
      dom.meterBarFill.style.width = '100%';
      dom.shippingMeterText.textContent = '🎉 You unlocked FREE Express Delivery!';
    } else {
      const percentage = Math.min((subtotal / freeThreshold) * 100, 100);
      dom.meterBarFill.style.width = `${percentage}%`;
      const difference = freeThreshold - subtotal;
      dom.shippingMeterText.textContent = `Add ₹${difference.toLocaleString('en-IN')} more for FREE Express Delivery`;
    }
  }

  // Synchronize wishlist quantities if wishlist drawer is open
  if (typeof renderWishlistDrawer === 'function' && document.getElementById('wishlistDrawer')?.classList.contains('active')) {
    renderWishlistDrawer();
  }

  const container = dom.cartItemsContainer || document.getElementById('cartItemsContainer');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
        <p style="font-family: var(--font-serif); font-size: 1.5rem; color: var(--maroon-light); margin-bottom: 0.5rem;">Your Bag is Empty</p>
        <p style="font-size: 0.85rem; margin-bottom: 1.5rem;">Discover hand-poured botanical candles to light up your space.</p>
        <button type="button" class="btn btn-gold" onclick="toggleCartDrawer(false)">Explore Fragrances</button>
      </div>
    `;
    return;
  }

  container.innerHTML = cart.map((item, idx) => {
    const itemKey = item.cartKey || `${item.id}:${item.selectedVariant || 'std'}`;
    const variantLabel = item.selectedVariant && item.selectedVariant !== 'Standard' 
      ? `<span class="cart-variant-pill">${item.selectedVariant}</span>` 
      : '';

    return `
      <div class="cart-item-row" data-cart-key="${itemKey}">
        <img src="${item.image || 'asset/one.jpg'}" alt="${item.title}" onerror="this.onerror=null; this.src='asset/one.jpg';" />
        <div class="cart-item-info">
          <div class="cart-item-header-row">
            <h5>${item.title}</h5>
            <button type="button" class="cart-remove-btn" aria-label="Remove item" onclick="modifyCartItemQty('${itemKey}', -9999)">✕</button>
          </div>
          <div class="cart-item-meta">
            ${variantLabel}
            <span class="cart-item-price">₹${((item.price || 0) * (item.qty || 1)).toLocaleString('en-IN')}</span>
          </div>
          <div class="cart-item-bottom-row">
            <div class="qty-controls">
              <button type="button" aria-label="Decrease quantity" onclick="modifyCartItemQty('${itemKey}', -1)">−</button>
              <span>${item.qty}</span>
              <button type="button" aria-label="Increase quantity" onclick="modifyCartItemQty('${itemKey}', 1)">+</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Add a product/variant to the cart.
 * @param {number|string} productId
 * @param {string} [variantId]
 */
function addToCart(productId, variantId) {
  const numId = typeof productId === 'string' && !isNaN(Number(productId)) ? Number(productId) : productId;
  const product = CANDLE_INVENTORY.find(item => item.id === numId || item.id === productId);
  if (!product) return;

  if (product.isComingSoon) {
    if (typeof showToast === 'function') showToast('This candle is coming soon!');
    return;
  }

  const variants = Array.isArray(product.variants) ? product.variants : [];
  let variant = null;

  if (variantId) {
    variant = variants.find(v => v.id === variantId || v.title?.toLowerCase() === String(variantId).toLowerCase());
  }
  if (!variant && activePdpProductId === product.id && window.activePdpVariantId) {
    variant = variants.find(v => v.id === window.activePdpVariantId);
  }
  if (!variant && variants.length > 0) {
    variant = variants[0];
  }

  if (variant && variant.isComingSoon) {
    if (typeof showToast === 'function') showToast('This variant is coming soon!');
    return;
  }

  const selectedTitle = variant ? variant.title : 'Standard';
  const selectedPrice = variant ? Number(variant.price) : Number(product.price);
  const selectedImage = variant?.image || product.image || 'asset/one.jpg';
  const cartKey = `${product.id}:${variant?.id || 'standard'}`;

  const existing = cart.find(item => item.cartKey === cartKey || (item.id === product.id && item.selectedVariant === selectedTitle));

  if (existing) {
    const maxStock = variant?.stock || product.stock || 20;
    if (existing.qty >= maxStock) {
      if (typeof showToast === 'function') showToast('Maximum available stock reached.');
      return;
    }
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      handle: product.handle || '',
      title: product.title,
      category: product.category,
      price: selectedPrice,
      origPrice: variant?.origPrice || product.origPrice || selectedPrice,
      image: selectedImage,
      selectedVariant: selectedTitle,
      cartKey: cartKey,
      qty: 1
    });
  }

  localStorage.setItem('theCandlorre_cart', JSON.stringify(cart));
  updateCartUI();
  toggleCartDrawer(true);
  if (typeof showToast === 'function') {
    showToast(`Added ${product.title} (${selectedTitle}) to shopping bag!`);
  }

  if (window.CandlorreAnalytics && typeof window.CandlorreAnalytics.trackAddToCart === 'function') {
    window.CandlorreAnalytics.trackAddToCart(product, 1, selectedTitle);
  }
}

/**
 * Helper for card button clicks with tactile animation
 */
function kmAddToCart(productId, buttonElem, variantId) {
  addToCart(productId, variantId);

  if (buttonElem) {
    buttonElem.classList.add('added-pulse');
    setTimeout(() => {
      buttonElem.classList.remove('added-pulse');
    }, 400);
  }
}

/**
 * Modify quantity using item cartKey or fallback productId.
 */
function modifyCartItemQty(cartKeyOrId, change) {
  const item = cart.find(i => i.cartKey === cartKeyOrId || String(i.id) === String(cartKeyOrId));
  if (!item) return;

  if (change > 0) {
    const product = (window.CANDLE_INVENTORY || []).find(p => p.id === item.id || String(p.id) === String(item.id));
    let maxStock = 50;
    if (product) {
      if (Array.isArray(product.variants) && product.variants.length > 0) {
        const v = product.variants.find(va => va.id === item.selectedVariant || va.title?.toLowerCase() === item.selectedVariant?.toLowerCase());
        if (v && typeof v.stock === 'number') maxStock = v.stock;
        else if (typeof product.stock === 'number') maxStock = product.stock;
      } else if (typeof product.stock === 'number') {
        maxStock = product.stock;
      }
    }
    if (item.qty + change > maxStock) {
      if (typeof showToast === 'function') {
        showToast(`Only ${maxStock} unit${maxStock === 1 ? '' : 's'} available in stock for ${item.title}.`);
      }
      return;
    }
  }

  if (change < 0 && window.CandlorreAnalytics && typeof window.CandlorreAnalytics.trackRemoveFromCart === 'function') {
    window.CandlorreAnalytics.trackRemoveFromCart(item, Math.abs(change));
  } else if (change > 0 && window.CandlorreAnalytics && typeof window.CandlorreAnalytics.trackAddToCart === 'function') {
    window.CandlorreAnalytics.trackAddToCart(item, change, item.selectedVariant);
  }

  item.qty += change;
  if (item.qty <= 0) {
    cart = cart.filter(i => (i.cartKey ? i.cartKey !== item.cartKey : i.id !== item.id));
  }

  localStorage.setItem('theCandlorre_cart', JSON.stringify(cart));
  updateCartUI();
}

function modifyQty(productId, change) {
  modifyCartItemQty(productId, change);
}

function toggleCartDrawer(isOpen) {
  const drawer = dom.cartDrawer || document.getElementById('cartDrawer');
  const overlay = dom.drawerOverlay || document.getElementById('drawerOverlay');
  if (!drawer || !overlay) return;

  drawer.classList.toggle('active', isOpen);
  overlay.classList.toggle('active', isOpen);

  if (isOpen && window.CandlorreAnalytics && typeof window.CandlorreAnalytics.trackViewCart === 'function') {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    window.CandlorreAnalytics.trackViewCart(cart, subtotal);
  }
}

// Global window attachments
window.addToCart = addToCart;
window.kmAddToCart = kmAddToCart;
window.modifyQty = modifyQty;
window.modifyCartItemQty = modifyCartItemQty;
window.toggleCartDrawer = toggleCartDrawer;
window.updateCartUI = updateCartUI;
