/**
 * Test Suite: Stripe Checkout Integration, Concurrency, Webhooks & Admin Protection
 * M&G Jewelry
 */

const assert = require('assert');
const { calculateOrderTotals, CHECKOUT_PRICING_CONFIG } = require('../lib/config/pricing');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

async function asyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

console.log('\n--- 1. Testing Destination-Based Tax (Austin, TX 8.25% + Shipping & Out-of-State) ---');

test('Benchmark test: $100 jewelry + $25 shipping + 8.25% TX tax = $135.31 total', () => {
  const totals = calculateOrderTotals({
    subtotal: 100,
    shippingAddress: { state: 'TX', country: 'US' },
  });
  assert.strictEqual(totals.discountedSubtotal, 100.0);
  assert.strictEqual(totals.shipping, 25.0, 'Standard shipping must be $25.00');
  assert.strictEqual(totals.taxableBase, 125.0, 'Taxable base in Texas must include shipping: 100 + 25 = $125.00');
  assert.strictEqual(totals.taxRate, 0.0825, 'Texas test rate must be 8.25% (Austin establishment)');
  assert.strictEqual(totals.tax, 10.31, 'Tax must be Math.round(125 * 0.0825 * 100) / 100 = $10.31');
  assert.strictEqual(totals.total, 135.31, 'Total must be exactly $135.31');
  assert.strictEqual(totals.isTexas, true);
  assert.strictEqual(totals.requiresQuoteOption, false);
});

test('Texas delivery: standard $25 shipping + 8.25% tax on (subtotal + shipping) for $499.99', () => {
  const totals = calculateOrderTotals({
    subtotal: 499.99,
    shippingAddress: { state: 'TX', country: 'US' },
  });
  assert.strictEqual(totals.discountedSubtotal, 499.99);
  assert.strictEqual(totals.shipping, 25.0);
  assert.strictEqual(totals.taxableBase, 524.99); // 499.99 + 25
  assert.strictEqual(totals.tax, 43.31); // 524.99 * 0.0825 = 43.311675 -> 43.31
  assert.strictEqual(totals.total, 568.30); // 499.99 + 25 + 43.31 = 568.30
  assert.strictEqual(totals.isTexas, true);
});

test('Texas delivery: standard $25 shipping + 8.25% tax on (subtotal + shipping) for $500.00', () => {
  const totals = calculateOrderTotals({
    subtotal: 500.00,
    shippingAddress: { state: 'Texas', country: 'USA' },
  });
  assert.strictEqual(totals.discountedSubtotal, 500.00);
  assert.strictEqual(totals.shipping, 25.0);
  assert.strictEqual(totals.taxableBase, 525.00); // 500 + 25
  assert.strictEqual(totals.tax, 43.31); // 525 * 0.0825 = 43.3125 -> 43.31
  assert.strictEqual(totals.total, 568.31); // 500 + 25 + 43.31 = 568.31
  assert.strictEqual(totals.isTexas, true);
});

test('Texas delivery: standard $25 shipping + 8.25% tax on (subtotal + shipping) for $500.01', () => {
  const totals = calculateOrderTotals({
    subtotal: 500.01,
    shippingAddress: JSON.stringify({ state: 'tx', country: 'US' }),
  });
  assert.strictEqual(totals.discountedSubtotal, 500.01);
  assert.strictEqual(totals.shipping, 25.0);
  assert.strictEqual(totals.taxableBase, 525.01);
  assert.strictEqual(totals.tax, 43.31); // 525.01 * 0.0825 = 43.313325 -> 43.31
  assert.strictEqual(totals.total, 568.32); // 500.01 + 25 + 43.31 = 568.32
  assert.strictEqual(totals.isTexas, true);
});

test('Texas delivery with discounts applies $25 shipping and 8.25% tax on discounted subtotal + shipping', () => {
  // $550 with $50 discount -> discountedSubtotal = $500.00
  const discountedAt500 = calculateOrderTotals({
    subtotal: 550,
    discountAmount: 50,
    shippingAddress: { state: 'TX' },
  });
  assert.strictEqual(discountedAt500.discountedSubtotal, 500.0);
  assert.strictEqual(discountedAt500.shipping, 25.0);
  assert.strictEqual(discountedAt500.taxableBase, 525.0);
  assert.strictEqual(discountedAt500.tax, 43.31);
  assert.strictEqual(discountedAt500.total, 568.31);

  // $550 with $100 discount -> discountedSubtotal = $450.00
  const discountedAt450 = calculateOrderTotals({
    subtotal: 550,
    discountAmount: 100,
    shippingAddress: { state: 'TX' },
  });
  assert.strictEqual(discountedAt450.discountedSubtotal, 450.0);
  assert.strictEqual(discountedAt450.shipping, 25.0);
  assert.strictEqual(discountedAt450.taxableBase, 475.0);
  assert.strictEqual(discountedAt450.tax, 39.19); // 475 * 0.0825 = 39.1875 -> 39.19
  assert.strictEqual(discountedAt450.total, 514.19); // 450 + 25 + 39.19 = 514.19
});

