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
import { Edit, Trash2, X } from "lucide-react"
import { createCategory, deleteCategory, toggleCategoryStatus, updateCategory } from "@/lib/actions/admin-categories"

export function CategoriesClient({ categories }: { categories: any[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    
    const name = formData.get("name") as string
    const slug = formData.get("slug") as string

    if (!name || !slug) {
      toast.error("Nombre y Segmento Link son obligatorios.")
      setIsSubmitting(false)
      return
    }

    if (editingCategory) {
      const res = await updateCategory(editingCategory.id, formData)
      if (res.success) {
        toast.success("Categoría actualizada.")
        setEditingCategory(null)
        ;(e.target as HTMLFormElement).reset()
      } else {
        toast.error(res.error)
      }
    } else {
      const res = await createCategory(formData)
      if (res.success) {
        toast.success("Categoría creada satisfactoriamente.")
        ;(e.target as HTMLFormElement).reset()
      } else {
        toast.error(res.error)
      }
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{editingCategory ? "Editar Colección" : "Nueva Categoría"}</CardTitle>
                <CardDescription>{editingCategory ? "Modificando una existente." : "Crea un nuevo panel para clasificar joyas."}</CardDescription>
              </div>
              {editingCategory && (
                <Button variant="ghost" size="icon" onClick={() => setEditingCategory(null)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4" key={editingCategory ? editingCategory.id : "new"}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre (Inglés)</Label>
                  <Input id="name" name="name" defaultValue={editingCategory?.name} placeholder="Ej. Wedding Rings" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nameEs">Nombre (Español)</Label>
                  <Input id="nameEs" name="nameEs" defaultValue={editingCategory?.nameEs} placeholder="Ej. Anillos de Boda" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Segmento URL (slug)</Label>
                <Input id="slug" name="slug" defaultValue={editingCategory?.slug} placeholder="Ej. anillos-boda" pattern="^[a-z0-9-]+$" title="Solo minusculas y guiones sin espacios" required />
                <p className="text-xs text-muted-foreground">Debe ser minúsculas y sin espacios. Ej: oro-18k</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">Banner / Imagen Principal (Foto Real)</Label>
                <Input id="image" name="image" type="file" accept="image/*" className="cursor-pointer" />
                {editingCategory?.image && (
                   <p className="text-xs text-muted-foreground mt-1">Ya tiene un archivo. Sube otro para reemplazarlo.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción (Opcional - Inglés)</Label>
                <Textarea id="description" name="description" defaultValue={editingCategory?.description} rows={3} placeholder="Discover our selection..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descriptionEs">Descripción (Opcional - Español)</Label>
                <Textarea id="descriptionEs" name="descriptionEs" defaultValue={editingCategory?.descriptionEs} rows={3} placeholder="Descubre nuestra selección..." />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : (editingCategory ? "Guardar Cambios" : "Añadir Colección")}
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
                  <TableCell className="font-bold">
                    {cat.name}
                    <div className="text-xs font-normal text-muted-foreground">{cat.nameEs}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">/collections/{cat.slug}</TableCell>
                  <TableCell>{cat.productCount}</TableCell>
                  <TableCell>
                    <Switch checked={cat.isActive} onCheckedChange={() => handleToggle(cat.id, cat.isActive)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="hover:bg-accent" onClick={() => setEditingCategory(cat)}>
                      <Edit className="h-4 w-4" />
                    </Button>
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
