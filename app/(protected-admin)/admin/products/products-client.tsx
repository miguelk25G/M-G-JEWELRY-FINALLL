"use client"

import React, { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Package,
  Power,
  Loader2,
  AlertTriangle,
  Infinity as InfinityIcon,
  Minus,
  Upload,
  X,
  Star,
  RefreshCw,
  Check,
  SlidersHorizontal,
} from "lucide-react"
import {
  deleteProductAction,
  toggleProductStatusAction,
  updateLowStockThresholdAction,
  updateProductAction,
  updateProductInventoryAction,
  uploadProductImagesAction,
} from "@/lib/actions/products"
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  type StockMode,
  formatCategoryLabel,
  getAdminStockDisplay,
} from "@/lib/inventory"
import { toast } from "sonner"

export type AdminProductItem = {
  id: string
  name: string
  nameEs?: string
  slug: string
  sku: string
  description: string
  descriptionEs?: string
  category: string
  categoryLabel?: string
  price: number
  comparePrice?: number | null
  currency?: string
  metalType: string
  metalColor?: string
  karat?: string
  material?: string
  stoneType?: string
  weight?: number | null
  length?: number | null
  sizes?: string[]
  lengths?: string[]
  variations?: string[]
  images?: string[]
  image: string
  isActive: boolean
  isFeatured?: boolean
  isBestSeller?: boolean
  status: string
  stock: number
  stockMode: StockMode
  isUnlimited: boolean
  lowStockThreshold?: number
}

const CATEGORY_OPTIONS = [
  { value: "rings", label: "Rings" },
  { value: "necklaces", label: "Necklaces" },
  { value: "earrings", label: "Earrings" },
  { value: "bracelets", label: "Bracelets" },
  { value: "chains", label: "Chains" },
]

const MATERIAL_PRESETS = [
  "10K",
  "14K",
  "18K",
  "24K",
  "925 Sterling Silver",
  "Platinum (PT950)",
]

const METAL_COLOR_PRESETS = [
  "Yellow Gold",
  "White Gold",
  "Rose Gold",
  "Two-Tone Gold",
  "Platinum",
  "Sterling Silver",
]

const STONE_TYPE_OPTIONS = [
  { value: "none", label: "None (Solid Metal)" },
  { value: "natural", label: "Natural Diamond" },
  { value: "lab", label: "Lab-Grown Diamond" },
]

const QUICK_STOCK_PRESETS = [1, 2, 5, 10, 25]

