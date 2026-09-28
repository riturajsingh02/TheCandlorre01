/* Compatibility entry point. New pages load feature files directly.
   Keep this file for older links or pages that still reference script.js. */
(function () {
  const files = [
    'js/core/data.js','js/core/state.js','js/core/dom.js','js/features/toast.js',
    'js/features/catalog.js','js/features/cart.js','js/features/wishlist.js',
    'js/features/product.js','js/features/checkout.js','js/features/account-tracking.js',
    'js/features/policies.js','js/features/events.js'
  ];
  files.forEach(src => { const s=document.createElement('script'); s.src=src; s.async=false; document.body.appendChild(s); });
})();
