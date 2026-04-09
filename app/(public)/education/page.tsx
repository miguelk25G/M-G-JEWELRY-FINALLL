'use client'

import { BookOpen, Sparkles } from 'lucide-react'
import { useTranslation } from '@/i18n/locale-context'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function EducationPage() {
  const { locale } = useTranslation()

  const sections = [
    {
      id: 'gold',
      title_en: 'Gold: 10K vs 14K vs 18K',
      title_es: 'Oro: 10K vs 14K vs 18K',
      content_en: (
        <div className="space-y-4">
          <p><strong>10K Gold (41.7% Pure):</strong> The most durable option. Best for heavy daily wear, but has a paler yellow color. Great for solid, chunky rings.</p>
          <p><strong>14K Gold (58.3% Pure):</strong> The perfect balance of durability and vibrant color. This is the industry standard for fine jewelry and engagement rings.</p>
          <p><strong>18K Gold (75.0% Pure):</strong> Richer, warmer yellow tone. Softer and more prone to scratching, making it ideal for special occasion pieces or earrings.</p>
        </div>
      ),
      content_es: (
        <div className="space-y-4">
          <p><strong>Oro de 10K (41.7% Puro):</strong> La opción más resistente. Ideal para uso diario rudo, aunque su tono amarillo es más pálido.</p>
          <p><strong>Oro de 14K (58.3% Puro):</strong> El equilibrio perfecto entre durabilidad y color vibrante. Es el estándar de la industria para joyería fina.</p>
          <p><strong>Oro de 18K (75.0% Puro):</strong> Un tono amarillo más rico y cálido. Es más suave y propenso a rayones, ideal para piezas de ocasión especial o aretes.</p>
        </div>
      )
    },
    {
      id: 'chains',
      title_en: 'Chain Lengths & Layering',
      title_es: 'Largo de Cadenas y Capas',
      content_en: (
        <div className="space-y-4">
          <p><strong>18" (45 cm):</strong> Sits on the collarbone. Perfect for small pendants and everyday wear.</p>
          <p><strong>20" (50 cm):</strong> Falls a few inches below the collarbone. The most common standard length for men and women.</p>
          <p><strong>22" (55 cm):</strong> Hangs at or just above the top of the chest. Excellent for layering with an 18" or 20" chain.</p>
          <p><strong>24" (60 cm):</strong> Falls at the center of the chest. Great for larger pendants and statement cross chains.</p>
        </div>
      ),
      content_es: (
        <div className="space-y-4">
          <p><strong>18" (45 cm):</strong> Descansa en la clavícula. Perfecto para dijes pequeños y uso diario.</p>
          <p><strong>20" (50 cm):</strong> Cae unos centímetros debajo de la clavícula. El tamaño estándar más común.</p>
          <p><strong>22" (55 cm):</strong> Cae justo arriba del pecho. Excelente para usar en capas con una cadena de 18" o 20".</p>
          <p><strong>24" (60 cm):</strong> Cae en el centro del pecho. Ideal para dijes grandes y cruces llamativas.</p>
        </div>
      )
    },
    {
      id: 'bracelets',
      title_en: 'Bracelet Sizing',
      title_es: 'Tallas de Pulseras',
      content_en: (
        <div className="space-y-4">
          <p>A standard women's bracelet is 7 to 7.5 inches, while a standard men's bracelet is 8 inches.</p>
          <p><strong>How to measure:</strong> Wrap a flexible measuring tape tightly around your wrist, just below the wrist bone. Add 0.5 inches for a snug fit or 1 inch for a loose, comfortable fit.</p>
        </div>
      ),
      content_es: (
        <div className="space-y-4">
          <p>La pulsera estándar para mujer es de 7 a 7.5 pulgadas. Para hombre, el estándar es de 8 pulgadas.</p>
          <p><strong>Cómo medir:</strong> Envuelve una cinta métrica flexible alrededor de tu muñeca, justo debajo del hueso. Agrega 0.5 pulgadas para un ajuste exacto o 1 pulgada para más comodidad.</p>
        </div>
      )
    },
    {
      id: 'earrings',
      title_en: 'Earrings 101',
      title_es: 'Guía de Aretes',
      content_en: (
        <div className="space-y-4">
          <p><strong>Studs:</strong> Simple, elegant, and positioned directly on the earlobe. The ultimate everyday staple.</p>
          <p><strong>Hoops:</strong> Circular loops that come in various diameters. Small hoops (huggies) sit close to the ear, while large hoops make a statement.</p>
          <p><strong>Huggies:</strong> Tiny hoops that "hug" the earlobe. Excellent for second or third piercings.</p>
        </div>
      ),
      content_es: (
        <div className="space-y-4">
          <p><strong>Broqueles (Studs):</strong> Simples y elegantes. El accesorio esencial para todos los días.</p>
          <p><strong>Arracadas (Hoops):</strong> Aros circulares en varios tamaños. Las arracadas grandes son perfectas para destacar.</p>
          <p><strong>Huggies (Arracadas pequeñas):</strong> Arracadas diminutas que "abrazan" el lóbulo. Excelentes para perforaciones secundarias.</p>
        </div>
      )
    },
    {
      id: 'diamonds',
      title_en: 'Lab vs Natural Diamonds',
      title_es: 'Diamantes Naturales vs Laboratorio',
      content_en: (
        <div className="space-y-4">
          <p><strong>Natural Diamonds:</strong> Formed deep within the Earth over billions of years. Valued for their rarity and historical significance. They hold long-term value exceptionally well.</p>
          <p><strong>Lab-Grown Diamonds:</strong> Optically, chemically, and physically identical to natural diamonds but created in a laboratory in weeks. They offer excellent value, allowing you to get a larger stone for the same budget.</p>
        </div>
      ),
      content_es: (
        <div className="space-y-4">
          <p><strong>Diamantes Naturales:</strong> Formados en las profundidades de la Tierra durante miles de millones de años. Valiosos por su rareza y significado histórico.</p>
          <p><strong>Diamantes de Laboratorio:</strong> Óptica, química y físicamente idénticos a los naturales, pero creados en laboratorio. Ofrecen un valor excelente, permitiendo obtener una piedra más grande por el mismo presupuesto.</p>
        </div>
      )
    },
    {
      id: 'care',
      title_en: 'Jewelry Care & Cleaning',
      title_es: 'Cuidado y Limpieza',
      content_en: (
        <div className="space-y-4">
          <p><strong>Daily Care:</strong> Remove jewelry before exercising, swimming (chlorine/saltwater), or applying lotions and perfumes.</p>
          <p><strong>Cleaning At Home:</strong> Soak your gold and diamond jewelry in warm water with a few drops of mild dish soap. Gently scrub with a very soft toothbrush, then rinse and pat dry.</p>
          <p><strong>Storage:</strong> Store pieces individually in a soft pouch or lined jewelry box to prevent chains from tangling and diamonds from scratching other stones.</p>
        </div>
      ),
      content_es: (
        <div className="space-y-4">
          <p><strong>Cuidado Diario:</strong> Quítate las joyas antes de hacer ejercicio, nadar (cloro/agua salada) o aplicar lociones y perfumes.</p>
          <p><strong>Limpieza en Casa:</strong> Remoja tu joyería en agua tibia con unas gotas de jabón suave. Frota suavemente con un cepillo de dientes muy suave, enjuaga y seca.</p>
          <p><strong>Almacenamiento:</strong> Guarda las piezas individualmente en una funda suave para evitar que las cadenas se enreden y los diamantes rayen otros metales.</p>
        </div>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-secondary/20 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-6 text-accent" />
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">
            {locale === 'es' ? 'Centro de Educación' : 'Education Hub'}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {locale === 'es'
              ? 'Aprende a elegir, medir y cuidar tus joyas. Usa esta guía para hacer la mejor selección.'
              : 'Learn how to choose, size, and care for your jewelry. Use this guide to make the perfect selection.'}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>{locale === 'es' ? 'Temas de Joyería' : 'Jewelry Topics'}</CardTitle>
            <CardDescription>{locale === 'es' ? 'Haz clic en un tema para expandir.' : 'Click on a topic to expand.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {sections.map((section) => (
                <AccordionItem key={section.id} value={section.id}>
                  <AccordionTrigger className="text-lg font-serif hover:text-accent transition-colors">
                    <span className="flex items-center gap-3">
                        <Sparkles className="h-4 w-4 text-accent/50" />
                        {locale === 'es' ? section.title_es : section.title_en}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground leading-relaxed pt-2 pb-6 px-1">
                    {locale === 'es' ? section.content_es : section.content_en}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
