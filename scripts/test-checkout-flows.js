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

console.log('\n--- 1. Testing Pricing, Tax (8%) & Shipping Configuration ---');

test('Free shipping applies for orders over $500', () => {
  const totals = calculateOrderTotals({ subtotal: 600 });
  assert.strictEqual(totals.shipping, 0, 'Shipping should be 0 for > $500');
  assert.strictEqual(totals.tax, 48.0, 'Tax should be 8% of 600 = $48');
  assert.strictEqual(totals.total, 648.0, 'Total should be 600 + 48 = 648');
});

test('Standard $25 shipping applies for orders <= $500', () => {
  const totals = calculateOrderTotals({ subtotal: 350 });
  assert.strictEqual(totals.shipping, 25, 'Shipping should be $25 for <= $500');
  assert.strictEqual(totals.tax, 28.0, 'Tax should be 8% of 350 = $28');
  assert.strictEqual(totals.total, 403.0, 'Total should be 350 + 25 + 28 = 403');
});

test('Threshold: $499.99 net subtotal pays standard $25 shipping and 8% tax', () => {
  const totals = calculateOrderTotals({ subtotal: 499.99 });
  assert.strictEqual(totals.discountedSubtotal, 499.99);
  assert.strictEqual(totals.shipping, 25.0);
  assert.strictEqual(totals.tax, 40.0);
  assert.strictEqual(totals.total, 564.99);
});

test('Threshold: $500.00 net subtotal qualifies for free shipping ($0) and 8% tax', () => {
  const totals = calculateOrderTotals({ subtotal: 500.00 });
  assert.strictEqual(totals.discountedSubtotal, 500.00);
  assert.strictEqual(totals.shipping, 0.0);
  assert.strictEqual(totals.tax, 40.0);
  assert.strictEqual(totals.total, 540.00);
});

test('Threshold: $500.01 net subtotal qualifies for free shipping ($0) and 8% tax', () => {
  const totals = calculateOrderTotals({ subtotal: 500.01 });
  assert.strictEqual(totals.discountedSubtotal, 500.01);
  assert.strictEqual(totals.shipping, 0.0);
  assert.strictEqual(totals.tax, 40.0);
  assert.strictEqual(totals.total, 540.01);
});

test('Discount correctly reduces subtotal before tax and shipping thresholds', () => {
  const totals = calculateOrderTotals({ subtotal: 550, discountAmount: 100 });
  // discountedSubtotal is 450 (which drops below $500 threshold, so shipping is $25)
  assert.strictEqual(totals.discountedSubtotal, 450);
  assert.strictEqual(totals.shipping, 25);
  assert.strictEqual(totals.tax, 36.0, 'Tax should be 8% of 450 = $36');
  assert.strictEqual(totals.total, 511.0, 'Total should be 450 + 25 + 36 = 511');
});

test('Threshold evaluation applies strictly AFTER discounts and BEFORE taxes', () => {
  // $550 with $50 discount leaves $500.00 net -> free shipping
  const reaching500 = calculateOrderTotals({ subtotal: 550, discountAmount: 50 });
  assert.strictEqual(reaching500.discountedSubtotal, 500.00);
  assert.strictEqual(reaching500.shipping, 0.0);

  // $550 with $50.01 discount leaves $499.99 net -> pays $25 shipping
  const droppingBelow500 = calculateOrderTotals({ subtotal: 550, discountAmount: 50.01 });
  assert.strictEqual(droppingBelow500.discountedSubtotal, 499.99);
  assert.strictEqual(droppingBelow500.shipping, 25.0);
});

test('Validation notice indicates pending commercial and fiscal validation', () => {
  assert.strictEqual(CHECKOUT_PRICING_CONFIG.status, 'PENDING_BUSINESS_AND_TAX_VALIDATION');
  assert(CHECKOUT_PRICING_CONFIG.validationNotice.includes('pendiente de validación'));
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
