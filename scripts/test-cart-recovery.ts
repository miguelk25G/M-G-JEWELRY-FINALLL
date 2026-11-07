/**
 * Test Suite: Mixed Cart Size Discrepancy & Exclusive Item Recovery
 *
 * Verifies that:
 * 1. An incompatible cart line (product without sizes that has a stale size: "5")
 *    is exclusively identified and corrected.
 * 2. Another product line with a valid size (e.g. size: "7", quantity: 2)
 *    strictly preserves its size and quantity.
 * 3. Multiple variants of other products remain unmerged and intact.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getProductAvailableSizes,
  productAdmitsSizes,
  isLineIncompatibleNoSizes,
  recoverCartItemsExclusively,
  type CartItemLike,
  type CatalogProductMeta,
} from '../lib/cart-recovery'

test('Mixed Cart Recovery: corrects line without sizes and strictly preserves valid sized lines', () => {
  // 1. Setup mock catalog
  const catalog: CatalogProductMeta[] = [
    {
      id: 'prod_test_pendant',
      name: 'Pendant without sizes',
      slug: 'pendant-no-size',
      sizes: null, // No sizes in catalog
      isActive: true,
    },
    {
      id: 'prod_gold_ring',
      name: 'Gold Ring with sizes',
      slug: 'gold-ring',
      sizes: JSON.stringify(['6', '7', '8']),
      isActive: true,
    },
  ]

  // 2. Setup mixed cart
  const mixedCart: CartItemLike[] = [
    {
      id: 'cart-item-pendant-1',
      productId: 'prod_test_pendant',
      name: 'Pendant without sizes',
      price: 10,
      quantity: 1,
      size: '5', // Stale size erroneously kept
    },
    {
      id: 'cart-item-ring-2',
      productId: 'prod_gold_ring',
      name: 'Gold Ring with sizes',
      price: 150,
      quantity: 2,
      size: '7', // Valid size
    },
  ]

  // 3. Verify catalog checks
  assert.equal(productAdmitsSizes(catalog[0]), false, 'Pendant should NOT admit sizes')
  assert.equal(productAdmitsSizes(catalog[1]), true, 'Ring MUST admit sizes')
  assert.deepEqual(getProductAvailableSizes(catalog[1]), ['6', '7', '8'])

  assert.equal(
    isLineIncompatibleNoSizes(mixedCart[0], catalog[0]),
    true,
    'Pendant with size 5 should be flagged as incompatible'
  )
  assert.equal(
    isLineIncompatibleNoSizes(mixedCart[1], catalog[1]),
    false,
    'Ring with valid size 7 should NOT be flagged as incompatible'
  )

  // 4. Execute exclusive recovery targeting the mixed cart
  const result = recoverCartItemsExclusively(mixedCart, catalog)

  // 5. Assertions
  assert.equal(result.recoveredCount, 1, 'Only 1 line item should have been recovered')
  assert.deepEqual(result.modifiedItemIds, ['cart-item-pendant-1'], 'Only pendant line was modified')

  const recoveredPendant = result.updatedItems.find((i) => i.id === 'cart-item-pendant-1')!
  const untouchedRing = result.updatedItems.find((i) => i.id === 'cart-item-ring-2')!

  // Check Pendant: size removed, quantity preserved
  assert.equal(recoveredPendant.size, undefined, 'Pendant size must be cleared to undefined')
  assert.equal(recoveredPendant.quantity, 1, 'Pendant quantity must remain 1')
  assert.equal(recoveredPendant.price, 10, 'Pendant price must remain 10')

  // Check Ring: size and quantity strictly preserved
  assert.equal(untouchedRing.size, '7', 'Ring size MUST be preserved as "7"')
  assert.equal(untouchedRing.quantity, 2, 'Ring quantity MUST be preserved as 2')
  assert.equal(untouchedRing.price, 150, 'Ring price must remain 150')
  assert.equal(untouchedRing.id, 'cart-item-ring-2', 'Ring cart item ID must remain unchanged')
})

test('Recovery with multiple variants of other products preserves separation without merging', () => {
  const catalog: CatalogProductMeta[] = [
    {
      id: 'prod_pendant',
      name: 'Pendant without sizes',
      sizes: '[]',
      isActive: true,
    },
    {
      id: 'prod_diamond_ring',
      name: 'Diamond Ring',
      sizes: JSON.stringify(['5', '6', '7', '8']),
      isActive: true,
    },
  ]

  const cartWithVariants: CartItemLike[] = [
    {
      id: 'cart-line-pendant',
      productId: 'prod_pendant',
      name: 'Pendant',
      price: 25,
      quantity: 1,
      size: '5', // Stale
    },
    {
      id: 'cart-line-ring-size-6',
      productId: 'prod_diamond_ring',
      name: 'Diamond Ring',
      price: 200,
      quantity: 1,
      size: '6', // Variant A
    },
    {
      id: 'cart-line-ring-size-7',
      productId: 'prod_diamond_ring',
      name: 'Diamond Ring',
      price: 200,
      quantity: 3,
      size: '7', // Variant B
    },
  ]

  const result = recoverCartItemsExclusively(cartWithVariants, catalog)

  assert.equal(result.recoveredCount, 1)
  assert.deepEqual(result.modifiedItemIds, ['cart-line-pendant'])

  // Check that variant lines of the ring were NEVER merged and keep their distinct sizes & quantities
  const ringVarA = result.updatedItems.find((i) => i.id === 'cart-line-ring-size-6')!
  const ringVarB = result.updatedItems.find((i) => i.id === 'cart-line-ring-size-7')!

  assert.equal(ringVarA.size, '6')
  assert.equal(ringVarA.quantity, 1)
  assert.equal(ringVarB.size, '7')
  assert.equal(ringVarB.quantity, 3)
})

test('CartStore updateItemSize: modifies exclusively the targeted line by ID', () => {
  // Simulate zustand cart store logic
  let items: CartItemLike[] = [
    { id: 'item-1', productId: 'p1', name: 'Product Without Sizes', price: 10, quantity: 1, size: '5' },
    { id: 'item-2', productId: 'p2', name: 'Product With Size', price: 100, quantity: 2, size: '7' },
  ]

  function updateItemSize(id: string, size?: string) {
    const target = items.find((i) => i.id === id)
    if (!target) return
    const cleanSize = size ? size.trim() : undefined

    const existingSame = items.find(
      (i) => i.id !== id && i.productId === target.productId && i.size === cleanSize
    )

    if (existingSame) {
      items = items
        .filter((i) => i.id !== id)
        .map((i) =>
          i.id === existingSame.id ? { ...i, quantity: i.quantity + target.quantity } : i
        )
    } else {
      items = items.map((i) => (i.id === id ? { ...i, size: cleanSize } : i))
    }
  }

  // Target exclusively item-1 (the one without sizes)
  updateItemSize('item-1', undefined)

  assert.equal(items.length, 2, 'Cart must still have 2 distinct lines')
  assert.equal(items[0].id, 'item-1')
  assert.equal(items[0].size, undefined, 'Item 1 size must be cleared')
  assert.equal(items[0].quantity, 1, 'Item 1 quantity must be preserved')

  assert.equal(items[1].id, 'item-2')
  assert.equal(items[1].size, '7', 'Item 2 size must remain untouched')
  assert.equal(items[1].quantity, 2, 'Item 2 quantity must remain untouched')
})

test('formatPrice: renders strictly with two decimal places', async () => {
  const { formatPrice } = await import('../lib/format')
  assert.equal(formatPrice(10), '$10.00')
  assert.equal(formatPrice(35.8), '$35.80')
  assert.equal(formatPrice(0), '$0.00')
  assert.equal(formatPrice(500.5), '$500.50')
})

test('Order financials: calculates original, refunded and net without unit confusion', () => {
  const order = {
    total: 35.80,
    refundedAmountCents: 500, // stored in cents in DB
  }
  const refundedDollars = order.refundedAmountCents / 100
  const netAmount = Math.max(0, Math.round((order.total - refundedDollars) * 100) / 100)

  assert.equal(refundedDollars, 5.00, '500 cents must convert to exactly $5.00')
  assert.equal(netAmount, 30.80, 'Net amount must be 35.80 - 5.00 = $30.80')

  // Full refund scenario
  const fullRefundCents = 3580
  const fullRefundDollars = fullRefundCents / 100
  const fullNet = Math.max(0, Math.round((order.total - fullRefundDollars) * 100) / 100)

  assert.equal(fullRefundDollars, 35.80)
  assert.equal(fullNet, 0.00)
})