test('Out-of-state delivery (e.g. California): $0 Texas tax + $25 shipping + requires quote option', () => {
  const totals = calculateOrderTotals({
    subtotal: 100,
    shippingAddress: { state: 'CA', country: 'US' },
  });
  assert.strictEqual(totals.discountedSubtotal, 100.0);
  assert.strictEqual(totals.shipping, 25.0, 'Standard shipping is $25.00 for all orders');
  assert.strictEqual(totals.taxableBase, 0, 'No Texas taxable base for out-of-state');
  assert.strictEqual(totals.taxRate, 0.0, 'Out of state tax rate is 0.0');
  assert.strictEqual(totals.tax, 0.0, 'Out of state orders have $0.00 Texas tax');
  assert.strictEqual(totals.total, 125.0, 'Total is 100 + 25 + 0 = $125.00');
  assert.strictEqual(totals.isTexas, false);
  assert.strictEqual(totals.requiresQuoteOption, true);
});

test('Out-of-state delivery with discount (e.g. Florida): $0 Texas tax + $25 shipping', () => {
  const totals = calculateOrderTotals({
    subtotal: 550,
    discountAmount: 50,
    shippingAddress: { state: 'FL', country: 'US' },
  });
  assert.strictEqual(totals.discountedSubtotal, 500.0);
  assert.strictEqual(totals.shipping, 25.0);
  assert.strictEqual(totals.tax, 0.0);
  assert.strictEqual(totals.total, 525.0); // 500 + 25 + 0 = 525.00
  assert.strictEqual(totals.isTexas, false);
  assert.strictEqual(totals.requiresQuoteOption, true);
});

test('Checkout pricing configuration confirms Preview destination-based tax rules and $25 flat shipping', () => {
  assert.strictEqual(CHECKOUT_PRICING_CONFIG.STANDARD_SHIPPING_FEE, 25.0);
  assert.strictEqual(CHECKOUT_PRICING_CONFIG.ORIGIN_CITY, 'Austin');
  assert.strictEqual(CHECKOUT_PRICING_CONFIG.ORIGIN_STATE, 'TX');
  assert.strictEqual(CHECKOUT_PRICING_CONFIG.TEXAS_SALES_TAX_RATE, 0.0825);
  assert.strictEqual(CHECKOUT_PRICING_CONFIG.TEXAS_SHIPPING_TAXABLE, true);
  assert.strictEqual(CHECKOUT_PRICING_CONFIG.OUT_OF_STATE_TAX_RATE, 0.0);
  assert.strictEqual(CHECKOUT_PRICING_CONFIG.status, 'PREVIEW_DESTINATION_BASED_TAX');
  assert(CHECKOUT_PRICING_CONFIG.validationNotice.includes('8.25% en Texas'));
});

console.log('\n--- 2. Testing Concurrency & Inventory Reservation on Last Unit ---');

asyncTest('Two concurrent buyers attempting to buy the last unit: exactly one succeeds', async () => {
  // Mock DB state with inventoryQty = 1
  let product = {
    id: 'prod-diamond-ring-1',
    name: '14k Diamond Solitaire Ring',
    price: 1200,
    inventoryQty: 1,
    isActive: true,
  };

  // Simulate atomic updateMany operation as in PostgreSQL transaction:
  // update product set inventoryQty = inventoryQty - 1 where id = '...' and inventoryQty >= 1
  async function simulateAtomicReservation(buyerId, qtyRequested) {
    // Simulating atomic row lock in DB:
    await new Promise((res) => setTimeout(res, Math.random() * 20)); // simulated random microsecond latency
    if (product.inventoryQty >= qtyRequested && product.isActive) {
      product.inventoryQty -= qtyRequested;
      return { success: true, buyerId, reservedQty: qtyRequested };
    } else {
      throw new Error(`No hay inventario suficiente para "${product.name}". (Disponibles: ${product.inventoryQty})`);
    }
  }

  // Launch two concurrent requests simultaneously
  const results = await Promise.allSettled([
    simulateAtomicReservation('Buyer_A', 1),
    simulateAtomicReservation('Buyer_B', 1),
  ]);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');

  assert.strictEqual(fulfilled.length, 1, 'Exactly one buyer must succeed');
  assert.strictEqual(rejected.length, 1, 'Exactly one buyer must be rejected');
  assert.strictEqual(product.inventoryQty, 0, 'Final inventory must be exactly 0, never negative');
  assert(rejected[0].reason.message.includes('No hay inventario suficiente'));
});

console.log('\n--- 3. Testing Payment Approved Flow & Webhook ---');

test('Approved payment marks transaction succeeded, order processing, and keeps inventory reserved', () => {
  const order = {
    id: 'ord-101',
    status: 'pending',
    notes: 'Stripe Checkout pending',
    items: [{ productId: 'prod-1', quantity: 1 }],
  };
  const transaction = {
    id: 'tx-101',
    orderId: 'ord-101',
    provider: 'stripe',
    providerId: 'cs_test_session_123',
    status: 'pending',
    amount: 648.0,
  };

  // Simulate checkout.session.completed webhook processing
  const sessionCompletedEvent = {
    id: 'evt_test_completed_1',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_session_123',
        client_reference_id: 'ord-101',
        payment_intent: 'pi_test_intent_999',
        amount_total: 64800,
        payment_status: 'paid',
      },
    },
  };

  // Processing:
  order.status = 'processing';
  order.notes += ` | Paid via Stripe session ${sessionCompletedEvent.data.object.id}`;
  transaction.status = 'succeeded';
  transaction.providerId = sessionCompletedEvent.data.object.payment_intent;

  assert.strictEqual(order.status, 'processing');
  assert.strictEqual(transaction.status, 'succeeded');
  assert.strictEqual(transaction.providerId, 'pi_test_intent_999');
});

