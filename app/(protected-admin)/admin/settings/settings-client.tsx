"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateSiteSettings } from "@/lib/actions/admin-settings"

export function SettingsClient({ settings }: { settings: any }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    const toastId = toast.loading("Guardando configuración...")
    
    try {
      const formData = new FormData(e.currentTarget)
      const res = await updateSiteSettings(formData)
      if (res.success) {
        toast.success("Configuración actualizada correctamente.", { id: toastId })
      } else {
        toast.error(`Error: ${res.error}`, { id: toastId })
      }
    } catch (e) {
      toast.error("Ocurrió un error.", { id: toastId })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Configuración de la Tienda</h1>
        <p className="text-muted-foreground">Variables globales del sitio. Cámbialas aquí sin necesidad de programar.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Comunicaciones</CardTitle>
            <CardDescription>Números y correos donde te contactarán tus clientes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="whatsappNumber">Número de WhatsApp (Con Código, ej. +1512...)</Label>
                <Input id="whatsappNumber" name="whatsappNumber" defaultValue={settings.whatsappNumber || ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Correo de Contacto Oficial</Label>
                <Input id="contactEmail" name="contactEmail" type="email" defaultValue={settings.contactEmail || ""} required />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="instagramUrl">URL de Instagram (Opcional)</Label>
                <Input id="instagramUrl" name="instagramUrl" defaultValue={settings.instagramUrl || "https://instagram.com/"} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebookUrl">URL de Facebook (Opcional)</Label>
                <Input id="facebookUrl" name="facebookUrl" defaultValue={settings.facebookUrl || ""} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Identidad Visual</CardTitle>
            <CardDescription>Textos que aparecen en la página principal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">Nombre de la Tienda</Label>
                <Input id="siteName" name="siteName" defaultValue={settings.siteName || "M&G Jewelry"} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagline">Eslogan / Tagline</Label>
                <Input id="tagline" name="tagline" defaultValue={settings.tagline || ""} placeholder="Luxury Diamond Jewelry" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="returnPolicy">Texto Legal: Políticas de Retorno y Garantías</Label>
                <Textarea 
                  id="returnPolicy" 
                  name="returnPolicy" 
                  rows={4} 
                  defaultValue={settings.returnPolicy || ""} 
                  placeholder="Escribe la política de devoluciones que aplica a todas las compras..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={isLoading} size="lg" className="px-8">
          {isLoading ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </form>
    </div>
  )
}
