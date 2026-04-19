import { db } from "@/lib/db"
import { ProductsClient } from "./products-client"

export const dynamic = "force-dynamic"

export default async function ProductsPage() {
  const dbProducts = await db.product.findMany({
    where: { NOT: { slug: { startsWith: 'deleted-' } } },
    orderBy: { createdAt: "desc" },
  })

  const formattedProducts = dbProducts.map((p) => {
    let rawImage = ""
    try {
      const imagesArray = JSON.parse(p.images)
      rawImage = imagesArray[0] || ""
    } catch {
      rawImage = p.images 
    }

    return {
      id: p.id,
      name: p.name,
      sku: p.slug, 
      category: p.category,
      price: p.price,
      stock: p.inventoryQty,
      status: p.isActive ? "Active" : "Hidden",
      image: rawImage,
    }
  })

  return <ProductsClient initialProducts={formattedProducts} />
}
