/* =========================================================
   THE Candlorre — UNIVERSAL MOBILE NAVIGATION & DRAWER SYSTEM
   Ensures the hamburger menu button and slide-out navigation
   work reliably and consistently across all pages.
   ========================================================= */

(function () {
  'use strict';

  function getDrawerMarkup() {
    return `
    <div class="mobile-drawer-header">
      <div class="mobile-drawer-brand">
        <h3 class="brand-title mobile-brand-title">The Candlorre</h3>
        <span class="mobile-brand-sub">ILLUMINATE LUXURY</span>
      </div>
      <button class="btn-close" id="closeMobileNavBtn" aria-label="Close menu">✕</button>
    </div>

    <ul class="mobile-nav-list">
      <li>
        <a href="index.html#new-arrivals" class="mobile-nav-link">
          <span>Candles (60+ Fragrances)</span>
          <span class="link-arrow">→</span>
        </a>
      </li>
      <li>
        <a href="full-catalog.html" class="mobile-nav-link">
          <span>Full Catalog (60+)</span>
          <span class="link-arrow">→</span>
        </a>
      </li>
      <li>
        <a href="tracking.html" class="mobile-nav-link">
          <span>Track Order</span>
          <span class="link-arrow">→</span>
        </a>
      </li>
      <li>
        <a href="about-us.html" class="mobile-nav-link">
          <span>Our Story &amp; Craft</span>
          <span class="link-arrow">→</span>
        </a>
      </li>
      <li>
        <a href="faq.html" class="mobile-nav-link">
          <span>Client FAQs</span>
          <span class="link-arrow">→</span>
        </a>
      </li>
      <li>
        <a href="contact-us.html" class="mobile-nav-link">
          <span>Customer Care</span>
          <span class="link-arrow">→</span>
        </a>
      </li>
      <li>
        <a href="login.html" class="mobile-nav-link" id="mobAccountLink">
          <span>Client Sign In</span>
          <span class="link-arrow">→</span>
        </a>
      </li>
    </ul>

    <div class="mobile-drawer-footer">
      <p class="mob-footer-tag">Concierge Assistance</p>
      <a href="https://wa.me/919762831995?text=Hello%20The%20Candlorre,%20I'd%20like%20assistance%20with%20fragrances"
        target="_blank" rel="noopener" class="mob-whatsapp-btn">
        <span>Chat on WhatsApp</span>
        <span>↗</span>
      </a>
    </div>
    `;
  }

  function ensureDrawerElements() {
    let drawer = document.getElementById('mobileDrawer');
    let overlay = document.getElementById('drawerOverlay');

    if (!drawer) {
      drawer = document.createElement('aside');
      drawer.className = 'mobile-drawer';
      drawer.id = 'mobileDrawer';
      drawer.setAttribute('role', 'dialog');
      drawer.setAttribute('aria-modal', 'true');
      drawer.setAttribute('aria-label', 'Mobile Navigation');
      drawer.innerHTML = getDrawerMarkup();
      document.body.appendChild(drawer);
    }

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'drawer-overlay';
      overlay.id = 'drawerOverlay';
      overlay.setAttribute('aria-hidden', 'true');
      document.body.appendChild(overlay);
    }

    return { drawer, overlay };
  }

  function toggleMobileDrawer(isOpen) {
    const { drawer, overlay } = ensureDrawerElements();
    const shouldOpen = (typeof isOpen === 'boolean') ? isOpen : !drawer.classList.contains('active');

    if (shouldOpen) {
      drawer.classList.add('active');
      overlay.classList.add('active');
      document.body.classList.add('drawer-open');
    } else {
      drawer.classList.remove('active');
      overlay.classList.remove('active');
      document.body.classList.remove('drawer-open');
    }

    // Synchronize authentication links in mobile drawer if ShopifyService is available
    if (window.ShopifyService && typeof window.ShopifyService.syncHeaderAuth === 'function') {
      window.ShopifyService.syncHeaderAuth();
    }
  }

  // Expose globally so inline attributes and other scripts can call it
  window.toggleMobileDrawer = toggleMobileDrawer;

  function syncHeaderBadges() {
    try {
      const savedCart = JSON.parse(localStorage.getItem('theCandlorre_cart') || '[]');
      const cartCount = savedCart.reduce((sum, item) => sum + (item.qty || item.quantity || 1), 0);
      const cartBadges = document.querySelectorAll('#cartCount, .header-cart-badge');
      cartBadges.forEach(b => { b.textContent = cartCount; });

      const savedWish = JSON.parse(localStorage.getItem('theCandlorre_wishlist') || '[]');
      const wishBadges = document.querySelectorAll('#wishlistCount, .header-wishlist-badge');
      wishBadges.forEach(b => { b.textContent = savedWish.length; });
    } catch (e) {}
  }

  function bindNavEvents() {
    ensureDrawerElements();

    // 1. Delegated click listener for all hamburger buttons (works for SVG, path, line, or container clicks)
    document.addEventListener('click', function (e) {
      const hamburger = e.target.closest('#hamburgerBtn, .hamburger-btn');
      if (hamburger) {
        e.preventDefault();
        e.stopPropagation();
        toggleMobileDrawer(true);
        return;
      }

      const closeBtn = e.target.closest('#closeMobileNavBtn, .mobile-drawer .btn-close');
      if (closeBtn) {
        e.preventDefault();
        e.stopPropagation();
        toggleMobileDrawer(false);
        return;
      }

      const overlay = e.target.closest('#drawerOverlay, .drawer-overlay');
      if (overlay) {
        toggleMobileDrawer(false);
        return;
      }

      const navLink = e.target.closest('.mobile-nav-link');
      if (navLink) {
        // If it is a regular navigation link (not a button with action), close drawer
        if (navLink.tagName.toLowerCase() === 'a') {
          toggleMobileDrawer(false);
        }
      }
    });

    // 2. Escape key listener to close mobile navigation
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        const drawer = document.getElementById('mobileDrawer');
        if (drawer && drawer.classList.contains('active')) {
          toggleMobileDrawer(false);
        }
      }
    });

    // 3. Highlight current page link if applicable
    try {
      const currentPath = window.location.pathname.split('/').pop() || 'index.html';
      document.querySelectorAll('.mobile-nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href && (href === currentPath || href.startsWith(currentPath + '#'))) {
          link.classList.add('active');
        }
      });
    } catch (e) {}

    // 4. Update header badges from stored state
    syncHeaderBadges();

    // 5. Update Shopify auth state if loaded
    if (window.ShopifyService && typeof window.ShopifyService.syncHeaderAuth === 'function') {
      window.ShopifyService.syncHeaderAuth();
    }

    // 6. Initialize Luxury Rotating Announcement Bar
    initAnnouncementBar();
  }

  /* =========================================================
     LUXURY ROTATING ANNOUNCEMENT BAR ENGINE
     Features:
     - Multi-slide promotion carousel with smooth transitions
     - Left (<) and Right (>) navigation buttons
     - Autoplay timer with pause-on-hover & pause-on-touch
     - Touch swipe gestures (left/right) for mobile
     - Full keyboard accessibility
     - Automatic upgrade if legacy markup exists
     ========================================================= */
  function initAnnouncementBar() {
    const bars = document.querySelectorAll('.announcement-bar');
    if (!bars.length) return;

    bars.forEach(bar => {
      // Prevent multiple initializations on the same element
      if (bar.dataset.carouselInitialized === 'true') return;
      bar.dataset.carouselInitialized = 'true';

      let carousel = bar.querySelector('.announcement-carousel');
      let prevBtn = bar.querySelector('.announcement-prev');
      let nextBtn = bar.querySelector('.announcement-next');

      // If legacy ticker HTML is present, upgrade gracefully
      if (!carousel) {
        const leftBox = bar.querySelector('.announcement-left');
        let itemsHtml = [];
        if (leftBox && leftBox.children.length > 0) {
          itemsHtml = Array.from(leftBox.children).map(span => span.innerHTML.trim());
        }
        if (!itemsHtml.length) {
          itemsHtml = [
            '✦ Free Express Shipping on Orders Above ₹999',
            '♡ Cash on Delivery (COD) Available Across India',
            '🕯️ Bulk Orders Accepted',
            '🌿 100% Natural Botanical Soy Wax',
            '♡ Handcrafted With Love'
          ];
        }

        bar.innerHTML = `
          <button type="button" class="announcement-nav-btn announcement-prev" aria-label="Previous announcement">
            <svg aria-hidden="true" focusable="false" width="11" height="11" viewBox="0 0 16 18" fill="none">
              <path d="M11 1L3 9L11 17" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
            </svg>
          </button>
          <div class="announcement-carousel" id="announcementCarousel">
            ${itemsHtml.map((content, i) => `
              <div class="announcement-item ${i === 0 ? 'active' : ''}" data-index="${i}">
                <span>${content}</span>
              </div>
            `).join('')}
          </div>
          <button type="button" class="announcement-nav-btn announcement-next" aria-label="Next announcement">
            <svg aria-hidden="true" focusable="false" width="11" height="11" viewBox="0 0 16 18" fill="none">
              <path d="M5 17L13 9L5 1" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
            </svg>
          </button>
        `;

        carousel = bar.querySelector('.announcement-carousel');
        prevBtn = bar.querySelector('.announcement-prev');
        nextBtn = bar.querySelector('.announcement-next');
      }

      const items = bar.querySelectorAll('.announcement-item');
      if (items.length <= 1) return;

      let currentIndex = 0;
      let autoplayTimer = null;
      let isTransitioning = false;
      const AUTOPLAY_INTERVAL = 4500;

      function goTo(nextIndex, direction = 'next') {
        if (isTransitioning || nextIndex === currentIndex) return;
        isTransitioning = true;

        const currentItem = items[currentIndex];
        const nextItem = items[nextIndex];

        // Reset state classes
        items.forEach(it => it.classList.remove('slide-out-left', 'slide-out-right'));

        if (direction === 'next') {
          currentItem.classList.add('slide-out-left');
        } else {
          currentItem.classList.add('slide-out-right');
        }

        setTimeout(() => {
          currentItem.classList.remove('active', 'slide-out-left', 'slide-out-right');
          nextItem.classList.add('active');
          currentIndex = nextIndex;
          isTransitioning = false;
        }, 220);
      }

      function nextSlide() {
        const nextIdx = (currentIndex + 1) % items.length;
        goTo(nextIdx, 'next');
      }

      function prevSlide() {
        const prevIdx = (currentIndex - 1 + items.length) % items.length;
        goTo(prevIdx, 'prev');
      }

      function startAutoplay() {
        stopAutoplay();
        autoplayTimer = setInterval(nextSlide, AUTOPLAY_INTERVAL);
      }

      function stopAutoplay() {
        if (autoplayTimer) {
          clearInterval(autoplayTimer);
          autoplayTimer = null;
        }
      }

      // Prev / Next button listeners
      if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          prevSlide();
          startAutoplay();
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          nextSlide();
          startAutoplay();
        });
      }

      // Pause on hover
      bar.addEventListener('mouseenter', stopAutoplay);
      bar.addEventListener('mouseleave', startAutoplay);

      // Mobile Touch Swipe Handling
      let touchStartX = 0;
      let touchStartY = 0;
      bar.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          stopAutoplay();
        }
      }, { passive: true });

      bar.addEventListener('touchend', (e) => {
        if (e.changedTouches.length === 1) {
          const deltaX = e.changedTouches[0].clientX - touchStartX;
          const deltaY = e.changedTouches[0].clientY - touchStartY;
          if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
            if (deltaX < 0) {
              nextSlide();
            } else {
              prevSlide();
            }
          }
          startAutoplay();
        }
      }, { passive: true });

      // Keyboard accessibility
      bar.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
          nextSlide();
          startAutoplay();
        } else if (e.key === 'ArrowLeft') {
          prevSlide();
          startAutoplay();
        }
      });

      // Start auto-rotation
      startAutoplay();
    });
  }

  window.initAnnouncementBar = initAnnouncementBar;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindNavEvents);
  } else {
    bindNavEvents();
  }

  // Also sync when window storage changes (e.g. from other tabs or actions)
  window.addEventListener('storage', syncHeaderBadges);
  window.addEventListener('Candlorre:cartUpdated', syncHeaderBadges);
  window.addEventListener('Candlorre:wishlistUpdated', syncHeaderBadges);
})();
