/* =========================================================
   7. WISHLIST OPERATIONS & SLIDE-OUT SANCTUARY DRAWER
   ========================================================= */
function updateWishlistUI() {
  const count = wishlist.length;
  if (dom.wishlistCount) {
    dom.wishlistCount.textContent = count;
  }
  document.querySelectorAll('.wishlist-counter-badge, #wishlistCount').forEach(badge => {
    badge.textContent = count;
  });

  const subtitle = document.getElementById('wishlistSubtitle');
  if (subtitle) {
    subtitle.textContent = count === 0 
      ? 'Your sanctuary is empty' 
      : `${count} Fragrance${count === 1 ? '' : 's'} Saved`;
  }

  // Sync New Arrival & Catalog card wishlist heart buttons
  document.querySelectorAll('.km-wishlist-toggle').forEach(btn => {
    const card = btn.closest('.km-product-card');
    if (!card) return;
    const pid = parseInt(card.dataset.id, 10);
    const isSaved = wishlist.includes(pid);
    btn.classList.toggle('active', isSaved);
  });
}

function getWishlistCartQty(productId) {
  if (typeof cart === 'undefined' || !Array.isArray(cart)) return 0;
  const items = cart.filter(i => i.id === productId);
  return items.reduce((sum, i) => sum + (i.qty || 0), 0);
}

function addToCartFromWishlist(productId) {
  const product = CANDLE_INVENTORY.find(item => item.id === productId);
  if (!product) return;
  if (product.stock <= 0) {
    if (typeof showToast === 'function') showToast('This candle is currently sold out.');
    return;
  }

  let variant = product.variants?.[0];
  const cartKey = `${productId}:${variant?.id || 'standard'}`;
  const existing = cart.find(item => item.cartKey === cartKey);
  if (existing) {
    if (existing.qty >= product.stock) {
      if (typeof showToast === 'function') showToast('Maximum available quantity reached.');
      return;
    }
    existing.qty += 1;
  } else {
    cart.push({
      ...product,
      qty: 1,
      cartKey,
      selectedVariant: variant?.title || 'Standard',
      price: Number(variant?.price || product.price)
    });
  }

  localStorage.setItem('theCandlorre_cart', JSON.stringify(cart));
  if (typeof updateCartUI === 'function') updateCartUI();
  renderWishlistDrawer();
  if (typeof showToast === 'function') showToast('Added to bag ♡');
}

function updateWishlistCartQty(productId, delta) {
  const product = CANDLE_INVENTORY.find(item => item.id === productId);
  if (!product) return;
  const existing = cart.find(item => item.id === productId);
  if (!existing) {
    if (delta > 0) addToCartFromWishlist(productId);
    return;
  }

  if (delta > 0 && existing.qty >= product.stock) {
    if (typeof showToast === 'function') showToast('Maximum available quantity reached.');
    return;
  }

  existing.qty += delta;
  if (existing.qty <= 0) {
    cart = cart.filter(item => item.id !== productId);
    if (typeof showToast === 'function') showToast('Removed from bag');
  } else {
    if (typeof showToast === 'function') showToast(`Bag quantity: ${existing.qty}`);
  }

  localStorage.setItem('theCandlorre_cart', JSON.stringify(cart));
  if (typeof updateCartUI === 'function') updateCartUI();
  renderWishlistDrawer();
}

