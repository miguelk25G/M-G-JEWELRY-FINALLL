"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export function LeadsClient({ vips, contacts }: { vips: any[], contacts: any[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">CRM - Leads & Prospectos</h1>
        <p className="text-muted-foreground">Analiza la base de datos de usuarios que te han contactado o se unieron a la lista VIP.</p>
      </div>

      <Tabs defaultValue="vip">
        <TabsList>
          <TabsTrigger value="vip">VIP Waitlist ({vips.length})</TabsTrigger>
          <TabsTrigger value="contact">Solicitudes de Contacto ({contacts.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="vip" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Espera VIP</CardTitle>
              <CardDescription>Usuarios registrados formalmente pidiendo acceso al servicio White-Glove exclusivo.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Instagram ID</TableHead>
                    <TableHead>Idioma</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vips.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-4">No hay registros VIP aún.</TableCell></TableRow>
                  ) : null}
                  {vips.map((vip) => (
                    <TableRow key={vip.id}>
                      <TableCell className="font-medium text-primary">{vip.email}</TableCell>
                      <TableCell>{vip.phone}</TableCell>
                      <TableCell>{vip.ig !== "-" ? `@${vip.ig}` : "-"}</TableCell>
                      <TableCell className="uppercase">{vip.lang}</TableCell>
                      <TableCell className="text-muted-foreground">{vip.date}</TableCell>
                      <TableCell className="text-right">
                        {vip.phone !== "-" && (
                           <a target="_blank" href={`https://wa.me/${vip.phone.replace(/\D/g, '')}?text=${encodeURIComponent("Hola! Te saludo del equipo de M&G Jewelry. Recibimos tu aplicación para la lista VIP White-Glove y te queremos dar la bienvenida Oficial.")}`}>
                             <Badge className="bg-green-500 hover:bg-green-600 cursor-pointer">WhatsApp</Badge>
                           </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Mensajes Generales y Citas</CardTitle>
              <CardDescription>Usuarios que llenaron el test de estilo o los formularios públicos.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Asunto</TableHead>
                    <TableHead>Detalles</TableHead>
                    <TableHead>Presupuesto</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-4">No hay mensajes aún.</TableCell></TableRow>
                  ) : null}
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell>
                        <p className="text-sm">{contact.email}</p>
                        {contact.phone !== "-" && <p className="text-xs text-muted-foreground">{contact.phone}</p>}
                      </TableCell>
                      <TableCell className="capitalize">{contact.reason}</TableCell>
                      <TableCell>
                        <p className="text-sm truncate max-w-xs" title={contact.message}>{contact.message}</p>
                        {contact.style !== "-" && <Badge variant="secondary" className="mt-1">{contact.style}</Badge>}
                      </TableCell>
                      <TableCell>{contact.budget}</TableCell>
                      <TableCell>
                        <Badge className={contact.status === "new" ? "bg-blue-500/10 text-blue-500" : "bg-gray-500/10 text-gray-500"}>
                          {contact.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
