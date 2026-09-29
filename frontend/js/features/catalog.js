/* =========================================================
   5. CATALOG RENDERING & FILTERING 
   ========================================================= */

/* Helper to render 4-image scrollable gallery on cards */
function renderProductCardGallery(product) {
  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [
        product.image || 'asset/one.jpg',
        `${(product.image || 'asset/one.jpg').replace(/\.([^.]+)$/, '')}_2.jpg`,
        `${(product.image || 'asset/one.jpg').replace(/\.([^.]+)$/, '')}_3.jpg`,
        `${(product.image || 'asset/one.jpg').replace(/\.([^.]+)$/, '')}_4.jpg`
      ];

  const primaryImg = product.image || 'asset/one.jpg';

  return `
    <div class="km-card-gallery-wrap">
      <div class="km-card-slider" id="cardSlider${product.id}" onscroll="updateCardGalleryDots(this, ${product.id})">
        ${images.map((imgSrc, idx) => `
          <div class="km-card-slide" data-idx="${idx}">
            <img 
              src="${imgSrc}" 
              alt="${product.title} - View ${idx + 1}" 
              class="km-product-img" 
              loading="lazy" 
              onerror="this.onerror=null; this.src='${primaryImg}';" 
            />
          </div>
        `).join('')}
      </div>

      <button 
        type="button" 
        class="km-gallery-arrow km-gallery-prev" 
        aria-label="Previous photo" 
        title="Previous photo"
        onclick="event.stopPropagation(); scrollCardGallery(${product.id}, -1);"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>

      <button 
        type="button" 
        class="km-gallery-arrow km-gallery-next" 
        aria-label="Next photo" 
        title="Next photo"
        onclick="event.stopPropagation(); scrollCardGallery(${product.id}, 1);"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>

      <div class="km-gallery-dots" id="cardDots${product.id}">
        ${images.map((_, idx) => `
          <span class="km-gallery-dot ${idx === 0 ? 'active' : ''}" onclick="event.stopPropagation(); scrollCardGalleryTo(${product.id}, ${idx});"></span>
        `).join('')}
      </div>
    </div>
  `;
}

window.renderProductCardGallery = renderProductCardGallery;

window.scrollCardGallery = function(productId, direction) {
  const slider = document.getElementById(`cardSlider${productId}`) || document.getElementById(`catCardSlider${productId}`);
  if (!slider) return;
  const slideWidth = slider.offsetWidth || 260;
  slider.scrollBy({ left: direction * slideWidth, behavior: 'smooth' });
};

window.scrollCardGalleryTo = function(productId, index) {
  const slider = document.getElementById(`cardSlider${productId}`) || document.getElementById(`catCardSlider${productId}`);
  if (!slider) return;
  const slideWidth = slider.offsetWidth || 260;
  slider.scrollTo({ left: index * slideWidth, behavior: 'smooth' });
};

window.updateCardGalleryDots = function(slider, productId) {
  const slideWidth = slider.offsetWidth || 260;
  const activeIdx = Math.round(slider.scrollLeft / slideWidth);
  const dotsContainer = document.getElementById(`cardDots${productId}`) || document.getElementById(`catCardDots${productId}`);
  if (dotsContainer) {
    const dots = dotsContainer.querySelectorAll('.km-gallery-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === activeIdx);
    });
  }
};

