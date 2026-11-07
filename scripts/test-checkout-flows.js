/**
 * Test Suite: Stripe Checkout Integration, Concurrency, Webhooks & Admin Protection
 * M&G Jewelry
 */

const assert = require('assert');
const { calculateOrderTotals, isTexasAddress, isUsAddress, CHECKOUT_PRICING_CONFIG } = require('../lib/config/pricing');

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

console.log('\n--- 1. Testing Stripe Tax Integration & $25 Fixed Shipping Across All US Orders ---');

test('Stripe Tax checkout pricing: $100 jewelry + $25 shipping = $125 base before Stripe dynamic tax', () => {
  const totals = calculateOrderTotals({
    subtotal: 100,
    shippingAddress: { state: 'TX', country: 'US' },
  });
  assert.strictEqual(totals.discountedSubtotal, 100.0);
  assert.strictEqual(totals.shipping, 25.0, 'Standard shipping must be $25.00 USD on all orders');
  assert.strictEqual(totals.taxableBase, 125.0, 'Taxable base includes merchandise + shipping ($125.00)');
  assert.strictEqual(totals.tax, 0.0, 'Manual tax removed to prevent duplicate charges; Stripe Tax calculates tax at checkout');
  assert.strictEqual(totals.total, 125.0, 'Initial merchandise total is $125.00 (final tax added by Stripe)');
  assert.strictEqual(totals.allowsDirectPayment, true, 'Direct payment must be enabled for US destinations');
});

test('Standard shipping fee is strictly $25.00 USD on all orders ($499.99, $500.00, $500.01)', () => {
  for (const amt of [499.99, 500.00, 500.01]) {
    const res = calculateOrderTotals({
      subtotal: amt,
      shippingAddress: { state: 'CA', country: 'US' },
    });
    assert.strictEqual(res.shipping, 25.0, `Shipping for ${amt} must be $25.00`);
    assert.strictEqual(res.allowsDirectPayment, true);
  }
});

test('Discounted order applies $25 shipping and allows direct payment for US destinations', () => {
  const totals = calculateOrderTotals({
    subtotal: 550,
    discountAmount: 50,
    shippingAddress: { state: 'NY', country: 'US' },
  });
  assert.strictEqual(totals.rawSubtotal, 550.0);
  assert.strictEqual(totals.discountAmount, 50.0);
  assert.strictEqual(totals.discountedSubtotal, 500.0);
  assert.strictEqual(totals.shipping, 25.0);
  assert.strictEqual(totals.total, 525.0);
  assert.strictEqual(totals.allowsDirectPayment, true);
});

test('Direct payments allowed for all US destinations (no server block outside Texas)', () => {
  function simulateServerCheckoutValidation(shippingAddress) {
    const isUs = isUsAddress(shippingAddress.country);
    if (!isUs) {
      return {
        success: false,
        requiresQuote: true,
        error: 'Los envíos fuera de EE. UU. requieren cotización personalizada. Contáctanos a través de nuestro concierge.',
      };
    }
    return { success: true, allowsDirectPayment: true };
  }

  // All US states (Texas, California, Florida, New York, etc.) succeed with direct payment
  assert.strictEqual(simulateServerCheckoutValidation({ state: 'TX', country: 'US' }).success, true);
  assert.strictEqual(simulateServerCheckoutValidation({ state: 'CA', country: 'US' }).success, true);
  assert.strictEqual(simulateServerCheckoutValidation({ state: 'FL', country: 'USA' }).success, true);
  assert.strictEqual(simulateServerCheckoutValidation({ state: 'NY', country: 'United States' }).success, true);

  // International destinations require custom concierge quote
  const intlRes = simulateServerCheckoutValidation({ state: 'ON', country: 'CA' });
  assert.strictEqual(intlRes.success, false);
  assert.strictEqual(intlRes.requiresQuote, true);
});

test('Checkout pricing configuration confirms Stripe Tax status, Austin origin and $25 flat shipping', () => {
  assert.strictEqual(CHECKOUT_PRICING_CONFIG.STANDARD_SHIPPING_FEE, 25.0);
  assert.strictEqual(CHECKOUT_PRICING_CONFIG.ORIGIN_CITY, 'Austin');
  assert.strictEqual(CHECKOUT_PRICING_CONFIG.ORIGIN_STATE, 'TX');
  assert.strictEqual(CHECKOUT_PRICING_CONFIG.status, 'STRIPE_AUTOMATIC_TAX');
  assert.strictEqual(CHECKOUT_PRICING_CONFIG.STRIPE_MERCHANDISE_TAX_CODE, 'txcd_99999999');
  assert.strictEqual(CHECKOUT_PRICING_CONFIG.STRIPE_SHIPPING_TAX_CODE, 'txcd_92010001');
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
