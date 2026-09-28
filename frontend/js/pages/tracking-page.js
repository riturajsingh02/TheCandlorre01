function trackOrderPage() {
  const val = document.getElementById('orderIdInput')?.value.trim();
  const res = document.getElementById('trackingResult');
  if (!res) return;
  if (val && val.length > 3) {
    res.style.display = 'block';
  } else {
    alert('Please enter a valid Order ID or Mobile Number.');
  }
}
window.trackOrder = trackOrderPage;

// Header counters and mobile drawer
document.addEventListener('DOMContentLoaded', () => {
  try {
    const savedCart = JSON.parse(localStorage.getItem('theCandlorre_cart') || '[]');
    const count = savedCart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const cartBadge = document.getElementById('cartCount');
    if (cartBadge) cartBadge.textContent = count;
    
    const savedWish = JSON.parse(localStorage.getItem('theCandlorre_wishlist') || '[]');
    const wishBadge = document.getElementById('wishlistCount');
    if (wishBadge) wishBadge.textContent = savedWish.length;
  } catch (e) {}

  const mobDrawer = document.getElementById('mobileDrawer');
  const drawerOverlay = document.getElementById('drawerOverlay');
  document.getElementById('hamburgerBtn')?.addEventListener('click', () => {
    mobDrawer?.classList.add('active');
    drawerOverlay?.classList.add('active');
  });
  document.getElementById('closeMobileNavBtn')?.addEventListener('click', () => {
    mobDrawer?.classList.remove('active');
    drawerOverlay?.classList.remove('active');
  });
  drawerOverlay?.addEventListener('click', () => {
    mobDrawer?.classList.remove('active');
    drawerOverlay?.classList.remove('active');
  });
});

