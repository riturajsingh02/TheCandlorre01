/* =========================================================
   11. EVENT LISTENERS & INITIALIZATION
   ========================================================= */
function setupEventListeners() {
    
// --- NEW: PLP Sidebar & Sorting Listeners ---
  
  // Listen to Sidebar Checkboxes
  document.querySelectorAll('.type-filter, .price-filter').forEach(cb => {
    cb.addEventListener('change', filterProducts);
  });

  // Listen to Sort Dropdown
  document.getElementById('sortSelect')?.addEventListener('change', filterProducts);

  // Listen to Visual Circular Categories
  document.querySelectorAll('.visual-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetCat = btn.getAttribute('data-cat');
      
      // Uncheck all type checkboxes first
      document.querySelectorAll('.type-filter').forEach(cb => cb.checked = false);
      
      // Check the one that matches the circle clicked
      const targetCheckbox = document.querySelector(`.type-filter[value="${targetCat}"]`);
      if (targetCheckbox) {
        targetCheckbox.checked = true;
      }
      
      // Scroll smoothly to the product grid
      document.getElementById('catalog').scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Trigger the filter
      filterProducts();
    });
  });

  // Filter accordion toggle (+ / - logic)
  document.querySelectorAll('.filter-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const options = toggle.nextElementSibling;
      const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
      
      toggle.setAttribute('aria-expanded', !isExpanded);
      toggle.querySelector('span').textContent = isExpanded ? '+' : '−';
      options.style.display = isExpanded ? 'none' : 'flex';
    });
  });

  // Mobile Hamburger Drawer Toggle
  function toggleMobileDrawer(isOpen) {
    if (window.toggleMobileDrawer && window.toggleMobileDrawer !== toggleMobileDrawer) {
      window.toggleMobileDrawer(isOpen);
      return;
    }
    const shouldOpen = (typeof isOpen === 'boolean') ? isOpen : !dom.mobileDrawer?.classList.contains('active');
    if (dom.mobileDrawer) dom.mobileDrawer.classList.toggle('active', shouldOpen);
    if (dom.drawerOverlay) dom.drawerOverlay.classList.toggle('active', shouldOpen);
    document.body.classList.toggle('drawer-open', shouldOpen);
  }
  window.toggleMobileDrawer = toggleMobileDrawer;

  dom.hamburgerBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMobileDrawer(true);
  });

  dom.closeMobileNavBtn?.addEventListener('click', () => {
    toggleMobileDrawer(false);
  });

  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      toggleMobileDrawer(false);
    });
  });

  // Category tab filtering
  dom.categoryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      dom.categoryTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      activeCategory = tab.dataset.category || 'all';
      filterProducts();
    });
  });

  // Search input and trigger
  dom.searchInput?.addEventListener('input', filterProducts);
  
  // Search Modal Trigger & Handlers
  dom.searchTrigger?.addEventListener('click', (e) => {
    e.preventDefault();
    openSearchModal();
  });
  dom.closeSearchBtn?.addEventListener('click', closeSearchModal);
  dom.searchClearBtn?.addEventListener('click', () => {
    if (dom.headerSearchInput) dom.headerSearchInput.value = '';
    if (dom.searchClearBtn) dom.searchClearBtn.hidden = true;
    renderLiveSearchResults('');
    dom.headerSearchInput?.focus();
  });
  dom.headerSearchInput?.addEventListener('input', (e) => {
    const val = e.target.value;
    if (dom.searchClearBtn) dom.searchClearBtn.hidden = !val;
    renderLiveSearchResults(val);
  });
  document.querySelectorAll('.search-tag').forEach(tagBtn => {
    tagBtn.addEventListener('click', () => {
      const tag = tagBtn.dataset.tag || tagBtn.textContent.trim();
      if (dom.headerSearchInput) dom.headerSearchInput.value = tag;
      if (dom.searchClearBtn) dom.searchClearBtn.hidden = false;
      renderLiveSearchResults(tag);
      dom.headerSearchInput?.focus();
    });
  });

  // Cart Drawer open/close
  document.getElementById('cartTrigger')?.addEventListener('click', () => toggleCartDrawer(true));
  dom.closeCartBtn?.addEventListener('click', () => toggleCartDrawer(false));

  // Wishlist triggers & Drawer
  document.getElementById('wishlistTrigger')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (typeof openWishlistDrawer === 'function') {
      openWishlistDrawer();
    } else if (typeof showSavedWishlist === 'function') {
      showSavedWishlist();
    }
  });
  dom.closeWishlistBtn?.addEventListener('click', closeWishlistDrawer);
  
  // Overlay click closes all open drawers and modals
  dom.drawerOverlay?.addEventListener('click', () => {
    toggleCartDrawer(false);
    toggleMobileDrawer(false);
    if (typeof closeWishlistDrawer === 'function') closeWishlistDrawer();
    if (typeof closeSearchModal === 'function') closeSearchModal();
    if (window.toggleFilterDrawer) window.toggleFilterDrawer(false);
    closePDP();
    closeCheckout();
    closePolicyModal();
    closeAccountModal();
    closeTrackModal();
  });

  // PDP Modal handlers
  dom.closePdpBtn?.addEventListener('click', closePDP);
  dom.pdpAddToCartBtn?.addEventListener('click', () => {
    if (activePdpProductId) {
      addToCart(activePdpProductId);
      closePDP();
    }
  });
  dom.checkPincodeBtn?.addEventListener('click', verifyPincode);
  dom.pincodeInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') verifyPincode();
  });

  // Checkout flow handlers
  dom.proceedCheckoutBtn?.addEventListener('click', openCheckout);
  dom.closeCheckoutBtn?.addEventListener('click', closeCheckout);
  dom.checkoutForm?.addEventListener('submit', processOrder);

  // Payment radio card changes
  document.querySelectorAll('input[name="paymentType"]').forEach(radio => {
    radio.addEventListener('change', e => {
      setPaymentSelection(e.target.value);
    });
  });

  // Customer account & tracking
  document.getElementById('accountTrigger')?.addEventListener('click', openAccountModal);
  document.getElementById('mobileAccountTrigger')?.addEventListener('click', () => { toggleMobileDrawer(false); openAccountModal(); });
  document.getElementById('footerAccountTrigger')?.addEventListener('click', openAccountModal);
  document.getElementById('trackTrigger')?.addEventListener('click', openTrackModal);
  document.getElementById('mobileTrackTrigger')?.addEventListener('click', () => { toggleMobileDrawer(false); openTrackModal(); });
  document.getElementById('footerTrackTrigger')?.addEventListener('click', openTrackModal);
  dom.closeAccountBtn?.addEventListener('click', closeAccountModal);
  dom.closeTrackBtn?.addEventListener('click', closeTrackModal);
  dom.trackOrderForm?.addEventListener('submit', trackOrder);

  // Policy triggers
  document.querySelectorAll('.link-btn[data-policy]').forEach(btn => {
    btn.addEventListener('click', () => {
      displayPolicy(btn.dataset.policy);
    });
  });
  dom.closePolicyBtn?.addEventListener('click', closePolicyModal);

  // FAQ Accordion toggles
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('active');

      document.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('active');
        i.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        item.classList.add('active');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // "Coming Soon" notification buttons
  document.getElementById('notifyDecorBtn')?.addEventListener('click', () => {
    alert("Thank you! You will receive early concierge access when the Home Décor line is unveiled.");
  });
  document.getElementById('notifyJournalBtn')?.addEventListener('click', () => {
    alert("Our editorial series on olfactory craft and candle care releases next month.");
  });

  // Mobile App Bottom Navigation triggers
  document.getElementById('mobHomeBtn')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.getElementById('mobShopBtn')?.addEventListener('click', () => {
    const shopSection = document.getElementById('new-arrivals') || document.getElementById('rituals') || document.getElementById('catalog');
    if (shopSection) {
      shopSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.location.href = 'index.html#new-arrivals';
    }
  });
  document.getElementById('mobWishlistBtn')?.addEventListener('click', () => {
    if (typeof openWishlistDrawer === 'function') {
      openWishlistDrawer();
    } else if (typeof showSavedWishlist === 'function') {
      showSavedWishlist();
    }
  });
  document.getElementById('mobBagBtn')?.addEventListener('click', () => toggleCartDrawer(true));

  // Escape key closes open modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      toggleCartDrawer(false);
      toggleMobileDrawer(false);
      if (typeof closeWishlistDrawer === 'function') closeWishlistDrawer();
      if (typeof closeSearchModal === 'function') closeSearchModal();
      closePDP();
      closeCheckout();
      closePolicyModal();
      closeAccountModal();
      closeTrackModal();
    }
  });
}

