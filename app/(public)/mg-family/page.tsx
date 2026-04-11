'use client'

import { useState } from 'react'
import { Crown, Sparkles, Star, Package, Calendar, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandConfig } from '@/lib/config/brand'
import { useTranslation } from '@/i18n/locale-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { subscribeVIP } from '@/lib/actions/vip'
import { toast } from 'sonner'

const BENEFITS = [
  { icon: Star, title_en: 'Early Access', title_es: 'Acceso Anticipado', desc_en: 'Shop new collections before the public release.', desc_es: 'Compra nuevas colecciones antes del lanzamiento público.' },
  { icon: Crown, title_en: 'Priority White-Glove', title_es: 'Prioridad White-Glove', desc_en: 'Skip the line for custom orders and consultations.', desc_es: 'Salta la fila para pedidos personalizados y consultas.' },
  { icon: Sparkles, title_en: 'Exclusive Pieces', title_es: 'Piezas Exclusivas', desc_en: 'Access to limited-edition vault drops.', desc_es: 'Acceso a lanzamientos limitados exclusivos.' },
  { icon: Package, title_en: 'Shipping Perks', title_es: 'Beneficios de Envío', desc_en: 'Free insured overnight shipping with signature delivery.', desc_es: 'Envío asegurado gratis con entrega bajo firma.' },
  { icon: Calendar, title_en: 'Private Events', title_es: 'Eventos Privados', desc_en: '(Coming Soon) Invites to private viewing events.', desc_es: '(Próximamente) Invitaciones a eventos privados.' },
]

export default function MgFamilyPage() {
  const { locale } = useTranslation()

  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [ig, setIg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const formData = new FormData()
    formData.append("email", email)
    formData.append("phone", phone)
    formData.append("ig", ig)

    const result = await subscribeVIP(formData, locale)
    
    if (result.success) {
      setIsDone(true)
    } else {
      toast.error(locale === 'es' ? 'Error: ' + result.error : 'Error: ' + result.error)
    }
    
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-24 md:py-32 overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-background pointer-events-none" />
        {BrandConfig.PATTERN_ENABLED && (
          <div 
            className="absolute inset-0 pointer-events-none opacity-5"
            style={{ backgroundImage: 'url(/brand/pattern-mg.png)', backgroundSize: '200px 200px' }}
          />
        )}
        <div className="relative max-w-4xl mx-auto px-4 text-center z-10">
          <Crown className="w-12 h-12 mx-auto text-accent mb-6" />
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground mb-6">
            {locale === 'es' ? 'Familia M&G' : 'M&G Family'}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {locale === 'es' 
              ? 'El nivel más alto de lujo. Beneficios exclusivos, acceso anticipado y servicio de conserjería prioritario para nuestros clientes más distinguidos.' 
              : 'The pinnacle of luxury. Exclusive benefits, early access, and priority white-glove service for our most distinguished clients.'}
          </p>
        </div>
      </section>

      <section className="py-24 max-w-6xl mx-auto px-4">
        {/* How to join */}
        <div className="grid md:grid-cols-2 gap-8 mb-24">
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="font-serif text-2xl">{locale === 'es' ? 'Acceso Por Nivel' : 'Earned Status'}</CardTitle>
              <CardDescription className="text-base mt-2">
                {locale === 'es' ? 'Gana membresía de por vida automáticamente.' : 'Earn lifetime membership automatically.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-serif font-medium mb-2">$2,000</div>
              <p className="text-muted-foreground">{locale === 'es' ? 'Inversión total acumulada' : 'Lifetime spend threshold'}</p>
            </CardContent>
          </Card>
          
          <Card className={`${!BrandConfig.FEATURE_SUBSCRIPTION_ENABLED && 'opacity-70'} bg-card/50 border-border`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                  <CardTitle className="font-serif text-2xl">{locale === 'es' ? 'Suscripción Platino' : 'Platinum Subscription'}</CardTitle>
                  {!BrandConfig.FEATURE_SUBSCRIPTION_ENABLED && (
                      <span className="text-xs bg-secondary px-3 py-1 rounded-full text-muted-foreground uppercase tracking-wider font-medium">
                          {locale === 'es' ? 'Próximamente' : 'Coming Soon'}
                      </span>
                  )}
              </div>
              <CardDescription className="text-base mt-2">
                {locale === 'es' ? 'Acceso inmediato a todos los beneficios.' : 'Immediate access to all benefits.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-serif font-medium mb-2">$15<span className="text-xl text-muted-foreground">/mo</span></div>
              <p className="text-muted-foreground">{locale === 'es' ? 'Facturado anualmente' : 'Billed annually'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Benefits & Waitlist */}
        <div className="grid lg:grid-cols-2 gap-16">
          <div>
            <h2 className="text-3xl font-serif font-bold mb-8">
                {locale === 'es' ? 'Beneficios Exclusivos' : 'Exclusive Benefits'}
            </h2>
            <div className="space-y-8">
              {BENEFITS.map((b, i) => (
                <div key={i} className="flex gap-4">
                  <div className="shrink-0 rounded-full bg-accent/10 p-3 text-accent h-min">
                    <b.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-1 font-serif">{locale === 'es' ? b.title_es : b.title_en}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {locale === 'es' ? b.desc_es : b.desc_en}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Card className="border-accent/20 shadow-lg shadow-accent/5 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-2xl font-serif">
                   {locale === 'es' ? 'Únete a la lista de espera VIP' : 'Join the VIP Waitlist'}
                </CardTitle>
                <CardDescription>
                   {locale === 'es' ? 'Regístrate para ser notificado cuando abramos más cupos de membresía.' : 'Register to be notified when we open more membership slots.'}
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleWaitlist}>
                  <CardContent className="space-y-4">
                    {isDone ? (
                      <div className="py-12 text-center text-primary flex flex-col items-center">
                          <CheckCircle2 className="h-12 w-12 mb-4" />
                          <p className="text-lg font-medium">{locale === 'es' ? '¡Estás en la lista!' : 'You are on the list!'}</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="bg-background"/>
                        </div>
                        <div className="space-y-2">
                            <Label>{locale === 'es' ? 'Teléfono (Opcional)' : 'Phone (Optional)'}</Label>
                            <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 8900" className="bg-background"/>
                        </div>
                        <div className="space-y-2">
                            <Label>{locale === 'es' ? 'Instagram @usuario (Opcional)' : 'Instagram @handle (Optional)'}</Label>
                            <Input value={ig} onChange={e => setIg(e.target.value)} placeholder="@mgjewelry" className="bg-background"/>
                        </div>
                      </>
                    )}
                  </CardContent>
                  {!isDone && (
                      <CardFooter>
                        <Button className="w-full h-12 text-base" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (locale === 'es' ? 'Unirse a la lista' : 'Join Waitlist')}
                        </Button>
                      </CardFooter>
                  )}
              </form>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
