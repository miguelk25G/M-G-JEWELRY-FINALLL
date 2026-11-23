import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import {
  BEST_SELLERS_SETTINGS_ID,
  calculateProductSalesMetrics,
  classifyOrderForSales,
  computeSelectionType,
  computeShowcaseBadge,
  createBestSellersService,
  isTestOrder,
} from "../lib/best-sellers"
import {
  CATALOG_METADATA_SETTINGS_ID,
  UNLIMITED_STOCK_SENTINEL,
  getStorefrontStockState,
} from "../lib/inventory"
import { validateAdminRole } from "../lib/actions/auth-helper"

function createMockCatalogDb(seed?: {
  products?: any[]
  variants?: any[]
  orders?: any[]
  siteSettings?: any[]
}) {
  const products = structuredClone(seed?.products || [])
  const variants = structuredClone(seed?.variants || [])
  const orders = structuredClone(seed?.orders || [])
  const siteSettings = structuredClone(seed?.siteSettings || [])

  const matchesWhere = (row: any, where?: any): boolean => {
    if (!where) return true
    if (where.NOT && matchesWhere(row, where.NOT)) return false
    for (const [key, cond] of Object.entries(where)) {
      if (key === "NOT") continue
      const val = row[key]
      if (cond && typeof cond === "object" && !Array.isArray(cond)) {
        const c = cond as any
        if (c.in !== undefined && !c.in.includes(val)) return false
        if (c.notIn !== undefined && c.notIn.includes(val)) return false
        if (c.startsWith !== undefined && !String(val || "").startsWith(c.startsWith)) return false
        if (c.equals !== undefined && val !== c.equals) return false
        if (c.not !== undefined && val === c.not) return false
      } else if (val !== cond) {
        return false
      }
    }
    return true
  }

  const db: any = {
    product: {
      findMany: async ({ where, orderBy, select }: any = {}) => {
        let list = products.filter((p) => matchesWhere(p, where))
        if (orderBy?.createdAt) {
          const dir = orderBy.createdAt === "asc" ? 1 : -1
          list = [...list].sort(
            (a, b) => (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir
          )
        }
        return list.map((p) => {
          if (!select) return structuredClone(p)
          const out: any = {}
          for (const k of Object.keys(select)) {
            if (select[k]) out[k] = structuredClone(p[k])
          }
          return out
        })
      },
      findUnique: async ({ where }: any) => {
        const hit = products.find((p) =>
          where.id ? p.id === where.id : where.slug ? p.slug === where.slug : false
        )
        return hit ? structuredClone(hit) : null
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0
        for (const p of products) {
          if (matchesWhere(p, where)) {
            Object.assign(p, data)
            count += 1
          }
        }
        return { count }
      },
    },
    productVariant: {
      findMany: async ({ where, orderBy }: any = {}) => {
        let list = variants.filter((v) => matchesWhere(v, where))
        if (orderBy?.sortOrder) {
          const dir = orderBy.sortOrder === "asc" ? 1 : -1
          list = [...list].sort((a, b) => ((a.sortOrder || 0) - (b.sortOrder || 0)) * dir)
        }
        return structuredClone(list)
      },
    },
    order: {
      findMany: async () => structuredClone(orders),
    },
    siteSettings: {
      findUnique: async ({ where }: any) => {
        const hit = siteSettings.find((s) => s.id === where.id)
        return hit ? structuredClone(hit) : null
      },
      upsert: async ({ where, update, create }: any) => {
        const idx = siteSettings.findIndex((s) => s.id === where.id)
        if (idx >= 0) {
          siteSettings[idx] = { ...siteSettings[idx], ...update }
          return structuredClone(siteSettings[idx])
        }
        const created = { ...create }
        siteSettings.push(created)
        return structuredClone(created)
      },
    },
    $transaction: async (fn: (tx: any) => Promise<any>) => fn(db),
    _state: { products, variants, orders, siteSettings },
  }

  return db
}

function makeProduct(overrides: Partial<any> & { id: string; name: string }) {
  return {
    id: overrides.id,
    name: overrides.name,
    nameEs: overrides.nameEs ?? `${overrides.name} ES`,
    slug: overrides.slug ?? overrides.id,
    description: "Fine luxury jewelry piece",
    descriptionEs: "Pieza de alta joyería",
    price: overrides.price ?? 1200,
    comparePrice: overrides.comparePrice ?? null,
    currency: "USD",
    metalType: overrides.metalType ?? "Yellow Gold",
    karat: overrides.karat ?? "14K",
    stoneType: overrides.stoneType ?? "natural",
    category: overrides.category ?? "chains",
    images: JSON.stringify(["/jewelry-sample.jpg"]),
    isFeatured: overrides.isFeatured ?? false,
    isActive: overrides.isActive ?? true,
    isBestSeller: overrides.isBestSeller ?? false,
    inventoryQty: overrides.inventoryQty ?? 5,
    weight: overrides.weight ?? 15,
    length: overrides.length ?? null,
    sizes: overrides.sizes ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-10-01T12:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-10-01T12:00:00.000Z"),
  }
}

test("Scenarios 1-4 & 13: Manual M&G Picks persist across reloads, sync Homepage & View All, never delete inventory, and avoid false Best Seller badges when 0 sales exist", async () => {
  const db = createMockCatalogDb({
    products: [
      makeProduct({ id: "p1", name: "Cuban Link Chain", createdAt: new Date("2026-10-01") }),
      makeProduct({ id: "p2", name: "Tennis Bracelet", createdAt: new Date("2026-10-02") }),
      makeProduct({ id: "p3", name: "Diamond Studs", createdAt: new Date("2026-10-03") }),
      makeProduct({ id: "p4", name: "Signet Ring", createdAt: new Date("2026-10-04") }),
      makeProduct({ id: "p5", name: "Herringbone Necklace", createdAt: new Date("2026-10-05") }),
    ],
    orders: [], // No verified sales yet
  })

  const service = createBestSellersService(db)

  // Before any manual picks or sales: fallback shows active catalog without false badges
  const initialSelection = await service.getStorefrontSelection()
  assert.equal(initialSelection.mode, "hybrid")
  assert.equal(initialSelection.usedFallback, true)
  assert.equal(initialSelection.headingType, "featured_fallback")
  assert.equal(initialSelection.homepageProducts.length, 4)
  assert.equal(initialSelection.allProducts.length, 5)
  assert.ok(initialSelection.allProducts.every((p) => p.showcaseBadge === "none"))

  // Scenario 1: Admin manually adds 5 products in specific order
  await service.saveConfig({
    mode: "hybrid",
    manualProductIds: ["p3", "p1", "p5", "p2", "p4"],
  })

  // Simulate full page reload by creating a fresh service instance on the same DB
  const reloadedService = createBestSellersService(db)
  const afterAdd = await reloadedService.getStorefrontSelection()

  // Scenario 2: Homepage displays top 4 in exact manual order with M&G Pick badge (NOT Best Seller)
  assert.deepEqual(
    afterAdd.homepageProducts.map((p) => p.id),
    ["p3", "p1", "p5", "p2"]
  )
  assert.equal(afterAdd.headingType, "mg_picks")
  assert.ok(afterAdd.homepageProducts.every((p) => p.showcaseBadge === "mg_pick"))
  assert.ok(afterAdd.homepageProducts.every((p) => p.isBestSeller === false))

  // Scenario 3: View All displays all 5 eligible picks (not limited to 4)
  assert.deepEqual(
    afterAdd.allProducts.map((p) => p.id),
    ["p3", "p1", "p5", "p2", "p4"]
  )

  // Verify existing Prisma isFeatured field stayed synchronized
  const p3Row = await db.product.findUnique({ where: { id: "p3" } })
  assert.equal(p3Row.isFeatured, true)
  assert.equal(p3Row.isBestSeller, false)

  // Scenario 4: Admin removes p3 & p5 from M&G Picks -> persists, and products remain in inventory
  await reloadedService.saveConfig({
    mode: "hybrid",
    manualProductIds: ["p1", "p2"],
  })

  const afterRemoveService = createBestSellersService(db)
  const afterRemove = await afterRemoveService.getStorefrontSelection()
  assert.deepEqual(
    afterRemove.homepageProducts.map((p) => p.id),
    ["p1", "p2"]
  )
  assert.deepEqual(
    afterRemove.allProducts.map((p) => p.id),
    ["p1", "p2"]
  )
  // Product p3 was NOT deleted from catalog inventory
  const p3StillExists = await db.product.findUnique({ where: { id: "p3" } })
  assert.ok(p3StillExists)
  assert.equal(p3StillExists.isActive, true)
  assert.equal(p3StillExists.isFeatured, false)
  assert.equal(db._state.products.length, 5)
})

test("Scenarios 5 & 6: Paid orders rank products by units sold then net revenue; canceled, unpaid, failed, restocked, and test orders are strictly excluded", async () => {
  const orders = [
    // Qualifying paid Stripe order: p2 x 2 @ $500 ($1,000), p1 x 2 @ $1,500 ($3,000)
    {
      id: "ord_paid_1",
      orderNumber: "MG-100001",
      email: "buyer1@gmail.com",
      status: "processing",
      paymentStatus: "paid",
      reservationStatus: "consumed",
      subtotal: 4000,
      discount: 0,
      shipping: 25,
      tax: 0,
      total: 4025,
      refundedAmount: 0,
      stripeSessionId: "cs_live_real1",
      items: [
        { productId: "p2", quantity: 2, price: 500, options: null },
        { productId: "p1", quantity: 2, price: 1500, options: null },
      ],
      transactions: [{ provider: "stripe", providerId: "cs_live_real1", status: "succeeded", amount: 4025 }],
    },
    // Qualifying manual admin paid order with 10% discount: p3 x 3 @ $400 -> $1,200 - $120 = $1,080
    {
      id: "ord_paid_2",
      orderNumber: "MG-100002",
      email: "vipclient@icloud.com",
      status: "delivered",
      paymentStatus: "paid",
      reservationStatus: "consumed",
      subtotal: 1200,
      discount: 120,
      shipping: 25,
      tax: 0,
      total: 1105,
      refundedAmount: 0,
      stripeSessionId: null,
      items: [{ productId: "p3", quantity: 3, price: 400, options: null }],
      transactions: [{ provider: "manual_admin", providerId: "MANUAL-1", status: "succeeded", amount: 1105 }],
    },
    // EXCLUDED: Pending unpaid order
    {
      id: "ord_unpaid",
      orderNumber: "MG-100003",
      email: "pending@gmail.com",
      status: "pending",
      paymentStatus: "pending",
      reservationStatus: "reserved",
      subtotal: 5000,
      discount: 0,
      shipping: 25,
      tax: 0,
      total: 5025,
      refundedAmount: 0,
      stripeSessionId: "cs_live_open",
      items: [{ productId: "p4", quantity: 10, price: 500, options: null }],
      transactions: [{ provider: "stripe", providerId: "cs_live_open", status: "pending", amount: 5025 }],
    },
    // EXCLUDED: Canceled order
    {
      id: "ord_cancelled",
      orderNumber: "MG-100004",
      email: "cancel@gmail.com",
      status: "cancelled",
      paymentStatus: "paid",
      reservationStatus: "released",
      subtotal: 2000,
      discount: 0,
      shipping: 25,
      tax: 0,
      total: 2025,
      refundedAmount: 0,
      stripeSessionId: "cs_live_cancel",
      items: [{ productId: "p4", quantity: 4, price: 500, options: null }],
      transactions: [],
    },
    // EXCLUDED: Failed payment order
    {
      id: "ord_failed",
      orderNumber: "MG-100005",
      email: "fail@gmail.com",
      status: "pending",
      paymentStatus: "failed",
      reservationStatus: "released",
      subtotal: 2000,
      discount: 0,
      shipping: 25,
      tax: 0,
      total: 2025,
      refundedAmount: 0,
      stripeSessionId: "cs_live_fail",
      items: [{ productId: "p4", quantity: 5, price: 400, options: null }],
      transactions: [{ provider: "stripe", providerId: "cs_live_fail", status: "failed", amount: 2025 }],
    },
    // EXCLUDED: Stripe test session order
    {
      id: "ord_test_stripe",
      orderNumber: "MG-100006",
      email: "owner@mngjewelry.com",
      status: "processing",
      paymentStatus: "paid",
      reservationStatus: "consumed",
      subtotal: 9000,
      discount: 0,
      shipping: 25,
      tax: 0,
      total: 9025,
      refundedAmount: 0,
      stripeSessionId: "cs_test_a1b2c3d4",
      items: [{ productId: "p4", quantity: 9, price: 1000, options: null }],
      transactions: [{ provider: "stripe", providerId: "cs_test_a1b2c3d4", status: "succeeded", amount: 9025 }],
    },
    // EXCLUDED: Test order via orderNumber / notes / example.com email
    {
      id: "ord_test_notes",
      orderNumber: "TEST-999",
      email: "qa@example.com",
      notes: "[TEST] Internal QA verification",
      status: "completed",
      paymentStatus: "paid",
      reservationStatus: "consumed",
      subtotal: 8000,
      discount: 0,
      shipping: 0,
      tax: 0,
      total: 8000,
      refundedAmount: 0,
      stripeSessionId: null,
      items: [{ productId: "p4", quantity: 8, price: 1000, options: null }],
      transactions: [{ provider: "manual_admin", providerId: "MANUAL-TEST", status: "succeeded", amount: 8000 }],
    },
  ]

  assert.equal(isTestOrder(orders[5]), true)
  assert.equal(isTestOrder(orders[6]), true)
  assert.equal(isTestOrder(orders[0]), false)

  const sales = calculateProductSalesMetrics(orders)
  assert.equal(sales.qualifyingOrdersCount, 2)
  assert.equal(sales.excludedOrdersCount, 5)

  assert.equal(sales.metricsByProductId.get("p3")?.verifiedNetUnits, 3)
  assert.equal(sales.metricsByProductId.get("p3")?.verifiedNetRevenue, 1080)
  assert.equal(sales.metricsByProductId.get("p1")?.verifiedNetUnits, 2)
  assert.equal(sales.metricsByProductId.get("p1")?.verifiedNetRevenue, 3000)
  assert.equal(sales.metricsByProductId.get("p2")?.verifiedNetUnits, 2)
  assert.equal(sales.metricsByProductId.get("p2")?.verifiedNetRevenue, 1000)
  assert.equal(sales.metricsByProductId.get("p4"), undefined)

  // Verify automatic ranking: p3 (3 units) > p1 (2 units, $3000) > p2 (2 units, $1000)
  const db = createMockCatalogDb({
    products: [
      makeProduct({ id: "p1", name: "Gold Chain" }),
      makeProduct({ id: "p2", name: "Silver Bracelet" }),
      makeProduct({ id: "p3", name: "Diamond Earrings" }),
      makeProduct({ id: "p4", name: "Unsold Ring" }),
    ],
    orders,
  })
  const service = createBestSellersService(db)
  await service.saveConfig({ mode: "automatic", manualProductIds: [] })

  const selection = await service.getStorefrontSelection()
  assert.deepEqual(
    selection.allProducts.map((p) => p.id),
    ["p3", "p1", "p2"]
  )
  assert.ok(selection.allProducts.every((p) => p.showcaseBadge === "best_seller"))
  assert.equal(selection.badgeByProductId["p4"], "none")
})

test("Scenario 7: Refund handling — excludes full refunds, applies reliable item-level partial refunds, and refuses to fabricate net sales for unattributed partial refunds", () => {
  const orders = [
    // 1. Fully refunded order -> completely excluded
    {
      id: "ord_full_refund",
      orderNumber: "MG-200001",
      email: "c1@gmail.com",
      status: "processing",
      paymentStatus: "refunded",
      reservationStatus: "consumed",
      subtotal: 1000,
      discount: 0,
      shipping: 25,
      tax: 0,
      total: 1025,
      refundedAmount: 102500,
      stripeSessionId: "cs_live_ref1",
      items: [{ productId: "p_full_ref", quantity: 2, price: 500, options: null }],
      transactions: [{ provider: "stripe", providerId: "cs_live_ref1", status: "refunded", amount: 1025 }],
    },
    // 2. Partially refunded order WITH reliable item-level refund attribution
    {
      id: "ord_partial_attributed",
      orderNumber: "MG-200002",
      email: "c2@gmail.com",
      status: "processing",
      paymentStatus: "partially_refunded",
      reservationStatus: "consumed",
      subtotal: 1300,
      discount: 0,
      shipping: 25,
      tax: 0,
      total: 1325,
      refundedAmount: 50000, // $500 refunded for 1 returned unit of p_attr_a
      stripeSessionId: "cs_live_ref2",
      items: [
        {
          productId: "p_attr_a",
          quantity: 2,
          price: 500,
          options: JSON.stringify({ refundedQuantity: 1, refundedAmount: 500 }),
        },
        {
          productId: "p_attr_b",
          quantity: 1,
          price: 300,
          options: JSON.stringify({ refundedQuantity: 0, refundedAmount: 0 }),
        },
      ],
      transactions: [
        { provider: "stripe", providerId: "cs_live_ref2", status: "partially_refunded", amount: 1325 },
      ],
    },
    // 3. Partially refunded multi-product order WITHOUT item-level attribution -> DO NOT fabricate net sales
    {
      id: "ord_partial_unattributed",
      orderNumber: "MG-200003",
      email: "c3@gmail.com",
      status: "processing",
      paymentStatus: "partially_refunded",
      reservationStatus: "consumed",
      subtotal: 800,
      discount: 0,
      shipping: 25,
      tax: 0,
      total: 825,
      refundedAmount: 30000, // $300 order-level refund, unknown which item
      stripeSessionId: "cs_live_ref3",
      items: [
        { productId: "p_unattr_a", quantity: 1, price: 500, options: null },
        { productId: "p_unattr_b", quantity: 1, price: 300, options: null },
      ],
      transactions: [
        { provider: "stripe", providerId: "cs_live_ref3", status: "partially_refunded", amount: 825 },
      ],
    },
    // 4. Single-product order where entire product value ($500) was refunded (only $25 shipping retained)
    {
      id: "ord_single_item_full_value_refund",
      orderNumber: "MG-200004",
      email: "c4@gmail.com",
      status: "processing",
      paymentStatus: "partially_refunded",
      reservationStatus: "consumed",
      subtotal: 500,
      discount: 0,
      shipping: 25,
      tax: 0,
      total: 525,
      refundedAmount: 50000,
      stripeSessionId: "cs_live_ref4",
      items: [{ productId: "p_single_ref", quantity: 1, price: 500, options: null }],
      transactions: [
        { provider: "stripe", providerId: "cs_live_ref4", status: "partially_refunded", amount: 525 },
      ],
    },
  ]

  assert.equal(classifyOrderForSales(orders[0]).kind, "excluded")
  assert.equal(classifyOrderForSales(orders[1]).kind, "partially_refunded")
  assert.equal(classifyOrderForSales(orders[2]).kind, "partially_refunded")

  const sales = calculateProductSalesMetrics(orders)

  // Full refund excluded
  assert.equal(sales.metricsByProductId.get("p_full_ref"), undefined)

  // Attributed partial refund: p_attr_a has 2 gross, 1 refunded -> 1 verified net unit & $500 net rev
  const attrA = sales.metricsByProductId.get("p_attr_a")
  assert.ok(attrA)
  assert.equal(attrA.grossSoldUnits, 2)
  assert.equal(attrA.refundedUnits, 1)
  assert.equal(attrA.verifiedNetUnits, 1)
  assert.equal(attrA.verifiedNetRevenue, 500)
  assert.equal(attrA.hasUnattributedPartialRefunds, false)

  // Attributed partial refund: p_attr_b unaffected -> 1 verified net unit & $300 net rev
  const attrB = sales.metricsByProductId.get("p_attr_b")
  assert.ok(attrB)
  assert.equal(attrB.verifiedNetUnits, 1)
  assert.equal(attrB.verifiedNetRevenue, 300)

  // Unattributed partial refund: 0 verified net sales, gross tracked separately
  const unattrA = sales.metricsByProductId.get("p_unattr_a")
  const unattrB = sales.metricsByProductId.get("p_unattr_b")
  assert.ok(unattrA && unattrB)
  assert.equal(unattrA.verifiedNetUnits, 0)
  assert.equal(unattrA.verifiedNetRevenue, 0)
  assert.equal(unattrA.grossSoldUnits, 1)
  assert.equal(unattrA.unattributedPartialRefundUnits, 1)
  assert.equal(unattrA.hasUnattributedPartialRefunds, true)
  assert.equal(unattrB.verifiedNetUnits, 0)
  assert.equal(unattrB.grossSoldUnits, 1)
  assert.equal(sales.unattributedPartialRefundOrdersCount, 1)

  // Single-product full product-value refund -> 0 net units, $0 net revenue
  const singleRef = sales.metricsByProductId.get("p_single_ref")
  assert.ok(singleRef)
  assert.equal(singleRef.verifiedNetUnits, 0)
  assert.equal(singleRef.verifiedNetRevenue, 0)
  assert.equal(singleRef.refundedUnits, 1)
})

test("Scenarios 8, 9 & 10: Hybrid Mode deduplicates, excludes inactive items, respects unlimited stock (-1) & product variants, and assigns clean single badges", async () => {
  const db = createMockCatalogDb({
    products: [
      makeProduct({ id: "p_pick_only", name: "Miami Cuban", inventoryQty: UNLIMITED_STOCK_SENTINEL }),
      makeProduct({ id: "p_both", name: "Diamond Tennis Chain", inventoryQty: 4 }),
      makeProduct({ id: "p_auto_1", name: "14K Rope Chain", inventoryQty: 0 }), // variants override this!
      makeProduct({ id: "p_auto_2", name: "Gold Studs", inventoryQty: 10 }),
      makeProduct({ id: "p_auto_3", name: "Solitaire Ring", inventoryQty: 6 }),
      makeProduct({ id: "p_inactive", name: "Archived Piece", isActive: false, inventoryQty: 10 }),
      makeProduct({ id: "p_deleted", name: "Deleted Piece", slug: "deleted-old-1", isActive: true }),
    ],
    variants: [
      {
        id: "var_rope_18",
        productId: "p_auto_1",
        size: '18"',
        variantType: "length",
        price: 850,
        comparePrice: 950,
        weight: 12,
        sku: "MG-ROPE-18",
        inventoryQty: UNLIMITED_STOCK_SENTINEL,
        isActive: true,
        sortOrder: 0,
      },
      {
        id: "var_rope_20",
        productId: "p_auto_1",
        size: '20"',
        variantType: "length",
        price: 980,
        comparePrice: null,
        weight: 14,
        sku: "MG-ROPE-20",
        inventoryQty: 2,
        isActive: true,
        sortOrder: 1,
      },
    ],
    orders: [
      {
        id: "ord_h1",
        orderNumber: "MG-300001",
        email: "customer@gmail.com",
        status: "delivered",
        paymentStatus: "paid",
        reservationStatus: "consumed",
        subtotal: 5000,
        discount: 0,
        shipping: 25,
        tax: 0,
        total: 5025,
        refundedAmount: 0,
        stripeSessionId: "cs_live_h1",
        items: [
          { productId: "p_both", quantity: 4, price: 600, options: null },
          { productId: "p_auto_1", quantity: 5, price: 850, options: null },
          { productId: "p_auto_2", quantity: 2, price: 400, options: null },
          { productId: "p_auto_3", quantity: 1, price: 1500, options: null },
          { productId: "p_inactive", quantity: 20, price: 500, options: null },
        ],
        transactions: [{ provider: "stripe", providerId: "cs_live_h1", status: "succeeded", amount: 5025 }],
      },
    ],
    siteSettings: [
      {
        id: CATALOG_METADATA_SETTINGS_ID,
        siteName: "Catalog Meta",
        shippingInfo: JSON.stringify({
          lowStockThreshold: 3,
          products: {
            p_pick_only: { sku: "MG-CUBAN-01" },
          },
        }),
      },
    ],
  })

  const service = createBestSellersService(db)
  await service.saveConfig({
    mode: "hybrid",
    manualProductIds: ["p_pick_only", "p_both", "p_inactive"],
  })

  const selection = await service.getStorefrontSelection()

  // Scenario 9: Inactive & deleted products strictly excluded
  assert.equal(selection.allProducts.some((p) => p.id === "p_inactive"), false)
  assert.equal(selection.allProducts.some((p) => p.id === "p_deleted"), false)

  // Scenario 8: Manual picks first in order (p_pick_only, p_both), then remaining top sellers without duplicating p_both
  assert.deepEqual(
    selection.allProducts.map((p) => p.id),
    ["p_pick_only", "p_both", "p_auto_1", "p_auto_2", "p_auto_3"]
  )
  // No duplicates
  assert.equal(new Set(selection.allProducts.map((p) => p.id)).size, selection.allProducts.length)
  // Homepage capped at 4; View All has all 5
  assert.equal(selection.homepageProducts.length, 4)
  assert.equal(selection.allProducts.length, 5)

  // Badges: single clean badge per product (no duplicate/cluttered badges)
  assert.equal(selection.badgeByProductId["p_pick_only"], "mg_pick")
  assert.equal(selection.badgeByProductId["p_both"], "best_seller")
  assert.equal(selection.badgeByProductId["p_auto_1"], "best_seller")
  assert.equal(computeSelectionType({ isManualPick: true, isAutomaticBestSeller: true }), "both")
  assert.equal(computeShowcaseBadge({ isManualPick: true, isAutomaticBestSeller: true }), "best_seller")

  // Scenario 10: Unlimited stock (-1) & ProductVariant aggregation preserved
  const pickOnly = selection.allProducts.find((p) => p.id === "p_pick_only")!
  assert.equal(pickOnly.inventoryQty, UNLIMITED_STOCK_SENTINEL)
  assert.equal(getStorefrontStockState(pickOnly.inventoryQty).isUnlimited, true)
  assert.equal(getStorefrontStockState(pickOnly.inventoryQty).isOutOfStock, false)

  const variantAuto = selection.allProducts.find((p) => p.id === "p_auto_1")!
  assert.equal(variantAuto.hasVariants, true)
  assert.equal(variantAuto.price, 850) // lead variant price
  assert.equal(variantAuto.inventoryQty, UNLIMITED_STOCK_SENTINEL) // unlimited variant -> available
  assert.deepEqual(JSON.parse(variantAuto.sizes || "[]"), ['18"', '20"'])

  // Admin dashboard reflects SKU, variant SKUs, and 'both' selection type
  const adminData = await service.getAdminDashboardData()
  const adminBoth = adminData.products.find((p) => p.id === "p_both")!
  assert.equal(adminBoth.selectionType, "both")
  assert.equal(adminBoth.verifiedNetUnits, 4)
  assert.equal(adminBoth.verifiedNetRevenue, 2400)

  const adminVariant = adminData.products.find((p) => p.id === "p_auto_1")!
  assert.equal(adminVariant.price, 850)
  assert.equal(adminVariant.priceMax, 980)
  assert.equal(adminVariant.isUnlimited, true)
  assert.deepEqual(adminVariant.variantSkus, ["MG-ROPE-18", "MG-ROPE-20"])
})

test("Scenario 11 & Security: Server-side validation rejects invalid display modes, unknown product IDs, and non-admin sessions", async () => {
  // Authorization check
  assert.throws(() => validateAdminRole(null), /Unauthorized/)
  assert.throws(() => validateAdminRole({ user: { role: "customer" } }), /Forbidden/)
  assert.doesNotThrow(() => validateAdminRole({ user: { role: "admin" } }))

  const db = createMockCatalogDb({
    products: [makeProduct({ id: "p1", name: "Chain" })],
  })
  const service = createBestSellersService(db)

  // Invalid mode rejected
  await assert.rejects(
    () => service.saveConfig({ mode: "invalid_mode" as any, manualProductIds: [] }),
    /Invalid display mode/
  )

  // Non-existent product ID rejected
  await assert.rejects(
    () => service.saveConfig({ mode: "manual", manualProductIds: ["non_existent_id"] }),
    /Invalid product ID/
  )

  // Manual mode with valid ID succeeds and saves under BEST_SELLERS_SETTINGS_ID
  await service.saveConfig({ mode: "manual", manualProductIds: ["p1", "p1"] })
  const savedRow = await db.siteSettings.findUnique({ where: { id: BEST_SELLERS_SETTINGS_ID } })
  assert.ok(savedRow)
  const parsed = JSON.parse(savedRow.shippingInfo)
  assert.equal(parsed.mode, "manual")
  assert.deepEqual(parsed.manualProductIds, ["p1"])
})

test("Scenario 12 & 13: Automatic mode falls back to M&G Picks when 0 verified sales exist; English & Spanish translation files contain all required bilingual labels", async () => {
  const db = createMockCatalogDb({
    products: [
      makeProduct({ id: "p1", name: "Gold Pendant" }),
      makeProduct({ id: "p2", name: "Gold Ring" }),
    ],
    orders: [],
  })
  const service = createBestSellersService(db)
  await service.saveConfig({ mode: "automatic", manualProductIds: ["p1"] })

  const selection = await service.getStorefrontSelection()
  assert.equal(selection.mode, "automatic")
  assert.equal(selection.usedFallback, true)
  assert.equal(selection.headingType, "mg_picks")
  assert.deepEqual(
    selection.allProducts.map((p) => p.id),
    ["p1"]
  )
  // Must NOT falsely label as proven Best Seller
  assert.equal(selection.allProducts[0].showcaseBadge, "mg_pick")
  assert.equal(selection.allProducts[0].isBestSeller, false)

  // Bilingual JSON verification
  const en = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "i18n", "messages", "en.json"), "utf8")
  )
  const es = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "i18n", "messages", "es.json"), "utf8")
  )

  assert.equal(en.bestSellers.title, "Best Sellers")
  assert.equal(es.bestSellers.title, "Más Vendidos")
  assert.equal(en.bestSellers.mgPicksTitle, "M&G Picks")
  assert.equal(es.bestSellers.mgPicksTitle, "Selección M&G")
  assert.equal(en.bestSellers.unitsSold, "Units Sold")
  assert.equal(es.bestSellers.unitsSold, "Unidades Vendidas")
  assert.equal(en.bestSellers.featuredProducts, "Featured Products")
  assert.equal(es.bestSellers.featuredProducts, "Productos Destacados")
  assert.equal(en.bestSellers.badgeBestSeller, "Best Seller")
  assert.equal(es.bestSellers.badgeBestSeller, "Más Vendido")
  assert.equal(en.bestSellers.badgeMgPick, "M&G Pick")
  assert.equal(es.bestSellers.badgeMgPick, "Selección M&G")
})
