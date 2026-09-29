document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  let catName = params.get('cat') || 'Premium Luxury Candles';
  if (catName === 'Gift Hampers') catName = 'Gift Hampers';

  const title = document.getElementById('categoryTitleName');
  const pretitle = document.getElementById('categoryPretitle');
  const description = document.getElementById('categoryDescription');
  const grid = document.getElementById('categoryProductGrid');

  if (!title || !grid) return;
  title.textContent = catName;
  if (pretitle) pretitle.textContent = 'The Candlorre • Curated Collection';
  if (description) {
    if (catName.toLowerCase().includes('accessories')) {
      description.textContent = 'Elevate your burn ritual with our curated brass and matte-finish candle care accessories, crafted for clean burns, precise wick trimming, and graceful smokeless extinguishing.';
    } else {
      description.textContent = `Immerse in our hand-poured artisan selection of ${catName.toLowerCase()}, formulated with 100% natural organic soy wax and IFRA-certified therapeutic fragrance blends.`;
    }
  }

  const matchedProducts = CANDLE_INVENTORY.filter(item => item.category.toLowerCase() === catName.toLowerCase());

  if (matchedProducts.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:4rem 1rem;color:var(--text-muted);">
        <p style="font-family:var(--font-serif);font-size:1.8rem;color:var(--maroon-light);">No Products Found in this Category</p>
        <p style="font-size:.9rem;margin-top:.5rem;"><a href="full-catalog.html" style="color:var(--maroon-light);text-decoration:underline;">Return to full catalog</a></p>
      </div>`;
    return;
  }

  grid.innerHTML = matchedProducts.map(product => {
    const isSaved = Array.isArray(wishlist) && wishlist.includes(product.id);
    const discountPct = product.origPrice > product.price 
      ? Math.round(((product.origPrice - product.price) / product.origPrice) * 100) 
      : 0;

    const stock = typeof product.stock === 'number'
      ? product.stock
      : (Array.isArray(product.variants) && product.variants.length > 0
          ? product.variants.reduce((sum, v) => sum + (typeof v.stock === 'number' ? v.stock : 0), 0)
          : 15);

    const isComingSoon = Boolean(product.isComingSoon);
    const isOutOfStock = !isComingSoon && (product.available === false || stock <= 0);
    const isLowStock = !isComingSoon && !isOutOfStock && stock > 0 && stock < 10;

    return `
      <article class="km-product-card" data-id="${product.id}" data-category="${product.category}" id="kmCatCard${product.id}">
        <div class="km-card-figure" onclick="openPDP(${product.id})">
          <div class="km-figure-badges">
            ${isComingSoon ? '<span class="km-badge-new">COMING SOON</span>' : ''}
            ${isOutOfStock ? '<span class="km-badge-oos">OUT OF STOCK</span>' : ''}
            ${!isOutOfStock && !isComingSoon && isLowStock ? `<span class="km-badge-stock-urgent">🔥 Only ${stock} Left</span>` : ''}
            ${!isOutOfStock && !isComingSoon && !isLowStock && product.badge ? `<span class="km-badge-new">${product.badge}</span>` : ''}
            ${!isOutOfStock && discountPct > 0 ? `<span class="km-badge-discount">${discountPct}% OFF</span>` : ''}
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

          ${typeof window.renderProductCardGallery === 'function' ? window.renderProductCardGallery(product) : `<img src="${product.image}" alt="${product.title}" class="km-product-img" loading="lazy" />`}
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

          ${isComingSoon 
            ? `<div class="km-stock-status-line coming-soon"><span class="stock-bullet gold"></span> Coming Soon • In Atelier</div>`
            : isOutOfStock
              ? `<div class="km-stock-status-line out-of-stock"><span class="stock-bullet red"></span> Out of Stock</div>`
              : isLowStock
                ? `<div class="km-stock-status-line low-stock"><span class="stock-bullet amber pulse"></span> <strong>Only ${stock} left in stock</strong> — order soon!</div>`
                : `<div class="km-stock-status-line in-stock"><span class="stock-bullet green"></span> In Stock &amp; Hand-Poured</div>`
          }

          <div class="km-price-block">
            <span class="km-price-current">₹${product.price.toLocaleString('en-IN')}</span>
            ${product.origPrice > product.price ? `<span class="km-price-original">₹${product.origPrice.toLocaleString('en-IN')}</span>` : ''}
          </div>

          <button 
            type="button" 
            class="km-add-cart-btn ${isOutOfStock ? 'oos-btn' : ''}" 
            onclick="${isOutOfStock || isComingSoon ? '' : `window.kmAddToCart ? kmAddToCart(${product.id}, this) : addToCart(${product.id})`}"
            ${isOutOfStock || isComingSoon ? 'disabled' : ''}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
              <path d="M3 6h18"></path>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            <span>${isComingSoon ? 'Coming Soon' : isOutOfStock ? 'Out of Stock' : 'Add to Bag'}</span>
          </button>
        </div>
      </article>
    `;
  }).join('');
});

