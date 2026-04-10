"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createProductAction } from "@/lib/actions/products"
import { Loader2, ArrowLeft, UploadCloud } from "lucide-react"

export default function NewProductPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const formData = new FormData(e.currentTarget)
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
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name (English)</Label>
                <Input id="name" name="name" required placeholder="e.g. Diamond Tennis Bracelet" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameEs">Product Name (Spanish)</Label>
                <Input id="nameEs" name="nameEs" placeholder="e.g. Pulsera de Diamantes" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" required placeholder="Beautiful diamond bracelet..." rows={3}/>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input id="price" name="price" type="number" step="0.01" required placeholder="1999.99" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select id="category" name="category" className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" required>
                  <option value="">Select Category...</option>
                  <option value="Rings">Rings</option>
                  <option value="Necklaces">Necklaces</option>
                  <option value="Earrings">Earrings</option>
                  <option value="Bracelets">Bracelets</option>
                  <option value="Chains">Chains</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="metalType">Metal Type</Label>
                <Input id="metalType" name="metalType" required placeholder="Gold, Silver, Platinum..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="karat">Karat</Label>
                <Input id="karat" name="karat" placeholder="14k, 18k..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stoneType">Stone Type</Label>
                <Input id="stoneType" name="stoneType" defaultValue="none" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Image</CardTitle>
            <CardDescription>Upload a high-quality picture of your jewelry</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="border-2 border-dashed border-border rounded-lg p-10 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
              <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
              <div className="space-y-2">
                <p className="text-sm font-medium">Auto-upload to Vercel Blob</p>
                <Input 
                  id="image" 
                  name="image" 
                  type="file" 
                  accept="image/*" 
                  required 
                  className="max-w-[250px] mx-auto cursor-pointer"
                />
              </div>
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
