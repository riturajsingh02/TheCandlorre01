# The Candlorre — Project Directory Structure

A clean, modular, production-ready directory architecture separating Frontend, Backend, Assets, and Data storage.

```
/
├── frontend/                     # Complete Client-Side Application
│   ├── index.html                # Sanctuary Homepage & Hero Section
│   ├── full-catalog.html         # Complete Botanical Candle Catalog & Filtering
│   ├── category.html             # Curated Category Collection Browsing
│   ├── contact-us.html           # Concierge Inquiries & Direct Messaging
│   ├── about-us.html             # The Candlorre Brand Story & Artisanal Philosophy
│   ├── faq.html                  # Detailed Frequently Asked Questions & Burning Care
│   ├── privacy-policy.html       # Customer Privacy, Data & Cookie Policy
│   ├── terms-and-conditions.html # Store Terms & Merchant Service Conditions
│   ├── return-refund-policy.html # Return, Cancellation & Refund Guidelines
│   ├── shipping-policy.html      # Domestic & Express Shipping Protocols
│   ├── login.html                # Customer Authentication Portal
│   ├── signup.html               # New Member Account Registration
│   ├── forgot-password.html      # Secure Password Reset Request & OTP
│   ├── account.html              # Customer Dashboard & Sanctuary Profile
│   ├── edit-profile.html         # Personal Information & Preferences
│   ├── addresses.html            # Saved Delivery & Billing Addresses
│   ├── orders.html               # Order History & Financial Status
│   ├── order-details.html        # Granular Order Line Items, Tax & Receipts
│   ├── tracking.html             # Real-Time Logistics & Courier Waybill Tracking
│   ├── admin.html                # Authenticated Merchant Management Portal
│   ├── admin-login.html          # Secure Admin Session Authentication
│   ├── style.css                 # Master Aesthetic Styling & Responsive Design
│   ├── script.js                 # Global Interactive Scripts
│   ├── robots.txt                # Search Engine Crawler Directives
│   ├── sitemap.xml               # Canonical XML Sitemap
│   ├── asset/                    # Symlinked / Direct Access to Visual Media
│   └── js/                       # Modular Client-Side JavaScript Engine
│       ├── shopify.js            # Unified Storefront API Client & Session Manager
│       ├── core/
│       │   ├── data.js           # Inventory & Configuration Loader
│       │   └── analytics.js      # E-Commerce Events & Telemetry
│       ├── features/
│       │   ├── cart.js           # Cart Drawer & Stock Limitation Engine
│       │   ├── checkout.js       # Checkout, India Address & COD OTP Verification
│       │   ├── wishlist.js       # Client Wishlist Management
│       │   └── quickview.js      # Modal Product Previews
│       └── pages/
│           ├── home.js           # Homepage Featured Products & Carousels
│           ├── catalog.js        # Catalog Sorting, Filtering & Pagination
│           ├── category.js       # Category Showcase
│           ├── account.js        # Orders, Addresses & Profile Renderers
│           └── auth.js           # Login & Registration Handlers
│
├── backend/                      # Production Node.js / Express Server Engine
│   ├── api/                      # Modular API Route Controllers
│   │   ├── index.js              # Central API Router (/api)
│   │   ├── admin.js              # Admin Dashboard, Products & Inventory API
│   │   ├── products.js           # Public Products & Variant Endpoints
│   │   ├── collections.js        # Category & Collection Endpoints
│   │   ├── search.js             # Real Database Product Search
│   │   ├── cart.js               # Server-Authoritative Cart Calculation
│   │   ├── checkout.js           # Order Creation & Validation Engine
│   │   ├── customer.js           # Customer Profile & Address Management
│   │   ├── orders.js             # Order Lookup & Customer Order History
│   │   ├── tracking.js           # Shiprocket & Waybill Tracking Gateway
│   │   ├── wishlist.js           # Wishlist Persistence
│   │   ├── contact.js            # Customer Contact Submissions
│   │   └── webhooks/             # Verified Webhook Consumers (HMAC Signed)
│   │       ├── payment.js        # Razorpay & Payment Gateway Verification
│   │       ├── shiprocket.js     # Shiprocket Status Event Sync
│   │       ├── shopify-orders.js # Shopify Order Synchronization
│   │       ├── shopify-products.js # Catalog Sync
│   │       └── shopify-inventory.js # Real-time Stock Sync
│   ├── config/
│   │   └── env.js                # Centralized Environment Variables & Secrets
│   ├── controllers/              # Domain Controller Handlers
│   ├── models/                   # Database Entities & State Machines
│   │   ├── Admin.js              # Admin Credentials & Cryptographic Auth
│   │   ├── Order.js              # Order Lifecycle & Strict State Transitions
│   │   ├── AlertLog.js           # Security & System Incident Logs
│   │   ├── AlertSettings.js      # Email & SMS Notification Thresholds
│   │   ├── InventorySnapshot.js  # Hourly & Daily Stock History
│   │   └── StoreActivity.js      # Real-Time Store Activity Log
│   ├── services/                 # Business Logic & Third-Party Integrations
│   │   ├── shopify.js            # Storefront & Admin API Integration
│   │   ├── shiprocket.service.js # Automated Logistics, Manifests & AWB
│   │   ├── cod.service.js        # Rate-Limited Hashed OTP Generation & Verification
│   │   ├── payment.js            # Payment Verification & Reconciliation
│   │   ├── alertService.js       # Inventory & Order Alerts
│   │   ├── emailService.js       # Order Receipts & Dispatch Notifications
│   │   ├── scheduler.js          # Automated Cron Background Tasks
│   │   ├── customer.js           # Customer Lifecycle & Address Management
│   │   ├── cart.js               # Pricing, Tax & Shipping Calculation
│   │   ├── order.js              # Order Management Operations
│   │   ├── shipping.js           # Pincode Serviceability & Logistics
│   │   └── wishlist.js           # Wishlist Logic
│   ├── middleware/
│   │   └── adminAuth.js          # JWT & Role-Based Access Control
│   ├── db/
│   │   └── index.js              # ACID-like Atomic File-Backed Database Engine
│   ├── utils/
│   │   ├── errors.js             # Standardized HTTP Error Handling
│   │   ├── response.js           # Unified JSON Response Formatter
│   │   └── validation.js         # Input Sanitization & Schema Validation
│   └── data/                     # Primary JSON Database Stores (Auto-Synced with /data)
│
├── data/                         # Root Data Directory (Linked with backend/data)
│   ├── products.json             # 100% Real Handcrafted Candle Product Catalog
│   ├── product_variants.json     # Scent & Size Variants
│   ├── inventory.json            # Live Stock Counters & Low-Stock Thresholds
│   ├── inventory_snapshots.json  # Historical Inventory Snapshots
│   ├── users.json                # Verified Customer Accounts & Passwords (bcrypt)
│   ├── user_addresses.json       # Customer Shipping & Billing Addresses
│   ├── user_orders.json          # Customer Orders
│   ├── order_items.json          # Line Items Associated with Orders
│   ├── admins.json               # Master Admin Credentials
│   ├── cod_verifications.json    # Cryptographically Hashed COD OTP Records
│   ├── payments.json             # Verified Payment Records
│   ├── payment_transactions.json # Payment Gateway Transaction Logs
│   ├── shipments.json            # Physical Shipment Logs & Waybills
│   ├── shipment_events.json      # Courier Milestone Timeline Events
│   ├── shiprocket_orders.json    # Synced Shiprocket Orders
│   ├── shiprocket_shipments.json # Synced AWB & Manifests
│   ├── shopify_orders.json       # Shopify Synced Orders
│   ├── shopify_webhook_events.json # Processed Inbound Webhooks
│   ├── store_activity.json       # Audit Log of Real Store Activities
│   ├── alert_settings.json       # Store Notification Configuration
│   ├── alert_logs.json           # Logged System Alerts
│   └── audit_logs.json           # Administrative Audit Trail
│
├── asset/                        # Media & Static Image Assets (63 Items)
│   ├── logo.png                  # The Candlorre Brand Emblem
│   ├── Classic Pillar – White – 9.jpg
│   ├── Diamond Glow Jar – Amber.jpg
│   ├── Neroli Reed Diffuser.jpg
│   ├── Oud Reed Diffuser.jpg
│   ├── Ribbed Glow Pillar – Red.jpg
│   ├── Seven Chakra Candles- Amethyst and tiger.jpg
│   ├── Triple Glow Bowl Candle.jpg
│   ├── Golden Metal Luxe Jar Candle.jpg
│   ├── Grand Boat Candle – Large.jpg
│   ├── Grand Pillar – White – 12.jpg
│   ├── snuffer.jpg, wick trimmer.jpg, sandwax& wicks.jpg
│   └── ... (All Candle Images, Diffusers, and Accessories)
│
├── server.js                     # Unified Production Express Entry Point (Port 3000)
├── package.json                  # Dependencies & Production Build Scripts
└── metadata.json                 # AI Studio Applet Specification & Permissions
```
