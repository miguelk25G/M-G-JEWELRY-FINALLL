import { db } from "@/lib/db"
import { ProductsClient } from "./products-client"
import { createAdminProductService } from "@/lib/admin-products"

export const dynamic = "force-dynamic"

export default async function ProductsPage() {
  const dbProducts = await db.product.findMany({
    where: { NOT: { slug: { startsWith: "deleted-" } } },
    orderBy: { createdAt: "desc" },
  })

  const productService = createAdminProductService(db)
  const metaStore = await productService.getCatalogMetadata()

  const formattedProducts = await Promise.all(
    dbProducts.map((p) => productService.formatProductForAdmin(p, metaStore))
  )

  return (
    <ProductsClient
      initialProducts={formattedProducts}
      initialLowStockThreshold={metaStore.lowStockThreshold}
    />
  )
}
