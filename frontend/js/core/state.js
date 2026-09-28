/* =========================================================
   2. APPLICATION STATE
   ========================================================= */
let cart = JSON.parse(localStorage.getItem('theCandlorre_cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('theCandlorre_wishlist')) || [];
let activeCategory = 'all';
let selectedPaymentMethod = 'prepaid';
let activePdpProductId = null;
let activePdpVariantId = null;
let currentPdpIndex = 0;
let currentPdpImages = [];
