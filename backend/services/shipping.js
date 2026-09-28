/**
 * THE Candlorre — SHIPPING & TRACKING SERVICE
 * Handles Indian postal pincode verification, reverse geocoding, and parcel tracking.
 */

import { isValidIndianPincode } from '../utils/validation.js';
import { config } from '../config/env.js';

// Custom list of serviceable Indian pincodes (add or modify pincodes here)
export const SERVICEABLE_PINCODES = [
  '263001',
  '263002'
];

export class ShippingService {
  /**
   * Check Indian PIN code serviceability
   */
  static async checkPincode(pincode) {
    const clean = String(pincode || '').trim();
    if (!isValidIndianPincode(clean)) {
      return {
        serviceable: false,
        pincode: clean,
        error: 'Please enter a valid 6-digit Indian PIN code.',
        message: 'Please enter a valid 6-digit Indian PIN code.'
      };
    }

    // If external courier API endpoint configured, call it
    if (config.tracking.orderTrackingEndpoint) {
      try {
        const resp = await fetch(config.tracking.orderTrackingEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pincode: clean })
        });
        if (resp.ok) {
          const data = await resp.json();
          return data;
        }
      } catch (err) {
        console.warn('External shipping service check failed:', err.message);
      }
    }

    // Check against custom serviceable pincodes list
    const isServiceable = SERVICEABLE_PINCODES.includes(clean);

    if (isServiceable) {
      return {
        serviceable: true,
        pincode: clean,
        courier: 'Bluedart & Delhivery Express',
        estimatedDays: '2–3 Business Days',
        eta: '2–3 Days',
        cod: true,
        codAvailable: true,
        message: `✓ Delivery and COD are available for PIN code ${clean}.`
      };
    }

    return {
      serviceable: false,
      pincode: clean,
      cod: false,
      codAvailable: false,
      message: `Delivery is currently unavailable for PIN code ${clean}.`
    };
  }

  /**
   * Reverse geocode coordinates to street address
   */
  static async reverseGeocode(latitude, longitude) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      throw new Error('Invalid coordinates provided.');
    }

    // 1. Primary: Nominatim OpenStreetMap
    try {
      const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
      const response = await fetch(geoUrl, {
        headers: {
          'User-Agent': 'TheCandlorre/1.0 (concierge@theCandlorre.com)',
          'Accept-Language': 'en'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const addr = data.address || {};

        const line1Parts = [
          addr.house_number || addr.building || '',
          addr.road || addr.street || addr.residential || ''
        ].filter(Boolean);

        const line2Parts = [
          addr.suburb || addr.neighbourhood || addr.quarter || addr.commercial || '',
          addr.city_district || addr.hamlet || ''
        ].filter(Boolean);

        const city = addr.city || addr.town || addr.village || addr.municipality || addr.state_district || addr.county || '';
        const rawPostcode = (addr.postcode || '').replace(/\D/g, '');
        const pincode = rawPostcode.length >= 6 ? rawPostcode.slice(0, 6) : rawPostcode;

        return {
          address1: line1Parts.join(', ') || (data.name !== city ? data.name : ''),
          address2: line2Parts.join(', '),
          city: city,
          state: addr.state || '',
          pincode: pincode,
          country: addr.country || 'India'
        };
      }
    } catch (err) {
      console.warn('Nominatim reverse geocode lookup failed:', err.message);
    }

    // 2. Fallback: Photon Komoot OSM
    try {
      const photonUrl = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
      const response = await fetch(photonUrl, {
        headers: {
          'User-Agent': 'TheCandlorre/1.0',
          'Accept-Language': 'en'
        }
      });

      if (response.ok) {
        const pData = await response.json();
        const props = pData.features?.[0]?.properties || {};
        const line1 = [props.housenumber, props.street].filter(Boolean).join(' ') || props.name || '';
        const line2 = [props.district, props.locality].filter(Boolean).join(', ');
        const rawPostcode = (props.postcode || '').replace(/\D/g, '');
        const pincode = rawPostcode.length >= 6 ? rawPostcode.slice(0, 6) : rawPostcode;

        return {
          address1: line1,
          address2: line2,
          city: props.city || props.town || props.county || '',
          state: props.state || '',
          pincode: pincode,
          country: props.country || 'India'
        };
      }
    } catch (pErr) {
      console.warn('Photon reverse geocode lookup failed:', pErr.message);
    }

    throw new Error('Unable to determine location from coordinates.');
  }
}

export default ShippingService;