export function ProductsClient({
  initialProducts,
  initialLowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD,
}: {
  initialProducts: AdminProductItem[]
  initialLowStockThreshold?: number
}) {
  const router = useRouter()
  const [products, setProducts] = useState<AdminProductItem[]>(initialProducts)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [stockFilter, setStockFilter] = useState("all")
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(initialLowStockThreshold)
  const [thresholdInput, setThresholdInput] = useState<string>(String(initialLowStockThreshold))
  const [isSavingThreshold, setIsSavingThreshold] = useState(false)
  const [showThresholdConfig, setShowThresholdConfig] = useState(false)

  // Row action loading state
  const [busyProductId, setBusyProductId] = useState<string | null>(null)

  // Modals state
  const [editingProduct, setEditingProduct] = useState<AdminProductItem | null>(null)
  const [inventoryProduct, setInventoryProduct] = useState<AdminProductItem | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<AdminProductItem | null>(null)

  useEffect(() => {
    setProducts(initialProducts)
  }, [initialProducts])

  useEffect(() => {
    setLowStockThreshold(initialLowStockThreshold)
    setThresholdInput(String(initialLowStockThreshold))
  }, [initialLowStockThreshold])

  const filteredProducts = products.filter((product) => {
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      product.name.toLowerCase().includes(q) ||
      product.sku.toLowerCase().includes(q) ||
      product.category.toLowerCase().includes(q)

    const matchesCategory =
      categoryFilter === "all" ||
      product.category.toLowerCase() === categoryFilter.toLowerCase()

    const stockInfo = getAdminStockDisplay(product.stock, lowStockThreshold)
    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "unlimited" && stockInfo.isUnlimited) ||
      (stockFilter === "available" && stockInfo.status === "available") ||
      (stockFilter === "low_stock" && stockInfo.isLowStock) ||
      (stockFilter === "out_of_stock" && stockInfo.isOutOfStock)

    return matchesSearch && matchesCategory && matchesStock
  })

  const lowStockProducts = products.filter((p) => {
    const info = getAdminStockDisplay(p.stock, lowStockThreshold)
    return info.isLowStock
  })

  const outOfStockProducts = products.filter((p) => {
    const info = getAdminStockDisplay(p.stock, lowStockThreshold)
    return info.isOutOfStock
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price)
  }

  const handleSaveThreshold = async () => {
    const parsed = parseInt(thresholdInput, 10)
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Please enter a valid non-negative integer for the low-stock threshold.")
      return
    }
    setIsSavingThreshold(true)
    try {
      const res = await updateLowStockThresholdAction(parsed)
      if (res.success && res.lowStockThreshold !== undefined) {
        setLowStockThreshold(res.lowStockThreshold)
        setShowThresholdConfig(false)
        toast.success(`Low-stock warning threshold set to ${res.lowStockThreshold} units.`)
        router.refresh()
      } else {
        toast.error(res.error || "Failed to update threshold.")
      }
    } catch {
      toast.error("Failed to communicate with server.")
    } finally {
      setIsSavingThreshold(false)
    }
  }

  const handleToggleStatus = async (product: AdminProductItem) => {
    const nextActive = !product.isActive
    setBusyProductId(product.id)
    const toastId = toast.loading(
      nextActive ? `Activating "${product.name}"...` : `Deactivating "${product.name}"...`
    )
    try {
      const res = await toggleProductStatusAction(product.id, nextActive)
      if (res.success && res.product) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? (res.product as AdminProductItem) : p))
        )
        toast.success(
          nextActive
            ? `"${product.name}" is now Active on the storefront.`
            : `"${product.name}" has been Deactivated and hidden from the storefront.`,
          { id: toastId }
        )
        router.refresh()
      } else {
        toast.error(res.error || "Failed to update product status.", { id: toastId })
      }
    } catch {
      toast.error("Failed to communicate with server.", { id: toastId })
    } finally {
      setBusyProductId(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return
    const target = deletingProduct
    setBusyProductId(target.id)
    const toastId = toast.loading(`Deleting "${target.name}"...`)
    try {
      const res = await deleteProductAction(target.id)
      if (res && res.success) {
        setProducts((prev) => prev.filter((p) => p.id !== target.id))
        setDeletingProduct(null)
        toast.success(`"${target.name}" deleted successfully.`, { id: toastId })
        router.refresh()
      } else {
        toast.error(res?.error || "Failed to delete product.", { id: toastId })
      }
    } catch {
      toast.error("Failed to communicate with server.", { id: toastId })
    } finally {
      setBusyProductId(null)
    }
  }

  const handleProductUpdated = (updated: AdminProductItem) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    if (updated.lowStockThreshold !== undefined) {
      setLowStockThreshold(updated.lowStockThreshold)
      setThresholdInput(String(updated.lowStockThreshold))
    }
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-muted-foreground">
            Manage your product catalog, pricing, specifications, and Limited or Unlimited inventory
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowThresholdConfig((v) => !v)}
            className="gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Low-Stock Alert: ≤ {lowStockThreshold}
          </Button>
          <Button onClick={() => router.push("/admin/products/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Configurable Low-Stock Threshold Bar */}
      {showThresholdConfig && (
        <Card className="border-border bg-card/80">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Low-Stock Warning Threshold</p>
              <p className="text-xs text-muted-foreground">
                Products with Limited Stock at or below this quantity will display a "Low Stock" warning.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step={1}
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                className="w-24 h-9"
              />
              <Button size="sm" onClick={handleSaveThreshold} disabled={isSavingThreshold}>
                {isSavingThreshold ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setThresholdInput(String(lowStockThreshold))
                  setShowThresholdConfig(false)
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low Stock / Out of Stock Alert Banner */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <div>
              <span className="font-medium text-foreground">Inventory Attention: </span>
              <span className="text-muted-foreground">
                {lowStockProducts.length > 0 && (
                  <span>
                    {lowStockProducts.length} product{lowStockProducts.length === 1 ? "" : "s"} low on stock (≤ {lowStockThreshold} units)
                  </span>
                )}
                {lowStockProducts.length > 0 && outOfStockProducts.length > 0 && " • "}
                {outOfStockProducts.length > 0 && (
                  <span className="text-red-400">
                    {outOfStockProducts.length} out of stock
                  </span>
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lowStockProducts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() =>
                  setStockFilter(stockFilter === "low_stock" ? "all" : "low_stock")
                }
              >
                {stockFilter === "low_stock" ? "Show All" : "Filter Low Stock"}
              </Button>
            )}
            {outOfStockProducts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() =>
                  setStockFilter(stockFilter === "out_of_stock" ? "all" : "out_of_stock")
                }
              >
                {stockFilter === "out_of_stock" ? "Show All" : "Filter Out of Stock"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Products Table Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name, SKU, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <select
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Categories</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by stock status"
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Stock Modes</option>
                <option value="unlimited">Unlimited</option>
                <option value="available">Available</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No products found. Click "Add Product" to create your first listing!
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const stockInfo = getAdminStockDisplay(product.stock, lowStockThreshold)
                  const isBusy = busyProductId === product.id

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-muted shrink-0 border border-border/50">
                            <Image
                              src={product.image || "/placeholder.svg"}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setEditingProduct(product)}
                              className="font-medium line-clamp-1 text-left hover:underline"
                            >
                              {product.name}
                            </button>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {[product.material || product.karat, product.metalColor || product.metalType]
                                .filter(Boolean)
                                .join(" • ")}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {product.sku}
                      </TableCell>
                      <TableCell className="capitalize">
                        {product.categoryLabel || formatCategoryLabel(product.category)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatPrice(product.price)}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => setInventoryProduct(product)}
                          title="Click to manage inventory"
                          className="inline-flex items-center text-left group"
                        >
                          {stockInfo.status === "unlimited" && (
                            <Badge
                              variant="outline"
                              className="border-foreground/30 bg-foreground/5 text-foreground group-hover:border-foreground transition-colors gap-1 font-medium"
                            >
                              <InfinityIcon className="h-3.5 w-3.5" />
                              Unlimited
                            </Badge>
                          )}
                          {stockInfo.status === "available" && (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 group-hover:border-emerald-500/60 transition-colors font-medium"
                            >
                              {stockInfo.label}
                            </Badge>
                          )}
                          {stockInfo.status === "low_stock" && (
                            <Badge
                              variant="outline"
                              className="border-amber-500/40 bg-amber-500/10 text-amber-400 group-hover:border-amber-500/70 transition-colors gap-1 font-medium"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              {stockInfo.label}
                            </Badge>
                          )}
                          {stockInfo.status === "out_of_stock" && (
                            <Badge
                              variant="outline"
                              className="border-red-500/40 bg-red-500/10 text-red-400 group-hover:border-red-500/70 transition-colors font-medium"
                            >
                              Out of Stock
                            </Badge>
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={product.isActive ? "default" : "secondary"}
                          className={
                            product.isActive
                              ? "bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/20"
                              : "bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20 border border-zinc-500/20"
                          }
                        >
                          {product.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isBusy}
                              aria-label={`Actions for ${product.name}`}
                            >
                              {isBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem onClick={() => setEditingProduct(product)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Product
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setInventoryProduct(product)}>
                              <Package className="h-4 w-4 mr-2" />
                              Manage Inventory
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(product)}>
                              <Power className="h-4 w-4 mr-2" />
                              {product.isActive ? "Deactivate Product" : "Activate Product"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-500 focus:text-red-500"
                              onClick={() => setDeletingProduct(product)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Product
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 1. Edit Product Modal */}
      <EditProductDialog
        product={editingProduct}
        lowStockThreshold={lowStockThreshold}
        onClose={() => setEditingProduct(null)}
        onSaved={(updated) => {
          handleProductUpdated(updated)
          setEditingProduct(null)
        }}
      />

      {/* 2. Manage Inventory Modal */}
      <ManageInventoryDialog
        product={inventoryProduct}
        lowStockThreshold={lowStockThreshold}
        onClose={() => setInventoryProduct(null)}
        onSaved={(updated) => {
          handleProductUpdated(updated)
          setInventoryProduct(null)
        }}
      />

      {/* 3. Delete Product Confirmation Dialog */}
      <AlertDialog
        open={!!deletingProduct}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                "{deletingProduct?.name}"
              </span>
              ? This action will remove the product from the storefront catalog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyProductId === deletingProduct?.id}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleConfirmDelete()
              }}
              disabled={busyProductId === deletingProduct?.id}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {busyProductId === deletingProduct?.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Product"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ============================================================================
 * EDIT PRODUCT MODAL
 * ========================================================================== */

function EditProductDialog({
  product,
  lowStockThreshold,
  onClose,
  onSaved,
}: {
  product: AdminProductItem | null
  lowStockThreshold: number
  onClose: () => void
  onSaved: (updated: AdminProductItem) => void
}) {
  const [name, setName] = useState("")
  const [nameEs, setNameEs] = useState("")
  const [description, setDescription] = useState("")
  const [descriptionEs, setDescriptionEs] = useState("")
  const [sku, setSku] = useState("")
  const [category, setCategory] = useState("rings")
  const [price, setPrice] = useState("")
  const [comparePrice, setComparePrice] = useState("")
  const [material, setMaterial] = useState("")
  const [metalColor, setMetalColor] = useState("Yellow Gold")
  const [stoneType, setStoneType] = useState("none")
  const [weight, setWeight] = useState("")
  const [length, setLength] = useState("")
  const [sizesList, setSizesList] = useState<string[]>([])
  const [newSizeInput, setNewSizeInput] = useState("")
  const [lengthsList, setLengthsList] = useState<string[]>([])
  const [newLengthInput, setNewLengthInput] = useState("")
  const [variationsList, setVariationsList] = useState<string[]>([])
  const [newVariationInput, setNewVariationInput] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [newImageUrl, setNewImageUrl] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [isFeatured, setIsFeatured] = useState(false)
  const [isBestSeller, setIsBestSeller] = useState(false)
  const [stockMode, setStockMode] = useState<StockMode>("limited")
  const [stockQty, setStockQty] = useState<number>(1)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const replaceInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!product) return
    setName(product.name || "")
    setNameEs(product.nameEs || "")
    setDescription(product.description || "")
    setDescriptionEs(product.descriptionEs || "")
    setSku(product.sku || product.slug || "")
    setCategory((product.category || "rings").toLowerCase())
    setPrice(String(product.price ?? ""))
    setComparePrice(product.comparePrice ? String(product.comparePrice) : "")
    setMaterial(product.material || product.karat || "14K")
    setMetalColor(product.metalColor || product.metalType || "Yellow Gold")
    setStoneType(product.stoneType || "none")
    setWeight(product.weight !== null && product.weight !== undefined ? String(product.weight) : "")
    setLength(product.length !== null && product.length !== undefined ? String(product.length) : "")
    setSizesList(Array.isArray(product.sizes) ? [...product.sizes] : [])
    setLengthsList(Array.isArray(product.lengths) ? [...product.lengths] : [])
    setVariationsList(Array.isArray(product.variations) ? [...product.variations] : [])
    setImages(
      Array.isArray(product.images) && product.images.length > 0
        ? [...product.images]
        : product.image
        ? [product.image]
        : []
    )
    setNewImageUrl("")
    setNewSizeInput("")
    setNewLengthInput("")
    setNewVariationInput("")
    setIsActive(Boolean(product.isActive))
    setIsFeatured(Boolean(product.isFeatured))
    setIsBestSeller(Boolean(product.isBestSeller))
    setStockMode(product.isUnlimited || product.stock < 0 ? "unlimited" : "limited")
    setStockQty(product.stock < 0 ? 10 : Math.max(0, product.stock))
    setErrorMsg("")
  }, [product])

  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setIsUploadingImage(true)
    setErrorMsg("")
    try {
      const formData = new FormData()
      Array.from(files).forEach((f) => formData.append("files", f))
      const res = await uploadProductImagesAction(formData)
      if (res.success && res.urls && res.urls.length > 0) {
        setImages((prev) => [...prev, ...res.urls!])
        toast.success(
          res.urls.length === 1
            ? "Image uploaded successfully."
            : `${res.urls.length} images uploaded.`
        )
      } else {
        toast.error(res.error || "Failed to upload image.")
      }
    } catch {
      toast.error("Error uploading image file.")
    } finally {
      setIsUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || replacingIndex === null) return
    const targetIdx = replacingIndex
    setIsUploadingImage(true)
    setErrorMsg("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await uploadProductImagesAction(formData)
      if (res.success && res.urls && res.urls[0]) {
        setImages((prev) => prev.map((img, i) => (i === targetIdx ? res.urls![0] : img)))
        toast.success("Image replaced.")
      } else {
        toast.error(res.error || "Failed to replace image.")
      }
    } catch {
      toast.error("Error replacing image.")
    } finally {
      setIsUploadingImage(false)
      setReplacingIndex(null)
      if (replaceInputRef.current) replaceInputRef.current.value = ""
    }
  }

  const handleAddImageUrl = () => {
    const trimmed = newImageUrl.trim()
    if (!trimmed) return
    setImages((prev) => [...prev, trimmed])
    setNewImageUrl("")
  }

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSetPrimaryImage = (index: number) => {
    if (index === 0) return
    setImages((prev) => {
      const next = [...prev]
      const [chosen] = next.splice(index, 1)
      next.unshift(chosen)
      return next
    })
  }

  const addChipItem = (
    inputVal: string,
    setInputVal: (v: string) => void,
    list: string[],
    setList: (v: string[]) => void
  ) => {
    const parts = inputVal
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length === 0) return
    const merged = Array.from(new Set([...list, ...parts]))
    setList(merged)
    setInputVal("")
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    setErrorMsg("")

    if (!name.trim()) {
      setErrorMsg("Product name is required.")
      return
    }
    if (!description.trim()) {
      setErrorMsg("Product description is required.")
      return
    }
    const parsedPrice = Number(price)
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setErrorMsg("Selling price must be greater than $0.00 USD.")
      return
    }
    if (images.length === 0) {
      setErrorMsg("Please keep or upload at least one product image.")
      return
    }
    if (stockMode === "limited" && (stockQty < 0 || !Number.isInteger(Number(stockQty)))) {
      setErrorMsg("Limited stock quantity must be a whole number (0 or greater).")
      return
    }

    // Merge any uncommitted chip inputs before saving
    const finalSizes = Array.from(
      new Set([
        ...sizesList,
        ...newSizeInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ])
    )
    const finalLengths = Array.from(
      new Set([
        ...lengthsList,
        ...newLengthInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ])
    )
    const finalVariations = Array.from(
      new Set([
        ...variationsList,
        ...newVariationInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ])
    )

    setIsSaving(true)
    const toastId = toast.loading("Saving product changes...")
    try {
      const res = await updateProductAction({
        id: product.id,
        name: name.trim(),
        nameEs: nameEs.trim() || null,
        description: description.trim(),
        descriptionEs: descriptionEs.trim() || null,
        sku: sku.trim() || product.slug,
        category,
        price: parsedPrice,
        comparePrice: comparePrice.trim() ? Number(comparePrice) : null,
        images,
        material: material.trim(),
        karat: material.trim(),
        metalColor: metalColor.trim(),
        metalType: metalColor.trim(),
        stoneType,
        weight: weight.trim() ? Number(weight) : null,
        length: length.trim() ? Number(length) : null,
        sizes: finalSizes,
        lengths: finalLengths,
        variations: finalVariations,
        isActive,
        isFeatured,
        isBestSeller,
        stockMode,
        inventoryQty: stockMode === "unlimited" ? -1 : stockQty,
      })

      if (res.success && res.product) {
        toast.success("Product changes saved and synchronized with storefront.", {
          id: toastId,
        })
        onSaved(res.product as AdminProductItem)
      } else {
        const msg = res.error || "Failed to save product changes."
        setErrorMsg(msg)
        toast.error(msg, { id: toastId })
      }
    } catch (err: any) {
      const msg = String(err?.message || "Failed to communicate with server.")
      setErrorMsg(msg)
      toast.error(msg, { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const previewStock = getAdminStockDisplay(
    stockMode === "unlimited" ? -1 : stockQty,
    lowStockThreshold
  )

  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background border-border p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">Edit Product</DialogTitle>
              <DialogDescription>
                Update product details, images, specifications, and inventory mode. Changes sync immediately with the storefront.
              </DialogDescription>
            </div>
            {product && (
              <Badge
                variant="outline"
                className="font-mono text-xs border-border text-muted-foreground"
              >
                URL: /product/{product.slug}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="px-6 py-5 space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              1. General Information
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Product Name (English) *</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Cuban Link Chain 14K"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-nameEs">Product Name (Spanish)</Label>
                <Input
                  id="edit-nameEs"
                  value={nameEs}
                  onChange={(e) => setNameEs(e.target.value)}
                  placeholder="e.g. Cadena Eslabón Cubano 14K"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-sku">SKU *</Label>
                <Input
                  id="edit-sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  required
                  placeholder="e.g. MG-CHAIN-14K"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category *</Label>
                <select
                  id="edit-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Product Description (English) *</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
                placeholder="Describe craftsmanship, diamond quality, and setting..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-descriptionEs">Product Description (Spanish)</Label>
              <Textarea
                id="edit-descriptionEs"
                value={descriptionEs}
                onChange={(e) => setDescriptionEs(e.target.value)}
                rows={2}
                placeholder="Descripción en español (opcional)..."
              />
            </div>
          </div>

          <Separator />

          {/* Section 2: Pricing & Status */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              2. Pricing & Product Status
            </h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">Selling Price (USD) *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  placeholder="4250.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-comparePrice">Compare-at Price (USD)</Label>
                <Input
                  id="edit-comparePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={comparePrice}
                  onChange={(e) => setComparePrice(e.target.value)}
                  placeholder="Optional original price"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Product Status</Label>
                <select
                  id="edit-status"
                  value={isActive ? "active" : "inactive"}
                  onChange={(e) => setIsActive(e.target.value === "active")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="active">Active (Visible on Storefront)</option>
                  <option value="inactive">Inactive (Hidden from Storefront)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 pt-1">
              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <Switch checked={isBestSeller} onCheckedChange={setIsBestSeller} />
                <span>Best Seller Badge</span>
              </label>
              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
                <span>Featured Product</span>
              </label>
            </div>
          </div>

          <Separator />

          {/* Section 3: Inventory Configuration (Limited vs Unlimited) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  3. Inventory Configuration
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choose Limited Stock for in-vault pieces or Unlimited Stock for on-demand supplier items (Stuller, Quality Gold).
                </p>
              </div>
              <Badge variant="outline" className="font-medium">
                Preview: {previewStock.label}
              </Badge>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStockMode("limited")}
                className={`p-4 rounded-lg border text-left transition-all ${
                  stockMode === "limited"
                    ? "border-foreground bg-foreground/5 ring-1 ring-foreground"
                    : "border-border hover:border-foreground/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Option A: Limited Stock</span>
                  {stockMode === "limited" && <Check className="h-4 w-4 text-foreground" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Track exact available units. Deducts automatically on paid orders and prevents overselling.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStockMode("unlimited")}
                className={`p-4 rounded-lg border text-left transition-all ${
                  stockMode === "unlimited"
                    ? "border-foreground bg-foreground/5 ring-1 ring-foreground"
                    : "border-border hover:border-foreground/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm flex items-center gap-1.5">
                    <InfinityIcon className="h-4 w-4" />
                    Option B: Unlimited Stock
                  </span>
                  {stockMode === "unlimited" && <Check className="h-4 w-4 text-foreground" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Always available for purchase without stock limits. Ideal for Stuller & Quality Gold on-demand pieces.
                </p>
              </button>
            </div>

            {stockMode === "limited" ? (
              <div className="p-4 rounded-lg border border-border bg-card/50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="edit-stock-qty">Available Quantity (Units)</Label>
                    <p className="text-xs text-muted-foreground">
                      Enter exact quantity or adjust manually. Negative quantities are prevented.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setStockQty((q) => Math.max(0, q - 1))}
                      disabled={stockQty <= 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      id="edit-stock-qty"
                      type="number"
                      min={0}
                      step={1}
                      value={stockQty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10)
                        setStockQty(isNaN(val) ? 0 : Math.max(0, val))
                      }}
                      className="w-24 text-center font-semibold"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setStockQty((q) => Math.max(0, q + 1))}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground mr-1">Quick set:</span>
                  {[0, ...QUICK_STOCK_PRESETS].map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant={stockQty === preset ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs px-2.5"
                      onClick={() => setStockQty(preset)}
                    >
                      {preset === 0 ? "0 (Out of Stock)" : preset}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-border bg-card/50 flex items-center gap-3 text-sm">
                <InfinityIcon className="h-5 w-5 text-foreground shrink-0" />
                <div>
                  <p className="font-medium">Unlimited Inventory Enabled</p>
                  <p className="text-xs text-muted-foreground">
                    Displays "Unlimited" in the admin table. Customers can purchase any quantity without decrementing stock unless the product is manually deactivated.
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Section 4: Jewelry Material, Metal Color, Weight & Specifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              4. Material, Metal Color & Specifications
            </h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-material">Material / Purity (Karat)</Label>
                <Input
                  id="edit-material"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="e.g. 10K, 14K, 18K"
                />
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {MATERIAL_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setMaterial(preset)}
                      className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                        material.toLowerCase() === preset.toLowerCase()
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-metalColor">Metal Color</Label>
                <Input
                  id="edit-metalColor"
                  value={metalColor}
                  onChange={(e) => setMetalColor(e.target.value)}
                  placeholder="e.g. Yellow Gold, White Gold, Rose Gold"
                />
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {METAL_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setMetalColor(preset)}
                      className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                        metalColor.toLowerCase() === preset.toLowerCase()
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-stoneType">Stone Type</Label>
                <select
                  id="edit-stoneType"
                  value={stoneType}
                  onChange={(e) => setStoneType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {STONE_TYPE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-weight">Product Weight (grams, optional)</Label>
                <Input
                  id="edit-weight"
                  type="number"
                  step="0.01"
                  min="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 12.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-length">Primary Length (inches, optional)</Label>
                <Input
                  id="edit-length"
                  type="number"
                  step="0.1"
                  min="0"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  placeholder="e.g. 20"
                />
              </div>
            </div>

            {/* Available Sizes / Lengths / Variations */}
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="edit-sizes">
                  Available Sizes / Selectable Options (e.g. 5, 6, 7, 8 or 18", 20", 22")
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-sizes"
                    value={newSizeInput}
                    onChange={(e) => setNewSizeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addChipItem(newSizeInput, setNewSizeInput, sizesList, setSizesList)
                      }
                    }}
                    placeholder="Type sizes separated by commas (e.g. 5, 6, 7, 8) and press Add"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      addChipItem(newSizeInput, setNewSizeInput, sizesList, setSizesList)
                    }
                  >
                    Add
                  </Button>
                </div>
                {sizesList.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {sizesList.map((sz) => (
                      <Badge
                        key={sz}
                        variant="secondary"
                        className="gap-1.5 pl-2.5 pr-1.5 py-1 text-xs"
                      >
                        {sz}
                        <button
                          type="button"
                          onClick={() => setSizesList((prev) => prev.filter((s) => s !== sz))}
                          className="hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSizesList([])}
                      className="text-xs text-muted-foreground underline ml-2 hover:text-foreground"
                    >
                      Clear all sizes
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No selectable sizes required for this piece.
                  </p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-lengths">Available Lengths (if applicable)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="edit-lengths"
                      value={newLengthInput}
                      onChange={(e) => setNewLengthInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addChipItem(
                            newLengthInput,
                            setNewLengthInput,
                            lengthsList,
                            setLengthsList
                          )
                        }
                      }}
                      placeholder='e.g. 18", 20", 22"'
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        addChipItem(
                          newLengthInput,
                          setNewLengthInput,
                          lengthsList,
                          setLengthsList
                        )
                      }
                    >
                      Add
                    </Button>
                  </div>
                  {lengthsList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {lengthsList.map((len) => (
                        <Badge key={len} variant="outline" className="gap-1 text-xs">
                          {len}
                          <button
                            type="button"
                            onClick={() =>
                              setLengthsList((prev) => prev.filter((l) => l !== len))
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-variations">Variations (if applicable)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="edit-variations"
                      value={newVariationInput}
                      onChange={(e) => setNewVariationInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addChipItem(
                            newVariationInput,
                            setNewVariationInput,
                            variationsList,
                            setVariationsList
                          )
                        }
                      }}
                      placeholder="e.g. 14K Yellow Gold, 18K White Gold"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        addChipItem(
                          newVariationInput,
                          setNewVariationInput,
                          variationsList,
                          setVariationsList
                        )
                      }
                    >
                      Add
                    </Button>
                  </div>
                  {variationsList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {variationsList.map((v) => (
                        <Badge key={v} variant="outline" className="gap-1 text-xs">
                          {v}
                          <button
                            type="button"
                            onClick={() =>
                              setVariationsList((prev) => prev.filter((item) => item !== v))
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 5: Product Images (Add, Remove, Replace) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  5. Product Images
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add, remove, or replace product images. The first image is shown as the main cover photo.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleAddFiles}
                />
                <input
                  ref={replaceInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleReplaceFile}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploadingImage ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload Image
                </Button>
              </div>
            </div>

            {/* Image Grid */}
            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map((imgUrl, index) => (
                  <div
                    key={`${imgUrl}-${index}`}
                    className="group relative rounded-lg border border-border overflow-hidden bg-secondary aspect-square"
                  >
                    <Image
                      src={imgUrl || "/placeholder.svg"}
                      alt={`Product image ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                    {index === 0 && (
                      <Badge className="absolute top-2 left-2 text-[10px] bg-black/80 text-white border border-white/20">
                        Main Photo
                      </Badge>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-1.5 bg-black/80 backdrop-blur-xs flex items-center justify-between gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {index !== 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] text-white hover:bg-white/20"
                          onClick={() => handleSetPrimaryImage(index)}
                          title="Set as main image"
                        >
                          <Star className="h-3 w-3 mr-1" />
                          Main
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] text-white hover:bg-white/20"
                        onClick={() => {
                          setReplacingIndex(index)
                          replaceInputRef.current?.click()
                        }}
                        title="Replace this image"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Replace
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20 ml-auto"
                        onClick={() => handleRemoveImage(index)}
                        title="Remove image"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No images selected. Upload a file or add an image URL below.
              </div>
            )}

            {/* Add by URL */}
            <div className="flex gap-2">
              <Input
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddImageUrl()
                  }
                }}
                placeholder="Or paste an image URL (https://...)"
              />
              <Button type="button" variant="outline" onClick={handleAddImageUrl}>
                Add URL
              </Button>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border sticky bottom-0 bg-background py-4 z-10">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || isUploadingImage}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ============================================================================
 * MANAGE INVENTORY MODAL
 * ========================================================================== */

function ManageInventoryDialog({
  product,
  lowStockThreshold,
  onClose,
  onSaved,
}: {
  product: AdminProductItem | null
  lowStockThreshold: number
  onClose: () => void
  onSaved: (updated: AdminProductItem) => void
}) {
  const [mode, setMode] = useState<StockMode>("limited")
  const [quantity, setQuantity] = useState<number>(0)
  const [threshold, setThreshold] = useState<number>(lowStockThreshold)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (!product) return
    const isUnlim = product.isUnlimited || product.stock < 0
    setMode(isUnlim ? "unlimited" : "limited")
    setQuantity(isUnlim ? 10 : Math.max(0, product.stock))
    setThreshold(product.lowStockThreshold ?? lowStockThreshold)
    setErrorMsg("")
  }, [product, lowStockThreshold])

  const adjustQty = (delta: number) => {
    setQuantity((prev) => Math.max(0, prev + delta))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    setErrorMsg("")

    if (mode === "limited" && (!Number.isInteger(Number(quantity)) || quantity < 0)) {
      setErrorMsg("Stock quantity must be a non-negative whole number.")
      return
    }

    setIsSaving(true)
    const toastId = toast.loading("Updating inventory...")
    try {
      const res = await updateProductInventoryAction({
        productId: product.id,
        stockMode: mode,
        quantity: mode === "unlimited" ? -1 : quantity,
        lowStockThreshold: threshold,
      })

      if (res.success && res.product) {
        const updated = res.product as AdminProductItem
        const display = getAdminStockDisplay(updated.stock, threshold)
        toast.success(`Inventory updated for "${product.name}": ${display.label}`, {
          id: toastId,
        })
        onSaved(updated)
      } else {
        const msg = res.error || "Failed to update inventory."
        setErrorMsg(msg)
        toast.error(msg, { id: toastId })
      }
    } catch (err: any) {
      const msg = String(err?.message || "Failed to communicate with server.")
      setErrorMsg(msg)
      toast.error(msg, { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const preview = getAdminStockDisplay(mode === "unlimited" ? -1 : quantity, threshold)

  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="max-w-lg bg-background border-border">
        <DialogHeader>
          <DialogTitle>Manage Inventory</DialogTitle>
          <DialogDescription>
            {product?.name} ({product?.sku})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5 pt-2">
          {errorMsg && (
            <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 text-sm">
              {errorMsg}
            </div>
          )}

          {/* Mode Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode("limited")}
              className={`p-3.5 rounded-lg border text-left transition-all ${
                mode === "limited"
                  ? "border-foreground bg-foreground/5 ring-1 ring-foreground"
                  : "border-border hover:border-foreground/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Limited Stock</span>
                {mode === "limited" && <Check className="h-4 w-4" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Exact unit quantity. Deducts on paid orders.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode("unlimited")}
              className={`p-3.5 rounded-lg border text-left transition-all ${
                mode === "unlimited"
                  ? "border-foreground bg-foreground/5 ring-1 ring-foreground"
                  : "border-border hover:border-foreground/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm flex items-center gap-1">
                  <InfinityIcon className="h-4 w-4" />
                  Unlimited Stock
                </span>
                {mode === "unlimited" && <Check className="h-4 w-4" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                On-demand supply (Stuller / Quality Gold).
              </p>
            </button>
          </div>

          {mode === "limited" ? (
            <div className="space-y-4 rounded-lg border border-border p-4 bg-card/40">
              <div className="flex items-center justify-between">
                <Label htmlFor="inv-qty">Available Quantity</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => adjustQty(-1)}
                    disabled={quantity <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="inv-qty"
                    type="number"
                    min={0}
                    step={1}
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10)
                      setQuantity(isNaN(val) ? 0 : Math.max(0, val))
                    }}
                    className="w-24 text-center font-bold text-base h-9"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => adjustQty(1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground mr-1">Set quantity:</span>
                {[0, 1, 2, 5, 10, 25].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={quantity === preset ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setQuantity(preset)}
                  >
                    {preset}
                  </Button>
                ))}
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="inv-threshold" className="text-xs">
                    Low-Stock Warning Threshold
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Warns when stock is ≤ {threshold} units
                  </p>
                </div>
                <Input
                  id="inv-threshold"
                  type="number"
                  min={0}
                  step={1}
                  value={threshold}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    setThreshold(isNaN(val) ? 0 : Math.max(0, val))
                  }}
                  className="w-20 h-8 text-center text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border p-4 bg-card/40 space-y-1.5">
              <div className="flex items-center gap-2 font-medium text-sm">
                <InfinityIcon className="h-4 w-4" />
                <span>Unlimited Stock Active</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                No quantity is required. This product will display <strong>Unlimited</strong> in the admin table and remain available for purchase without stock limits unless manually deactivated.
              </p>
            </div>
          )}

          {/* Resulting Status Preview */}
          <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-3.5 py-2.5 text-xs">
            <span className="text-muted-foreground">Table Stock Display:</span>
            <span className="font-semibold text-foreground">{preview.label}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
