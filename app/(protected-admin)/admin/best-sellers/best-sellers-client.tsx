"use client"

import React, { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowDown,
  ArrowUp,
  Award,
  Check,
  ExternalLink,
  GripVertical,
  Infinity as InfinityIcon,
  Info,
  Layers,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { saveBestSellersConfigAction } from "@/lib/actions/admin-best-sellers"
import type {
  AdminBestSellerPerformanceRow,
  AdminBestSellersDashboardData,
  BestSellersDisplayMode,
  ProductShowcaseBadge,
  SelectionType,
} from "@/lib/best-sellers"

type PerformanceSortKey =
  | "units_desc"
  | "revenue_desc"
  | "newest_desc"
  | "manual_first"

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "chains", label: "Chains" },
  { value: "bracelets", label: "Bracelets" },
  { value: "earrings", label: "Earrings" },
  { value: "rings", label: "Rings" },
  { value: "necklaces", label: "Necklaces" },
]

const DISPLAY_MODE_OPTIONS: Array<{
  value: BestSellersDisplayMode
  title: string
  badge: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  {
    value: "hybrid",
    title: "Hybrid",
    badge: "Default",
    description:
      "Prioritize your ordered M&G Picks first, then fill remaining positions with verified top-selling products without duplicates.",
    icon: Layers,
  },
  {
    value: "manual",
    title: "Manual",
    badge: "Curated Only",
    description:
      "Show only active products manually selected as M&G Picks in the exact display order you choose.",
    icon: Sparkles,
  },
  {
    value: "automatic",
    title: "Automatic",
    badge: "Verified Sales",
    description:
      "Rank active products purely by verified paid sales (units sold, then net revenue). Falls back to M&G Picks if no sales exist yet.",
    icon: TrendingUp,
  },
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)
}

function formatPriceRange(product: AdminBestSellerPerformanceRow): string {
  if (product.priceMax && product.priceMax > product.price) {
    return `${formatCurrency(product.price)} – ${formatCurrency(product.priceMax)}`
  }
  return formatCurrency(product.price)
}

function renderStockBadge(product: AdminBestSellerPerformanceRow) {
  const { stockDisplay } = product
  if (stockDisplay.status === "unlimited") {
    return (
      <Badge
        variant="outline"
        className="border-foreground/30 bg-foreground/5 text-foreground gap-1 font-medium text-xs"
      >
        <InfinityIcon className="h-3 w-3" />
        Unlimited
      </Badge>
    )
  }
  if (stockDisplay.status === "available") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium text-xs"
      >
        {stockDisplay.label}
      </Badge>
    )
  }
  if (stockDisplay.status === "low_stock") {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/40 bg-amber-500/10 text-amber-400 gap-1 font-medium text-xs"
      >
        <AlertTriangle className="h-3 w-3" />
        {stockDisplay.label}
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="border-red-500/40 bg-red-500/10 text-red-400 font-medium text-xs"
    >
      Out of Stock
    </Badge>
  )
}

function renderSelectionTypeBadge(selectionType: SelectionType) {
  switch (selectionType) {
    case "both":
      return (
        <Badge
          variant="outline"
          className="border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-medium"
        >
          Both
        </Badge>
      )
    case "manual":
      return (
        <Badge
          variant="outline"
          className="border-amber-500/30 bg-secondary text-foreground text-xs font-medium"
        >
          Manual
        </Badge>
      )
    case "automatic":
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium"
        >
          Automatic
        </Badge>
      )
    default:
      return <span className="text-xs text-muted-foreground">—</span>
  }
}

function renderStorefrontCardBadge(badge: ProductShowcaseBadge) {
  if (badge === "best_seller") {
    return (
      <Badge variant="secondary" className="text-[11px] font-medium">
        Best Seller
      </Badge>
    )
  }
  if (badge === "mg_pick") {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/40 bg-amber-500/10 text-amber-300 text-[11px] font-medium"
      >
        M&amp;G Pick
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-[11px] text-muted-foreground border-border/60">
      No Badge
    </Badge>
  )
}

