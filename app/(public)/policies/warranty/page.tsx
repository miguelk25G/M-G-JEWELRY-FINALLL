"use client"

import { useTranslation } from "@/i18n/locale-context"

export default function WarrantyPolicyPage() {
  const { locale } = useTranslation()

  return (
    <div className="min-h-screen py-24 px-4 bg-background">
      <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h1 className="text-4xl font-serif font-bold mb-8">
          {locale === 'es' ? 'Política de Garantía' : 'Warranty Policy'}
        </h1>

        <div className="space-y-8 text-muted-foreground">
          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">
              {locale === 'es' ? 'Cobertura' : 'Coverage'}
            </h2>
            <p>
              {locale === 'es' 
                ? 'Cubrimos todos los defectos de fabricación por 30 días a partir del momento de la entrega.'
                : 'We cover manufacturing defects for 30 days from delivery.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">
              {locale === 'es' ? 'Qué No Incluye la Cobertura' : 'Not Covered'}
            </h2>
            <p>
              {locale === 'es' 
                ? 'Nuestra garantía no cubre el desgaste natural por uso normal (desgaste de color), daños accidentales, mal uso de la joyería, exposición a químicos o ácidos, ni reparaciones o modificaciones realizadas por joyeros de terceros.'
                : 'Normal wear and tear, accidental damage, misuse, chemical exposure, and any repairs/modifications done by third parties are not covered.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-foreground mb-3">
              {locale === 'es' ? 'Si hay un problema con tu joyería' : 'If there’s an issue'}
            </h2>
            <p>
              {locale === 'es' 
                ? 'Si necesitas ayuda, contáctanos inmediatamente con tu número de orden y provee fotos claras o un video del defecto. Revisaremos el caso minuciosamente y te ofreceremos la mejor opción posible: reparación, reemplazo, o crédito en tienda, dependiendo del caso.'
                : 'Contact us with your order number and clear photos/video. We’ll review and offer the best option: repair, replacement, or store credit depending on the case.'}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
