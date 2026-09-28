/**
 * THE Candlorre — CUSTOMER ACCOUNT SERVICE
 * Interacts with Shopify Customer Account APIs
 */

import ShopifyService from './shopify.js';
import { AppError, AuthError, ValidationError } from '../utils/errors.js';
import { isValidEmail } from '../utils/validation.js';

export class CustomerService {
  /**
   * Authenticate customer with Shopify
   */
  static async login(email, password) {
    if (!email || !password) {
      throw new ValidationError('Email address and password are required.');
    }
    if (!isValidEmail(email)) {
      throw new ValidationError('Please provide a valid email address.');
    }

    const mutation = `
      mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
        customerAccessTokenCreate(input: $input) {
          customerAccessToken {
            accessToken
            expiresAt
          }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `;

    const data = await ShopifyService.request(mutation, {
      input: { email, password }
    });

    const result = data?.customerAccessTokenCreate;
    if (result?.customerUserErrors && result.customerUserErrors.length > 0) {
      throw new AppError(result.customerUserErrors[0].message, 401, 'INVALID_CREDENTIALS');
    }

    if (!result?.customerAccessToken) {
      throw new AppError('Invalid email or password. Please verify your credentials.', 401, 'INVALID_CREDENTIALS');
    }

    const { accessToken, expiresAt } = result.customerAccessToken;
    const customer = await this.getCustomer(accessToken);

    return {
      accessToken,
      expiresAt,
      customer
    };
  }

  /**
   * Register a new customer in Shopify
   */
  static async register({ firstName, lastName, email, phone, password }) {
    if (!email || !password) {
      throw new ValidationError('Email and password are required.');
    }
    if (!isValidEmail(email)) {
      throw new ValidationError('Please provide a valid email address.');
    }
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters in length.');
    }

    const mutation = `
      mutation customerCreate($input: CustomerCreateInput!) {
        customerCreate(input: $input) {
          customer {
            id
            email
            firstName
            lastName
          }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `;

    const data = await ShopifyService.request(mutation, {
      input: {
        firstName: firstName || '',
        lastName: lastName || '',
        email,
        phone: phone || undefined,
        password
      }
    });

    const result = data?.customerCreate;
    if (result?.customerUserErrors && result.customerUserErrors.length > 0) {
      throw new AppError(result.customerUserErrors[0].message, 400, 'REGISTRATION_ERROR');
    }

