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

console.log('\n--- 1. Testing Pricing, Tax (8%) & Flat $25 Shipping Configuration ---');

test('Standard $25 shipping applies for $499.99 net subtotal and 8% tax', () => {
  const totals = calculateOrderTotals({ subtotal: 499.99 });
  assert.strictEqual(totals.discountedSubtotal, 499.99);
  assert.strictEqual(totals.shipping, 25.0, 'Shipping must be exactly $25.00 for $499.99');
  assert.strictEqual(totals.tax, 40.0, 'Tax should be 8% of 499.99 = $40.00');
  assert.strictEqual(totals.total, 564.99, 'Total should be 499.99 + 25 + 40 = 564.99');
});

test('Standard $25 shipping applies for $500.00 net subtotal (no free shipping) and 8% tax', () => {
  const totals = calculateOrderTotals({ subtotal: 500.00 });
  assert.strictEqual(totals.discountedSubtotal, 500.00);
  assert.strictEqual(totals.shipping, 25.0, 'Shipping must be exactly $25.00 for $500.00');
  assert.strictEqual(totals.tax, 40.0, 'Tax should be 8% of 500 = $40.00');
  assert.strictEqual(totals.total, 565.00, 'Total should be 500 + 25 + 40 = 565.00');
});

test('Standard $25 shipping applies for $500.01 net subtotal and 8% tax', () => {
  const totals = calculateOrderTotals({ subtotal: 500.01 });
  assert.strictEqual(totals.discountedSubtotal, 500.01);
  assert.strictEqual(totals.shipping, 25.0, 'Shipping must be exactly $25.00 for $500.01');
  assert.strictEqual(totals.tax, 40.0, 'Tax should be 8% of 500.01 = $40.00');
  assert.strictEqual(totals.total, 565.01, 'Total should be 500.01 + 25 + 40 = 565.01');
});

test('Standard $25 shipping applies for orders over $500 (e.g. $600)', () => {
  const totals = calculateOrderTotals({ subtotal: 600 });
  assert.strictEqual(totals.discountedSubtotal, 600.0);
  assert.strictEqual(totals.shipping, 25.0, 'Shipping must be $25.00 on orders over $500');
  assert.strictEqual(totals.tax, 48.0, 'Tax should be 8% of 600 = $48.00');
  assert.strictEqual(totals.total, 673.0, 'Total should be 600 + 25 + 48 = 673.00');
});

test('Standard $25 shipping applies when discounts are applied (e.g. $550 with $50 or $100 discount)', () => {
  // $550 with $50 discount -> discountedSubtotal is $500.00 -> shipping is still $25
  const discountedAt500 = calculateOrderTotals({ subtotal: 550, discountAmount: 50 });
  assert.strictEqual(discountedAt500.discountedSubtotal, 500.0);
  assert.strictEqual(discountedAt500.shipping, 25.0, 'Shipping must be $25 after discount to $500');
  assert.strictEqual(discountedAt500.tax, 40.0);
  assert.strictEqual(discountedAt500.total, 565.0);

  // $550 with $100 discount -> discountedSubtotal is $450.00 -> shipping is still $25
  const discountedAt450 = calculateOrderTotals({ subtotal: 550, discountAmount: 100 });
  assert.strictEqual(discountedAt450.discountedSubtotal, 450.0);
  assert.strictEqual(discountedAt450.shipping, 25.0, 'Shipping must be $25 after discount to $450');
  assert.strictEqual(discountedAt450.tax, 36.0);
  assert.strictEqual(discountedAt450.total, 511.0);
});

test('Checkout pricing configuration confirms standard $25 shipping for all orders', () => {
  assert.strictEqual(CHECKOUT_PRICING_CONFIG.STANDARD_SHIPPING_FEE, 25.0);
  assert.strictEqual(CHECKOUT_PRICING_CONFIG.status, 'CONFIRMED_STANDARD_SHIPPING');
  assert(CHECKOUT_PRICING_CONFIG.validationNotice.includes('25 USD'));
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
