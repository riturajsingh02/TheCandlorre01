/* =========================================================
   4. TOAST NOTIFICATION UTILITY
   ========================================================= */
let toastTimeoutId = null;

function showToast(message) {
  const toastEl = (typeof dom !== 'undefined' && dom.toastNotice) || document.getElementById('toastNotice');
  if (!toastEl) return;

  // Clear any existing active timeout so toasts don't conflict
  if (toastTimeoutId) {
    clearTimeout(toastTimeoutId);
    toastTimeoutId = null;
  }

  toastEl.textContent = message;
  toastEl.classList.remove('show');
  
  // Force browser reflow to restart animation smoothly if rapidly triggered
  void toastEl.offsetWidth;

  toastEl.classList.add('show');

  // Allow user to tap/click to dismiss instantly on mobile or desktop
  toastEl.onclick = function() {
    toastEl.classList.remove('show');
    if (toastTimeoutId) {
      clearTimeout(toastTimeoutId);
      toastTimeoutId = null;
    }
  };

  toastTimeoutId = setTimeout(() => {
    toastEl.classList.remove('show');
    toastTimeoutId = null;
  }, 2800);
}

window.showToast = showToast;
