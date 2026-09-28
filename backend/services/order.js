/**
 * THE Candlorre — ORDER SERVICE
 * Retrieves order details and tracking milestones
 */

import CustomerService from './customer.js';
import { AppError, NotFoundError, ValidationError } from '../utils/errors.js';

export class OrderService {
  /**
   * Look up order by number or ID for authenticated customer
   */
  static async getCustomerOrder(accessToken, orderIdentifier) {
    if (!accessToken) throw new ValidationError('Access token is required');
    if (!orderIdentifier) throw new ValidationError('Order ID is required');

    const customer = await CustomerService.getCustomer(accessToken);
    const cleanId = String(orderIdentifier).replace(/^#/, '').toLowerCase().trim();

    const order = (customer.orders || []).find(o => {
      const num = String(o.orderNumber || '').replace(/^#/, '').toLowerCase().trim();
      const name = String(o.name || '').replace(/^#/, '').toLowerCase().trim();
      const id = String(o.id || '').toLowerCase().trim();
      return num === cleanId || name === cleanId || id === cleanId;
    });

    if (!order) {
      throw new NotFoundError(`Order ${orderIdentifier} was not found in your account.`);
    }

    return order;
  }
}

export default OrderService;