function renderWishlistDrawer() {
  const container = document.getElementById('wishlistItemsContainer');
  const footer = document.getElementById('wishlistFooter');
  if (!container) return;

  if (wishlist.length === 0) {
    container.innerHTML = `
      <div class="wishlist-empty-state">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.2">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
        </svg>
        <h4>Your Sanctuary is Empty</h4>
        <p>Save your favorite bespoke candles by tapping the heart icon on any fragrance card.</p>
        <button type="button" class="btn btn-gold" onclick="closeWishlistDrawer(); const target = document.getElementById('new-arrivals') || document.getElementById('rituals') || document.getElementById('catalog'); target?.scrollIntoView({ behavior: 'smooth' });">Explore Fragrances</button>
      </div>
    `;
    if (footer) footer.innerHTML = '';
    return;
  }

  const savedCandles = CANDLE_INVENTORY.filter(p => wishlist.includes(p.id));

  container.innerHTML = savedCandles.map(item => {
    const qtyInBag = getWishlistCartQty(item.id);
    return `
      <div class="wishlist-item-row" data-id="${item.id}">
        <img src="${item.image}" alt="${item.title}" class="wishlist-thumb" onclick="closeWishlistDrawer(); openPDP(${item.id});" style="cursor: pointer;" />
        <div class="wishlist-item-details">
          <span class="wishlist-item-cat">${item.category}</span>
          <h5 class="wishlist-item-title" onclick="closeWishlistDrawer(); openPDP(${item.id});" style="cursor: pointer;">${item.title}</h5>
          <p class="wishlist-item-notes">${item.notes?.top || 'Botanical soy wax'} • ${item.notes?.heart || 'Essential oils'}</p>
          <div class="wishlist-item-price-row">
            <span class="wishlist-item-price">₹${item.price.toLocaleString('en-IN')}</span>
            ${item.origPrice > item.price ? `<span class="wishlist-item-orig">₹${item.origPrice.toLocaleString('en-IN')}</span>` : ''}
          </div>
        </div>
        <div class="wishlist-item-actions">
          ${qtyInBag > 0 ? `
            <div class="wishlist-qty-group">
              <div class="wishlist-qty-controls" role="group" aria-label="Adjust quantity in bag">
                <button type="button" class="wishlist-qty-btn" onclick="updateWishlistCartQty(${item.id}, -1)" aria-label="Decrease quantity" title="Decrease">−</button>
                <span class="wishlist-qty-number" aria-live="polite">${qtyInBag}</span>
                <button type="button" class="wishlist-qty-btn" onclick="updateWishlistCartQty(${item.id}, 1)" aria-label="Increase quantity" title="Increase">+</button>
              </div>
              <span class="wishlist-qty-badge">in Bag</span>
            </div>
          ` : `
            <button type="button" class="btn-wishlist-cart" onclick="addToCartFromWishlist(${item.id});" aria-label="Add ${item.title} to bag">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="display:inline-block; vertical-align: -1px; margin-right: 4px;">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              Add to Bag
            </button>
          `}
          <button type="button" class="btn-wishlist-remove" onclick="toggleWishlist(${item.id});" aria-label="Remove from wishlist" title="Remove">✕</button>
        </div>
      </div>
    `;
  }).join('');

  if (footer) {
    footer.innerHTML = `
      <button type="button" class="btn btn-gold btn-block" onclick="addAllWishlistToCart();">Move All to Bag (${wishlist.length})</button>
      <button type="button" class="btn-clear-wishlist" onclick="clearWishlist();">Clear Wishlist</button>
    `;
  }
}

function openWishlistDrawer() {
  const drawer = document.getElementById('wishlistDrawer');
  const overlay = document.getElementById('drawerOverlay');
  renderWishlistDrawer();
  if (drawer) drawer.classList.add('active');
  if (overlay) overlay.classList.add('active');
}

function closeWishlistDrawer() {
  const drawer = document.getElementById('wishlistDrawer');
  const overlay = document.getElementById('drawerOverlay');
  if (drawer) drawer.classList.remove('active');
  if (overlay) {
    // Only remove overlay if no other drawer/modal is open
    const isCartOpen = document.getElementById('cartDrawer')?.classList.contains('active');
    const isMobileOpen = document.getElementById('mobileDrawer')?.classList.contains('active');
    const isSearchOpen = document.getElementById('searchModal')?.classList.contains('active');
    const isPdpOpen = document.getElementById('pdpModal')?.classList.contains('active');
    if (!isCartOpen && !isMobileOpen && !isSearchOpen && !isPdpOpen) {
      overlay.classList.remove('active');
    }
  }
}

function toggleWishlist(productId) {
  const index = wishlist.indexOf(productId);
  if (index > -1) {
    wishlist.splice(index, 1);
    showToast("Removed from wishlist");
  } else {
    wishlist.push(productId);
    showToast("Saved to wishlist ♡");
  }

  localStorage.setItem('theCandlorre_wishlist', JSON.stringify(wishlist));
  updateWishlistUI();
  if (document.getElementById('wishlistDrawer')?.classList.contains('active')) {
    renderWishlistDrawer();
  }
  if (typeof filterProducts === 'function') {
    filterProducts();
  }
}

function addAllWishlistToCart() {
  if (wishlist.length === 0) return;
  wishlist.forEach(id => {
    addToCartFromWishlist(id);
  });
  renderWishlistDrawer();
  showToast(`Moved ${wishlist.length} saved fragrance${wishlist.length > 1 ? 's' : ''} to bag!`);
}

function clearWishlist() {
  wishlist.length = 0;
  localStorage.setItem('theCandlorre_wishlist', JSON.stringify([]));
  updateWishlistUI();
  renderWishlistDrawer();
  showToast("Wishlist cleared");
}

function showSavedWishlist() {
  openWishlistDrawer();
}

window.openWishlistDrawer = openWishlistDrawer;
window.closeWishlistDrawer = closeWishlistDrawer;
window.toggleWishlist = toggleWishlist;
window.addAllWishlistToCart = addAllWishlistToCart;
window.clearWishlist = clearWishlist;
window.showSavedWishlist = showSavedWishlist;
window.addToCartFromWishlist = addToCartFromWishlist;
window.updateWishlistCartQty = updateWishlistCartQty;
window.renderWishlistDrawer = renderWishlistDrawer;

