'use client'

import { useState } from 'react'
import { Check, ClipboardCopy, Instagram, MessageCircle, Phone, Mail, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { BrandConfig } from '@/lib/config/brand'
import { useTranslation } from '@/i18n/locale-context'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Image from 'next/image'

const QUESTIONS = [
  { id: 'q1', type: 'radio', options: ['Me', 'Gift'], label_en: 'Who is it for?', label_es: '¿Para quién es?' },
  { id: 'q2', type: 'radio', options: ['<$150', '$150–300', '$300–600', '$600–1,000', '$1,000+'], label_en: 'Budget range', label_es: 'Rango de presupuesto' },
  { id: 'q3', type: 'radio', options: ['Chain', 'Bracelet', 'Earrings', 'Set'], label_en: 'What are you looking for?', label_es: '¿Qué estás buscando?' },
  { id: 'q4', type: 'radio', options: ['Clean Minimal', 'Classic', 'Street-Lux', 'Statement'], label_en: 'Style vibe', label_es: 'Estilo' },
  { id: 'q5', type: 'radio', options: ['Yellow', 'White', 'Rose', 'Not sure'], label_en: 'Metal preference', label_es: 'Preferencia de metal' },
  { id: 'q6', type: 'radio', options: ['Daily', 'Occasions', 'Gift'], label_en: 'Usage', label_es: 'Uso' },
  { id: 'q7', type: 'radio', options: ['Yes', 'No'], label_en: 'Do you wear a watch?', label_es: '¿Usas reloj?' },
  { id: 'q8', type: 'radio', options: ['18/20', '22/24', '6-6.5 (Wrist)', '7-7.5 (Wrist)', 'Not sure'], label_en: 'Sizing (Chain or Wrist)', label_es: 'Tamaño (Cadena o Muñeca)' },
  { id: 'q9', type: 'radio', options: ['Within 1 week', '2 weeks', '1 month', 'Flexible'], label_en: 'Deadline', label_es: 'Límite de tiempo' },
  { id: 'q10', type: 'radio', options: ['No stones', 'With stones', 'Lab', 'Natural', 'Not sure'], label_en: 'Stone preference', label_es: 'Preferencia de piedras' },
  { id: 'q11', type: 'radio', options: ['Instagram DM', 'WhatsApp', 'Phone', 'Email'], label_en: 'Preferred contact method', label_es: 'Método de contacto preferido' }
]

export default function WhiteGlovePage() {
  const { t, locale } = useTranslation()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [contactValue, setContactValue] = useState('')

  const handleSelect = (val: string) => {
    setAnswers({ ...answers, [QUESTIONS[step].id]: val })
    
    // Auto advance except for the last step
    if (step < QUESTIONS.length - 1) {
      setTimeout(() => setStep(step + 1), 300)
    }
  }

  const handleSubmit = async () => {
    if (!answers.q11 || !contactValue) {
        toast.error("Please provide your contact handle/number.")
        return
    }
    setIsSubmitting(true)

    // Simulate DB Submission 
    // fetch('/api/quiz', { method: 'POST', body: JSON.stringify({ answers, preferredContact: answers.q11 + ' (' + contactValue + ')' }) })
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
    }, 1000)
  }

  const getSummary = () => {
    let summary = `New ${BrandConfig.SERVICE_NAME_EN} Request:\n`
    QUESTIONS.forEach(q => {
      summary += `- ${q.label_en}: ${answers[q.id] || 'Skipped'}\n`
    })
    return summary
  }

  const handleCopyIG = () => {
    navigator.clipboard.writeText(getSummary())
    toast.success("Copied to clipboard! Ready to paste in Instagram.")
  }

  if (isSubmitted) {
    const waText = encodeURIComponent(getSummary())
    const waLink = `https://wa.me/${BrandConfig.CONTACT.whatsappNumber.replace(/\+/g, '')}?text=${waText}`

    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary mb-6">
          <Check className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-serif font-bold mb-4">
          {locale === 'es' ? 'Respondemos en 24h' : 'We’ll reply in 24h'}
        </h1>
        <p className="text-muted-foreground mb-8">
          {locale === 'es' 
            ? '¡Gracias! Hemos preparado el resumen de tu estilo. Conéctate con nosotros usando de tus medios favoritos.' 
            : 'Thank you! We have your style profile ready. Connect with us instantly below.'}
        </p>

        <div className="flex flex-col gap-4">
            <Button asChild className="w-full flex gap-2 h-14 text-lg">
                <a href={waLink} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-5 w-5" />
                    {locale === 'es' ? 'Enviar resumen por WhatsApp' : 'Send via WhatsApp'}
                </a>
            </Button>

            <Button variant="outline" className="w-full flex gap-2 h-14 text-lg" onClick={handleCopyIG}>
                <ClipboardCopy className="h-5 w-5" />
                {locale === 'es' ? 'Copiar resumen para Instagram' : 'Copy IG DM Template'}
            </Button>
            
            <p className="text-sm text-muted-foreground mt-4">
               {locale === 'es' ? 'O envíanos un DM directo:' : 'Or DM us directly:'}
            </p>
            <div className="flex justify-center gap-4 mt-2">
                <Button variant="ghost" size="icon" asChild>
                    <a href={BrandConfig.CONTACT.instagramUrl} target="_blank" rel="noopener noreferrer"><Instagram className="h-6 w-6"/></a>
                </Button>
                <Button variant="ghost" size="icon" asChild>
                    <a href={`tel:${BrandConfig.CONTACT.phoneNumber}`}><Phone className="h-6 w-6"/></a>
                </Button>
            </div>
        </div>
      </div>
    )
  }

  const currentQ = QUESTIONS[step]
  const progress = ((step) / QUESTIONS.length) * 100

  return (
    <div className="min-h-screen bg-background border-t border-border/40 pb-24">
      <div className="bg-secondary/20 py-12 px-4 mb-8">
          <div className="max-w-2xl mx-auto text-center">
              <h1 className="font-serif text-3xl md:text-5xl font-bold mb-4">{t('whiteGlove.title')}</h1>
              <p className="text-muted-foreground">{t('whiteGlove.subtitle')}</p>
          </div>
      </div>

      <div className="max-w-xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="mb-8 w-full bg-secondary h-2 rounded-full overflow-hidden">
            <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardDescription>
                {locale === 'es' ? `Pregunta ${step + 1} de ${QUESTIONS.length}` : `Question ${step + 1} of ${QUESTIONS.length}`}
            </CardDescription>
            <CardTitle className="text-2xl font-serif">
              {locale === 'es' ? currentQ.label_es : currentQ.label_en}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={answers[currentQ.id]} onValueChange={handleSelect} className="space-y-3 mt-4">
              {currentQ.options.map(opt => (
                <div key={opt} className="flex items-center space-x-2 border border-border p-4 rounded-md cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => handleSelect(opt)}>
                  <RadioGroupItem value={opt} id={opt} />
                  <Label htmlFor={opt} className="flex-1 cursor-pointer font-medium">{opt}</Label>
                </div>
              ))}
            </RadioGroup>

            {step === QUESTIONS.length - 1 && answers[currentQ.id] && (
                <div className="mt-8">
                    <Label className="mb-2 block">
                       {locale === 'es' ? 'Tu número de teléfono o @usuario' : 'Your Phone Number or @handle'}
                    </Label>
                    <input 
                        type="text" 
                        value={contactValue}
                        onChange={e => setContactValue(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-md px-4 py-3 outline-none focus:border-primary"
                        placeholder={answers[currentQ.id] === 'Email' ? 'you@email.com' : 'e.g. @username'}
                    />
                </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between pt-6 border-t border-border/30 mt-6">
            <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> {locale === 'es' ? 'Atrás' : 'Back'}
            </Button>

            {step === QUESTIONS.length - 1 ? (
                <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2 px-8">
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {locale === 'es' ? 'Enviar y Conectar' : 'Submit & Connect'}
                </Button>
            ) : (
                <Button onClick={() => setStep(step + 1)} disabled={!answers[currentQ.id]} className="gap-2">
                    {locale === 'es' ? 'Siguiente' : 'Next'} <ChevronRight className="h-4 w-4" />
                </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