function renderCatalog(items) {
  if (!dom.productGrid) return;

  if (!items || items.length === 0) {
    dom.productGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 5rem 1rem; color: var(--text-muted);">
        <p style="font-family: var(--font-serif); font-size: 2rem; color: var(--maroon-light); margin-bottom: 0.5rem;">No Fragrances Found</p>
        <p style="font-size: 0.95rem; max-width: 500px; margin: 0 auto 1.5rem; line-height: 1.6;">We couldn't find any candles matching your current filters. Try resetting filters or searching for botanical notes like Vanilla, Amber, Lavender, or Oud.</p>
        <button type="button" class="km-view-all-pill" onclick="clearAllFilters()" style="cursor: pointer;">Clear All Filters</button>
      </div>
    `;
    return;
  }

  dom.productGrid.innerHTML = items.map(product => {
    const isSaved = Array.isArray(wishlist) && wishlist.includes(product.id);
    const discountPct = product.origPrice > product.price 
      ? Math.round(((product.origPrice - product.price) / product.origPrice) * 100) 
      : 0;

    return `
      <article class="km-product-card" data-id="${product.id}" data-category="${product.category}" id="kmCard${product.id}">
        <div class="km-card-figure" onclick="openPDP(${product.id})">
          <div class="km-figure-badges">
            ${product.badge ? `<span class="km-badge-new">${product.badge}</span>` : ''}
            ${discountPct > 0 ? `<span class="km-badge-discount">${discountPct}% OFF</span>` : ''}
          </div>

          <button 
            type="button" 
            class="km-wishlist-toggle ${isSaved ? 'active' : ''}" 
            aria-label="Save ${product.title} to wishlist" 
            onclick="event.stopPropagation(); window.kmToggleWishlist ? kmToggleWishlist(${product.id}, this) : toggleWishlist(${product.id});"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
            </svg>
          </button>

          ${renderProductCardGallery(product)}

          <div class="km-quickview-btn" onclick="event.stopPropagation(); openPDP(${product.id});">Quick View</div>
        </div>

        <div class="km-card-details">
          <div class="km-collection-label">${product.category.toUpperCase()}</div>
          <h3 class="km-card-name" onclick="openPDP(${product.id})">${product.title}</h3>
          <div class="km-scent-notes">${product.notes.top}${product.notes.heart ? ' · ' + product.notes.heart : ''}</div>

          <div class="km-spec-row">
            <span>⏳ ${product.burn}</span>
            <span>•</span>
            <span>${product.category && product.category.toLowerCase().includes('accessories') ? 'Solid Brass &amp; Metal Care' : '100% Botanical Soy'}</span>
          </div>

          <div class="km-price-block">
            <span class="km-price-current">₹${product.price.toLocaleString('en-IN')}</span>
            ${product.origPrice > product.price ? `<span class="km-price-original">₹${product.origPrice.toLocaleString('en-IN')}</span>` : ''}
          </div>

          <button 
            type="button" 
            class="km-add-cart-btn" 
            onclick="window.kmAddToCart ? kmAddToCart(${product.id}, this) : addToCart(${product.id})"
            ${product.stock <= 0 ? 'disabled' : ''}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
              <path d="M3 6h18"></path>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            <span>${product.stock <= 0 ? 'Sold Out' : 'Add to Bag'}</span>
          </button>
        </div>
      </article>
    `;
  }).join('');
}

/* Multi-Faceted Filter & Sort Engine */
let activeCollectionPill = 'all';

function filterProducts() {
  const query = dom.searchInput ? dom.searchInput.value.toLowerCase().trim() : '';
  const sortValue = document.getElementById('sortSelect')?.value || 'recommended';

  // 1. Get Category Filters (from Checkboxes & Quick Pill Tabs)
  const typeCheckboxes = Array.from(document.querySelectorAll('.type-filter:checked'));
  const activeTypes = typeCheckboxes.map(cb => cb.value);

  // 2. Get Price Checkbox Filters
  const priceCheckboxes = Array.from(document.querySelectorAll('.price-filter:checked'));
  const activePrices = priceCheckboxes.map(cb => cb.value);

  // 3. Get Scent Note Filters
  const scentCheckboxes = Array.from(document.querySelectorAll('.scent-filter:checked'));
  const activeScents = scentCheckboxes.map(cb => cb.value.toLowerCase());

  // 4. Get Burn/Format Filters
  const formatCheckboxes = Array.from(document.querySelectorAll('.format-filter:checked'));
  const activeFormats = formatCheckboxes.map(cb => cb.value.toLowerCase());

  // 5. In Stock Only
  const inStockOnly = document.getElementById('inStockOnlyFilter')?.checked || false;

  // 6. Custom Min/Max Price Inputs
  const minPriceInput = document.getElementById('minPriceInput');
  const maxPriceInput = document.getElementById('maxPriceInput');
  const minVal = minPriceInput && minPriceInput.value ? parseFloat(minPriceInput.value) : null;
  const maxVal = maxPriceInput && maxPriceInput.value ? parseFloat(maxPriceInput.value) : null;

  let filtered = [...CANDLE_INVENTORY];

  // Quick Category Pill Filter
  if (activeCollectionPill && activeCollectionPill !== 'all') {
    filtered = filtered.filter(item => item.category.toLowerCase() === activeCollectionPill.toLowerCase());
  }

  // Checkbox Categories (Additive / Disjunctive)
  if (activeTypes.length > 0) {
    filtered = filtered.filter(item => activeTypes.includes(item.category));
  }

  // Search Query
  if (query) {
    filtered = filtered.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.desc.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      (item.notes.top && item.notes.top.toLowerCase().includes(query)) ||
      (item.notes.heart && item.notes.heart.toLowerCase().includes(query)) ||
      (item.notes.base && item.notes.base.toLowerCase().includes(query))
    );
  }

  // Price Range Checkboxes
  if (activePrices.length > 0) {
    filtered = filtered.filter(item => {
      if (activePrices.includes('under500') && item.price < 500) return true;
      if (activePrices.includes('under1000') && item.price < 1000) return true;
      if (activePrices.includes('500to1000') && item.price >= 500 && item.price <= 1000) return true;
      if (activePrices.includes('1000to1500') && item.price >= 1000 && item.price <= 1500) return true;
      if (activePrices.includes('over1500') && item.price > 1500) return true;
      return false;
    });
  }

  // Custom Min/Max Price
  if (minVal !== null && !isNaN(minVal)) {
    filtered = filtered.filter(item => item.price >= minVal);
  }
  if (maxVal !== null && !isNaN(maxVal)) {
    filtered = filtered.filter(item => item.price <= maxVal);
  }

  // Scent Note Filters
  if (activeScents.length > 0) {
    filtered = filtered.filter(item => {
      const allNotes = `${item.notes.top} ${item.notes.heart} ${item.notes.base}`.toLowerCase();
      return activeScents.some(scent => allNotes.includes(scent) || item.title.toLowerCase().includes(scent));
    });
  }

  // Format Filters
  if (activeFormats.length > 0) {
    filtered = filtered.filter(item => {
      const titleLower = item.title.toLowerCase();
      const catLower = item.category.toLowerCase();
      return activeFormats.some(fmt => titleLower.includes(fmt) || catLower.includes(fmt));
    });
  }

  // In-Stock Only
  if (inStockOnly) {
    filtered = filtered.filter(item => item.stock > 0);
  }

  // Sorting
  if (sortValue === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortValue === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sortValue === 'bestselling') {
    filtered.sort((a, b) => {
      const aBest = a.badge === 'BESTSELLER' ? 1 : 0;
      const bBest = b.badge === 'BESTSELLER' ? 1 : 0;
      if (bBest !== aBest) return bBest - aBest;
      return a.id - b.id;
    });
  } else if (sortValue === 'newest') {
    filtered.sort((a, b) => {
      const aNew = a.badge === 'NEW ARRIVAL' ? 1 : 0;
      const bNew = b.badge === 'NEW ARRIVAL' ? 1 : 0;
      if (bNew !== aNew) return bNew - aNew;
      return b.id - a.id;
    });
  } else if (sortValue === 'title-asc') {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortValue === 'title-desc') {
    filtered.sort((a, b) => b.title.localeCompare(a.title));
  } else {
    // Recommended default ID order
    filtered.sort((a, b) => a.id - b.id);
  }

  // Update Dynamic Counts in UI
  updateFilterUIState(filtered.length, activeTypes, activePrices, activeScents, activeFormats, minVal, maxVal, inStockOnly);

  renderCatalog(filtered);
}

// Active Filter Chips & UI Synchronization
function updateFilterUIState(resultCount, activeTypes, activePrices, activeScents, activeFormats, minVal, maxVal, inStockOnly) {
  // 1. Header & Toolbar product counts
  const countElement = document.getElementById('productCountText');
  if (countElement) {
    countElement.textContent = `Showing ${resultCount} Product${resultCount !== 1 ? 's' : ''}`;
  }

  const drawerApplyBtn = document.getElementById('applyFilterBtn');
  if (drawerApplyBtn) {
    drawerApplyBtn.textContent = `Apply Filters (${resultCount})`;
  }

  // 2. Active filter count badge on Filter button
  let totalActiveCount = activeTypes.length + activePrices.length + activeScents.length + activeFormats.length;
  if (minVal !== null || maxVal !== null) totalActiveCount += 1;
  if (inStockOnly) totalActiveCount += 1;
  if (activeCollectionPill && activeCollectionPill !== 'all') totalActiveCount += 1;

  const badgeEl = document.getElementById('filterCountBadge');
  if (badgeEl) {
    if (totalActiveCount > 0) {
      badgeEl.textContent = `${totalActiveCount}`;
      badgeEl.style.display = 'inline-flex';
    } else {
      badgeEl.style.display = 'none';
    }
  }

  // 3. Active Filter Chips Row
  const chipsContainer = document.getElementById('activeFilterChips');
  if (chipsContainer) {
    if (totalActiveCount === 0) {
      chipsContainer.innerHTML = '';
      chipsContainer.style.display = 'none';
    } else {
      chipsContainer.style.display = 'flex';
      let chipsHtml = '';

      if (activeCollectionPill && activeCollectionPill !== 'all') {
        chipsHtml += `<span class="km-active-chip">Collection: ${activeCollectionPill} <button type="button" onclick="setCollectionPill('all')">✕</button></span>`;
      }

      activeTypes.forEach(t => {
        chipsHtml += `<span class="km-active-chip">${t} <button type="button" onclick="removeFilterCheck('.type-filter', '${t}')">✕</button></span>`;
      });

      activePrices.forEach(p => {
        let label = p;
        if (p === 'under500') label = 'Under ₹500';
        if (p === '500to1000') label = '₹500 - ₹1,000';
        if (p === 'under1000') label = 'Under ₹1,000';
        if (p === '1000to1500') label = '₹1,000 - ₹1,500';
        if (p === 'over1500') label = 'Above ₹1,500';
        chipsHtml += `<span class="km-active-chip">${label} <button type="button" onclick="removeFilterCheck('.price-filter', '${p}')">✕</button></span>`;
      });

      if (minVal !== null || maxVal !== null) {
        chipsHtml += `<span class="km-active-chip">₹${minVal || 0} - ₹${maxVal || 'Max'} <button type="button" onclick="clearPriceInputs()">✕</button></span>`;
      }

      activeScents.forEach(s => {
        chipsHtml += `<span class="km-active-chip">Scent: ${s} <button type="button" onclick="removeFilterCheck('.scent-filter', '${s}')">✕</button></span>`;
      });

      activeFormats.forEach(f => {
        chipsHtml += `<span class="km-active-chip">${f} <button type="button" onclick="removeFilterCheck('.format-filter', '${f}')">✕</button></span>`;
      });

      if (inStockOnly) {
        chipsHtml += `<span class="km-active-chip">In Stock Only <button type="button" onclick="removeInStockFilter()">✕</button></span>`;
      }

      chipsHtml += `<button type="button" class="km-clear-all-btn" onclick="clearAllFilters()">Clear All</button>`;
      chipsContainer.innerHTML = chipsHtml;
    }
  }
}

// Global Filter Helpers
window.setCollectionPill = function(category) {
  activeCollectionPill = category;
  document.querySelectorAll('.km-filter-pills-bar .km-pill').forEach(pill => {
    const isTarget = (pill.dataset.categoryFilter || '').toLowerCase() === category.toLowerCase();
    pill.classList.toggle('active', isTarget);
    pill.setAttribute('aria-selected', isTarget ? 'true' : 'false');
  });
  filterProducts();
};

window.removeFilterCheck = function(selector, value) {
  const cb = document.querySelector(`${selector}[value="${value}"]`);
  if (cb) {
    cb.checked = false;
    filterProducts();
  }
};

window.clearPriceInputs = function() {
  const minPriceInput = document.getElementById('minPriceInput');
  const maxPriceInput = document.getElementById('maxPriceInput');
  if (minPriceInput) minPriceInput.value = '';
  if (maxPriceInput) maxPriceInput.value = '';
  filterProducts();
};

window.removeInStockFilter = function() {
  const cb = document.getElementById('inStockOnlyFilter');
  if (cb) {
    cb.checked = false;
    filterProducts();
  }
};

window.clearAllFilters = function() {
  activeCollectionPill = 'all';
  document.querySelectorAll('.km-filter-pills-bar .km-pill').forEach(p => {
    const isAll = (p.dataset.categoryFilter || '') === 'all';
    p.classList.toggle('active', isAll);
  });
  document.querySelectorAll('.type-filter, .price-filter, .scent-filter, .format-filter').forEach(cb => {
    cb.checked = false;
  });
  const inStockCb = document.getElementById('inStockOnlyFilter');
  if (inStockCb) inStockCb.checked = false;
  const minP = document.getElementById('minPriceInput');
  const maxP = document.getElementById('maxPriceInput');
  if (minP) minP.value = '';
  if (maxP) maxP.value = '';
  if (dom.searchInput) dom.searchInput.value = '';
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) sortSelect.value = 'recommended';
  filterProducts();
};

window.toggleFilterDrawer = function(isOpen) {
  const drawer = document.getElementById('filterDrawer');
  const overlay = document.getElementById('filterDrawerOverlay') || dom.drawerOverlay;
  if (drawer) drawer.classList.toggle('active', isOpen);
  if (overlay) overlay.classList.toggle('active', isOpen);
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
};

window.setGridView = function(columns) {
  const grid = dom.productGrid || document.getElementById('productGrid');
  const btn4 = document.getElementById('gridView4Btn');
  const btn2 = document.getElementById('gridView2Btn');
  if (!grid) return;
  if (columns === 2) {
    grid.classList.add('grid-cols-2');
    btn2?.classList.add('active');
    btn4?.classList.remove('active');
  } else {
    grid.classList.remove('grid-cols-2');
    btn4?.classList.add('active');
    btn2?.classList.remove('active');
  }
};

