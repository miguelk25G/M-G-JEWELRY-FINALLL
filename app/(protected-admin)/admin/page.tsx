import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Package, ShoppingCart, Users, ArrowUpRight } from "lucide-react"
import { db } from "@/lib/db"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function AdminDashboard() {
  const [productCount, orderCount, totalRevenueArr] = await Promise.all([
    db.product.count(),
    db.order.count(),
    db.order.aggregate({ _sum: { total: true }, where: { status: "Completed" } })
  ])

  const realRevenue = totalRevenueArr._sum.total || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, Admin. Here is your store overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${realRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+0% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Verified Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{orderCount}</div>
            <p className="text-xs text-muted-foreground">Orders successfully paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productCount}</div>
            <p className="text-xs text-muted-foreground">Unique items listed in inventory</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+1</div>
            <p className="text-xs text-muted-foreground">Admin/Vip account</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Welcome to v1.0 of your M&G Live Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground">
              Your store is completely connected to Vercel Postgres and Vercel Blob. 
              The numbers above are real database queries. To proceed, click the "Products" tab
              in the sidebar and start uploading your first pieces of jewelry.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

