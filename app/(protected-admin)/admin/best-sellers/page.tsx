import { db } from "@/lib/db"
import { createBestSellersService } from "@/lib/best-sellers"
import { BestSellersAdminClient } from "./best-sellers-client"

export const dynamic = "force-dynamic"

export default async function AdminBestSellersPage() {
  const service = createBestSellersService(db)
  const initialData = await service.getAdminDashboardData()

  return <BestSellersAdminClient initialData={initialData} />
}