// Initial Boot
document.addEventListener('DOMContentLoaded', () => {
  renderCatalog(CANDLE_INVENTORY);
  updateCartUI();
  updateWishlistUI();
  setupEventListeners();
  setupLuxuryShowcaseSections();
  initDynamicHeader();
});

/* =========================================================
   HEADER SEARCH BAR & MODAL LOGIC
   ========================================================= */
function openSearchModal() {
  const modal = document.getElementById('searchModal');
  const overlay = document.getElementById('drawerOverlay');
  const input = document.getElementById('headerSearchInput');
  if (!modal) return;

  modal.classList.add('active');
  if (overlay) overlay.classList.add('active');
  renderLiveSearchResults(input ? input.value : '');
  setTimeout(() => {
    input?.focus();
  }, 100);
}

function closeSearchModal() {
  const modal = document.getElementById('searchModal');
  const overlay = document.getElementById('drawerOverlay');
  if (modal) modal.classList.remove('active');
  const input = document.getElementById('headerSearchInput');
  if (input) input.value = '';
  const clearBtn = document.getElementById('searchClearBtn');
  if (clearBtn) clearBtn.hidden = true;

  if (overlay) {
    const isCartOpen = document.getElementById('cartDrawer')?.classList.contains('active');
    const isWishlistOpen = document.getElementById('wishlistDrawer')?.classList.contains('active');
    const isMobileOpen = document.getElementById('mobileDrawer')?.classList.contains('active');
    const isPdpOpen = document.getElementById('pdpModal')?.classList.contains('active');
    if (!isCartOpen && !isWishlistOpen && !isMobileOpen && !isPdpOpen) {
      overlay.classList.remove('active');
    }
  }
}

