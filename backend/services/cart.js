/**
 * THE Candlorre — SHOPIFY CART SERVICE
 * Creates and updates server-backed Shopify Cart sessions
 */

import ShopifyService from './shopify.js';
import { AppError, ValidationError } from '../utils/errors.js';

export class CartService {
  /**
   * Create a new cart on Shopify
   */
  static async createCart(lines = [], discountCodes = []) {
    const mutation = `
      mutation cartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
            cost {
              totalAmount {
                amount
                currencyCode
              }
              subtotalAmount {
                amount
                currencyCode
              }
              totalTaxAmount {
                amount
                currencyCode
              }
            }
            discountCodes {
              code
              applicable
            }
            lines(first: 50) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      priceV2 {
                        amount
                        currencyCode
                      }
                      product {
                        id
                        title
                        handle
                        images(first: 1) {
                          edges {
                            node {
                              url
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const formattedLines = lines.map(line => ({
      merchandiseId: line.merchandiseId || line.variantId || line.shopifyVariantId,
      quantity: Math.max(1, parseInt(line.quantity || line.qty, 10) || 1)
    })).filter(line => Boolean(line.merchandiseId));

    const data = await ShopifyService.request(mutation, {
      input: {
        lines: formattedLines,
        discountCodes: discountCodes.filter(Boolean)
      }
    });

    const result = data?.cartCreate;
    if (result?.userErrors && result.userErrors.length > 0) {
      throw new AppError(result.userErrors[0].message, 400);
    }

    return this.formatCart(result?.cart);
  }

  /**
   * Fetch an existing cart
   */
  static async getCart(cartId) {
    if (!cartId) throw new ValidationError('Cart ID is required.');

    const query = `
      query getCart($id: ID!) {
        cart(id: $id) {
          id
          checkoutUrl
          cost {
            totalAmount {
              amount
              currencyCode
            }
            subtotalAmount {
              amount
              currencyCode
            }
          }
          discountCodes {
            code
            applicable
          }
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    priceV2 {
                      amount
                      currencyCode
                    }
                    product {
                      id
                      title
                      handle
                      images(first: 1) {
                        edges {
                          node {
                            url
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const data = await ShopifyService.request(query, { id: cartId });
    if (!data?.cart) return null;
    return this.formatCart(data.cart);
  }

  /**
   * Add lines to existing cart
   */
  static async addLines(cartId, lines) {
    if (!cartId) throw new ValidationError('Cart ID is required.');

    const mutation = `
      mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
        cartLinesAdd(cartId: $cartId, lines: $lines) {
          cart {
            id
            checkoutUrl
            cost {
              totalAmount {
                amount
                currencyCode
              }
              subtotalAmount {
                amount
                currencyCode
              }
            }
            lines(first: 50) {
              edges {
                node {
                  id
                  quantity
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const formattedLines = lines.map(line => ({
      merchandiseId: line.merchandiseId || line.variantId || line.shopifyVariantId,
      quantity: Math.max(1, parseInt(line.quantity || line.qty, 10) || 1)
    }));

    const data = await ShopifyService.request(mutation, { cartId, lines: formattedLines });
    const result = data?.cartLinesAdd;
    if (result?.userErrors && result.userErrors.length > 0) {
      throw new AppError(result.userErrors[0].message, 400);
    }

    return await this.getCart(cartId);
  }

  /**
   * Update line quantities in cart
   */
  static async updateLines(cartId, lines) {
    if (!cartId) throw new ValidationError('Cart ID is required.');

    const mutation = `
      mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
        cartLinesUpdate(cartId: $cartId, lines: $lines) {
          cart {
            id
            checkoutUrl
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const data = await ShopifyService.request(mutation, { cartId, lines });
    const result = data?.cartLinesUpdate;
    if (result?.userErrors && result.userErrors.length > 0) {
      throw new AppError(result.userErrors[0].message, 400);
    }

    return await this.getCart(cartId);
  }

  /**
   * Remove lines from cart
   */
  static async removeLines(cartId, lineIds) {
    if (!cartId) throw new ValidationError('Cart ID is required.');

    const mutation = `
      mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
        cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
          cart {
            id
            checkoutUrl
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const data = await ShopifyService.request(mutation, { cartId, lineIds });
    const result = data?.cartLinesRemove;
    if (result?.userErrors && result.userErrors.length > 0) {
      throw new AppError(result.userErrors[0].message, 400);
    }

    return await this.getCart(cartId);
  }

  /**
   * Update discount codes on cart
   */
  static async updateDiscountCodes(cartId, discountCodes = []) {
    if (!cartId) throw new ValidationError('Cart ID is required.');

    const mutation = `
      mutation cartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]) {
        cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
          cart {
            id
            checkoutUrl
            discountCodes {
              code
              applicable
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const data = await ShopifyService.request(mutation, { cartId, discountCodes });
    const result = data?.cartDiscountCodesUpdate;
    if (result?.userErrors && result.userErrors.length > 0) {
      throw new AppError(result.userErrors[0].message, 400);
    }

    return await this.getCart(cartId);
  }

  /**
   * Helper to format Cart representation
   */
  static formatCart(cart) {
    if (!cart) return null;

    const items = (cart.lines?.edges || []).map(edge => {
      const node = edge.node;
      const variant = node.merchandise || {};
      const product = variant.product || {};
      return {
        id: node.id,
        lineId: node.id,
        quantity: node.quantity,
        variantId: variant.id,
        variantTitle: variant.title,
        price: parseFloat(variant.priceV2?.amount || 0),
        currency: variant.priceV2?.currencyCode || 'INR',
        productTitle: product.title || '',
        productHandle: product.handle || '',
        image: product.images?.edges?.[0]?.node?.url || 'asset/one.jpg'
      };
    });

    return {
      id: cart.id,
      checkoutUrl: cart.checkoutUrl,
      subtotal: parseFloat(cart.cost?.subtotalAmount?.amount || 0),
      total: parseFloat(cart.cost?.totalAmount?.amount || 0),
      currency: cart.cost?.totalAmount?.currencyCode || 'INR',
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      discountCodes: cart.discountCodes || [],
      items
    };
  }
}

export default CartService;
