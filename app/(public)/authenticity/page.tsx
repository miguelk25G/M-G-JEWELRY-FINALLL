'use client'

import { Shield, Sparkles, CheckCircle, Search, Award } from 'lucide-react'
import { useTranslation } from '@/i18n/locale-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const AUTHENTICITY_ITEMS = [
  {
    icon: Shield,
    title_en: 'Authenticity Promise',
    title_es: 'Promesa de Autenticidad',
    desc_en: 'We guarantee that every diamond, gemstone, and metal we use is 100% authentic, ethically sourced, and exactly as described.',
    desc_es: 'Garantizamos que cada diamante, gema y metal que utilizamos es 100% auténtico, de origen ético y exactamente como se describe.'
  },
  {
    icon: Search,
    title_en: 'Materials & Disclosure',
    title_es: 'Materiales y Divulgación',
    desc_en: 'We use solid 10k, 14k, and 18k gold. We are fully transparent about the origin of our stones, offering both Natural and Lab-Grown options clearly labeled.',
    desc_es: 'Utilizamos oro macizo de 10k, 14k y 18k. Somos totalmente transparentes sobre el origen de nuestras piedras, ofreciendo opciones Naturales y de Laboratorio claramente etiquetadas.'
  },
  {
    icon: Award,
    title_en: 'What You Receive',
    title_es: 'Lo Que Recibes',
    desc_en: 'Your piece arrives in premium packaging with an official M&G Jewelry receipt, detailed specifications, and when applicable, an independent gemological certificate.',
    desc_es: 'Tu joya llega en un empaque premium con un recibo oficial de M&G Jewelry, especificaciones detalladas y, cuando corresponda, un certificado gemológico independiente.'
  },
  {
    icon: CheckCircle,
    title_en: 'Quality Checks',
    title_es: 'Controles de Calidad',
    desc_en: 'Before shipping, every item undergoes a rigorous 5-point quality inspection by our master jewelers to ensure prong security, polish perfection, and structural integrity.',
    desc_es: 'Antes del envío, cada artículo se somete a una rigurosa inspección de calidad de 5 puntos por nuestros maestros joyeros para garantizar la seguridad de los engastes, el pulido y la integridad.'
  },
  {
    icon: Sparkles,
    title_en: 'Care Basics',
    title_es: 'Cuidado Básico',
    desc_en: 'Keep your jewelry away from harsh chemicals. Clean gently with warm water, mild soap, and a soft brush. Store separately to prevent scratching.',
    desc_es: 'Mantén tus joyas alejadas de productos químicos agresivos. Limpia suavemente con agua tibia, jabón suave y un cepillo suave. Guarda por separado.'
  }
]

export default function AuthenticityPage() {
  const { locale } = useTranslation()

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-secondary/30 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Shield className="w-12 h-12 mx-auto mb-6 text-accent" />
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">
            {locale === 'es' ? 'Autenticidad Garantizada' : 'Guaranteed Authenticity'}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {locale === 'es'
              ? 'Nuestra reputación se basa en la confianza, la transparencia y la calidad inquebrantable. Descubre nuestro compromiso con la excelencia.'
              : 'Our reputation is built on trust, transparency, and unwavering quality. Discover our commitment to excellence.'}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16 space-y-12">
        {AUTHENTICITY_ITEMS.map((item, idx) => (
          <Card key={idx} className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="bg-accent/10 p-3 rounded-full text-accent shrink-0">
                <item.icon className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-serif">
                {locale === 'es' ? item.title_es : item.title_en}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-lg leading-relaxed pt-2 ml-16">
                {locale === 'es' ? item.desc_es : item.desc_en}
              </p>
            </CardContent>
          </Card>
        ))}

        <div className="mt-16 text-center text-sm text-muted-foreground bg-secondary/20 p-6 rounded-lg max-w-3xl mx-auto">
          {locale === 'es' 
            ? '*Nota: La emisión de certificados gemológicos independientes depende del tamaño, peso en quilates y tipo de piedra seleccionada. No todas las joyas incluyen un certificado TERCERO, pero TODAS las piezas están garantizadas por M&G Jewelry.'
            : '*Disclaimer: The issuance of independent gemological certificates depends on the size, carat weight, and type of stone selected. Not all jewelry includes a THIRD-PARTY certificate, but ALL pieces are fully guaranteed and authenticated by M&G Jewelry.'}
        </div>
      </div>
    </div>
  )
}