function renderLiveSearchResults(query) {
  const container = document.getElementById('searchResultsContainer');
  if (!container) return;

  const trimmed = (query || '').trim().toLowerCase();
  let matches = [];

  if (trimmed.length === 0) {
    matches = CANDLE_INVENTORY.filter(p => p.badge === 'BESTSELLER' || p.badge === 'NEW ARRIVAL' || p.price > 800).slice(0, 6);
  } else {
    matches = CANDLE_INVENTORY.filter(p => {
      const titleMatch = (p.title || '').toLowerCase().includes(trimmed);
      const catMatch = (p.category || '').toLowerCase().includes(trimmed);
      const topNote = (p.notes?.top || '').toLowerCase().includes(trimmed);
      const heartNote = (p.notes?.heart || '').toLowerCase().includes(trimmed);
      const baseNote = (p.notes?.base || '').toLowerCase().includes(trimmed);
      const descMatch = (p.desc || '').toLowerCase().includes(trimmed);
      return titleMatch || catMatch || topNote || heartNote || baseNote || descMatch;
    });
  }

  if (matches.length === 0) {
    container.innerHTML = `
      <div class="search-empty-notice">
        <p>No fragrances found matching "<strong>${query}</strong>".</p>
        <p style="font-size: 0.78rem; margin-top: 0.35rem; color: var(--text-muted);">Try searching for notes like <em>Lavender</em>, <em>Sandalwood</em>, <em>Vanilla</em>, or <em>Amber</em>.</p>
      </div>
    `;
    return;
  }

  const headingText = trimmed.length === 0 ? 'Curated Fragrance Highlights' : `Matching Fragrances (${matches.length})`;

  container.innerHTML = `
    <div style="font-size: 0.72rem; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem; font-weight: 600;">
      ${headingText}
    </div>
    ${matches.map(item => `
      <div class="search-result-row" data-id="${item.id}" onclick="closeSearchModal(); openPDP(${item.id});">
        <img src="${item.image}" alt="${item.title}" class="search-result-thumb" />
        <div class="search-result-info">
          <h5 class="search-result-title">${item.title}</h5>
          <p class="search-result-notes">${item.notes?.top || 'Botanical soy wax'} • ${item.notes?.heart || 'IFRA certified oils'}</p>
          <span class="search-result-price">₹${item.price.toLocaleString('en-IN')}</span>
        </div>
        <div class="search-result-actions" onclick="event.stopPropagation();">
          <button type="button" class="btn-wishlist-cart" onclick="addToCart(${item.id}); showToast('Added to bag ♡');">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="display:inline-block; vertical-align: -1px; margin-right: 4px;">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            Add to Bag
          </button>
        </div>
      </div>
    `).join('')}
  `;
}

