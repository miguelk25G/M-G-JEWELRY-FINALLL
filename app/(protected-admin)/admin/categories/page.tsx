import { CategoriesClient } from "./categories-client"
import { db } from "@/lib/db"

export default async function CategoriesPage() {
  const categories = await db.collection.findMany({
    include: {
      _count: {
        select: { products: true }
      }
    },
    orderBy: { createdAt: "desc" }
  })
  
  const mapped = categories.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description || "",
    image: c.image || "/placeholder.svg",
    isActive: c.isActive,
    productCount: c._count.products
  }))

  return <CategoriesClient categories={mapped} />
}