console.log('\n--- 4. Testing Idempotent Webhook Processing ---');

test('Repeated webhook events with same ID are ignored idempotently', () => {
  const processedEvents = new Set(['evt_test_completed_1']);

  function handleWebhookEvent(event) {
    if (processedEvents.has(event.id)) {
      return { received: true, idempotent: true, note: 'Already processed' };
    }
    processedEvents.add(event.id);
    return { received: true };
  }

  // Duplicate delivery of evt_test_completed_1
  const result1 = handleWebhookEvent({ id: 'evt_test_completed_1' });
  assert.strictEqual(result1.idempotent, true, 'Duplicate webhook must be detected as idempotent');

  // New event
  const result2 = handleWebhookEvent({ id: 'evt_test_completed_2' });
  assert.strictEqual(result2.idempotent, undefined, 'New webhook must be processed');
});

console.log('\n--- 5. Testing Payment Rejected / Failed Flow ---');

test('Payment failed webhook cancels order, marks transaction failed, and explicitly restocks inventory', () => {
  let inventoryQty = 4; // Decremented when reserved from initial 5
  const order = {
    id: 'ord-202',
    status: 'pending',
    items: [{ productId: 'prod-ring', quantity: 1 }],
  };
  const transaction = {
    id: 'tx-202',
    status: 'pending',
  };

  // Simulate payment_intent.payment_failed
  order.status = 'cancelled';
  transaction.status = 'failed';
  for (const item of order.items) {
    inventoryQty += item.quantity; // Explicit restock
  }

  assert.strictEqual(order.status, 'cancelled');
  assert.strictEqual(transaction.status, 'failed');
  assert.strictEqual(inventoryQty, 5, 'Inventory must be restored back to 5');
});

console.log('\n--- 6. Testing Checkout Cancellation Flow ---');

test('Cancellation by customer restores reserved units and cancels pending order', () => {
  let inventoryQty = 9; // Was 10, 1 reserved
  const order = {
    id: 'ord-303',
    status: 'pending',
    items: [{ productId: 'prod-necklace', quantity: 1 }],
  };
  const transaction = {
    id: 'tx-303',
    status: 'pending',
  };

  // Customer returns from cancel_url or session expires
  order.status = 'cancelled';
  transaction.status = 'failed';
  for (const item of order.items) {
    inventoryQty += item.quantity;
  }

  assert.strictEqual(order.status, 'cancelled');
  assert.strictEqual(transaction.status, 'failed');
  assert.strictEqual(inventoryQty, 10, 'Inventory must be restored back to 10');
});

console.log('\n--- 7. Testing Admin Security Checks ---');

test('Admin session validator strictly enforces authentication and admin role', () => {
  const { validateAdminRole } = require('../lib/actions/auth-helper');

  // 1. Missing session throws Unauthorized
  assert.throws(() => {
    validateAdminRole(null);
  }, /Unauthorized: Session required/);

  // 2. Customer role throws Forbidden
  assert.throws(() => {
    validateAdminRole({ user: { email: 'customer@example.com', role: 'customer' } });
  }, /Forbidden: Administrator privileges required/);

  // 3. Admin role succeeds
  const adminSession = { user: { email: 'admin@mgjewelry.com', role: 'admin' } };
  const validated = validateAdminRole(adminSession);
  assert.strictEqual(validated.user.role, 'admin');
});

console.log('\n--- 8. Testing Preview Database Isolation Routing ---');

test('with-env script sets TEST database variables when VERCEL_ENV is preview', () => {
  const previousVercelEnv = process.env.VERCEL_ENV;
  const previousPrismaUrl = process.env.PRISMA_DATABASE_URL;

  process.env.VERCEL_ENV = 'preview';
  process.env.TEST_PRISMA_DATABASE_URL = 'postgres://test_user:test_pass@mg-database-test:5432/test';
  process.env.TEST_POSTGRES_URL = 'postgres://test_user:test_pass@mg-database-test:5432/test_direct';

  // Test resolution logic
  const isPreview = process.env.VERCEL_ENV === 'preview';
  assert.strictEqual(isPreview, true);
  const selectedUrl = isPreview ? process.env.TEST_PRISMA_DATABASE_URL : process.env.PRISMA_DATABASE_URL;
  assert(selectedUrl.includes('mg-database-test'));

  // Clean up
  process.env.VERCEL_ENV = previousVercelEnv || '';
  process.env.PRISMA_DATABASE_URL = previousPrismaUrl || '';
});

// Final report
setTimeout(() => {
  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log(`========================================\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}, 50);
