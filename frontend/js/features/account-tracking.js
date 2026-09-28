/* =========================================================
   10. CUSTOMER ACCOUNT & ORDER TRACKING
   ========================================================= */
function openAccountModal() {
  if (!dom.accountModal) return;
  const accountUrl = Candlorre_CONFIG.customerAccountUrl || '/account';
  if (dom.accountSignInBtn) dom.accountSignInBtn.href = accountUrl;
  if (dom.accountCreateBtn) dom.accountCreateBtn.href = accountUrl;
  dom.accountModal.classList.add('active');
  dom.drawerOverlay?.classList.add('active');
}

function closeAccountModal() {
  dom.accountModal?.classList.remove('active');
  dom.drawerOverlay?.classList.remove('active');
}

function openTrackModal() {
  if (!dom.trackModal) return;
  if (dom.trackResult) {
    dom.trackResult.classList.remove('show');
    dom.trackResult.textContent = '';
  }
  dom.trackModal.classList.add('active');
  dom.drawerOverlay?.classList.add('active');
}

function closeTrackModal() {
  dom.trackModal?.classList.remove('active');
  dom.drawerOverlay?.classList.remove('active');
}

async function trackOrder(e) {
  e.preventDefault();
  const orderNumber = dom.trackOrderNumber?.value.trim();
  const email = dom.trackOrderEmail?.value.trim();
  if (!dom.trackResult) return;

  dom.trackResult.classList.add('show');
  dom.trackResult.textContent = 'Looking up your order…';

  try {
    if (Candlorre_CONFIG.orderTrackingEndpoint) {
      const response = await fetch(Candlorre_CONFIG.orderTrackingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, email })
      });
      if (!response.ok) throw new Error('Tracking request failed');
      const result = await response.json();
      if (result.found) {
        dom.trackResult.textContent = `${result.status || 'Order found'}${result.eta ? ` • ETA ${result.eta}` : ''}${result.trackingUrl ? ' • Tracking link is ready.' : ''}`;
        if (result.trackingUrl) {
          dom.trackResult.innerHTML += ` <a href="${result.trackingUrl}" target="_blank" rel="noopener">Open tracking</a>`;
        }
      } else {
        dom.trackResult.textContent = 'No matching order was found. Please check the order number and email.';
      }
      return;
    }

    dom.trackResult.innerHTML = `Order <strong>${orderNumber}</strong> was submitted for lookup. For live tracking, connect the Shopify/courier tracking endpoint in <code>Candlorre_CONFIG.orderTrackingEndpoint</code>, or sign in to your customer account to view order status.`;
  } catch (error) {
    dom.trackResult.textContent = 'We could not reach the tracking service right now. Please try again or use your Shopify order-status link from the confirmation email.';
  }
}

