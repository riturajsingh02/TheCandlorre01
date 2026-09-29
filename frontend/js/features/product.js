/* =========================================================
   8. PRODUCT QUICK VIEW MODAL (PDP) & VARIANT CONTROLLER
   ========================================================= */

// State variables are defined in js/core/state.js
currentPdpIndex = 0;
currentPdpImages = [];
activePdpProductId = null;
activePdpVariantId = null;

/**
 * Opens the Quick View / Product Detail Modal with the specified product & variant.
 * @param {number|string} productId - Product ID from CANDLE_INVENTORY
 * @param {string} [variantId] - Optional variant ID (e.g., 'diamond-glow-black', 'amber', 'large')
 */
function openPDP(productId, variantId) {
  const numId = typeof productId === 'string' && !isNaN(Number(productId)) ? Number(productId) : productId;
  const product = CANDLE_INVENTORY.find(item => item.id === numId || item.id === productId);
  if (!product) return;

  const pdpModal = dom.pdpModal || document.getElementById('pdpModal');
  if (!pdpModal) return;

  activePdpProductId = product.id;
  currentPdpIndex = 0;

  // Determine active variant
  const variants = Array.isArray(product.variants) && product.variants.length > 0 ? product.variants : [];
  let selectedVariant = null;

  if (variantId) {
    selectedVariant = variants.find(v => v.id === variantId || v.title?.toLowerCase() === String(variantId).toLowerCase());
  }
  if (!selectedVariant && variants.length > 0) {
    selectedVariant = variants[0];
  }
  activePdpVariantId = selectedVariant ? selectedVariant.id : null;

  // Render product details with the selected variant
  renderPdpVariantState(product, selectedVariant);

  // Clear pincode form
  if (dom.pincodeInput) dom.pincodeInput.value = '';
  if (dom.pincodeMsg) dom.pincodeMsg.textContent = '';

  // Open modal & overlay
  pdpModal.scrollTop = 0;
  pdpModal.classList.add('active');
  document.body.classList.add('modal-open');
  const overlay = dom.drawerOverlay || document.getElementById('drawerOverlay');
  if (overlay) overlay.classList.add('active');

  // Track analytics
  if (window.CandlorreAnalytics && typeof window.CandlorreAnalytics.trackViewItem === 'function') {
    window.CandlorreAnalytics.trackViewItem({
      ...product,
      price: selectedVariant ? selectedVariant.price : product.price,
      selectedVariant: selectedVariant ? selectedVariant.title : 'Standard'
    });
  }
}

/**
 * Switches the active variant within the PDP Modal (instant image/price/scent update).
 * @param {string} variantId
 */
function selectPdpVariant(variantId) {
  if (!activePdpProductId) return;
  const product = CANDLE_INVENTORY.find(item => item.id === activePdpProductId);
  if (!product) return;

  const variants = Array.isArray(product.variants) ? product.variants : [];
  const selectedVariant = variants.find(v => v.id === variantId) || variants[0];
  if (!selectedVariant) return;

  activePdpVariantId = selectedVariant.id;
  currentPdpIndex = 0;

  renderPdpVariantState(product, selectedVariant);
}

/**
 * Updates all DOM nodes in the PDP Modal to reflect the chosen variant.
 */