window.openSearchModal = openSearchModal;
window.closeSearchModal = closeSearchModal;
window.renderLiveSearchResults = renderLiveSearchResults;

/* =========================================================
   DYNAMIC HIDE/SHOW ON SCROLL HEADER
   ========================================================= */
function initDynamicHeader() {
  const headerWrapper = document.getElementById('headerWrapper') || document.querySelector('.header-wrapper');
  const headerSpacer = document.getElementById('headerSpacer') || document.querySelector('.header-spacer');
  if (!headerWrapper) return;

  // Zero-layout-shift: dynamically sync spacer height with headerWrapper height
  const syncSpacerHeight = () => {
    const height = headerWrapper.offsetHeight;
    if (height > 0) {
      if (headerSpacer) headerSpacer.style.height = `${height}px`;
      document.documentElement.style.setProperty('--header-total-height', `${height}px`);
    }
  };
  syncSpacerHeight();
  window.addEventListener('resize', syncSpacerHeight, { passive: true });
  window.addEventListener('load', syncSpacerHeight, { passive: true });
  setTimeout(syncSpacerHeight, 300);

  let lastScrollY = Math.max(0, window.pageYOffset || document.documentElement.scrollTop || 0);
  let ticking = false;
  const SCROLL_THRESHOLD = 8; // 8px dead-zone prevents jitter

  function updateHeaderOnScroll() {
    ticking = false;

    // Check if mobile menu/drawer or any modal is currently open
    const isMobileOpen = document.getElementById('mobileDrawer')?.classList.contains('active');
    const isSearchOpen = document.getElementById('searchModal')?.classList.contains('active');
    const isWishlistOpen = document.getElementById('wishlistDrawer')?.classList.contains('active');
    const isCartOpen = document.getElementById('cartDrawer')?.classList.contains('active');
    const isPdpOpen = document.getElementById('pdpModal')?.classList.contains('active');

    // If mobile menu or any modal is open, keep header visible and do not hide
    if (isMobileOpen || isSearchOpen || isWishlistOpen || isCartOpen || isPdpOpen) {
      headerWrapper.classList.remove('header-hidden');
      headerWrapper.classList.add('header-visible');
      return;
    }

    const currentScrollY = Math.max(0, window.pageYOffset || document.documentElement.scrollTop || 0);
    const scrollDifference = currentScrollY - lastScrollY;

    // 1. At or near page top (<= 10px): always show complete header in default pristine state
    if (currentScrollY <= 10) {
      headerWrapper.classList.remove('header-hidden');
      headerWrapper.classList.remove('header-visible');
      headerWrapper.classList.remove('header-scrolled');
      lastScrollY = currentScrollY;
      return;
    }

    // Check for bottom-of-page bounce on touch devices
    const maxScroll = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    ) - window.innerHeight;

    if (currentScrollY >= maxScroll - 15) {
      // Near bottom of page, avoid flipping
      return;
    }

    // 2. Scrolling DOWN -> smoothly hide complete header
    if (scrollDifference > SCROLL_THRESHOLD && currentScrollY > 70) {
      headerWrapper.classList.add('header-hidden');
      headerWrapper.classList.remove('header-visible');
      headerWrapper.classList.remove('header-scrolled');
    }
    // 3. Scrolling UP -> smoothly bring complete header back with subtle shadow
    else if (scrollDifference < -SCROLL_THRESHOLD) {
      headerWrapper.classList.remove('header-hidden');
      headerWrapper.classList.add('header-visible');
      headerWrapper.classList.add('header-scrolled');
    }

    lastScrollY = currentScrollY;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(updateHeaderOnScroll);
      ticking = true;
    }
  }, { passive: true });
}

