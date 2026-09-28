# The Candlorre — Production API Documentation

Comprehensive technical documentation for all backend endpoints, authentication protocols, payment verifications, logistics integrations, and webhook specifications.

**Base URL**: `https://thecandlorre.com` (Production) / `http://localhost:3000` (Local)

---

## 1. Authentication APIs

### 1.1 Customer Registration
- **METHOD**: `POST`
- **URL**: `/api/auth/register` (or `/api/customer/register`)
- **Authentication**: None (Public)
- **Request Body**:
```json
{
  "firstName": "Aarav",
  "lastName": "Sharma",
  "email": "aarav.sharma@example.com",
  "phone": "9876543210",
  "password": "StrongPassword123!",
  "remember": true
}
```
- **Success Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": "rec_...",
      "firstName": "Aarav",
      "lastName": "Sharma",
      "email": "aarav.sharma@example.com",
      "phone": "9876543210",
      "tier": "Sanctuary Connoisseur"
    },
    "accessToken": "eyJhbGciOi...",
    "expiresAt": "2026-10-05T12:00:00.000Z"
  },
  "message": "Account created successfully."
}
```
- **Errors**: `400 Validation Error`, `409 EMAIL_EXISTS`, `409 PHONE_EXISTS`.

---

### 1.2 Customer Login
- **METHOD**: `POST`
- **URL**: `/api/auth/login` (or `/api/customer/login`)
- **Authentication**: None (Public, Rate Limited: 20 req / 15 min)
- **Request Body**:
```json
{
  "identifier": "aarav.sharma@example.com",
  "password": "StrongPassword123!",
  "remember": true
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "customer": { "id": "rec_...", "displayName": "Aarav Sharma", "email": "aarav.sharma@example.com" },
    "accessToken": "eyJhbGciOi...",
    "expiresAt": "2026-10-05T12:00:00.000Z"
  },
  "message": "Authenticated successfully."
}
```
- **Errors**: `401 INVALID_CREDENTIALS`, `423 ACCOUNT_LOCKED` (after 5 failed attempts).

---

### 1.3 Customer Logout
- **METHOD**: `POST`
- **URL**: `/api/auth/logout`
- **Authentication**: Bearer Token or Cookie
- **Request Body**: `{}`
- **Response**: `{ "success": true, "data": { "loggedOut": true } }`

---

## 2. Administrator Authentication APIs

### 2.1 Admin Portal Login
- **METHOD**: `POST`
- **URL**: `/api/admin/login`
- **Authentication**: None (Rate Limited: 20 req / 15 min)
- **Request Body**:
```json
{
  "email": "thecandlorre@gmail.com",
  "password": "SecureAdminPassword"
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "adm_...",
      "email": "thecandlorre@gmail.com",
      "name": "The Candlorre Admin",
      "role": "superadmin"
    },
    "token": "eyJhbGciOi..."
  },
  "message": "Administrator authenticated successfully."
}
```
- **Cookie**: Sets secure `candlorre_admin_token` (HTTP-only, SameSite: None/Lax).
- **Errors**: `401 Invalid administrator credentials`, `423 Account temporarily locked`.

---

### 2.2 Admin Session Termination
- **METHOD**: `POST`
- **URL**: `/api/admin/logout`
- **Authentication**: Admin Cookie or Bearer Token
- **Response**: `{ "success": true, "message": "Admin session terminated." }`

---

## 3. Checkout & Payment APIs

### 3.1 Initialize Checkout Totals
- **METHOD**: `POST`
- **URL**: `/api/checkout`
- **Authentication**: None (Public)
- **Request Body**:
```json
{
  "items": [{ "id": "candle_01", "price": 1299, "quantity": 1 }],
  "couponCode": "SAVE5",
  "paymentMethod": "prepaid"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "totals": {
      "subtotal": 1299,
      "discountAmount": 65,
      "discountLabel": "Inaugural Discount (SAVE5 – 5%)",
      "shipping": 0,
      "finalTotal": 1234,
      "currency": "INR"
    },
    "paymentMethod": "prepaid",
    "razorpayKeyId": "rzp_live_...",
    "isRazorpayConfigured": true
  }
}
```

---

### 3.2 Initialize Razorpay Gateway Order
- **METHOD**: `POST`
- **URL**: `/api/checkout/razorpay-order`
- **Authentication**: None
- **Request Body**:
```json
{
  "items": [{ "id": "candle_01", "price": 1299, "quantity": 1 }],
  "couponCode": "SAVE5"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "orderId": "order_Hn9K...",
    "amount": 123400,
    "currency": "INR",
    "keyId": "rzp_live_..."
  },
  "message": "Official Razorpay order initialized."
}
```
- **Errors**: `503 Payment gateway credentials are not configured on this server.`

---

### 3.3 Confirm & Process Order (Prepaid & COD)
- **METHOD**: `POST`
- **URL**: `/api/checkout/process`
- **Authentication**: Optional Customer Bearer Token
- **Request Body (Prepaid)**:
```json
{
  "items": [{ "title": "Diamond Glow Jar", "price": 1299, "qty": 1, "sku": "DGJ-AMB" }],
  "paymentMethod": "prepaid",
  "couponCode": "SAVE5",
  "shippingAddress": {
    "name": "Rituraj Singh",
    "phone": "9876543210",
    "address": "124 Sanctuary Boulevard",
    "city": "Pune",
    "pincode": "411001",
    "state": "Maharashtra"
  },
  "paymentDetails": {
    "razorpay_order_id": "order_Hn9K...",
    "razorpay_payment_id": "pay_Mn8Q...",
    "razorpay_signature": "e5812..."
  }
}
```
- **Request Body (COD)**:
```json
{
  "items": [{ "title": "Diamond Glow Jar", "price": 1299, "qty": 1, "sku": "DGJ-AMB" }],
  "paymentMethod": "cod",
  "shippingAddress": {
    "name": "Rituraj Singh",
    "phone": "9876543210",
    "address": "124 Sanctuary Boulevard",
    "city": "Pune",
    "pincode": "411001",
    "state": "Maharashtra"
  }
}
```
- **Success Response (COD)**:
```json
{
  "success": true,
  "data": {
    "orderId": "ord_...",
    "orderNumber": "TC10001",
    "requiresOtp": true,
    "phone": "98******10",
    "expiresInMinutes": 10,
    "message": "Verification code sent to 98******10."
  }
}
```
- **Success Response (Prepaid)**:
```json
{
  "success": true,
  "data": {
    "orderId": "ord_...",
    "orderNumber": "TC10001",
    "financialStatus": "PAID",
    "totalPrice": 1234
  },
  "message": "Payment verified! Your order has been placed successfully."
}
```
- **Errors**: `400 Payment verification details missing`, `400 Invalid payment signature`, `400 Delivery details incomplete`.

---

## 4. COD OTP Verification APIs

### 4.1 Verify COD Confirmation Code
- **METHOD**: `POST`
- **URL**: `/api/checkout/cod/verify-otp`
- **Authentication**: None
- **Request Body**:
```json
{
  "orderId": "ord_...",
  "otp": "489201"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "orderNumber": "TC10001",
    "orderId": "ord_...",
    "verified": true,
    "message": "Cash on Delivery order verified successfully!"
  }
}
```
- **Errors**: `400 Invalid verification code. 4 attempt(s) remaining.`, `400 Verification code has expired.`, `400 Maximum verification attempts exceeded.`

---

### 4.2 Resend COD OTP
- **METHOD**: `POST`
- **URL**: `/api/checkout/cod/resend-otp`
- **Request Body**:
```json
{
  "orderId": "ord_..."
}
```
- **Errors**: `400 Please wait X seconds before requesting a new verification code.`

---

## 5. Logistics & Order Tracking APIs

### 5.1 Real Order Tracking Lookup
- **METHOD**: `GET` or `POST`
- **URL**: `/api/tracking/:identifier` (or `/api/tracking?identifier=TC10001`)
- **Authentication**: None (Public)
- **Response (Found)**:
```json
{
  "success": true,
  "data": {
    "found": true,
    "orderNumber": "TC10001",
    "date": "2026-09-28T05:00:00.000Z",
    "orderStatus": "SHIPPED",
    "financialStatus": "PAID",
    "courier": "Bluedart Express",
    "trackingNumber": "1849201948",
    "trackingUrl": "https://shiprocket.co/tracking/1849201948",
    "status": "In Transit to Destination Hub",
    "hasAwbAssigned": true,
    "estimatedDelivery": "2-3 Business Days",
    "timeline": [
      { "location": "Pune Hub", "status": "Manifested & Picked Up", "date": "2026-09-28 14:00" }
    ],
    "items": [{ "title": "Diamond Glow Jar", "quantity": 1, "variant": "Amber Glow" }]
  }
}
```
- **Response (Not Found - Real Data Only)**:
```json
{
  "success": true,
  "data": {
    "found": false,
    "message": "No active order or parcel was found matching \"XYZ\". Please verify your Order Number or Waybill and try again."
  }
}
```

---

## 6. Webhook Endpoints (Idempotent & Authenticated)

### 6.1 Shopify Webhook Handler
- **METHOD**: `POST`
- **URL**: `/api/webhooks/shopify-orders`
- **Header**: `x-shopify-hmac-sha256: <base64_hmac>`, `x-shopify-topic: <topic>`, `x-shopify-webhook-id: <id>`
- **Authentication**: Validated against `SHOPIFY_WEBHOOK_SECRET` using raw body HMAC SHA-256.
- **Handled Topics**: `orders/create`, `orders/updated`, `orders/paid`, `orders/cancelled`, `fulfillments/create`, `fulfillments/update`.
- **Response**: `200 OK { "received": true }` / `401 Unauthorized webhook signature`.

---

### 6.2 Razorpay Webhook Handler
- **METHOD**: `POST`
- **URL**: `/api/webhooks/payment`
- **Header**: `x-razorpay-signature: <hex_signature>`, `x-razorpay-event-id: <id>`
- **Authentication**: Validated against `RAZORPAY_WEBHOOK_SECRET` using raw body HMAC SHA-256.
- **Handled Events**: `payment.captured`, `order.paid`, `payment.failed`.
- **Response**: `200 OK { "received": true }` / `401 Unauthorized webhook signature`.

---

### 6.3 Shiprocket Webhook Handler
- **METHOD**: `POST`
- **URL**: `/api/webhooks/shiprocket`
- **Header**: Optional `x-api-key: <token>`
- **Authentication**: Validated against `SHIPROCKET_WEBHOOK_TOKEN`.
- **Handled Updates**: Status transitions (`PICKED UP`, `IN TRANSIT`, `OUT FOR DELIVERY`, `DELIVERED`, `CANCELLED`).
- **Response**: `200 OK { "received": true }`.

---

## 7. Protected Admin Dashboard APIs

All endpoints require `requireAdminAuth` (via `candlorre_admin_token` cookie or `Authorization: Bearer <token>`).

### 7.1 Admin Metric Summary
- **METHOD**: `GET`
- **URL**: `/api/admin/dashboard`
- **Response**:
```json
{
  "success": true,
  "data": {
    "orders": {
      "total": 0,
      "today": 0,
      "totalRevenue": 0,
      "pending": 0,
      "codPending": 0,
      "confirmed": 0,
      "paid": 0,
      "processing": 0,
      "packed": 0,
      "shipped": 0,
      "delivered": 0,
      "cancelled": 0
    },
    "inventory": { "totalUnits": 0, "totalVariants": 0 },
    "integrations": {
      "shopifyConfigured": true,
      "shiprocketConfigured": false,
      "razorpayConfigured": false
    }
  }
}
```

### 7.2 List Real Orders
- **METHOD**: `GET`
- **URL**: `/api/admin/orders`
- **Query Params**: `status`, `financialStatus`, `search`
- **Response**: `{ "success": true, "data": { "orders": [...], "total": 0 } }`

### 7.3 Push Order to Shiprocket
- **METHOD**: `POST`
- **URL**: `/api/admin/orders/:id/shiprocket-create`
- **Response**: `{ "success": true, "data": { "shiprocketOrder": { "shiprocketOrderId": 12345, "shipmentId": 67890 } } }`

### 7.4 Assign Real AWB on Shiprocket
- **METHOD**: `POST`
- **URL**: `/api/admin/orders/:id/shiprocket-awb`
- **Response**: `{ "success": true, "data": { "shipment": { "awbCode": "1849201948", "courierName": "Bluedart" } } }`

### 7.5 Transition Order State
- **METHOD**: `POST`
- **URL**: `/api/admin/orders/:id/status`
- **Request Body**: `{ "status": "PACKED", "reason": "Packed in workshop" }`
- **Response**: `{ "success": true, "data": { "order": { "status": "PACKED" } } }`
