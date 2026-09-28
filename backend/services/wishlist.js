/**
 * THE Candlorre — WISHLIST SERVICE
 * Handles guest and customer wishlist state
 */

export class WishlistService {
  /**
   * Validate and format wishlist items
   */
  static formatWishlist(items = []) {
    return items.map(item => ({
      id: item.id || item.shopifyId,
      title: item.title || '',
      category: item.category || 'Premium Luxury Candles',
      price: Number(item.price || 0),
      origPrice: Number(item.origPrice || item.price || 0),
      image: item.image || 'asset/one.jpg',
      available: item.available !== false
    }));
  }
}

export default WishlistService;
