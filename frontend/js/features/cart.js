/* =========================================================
   6. CART OPERATIONS & FREE SHIPPING METER
   Multi-Variant Support (Baobab Luxury Cart Experience)
   ========================================================= */

/**
 * Accurately resolve inventory stock for a cart item
 * @param {Object} item 
 * @returns {{stock: number, isOutOfStock: boolean, isLowStock: boolean, isComingSoon: boolean}}
 */
function getCartItemInventory(item) {
  const inventory = (typeof CANDLE_INVENTORY !== 'undefined' && Array.isArray(CANDLE_INVENTORY))
    ? CANDLE_INVENTORY 
    : (window.CANDLE_INVENTORY || []);

  const numId = typeof item.id === 'string' && !isNaN(Number(item.id)) ? Number(item.id) : item.id;
  const product = inventory.find(p => p.id === numId || String(p.id) === String(item.id) || p.handle === item.handle);

  if (!product) {
    return { stock: 20, isOutOfStock: false, isLowStock: false, isComingSoon: false };
  }

  if (product.isComingSoon) {
    return { stock: 0, isOutOfStock: true, isLowStock: false, isComingSoon: true };
  }

  // Check variant inventory if multi-variant
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    let variant = null;
    if (item.cartKey && item.cartKey.includes(':')) {
      const parts = item.cartKey.split(':');
      if (parts[1] && parts[1] !== 'standard') {
        variant = product.variants.find(v => v.id === parts[1] || String(v.id) === String(parts[1]));
      }
    }
    if (!variant && item.selectedVariant) {
      variant = product.variants.find(v => 
        v.id === item.selectedVariant || 
        v.title?.toLowerCase() === item.selectedVariant?.toLowerCase()
      );
    }
    if (variant) {
      if (variant.isComingSoon) {
        return { stock: 0, isOutOfStock: true, isLowStock: false, isComingSoon: true };
      }
      const vStock = typeof variant.stock === 'number' ? variant.stock : (variant.available === false ? 0 : 20);
      const isOOS = variant.available === false || variant.isOutOfStock || vStock <= 0;
      return {
        stock: isOOS ? 0 : vStock,
        isOutOfStock: isOOS,
        isLowStock: !isOOS && vStock < 10,
        isComingSoon: false
      };
    }
  }

  const pStock = typeof product.stock === 'number' ? product.stock : (product.available === false ? 0 : 20);
  const isOOS = product.available === false || product.isOutOfStock || pStock <= 0;
  return {
    stock: isOOS ? 0 : pStock,
    isOutOfStock: isOOS,
    isLowStock: !isOOS && pStock < 10,
    isComingSoon: false
  };
}

