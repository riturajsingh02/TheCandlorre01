/* =========================================================
   10. POLICY CONTENT VIEWER MODAL
   ========================================================= */
// const POLICIES = {
//   shipping: {
//     title: "Shipping & Cash On Delivery Policy",
//     content: `
//       <p><strong>Courier Partners:</strong> We ship across India via Bluedart, and Express Air couriers.</p>
//       <p style="margin-top: 0.8rem;"><strong>Delivery Timelines:</strong></p>
//       <ul style="padding-left: 1.2rem; margin-top: 0.4rem;">
//         <li>Metro Cities (Delhi NCR, Mumbai, Bengaluru, etc.): 2–3 business days.</li>
//         <li>Rest of India: 4–6 business days.</li>
//       </ul>
//       <p style="margin-top: 0.8rem;"><strong>Shipping Charges:</strong> Free Express Shipping on all prepaid orders exceeding ₹999. Orders below ₹999 incur a flat ₹90 shipping charge.</p>
//       <p style="margin-top: 0.8rem;"><strong>Cash on Delivery (COD):</strong> Available on orders up to ₹999 across all verified postal codes.</p>
//     `
//   },
//   returns: {
//     title: "Returns & Refund Policy",
//     content: `
//       <p>Due to the artisanal, hand-poured botanical nature of our candles, items once lit cannot be returned.</p>
//       <p style="margin-top: 0.8rem;"><strong>Transit Damage Guarantee:</strong> In the rare event your glass jar arrives broken or damaged, please send an unboxing photo or video to our WhatsApp or email within 48 hours of delivery. We will courier an immediate free replacement.</p>
//       <p style="margin-top: 0.8rem;"><strong>Cancellation:</strong> Orders can be cancelled within 4 hours of placement before warehouse dispatch.</p>
//     `
//   },
//   privacy: {
//     title: "Privacy Policy",
//     content: `
//       <p>Your privacy is strictly guarded at The Candlorre. We utilize 256-bit SSL encryption to protect checkout information.</p>
//       <p style="margin-top: 0.8rem;">We never sell, rent, or distribute personal phone numbers, physical addresses, or financial records to third-party data aggregators.</p>
//     `
//   },
//   terms: {
//     title: "Terms of Service",
//     content: `
//       <p>All brand marks, script titles, visual photography, and proprietary fragrance blends belong strictly to The Candlorre.</p>
//       <p style="margin-top: 0.8rem;">Burn times are approximate based on optimal indoor conditions with cotton wicks regularly trimmed to 1/4 inch.</p>
//     `
//   }
// };
const POLICIES = {
  shipping: {
    title: "Shipping & Cash On Delivery (COD) Policy",
    content: `
      <p><strong>Order Processing:</strong> All orders placed on our website are dispatched through reputed national express courier partners within 24 to 48 business hours.</p>
      <p style="margin-top: 0.8rem;"><strong>Delivery Timelines:</strong></p>
      <ul style="padding-left: 1.2rem; margin-top: 0.4rem; line-height: 1.6;">
        <li><strong>Metropolitan Cities:</strong> Typically delivered within 3 to 5 business days post-dispatch.</li>
        <li><strong>Rest of India / Non-Metro Regions:</strong> Typically delivered within 5 to 7 business days.</li>
      </ul>
      <p style="margin-top: 0.8rem;"><strong>Shipping Charges:</strong> Free standard shipping is provided on prepaid orders meeting the current cart promotion threshold. Standard flat shipping fees apply on all sub-threshold orders and are visible at checkout.</p>
      <p style="margin-top: 0.8rem;"><strong>Cash on Delivery (COD):</strong> COD is available across serviceable pin codes for verified orders up to ₹999. Additional COD convenience fees may apply. Courier partners cannot hand over parcels for inspection prior to collecting full COD payment.</p>
      <p style="margin-top: 0.8rem;"><strong>Tracking:</strong> Real-time shipment tracking IDs are shared via SMS and registered email once the package is accepted by the courier facility.</p>
    `
  },
  returns: {
    title: "Returns, Exchange & Refund Policy",
    content: `
      <p><strong>Eligibility Window:</strong> Items can be requested for return or replacement within 48 hours of delivery in the event of transit breakage, physical damage, manufacturing defects, or wrong item delivery.</p>
      <p style="margin-top: 0.8rem;"><strong>Conditions for Return:</strong></p>
      <ul style="padding-left: 1.2rem; margin-top: 0.4rem; line-height: 1.6;">
        <li>The product must remain unused, unlit, unwashed, and in original condition.</li>
        <li>Original brand packaging, tags, barcode labels, and internal protective packing must be completely intact.</li>
        <li>An unboxing photograph or short video clearly highlighting the defect/breakage along with the courier invoice label is required for verification.</li>
      </ul>
      <p style="margin-top: 0.8rem;"><strong>Non-Returnable Items:</strong> Lighted candles, depleted wax items, final sale clearance items, and gift hampers with broken seals cannot be returned due to hygiene and safety standards.</p>
      <p style="margin-top: 0.8rem;"><strong>Refunds:</strong> Once the returned merchandise is received and verified at our fulfillment center, refunds will be initiated within 5 to 7 business days back to the original payment source (prepaid orders) or credited via bank transfer/store credit (COD orders).</p>
    `
  },
  privacy: {
    title: "Privacy Policy",
    content: `
      <p>We respect your right to personal data protection. This Privacy Policy governs the manner in which customer personal information is collected, maintained, and processed.</p>
      <p style="margin-top: 0.8rem;"><strong>Data Collection:</strong> We collect contact information (name, shipping address, email address, phone number) when you register, browse, or place an order on our platform.</p>
      <p style="margin-top: 0.8rem;"><strong>Payment Security:</strong> Payment card numbers, UPI credentials, and net banking information are processed directly by RBI-licensed, PCI-DSS compliant third-party payment gateways through encrypted SSL channels. We do not store financial card numbers or CVVs on our servers.</p>
      <p style="margin-top: 0.8rem;"><strong>Information Sharing:</strong> Your personal contact details are shared strictly with necessary operational partners (courier handlers, SMS notification gateways) solely to complete fulfillment. We never rent, trade, or sell your personal data to external marketing vendors.</p>
    `
  },
  terms: {
    title: "Terms of Use & Service",
    content: `
      <p>Welcome to our online store. By browsing, accessing, or placing an order on this website, you agree to abide by and be bound by these Terms of Use.</p>
      <p style="margin-top: 0.8rem;"><strong>Intellectual Property:</strong> All text, visuals, brand logos, product descriptions, photography, sound compositions, graphic designs, and digital assets are proprietary property and protected under applicable intellectual property and copyright laws.</p>
      <p style="margin-top: 0.8rem;"><strong>Product Descriptions & Pricing:</strong> We make every attempt to render colors, dimensions, and materials accurately. However, slight variations in color tone or hand-poured wax finishes may occur due to screen calibration and artisanal batch production. We reserve the right to correct typographical errors or price inaccuracies and cancel affected orders prior to fulfillment.</p>
      <p style="margin-top: 0.8rem;"><strong>Order Acceptance & Cancellation:</strong> Receipt of an order confirmation does not signify our final acceptance of your order. We reserve the unilateral right to accept, decline, or limit quantity on any order without prior liability in cases of suspected fraud or inventory unavailability.</p>
      <p style="margin-top: 0.8rem;"><strong>Governing Law:</strong> These terms shall be construed and governed in accordance with the laws of India, subject to the exclusive jurisdiction of the competent courts.</p>
    `
  }
};

function displayPolicy(policyKey) {
  const policy = POLICIES[policyKey];
  if (!policy || !dom.policyModal) return;

  dom.policyModalTitle.textContent = policy.title;
  dom.policyModalBody.innerHTML = policy.content;
  dom.policyModal.classList.add('active');
  dom.drawerOverlay?.classList.add('active');
}

function closePolicyModal() {
  dom.policyModal?.classList.remove('active');
  dom.drawerOverlay?.classList.remove('active');
}