export function BestSellersAdminClient({
  initialData,
}: {
  initialData: AdminBestSellersDashboardData
}) {
  const router = useRouter()
  const [data, setData] = useState<AdminBestSellersDashboardData>(initialData)
  const [mode, setMode] = useState<BestSellersDisplayMode>(initialData.config.mode)
  const [manualIds, setManualIds] = useState<string[]>(initialData.config.manualProductIds)
  const [isSaving, setIsSaving] = useState(false)

  // Catalog picker filters
  const [catalogSearch, setCatalogSearch] = useState("")
  const [catalogCategory, setCatalogCategory] = useState("all")

  // Sales performance table controls
  const [perfSearch, setPerfSearch] = useState("")
  const [perfSort, setPerfSort] = useState<PerformanceSortKey>("units_desc")
  const [perfStatusFilter, setPerfStatusFilter] = useState<"all" | "active" | "inactive">("all")

  // Drag-and-drop state for manual ordering
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const productById = useMemo(() => {
    return new Map(data.products.map((p) => [p.id, p]))
  }, [data.products])

  const manualIdSet = useMemo(() => new Set(manualIds), [manualIds])

  const hasUnsavedChanges = useMemo(() => {
    if (mode !== data.config.mode) return true
    if (manualIds.length !== data.config.manualProductIds.length) return true
    return manualIds.some((id, idx) => id !== data.config.manualProductIds[idx])
  }, [mode, manualIds, data.config.mode, data.config.manualProductIds])

  // Active products in catalog for manual selection
  const activeCatalogProducts = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase()
    return data.products.filter((p) => {
      if (!p.isActive) return false
      if (catalogCategory !== "all" && p.category !== catalogCategory) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.nameEs.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.variantSkus.some((s) => s.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q) ||
        p.categoryLabel.toLowerCase().includes(q)
      )
    })
  }, [data.products, catalogSearch, catalogCategory])

  // Selected M&G Picks in exact manual order
  const orderedManualProducts = useMemo(() => {
    return manualIds
      .map((id) => productById.get(id))
      .filter((p): p is AdminBestSellerPerformanceRow => Boolean(p))
  }, [manualIds, productById])

  // Live storefront preview calculation reflecting unsaved mode / manualIds edits
  const livePreview = useMemo(() => {
    const activeProducts = data.products.filter((p) => p.isActive)
    const activeMap = new Map(activeProducts.map((p) => [p.id, p]))

    const activeManual = manualIds
      .map((id) => activeMap.get(id))
      .filter((p): p is AdminBestSellerPerformanceRow => Boolean(p))

    const automaticRanked = activeProducts
      .filter((p) => p.verifiedNetUnits > 0)
      .sort((a, b) => {
        if (b.verifiedNetUnits !== a.verifiedNetUnits) {
          return b.verifiedNetUnits - a.verifiedNetUnits
        }
        if (b.verifiedNetRevenue !== a.verifiedNetRevenue) {
          return b.verifiedNetRevenue - a.verifiedNetRevenue
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

    const autoSet = new Set(automaticRanked.map((p) => p.id))
    const activeManualSet = new Set(activeManual.map((p) => p.id))

    const computeBadge = (id: string, fallbackMode = false): ProductShowcaseBadge => {
      if (fallbackMode) return "none"
      if (autoSet.has(id)) return "best_seller"
      if (activeManualSet.has(id)) return "mg_pick"
      return "none"
    }

    let items: Array<{ product: AdminBestSellerPerformanceRow; badge: ProductShowcaseBadge }> = []
    let note = ""

    if (mode === "manual") {
      items = activeManual.map((p) => ({ product: p, badge: computeBadge(p.id) }))
      note =
        items.length === 0
          ? "No active M&G Picks selected. Select products below to display them."
          : `Showing ${items.length} manually selected active product${items.length === 1 ? "" : "s"}.`
    } else if (mode === "automatic") {
      if (automaticRanked.length > 0) {
        items = automaticRanked.map((p) => ({ product: p, badge: "best_seller" }))
        note = `Ranking ${items.length} active product${items.length === 1 ? "" : "s"} by verified sales.`
      } else if (activeManual.length > 0) {
        items = activeManual.map((p) => ({ product: p, badge: "mg_pick" }))
        note =
          "No verified sales yet — automatically falling back to M&G Picks (labeled M&G Pick, not Best Seller)."
      } else {
        const newest = [...activeProducts].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        items = newest.map((p) => ({ product: p, badge: "none" }))
        note =
          "No verified sales or M&G Picks yet — showing active catalog fallback with no badges."
      }
    } else {
      const seen = new Set<string>()
      const merged: AdminBestSellerPerformanceRow[] = []
      for (const p of activeManual) {
        if (!seen.has(p.id)) {
          seen.add(p.id)
          merged.push(p)
        }
      }
      for (const p of automaticRanked) {
        if (!seen.has(p.id)) {
          seen.add(p.id)
          merged.push(p)
        }
      }
      if (merged.length > 0) {
        items = merged.map((p) => ({ product: p, badge: computeBadge(p.id) }))
        note =
          automaticRanked.length === 0
            ? `No verified sales yet — showing ${activeManual.length} M&G Pick${activeManual.length === 1 ? "" : "s"}.`
            : `Showing ${activeManual.length} M&G Pick${activeManual.length === 1 ? "" : "s"} prioritized before verified top sellers (${items.length} unique products total).`
      } else {
        const newest = [...activeProducts].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        items = newest.map((p) => ({ product: p, badge: "none" }))
        note =
          "No M&G Picks or verified sales yet — showing active catalog fallback with no badges."
      }
    }

    return {
      homepageTop4: items.slice(0, 4),
      viewAllCount: items.length,
      note,
    }
  }, [data.products, manualIds, mode])

  // Performance table rows with live selectionType reflection + sorting
  const performanceRows = useMemo(() => {
    const q = perfSearch.trim().toLowerCase()
    const manualOrderMap = new Map<string, number>()
    manualIds.forEach((id, idx) => manualOrderMap.set(id, idx + 1))

    const enriched = data.products.map((p) => {
      const isManualPick = manualOrderMap.has(p.id)
      const isAuto = p.isActive && p.verifiedNetUnits > 0
      const liveSelectionType: SelectionType =
        isManualPick && isAuto
          ? "both"
          : isManualPick
          ? "manual"
          : isAuto
          ? "automatic"
          : "none"
      return {
        ...p,
        isManualPick,
        manualPosition: manualOrderMap.get(p.id) ?? null,
        selectionType: liveSelectionType,
      }
    })

    const filtered = enriched.filter((p) => {
      if (perfStatusFilter === "active" && !p.isActive) return false
      if (perfStatusFilter === "inactive" && p.isActive) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.nameEs.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.variantSkus.some((s) => s.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q) ||
        p.categoryLabel.toLowerCase().includes(q)
      )
    })

    return filtered.sort((a, b) => {
      if (perfSort === "units_desc") {
        if (b.verifiedNetUnits !== a.verifiedNetUnits) {
          return b.verifiedNetUnits - a.verifiedNetUnits
        }
        if (b.verifiedNetRevenue !== a.verifiedNetRevenue) {
          return b.verifiedNetRevenue - a.verifiedNetRevenue
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      if (perfSort === "revenue_desc") {
        if (b.verifiedNetRevenue !== a.verifiedNetRevenue) {
          return b.verifiedNetRevenue - a.verifiedNetRevenue
        }
        if (b.verifiedNetUnits !== a.verifiedNetUnits) {
          return b.verifiedNetUnits - a.verifiedNetUnits
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      if (perfSort === "newest_desc") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      // manual_first
      if (a.isManualPick && !b.isManualPick) return -1
      if (!a.isManualPick && b.isManualPick) return 1
      if (a.manualPosition !== null && b.manualPosition !== null) {
        return a.manualPosition - b.manualPosition
      }
      if (b.verifiedNetUnits !== a.verifiedNetUnits) {
        return b.verifiedNetUnits - a.verifiedNetUnits
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [data.products, manualIds, perfSearch, perfSort, perfStatusFilter])

  const handleToggleManualPick = (productId: string) => {
    setManualIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    )
  }

  const handleRemoveManualPick = (productId: string) => {
    setManualIds((prev) => prev.filter((id) => id !== productId))
  }

  const handleMoveManualPick = (index: number, direction: -1 | 1) => {
    setManualIds((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  const handleDragStart = (id: string) => {
    setDraggedId(id)
  }

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (draggedId && draggedId !== targetId) {
      setDragOverId(targetId)
    }
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }
    setManualIds((prev) => {
      const fromIdx = prev.indexOf(draggedId)
      const toIdx = prev.indexOf(targetId)
      if (fromIdx === -1 || toIdx === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return next
    })
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleResetChanges = () => {
    setMode(data.config.mode)
    setManualIds(data.config.manualProductIds)
    toast.info("Unsaved changes discarded.")
  }

  const handleSave = async () => {
    setIsSaving(true)
    const toastId = toast.loading("Saving Best Sellers & M&G Picks settings...")
    try {
      const res = await saveBestSellersConfigAction({
        mode,
        manualProductIds: manualIds,
      })
      if (res.success && res.data) {
        setData(res.data)
        setMode(res.data.config.mode)
        setManualIds(res.data.config.manualProductIds)
        toast.success("Best Sellers & M&G Picks saved and synchronized with the storefront.", {
          id: toastId,
        })
        router.refresh()
      } else {
        toast.error(res.error || "Failed to save changes.", { id: toastId })
      }
    } catch (err: any) {
      toast.error(String(err?.message || "Failed to save changes."), { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Award className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Best Sellers &amp; Featured Picks
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Curate manual M&amp;G Picks, configure display mode, and monitor verified product sales
            used across the Homepage and Best Sellers collection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/collections/best-sellers" target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Live Page
            </Link>
          </Button>
          {hasUnsavedChanges && (
            <Button variant="ghost" size="sm" onClick={handleResetChanges} disabled={isSaving}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || (!hasUnsavedChanges && data.config.hasExplicitConfig)}
            className="min-w-[136px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {hasUnsavedChanges && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0 text-amber-400" />
            <span>You have unsaved changes. Click &ldquo;Save Changes&rdquo; to publish them to the storefront.</span>
          </div>
          <Button size="sm" variant="secondary" onClick={handleSave} disabled={isSaving}>
            Save Now
          </Button>
        </div>
      )}

      {/* Display Mode Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Display Mode Settings</CardTitle>
          <CardDescription>
            Controls both Homepage → Best Sellers (up to 4 cards) and /collections/best-sellers
            (complete eligible list) from one shared source of truth.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {DISPLAY_MODE_OPTIONS.map((opt) => {
              const Icon = opt.icon
              const isSelected = mode === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  className={cn(
                    "flex flex-col items-start rounded-lg border p-4 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-card hover:border-foreground/30 hover:bg-muted/40"
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          isSelected ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <span className="font-semibold text-sm">{opt.title}</span>
                    </div>
                    <Badge
                      variant={isSelected ? "default" : "secondary"}
                      className="text-[11px]"
                    >
                      {opt.badge}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {opt.description}
                  </p>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Live Storefront Preview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Storefront Preview (Homepage Top 4)
              </CardTitle>
              <CardDescription>{livePreview.note}</CardDescription>
            </div>
            <Badge variant="outline" className="w-fit text-xs">
              View All Collection: {livePreview.viewAllCount} product
              {livePreview.viewAllCount === 1 ? "" : "s"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {livePreview.homepageTop4.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No active products currently match the selected mode.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {livePreview.homepageTop4.map(({ product, badge }, idx) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-2.5"
                >
                  <span className="text-xs font-mono text-muted-foreground w-4 shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-secondary border border-border/50">
                    <Image
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {product.name}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {renderStorefrontCardBadge(badge)}
                      <span className="text-[11px] text-muted-foreground">
                        {formatPriceRange(product)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Management Tabs: Manual Picks vs Sales Performance */}
      <Tabs defaultValue="manual-picks" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="manual-picks" className="gap-2">
            <Sparkles className="h-4 w-4" />
            M&amp;G Picks ({manualIds.length})
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Sales Performance
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: M&G PICKS MANUAL SELECTION & ORDERING */}
        <TabsContent value="manual-picks" className="space-y-6">
          {/* Selected M&G Picks Ordered Queue */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Selected M&amp;G Picks ({orderedManualProducts.length})
                  </CardTitle>
                  <CardDescription>
                    Drag rows or use the arrow buttons to set display order. Removing a product here
                    only unfeatures it — it stays safely in your catalog inventory.
                  </CardDescription>
                </div>
                {orderedManualProducts.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-destructive w-fit"
                    onClick={() => setManualIds([])}
                  >
                    Clear All Picks
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {orderedManualProducts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <Sparkles className="mx-auto h-6 w-6 text-muted-foreground/60" />
                  <p className="mt-2 text-sm font-medium text-foreground">
                    No M&amp;G Picks selected yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Choose active products from the catalog below to feature them as M&amp;G Picks.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {orderedManualProducts.map((product, index) => (
                    <div
                      key={product.id}
                      draggable
                      onDragStart={() => handleDragStart(product.id)}
                      onDragOver={(e) => handleDragOver(e, product.id)}
                      onDragLeave={() => setDragOverId(null)}
                      onDrop={(e) => handleDrop(e, product.id)}
                      onDragEnd={() => {
                        setDraggedId(null)
                        setDragOverId(null)
                      }}
                      className={cn(
                        "flex flex-col gap-3 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center",
                        draggedId === product.id && "opacity-50",
                        dragOverId === product.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                          title="Drag to reorder"
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <span className="w-6 shrink-0 text-center font-mono text-xs font-semibold text-muted-foreground">
                          #{index + 1}
                        </span>
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-secondary border border-border/50">
                          <Image
                            src={product.image || "/placeholder.svg"}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-medium text-foreground">
                              {product.name}
                            </p>
                            {!product.isActive && (
                              <Badge
                                variant="outline"
                                className="border-amber-500/40 bg-amber-500/10 text-amber-400 text-[11px]"
                              >
                                Inactive (hidden on storefront)
                              </Badge>
                            )}
                            {product.verifiedNetUnits > 0 && (
                              <Badge
                                variant="outline"
                                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px]"
                              >
                                {product.verifiedNetUnits} sold
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>{product.categoryLabel}</span>
                            {product.sku && <span className="font-mono">SKU: {product.sku}</span>}
                            <span className="font-medium text-foreground">
                              {formatPriceRange(product)}
                            </span>
                            {renderStockBadge(product)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={index === 0}
                          onClick={() => handleMoveManualPick(index, -1)}
                          aria-label={`Move ${product.name} up`}
                          title="Move up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={index === orderedManualProducts.length - 1}
                          onClick={() => handleMoveManualPick(index, 1)}
                          aria-label={`Move ${product.name} down`}
                          title="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveManualPick(product.id)}
                          title="Remove from M&G Picks (keeps product in inventory)"
                        >
                          <X className="mr-1 h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Catalog Picker */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Active Catalog ({activeCatalogProducts.length})
                  </CardTitle>
                  <CardDescription>
                    Search active products by name, SKU, or category and select which pieces to
                    promote as M&amp;G Picks.
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Search name, SKU, category..."
                      className="pl-9"
                    />
                  </div>
                  <Select value={catalogCategory} onValueChange={setCatalogCategory}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Availability</TableHead>
                      <TableHead className="text-right">M&amp;G Pick</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeCatalogProducts.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-10 text-center text-sm text-muted-foreground"
                        >
                          No active products match your search criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeCatalogProducts.map((product) => {
                        const isPicked = manualIdSet.has(product.id)
                        const pickRank = isPicked ? manualIds.indexOf(product.id) + 1 : null
                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-secondary border border-border/50">
                                  <Image
                                    src={product.image || "/placeholder.svg"}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm line-clamp-1">
                                    {product.name}
                                  </p>
                                  {product.verifiedNetUnits > 0 && (
                                    <p className="text-[11px] text-emerald-400">
                                      {product.verifiedNetUnits} verified unit
                                      {product.verifiedNetUnits === 1 ? "" : "s"} sold
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {product.sku ||
                                (product.variantSkus.length > 0
                                  ? `${product.variantSkus.length} variant SKU${product.variantSkus.length === 1 ? "" : "s"}`
                                  : "—")}
                            </TableCell>
                            <TableCell className="text-sm">{product.categoryLabel}</TableCell>
                            <TableCell className="text-sm font-medium">
                              <div>{formatPriceRange(product)}</div>
                              {product.hasVariants && (
                                <span className="text-[11px] text-muted-foreground font-normal">
                                  {product.variantCount} variant
                                  {product.variantCount === 1 ? "" : "s"}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>{renderStockBadge(product)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant={isPicked ? "secondary" : "outline"}
                                onClick={() => handleToggleManualPick(product.id)}
                                className={cn(
                                  "min-w-[116px]",
                                  isPicked &&
                                    "border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                                )}
                              >
                                {isPicked ? (
                                  <>
                                    <Check className="mr-1.5 h-3.5 w-3.5" />
                                    Pick #{pickRank}
                                  </>
                                ) : (
                                  <>
                                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                                    Add Pick
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: ADMIN SALES PERFORMANCE TABLE */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Product Sales Performance
                  </CardTitle>
                  <CardDescription>
                    Calculated strictly from {data.salesSummary.qualifyingOrdersCount} verified paid
                    order{data.salesSummary.qualifyingOrdersCount === 1 ? "" : "s"}. Unpaid,
                    pending, failed, canceled, test, and fully refunded orders are excluded.
                  </CardDescription>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={perfSearch}
                      onChange={(e) => setPerfSearch(e.target.value)}
                      placeholder="Filter product or SKU..."
                      className="pl-9"
                    />
                  </div>
                  <Select
                    value={perfStatusFilter}
                    onValueChange={(v) => setPerfStatusFilter(v as "all" | "active" | "inactive")}
                  >
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={perfSort}
                    onValueChange={(v) => setPerfSort(v as PerformanceSortKey)}
                  >
                    <SelectTrigger className="w-full sm:w-56">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="units_desc">Most units sold</SelectItem>
                      <SelectItem value="revenue_desc">Highest verified revenue</SelectItem>
                      <SelectItem value="newest_desc">Newest products</SelectItem>
                      <SelectItem value="manual_first">Manually selected products</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            {data.salesSummary.unattributedPartialRefundOrdersCount > 0 && (
              <div className="mx-6 mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  {data.salesSummary.unattributedPartialRefundOrdersCount} partially refunded order
                  {data.salesSummary.unattributedPartialRefundOrdersCount === 1 ? "" : "s"} lack
                  item-level refund attribution. Those units are shown under gross sold units rather
                  than fabricated into verified net sales.
                </span>
              </div>
            )}

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Units Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead>Selection Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performanceRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-10 text-center text-sm text-muted-foreground"
                        >
                          No products found matching your filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      performanceRows.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-secondary border border-border/50">
                                <Image
                                  src={product.image || "/placeholder.svg"}
                                  alt={product.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {product.categoryLabel}
                                  {product.sku ? ` · ${product.sku}` : ""} ·{" "}
                                  {formatPriceRange(product)}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            <div className="text-sm font-semibold text-foreground">
                              {product.verifiedNetUnits}
                            </div>
                            {product.hasUnattributedPartialRefunds ? (
                              <div className="text-[11px] text-amber-400">
                                Gross: {product.grossSoldUnits} ({product.unattributedPartialRefundUnits}{" "}
                                partial refund unattributed)
                              </div>
                            ) : product.refundedUnits > 0 ? (
                              <div className="text-[11px] text-muted-foreground">
                                Gross: {product.grossSoldUnits} ({product.refundedUnits} refunded)
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-medium">
                            {formatCurrency(product.verifiedNetRevenue)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {renderSelectionTypeBadge(product.selectionType)}
                              {product.manualPosition !== null && (
                                <span className="text-[11px] font-mono text-muted-foreground">
                                  #{product.manualPosition}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={product.isActive ? "default" : "secondary"}
                              className={
                                product.isActive
                                  ? "bg-green-500/10 text-green-500 border border-green-500/20"
                                  : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                              }
                            >
                              {product.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