function updateCartUI() {
  // Ensure no items exceed physical available stock
  let cartMutated = false;
  cart.forEach(item => {
    const inv = getCartItemInventory(item);
    if (inv.stock > 0 && item.qty > inv.stock) {
      item.qty = inv.stock;
      cartMutated = true;
    }
  });
  if (cartMutated) {
    localStorage.setItem('theCandlorre_cart', JSON.stringify(cart));
  }

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

    const inv = getCartItemInventory(item);
    const isAtMaxStock = inv.stock > 0 && item.qty >= inv.stock;

    let stockNoticeHtml = '';
    if (inv.isComingSoon) {
      stockNoticeHtml = `<span class="cart-item-stock-tag stock-soon">⏳ Coming Soon</span>`;
    } else if (inv.isOutOfStock || inv.stock <= 0) {
      stockNoticeHtml = `<span class="cart-item-stock-tag stock-oos">⚠️ Out of Stock (0 Left)</span>`;
    } else if (inv.isLowStock) {
      stockNoticeHtml = `<span class="cart-item-stock-tag stock-urgent">🔥 Only ${inv.stock} left in stock</span>`;
    } else {
      stockNoticeHtml = `<span class="cart-item-stock-tag stock-plenty">✓ ${inv.stock} left in stock</span>`;
    }

    return `
      <div class="cart-item-row ${inv.isOutOfStock ? 'cart-item-oos-row' : ''}" data-cart-key="${itemKey}">
        <img src="${item.image || 'asset/one.jpg'}" alt="${item.title}" onerror="this.onerror=null; this.src='asset/one.jpg';" />
        <div class="cart-item-info">
          <div class="cart-item-header-row">
            <h5>${item.title}</h5>
            <button type="button" class="cart-remove-btn" aria-label="Remove item" onclick="modifyCartItemQty('${itemKey}', -9999)" title="Remove item">✕</button>
          </div>
          <div class="cart-item-meta">
            ${variantLabel}
            <span class="cart-item-price">₹${((item.price || 0) * (item.qty || 1)).toLocaleString('en-IN')}</span>
          </div>
          
          <div class="cart-item-stock-row">
            ${stockNoticeHtml}
            ${isAtMaxStock ? `<span class="cart-max-reached-note">Max in Bag</span>` : ''}
          </div>

          <div class="cart-item-bottom-row">
            <div class="qty-controls">
              <button type="button" aria-label="Decrease quantity" onclick="modifyCartItemQty('${itemKey}', -1)">−</button>
              <span class="cart-qty-value">${item.qty}</span>
              <button 
                type="button" 
                aria-label="Increase quantity" 
                ${isAtMaxStock || inv.stock <= 0 ? 'disabled class="disabled"' : ''} 
                title="${isAtMaxStock ? `Cannot add more than ${inv.stock} (all available stock is in your bag)` : 'Increase quantity'}"
                onclick="modifyCartItemQty('${itemKey}', 1)"
              >+</button>
            </div>
            <div class="cart-item-unit-rate">
              ₹${Number(item.price || 0).toLocaleString('en-IN')} each
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
 * @param {number} [quantity=1]
 */
function addToCart(productId, variantId, quantity = 1) {
  const numId = typeof productId === 'string' && !isNaN(Number(productId)) ? Number(productId) : productId;
  const product = (typeof CANDLE_INVENTORY !== 'undefined' ? CANDLE_INVENTORY : (window.CANDLE_INVENTORY || []))
    .find(item => item.id === numId || item.id === productId);
  
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

  const availableStock = variant 
    ? (typeof variant.stock === 'number' ? variant.stock : (variant.available === false ? 0 : (typeof product.stock === 'number' ? product.stock : 20)))
    : (typeof product.stock === 'number' ? product.stock : (product.available === false ? 0 : 20));

  if (availableStock <= 0 || product.isOutOfStock || (variant && (variant.isOutOfStock || variant.available === false))) {
    if (typeof showToast === 'function') showToast('Sorry, this candle is currently out of stock.');
    return;
  }

  const selectedTitle = variant ? variant.title : 'Standard';
  const selectedPrice = variant ? Number(variant.price) : Number(product.price);
  const selectedImage = variant?.image || product.image || 'asset/one.jpg';
  const cartKey = `${product.id}:${variant?.id || 'standard'}`;

  const existing = cart.find(item => item.cartKey === cartKey || (item.id === product.id && item.selectedVariant === selectedTitle));

  const addQty = Math.max(1, Number(quantity) || 1);

  if (existing) {
    if (existing.qty >= availableStock) {
      if (typeof showToast === 'function') {
        showToast(`Cannot add more! You already have all ${availableStock} available item${availableStock > 1 ? 's' : ''} in your bag.`);
      }
      toggleCartDrawer(true);
      return;
    }

    if (existing.qty + addQty > availableStock) {
      const allowedAdd = availableStock - existing.qty;
      existing.qty = availableStock;
      if (typeof showToast === 'function') {
        showToast(`Added ${allowedAdd} more. Maximum available stock (${availableStock}) reached in your bag.`);
      }
    } else {
      existing.qty += addQty;
      if (typeof showToast === 'function') {
        showToast(`Added ${product.title} (${selectedTitle}) to shopping bag!`);
      }
    }
  } else {
    const finalQty = Math.min(addQty, availableStock);
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
      qty: finalQty
    });
    if (typeof showToast === 'function') {
      showToast(`Added ${product.title} (${selectedTitle}) to shopping bag!`);
    }
  }

  localStorage.setItem('theCandlorre_cart', JSON.stringify(cart));
  updateCartUI();
  toggleCartDrawer(true);

  if (window.CandlorreAnalytics && typeof window.CandlorreAnalytics.trackAddToCart === 'function') {
    window.CandlorreAnalytics.trackAddToCart(product, addQty, selectedTitle);
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
 * Modify quantity using item cartKey or fallback productId with hard inventory boundary.
 */
function modifyCartItemQty(cartKeyOrId, change) {
  const item = cart.find(i => i.cartKey === cartKeyOrId || String(i.id) === String(cartKeyOrId));
  if (!item) return;

  const inv = getCartItemInventory(item);
  const maxStock = inv.stock;

  if (change > 0) {
    if (maxStock <= 0) {
      if (typeof showToast === 'function') {
        showToast(`Sorry, ${item.title} is currently out of stock.`);
      }
      return;
    }

    if (item.qty >= maxStock) {
      if (typeof showToast === 'function') {
        showToast(`Cannot add more than ${maxStock} in the bag. Only ${maxStock} left in stock.`);
      }
      return;
    }

    if (item.qty + change > maxStock) {
      item.qty = maxStock;
      if (typeof showToast === 'function') {
        showToast(`Maximum stock reached. Only ${maxStock} item${maxStock > 1 ? 's' : ''} left in stock.`);
      }
      localStorage.setItem('theCandlorre_cart', JSON.stringify(cart));
      updateCartUI();
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
window.getCartItemInventory = getCartItemInventory;
window.addToCart = addToCart;
window.kmAddToCart = kmAddToCart;
window.modifyQty = modifyQty;
window.modifyCartItemQty = modifyCartItemQty;
window.toggleCartDrawer = toggleCartDrawer;
window.updateCartUI = updateCartUI;

