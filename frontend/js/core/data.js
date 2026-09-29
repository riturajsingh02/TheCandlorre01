/* =========================================================
   THE Candlorre — INTEGRATION SETTINGS & INVENTORY
   ========================================================= */

const Candlorre_CONFIG = {
  shopifyStoreDomain: window.SHOPIFY_STORE_DOMAIN || '',
  shopifyStorefrontToken: window.SHOPIFY_STOREFRONT_TOKEN || '',
  shopifyApiVersion: '2024-04',
  razorpayKeyId: window.RAZORPAY_KEY_ID || '',
  customerAccountUrl: '/account.html',
  pincodeServiceabilityEndpoint: '/api/check-pincode',
  orderTrackingEndpoint: '',
  ga4MeasurementId: '',
  metaPixelId: ''
};

// Asynchronously fetch server-side configuration if available
(function initConfig() {
  if (typeof fetch === 'function') {
    fetch('/api/config')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && typeof data === 'object') {
          if (data.shopifyStoreDomain && !Candlorre_CONFIG.shopifyStoreDomain) {
            Candlorre_CONFIG.shopifyStoreDomain = data.shopifyStoreDomain;
          }
          if (data.shopifyStorefrontToken && !Candlorre_CONFIG.shopifyStorefrontToken) {
            Candlorre_CONFIG.shopifyStorefrontToken = data.shopifyStorefrontToken;
          }
          if (data.shopifyApiVersion) {
            Candlorre_CONFIG.shopifyApiVersion = data.shopifyApiVersion;
          }
          if (data.razorpayKeyId) {
            Candlorre_CONFIG.razorpayKeyId = data.razorpayKeyId;
          }
          if (data.ga4MeasurementId) {
            Candlorre_CONFIG.ga4MeasurementId = data.ga4MeasurementId;
          }
          if (data.metaPixelId) {
            Candlorre_CONFIG.metaPixelId = data.metaPixelId;
          }
          if (data.orderTrackingEndpoint) {
            Candlorre_CONFIG.orderTrackingEndpoint = data.orderTrackingEndpoint;
          }
          if (window.CandlorreAnalytics && typeof window.CandlorreAnalytics.init === 'function') {
            window.CandlorreAnalytics.init(Candlorre_CONFIG);
          }
        }
      })
      .catch(() => {});
  }

  // Real-time catalog & products synchronization from backend database
  if (typeof fetch === 'function') {
    fetch('/api/products?limit=100')
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        const remoteProds = json?.data?.products || json?.products;
        if (Array.isArray(remoteProds) && remoteProds.length > 0) {
          // Merge real backend products with local inventory
          remoteProds.forEach(remoteItem => {
            const existing = (window.CANDLE_INVENTORY || []).find(local =>
              String(local.id) === String(remoteItem.id) ||
              (local.handle && remoteItem.handle && local.handle === remoteItem.handle)
            );
            if (existing) {
              if (remoteItem.price !== undefined) existing.price = Number(remoteItem.price);
              if (remoteItem.origPrice !== undefined) existing.origPrice = Number(remoteItem.origPrice);
              if (remoteItem.stock !== undefined) existing.stock = Number(remoteItem.stock);
              if (remoteItem.available !== undefined) existing.available = Boolean(remoteItem.available);
              if (Array.isArray(remoteItem.variants) && remoteItem.variants.length > 0) {
                remoteItem.variants.forEach(rv => {
                  const ev = (existing.variants || []).find(v => v.id === rv.id || (v.sku && rv.sku && v.sku === rv.sku));
                  if (ev) {
                    if (rv.price !== undefined) ev.price = Number(rv.price);
                    if (rv.stock !== undefined) ev.stock = Number(rv.stock);
                    if (rv.available !== undefined) ev.available = Boolean(rv.available);
                  }
                });
              }
            } else if (remoteItem.id && remoteItem.title) {
              window.CANDLE_INVENTORY.push(remoteItem);
            }
          });

          // Dispatch catalog update notification
          window.dispatchEvent(new CustomEvent('Candlorre:catalogLoaded', { detail: { count: window.CANDLE_INVENTORY.length } }));
          if (typeof window.filterProducts === 'function') {
            try { window.filterProducts(); } catch (e) {}
          }
        }
      })
      .catch(() => {});
  }

  // Real-time stock synchronization with backend alerts & snapshots
  if (typeof fetch === 'function') {
    fetch('/api/inventory-status')
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        if (json && json.data && json.data.inventory && Array.isArray(window.CANDLE_INVENTORY)) {
          const invMap = json.data.inventory;
          window.CANDLE_INVENTORY.forEach(prod => {
            let prodStock = 0;
            if (Array.isArray(prod.variants)) {
              prod.variants.forEach(v => {
                const match = Object.values(invMap).find(s => 
                  s.variantId === v.id || 
                  (s.sku && v.sku && s.sku === v.sku) ||
                  (s.variantTitle && v.title && s.variantTitle.toLowerCase() === v.title.toLowerCase() && s.productId === String(prod.id))
                );
                if (match) {
                  v.stock = match.quantity;
                  v.available = match.available;
                  v.isOutOfStock = match.isOutOfStock;
                  v.isCritical = match.isCritical;
                  v.isLowStock = match.isLowStock;
                }
                prodStock += (v.stock || 0);
              });
              if (prod.variants.length > 0) {
                prod.stock = prodStock;
              }
            }
          });
        }
      })
      .catch(() => {});
  }
})();

/* =========================================================
   STORE CATEGORIES
   ========================================================= */
const storeCategories = [
  "Premium Luxury Candles",
  "Metal Collection",
  "Diffusers and Aromas",
  "Wooden Collection",
  "Home essentials",
  "Seven Chakra- Positivity collection",
  "Candle Accessories"
];

/* =========================================================
   CANDLE INVENTORY (BAOBAB LUXURY ARCHITECTURE)
   Strictly filtering out items marked 'x' or 'X' from spreadsheet.
   Includes interactive multi-variant models for Black/Amber, 
   Large/Small sizes, and Multi-set colors.
   ========================================================= */

