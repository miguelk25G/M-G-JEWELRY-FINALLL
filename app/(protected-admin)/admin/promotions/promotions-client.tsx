"use client"

import { useState } from "react"
import { toast } from "sonner"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Trash2, Tag, Percent } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createDiscountCode, toggleDiscountCode, deleteDiscountCode } from "@/lib/actions/admin-promotions"

export function PromotionsClient({ initialCodes, products }: { initialCodes: any[], products: any[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreateCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    
    const code = formData.get("code") as string
    const type = formData.get("type") as string
    const value = parseFloat(formData.get("value") as string)
    const uses = formData.get("uses") as string

    if (!code || isNaN(value)) {
      toast.error("Por favor completa los campos correctamente.")
      setIsSubmitting(false)
      return
    }

    const maxUses = uses ? parseInt(uses) : null

    const res = await createDiscountCode({ code, discountType: type, discountValue: value, maxUses })
    
    if (res.success) {
      toast.success("Código de descuento creado.")
      ;(e.target as HTMLFormElement).reset()
    } else {
      toast.error(res.error)
    }
    
    setIsSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este código?")) return
    const toastId = toast.loading("Eliminando...")
    const res = await deleteDiscountCode(id)
    if (res.success) {
      toast.success("Eliminado", { id: toastId })
    } else {
      toast.error("Error", { id: toastId })
    }
  }

  const handleToggle = async (id: string, current: boolean) => {
    const res = await toggleDiscountCode(id, !current)
    if (!res.success) toast.error("Error cambiando estado.")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Promociones y Ofertas</h1>
        <p className="text-muted-foreground">Gestiona tus códigos de descuento promocionales</p>
      </div>

      <Tabs defaultValue="codes">
        <TabsList>
          <TabsTrigger value="codes">Códigos de Descuento</TabsTrigger>
          <TabsTrigger value="products">Productos En Oferta</TabsTrigger>
        </TabsList>
        
        <TabsContent value="codes" className="space-y-6 mt-4">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 border-border bg-card">
              <CardHeader>
                <CardTitle>Nuevo Código</CardTitle>
                <CardDescription>Crea un cupón para tus clientes</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCode} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Código (Ej. SUMMER20)</Label>
                    <Input id="code" name="code" placeholder="MNG10" required className="uppercase" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Tipo</Label>
                      <Select defaultValue="percentage" name="type">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                          <SelectItem value="fixed">Fijo ($)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="value">Valor</Label>
                      <Input id="value" name="value" type="number" step="0.01" min="0" placeholder="10" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="uses">Límite de Uso (Opcional)</Label>
                    <Input id="uses" name="uses" type="number" min="1" placeholder="Ej. 100 usos" />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Creando..." : "Crear Código"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Usos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialCodes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No has creado ningún código aún.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {initialCodes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-bold">{code.code}</TableCell>
                      <TableCell>
                        {code.discountType === 'percentage' ? (
                          <Badge variant="outline" className="text-blue-500 bg-blue-500/10">-{code.discountValue}%</Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-500 bg-green-500/10">-${code.discountValue}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {code.usedCount} {code.maxUses ? `/ ${code.maxUses}` : "usos"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={code.isActive} 
                            onCheckedChange={() => handleToggle(code.id, code.isActive)} 
                          />
                          <span className="text-sm text-muted-foreground">{code.isActive ? "Activo" : "Inactivo"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(code.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="products" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Productos Ofertas</CardTitle>
              <CardDescription>
                Lista de todos los artículos de tu catálogo y su estado promocional. Para poner un artículo "En Oferta" debes editar su "Compare Price" en la tabla de Productos Oficial.
              </CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Imagen</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Precio Actual</TableHead>
                  <TableHead>Precio Anterior (Tachado)</TableHead>
                  <TableHead>Ahorro</TableHead>
                  <TableHead>Inventario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="relative h-12 w-12 rounded overflow-hidden bg-secondary">
                        <Image src={product.image} alt={product.name} fill className="object-cover" />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {product.name}
                      {product.isOnSale && <Badge className="ml-2 bg-red-500/10 text-red-500 hover:bg-red-500/20">Sale</Badge>}
                    </TableCell>
                    <TableCell className="font-bold">${product.price}</TableCell>
                    <TableCell className="text-muted-foreground line-through">
                      {product.comparePrice ? `$${product.comparePrice}` : "-"}
                    </TableCell>
                    <TableCell>
                      {product.isOnSale ? (
                         <span className="text-green-500">-${(product.comparePrice - product.price).toFixed(2)}</span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>{product.inventoryQty} u.</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
