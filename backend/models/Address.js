/**
 * THE Candlorre — ADDRESS MODEL
 * Manages user delivery addresses with default flags and sanitization.
 */

import db from '../db/index.js';

export class Address {
  static getByUserId(userId) {
    if (!userId) return [];
    return db.addresses.find({ userId });
  }

  static findById(id) {
    return db.addresses.findById(id);
  }

  static async create(userId, addressData) {
    const existing = this.getByUserId(userId);
    const isFirst = existing.length === 0;
    const isDefault = Boolean(addressData.isDefault) || isFirst;

    if (isDefault && existing.length > 0) {
      for (const addr of existing) {
        if (addr.isDefault) {
          await db.addresses.updateById(addr.id, { isDefault: false });
        }
      }
    }

    const newAddress = await db.addresses.create({
      userId,
      firstName: (addressData.firstName || '').trim(),
      lastName: (addressData.lastName || '').trim(),
      phone: (addressData.phone || '').trim(),
      address1: (addressData.address1 || '').trim(),
      address2: (addressData.address2 || '').trim(),
      city: (addressData.city || '').trim(),
      province: (addressData.province || addressData.state || '').trim(),
      zip: (addressData.zip || addressData.pincode || '').trim(),
      country: (addressData.country || 'India').trim(),
      tag: (addressData.tag || 'HOME').toUpperCase(),
      isDefault
    });

    return newAddress;
  }

  static async update(id, userId, updates) {
    const address = db.addresses.findById(id);
    if (!address || address.userId !== userId) {
      return null;
    }

    if (updates.isDefault) {
      const all = this.getByUserId(userId);
      for (const addr of all) {
        if (addr.id !== id && addr.isDefault) {
          await db.addresses.updateById(addr.id, { isDefault: false });
        }
      }
    }

    const payload = {};
    if (updates.firstName !== undefined) payload.firstName = updates.firstName.trim();
    if (updates.lastName !== undefined) payload.lastName = updates.lastName.trim();
    if (updates.phone !== undefined) payload.phone = updates.phone.trim();
    if (updates.address1 !== undefined) payload.address1 = updates.address1.trim();
    if (updates.address2 !== undefined) payload.address2 = updates.address2.trim();
    if (updates.city !== undefined) payload.city = updates.city.trim();
    if (updates.province !== undefined) payload.province = updates.province.trim();
    if (updates.state !== undefined) payload.province = updates.state.trim();
    if (updates.zip !== undefined) payload.zip = updates.zip.trim();
    if (updates.pincode !== undefined) payload.zip = updates.pincode.trim();
    if (updates.country !== undefined) payload.country = updates.country.trim();
    if (updates.tag !== undefined) payload.tag = updates.tag.toUpperCase();
    if (updates.isDefault !== undefined) payload.isDefault = Boolean(updates.isDefault);

    return await db.addresses.updateById(id, payload);
  }

  static async delete(id, userId) {
    const address = db.addresses.findById(id);
    if (!address || address.userId !== userId) {
      return false;
    }

    const wasDefault = address.isDefault;
    await db.addresses.deleteById(id);

    if (wasDefault) {
      const remaining = this.getByUserId(userId);
      if (remaining.length > 0) {
        await db.addresses.updateById(remaining[0].id, { isDefault: true });
      }
    }

    return true;
  }

  static async setDefault(id, userId) {
    const target = db.addresses.findById(id);
    if (!target || target.userId !== userId) {
      return false;
    }

    const all = this.getByUserId(userId);
    for (const addr of all) {
      await db.addresses.updateById(addr.id, { isDefault: addr.id === id });
    }

    return true;
  }
}

export default Address;