    // Auto-login to obtain session token immediately
    return await this.login(email, password);
  }

  /**
   * Send password recovery email via Shopify
   */
  static async recoverPassword(email) {
    if (!email || !isValidEmail(email)) {
      throw new ValidationError('Please enter a valid registered email address.');
    }

    const mutation = `
      mutation customerRecover($email: String!) {
        customerRecover(email: $email) {
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `;

    const data = await ShopifyService.request(mutation, { email });
    const result = data?.customerRecover;

    if (result?.customerUserErrors && result.customerUserErrors.length > 0) {
      throw new AppError(result.customerUserErrors[0].message, 400, 'RECOVERY_ERROR');
    }

    return { success: true, message: 'Password recovery email has been dispatched.' };
  }

  /**
   * Fetch customer profile, addresses, and real order history
   */
  static async getCustomer(accessToken) {
    if (!accessToken) {
      throw new AuthError('Customer access token is required.');
    }

    const query = `
      query getCustomer($token: String!) {
        customer(customerAccessToken: $token) {
          id
          firstName
          lastName
          displayName
          email
          phone
          createdAt
          defaultAddress {
            id
            firstName
            lastName
            address1
            address2
            city
            province
            zip
            country
            phone
          }
          addresses(first: 20) {
            edges {
              node {
                id
                firstName
                lastName
                address1
                address2
                city
                province
                zip
                country
                phone
              }
            }
          }
          orders(first: 20, sortKey: PROCESSED_AT, reverse: true) {
            edges {
              node {
                id
                name
                orderNumber
                processedAt
                financialStatus
                fulfillmentStatus
                currencyCode
                totalPriceV2 {
                  amount
                  currencyCode
                }
                subtotalPriceV2 {
                  amount
                  currencyCode
                }
                totalTaxV2 {
                  amount
                  currencyCode
                }
                shippingAddress {
                  firstName
                  lastName
                  address1
                  address2
                  city
                  province
                  zip
                  country
                  phone
                }
                successfulFulfillments(first: 5) {
                  trackingCompany
                  trackingInfo(first: 5) {
                    number
                    url
                  }
                }
                lineItems(first: 25) {
                  edges {
                    node {
                      title
                      quantity
                      variant {
                        id
                        title
                        priceV2 {
                          amount
                        }
                        image {
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
    `;

    const data = await ShopifyService.request(query, { token: accessToken });
    const cust = data?.customer;
    if (!cust) {
      throw new AuthError('Customer session expired or invalid. Please sign in again.');
    }

    return this.formatCustomer(cust);
  }

  /**
   * Update customer profile info (first name, last name, phone)
   */
  static async updateProfile(accessToken, { firstName, lastName, phone }) {
    if (!accessToken) throw new AuthError();

    const mutation = `
      mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
        customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
          customer {
            id
            firstName
            lastName
            email
            phone
          }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `;

    const data = await ShopifyService.request(mutation, {
      customerAccessToken: accessToken,
      customer: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined
      }
    });

    const result = data?.customerUpdate;
    if (result?.customerUserErrors && result.customerUserErrors.length > 0) {
      throw new AppError(result.customerUserErrors[0].message, 400);
    }

    return await this.getCustomer(accessToken);
  }

  /**
   * Create new address for customer
   */
  static async createAddress(accessToken, addressData) {
    if (!accessToken) throw new AuthError();

    const mutation = `
      mutation customerAddressCreate($customerAccessToken: String!, $address: MailingAddressInput!) {
        customerAddressCreate(customerAccessToken: $customerAccessToken, address: $address) {
          customerAddress {
            id
          }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `;

    const data = await ShopifyService.request(mutation, {
      customerAccessToken: accessToken,
      address: {
        firstName: addressData.firstName || '',
        lastName: addressData.lastName || '',
        address1: addressData.address1 || '',
        address2: addressData.address2 || '',
        city: addressData.city || '',
        province: addressData.province || addressData.state || '',
        zip: addressData.zip || addressData.pincode || '',
        country: addressData.country || 'India',
        phone: addressData.phone || ''
      }
    });

    const result = data?.customerAddressCreate;
    if (result?.customerUserErrors && result.customerUserErrors.length > 0) {
      throw new AppError(result.customerUserErrors[0].message, 400);
    }

    const newAddressId = result?.customerAddress?.id;
    if (addressData.isDefault && newAddressId) {
      await this.setDefaultAddress(accessToken, newAddressId);
    }

    return await this.getCustomer(accessToken);
  }

  /**
   * Update existing address for customer
   */
  static async updateAddress(accessToken, addressId, addressData) {
    if (!accessToken) throw new AuthError();

    const mutation = `
      mutation customerAddressUpdate($customerAccessToken: String!, $id: ID!, $address: MailingAddressInput!) {
        customerAddressUpdate(customerAccessToken: $customerAccessToken, id: $id, address: $address) {
          customerAddress {
            id
          }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `;

    const data = await ShopifyService.request(mutation, {
      customerAccessToken: accessToken,
      id: addressId,
      address: {
        firstName: addressData.firstName,
        lastName: addressData.lastName,
        address1: addressData.address1,
        address2: addressData.address2 || '',
        city: addressData.city,
        province: addressData.province || addressData.state,
        zip: addressData.zip || addressData.pincode,
        country: addressData.country || 'India',
        phone: addressData.phone
      }
    });

    const result = data?.customerAddressUpdate;
    if (result?.customerUserErrors && result.customerUserErrors.length > 0) {
      throw new AppError(result.customerUserErrors[0].message, 400);
    }

    if (addressData.isDefault) {
      await this.setDefaultAddress(accessToken, addressId);
    }

    return await this.getCustomer(accessToken);
  }

  /**
   * Delete address from Shopify customer
   */
  static async deleteAddress(accessToken, addressId) {
    if (!accessToken) throw new AuthError();

    const mutation = `
      mutation customerAddressDelete($id: ID!, $customerAccessToken: String!) {
        customerAddressDelete(id: $id, customerAccessToken: $customerAccessToken) {
          deletedCustomerAddressId
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `;

    const data = await ShopifyService.request(mutation, {
      id: addressId,
      customerAccessToken: accessToken
    });

    const result = data?.customerAddressDelete;
    if (result?.customerUserErrors && result.customerUserErrors.length > 0) {
      throw new AppError(result.customerUserErrors[0].message, 400);
    }

    return await this.getCustomer(accessToken);
  }

  /**
   * Set default address
   */
  static async setDefaultAddress(accessToken, addressId) {
    if (!accessToken) throw new AuthError();

    const mutation = `
      mutation customerDefaultAddressUpdate($customerAccessToken: String!, $addressId: ID!) {
        customerDefaultAddressUpdate(customerAccessToken: $customerAccessToken, addressId: $addressId) {
          customer {
            id
          }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `;

    const data = await ShopifyService.request(mutation, {
      customerAccessToken: accessToken,
      addressId
    });

    const result = data?.customerDefaultAddressUpdate;
    if (result?.customerUserErrors && result.customerUserErrors.length > 0) {
      throw new AppError(result.customerUserErrors[0].message, 400);
    }

    return true;
  }

  /**
   * Helper to format Shopify customer payload
   */
  static formatCustomer(raw) {
    return {
      id: raw.id,
      firstName: raw.firstName || '',
      lastName: raw.lastName || '',
      displayName: raw.displayName || `${raw.firstName || ''} ${raw.lastName || ''}`.trim() || 'Client',
      email: raw.email,
      phone: raw.phone || '',
      createdAt: raw.createdAt,
      tier: 'Sanctuary Connoisseur',
      defaultAddress: raw.defaultAddress || null,
      addresses: (raw.addresses?.edges || []).map(e => e.node),
      orders: (raw.orders?.edges || []).map(e => {
        const o = e.node;
        const fulfillment = o.successfulFulfillments?.[0];
        const trackInfo = fulfillment?.trackingInfo?.[0];
        return {
          id: o.id,
          orderNumber: o.orderNumber ? `TC${o.orderNumber}` : o.name,
          name: o.name,
          processedAt: o.processedAt,
          financialStatus: o.financialStatus,
          fulfillmentStatus: o.fulfillmentStatus,
          currencyCode: o.currencyCode || 'INR',
          totalPrice: parseFloat(o.totalPriceV2?.amount || 0),
          subtotalPrice: parseFloat(o.subtotalPriceV2?.amount || 0),
          totalTax: parseFloat(o.totalTaxV2?.amount || 0),
          shippingAddress: o.shippingAddress,
          tracking: {
            courier: fulfillment?.trackingCompany || 'Bluedart Express',
            trackingNumber: trackInfo?.number || 'IN-TRANSIT',
            trackingUrl: trackInfo?.url || '',
            status: o.fulfillmentStatus === 'FULFILLED' ? 'Delivered' : (o.fulfillmentStatus === 'UNFULFILLED' ? 'Confirmed & Packaging' : 'In Transit')
          },
          lineItems: (o.lineItems?.edges || []).map(li => ({
            title: li.node.title,
            variantTitle: li.node.variant?.title || '',
            quantity: li.node.quantity,
            price: parseFloat(li.node.variant?.priceV2?.amount || 0),
            image: li.node.variant?.image?.url || 'asset/one.jpg'
          }))
        };
      })
    };
  }
}

export default CustomerService;