window.initDynamicHeader = initDynamicHeader;

/* =========================================================
   LUXURY SECTIONS LOGIC (RITUALS & NEW ARRIVALS)
   ========================================================= */
window.kmAddToCart = function (productId, btn) {
  if (typeof addToCart === 'function') {
    addToCart(productId);
  }
  if (btn) {
    const originalContent = btn.innerHTML;
    btn.classList.add('added');
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M20 6L9 17l-5-5"></path>
      </svg>
      <span>Added ✓</span>
    `;
    setTimeout(() => {
      btn.classList.remove('added');
      btn.innerHTML = originalContent;
    }, 1600);
  }
};

window.kmToggleWishlist = function (productId, btn) {
  if (typeof toggleWishlist === 'function') {
    toggleWishlist(productId);
  }
  if (btn) {
    const isSaved = Array.isArray(wishlist) && wishlist.includes(productId);
    btn.classList.toggle('active', isSaved);
  }
};

function setupLuxuryShowcaseSections() {
  // 1. Rituals Section Carousel Scroll
  const ritualsTrack = document.getElementById('ritualsTrack');
  const ritualPrevBtn = document.getElementById('ritualPrevBtn');
  const ritualNextBtn = document.getElementById('ritualNextBtn');

  if (ritualsTrack && ritualPrevBtn && ritualNextBtn) {
    ritualPrevBtn.addEventListener('click', () => {
      const scrollAmt = ritualsTrack.clientWidth * 0.75;
      ritualsTrack.scrollBy({ left: -scrollAmt, behavior: 'smooth' });
    });
    ritualNextBtn.addEventListener('click', () => {
      const scrollAmt = ritualsTrack.clientWidth * 0.75;
      ritualsTrack.scrollBy({ left: scrollAmt, behavior: 'smooth' });
    });
  }

  // 2. Rituals Category Filter Pills
  const ritualPills = document.querySelectorAll('#ritualFilterBar .km-pill');
  ritualPills.forEach(pill => {
    pill.addEventListener('click', () => {
      ritualPills.forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-selected', 'false');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-selected', 'true');

      const filter = pill.dataset.ritualFilter;
      const cards = document.querySelectorAll('#ritualsTrack .km-ritual-card');
      cards.forEach(card => {
        if (filter === 'all' || card.dataset.cat === filter) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
      if (ritualsTrack) ritualsTrack.scrollTo({ left: 0, behavior: 'smooth' });
    });
  });

  // 3. New Arrivals Carousel Scroll
  const arrivalsTrack = document.getElementById('arrivalsTrack');
  const arrivalPrevBtn = document.getElementById('arrivalPrevBtn');
  const arrivalNextBtn = document.getElementById('arrivalNextBtn');

  if (arrivalsTrack && arrivalPrevBtn && arrivalNextBtn) {
    arrivalPrevBtn.addEventListener('click', () => {
      const scrollAmt = arrivalsTrack.clientWidth * 0.75;
      arrivalsTrack.scrollBy({ left: -scrollAmt, behavior: 'smooth' });
    });
    arrivalNextBtn.addEventListener('click', () => {
      const scrollAmt = arrivalsTrack.clientWidth * 0.75;
      arrivalsTrack.scrollBy({ left: scrollAmt, behavior: 'smooth' });
    });
  }

  // 4. New Arrivals Category Filter Pills
  const arrivalPills = document.querySelectorAll('#arrivalFilterBar .km-pill');
  arrivalPills.forEach(pill => {
    pill.addEventListener('click', () => {
      arrivalPills.forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-selected', 'false');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-selected', 'true');

      const filter = pill.dataset.arrivalFilter;
      const cards = document.querySelectorAll('#arrivalsTrack .km-product-card');
      cards.forEach(card => {
        if (filter === 'all' || card.dataset.category === filter) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
      if (arrivalsTrack) arrivalsTrack.scrollTo({ left: 0, behavior: 'smooth' });
    });
  });
}


