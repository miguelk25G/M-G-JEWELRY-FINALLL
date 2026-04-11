"use client"

import { useState } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Trash2 } from "lucide-react"
import { createCategory, deleteCategory, toggleCategoryStatus } from "@/lib/actions/admin-categories"

export function CategoriesClient({ categories }: { categories: any[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    
    const name = formData.get("name") as string
    const slug = formData.get("slug") as string
    const description = formData.get("description") as string
    const image = formData.get("image") as string // URL temporaria

    if (!name || !slug) {
      toast.error("Nombre y Segmento Link son obligatorios.")
      setIsSubmitting(false)
      return
    }

    const res = await createCategory({ name, slug, description, image })
    if (res.success) {
      toast.success("Categoría creada satisfactoriamente.")
      ;(e.target as HTMLFormElement).reset()
    } else {
      toast.error(res.error)
    }
    
    setIsSubmitting(false)
  }

  const handleDelete = async (id: string, count: number) => {
    if (count > 0) {
      alert("No puedes borrar una categoría que tiene productos asigandos. Reasigna los productos primero.")
      return
    }
    if (!confirm("¿Seguro que deseas eliminar esta categoría permanentemente?")) return
    
    const toastId = toast.loading("Eliminando...")
    const res = await deleteCategory(id)
    if (res.success) {
      toast.success("Categoría eliminada", { id: toastId })
    } else {
      toast.error(res.error, { id: toastId })
    }
  }

  const handleToggle = async (id: string, current: boolean) => {
    const res = await toggleCategoryStatus(id, !current)
    if (!res.success) toast.error("Error cambiando estado.")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Categorías y Colecciones</h1>
        <p className="text-muted-foreground">Administra las secciones de tu tienda (Ej. Anillos, Cadenas).</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-border bg-card h-fit">
          <CardHeader>
            <CardTitle>Nueva Categoría</CardTitle>
            <CardDescription>Crea un nuevo panel para clasificar joyas.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" name="name" placeholder="Ej. Anillos de Boda" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Segmento URL (slug)</Label>
                <Input id="slug" name="slug" placeholder="Ej. anillos-boda" pattern="^[a-z0-9-]+$" title="Solo minusculas y guiones" required />
                <p className="text-xs text-muted-foreground">Debe ser minúsculas y sin espacios. Ej: oro-18k</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">Banner / Imagen Principal (URL)</Label>
                <Input id="image" name="image" placeholder="https://..." type="url" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción (Opcional)</Label>
                <Textarea id="description" name="description" rows={3} placeholder="Descubre nuestra selección..." />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creando..." : "Añadir Colección"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Imagen</TableHead>
                <TableHead>Colección</TableHead>
                <TableHead>Link</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Visible</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aún no haz creado colecciones.
                  </TableCell>
                </TableRow>
              ) : null}
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>
                    <div className="relative h-10 w-10 overflow-hidden rounded bg-secondary">
                      <Image src={cat.image} alt={cat.name} fill className="object-cover" />
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">{cat.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">/collections/{cat.slug}</TableCell>
                  <TableCell>{cat.productCount}</TableCell>
                  <TableCell>
                    <Switch checked={cat.isActive} onCheckedChange={() => handleToggle(cat.id, cat.isActive)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(cat.id, cat.productCount)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  )
}
