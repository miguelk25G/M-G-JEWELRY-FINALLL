"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Search,
  MoreHorizontal,
  Eye,
  Truck,
  CheckCircle,
  XCircle,
  DollarSign,
  RefreshCw,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import {
  updateOrderStatus,
  markOrderAsPaid,
  syncOrderPaymentWithStripe,
} from "@/lib/actions/admin-orders"

const statusColors: Record<string, string> = {
  Completed: "bg-green-500/10 text-green-500 border border-green-500/20",
  Processing: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
  Shipped: "bg-purple-500/10 text-purple-500 border border-purple-500/20",
  Pending: "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20",
  Cancelled: "bg-red-500/10 text-red-500 border border-red-500/20",
  Refunded: "bg-gray-500/10 text-gray-500 border border-gray-500/20",
}

const paymentColors: Record<string, string> = {
  "Partially refunded": "bg-gray-500/10 text-gray-500",
  Paid: "bg-green-500/10 text-green-500 border border-green-500/20",
  Pending: "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20",
  Refunded: "bg-gray-500/10 text-gray-500 border border-gray-500/20",
  Failed: "bg-red-500/10 text-red-500 border border-red-500/20",
}

export function OrdersClient({ orders }: { orders: any[] }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setIsLoading(true)
    const toastId = toast.loading(`Actualizando orden a ${newStatus}...`)
    try {
      const res = await updateOrderStatus(orderId, newStatus)
      if (res.success) {
        toast.success(`La orden fue marcada como ${newStatus}`, { id: toastId })
      } else {
        toast.error(`Error: ${res.error}`, { id: toastId })
      }
    } catch (e: any) {
      toast.error(`Ocurrió un error inesperado: ${e.message}`, { id: toastId })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentPaid = async (orderId: string, amount: number) => {
    setIsLoading(true)
    const toastId = toast.loading(`Actualizando pago...`)
    try {
      const res = await markOrderAsPaid(orderId, amount)
      if (res.success) {
        toast.success(`El estado de pago fue actualizado a Pagado`, { id: toastId })
      } else {
        toast.error(`Error: ${res.error}`, { id: toastId })
      }
    } catch (e: any) {
      toast.error(`Ocurrió un error inesperado: ${e.message}`, { id: toastId })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncStripe = async (orderId: string) => {
    setIsLoading(true)
    const toastId = toast.loading(`Consultando Stripe...`)
    try {
      const res = await syncOrderPaymentWithStripe(orderId)
      if (res.success) {
        if (res.status === 'review_required') {
          toast.warning(res.message || `Pago confirmado en Stripe pero pendiente en base de datos. Requiere revisión manual.`, { id: toastId, duration: 6000 })
        } else if (res.status === 'cancelled') {
          toast.info(res.message || `Sesión de Stripe expirada sin pago. Reserva liberada.`, { id: toastId, duration: 5000 })
        } else {
          toast.success(res.message || `Estado sincronizado con Stripe correctamente`, { id: toastId, duration: 5000 })
        }
      } else {
        toast.error(`Error: ${res.error}`, { id: toastId })
      }
    } catch (e: any) {
      toast.error(`Error al sincronizar con Stripe: ${e.message}`, { id: toastId })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    const matchesPayment = paymentFilter === "all" || order.payment === paymentFilter
    return matchesSearch && matchesStatus && matchesPayment
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-muted-foreground">Manage, track, and verify customer payments and orders</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number, customer, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[170px]">
                <SelectValue placeholder="Fulfillment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fulfillment</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Processing">Processing</SelectItem>
                <SelectItem value="Shipped">Shipped</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Refunded">Refunded</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Fulfillment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No orders found.
                  </TableCell>
                </TableRow>
              ) : null}
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="font-mono text-xs hover:underline text-left text-primary"
                    >
                      {order.orderNumber || order.id.slice(0, 8)}
                    </button>
                    {order.provider && (
                      <div className="text-[10px] text-muted-foreground uppercase mt-0.5">
                        {order.provider}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{order.customer}</p>
                      <p className="text-xs text-muted-foreground">{order.email}</p>
                      {order.phone && <p className="text-xs text-muted-foreground">{order.phone}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="text-xs underline hover:text-foreground text-muted-foreground"
                    >
                      {order.items} {order.items === 1 ? 'item' : 'items'}
                    </button>
                  </TableCell>
                  <TableCell className="font-semibold text-sm">
                    {order.refundedAmount > 0 ? (
                      <div className="space-y-0.5">
                        <div className="font-bold text-foreground">
                          {formatPrice(order.netAmount ?? (order.total - order.refundedAmount))}
                          <span className="text-[10px] text-muted-foreground ml-1 font-normal">(Neto)</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground line-through">
                          {formatPrice(order.total)}
                        </div>
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          -{formatPrice(order.refundedAmount)}
                        </div>
                      </div>
                    ) : (
                      formatPrice(order.total)
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={paymentColors[order.payment] || "bg-yellow-500/10 text-yellow-500"}>
                      {order.payment}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <Badge className={statusColors[order.status] || "bg-yellow-500/10 text-yellow-500"}>
                        {order.status}
                      </Badge>
                      {order.notes && (
                        <p className="text-[10px] text-muted-foreground mt-1 max-w-[140px] truncate" title={order.notes}>
                          {order.notes}
                        </p>
                      )}
                      {order.payment === "Refunded" && (
                        <span className="block text-[10px] text-red-500 font-medium mt-0.5">
                          Despacho bloqueado
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {order.date}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isLoading}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {order.payment !== "Paid" && order.provider !== "stripe" && (
                          <DropdownMenuItem onClick={() => handlePaymentPaid(order.id, order.total)}>
                            <DollarSign className="h-4 w-4 mr-2" />
                            Mark as Paid (Manual)
                          </DropdownMenuItem>
                        )}
                        {order.provider === "stripe" && (
                          <DropdownMenuItem onClick={() => handleSyncStripe(order.id)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync with Stripe
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          disabled={order.payment === "Refunded"}
                          onClick={() => handleStatusChange(order.id, "Processing")}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          {order.payment === "Refunded" ? "Processing (Bloqueado por reembolso)" : "Mark as Processing"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={order.payment === "Refunded"}
                          onClick={() => handleStatusChange(order.id, "Shipped")}
                        >
                          <Truck className="h-4 w-4 mr-2" />
                          {order.payment === "Refunded" ? "Shipped (Bloqueado por reembolso)" : "Mark as Shipped"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={order.payment === "Refunded"}
                          onClick={() => handleStatusChange(order.id, "Completed")}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {order.payment === "Refunded" ? "Completed (Bloqueado por reembolso)" : "Mark as Completed"}
                        </DropdownMenuItem>
                        {order.status !== "Cancelled" && (
                          <DropdownMenuItem
                            className="text-red-500 focus:text-red-500"
                            onClick={() => handleStatusChange(order.id, "Cancelled")}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel unpaid order
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details: {selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 p-3 bg-secondary/50 rounded-lg">
                <div>
                  <span className="text-muted-foreground text-xs block">Customer</span>
                  <span className="font-medium">{selectedOrder.customer}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">Email</span>
                  <span>{selectedOrder.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">Phone</span>
                  <span>{selectedOrder.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">Payment Provider</span>
                  <span className="uppercase text-xs font-mono">{selectedOrder.provider}</span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Purchased Items ({selectedOrder.itemsList?.length || 0})
                </h4>
                <div className="space-y-2 border border-border rounded-lg p-3">
                  {selectedOrder.itemsList?.map((it: any) => (
                    <div key={it.id} className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-medium">{it.name}</span>
                        {it.size && <span className="text-muted-foreground ml-2">(Size: {it.size})</span>}
                        <span className="text-muted-foreground ml-2">x{it.quantity}</span>
                      </div>
                      <span className="font-mono">{formatPrice(it.price * it.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1 text-xs border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatPrice(selectedOrder.subtotal || 0)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-{formatPrice(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping:</span>
                  <span>{formatPrice(selectedOrder.shipping || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax:</span>
                  <span>{formatPrice(selectedOrder.tax || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm border-t pt-1">
                  <span>Total Original:</span>
                  <span>{formatPrice(selectedOrder.total)}</span>
                </div>
                {selectedOrder.refundedAmount > 0 && (
                  <>
                    <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
                      <span>Total Reembolsado:</span>
                      <span>-{formatPrice(selectedOrder.refundedAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-foreground border-t pt-1">
                      <span>Total Neto:</span>
                      <span>{formatPrice(selectedOrder.netAmount ?? (selectedOrder.total - selectedOrder.refundedAmount))}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
