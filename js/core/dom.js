/* =========================================================
   3. DOM ELEMENT REFERENCES
   ========================================================= */
const dom = {
  productGrid: document.getElementById('productGrid'),
  searchInput: document.getElementById('searchInput'),
  searchTrigger: document.getElementById('searchTrigger'),
  categoryTabs: document.querySelectorAll('.category-tabs .tab-btn'),
  
  // Dynamic Header
  headerWrapper: document.getElementById('headerWrapper'),
  headerSpacer: document.getElementById('headerSpacer'),

  // Badges & Counters
  cartCount: document.getElementById('cartCount'),
  cartItemCountDisplay: document.getElementById('cartItemCountDisplay'),
  wishlistCount: document.getElementById('wishlistCount'),
  
  // Wishlist Drawer
  wishlistDrawer: document.getElementById('wishlistDrawer'),
  closeWishlistBtn: document.getElementById('closeWishlistBtn'),
  wishlistItemsContainer: document.getElementById('wishlistItemsContainer'),
  wishlistSubtitle: document.getElementById('wishlistSubtitle'),

  // Search Modal
  searchModal: document.getElementById('searchModal'),
  closeSearchBtn: document.getElementById('closeSearchBtn'),
  headerSearchInput: document.getElementById('headerSearchInput'),
  searchClearBtn: document.getElementById('searchClearBtn'),
  searchResultsContainer: document.getElementById('searchResultsContainer'),

  // Drawer & Overlay
  drawerOverlay: document.getElementById('drawerOverlay'),
  cartDrawer: document.getElementById('cartDrawer'),
  closeCartBtn: document.getElementById('closeCartBtn'),
  cartItemsContainer: document.getElementById('cartItemsContainer'),
  cartSubtotalText: document.getElementById('cartSubtotalText'),
  meterBarFill: document.getElementById('meterBarFill'),
  shippingMeterText: document.getElementById('shippingMeterText'),
  proceedCheckoutBtn: document.getElementById('proceedCheckoutBtn'),

  // Mobile Hamburger Drawer
  hamburgerBtn: document.getElementById('hamburgerBtn'),
  closeMobileNavBtn: document.getElementById('closeMobileNavBtn'),
  mobileDrawer: document.getElementById('mobileDrawer'),
  
  // PDP Quick View Modal (Baobab Luxury System)
  pdpModal: document.getElementById('pdpModal'),
  closePdpBtn: document.getElementById('closePdpBtn'),
  pdpImage: document.getElementById('pdpImage'),
  pdpSliderTrack: document.getElementById('pdpSliderTrack'),
  pdpThumbsRow: document.getElementById('pdpThumbsRow'),
  pdpCategory: document.getElementById('pdpCategory'),
  pdpStockBadge: document.getElementById('pdpStockBadge'),
  pdpTitle: document.getElementById('pdpTitle'),
  pdpPrice: document.getElementById('pdpPrice'),
  pdpOrigPrice: document.getElementById('pdpOrigPrice'),
  pdpDescription: document.getElementById('pdpDescription'),
  pdpTopNotes: document.getElementById('pdpTopNotes'),
  pdpHeartNotes: document.getElementById('pdpHeartNotes'),
  pdpBaseNotes: document.getElementById('pdpBaseNotes'),
  pdpBurnTime: document.getElementById('pdpBurnTime'),
  pdpAddToCartBtn: document.getElementById('pdpAddToCartBtn'),
  pincodeInput: document.getElementById('pincodeInput'),
  checkPincodeBtn: document.getElementById('checkPincodeBtn'),
  pincodeMsg: document.getElementById('pincodeMsg'),
  
  // Variant Selector Elements
  pdpVariantBlock: document.getElementById('pdpVariantBlock'),
  pdpVariantTypeTitle: document.getElementById('pdpVariantTypeTitle'),
  pdpVariantCurrentVal: document.getElementById('pdpVariantCurrentVal'),
  pdpVariantSelectorGrid: document.getElementById('pdpVariantSelectorGrid'),
  pdpVariantWrap: document.getElementById('pdpVariantWrap'),
  pdpVariantSelect: document.getElementById('pdpVariantSelect'),
  pdpBurnDetail: document.getElementById('pdpBurnDetail'),
  pdpDimensions: document.getElementById('pdpDimensions'),
  pdpStock: document.getElementById('pdpStock'),

  // Customer account & tracking
  accountModal: document.getElementById('accountModal'),
  closeAccountBtn: document.getElementById('closeAccountBtn'),
  accountSignInBtn: document.getElementById('accountSignInBtn'),
  accountCreateBtn: document.getElementById('accountCreateBtn'),
  trackModal: document.getElementById('trackModal'),
  closeTrackBtn: document.getElementById('closeTrackBtn'),
  trackOrderForm: document.getElementById('trackOrderForm'),
  trackOrderNumber: document.getElementById('trackOrderNumber'),
  trackOrderEmail: document.getElementById('trackOrderEmail'),
  trackResult: document.getElementById('trackResult'),
  
  // Checkout Modal
  checkoutModal: document.getElementById('checkoutModal'),
  closeCheckoutBtn: document.getElementById('closeCheckoutBtn'),
  checkoutForm: document.getElementById('checkoutForm'),
  checkoutAmountTotal: document.getElementById('checkoutAmountTotal'),
  labelPrepaid: document.getElementById('labelPrepaid'),
  labelCod: document.getElementById('labelCod'),
  
  // Policy Modal
  policyModal: document.getElementById('policyModal'),
  closePolicyBtn: document.getElementById('closePolicyBtn'),
  policyModalTitle: document.getElementById('policyModalTitle'),
  policyModalBody: document.getElementById('policyModalBody'),
  
  // Feedback
  toastNotice: document.getElementById('toastNotice')
};
