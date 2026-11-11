"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createProductAction } from "@/lib/actions/products"
import { Loader2, ArrowLeft, UploadCloud, Infinity as InfinityIcon, Check } from "lucide-react"

export default function NewProductPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [stockMode, setStockMode] = useState<"limited" | "unlimited">("limited")
  const [inventoryQty, setInventoryQty] = useState<number>(1)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const formData = new FormData(e.currentTarget)
      formData.set("stockMode", stockMode)
      formData.set("inventoryQty", stockMode === "unlimited" ? "-1" : String(Math.max(0, inventoryQty)))
      await createProductAction(formData)
      // router.push is handled by the server action's redirect
    } catch (err: any) {
      setError(err.message || "Failed to create product")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push("/admin/products")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Add New Product</h1>
          <p className="text-muted-foreground">Upload your jewelry directly to the store</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
            <CardDescription>Enter the name, prices, and specifics of the jewelry piece.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">{error}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name (English)</Label>
                <Input id="name" name="name" required placeholder="e.g. Diamond Tennis Bracelet" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameEs">Product Name (Spanish)</Label>
                <Input id="nameEs" name="nameEs" placeholder="e.g. Pulsera de Diamantes" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU (Optional)</Label>
                <Input id="sku" name="sku" placeholder="e.g. MG-BRACELET-01" className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  name="category"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  required
                >
                  <option value="">Select Category...</option>
                  <option value="rings">Rings</option>
                  <option value="necklaces">Necklaces</option>
                  <option value="earrings">Earrings</option>
                  <option value="bracelets">Bracelets</option>
                  <option value="chains">Chains</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" required placeholder="Beautiful diamond bracelet..." rows={3} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Selling Price ($ USD)</Label>
                <Input id="price" name="price" type="number" step="0.01" min="0.01" required placeholder="1999.99" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comparePrice">Compare-at Price ($ USD, Optional)</Label>
                <Input id="comparePrice" name="comparePrice" type="number" step="0.01" min="0" placeholder="2499.99" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="metalColor">Metal Color</Label>
                <Input id="metalColor" name="metalColor" required defaultValue="Yellow Gold" placeholder="Yellow Gold, White Gold, Rose Gold..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="material">Material / Karat</Label>
                <Input id="material" name="material" defaultValue="14K" placeholder="10K, 14K, 18K..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stoneType">Stone Type</Label>
                <Input id="stoneType" name="stoneType" defaultValue="none" placeholder="none, natural, lab" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (grams, optional)</Label>
                <Input id="weight" name="weight" type="number" step="0.01" min="0" placeholder="e.g. 12.5" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="length">Length (inches, optional)</Label>
                <Input id="length" name="length" type="number" step="0.1" min="0" placeholder="e.g. 20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sizes">Available Sizes (comma-separated)</Label>
                <Input id="sizes" name="sizes" placeholder="e.g. 6, 7, 8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Configuration</CardTitle>
            <CardDescription>Choose Limited Stock or Unlimited Stock (for on-demand wholesale items).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  <span className="font-semibold text-sm">Limited Stock</span>
                  {stockMode === "limited" && <Check className="h-4 w-4" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter exact available quantity. Automatically deducts on paid orders.
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
                    Unlimited Stock
                  </span>
                  {stockMode === "unlimited" && <Check className="h-4 w-4" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  No stock restriction. Ideal for Stuller & Quality Gold on-demand pieces.
                </p>
              </button>
            </div>

            {stockMode === "limited" && (
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="inventoryQty">Available Quantity</Label>
                <Input
                  id="inventoryQty"
                  type="number"
                  min={0}
                  step={1}
                  value={inventoryQty}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    setInventoryQty(isNaN(val) ? 0 : Math.max(0, val))
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Image</CardTitle>
            <CardDescription>Upload a high-quality picture of your jewelry</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-10 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
              <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
              <div className="space-y-2">
                <p className="text-sm font-medium">Upload Product Photo</p>
                <Input
                  id="image"
                  name="image"
                  type="file"
                  accept="image/*"
                  className="max-w-[250px] mx-auto cursor-pointer"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrls">Or Image URL (Optional if file uploaded above)</Label>
              <Input id="imageUrls" name="imageUrls" placeholder="https://..." />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save & Publish Product
          </Button>
        </div>
      </form>
    </div>
  )
}
