import { PromotionsClient } from "./promotions-client"
import { db } from "@/lib/db"

export default async function PromotionsPage() {
  const codes = await db.discountCode.findMany({
    orderBy: { createdAt: "desc" }
  })
  
  const products = await db.product.findMany({
    select: {
      id: true,
      name: true,
      images: true,
      price: true,
      comparePrice: true,
      inventoryQty: true,
    },
    orderBy: { createdAt: "desc" }
  })

  // Format products so the UI can easily handle them
  const formattedProducts = products.map(p => {
    let imageUrl = "/placeholder.svg"
    try {
      if (p.images) imageUrl = JSON.parse(p.images)[0]
    } catch (e) {
      imageUrl = p.images || "/placeholder.svg"
    }

    return {
      id: p.id,
      name: p.name,
      image: imageUrl,
      price: p.price,
      comparePrice: p.comparePrice,
      inventoryQty: p.inventoryQty,
      isOnSale: p.comparePrice !== null && p.comparePrice > p.price
    }
  })

  return <PromotionsClient initialCodes={codes} products={formattedProducts} />
}