const CANDLE_INVENTORY = [
  // 1. DIAMOND GLOW JAR (Variants: Black & Amber — White excluded as per spreadsheet)
  {
    id: 5,
    handle: "diamond-glow-jar",
    title: "Diamond Glow Jar",
    category: "Premium Luxury Candles",
    variantType: "color",
    variantTypeLabel: "Finish & Scent",
    price: 849,
    origPrice: 999,
    burn: "45-55 Hours",
    badge: "BESTSELLER",
    isComingSoon: false,
    notes: {
      top: "Bourbon Vanilla & Smoked Amber",
      heart: "Raw Cacao Bean & Velvet Rose",
      base: "Rich Patchouli & Toasted Cedar"
    },
    image: "asset/Diamond Glow Jar – Black.jpg",
    images: [
      "asset/Diamond Glow Jar – Black.jpg",
      "asset/Diamond Glow Jar – Black_2.jpg",
      "asset/Diamond Glow Jar – Black_3.jpg",
      "asset/Diamond Glow Jar – Black_4.jpg"
    ],
    desc: "Handcrafted geometric diamond-faceted vessel made from hand-blown artisan glass. Formulated with 100% natural botanical soy wax and therapeutic essential oils.",
    dimensions: "9 × 9 × 11 cm (320g Wax)",
    stock: 35,
    variants: [
      {
        id: "diamond-glow-black",
        title: "Black",
        colorHex: "#1c1917",
        price: 849,
        origPrice: 999,
        burn: "45-55 Hours",
        dimensions: "9 × 9 × 11 cm (320g Wax)",
        available: true,
        stock: 18,
        badge: "BESTSELLER",
        notes: {
          top: "Bourbon Vanilla & Smoked Amber",
          heart: "Raw Cacao Bean & Velvet Rose",
          base: "Rich Patchouli & Toasted Cedar"
        },
        desc: "The Diamond Glow Jar in Onyx Black pairs geometric crystalline facet glass with a rich, hypnotic nocturnal blend of smoky bourbon vanilla, dark cacao, and aged cedarwood.",
        image: "asset/Diamond Glow Jar – Black.jpg",
        images: [
          "asset/Diamond Glow Jar – Black.jpg",
          "asset/Diamond Glow Jar – Black_2.jpg",
          "asset/Diamond Glow Jar – Black_3.jpg",
          "asset/Diamond Glow Jar – Black_4.jpg"
        ]
      },
      {
        id: "diamond-glow-amber",
        title: "Amber",
        colorHex: "#d97706",
        price: 849,
        origPrice: 999,
        burn: "45-55 Hours",
        dimensions: "9 × 9 × 11 cm (320g Wax)",
        available: true,
        stock: 17,
        badge: "NEW ARRIVAL",
        notes: {
          top: "Golden Honeyed Amber & Bergamot",
          heart: "Spiced Clove, Fig & Cinnamon",
          base: "Madagascar Vanilla & Benzoin"
        },
        desc: "The Diamond Glow Jar in Sunlit Amber radiates a golden hearth glow. Its hand-textured faceted vessel diffuses warm hypnotic shadows alongside soothing therapeutic amber and honeyed fig.",
        image: "asset/Diamond Glow Jar – Amber.jpg",
        images: [
          "asset/Diamond Glow Jar – Amber.jpg",
          "asset/Diamond Glow Jar – Amber_2.jpg",
          "asset/Diamond Glow Jar – Amber_3.jpg",
          "asset/Diamond Glow Jar – Amber_4.jpg"
        ]
      }
    ]
  },

  // 2. RIBBED GLOW PILLAR (Variants: Amber & Black in stock as per spreadsheet; Red & White out of stock)
  {
    id: 37,
    handle: "ribbed-glow-pillar",
    title: "Ribbed Glow Pillar",
    category: "Premium Luxury Candles",
    variantType: "color",
    variantTypeLabel: "Pillar Color",
    price: 549,
    origPrice: 699,
    burn: "40-50 Hours",
    badge: "BESTSELLER",
    isComingSoon: false,
    notes: {
      top: "Warm Amber Resin & Bergamot",
      heart: "Spiced Honey & Golden Saffron",
      base: "Smoked Oud & Sandalwood"
    },
    image: "asset/Ribbed Glow Pillar – White.jpg",
    images: [
      "asset/Ribbed Glow Pillar – White.jpg",
      "asset/Ribbed Glow Pillar – White_2.jpg",
      "asset/Ribbed Glow Pillar – Red.jpg",
      "asset/Ribbed Glow Pillar – Red_2.jpg"
    ],
    desc: "Sculptural ribbed architectural pillar candle hand-poured with botanical soy wax. Features elegant fluted geometry that catches candlelight in cascading ridges.",
    dimensions: "7.5 × 7.5 × 12 cm (280g)",
    stock: 25,
    variants: [
      {
        id: "ribbed-pillar-white",
        title: "White",
        colorHex: "#f8fafc",
        price: 549,
        origPrice: 699,
        burn: "40-50 Hours",
        dimensions: "7.5 × 7.5 × 12 cm (280g)",
        available: true,
        stock: 11,
        badge: "NEW ARRIVAL",
        notes: {
          top: "Pure Cotton Flower & White Lily",
          heart: "French Vanilla & Cashmere",
          base: "Clean Sandalwood & Amber"
        },
        desc: "Ribbed Glow Pillar in Pure White showcases tactile architectural fluting.",
        image: "asset/Ribbed Glow Pillar – White.jpg",
        images: [
          "asset/Ribbed Glow Pillar – White.jpg",
          "asset/Ribbed Glow Pillar – White_2.jpg"
        ]
      },
      {
        id: "ribbed-pillar-red",
        title: "Red",
        colorHex: "#991b1b",
        price: 549,
        origPrice: 699,
        burn: "40-50 Hours",
        dimensions: "7.5 × 7.5 × 12 cm (280g)",
        available: true,
        stock: 11,
        badge: "NEW ARRIVAL",
        notes: {
          top: "Crimson Clove & Pomegranate",
          heart: "Spiced Rose & Cinnamon Bark",
          base: "Velvet Amber & Cedarwood"
        },
        desc: "Ribbed Glow Pillar in Crimson Red brings festive warmth.",
        image: "asset/Ribbed Glow Pillar – Red.jpg",
        images: [
          "asset/Ribbed Glow Pillar – Red.jpg",
          "asset/Ribbed Glow Pillar – Red_2.jpg"
        ]
      },
      {
        id: "ribbed-pillar-amber",
        title: "Amber",
        colorHex: "#d97706",
        price: 549,
        origPrice: 699,
        burn: "40-50 Hours",
        dimensions: "7.5 × 7.5 × 12 cm (280g)",
        // available: true,
        // stock: 14,
        // badge: "BESTSELLER",
        available: false,
        isOutOfStock: true,
        stock: 0,
        badge: "OUT OF STOCK",
        notes: {
          top: "Warm Amber Resin & Bergamot",
          heart: "Spiced Honey & Golden Saffron",
          base: "Smoked Oud & Sandalwood"
        },
        desc: "Ribbed Glow Pillar in Warm Amber radiates deep glowing warmth with spicy honey and amber notes.",
        image: "asset/Ribbed Glow Pillar – Amber.jpg",
        images: [
          "asset/Ribbed Glow Pillar – Amber.jpg",
          "asset/Ribbed Glow Pillar – Amber_2.jpg",
          "asset/Ribbed Glow Pillar – Amber_3.jpg",
          "asset/Ribbed Glow Pillar – Amber_4.jpg"
        ]
      },
      {
        id: "ribbed-pillar-black",
        title: "Black",
        colorHex: "#1c1917",
        price: 549,
        origPrice: 699,
        burn: "40-50 Hours",
        dimensions: "7.5 × 7.5 × 12 cm (280g)",
        // available: true,
        // stock: 11,
        // badge: "NEW ARRIVAL",
        available: false,
        isOutOfStock: true,
        stock: 0,
        badge: "OUT OF STOCK",
        notes: {
          top: "Black Pepper & Dark Tobacco",
          heart: "Leather, Cardamom & Cocoa",
          base: "Smoky Birch & Amber"
        },
        desc: "Ribbed Glow Pillar in Midnight Black provides bold, modern architectural presence.",
        image: "asset/Ribbed Glow Pillar – Black.jpg",
        images: [
          "asset/Ribbed Glow Pillar – Black.jpg",
          "asset/Ribbed Glow Pillar – Black_2.jpg",
          "asset/Ribbed Glow Pillar – Black_3.jpg",
          "asset/Ribbed Glow Pillar – Black_4.jpg"
        ]
      }
    ]
  },

  // 3. MANDALA GLOW TIN (Coming Soon — Large & Small)
  {
    id: 39,
    handle: "mandala-glow-tin",
    title: "Mandala Glow Tin",
    category: "Premium Luxury Candles",
    variantType: "size",
    variantTypeLabel: "Vessel Size",
    price: 399,
    origPrice: 499,
    burn: "30-45 Hours",
    badge: "COMING SOON",
    isComingSoon: true,
    notes: {
      top: "White Lotus & Sweet Mandarin",
      heart: "Jasmine Sambac & Green Tea",
      base: "White Musk & Sandalwood"
    },
    image: "asset/Mandala Glow Tin – Large.jpg",
    images: [
      "asset/Mandala Glow Tin – Large.jpg",
      "asset/Mandala Glow Tin – Large_2.jpg",
      "asset/Mandala Glow Tin – Large_3.jpg",
      "asset/Mandala Glow Tin – Large_4.jpg"
    ],
    desc: "Intricately embossed artisanal travel tin adorned with sacred mandala motifs. Infused with soothing meditative botanicals for peaceful sanctuaries on the go.",
    dimensions: "8 × 8 × 5 cm (180g)",
    stock: 0,
    variants: [
      {
        id: "mandala-tin-large",
        title: "Large",
        price: 399,
        origPrice: 499,
        burn: "40-45 Hours",
        dimensions: "8.5 × 8.5 × 5.5 cm (220g)",
        available: false,
        isComingSoon: true,
        badge: "COMING SOON",
        notes: {
          top: "White Lotus & Sweet Mandarin",
          heart: "Jasmine Sambac & Green Tea",
          base: "White Musk & Sandalwood"
        },
        desc: "Mandala Glow Tin (Large) offers extended burn hours with double-cotton wicks in an ornate embossed brass-toned vessel.",
        image: "asset/Mandala Glow Tin – Large.jpg",
        images: [
          "asset/Mandala Glow Tin – Large.jpg",
          "asset/Mandala Glow Tin – Large_2.jpg",
          "asset/Mandala Glow Tin – Large_3.jpg",
          "asset/Mandala Glow Tin – Large_4.jpg"
        ]
      },
      {
        id: "mandala-tin-small",
        title: "Small",
        price: 399,
        origPrice: 499,
        burn: "25-30 Hours",
        dimensions: "7 × 7 × 4.5 cm (140g)",
        available: false,
        isComingSoon: true,
        badge: "COMING SOON",
        notes: {
          top: "White Lotus & Sweet Mandarin",
          heart: "Jasmine Sambac & Green Tea",
          base: "White Musk & Sandalwood"
        },
        desc: "Mandala Glow Tin (Small) is the compact, pocket luxury ritual candle for tranquil travel journeys.",
        image: "asset/Mandala Glow Tin – Small.jpg",
        images: [
          "asset/Mandala Glow Tin – Small.jpg",
          "asset/Mandala Glow Tin – Small_2.jpg",
          "asset/Mandala Glow Tin – Small_3.jpg",
          "asset/Mandala Glow Tin – Small_4.jpg"
        ]
      }
    ]
  },

  // 4. GRAND BOAT CANDLE (Variants: Large & Medium)
  {
    id: 54,
    handle: "grand-boat-candle",
    title: "Grand Boat Candle",
    category: "Wooden Collection",
    variantType: "size",
    variantTypeLabel: "Carved Bowl Size",
    price: 2149,
    origPrice: 2299,
    burn: "60-80 Hours",
    badge: "LUXURY STATEMENT",
    isComingSoon: false,
    notes: {
      top: "Smoked Teak & Fresh Cardamom",
      heart: "Raw Cedarwood & Amber Resin",
      base: "Dark Vanilla, Patchouli & Vetiver"
    },
    image: "asset/Grand Boat Candle – Large.jpg",
    images: [
      "asset/Grand Boat Candle – Large.jpg",
      "asset/Grand Boat Candle – Large_2.jpg",
      "asset/Grand Boat Candle – Large_3.jpg",
      "asset/Grand Boat Candle – Large_4.jpg"
    ],
    desc: "Sculpted from sustainable seasoned hardwood into an elongated boat silhouette. Multi-wick botanical candle creating an enchanting horizontal fireplace flame.",
    dimensions: "38 × 12 × 7 cm (850g Wax)",
    stock: 12,
    variants: [
      {
        id: "grand-boat-large",
        title: "Large (3 Wicks)",
        price: 2149,
        origPrice: 2299,
        burn: "70-85 Hours",
        dimensions: "42 × 13 × 7 cm (950g Wax · 3 Wicks)",
        available: true,
        stock: 6,
        badge: "LUXURY STATEMENT",
        notes: {
          top: "Smoked Teak & Cardamom",
          heart: "Raw Cedarwood & Amber",
          base: "Dark Vanilla & Vetiver"
        },
        desc: "Grand Boat Candle (Large) features 4 crackling wooden/cotton wicks nestled in hand-chiseled artisan hardwood.",
        image: "asset/Grand Boat Candle – Large.jpg",
        images: [
          "asset/Grand Boat Candle – Large.jpg",
          "asset/Grand Boat Candle – Large_2.jpg",
          "asset/Grand Boat Candle – Large_3.jpg",
          "asset/Grand Boat Candle – Large_4.jpg"
        ]
      },
      {
        id: "grand-boat-medium",
        title: "Small (2 Wicks)",
        price: 1849,
        origPrice: 1999,
        burn: "55-65 Hours",
        dimensions: "32 × 11 × 6 cm (650g Wax · 2 Wicks)",
        available: true,
        stock: 6,
        badge: "BESTSELLER",
        notes: {
          top: "Smoked Teak & Cardamom",
          heart: "Raw Cedarwood & Amber",
          base: "Dark Vanilla & Vetiver"
        },
        desc: "Grand Boat Candle (Medium) features 3 wicks in a graceful carved wooden vessel, ideal for dining tables and coffee tables.",
        image: "asset/Grand Boat Candle – Medium.jpg",
        images: [
          "asset/Grand Boat Candle – Medium.jpg",
          "asset/Grand Boat Candle – Medium_2.jpg",
          "asset/Grand Boat Candle – Medium_3.jpg",
          "asset/Grand Boat Candle – Medium_4.jpg"
        ]
      }
    ]
  },

  // 5. CLASSIC TAPER CANDLES - SET OF 2 (Variants: Red, Amber, White, Black)
  // {
  //   id: 60,
  //   handle: "classic-taper-candles",
  //   title: "Classic Taper Candles – Set of 2",
  //   category: "Premium Luxury Candles",
  //   variantType: "color",
  //   variantTypeLabel: "Candle Color",
  //   price: 189,
  //   origPrice: 249,
  //   burn: "10-12 Hours Each",
  //   badge: "HAND-DIPPED",
  //   isComingSoon: false,
  //   notes: {
  //     top: "Pure Unscented / Clean Botanical",
  //     heart: "Hypoallergenic Pure Cotton Wick",
  //     base: "100% Dripless Clean Soy Wax"
  //   },
  //   image: "asset/Classic Taper Candles – Red – Set of 2.jpg",
  //   images: [
  //     "asset/Classic Taper Candles – Red – Set of 2.jpg",
  //     "asset/Classic Taper Candles – Red – Set of 2_2.jpg",
  //     "asset/Classic Taper Candles – Red – Set of 2_3.jpg",
  //     "asset/Classic Taper Candles – Red – Set of 2_4.jpg"
  //   ],
  //   desc: "Hand-dipped artisanal dinner tapers designed to burn cleanly and evenly without soot. Fits standard taper candle holders and candelabras.",
  //   dimensions: "2.2 cm ⌀ × 25 cm Height (Pair of 2)",
  //   stock: 40,
  //   variants: [
  //     {
  //       id: "taper-red-set-2",
  //       title: "Red – Set of 2",
  //       colorHex: "#991b1b",
  //       price: 189,
  //       origPrice: 249,
  //       burn: "10-12 Hours Each",
  //       dimensions: "2.2 cm ⌀ × 25 cm (Set of 2)",
  //       available: true,
  //       stock: 10,
  //       badge: "HAND-DIPPED",
  //       notes: {
  //         top: "Pure Unscented / Clean Botanical",
  //         heart: "Hypoallergenic Pure Cotton Wick",
  //         base: "100% Dripless Clean Soy Wax"
  //       },
  //       desc: "Classic Taper Candles in Crimson Velvet Red bring majestic warmth and festive luxury to dinner settings.",
  //       image: "asset/Classic Taper Candles – Red – Set of 2.jpg",
  //       images: [
  //         "asset/Classic Taper Candles – Red – Set of 2.jpg",
  //         "asset/Classic Taper Candles – Red – Set of 2_2.jpg",
  //         "asset/Classic Taper Candles – Red – Set of 2_3.jpg",
  //         "asset/Classic Taper Candles – Red – Set of 2_4.jpg"
  //       ]
  //     },
  //     {
  //       id: "taper-amber-set-2",
  //       title: "Amber – Set of 2",
  //       colorHex: "#d97706",
  //       price: 189,
  //       origPrice: 249,
  //       burn: "10-12 Hours Each",
  //       dimensions: "2.2 cm ⌀ × 25 cm (Set of 2)",
  //       available: true,
  //       stock: 10,
  //       badge: "NEW ARRIVAL",
  //       notes: {
  //         top: "Pure Unscented / Clean Botanical",
  //         heart: "Hypoallergenic Pure Cotton Wick",
  //         base: "100% Dripless Clean Soy Wax"
  //       },
  //       desc: "Classic Taper Candles in Golden Honey Amber cast a rich, flattering golden glow for intimate evenings.",
  //       image: "asset/Classic Taper Candles – Amber – Set of 2.jpg",
  //       images: [
  //         "asset/Classic Taper Candles – Amber – Set of 2.jpg",
  //         "asset/Classic Taper Candles – Amber – Set of 2_2.jpg",
  //         "asset/Classic Taper Candles – Amber – Set of 2_3.jpg",
  //         "asset/Classic Taper Candles – Amber – Set of 2_4.jpg"
  //       ]
  //     },
  //     {
  //       id: "taper-white-set-2",
  //       title: "White – Set of 2",
  //       colorHex: "#f8fafc",
  //       price: 189,
  //       origPrice: 249,
  //       burn: "10-12 Hours Each",
  //       dimensions: "2.2 cm ⌀ × 25 cm (Set of 2)",
  //       available: true,
  //       stock: 10,
  //       badge: "BESTSELLER",
  //       notes: {
  //         top: "Pure Unscented / Clean Botanical",
  //         heart: "Hypoallergenic Pure Cotton Wick",
  //         base: "100% Dripless Clean Soy Wax"
  //       },
  //       desc: "Classic Taper Candles in Pure Ivory White offer timeless minimalist elegance for weddings and fine dining.",
  //       image: "asset/Classic Taper Candles – White – Set of 2.jpg",
  //       images: [
  //         "asset/Classic Taper Candles – White – Set of 2.jpg",
  //         "asset/Classic Taper Candles – White – Set of 2_2.jpg",
  //         "asset/Classic Taper Candles – White – Set of 2_3.jpg",
  //         "asset/Classic Taper Candles – White – Set of 2_4.jpg"
  //       ]
  //     },
  //     {
  //       id: "taper-black-set-2",
  //       title: "Black – Set of 2",
  //       colorHex: "#1c1917",
  //       price: 189,
  //       origPrice: 249,
  //       burn: "10-12 Hours Each",
  //       dimensions: "2.2 cm ⌀ × 25 cm (Set of 2)",
  //       available: true,
  //       stock: 10,
  //       badge: "MODERN CLASSIC",
  //       notes: {
  //         top: "Pure Unscented / Clean Botanical",
  //         heart: "Hypoallergenic Pure Cotton Wick",
  //         base: "100% Dripless Clean Soy Wax"
  //       },
  //       desc: "Classic Taper Candles in Midnight Black provide bold, sophisticated architectural contrast in brass or glass holders.",
  //       image: "asset/Classic Taper Candles – Black – Set of 2.jpg",
  //       images: [
  //         "asset/Classic Taper Candles – Black – Set of 2.jpg",
  //         "asset/Classic Taper Candles – Black – Set of 2_2.jpg",
  //         "asset/Classic Taper Candles – Black – Set of 2_3.jpg",
  //         "asset/Classic Taper Candles – Black – Set of 2_4.jpg"
  //       ]
  //     }
  //   ]
  // },

  // 6. GRAND PILLAR – 12" (Variants: White in stock; Black, Red, Amber Out of Stock)
  {
    id: 11,
    handle: "grand-pillar-12",
    title: "Grand Pillar – 12\"",
    category: "Premium Luxury Candles",
    variantType: "color",
    variantTypeLabel: "Pillar Color",
    price: 1749,
    origPrice: 1899,
    burn: "85-100 Hours",
    badge: "SIGNATURE PILLAR",
    isComingSoon: false,
    notes: {
      top: "Pure Cotton Flower & Bergamot",
      heart: "White Lilac & Cashmere Musk",
      base: "Subtle Amber & Clean Sandalwood"
    },
    image: "asset/Grand Pillar – White – 12.jpg",
    images: [
      "asset/Grand Pillar – White – 12.jpg",
      "asset/Grand Pillar – White – 12_2.jpg"
    ],
    desc: "Monolithic 12-inch hand-poured botanical pillar candle with smooth satin finish. Designed for dramatic mantelpieces, hurricane glass lanterns, and entrance halls.",
    dimensions: "10 cm ⌀ × 30 cm Height (12\" · 1.2kg)",
    stock: 15,
    variants: [
      {
        id: "grand-pillar-white",
        title: "White – 12\"",
        colorHex: "#f8fafc",
        price: 1749,
        origPrice: 1899,
        burn: "85-100 Hours",
        dimensions: "10 cm ⌀ × 30 cm (12\" · 1.2kg)",
        available: true,
        stock: 8,
        badge: "SIGNATURE PILLAR",
        notes: {
          top: "Pure Cotton Flower & Bergamot",
          heart: "White Lilac & Cashmere Musk",
          base: "Subtle Amber & Clean Sandalwood"
        },
        desc: "Grand Pillar 12\" in Pure White is the commanding centerpiece of The Candlorre collection, burning for nearly 100 serene hours.",
        image: "asset/Grand Pillar – White – 12.jpg",
        images: [
          "asset/Grand Pillar – White – 12.jpg",
          "asset/Grand Pillar – White – 12_2.jpg"
        ]
      },
      {
        id: "grand-pillar-black",
        title: "Black – 12\"",
        colorHex: "#1c1917",
        price: 1749,
        origPrice: 1899,
        burn: "85-100 Hours",
        dimensions: "10 cm ⌀ × 30 cm (12\" · 1.2kg)",
        available: false,
        isOutOfStock: true,
        stock: 0,
        badge: "OUT OF STOCK",
        notes: {
          top: "Black Pepper & Dark Tobacco",
          heart: "Leather, Cardamom & Cocoa",
          base: "Smoky Birch & Amber"
        },
        desc: "Grand Pillar 12\" in Onyx Black provides dramatic sculptural presence (Currently Out of Stock).",
        image: "asset/Grand Pillar – Black – 12.jpg",
        images: [
          "asset/Grand Pillar – Black – 12.jpg",
          "asset/Grand Pillar – Black – 12_2.jpg"
        ]
      },
      {
        id: "grand-pillar-red",
        title: "Red – 12\"",
        colorHex: "#991b1b",
        price: 1749,
        origPrice: 1899,
        burn: "85-100 Hours",
        dimensions: "10 cm ⌀ × 30 cm (12\" · 1.2kg)",
        available: false,
        isOutOfStock: true,
        stock: 0,
        badge: "OUT OF STOCK",
        notes: {
          top: "Crimson Clove & Pomegranate",
          heart: "Spiced Rose & Cinnamon Bark",
          base: "Velvet Amber & Cedarwood"
        },
        desc: "Grand Pillar 12\" in Crimson Red brings festive grandeur (Currently Out of Stock).",
        image: "asset/Grand Pillar – Red – 12.jpg",
        images: [
          "asset/Grand Pillar – Red – 12.jpg",
          "asset/Grand Pillar – Red – 12_2.jpg"
        ]
      },
      {
        id: "grand-pillar-amber",
        title: "Amber – 12\"",
        colorHex: "#d97706",
        price: 1749,
        origPrice: 1899,
        burn: "85-100 Hours",
        dimensions: "10 cm ⌀ × 30 cm (12\" · 1.2kg)",
        available: false,
        isOutOfStock: true,
        stock: 0,
        badge: "OUT OF STOCK",
        notes: {
          top: "Warm Amber Resin & Bergamot",
          heart: "Spiced Honey & Golden Saffron",
          base: "Smoked Oud & Sandalwood"
        },
        desc: "Grand Pillar 12\" in Warm Amber radiates deep glowing warmth (Currently Out of Stock).",
        image: "asset/Grand Pillar – Amber – 12.jpg",
        images: [
          "asset/Grand Pillar – Amber – 12.jpg",
          "asset/Grand Pillar – Amber – 12_2.jpg"
        ]
      }
    ]
  },

  // 6b. CLASSIC PILLAR – 9" (Variants: White in stock; Black, Red, Amber Out of Stock)
  {
    id: 15,
    handle: "classic-pillar-9",
    title: "Classic Pillar – 9\"",
    category: "Premium Luxury Candles",
    variantType: "color",
    variantTypeLabel: "Pillar Color",
    price: 1549,
    origPrice: 1699,
    burn: "65-75 Hours",
    badge: "BESTSELLER",
    isComingSoon: false,
    notes: {
      top: "Pure Cotton Flower & Bergamot",
      heart: "White Lilac & Cashmere Musk",
      base: "Subtle Amber & Clean Sandalwood"
    },
    image: "asset/Classic Pillar – White – 9.jpg",
    images: [
      "asset/Classic Pillar – White – 9.jpg",
      "asset/Classic Pillar – White – 9_2.jpg"
    ],
    desc: "Refined 9-inch hand-poured botanical pillar candle with balanced height and steady, smokeless illumination for consoles and candle trays.",
    dimensions: "8.5 cm ⌀ × 23 cm Height (9\" · 850g)",
    stock: 18,
    variants: [
      {
        id: "classic-pillar-white",
        title: "White – 9\"",
        colorHex: "#f8fafc",
        price: 1549,
        origPrice: 1699,
        burn: "65-75 Hours",
        dimensions: "8.5 cm ⌀ × 23 cm (9\" · 850g)",
        available: true,
        stock: 8,
        badge: "BESTSELLER",
        notes: {
          top: "Pure Cotton Flower & Bergamot",
          heart: "White Lilac & Cashmere Musk",
          base: "Subtle Amber & Clean Sandalwood"
        },
        desc: "Classic Pillar 9\" in Pure White provides balanced height and steady, smokeless illumination.",
        image: "asset/Classic Pillar – White – 9.jpg",
        images: [
          "asset/Classic Pillar – White – 9.jpg",
          "asset/Classic Pillar – White – 9_2.jpg"
        ]
      },
      {
        id: "classic-pillar-black",
        title: "Black – 9\"",
        colorHex: "#1c1917",
        price: 1549,
        origPrice: 1699,
        burn: "65-75 Hours",
        dimensions: "8.5 cm ⌀ × 23 cm (9\" · 850g)",
        available: false,
        isOutOfStock: true,
        stock: 0,
        badge: "OUT OF STOCK",
        notes: {
          top: "Black Pepper & Dark Tobacco",
          heart: "Leather, Cardamom & Cocoa",
          base: "Smoky Birch & Amber"
        },
        desc: "Classic Pillar 9\" in Onyx Black (Currently Out of Stock).",
        image: "asset/Classic Pillar – Black – 9.jpg",
        images: [
          "asset/Classic Pillar – Black – 9.jpg",
          "asset/Classic Pillar – Black – 9_2.jpg"
        ]
      },
      {
        id: "classic-pillar-red",
        title: "Red – 9\"",
        colorHex: "#991b1b",
        price: 1549,
        origPrice: 1699,
        burn: "65-75 Hours",
        dimensions: "8.5 cm ⌀ × 23 cm (9\" · 850g)",
        available: false,
        isOutOfStock: true,
        stock: 0,
        badge: "OUT OF STOCK",
        notes: {
          top: "Crimson Clove & Pomegranate",
          heart: "Spiced Rose & Cinnamon Bark",
          base: "Velvet Amber & Cedarwood"
        },
        desc: "Classic Pillar 9\" in Crimson Red (Currently Out of Stock).",
        image: "asset/Classic Pillar – Red – 9.jpg",
        images: [
          "asset/Classic Pillar – Red – 9.jpg",
          "asset/Classic Pillar – Red – 9_2.jpg"
        ]
      },
      {
        id: "classic-pillar-amber",
        title: "Amber – 9\"",
        colorHex: "#d97706",
        price: 1549,
        origPrice: 1699,
        burn: "65-75 Hours",
        dimensions: "8.5 cm ⌀ × 23 cm (9\" · 850g)",
        available: false,
        isOutOfStock: true,
        stock: 0,
        badge: "OUT OF STOCK",
        notes: {
          top: "Warm Amber Resin & Bergamot",
          heart: "Spiced Honey & Golden Saffron",
          base: "Smoked Oud & Sandalwood"
        },
        desc: "Classic Pillar 9\" in Warm Amber (Currently Out of Stock).",
        image: "asset/Classic Pillar – Amber – 9.jpg",
        images: [
          "asset/Classic Pillar – Amber – 9.jpg",
          "asset/Classic Pillar – Amber – 9_2.jpg"
        ]
      }
    ]
  },

  // 6c. MINI PILLAR – 6" (Variants: White in stock; Black, Red, Amber Out of Stock)
  {
    id: 19,
    handle: "mini-pillar-6",
    title: "Mini Pillar – 6\"",
    category: "Premium Luxury Candles",
    variantType: "color",
    variantTypeLabel: "Pillar Color",
    price: 1349,
    origPrice: 1499,
    burn: "45-55 Hours",
    badge: "ESSENTIAL",
    isComingSoon: false,
    notes: {
      top: "Pure Cotton Flower & Bergamot",
      heart: "White Lilac & Cashmere Musk",
      base: "Subtle Amber & Clean Sandalwood"
    },
    image: "asset/Mini Pillar – White – 6.jpg",
    images: [
      "asset/Mini Pillar – White – 6.jpg",
      "asset/Mini Pillar – White – 6_2.jpg"
    ],
    desc: "Compact 6-inch hand-poured botanical pillar candle, versatile for grouping in tiered trios or styling on nightstands.",
    dimensions: "7.5 cm ⌀ × 15 cm Height (6\" · 550g)",
    stock: 20,
    variants: [
      {
        id: "mini-pillar-white",
        title: "White – 6\"",
        colorHex: "#f8fafc",
        price: 1349,
        origPrice: 1499,
        burn: "45-55 Hours",
        dimensions: "7.5 cm ⌀ × 15 cm (6\" · 550g)",
        available: true,
        stock: 8,
        badge: "ESSENTIAL",
        notes: {
          top: "Pure Cotton Flower & Bergamot",
          heart: "White Lilac & Cashmere Musk",
          base: "Subtle Amber & Clean Sandalwood"
        },
        desc: "Mini Pillar 6\" in Pure White is the versatile pillar size, ideal for grouping in tiered trios.",
        image: "asset/Mini Pillar – White – 6.jpg",
        images: [
          "asset/Mini Pillar – White – 6.jpg",
          "asset/Mini Pillar – White – 6_2.jpg"
        ]
      },
      {
        id: "mini-pillar-black",
        title: "Black – 6\"",
        colorHex: "#1c1917",
        price: 1349,
        origPrice: 1499,
        burn: "45-55 Hours",
        dimensions: "7.5 cm ⌀ × 15 cm (6\" · 550g)",
        available: false,
        isOutOfStock: true,
        stock: 0,
        badge: "OUT OF STOCK",
        notes: {
          top: "Black Pepper & Dark Tobacco",
          heart: "Leather, Cardamom & Cocoa",
          base: "Smoky Birch & Amber"
        },
        desc: "Mini Pillar 6\" in Onyx Black (Currently Out of Stock).",
        image: "asset/Mini Pillar – Black – 6.jpg",
        images: [
          "asset/Mini Pillar – Black – 6.jpg",
          "asset/Mini Pillar – Black – 6_2.jpg"
        ]
      },
      {
        id: "mini-pillar-red",
        title: "Red – 6\"",
        colorHex: "#991b1b",
        price: 1349,
        origPrice: 1499,
        burn: "45-55 Hours",
        dimensions: "7.5 cm ⌀ × 15 cm (6\" · 550g)",
        available: false,
        isOutOfStock: true,
        stock: 0,
        badge: "OUT OF STOCK",
        notes: {
          top: "Crimson Clove & Pomegranate",
          heart: "Spiced Rose & Cinnamon Bark",
          base: "Velvet Amber & Cedarwood"
        },
        desc: "Mini Pillar 6\" in Crimson Red (Currently Out of Stock).",
        image: "asset/Mini Pillar – Red – 6.jpg",
        images: [
          "asset/Mini Pillar – Red – 6.jpg",
          "asset/Mini Pillar – Red – 6_2.jpg"
        ]
      },
      {
        id: "mini-pillar-amber",
        title: "Amber – 6\"",
        colorHex: "#d97706",
        price: 1349,
        origPrice: 1499,
        burn: "45-55 Hours",
        dimensions: "7.5 cm ⌀ × 15 cm (6\" · 550g)",
        available: false,
        isOutOfStock: true,
        stock: 0,
        badge: "OUT OF STOCK",
        notes: {
          top: "Warm Amber Resin & Bergamot",
          heart: "Spiced Honey & Golden Saffron",
          base: "Smoked Oud & Sandalwood"
        },
        desc: "Mini Pillar 6\" in Warm Amber (Currently Out of Stock).",
        image: "asset/Mini Pillar – Amber – 6.jpg",
        images: [
          "asset/Mini Pillar – Amber – 6.jpg",
          "asset/Mini Pillar – Amber – 6_2.jpg"
        ]
      }
    ]
  },

  // 7. TRIPLE GLOW BOWL CANDLE
  {
    id: 9,
    handle: "triple-glow-bowl-candle",
    title: "Triple Glow Bowl Candle",
    category: "Premium Luxury Candles",
    price: 799,
    origPrice: 899,
    burn: "40-50 Hours",
    badge: "BESTSELLER",
    isComingSoon: false,
    notes: {
      top: "Sweet Orange Blossom & Mandarin",
      heart: "Gardenia, Neroli & Tuberose",
      base: "Golden Cedar & White Amber"
    },
    image: "asset/Triple Glow Bowl Candle.jpg",
    images: [
      "asset/Triple Glow Bowl Candle.jpg",
      "asset/Triple Glow Bowl Candle_2.jpg",
      "asset/Triple Glow Bowl Candle_3.jpg",
      "asset/Triple Glow Bowl Candle_4.jpg"
    ],
    desc: "Wide-aperture shallow ceramic bowl featuring three pure cotton wicks for a generous, luminous pool of melted botanical wax and rapid fragrance diffusion.",
    dimensions: "14 × 14 × 6.5 cm (450g Wax)",
    stock: 22
  },

  // 8. DOUBLE GLOW JAR CANDLE
  // {
  //   id: 10,
  //   handle: "double-glow-jar-candle",
  //   title: "Double Glow Jar Candle",
  //   category: "Premium Luxury Candles",
  //   price: 749,
  //   origPrice: 849,
  //   burn: "35-45 Hours",
  //   badge: "",
  //   isComingSoon: false,
  //   notes: {
  //     top: "Velvet Fig & Crushed Eucalyptus",
  //     heart: "Cardamom, Bay Leaf & Peony",
  //     base: "Sandalwood, Tonka Bean & Musk"
  //   },
  //   image: "asset/Double Glow Jar Candle.jpg",
  //   images: [
  //     "asset/Double Glow Jar Candle.jpg",
  //     "asset/Double Glow Jar Candle_2.jpg",
  //     "asset/Double Glow Jar Candle_3.jpg",
  //     "asset/Double Glow Jar Candle_4.jpg"
  //   ],
  //   desc: "Dual-wick artisan jar candle engineered to ensure an even burn pool right to the glass edge without tunneling.",
  //   dimensions: "10 × 10 × 9 cm (320g)",
  //   stock: 18
  // },

  // 9. GLOW TEA LIGHTS (Variants: Set of 50 & Set of 20)
  // {
  //   id: 56,
  //   handle: "glow-tea-lights",
  //   title: "Glow Tea Lights",
  //   category: "Premium Luxury Candles",
  //   variantType: "size",
  //   variantTypeLabel: "Quantity Pack",
  //   price: 229,
  //   origPrice: 299,
  //   burn: "4-5 Hours Per Tea Light",
  //   badge: "VALUE PACK",
  //   isComingSoon: false,
  //   notes: {
  //     top: "Pure Natural Soy Base",
  //     heart: "Cotton Lead-Free Wick",
  //     base: "Smokeless Clean Flame"
  //   },
  //   image: "asset/Glow Tea Lights – Set of 50.jpg",
  //   images: [
  //     "asset/Glow Tea Lights – Set of 50.jpg",
  //     "asset/Glow Tea Lights – Set of 50_2.jpg",
  //     "asset/Glow Tea Lights – Set of 50_3.jpg",
  //     "asset/Glow Tea Lights – Set of 50_4.jpg"
  //   ],
  //   desc: "Premium clear-cup botanical soy tea lights with extended 4-5 hour burn duration. Smokeless and soot-free for oil diffusers and votive holders.",
  //   dimensions: "Standard 3.8 cm ⌀ Cups",
  //   stock: 50,
  //   variants: [
  //     {
  //       id: "tealights-set-50",
  //       title: "Set of 50",
  //       price: 229,
  //       origPrice: 299,
  //       burn: "4-5 Hours Each (250h Total)",
  //       dimensions: "Box of 50 Units",
  //       available: true,
  //       stock: 30,
  //       badge: "VALUE PACK",
  //       notes: {
  //         top: "Pure Natural Soy Base",
  //         heart: "Cotton Lead-Free Wick",
  //         base: "Smokeless Clean Flame"
  //       },
  //       desc: "Bulk pack of 50 high-purity soy tea lights in crystal-clear heat-resistant cups.",
  //       image: "asset/Glow Tea Lights – Set of 50.jpg",
  //       images: [
  //         "asset/Glow Tea Lights – Set of 50.jpg",
  //         "asset/Glow Tea Lights – Set of 50_2.jpg",
  //         "asset/Glow Tea Lights – Set of 50_3.jpg",
  //         "asset/Glow Tea Lights – Set of 50_4.jpg"
  //       ]
  //     },
  //     {
  //       id: "tealights-set-20",
  //       title: "Set of 20",
  //       price: 129,
  //       origPrice: 149,
  //       burn: "4-5 Hours Each (100h Total)",
  //       dimensions: "Box of 20 Units",
  //       available: true,
  //       stock: 20,
  //       badge: "STARTER PACK",
  //       notes: {
  //         top: "Pure Natural Soy Base",
  //         heart: "Cotton Lead-Free Wick",
  //         base: "Smokeless Clean Flame"
  //       },
  //       desc: "Pack of 20 high-purity soy tea lights in crystal-clear heat-resistant cups.",
  //       image: "asset/Glow Tea Lights – Set of 20.jpg",
  //       images: [
  //         "asset/Glow Tea Lights – Set of 20.jpg",
  //         "asset/Glow Tea Lights – Set of 20_2.jpg",
  //         "asset/Glow Tea Lights – Set of 20_3.jpg",
  //         "asset/Glow Tea Lights – Set of 20_4.jpg"
  //       ]
  //     }
  //   ]
  // },

  // 10. GOLDEN METAL LUXE JAR CANDLE
  {
    id: 41,
    handle: "golden-metal-luxe-jar-candle",
    title: "Golden Metal Luxe Jar Candle",
    category: "Metal Collection",
    price: 849,
    origPrice: 899,
    burn: "45-55 Hours",
    badge: "NEW ARRIVAL",
    isComingSoon: false,
    notes: {
      top: "Bergamot & Golden Cardamom",
      heart: "Damask Rose & Precious Saffron",
      base: "Amber Resin & Oud Wood"
    },
    image: "asset/Golden Metal Luxe Jar Candle.jpg",
    images: [
      "asset/Golden Metal Luxe Jar Candle.jpg",
      "asset/Golden Metal Luxe Jar Candle_2.jpg",
      "asset/Golden Metal Luxe Jar Candle_3.jpg",
      "asset/Golden Metal Luxe Jar Candle_4.jpg"
    ],
    desc: "Gilded metallic vessel handcrafted with a brushed gold patina. Radiates brilliant reflective luminosity across table settings and shelves.",
    dimensions: "8.5 × 8.5 × 10 cm (300g)",
    stock: 20
  },

  // 11. GOLDEN METAL BOWL CANDLE
  // {
  //   id: 42,
  //   handle: "golden-metal-bowl-candle",
  //   title: "Golden Metal Bowl Candle",
  //   category: "Metal Collection",
  //   price: 599,
  //   origPrice: 699,
  //   burn: "35-45 Hours",
  //   badge: "",
  //   isComingSoon: false,
  //   notes: {
  //     top: "Lemon Verbena & Neroli Blossom",
  //     heart: "Ylang-Ylang & Ginger Lily",
  //     base: "Golden Cedar & Soft Vanilla"
  //   },
  //   image: "asset/Golden Metal Bowl Candle.jpg",
  //   images: [
  //     "asset/Golden Metal Bowl Candle.jpg",
  //     "asset/Golden Metal Bowl Candle_2.jpg",
  //     "asset/Golden Metal Bowl Candle_3.jpg",
  //     "asset/Golden Metal Bowl Candle_4.jpg"
  //   ],
  //   desc: "Hammered brass-look metal bowl candle designed to serve as an opulent dining centerpiece.",
  //   dimensions: "12 × 12 × 5.5 cm (260g)",
  //   stock: 16
  // },

  // 12. HAZY METAL LUXE JAR CANDLE
  // {
  //   id: 43,
  //   handle: "hazy-metal-luxe-jar-candle",
  //   title: "Hazy Metal Luxe Jar Candle",
  //   category: "Metal Collection",
  //   price: 749,
  //   origPrice: 799,
  //   burn: "40-50 Hours",
  //   badge: "BESTSELLER",
  //   isComingSoon: false,
  //   notes: {
  //     top: "Smoked Sage & Crisp Apple",
  //     heart: "Cashmere Wood & White Birch",
  //     base: "Deep Amber & Roasted Tonka"
  //   },
  //   image: "asset/Hazy Metal Luxe Jar Candle.jpg",
  //   images: [
  //     "asset/Hazy Metal Luxe Jar Candle.jpg",
  //     "asset/Hazy Metal Luxe Jar Candle_2.jpg",
  //     "asset/Hazy Metal Luxe Jar Candle_3.jpg",
  //     "asset/Hazy Metal Luxe Jar Candle_4.jpg"
  //   ],
  //   desc: "Matte gunmetal and hazy burnished finish creating an alluring moody ambiance when illuminated.",
  //   dimensions: "8.5 × 8.5 × 10 cm (280g)",
  //   stock: 14
  // },

  // 13. FLORAL GLOW METAL COLLECTION – SET OF 3 (Coming Soon)
  // {
  //   id: 44,
  //   handle: "floral-glow-metal-set-of-3",
  //   title: "Floral Glow Metal Collection – Set of 3",
  //   category: "Metal Collection",
  //   price: 849,
  //   origPrice: 999,
  //   burn: "25 Hours Per Vessel",
  //   badge: "COMING SOON",
  //   isComingSoon: true,
  //   notes: {
  //     top: "Peony Petals & Crushed Freesia",
  //     heart: "Night Jasmine & Magnolia",
  //     base: "White Musks & Soft Cashmere"
  //   },
  //   image: "asset/Floral Glow Metal Collection – Set of 3.jpg",
  //   images: [
  //     "asset/Floral Glow Metal Collection – Set of 3.jpg",
  //     "asset/Floral Glow Metal Collection – Set of 3_2.jpg",
  //     "asset/Floral Glow Metal Collection – Set of 3_3.jpg",
  //     "asset/Floral Glow Metal Collection – Set of 3_4.jpg"
  //   ],
  //   desc: "Trio of engraved botanical metal votives in rose gold, champagne gold, and burnished bronze.",
  //   dimensions: "Boxed Trio (3 × 120g)",
  //   stock: 0
  // },

  // 14. METAL GLOW VOTIVE
  // {
  //   id: 45,
  //   handle: "metal-glow-votive",
  //   title: "Metal Glow Votive",
  //   category: "Metal Collection",
  //   price: 499,
  //   origPrice: 599,
  //   burn: "25-30 Hours",
  //   badge: "",
  //   isComingSoon: false,
  //   notes: {
  //     top: "Crushed Pink Peppercorn",
  //     heart: "Orris Root & Black Violet",
  //     base: "Velvet Amber & Patchouli"
  //   },
  //   image: "asset/Metal Glow Votive.jpg",
  //   images: [
  //     "asset/Metal Glow Votive.jpg",
  //     "asset/Metal Glow Votive_2.jpg",
  //     "asset/Metal Glow Votive_3.jpg",
  //     "asset/Metal Glow Votive_4.jpg"
  //   ],
  //   desc: "Petite metallic votive engineered with pure botanical wax for powder rooms and bedside rituals.",
  //   dimensions: "6.5 × 6.5 × 7.5 cm (160g)",
  //   stock: 25
  // },

  // 15. REED DIFFUSER (Variants: Oud & Neroli)
  {
    id: 46,
    handle: "reed-diffuser",
    title: "Reed Diffuser",
    category: "Diffusers and Aromas",
    variantType: "color",
    variantTypeLabel: "Aroma & Scent",
    price: 849,
    origPrice: 999,
    burn: "60-90 Days Continuous Aroma",
    badge: "BESTSELLER",
    isComingSoon: false,
    notes: {
      top: "Royal Cambodian Oud & Tunisian Neroli",
      heart: "Incense, Rosewood & Orange Blossom",
      base: "Dark Vetiver, Tonka & Sunlit Woods"
    },
    image: "asset/Oud Reed Diffuser.jpg",
    images: [
      "asset/Oud Reed Diffuser.jpg",
      "asset/Oud Reed Diffuser_2.jpg",
      "asset/Oud Reed Diffuser_3.jpg",
      "asset/Oud Reed Diffuser_4.jpg"
    ],
    desc: "Flame-free continuous therapeutic home fragrance infused with concentrated botanical essential oils and porous natural rattan reeds in an artisan apothecary vessel.",
    dimensions: "150ml Glass Bottle + 8 Reeds",
    stock: 54,
    variants: [
      {
        id: "reed-diffuser-oud",
        title: "Oud",
        colorHex: "#4a2c11",
        price: 849,
        origPrice: 999,
        burn: "60-90 Days Continuous Aroma",
        dimensions: "150ml Glass Bottle + 8 Reeds",
        available: true,
        stock: 24,
        badge: "BESTSELLER",
        notes: {
          top: "Smoky Incense & Cardamom",
          heart: "Royal Cambodian Oud & Rosewood",
          base: "Dark Vetiver, Tonka & Amber"
        },
        desc: "The Oud Reed Diffuser delivers a rich, opulent oriental aura with notes of rare smoky agarwood, cardamom, and dark amber. Complete with porous micro-fiber black reeds.",
        image: "asset/Oud Reed Diffuser.jpg",
        images: [
          "asset/Oud Reed Diffuser.jpg",
          "asset/Oud Reed Diffuser_2.jpg",
          "asset/Oud Reed Diffuser_3.jpg",
          "asset/Oud Reed Diffuser_4.jpg"
        ]
      },
      {
        id: "reed-diffuser-neroli",
        title: "Neroli",
        colorHex: "#d97706",
        price: 849,
        origPrice: 999,
        burn: "60-90 Days Continuous Aroma",
        dimensions: "150ml Glass Apothecary Bottle + 8 Reeds",
        available: true,
        stock: 30,
        badge: "NEW ARRIVAL",
        notes: {
          top: "Pure Tunisian Neroli & Petitgrain",
          heart: "Orange Blossom & White Lily",
          base: "Sunlit Musk & Blonde Woods"
        },
        desc: "The Neroli Reed Diffuser releases an uplifting, sun-drenched floral citrus breeze distilled from pure orange blossoms and sweet petitgrain into your living spaces.",
        image: "asset/Neroli Reed Diffuser.jpg",
        images: [
          "asset/Neroli Reed Diffuser.jpg",
          "asset/Neroli Reed Diffuser_2.jpg",
          "asset/Neroli Reed Diffuser_3.jpg",
          "asset/Neroli Reed Diffuser_4.jpg"
        ]
      }
    ]
  },

  // 17. TRIO AROMA DIFFUSER SET
  // {
  //   id: 52,
  //   handle: "trio-aroma-diffuser-set",
  //   title: "Trio Aroma Diffuser Set",
  //   category: "Diffusers and Aromas",
  //   price: 799,
  //   origPrice: 899,
  //   burn: "45 Days Each (3 Vessels)",
  //   badge: "GIFT SET",
  //   isComingSoon: false,
  //   notes: {
  //     top: "Neroli, Lavender & Eucalyptus",
  //     heart: "Rose, Jasmine & Peony",
  //     base: "Sandalwood, Vanilla & Cedar"
  //   },
  //   image: "asset/Trio Aroma Diffuser Set.jpg",
  //   images: [
  //     "asset/Trio Aroma Diffuser Set.jpg",
  //     "asset/Trio Aroma Diffuser Set_2.jpg",
  //     "asset/Trio Aroma Diffuser Set_3.jpg",
  //     "asset/Trio Aroma Diffuser Set_4.jpg"
  //   ],
  //   desc: "Curated gift set of three signature diffuser aromas (50ml each) for living room, bedroom, and bath sanctuaries.",
  //   dimensions: "Gift Box (3 × 50ml + Reeds)",
  //   stock: 20
  // },

  // 18. SCENTED WARDROBE WAX TABLETS
  // {
  //   id: 65,
  //   handle: "scented-wardrobe-wax-tablets",
  //   title: "Scented Wardrobe Wax Tablets",
  //   category: "Home essentials",
  //   price: 449,
  //   origPrice: 499,
  //   burn: "90+ Days Aroma Dispersion",
  //   badge: "NEW ARRIVAL",
  //   isComingSoon: false,
  //   notes: {
  //     top: "Dried French Lavender Buds",
  //     heart: "Damask Rosebuds & Cinnamon Bark",
  //     base: "Cedar Chips & Pure Beeswax/Soy"
  //   },
  //   image: "asset/Scented Wardrobe Wax Tablets.jpg",
  //   images: [
  //     "asset/Scented Wardrobe Wax Tablets.jpg",
  //     "asset/Scented Wardrobe Wax Tablets_2.jpg",
  //     "asset/Scented Wardrobe Wax Tablets_3.jpg",
  //     "asset/Scented Wardrobe Wax Tablets_4.jpg"
  //   ],
  //   desc: "Artisanal pressed botanical wax tablets adorned with dried whole botanicals and silk hanging ribbons. Infuses closets, linens, and drawers with delicate natural fragrance.",
  //   dimensions: "Set of 2 Wax Ornaments",
  //   stock: 28
  // },

  // 19. SEVEN CHAKRA CANDLES - AMETHYST & TIGER EYE
  {
    id: 66,
    handle: "seven-chakra-candles",
    title: "Seven Chakra Candles- Amethyst and tiger",
    category: "Seven Chakra- Positivity collection",
    price: 699,
    origPrice: 749,
    burn: "35-45 Hours",
    badge: "HEALING CRYSTALS",
    isComingSoon: false,
    notes: {
      top: "White Sage & Sacred Frankincense",
      heart: "Lavender Blossom & Palo Santo",
      base: "Myrrh, Golden Amber & Sandalwood"
    },
    image: "asset/Seven Chakra Candles- Amethyst and tiger.jpg",
    images: [
      "asset/Seven Chakra Candles- Amethyst and tiger.jpg"
       // "asset/Seven Chakra Candles- Amethyst and tiger_2.jpg"
       // "asset/Seven Chakra Candles- Amethyst and tiger_3.jpg"
    ],
    desc: "Holistic positivity candle embedded with genuine raw Amethyst and Tiger's Eye crystals. Crafted to harmonize energy centers, deepen meditation, and promote serenity.",
    dimensions: "9 × 9 × 8 cm (300g)",
    stock: 18
  },

  // 20. CANDLE SNUFFER
  {
    id: 71,
    handle: "candle-snuffer",
    title: "Candle Snuffer",
    category: "Candle Accessories",
    price: 899,
    origPrice: 1199,
    burn: "Lifetime Tool",
    badge: "NEW ARRIVAL",
    isComingSoon: false,
    notes: {
      top: "Solid Brass Construction",
      heart: "360° Hinged Pivoting Bell",
      base: "Smokeless Extinguishing"
    },
    image: "asset/snuffer.jpg",
    images: [
      "asset/snuffer.jpg",
      "asset/snuffer_2.jpg",
      "asset/snuffer_3.jpg",
      "asset/snuffer_4.jpg"
    ],
    desc: "Artisanal brushed brass candle snuffer with a free-pivoting bell designed to gently extinguish candle flames without blowing wax or producing unwanted smoke. Preserves cotton wicks and maintains vessel cleanliness.",
    dimensions: "21 cm Length (120g Solid Brass)",
    stock: 45
  },

  // 21. WICK TRIMMER
  {
    id: 72,
    handle: "wick-trimmer",
    title: "Wick Trimmer",
    category: "Candle Accessories",
    price: 899,
    origPrice: 1199,
    burn: "Lifetime Tool",
    badge: "BESTSELLER",
    isComingSoon: false,
    notes: {
      top: "Precision Curved Blades",
      heart: "Debris Collection Reservoir",
      base: "Optimal 1/4\" Clean Cut"
    },
    image: "asset/wick trimmer.jpg",
    images: [
      "asset/wick trimmer.jpg",
      "asset/wick trimmer_2.jpg",
      "asset/wick trimmer_3.jpg",
      "asset/wick trimmer_4.jpg"
    ],
    desc: "Heavyweight brass candle wick trimmer featuring angled cutting jaws and a built-in debris collection reservoir. Effortlessly trims cotton wicks to the optimal 1/4-inch length before every lighting to eliminate soot, prevent mushrooming, and extend burn duration.",
    dimensions: "18 × 6 × 3 cm (140g Metal)",
    stock: 40
  }
];

/* Normalize inventory with fallback helpers */
CANDLE_INVENTORY.forEach(product => {
  product.stock = Number.isFinite(product.stock) ? product.stock : 20;
  if (!Array.isArray(product.variants) || product.variants.length === 0) {
    product.variants = [
      {
        id: `${product.id}-standard`,
        title: 'Standard',
        price: product.price,
        origPrice: product.origPrice,
        available: product.stock > 0 && !product.isComingSoon,
        stock: product.stock,
        notes: product.notes,
        desc: product.desc,
        image: product.image,
        images: product.images
      }
    ];
  }
});