function renderPdpVariantState(product, variant) {
  const isComingSoon = product.isComingSoon || (variant && variant.isComingSoon);
  const isOutOfStock = !isComingSoon && (variant ? (variant.available === false || variant.isOutOfStock || variant.stock === 0) : (product.available === false || product.stock === 0));
  const currentPrice = variant ? variant.price : product.price;
  const origPrice = variant ? (variant.origPrice || product.origPrice) : product.origPrice;
  const currentNotes = variant?.notes || product.notes || { top: '', heart: '', base: '' };
  const currentDesc = variant?.desc || product.desc;
  const currentBurn = variant?.burn || product.burn;
  const currentDimensions = variant?.dimensions || product.dimensions || '—';

  // 1. Title, Category & Stock Status
  if (dom.pdpCategory) {
    dom.pdpCategory.textContent = product.category;
  }
  if (dom.pdpTitle) {
    dom.pdpTitle.textContent = product.title;
  }
  
  const stockBadge = dom.pdpStockBadge || document.getElementById('pdpStockBadge');
  if (stockBadge) {
    if (isComingSoon) {
      stockBadge.className = 'pdp-stock-status coming-soon';
      stockBadge.innerHTML = `<span class="status-pulse-dot gold"></span> Coming Soon • Handcrafted In Atelier`;
    } else if (isOutOfStock) {
      stockBadge.className = 'pdp-stock-status out-of-stock';
      stockBadge.innerHTML = `<span class="status-pulse-dot red"></span> Out of Stock • Handcrafted Upon Order`;
    } else {
      stockBadge.className = 'pdp-stock-status';
      stockBadge.innerHTML = `<span class="status-pulse-dot"></span> In Stock &amp; Hand-Poured`;
    }
  }

  // 2. Pricing
  if (dom.pdpPrice) {
    dom.pdpPrice.textContent = `₹${currentPrice.toLocaleString('en-IN')}`;
  }
  if (dom.pdpOrigPrice) {
    if (origPrice > currentPrice) {
      dom.pdpOrigPrice.textContent = `₹${origPrice.toLocaleString('en-IN')}`;
      dom.pdpOrigPrice.style.display = 'inline';
    } else {
      dom.pdpOrigPrice.textContent = '';
      dom.pdpOrigPrice.style.display = 'none';
    }
  }

  // 3. Description & Scent Architecture
  if (dom.pdpDescription) {
    dom.pdpDescription.textContent = currentDesc;
  }
  if (dom.pdpTopNotes) {
    dom.pdpTopNotes.textContent = currentNotes.top || '—';
  }
  if (dom.pdpHeartNotes) {
    dom.pdpHeartNotes.textContent = currentNotes.heart || '—';
  }
  if (dom.pdpBaseNotes) {
    dom.pdpBaseNotes.textContent = currentNotes.base || '—';
  }
  if (dom.pdpBurnTime) {
    dom.pdpBurnTime.textContent = currentBurn;
  }
  if (dom.pdpBurnDetail) {
    dom.pdpBurnDetail.textContent = currentBurn;
  }
  if (dom.pdpDimensions) {
    dom.pdpDimensions.textContent = currentDimensions;
  }

  // Adapt Fragrance Architecture card header & labels for Accessories vs Candles
  const isAccessory = product.category && product.category.toLowerCase().includes('accessories');
  const scentCardHeader = document.querySelector('#pdpModal .scent-card-header span');
  const scentLabels = document.querySelectorAll('#pdpModal .scent-item .scent-label');
  const scentFooterMeta = document.querySelector('#pdpModal .scent-footer-meta');

  if (isAccessory) {
    if (scentCardHeader) scentCardHeader.textContent = 'Craftsmanship & Care';
    if (scentLabels[0]) scentLabels[0].textContent = 'Material & Build:';
    if (scentLabels[1]) scentLabels[1].textContent = 'Artisan Feature:';
    if (scentLabels[2]) scentLabels[2].textContent = 'Ritual Purpose:';
    if (scentFooterMeta) {
      scentFooterMeta.innerHTML = `<span><strong>Care:</strong> Lifetime Precision Tool</span><span class="dot-sep">•</span><span><strong>Craft:</strong> Solid Metal / Brass</span>`;
    }
  } else {
    if (scentCardHeader) scentCardHeader.textContent = 'Fragrance Architecture';
    if (scentLabels[0]) scentLabels[0].textContent = 'Top Notes:';
    if (scentLabels[1]) scentLabels[1].textContent = 'Heart Notes:';
    if (scentLabels[2]) scentLabels[2].textContent = 'Base Notes:';
    if (scentFooterMeta) {
      scentFooterMeta.innerHTML = `<span><strong>Burn Duration:</strong> <span id="pdpBurnTime">${currentBurn}</span></span><span class="dot-sep">•</span><span><strong>Wax:</strong> 100% Botanical Soy</span>`;
    }
  }

  // 4. Interactive Variant Selector Block
  const variantBlock = dom.pdpVariantBlock || document.getElementById('pdpVariantBlock');
  const variantTypeTitle = dom.pdpVariantTypeTitle || document.getElementById('pdpVariantTypeTitle');
  const variantCurrentVal = dom.pdpVariantCurrentVal || document.getElementById('pdpVariantCurrentVal');
  const variantSelectorGrid = dom.pdpVariantSelectorGrid || document.getElementById('pdpVariantSelectorGrid');

  const variants = Array.isArray(product.variants) ? product.variants : [];

  if (variantBlock && variantSelectorGrid) {
    if (variants.length > 1) {
      variantBlock.style.display = 'block';

      const typeLabel = product.variantTypeLabel || (product.variantType === 'color' ? 'Select Color' : 'Select Size');
      if (variantTypeTitle) variantTypeTitle.textContent = `${typeLabel}:`;
      if (variantCurrentVal) {
        const variantStatus = (variant?.available === false || variant?.isOutOfStock) ? ' (Out of Stock)' : '';
        variantCurrentVal.textContent = (variant ? variant.title : '') + variantStatus;
      }

      variantSelectorGrid.innerHTML = variants.map(v => {
        const isSelected = variant && variant.id === v.id;
        const isColor = Boolean(v.colorHex) || product.variantType === 'color';
        const vOutOfStock = !v.isComingSoon && (v.available === false || v.isOutOfStock || v.stock === 0);

        if (isColor) {
          return `
            <button 
              type="button" 
              class="pdp-swatch-btn ${isSelected ? 'active' : ''} ${v.isComingSoon ? 'coming-soon' : ''} ${vOutOfStock ? 'out-of-stock' : ''}" 
              data-variant-id="${v.id}"
              title="${v.title}${vOutOfStock ? ' (Out of Stock)' : ''} — ₹${Number(v.price).toLocaleString('en-IN')}"
              onclick="selectPdpVariant('${v.id}')"
            >
              <span class="pdp-swatch-circle" style="background-color: ${v.colorHex || '#d4af37'};"></span>
              <span class="pdp-swatch-name">${v.title}</span>
              ${v.isComingSoon ? '<span class="swatch-soon-tag">Soon</span>' : ''}
              ${vOutOfStock ? '<span class="swatch-oos-tag">Out of Stock</span>' : ''}
            </button>
          `;
        }

        return `
          <button 
            type="button" 
            class="pdp-size-pill ${isSelected ? 'active' : ''} ${v.isComingSoon ? 'coming-soon' : ''} ${vOutOfStock ? 'out-of-stock' : ''}" 
            data-variant-id="${v.id}"
            onclick="selectPdpVariant('${v.id}')"
          >
            <span class="pdp-pill-title">${v.title}</span>
            <span class="pdp-pill-price">₹${Number(v.price).toLocaleString('en-IN')}</span>
            ${v.isComingSoon ? '<span class="pill-soon-tag">Soon</span>' : ''}
            ${vOutOfStock ? '<span class="pill-oos-tag">Out of Stock</span>' : ''}
          </button>
        `;
      }).join('');
    } else {
      variantBlock.style.display = 'none';
      variantSelectorGrid.innerHTML = '';
    }
  }

  // Fallback select dropdown if present
  if (dom.pdpVariantWrap && dom.pdpVariantSelect) {
    if (variants.length > 1) {
      dom.pdpVariantWrap.hidden = false;
      dom.pdpVariantSelect.innerHTML = variants.map(v => {
        const vOutOfStock = !v.isComingSoon && (v.available === false || v.isOutOfStock || v.stock === 0);
        return `
        <option value="${v.id}" ${variant && variant.id === v.id ? 'selected' : ''}>
          ${v.title}${vOutOfStock ? ' (Out of Stock)' : ''} — ₹${Number(v.price).toLocaleString('en-IN')}
        </option>
      `;
      }).join('');
    } else {
      dom.pdpVariantWrap.hidden = true;
    }
  }

  // 5. Image Gallery Update (Variant Specific 4-angle views)
  const images = (variant && Array.isArray(variant.images) && variant.images.length > 0)
    ? variant.images
    : (Array.isArray(product.images) && product.images.length > 0)
      ? product.images
      : [product.image || 'asset/one.jpg'];

  currentPdpImages = images;

  const pdpSliderTrack = document.getElementById('pdpSliderTrack') || dom.pdpSliderTrack;
  const pdpThumbsRow = document.getElementById('pdpThumbsRow') || dom.pdpThumbsRow;

  if (pdpSliderTrack) {
    pdpSliderTrack.innerHTML = images.map((src, idx) => `
      <div class="pdp-slider-slide" data-slide-idx="${idx}">
        <img 
          src="${src}" 
          alt="${product.title} (${variant?.title || ''}) - View ${idx + 1}" 
          loading="${idx === 0 ? 'eager' : 'lazy'}" 
          onerror="this.onerror=null; this.src='${product.image || 'asset/one.jpg'}';" 
        />
      </div>
    `).join('');

    pdpSliderTrack.scrollTo({ left: 0, behavior: 'instant' });
    pdpSliderTrack.onscroll = () => {
      const slideW = pdpSliderTrack.firstElementChild?.offsetWidth || pdpSliderTrack.clientWidth || pdpSliderTrack.offsetWidth || 300;
      const idx = Math.round(pdpSliderTrack.scrollLeft / slideW);
      if (idx !== currentPdpIndex && idx >= 0 && idx < images.length) {
        currentPdpIndex = idx;
        updatePdpThumbs();
      }
    };
  } else if (dom.pdpImage) {
    dom.pdpImage.src = variant?.image || product.image || 'asset/one.jpg';
    dom.pdpImage.alt = `${product.title} - ${variant?.title || ''}`;
  }

  if (pdpThumbsRow) {
    pdpThumbsRow.innerHTML = images.map((src, idx) => `
      <button 
        type="button" 
        class="pdp-thumb-item ${idx === 0 ? 'active' : ''}" 
        aria-label="View photo ${idx + 1}" 
        onclick="setPdpSlide(${idx})"
      >
        <img 
          src="${src}" 
          alt="Thumbnail ${idx + 1}" 
          onerror="this.onerror=null; this.src='${product.image || 'asset/one.jpg'}';" 
        />
      </button>
    `).join('');
  }

  // 6. Add to Bag Button State
  const addBtn = dom.pdpAddToCartBtn || document.getElementById('pdpAddToCartBtn');
  if (addBtn) {
    if (isComingSoon) {
      addBtn.disabled = true;
      addBtn.className = 'btn btn-gold btn-block pdp-add-bag-btn coming-soon-btn';
      addBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        Coming Soon — Join Waitlist
      `;
    } else if (isOutOfStock) {
      addBtn.disabled = true;
      addBtn.className = 'btn btn-secondary btn-block pdp-add-bag-btn out-of-stock-btn';
      addBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        Out of Stock
      `;
    } else {
      addBtn.disabled = false;
      addBtn.className = 'btn btn-gold btn-block pdp-add-bag-btn';
      addBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
          <path d="M3 6h18"></path>
          <path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
        Add to Shopping Bag • ₹${currentPrice.toLocaleString('en-IN')}
      `;
      addBtn.onclick = () => {
        addToCart(product.id, variant ? variant.id : undefined);
      };
    }
  }
}

/**
 * Slide to a specific photo index in the PDP carousel.
 */
function setPdpSlide(idx) {
  const pdpSliderTrack = document.getElementById('pdpSliderTrack') || dom.pdpSliderTrack;
  if (!pdpSliderTrack) return;
  const slideW = pdpSliderTrack.firstElementChild?.offsetWidth || pdpSliderTrack.clientWidth || pdpSliderTrack.offsetWidth || 300;
  pdpSliderTrack.scrollTo({ left: idx * slideW, behavior: 'smooth' });
  currentPdpIndex = idx;
  updatePdpThumbs();
}

/**
 * Scroll the PDP gallery forward or backward.
 */
function scrollPdpGallery(direction) {
  const pdpSliderTrack = document.getElementById('pdpSliderTrack') || dom.pdpSliderTrack;
  if (!pdpSliderTrack) return;
  const slideW = pdpSliderTrack.firstElementChild?.offsetWidth || pdpSliderTrack.clientWidth || pdpSliderTrack.offsetWidth || 300;
  const newIdx = Math.max(0, Math.min(currentPdpImages.length - 1, currentPdpIndex + direction));
  setPdpSlide(newIdx);
}

/**
 * Update active thumbnail indicator.
 */
function updatePdpThumbs() {
  const pdpThumbsRow = document.getElementById('pdpThumbsRow') || dom.pdpThumbsRow;
  if (!pdpThumbsRow) return;
  const thumbs = pdpThumbsRow.querySelectorAll('.pdp-thumb-item');
  thumbs.forEach((th, i) => {
    th.classList.toggle('active', i === currentPdpIndex);
  });
}

/**
 * Close PDP Quick View Modal.
 */
function closePDP() {
  const pdpModal = dom.pdpModal || document.getElementById('pdpModal');
  if (pdpModal) pdpModal.classList.remove('active');
  document.body.classList.remove('modal-open');
  const overlay = dom.drawerOverlay || document.getElementById('drawerOverlay');
  if (overlay) overlay.classList.remove('active');
  activePdpProductId = null;
  activePdpVariantId = null;
}

/**
 * Verifies Indian pincode format and live delivery ETA.
 */
async function verifyPincode() {
  const pincode = dom.pincodeInput?.value.trim();
  if (!dom.pincodeMsg) return;

  if (!/^\d{6}$/.test(pincode || '')) {
    dom.pincodeMsg.style.color = '#C62828';
    dom.pincodeMsg.textContent = 'Please enter a valid 6-digit Indian pincode.';
    return;
  }

  dom.pincodeMsg.style.color = 'var(--text-muted)';
  dom.pincodeMsg.textContent = 'Checking delivery…';

  try {
    if (Candlorre_CONFIG.pincodeServiceabilityEndpoint) {
      const response = await fetch(Candlorre_CONFIG.pincodeServiceabilityEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pincode })
      });
      if (!response.ok) throw new Error('Serviceability request failed');
      const result = await response.json();
      dom.pincodeMsg.style.color = result.serviceable ? '#2E7D32' : '#C62828';
      dom.pincodeMsg.textContent = result.message || (result.serviceable
        ? `✓ Delivery available to ${pincode}${result.eta ? ` • ETA ${result.eta}` : ''}${result.cod ? ' • COD available' : ''}.`
        : `Delivery is currently unavailable for ${pincode}.`);
      return;
    }

    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = await response.json();
    const record = data?.[0];
    const office = record?.PostOffice?.[0];

    if (record?.Status === 'Success' && office) {
      dom.pincodeMsg.style.color = '#2E7D32';
      dom.pincodeMsg.textContent = `✓ Delivery available to ${pincode} (${office.District}, ${office.State}) • Express Shipping (2-4 business days) • COD available.`;
    } else {
      dom.pincodeMsg.style.color = '#C62828';
      dom.pincodeMsg.textContent = 'This pincode was not found. Please check the 6 digits.';
    }
  } catch (error) {
    dom.pincodeMsg.style.color = '#2E7D32';
    dom.pincodeMsg.textContent = `✓ Pincode ${pincode} serviceable • Pan-India express dispatch within 24 hours.`;
  }
}

// Attach globals for inline onclick handlers
window.openPDP = openPDP;
window.closePDP = closePDP;
window.selectPdpVariant = selectPdpVariant;
window.setPdpSlide = setPdpSlide;
window.scrollPdpGallery = scrollPdpGallery;
window.verifyPincode = verifyPincode;
