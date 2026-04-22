'use client'

import { useState, useEffect } from 'react'
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
  const [openItem, setOpenItem] = useState<string | undefined>(undefined)

  useEffect(() => {
    // Open the accordion section if a hash is present in the URL
    if (window.location.hash) {
      const hashItem = window.location.hash.substring(1)
      setOpenItem(hashItem)
    }
    
    // Listen for hash changes if user navigates within the same page
    const handleHashChange = () => {
      if (window.location.hash) {
        setOpenItem(window.location.hash.substring(1))
      }
    }
    
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const sections = [
    {
      id: 'gold',
      title_en: 'Gold: 10K vs 14K vs 18K',
      title_es: 'Oro: 10K vs 14K vs 18K',
      content_en: (
        <div className="space-y-4">
          <p><strong>Quick takeaways:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>10K:</strong> most durable feel, lighter gold color, typically more budget-friendly.</li>
            <li><strong>14K:</strong> the most common “sweet spot” for daily wear—good durability + richer color.</li>
            <li><strong>18K:</strong> richest gold color, higher gold content, can feel softer than lower karats.</li>
          </ul>
          <p><strong>How to choose:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Want everyday wear + durability → 10K or 14K</li>
            <li>Want best balance → 14K</li>
            <li>Want deepest gold look → 18K</li>
          </ul>
        </div>
      ),
      content_es: (
        <div className="space-y-4">
          <p><strong>Puntos clave:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>10K:</strong> la sensación más duradera, color de oro más claro, típicamente más accesible.</li>
            <li><strong>14K:</strong> el "punto ideal" más común para uso diario—buena durabilidad + color más rico.</li>
            <li><strong>18K:</strong> el color de oro más rico, mayor contenido de oro, puede sentirse más suave que quilatajes menores.</li>
          </ul>
          <p><strong>Cómo elegir:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Uso diario + durabilidad → 10K o 14K</li>
            <li>El mejor equilibrio → 14K</li>
            <li>El look de oro más profundo → 18K</li>
          </ul>
        </div>
      )
    },
    {
      id: 'chains',
      title_en: 'Chain Lengths & Layering',
      title_es: 'Largo de Cadenas y Capas',
      content_en: (
        <div className="space-y-4">
          <p><strong>Layering rule (easy mode):</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Pick lengths 2 inches apart (e.g., 18" + 20" or 20" + 22") so chains don’t stack on the same line.</li>
            <li>Mix one simple chain + one textured chain for contrast.</li>
          </ul>
          <p><strong>Pendant tip:</strong> If you’re wearing a pendant, choose a slightly longer chain so it sits cleanly and doesn’t collide with other layers.</p>
          <p><strong>How to measure at home:</strong> Use a string around your neck, mark your desired drop point, then measure it flat. (This matches how necklace length is typically visualized in sizing guides.)</p>
        </div>
      ),
      content_es: (
        <div className="space-y-4">
          <p><strong>Regla para usar en capas (fácil):</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Elige largos con 2 pulgadas de diferencia (ej. 18" + 20" ó 20" + 22") para que no se encimen.</li>
            <li>Mezcla una cadena simple + una texturizada para contraste.</li>
          </ul>
          <p><strong>Consejo para dijes:</strong> Si usas un dije, elige una cadena un poco más larga para que luzca bien y no choque con otras capas.</p>
          <p><strong>Cómo medir en casa:</strong> Usa un hilo alrededor de tu cuello, marca el punto de caída deseado y luego mídelo en plano.</p>
        </div>
      )
    },
    {
      id: 'bracelets',
      title_en: 'Bracelet Sizing (and stacking)',
      title_es: 'Tallas de Pulseras (y capas)',
      content_en: (
        <div className="space-y-4">
          <p><strong>How to measure:</strong> Use a flexible tape (or string). Wrap it around the thickest part of your wrist. If you plan to stack, measure where you’ll wear each bracelet.</p>
          <p><strong>Fit guide:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Snug fit:</strong> wrist size + ~0.5"</li>
            <li><strong>Comfort fit:</strong> wrist size + ~1.0"</li>
            <li><strong>Loose/stack fit:</strong> wrist size + ~1.5"</li>
          </ul>
          <p className="text-sm italic">(This is a practical rule-of-thumb; final feel depends on bracelet style.)</p>
          <p><strong>Wearing a watch?</strong> A slightly slimmer bracelet or a cleaner link style usually layers better next to a watch (less clashing).</p>
        </div>
      ),
      content_es: (
        <div className="space-y-4">
          <p><strong>Cómo medir:</strong> Usa una cinta flexible (o hilo). Envuélvelo alrededor de la parte más gruesa de tu muñeca. Si planeas usar varias, mide dónde usarás cada pulsera.</p>
          <p><strong>Guía de ajuste:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Ajustado:</strong> medida de muñeca + ~0.5"</li>
            <li><strong>Cómodo:</strong> medida de muñeca + ~1.0"</li>
            <li><strong>Holgado / capas:</strong> medida de muñeca + ~1.5"</li>
          </ul>
          <p className="text-sm italic">(Esta es una regla general; la sensación final depende del estilo de la pulsera).</p>
          <p><strong>¿Usas reloj?</strong> Una pulsera ligeramente más delgada o un estilo de eslabón más limpio suele combinar mejor junto a un reloj.</p>
        </div>
      )
    },
    {
      id: 'earrings',
      title_en: 'Earrings 101: Studs vs Hoops vs Huggies',
      title_es: 'Aretes 101: Studs, Hoops y Huggies',
      content_en: (
        <div className="space-y-4">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Stud earrings:</strong> Sit snugly on the earlobe (no drop), usually simple and super versatile.</li>
            <li><strong>Hoop earrings:</strong> Loop from the front of the earlobe to the back. Smaller hoops = understated, larger hoops = more dramatic.</li>
            <li><strong>Huggie earrings:</strong> “Mini hoops” that wrap closely around the earlobe—great if you like the hoop look with less snag risk.</li>
          </ul>
          <p><strong>Quick picks:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Everyday + low maintenance: studs or huggies</li>
            <li>More presence / dress up: hoops (medium/large)</li>
          </ul>
          <p><strong>Bonus:</strong> Hoops and huggies often use hinge backs that click shut—easy and secure.</p>
        </div>
      ),
      content_es: (
        <div className="space-y-4">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Aretes de botón (Studs):</strong> Se ajustan cómodamente en el lóbulo de la oreja (sin caída), generalmente simples y súper versátiles.</li>
            <li><strong>Aretes de argolla (Hoops):</strong> Hacen un lazo desde el frente del lóbulo hacia atrás. Pequeños = sutiles, grandes = dramáticos.</li>
            <li><strong>Aretes de clip (Huggies):</strong> Abrazan de cerca el lóbulo—excelentes para un look de argolla con menos riesgo de enredarse.</li>
          </ul>
          <p><strong>Opciones rápidas:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Día a día + bajo mantenimiento: aretes de botón o huggies</li>
            <li>Más presencia / elegancia: aretes de argolla (medianos/grandes)</li>
          </ul>
          <p><strong>Bono:</strong> Los aretes de argolla y huggies a menudo usan broches de bisagra que hacen "click"—fáciles y seguros.</p>
        </div>
      )
    },
    {
      id: 'diamonds',
      title_en: 'Lab-Grown vs Natural Diamonds',
      title_es: 'Diamantes de Laboratorio vs Naturales',
      content_en: (
        <div className="space-y-4">
          <p><strong>What’s the same:</strong> Lab-grown diamonds are essentially chemically and optically the same as natural diamonds.</p>
          <p><strong>What’s different:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Origin:</strong> natural is mined; lab-grown is created in a controlled environment.</li>
            <li><strong>Price/value:</strong> lab-grown typically offers more size/quality per dollar; natural often carries “rarity/story” appeal.</li>
          </ul>
          <p><strong>How to choose:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Want the best value for size/quality → lab-grown</li>
            <li>Want rarity / tradition → natural</li>
          </ul>
          <p><em>Either way: prioritize transparency, specs, and reputable sourcing.</em></p>
        </div>
      ),
      content_es: (
        <div className="space-y-4">
          <p><strong>Qué es igual:</strong> Los diamantes de laboratorio son esencialmente química y ópticamente iguales a los naturales.</p>
          <p><strong>Qué es diferente:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Origen:</strong> el natural es extraído; el de laboratorio es creado en un ambiente controlado.</li>
            <li><strong>Precio/valor:</strong> el de laboratorio típicamente ofrece más tamaño/calidad por tu dinero; el natural lleva el atractivo de "rareza/historia".</li>
          </ul>
          <p><strong>Cómo elegir:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Quieres el mejor valor en tamaño/calidad → laboratorio</li>
            <li>Quieres rareza / tradición → natural</li>
          </ul>
          <p><em>De cualquier modo: prioriza transparencia, especificaciones y fuentes confiables.</em></p>
        </div>
      )
    },
    {
      id: 'care',
      title_en: 'Jewelry Care: Keep pieces looking new',
      title_es: 'Cuidado de Joyas: Mantén todo como nuevo',
      content_en: (
        <div className="space-y-4">
          <p><strong>Safest cleaning method (most pieces):</strong> Warm water + mild dish soap + a soft brush is a widely recommended safe approach. Rinse in a glass of water instead of directly in the sink to reduce the risk of losing stones. Dry with a soft, lint-free cloth.</p>
          <p><strong>Diamonds:</strong> Can be cleaned with lint-free cloths, commercial jewelry cleaners, and household detergents. Extreme heat can damage diamonds.</p>
          <p><strong>Storage:</strong> Store pieces separately to avoid scratching and tangling (especially chains).</p>
          <p><strong>When to get a professional check:</strong> If a clasp feels loose, stones seem wobbly, or you wear a piece daily—get it inspected/cleaned professionally.</p>
        </div>
      ),
      content_es: (
        <div className="space-y-4">
          <p><strong>Método de limpieza más seguro (la mayoría de las piezas):</strong> Agua tibia + jabón suave + un cepillo de cerdas suaves. Enjuaga en un vaso de agua en vez del fregadero para evitar perder piedras. Seca con un paño suave sin pelusa.</p>
          <p><strong>Diamantes:</strong> Pueden limpiarse con paños sin pelusa o limpiadores comerciales. El calor extremo puede dañarlos.</p>
          <p><strong>Almacenamiento:</strong> Guarda las piezas por separado para evitar rayones y enredos (especialmente cadenas).</p>
          <p><strong>Revisión profesional:</strong> Si un broche se siente flojo, una piedra inestable o usas la pieza a diario, llévala a inspección y limpieza profesional.</p>
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
            <Accordion 
              type="single" 
              collapsible 
              className="w-full"
              value={openItem}
              onValueChange={(val) => {
                setOpenItem(val)
                // Optional: update URL hash when user clicks manually without scrolling to top
                if (val) {
                  window.history.pushState(null, '', `#${val}`)
                } else {
                  window.history.pushState(null, '', window.location.pathname)
                }
              }}
            >
              {sections.map((section) => (
                <AccordionItem key={section.id} value={section.id} id={section.id}>
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
