"use client"

import { useTranslation } from "@/i18n/locale-context"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function FAQPage() {
  const { locale } = useTranslation()

  const faqs = [
    {
      q_en: "How long does shipping take?",
      a_en: "In-stock orders are processed within 1–7 business days. Made-to-order items can take 2–8 weeks. Exact estimates are shown on the product page.",
      q_es: "¿Cuánto tiempo tarda el envío?",
      a_es: "Los pedidos en stock se procesan en 1–7 días laborables. Los artículos hechos a medida pueden tardar 2–8 semanas. Las estimaciones exactas se muestran en la página del producto."
    },
    {
      q_en: "Do you offer insured shipping or signature delivery?",
      a_en: "Yes, all shipments include tracking. For higher-value orders (over $650), we require signature confirmation and fully insure the package for security.",
      q_es: "¿Ofrecen envío asegurado o entrega con firma?",
      a_es: "Sí, todos los envíos incluyen número de rastreo. Para pedidos de alto valor (más de $650), requerimos confirmación por firma y aseguramos completamente el paquete."
    },
    {
      q_en: "What is your return window?",
      a_en: "We accept returns within 14 days of delivery for eligible items.",
      q_es: "¿Cuál es su ventana de devolución?",
      a_es: "Aceptamos devoluciones dentro de los 14 días posteriores a la entrega para los artículos elegibles."
    },
    {
      q_en: "What items are not returnable?",
      a_en: "Custom, engraved, or resized items, as well as final sale items, are non-returnable.",
      q_es: "¿Qué artículos no se pueden devolver?",
      a_es: "Los artículos personalizados, grabados o redimensionados, así como los artículos de venta final, no son retornables."
    },
    {
      q_en: "When do refunds get issued?",
      a_en: "Approved refunds are issued to the original payment method immediately after we receive and inspect the returned item.",
      q_es: "¿Cuándo se emiten los reembolsos?",
      a_es: "Los reembolsos aprobados se emiten al método de pago original inmediatamente después de que recibimos e inspeccionamos el artículo devuelto."
    },
    {
      q_en: "What does your warranty cover?",
      a_en: "We cover manufacturing defects for 30 days from delivery. Normal wear and tear, accidental damage, chemical exposure, or third-party modifications are not covered.",
      q_es: "¿Qué cubre la garantía?",
      a_es: "Cubrimos defectos de fabricación por 30 días desde la entrega. No cubre el desgaste normal, daños accidentales, exposición a químicos o modificaciones de terceros."
    },
    {
      q_en: "How do I know my chain length?",
      a_en: "We recommend using a string to map out where you want the pendant to sit on your chest, then measure the string. Check our Education Center for visual guides.",
      q_es: "¿Cómo sé la longitud de mi cadena?",
      a_es: "Recomendamos usar una cuerda para trazar dónde quieres que quede el colgante, luego mide la cuerda. Consulta nuestro Centro de Educación para guías visuales."
    },
    {
      q_en: "How do I measure my wrist?",
      a_en: "Wrap a flexible measuring tape flush against your wrist. Add half an inch for a comfortable fit.",
      q_es: "¿Cómo mido mi muñeca?",
      a_es: "Envuelve una cinta métrica flexible ajustada contra tu muñeca. Añade media pulgada para un ajuste cómodo."
    },
    {
      q_en: "Lab-grown vs natural diamonds?",
      a_en: "Both are chemically and optically identical real diamonds. Natural diamonds are mined from the earth, while lab-grown diamonds are created in controlled environments and offer greater value.",
      q_es: "¿Diamantes creados en laboratorio vs naturales?",
      a_es: "Ambos son diamantes reales química y ópticamente idénticos. Los naturales se extraen de la tierra, mientras que los creados en laboratorio se crean en entornos controlados ofreciendo mayor valor."
    },
    {
      q_en: "What is White-Glove and how does it work?",
      a_en: "White-Glove is our bespoke consultation service. Take a short 3-step quiz to tell us what you're looking for, and our experts will manually curate the perfect pieces and guide your purchase entirely via WhatsApp or Instagram.",
      q_es: "¿Qué es White-Glove y cómo funciona?",
      a_es: "White-Glove es nuestro servicio de consulta a medida. Realiza un breve cuestionario de 3 pasos y nuestros expertos seleccionarán manualmente las piezas perfectas y te guiarán totalmente vía WhatsApp o Instagram."
    }
  ]

  return (
    <div className="min-h-screen py-24 px-4 bg-background">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-serif font-bold mb-4 text-center">
          {locale === 'es' ? 'Preguntas Frecuentes' : 'Frequently Asked Questions'}
        </h1>
        <p className="text-muted-foreground text-center mb-12">
          {locale === 'es' ? 'Encuentra respuestas a las preguntas comunes sobre M&G Jewelry.' : 'Find answers to common questions about M&G Jewelry.'}
        </p>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border-border/50">
              <AccordionTrigger className="text-left font-serif text-lg hover:no-underline hover:text-accent">
                {locale === 'es' ? faq.q_es : faq.q_en}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {locale === 'es' ? faq.a_es : faq.a_en}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  )
}
