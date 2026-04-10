"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
} from "lucide-react"
import Link from "next/link"

const stats = [
  {
    title: "Total Revenue",
    value: "$45,231.89",
    change: "+20.1%",
    trend: "up",
    icon: DollarSign,
    href: "/admin/orders",
  },
  {
    title: "Orders",
    value: "156",
    change: "+12.5%",
    trend: "up",
    icon: ShoppingCart,
    href: "/admin/orders",
  },
  {
    title: "Customers",
    value: "2,350",
    change: "+8.2%",
    trend: "up",
    icon: Users,
    href: "/admin/customers",
  },
  {
    title: "Products",
    value: "48",
    change: "-2.4%",
    trend: "down",
    icon: Package,
    href: "/admin/products",
  },
]

const recentOrders = [
  { id: "ORD-001", customer: "Maria Garcia", total: "$2,450.00", status: "Completed", date: "2 hours ago" },
  { id: "ORD-002", customer: "John Smith", total: "$1,890.00", status: "Processing", date: "4 hours ago" },
  { id: "ORD-003", customer: "Ana Martinez", total: "$3,200.00", status: "Shipped", date: "6 hours ago" },
  { id: "ORD-004", customer: "Carlos Lopez", total: "$950.00", status: "Pending", date: "8 hours ago" },
  { id: "ORD-005", customer: "Laura Wilson", total: "$4,100.00", status: "Completed", date: "12 hours ago" },
]

const topProducts = [
  { name: "2.99 Carat Diamond Ring", sales: 45, revenue: "$134,550" },
  { name: "1.75 Carat Diamond Ring", sales: 38, revenue: "$37,430" },
  { name: "Diamond Tennis Bracelet", sales: 32, revenue: "$63,680" },
  { name: "Pearl Necklace Set", sales: 28, revenue: "$22,400" },
]

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your store performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center text-xs mt-1">
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                  )}
                  <span className={stat.trend === "up" ? "text-green-500" : "text-red-500"}>
                    {stat.change}
                  </span>
                  <span className="text-muted-foreground ml-1">from last month</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Link
              href="/admin/orders"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">{order.id}</p>
                    <p className="text-xs text-muted-foreground">{order.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{order.total}</p>
                    <p
                      className={`text-xs ${
                        order.status === "Completed"
                          ? "text-green-500"
                          : order.status === "Processing"
                          ? "text-blue-500"
                          : order.status === "Shipped"
                          ? "text-purple-500"
                          : "text-yellow-500"
                      }`}
                    >
                      {order.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top Products</CardTitle>
            <Link
              href="/admin/products"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sales} sales</p>
                    </div>
                  </div>
                  <p className="font-medium text-sm">{product.revenue}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
