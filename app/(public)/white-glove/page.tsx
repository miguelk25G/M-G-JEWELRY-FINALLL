'use client'

import { useState } from 'react'
import { Check, ClipboardCopy, Instagram, MessageCircle, Phone, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BrandConfig } from '@/lib/config/brand'
import { useTranslation } from '@/i18n/locale-context'
import { toast } from 'sonner'

export default function WhiteGlovePage() {
  const { t, locale } = useTranslation()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  
  // Custom contact state management
  const [phonePrefix, setPhonePrefix] = useState('+1')
  const [contactValue, setContactValue] = useState('')

  const getDynamicSizes = (type: string) => {
    switch(type) {
      case 'Chain': return ['16"', '18"', '20"', '22"', '24"', 'Not sure']
      case 'Bracelet': return ['6" - 6.5"', '7" - 7.5"', '8"+', 'Not sure']
      case 'Earrings': return ['Standard', 'Large / Statement', 'Not sure']
      case 'Set': return ['Standard (18" / 7")', 'Large (22" / 8")', 'Will measure later']
      default: return ['Standard', 'Not sure']
    }
  }

  // Define QUESTIONS inside to have access to answers dynamically
  const QUESTIONS = [
    { id: 'q1', type: 'radio', options: ['Me', 'Gift'], label_en: 'Who is it for?', label_es: '¿Para quién es?' },
    { id: 'q2', type: 'radio', options: ['<$150', '$150 - $350', '$350 - $550', '$550 - $1200', '$1200+'], label_en: 'Budget range', label_es: 'Rango de presupuesto' },
    { id: 'q3', type: 'radio', options: ['Chain', 'Bracelet', 'Earrings', 'Set'], label_en: 'Which piece are you dreaming of?', label_es: '¿Con qué pieza estás soñando?' },
    { id: 'q4', type: 'radio', options: ['Clean Minimal', 'Classic', 'Street-Lux', 'Statement'], label_en: 'Style vibe', label_es: 'Estilo' },
    { id: 'q5', type: 'radio', options: ['Yellow', 'White', 'Rose', 'Not sure'], label_en: 'Metal preference', label_es: 'Preferencia de metal' },
    { id: 'q6', type: 'radio', options: ['Daily', 'Occasions', 'Gift'], label_en: 'Usage', label_es: 'Uso' },
    { id: 'q7', type: 'radio', options: ['Yes', 'No'], label_en: 'Do you wear a watch?', label_es: '¿Usas reloj?' },
    { id: 'q8', type: 'radio', options: getDynamicSizes(answers.q3), label_en: 'Sizing', label_es: 'Tamaño o Talla' },
    { id: 'q9', type: 'radio', options: ['Within 1 week', '2 weeks', '1 month', 'Flexible'], label_en: 'Deadline', label_es: 'Límite de tiempo' },
    { id: 'q10', type: 'radio', options: ['Natural Stones', 'Lab-Grown Stones', 'No Stones / Solid Gold', 'Not sure'], label_en: 'Stone preference', label_es: 'Preferencia de piedras' },
    { id: 'q11', type: 'radio', options: ['Instagram DM', 'WhatsApp', 'Phone Call', 'Email'], label_en: 'Preferred contact method', label_es: 'Método de contacto preferido' }
  ]

  const currentQ = QUESTIONS[step]
  const progress = ((step) / QUESTIONS.length) * 100

  const handleSelect = (val: string) => {
    setAnswers({ ...answers, [currentQ.id]: val })
    
    // Auto advance except for the last step
    if (step < QUESTIONS.length - 1) {
      setTimeout(() => setStep(step + 1), 300)
    }
  }

  const handleSubmit = async () => {
    if (!answers.q11 || !contactValue) {
        toast.error(locale === 'es' ? "Por favor escribe tu contacto." : "Please provide your contact handle/number.")
        return
    }
    setIsSubmitting(true)

    // Build the final contact string based on the user's choice
    let finalContactStr = ''
    if (answers.q11 === 'WhatsApp' || answers.q11 === 'Phone Call') {
      finalContactStr = `${answers.q11}: ${phonePrefix} ${contactValue}`
    } else {
      finalContactStr = `${answers.q11}: ${contactValue}`
    }

    // Temporary mock submission - can be wired to API later if desired
    setTimeout(() => {
      // Just so it saves the final combined answer for the summary screen
      setAnswers(prev => ({ ...prev, _finalContact: finalContactStr }))
      setIsSubmitting(false)
      setIsSubmitted(true)
    }, 1000)
  }

  const getSummary = () => {
    let summary = `New ${BrandConfig.SERVICE_NAME_EN} Request:\n`
    QUESTIONS.forEach(q => {
      if (q.id === 'q11') {
        summary += `- Contact: ${answers._finalContact || 'Skipped'}\n`
      } else {
        summary += `- ${q.label_en}: ${answers[q.id] || 'Skipped'}\n`
      }
    })
    return summary
  }

  const handleCopyIG = () => {
    navigator.clipboard.writeText(getSummary())
    toast.success(locale === 'es' ? "¡Copiado! Listo para pegar en Instagram." : "Copied to clipboard! Ready to paste in Instagram.")
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
          {locale === 'es' ? 'Recibido magistralmente' : 'Masterfully Received'}
        </h1>
        <p className="text-muted-foreground mb-8">
          {locale === 'es' 
            ? '¡Gracias! Hemos preparado el resumen de tu estilo White-Glove. Conéctate con nuestros joyeros instantáneamente aquí abajo.' 
            : 'Thank you! We have your White-Glove style profile ready. Connect with our jewelers instantly below.'}
        </p>

        <div className="flex flex-col gap-4">
            <Button asChild className="w-full flex gap-2 h-14 text-lg bg-green-600 hover:bg-green-700 text-white">
                <a href={waLink} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-5 w-5" />
                    {locale === 'es' ? 'Enviar resumen por WhatsApp' : 'Send via WhatsApp'}
                </a>
            </Button>

            <Button variant="outline" className="w-full flex gap-2 h-14 text-lg border-primary/20 hover:bg-primary/5" onClick={handleCopyIG}>
                <ClipboardCopy className="h-5 w-5" />
                {locale === 'es' ? 'Copiar plantilla para Instagram DM' : 'Copy IG DM Template'}
            </Button>
            
            <p className="text-sm text-muted-foreground mt-4">
               {locale === 'es' ? 'O búscanos directamente:' : 'Or reach out directly:'}
            </p>
            <div className="flex justify-center gap-4 mt-2">
                <Button variant="ghost" size="icon" asChild className="hover:text-primary">
                    <a href={BrandConfig.CONTACT.instagramUrl} target="_blank" rel="noopener noreferrer"><Instagram className="h-6 w-6"/></a>
                </Button>
                <Button variant="ghost" size="icon" asChild className="hover:text-primary">
                    <a href={`tel:${BrandConfig.CONTACT.phoneNumber}`}><Phone className="h-6 w-6"/></a>
                </Button>
            </div>
        </div>
      </div>
    )
  }

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
            <CardDescription className="text-primary font-medium">
                {locale === 'es' ? `Pregunta ${step + 1} de ${QUESTIONS.length}` : `Question ${step + 1} of ${QUESTIONS.length}`}
            </CardDescription>
            <CardTitle className="text-2xl font-serif leading-tight">
              {locale === 'es' ? currentQ.label_es : currentQ.label_en}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* The Options Renderer */}
            <RadioGroup value={answers[currentQ.id]} onValueChange={handleSelect} className="space-y-3 mt-2">
              {currentQ.options.map(opt => (
                <div key={opt} className={`flex items-center space-x-3 border p-4 rounded-md cursor-pointer transition-all ${answers[currentQ.id] === opt ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/50'}`} onClick={() => handleSelect(opt)}>
                  <RadioGroupItem value={opt} id={opt} className="text-primary border-primary/50" />
                  <Label htmlFor={opt} className="flex-1 cursor-pointer font-medium text-[15px]">{opt}</Label>
                </div>
              ))}
            </RadioGroup>

            {/* Step 11: Render tailored input fields depending on method selected */}
            {step === QUESTIONS.length - 1 && answers[currentQ.id] && (
                <div className="mt-8 p-4 bg-secondary/30 rounded-lg border border-border/50">
                    <Label className="mb-3 block font-medium">
                       {answers[currentQ.id] === 'WhatsApp' || answers[currentQ.id] === 'Phone Call' 
                         ? (locale === 'es' ? 'Ingresa tu Número Móvil' : 'Enter your Mobile Number')
                         : (locale === 'es' ? `Ingresa tu ${answers[currentQ.id]}` : `Enter your ${answers[currentQ.id]}`)
                       }
                    </Label>

                    {answers[currentQ.id] === 'WhatsApp' || answers[currentQ.id] === 'Phone Call' ? (
                      <div className="flex gap-2">
                        <Select value={phonePrefix} onValueChange={setPhonePrefix}>
                          <SelectTrigger className="w-[100px] h-12 bg-background border-border">
                            <SelectValue placeholder="Code" />
                          </SelectTrigger>
                          <SelectContent className="bg-background">
                            <SelectItem value="+1">+1 (US)</SelectItem>
                            <SelectItem value="+44">+44 (UK)</SelectItem>
                            <SelectItem value="+52">+52 (MX)</SelectItem>
                            <SelectItem value="+34">+34 (ES)</SelectItem>
                            <SelectItem value="+506">+506 (CR)</SelectItem>
                            <SelectItem value="+57">+57 (CO)</SelectItem>
                          </SelectContent>
                        </Select>
                        <input 
                            type="tel" 
                            value={contactValue}
                            onChange={e => setContactValue(e.target.value)}
                            className="flex-1 bg-background border border-border rounded-md px-4 h-12 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            placeholder="(555) 000-0000"
                        />
                      </div>
                    ) : (
                      <input 
                          type="text" 
                          value={contactValue}
                          onChange={e => setContactValue(e.target.value)}
                          className="w-full bg-background border border-border rounded-md px-4 h-12 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                          placeholder={answers[currentQ.id] === 'Email' ? 'you@email.com' : '@username'}
                      />
                    )}
                </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between pt-6 border-t border-border/30 mt-6 bg-secondary/10">
            <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="gap-2 hover:bg-secondary">
                <ChevronLeft className="h-4 w-4" /> {locale === 'es' ? 'Atrás' : 'Back'}
            </Button>

            {step === QUESTIONS.length - 1 ? (
                <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2 px-8 shadow-md">
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {locale === 'es' ? 'Finalizar Test' : 'Submit Application'}
                </Button>
            ) : (
                <Button onClick={() => setStep(step + 1)} disabled={!answers[currentQ.id]} className="gap-2 shadow-md">
                    {locale === 'es' ? 'Siguiente' : 'Next'} <ChevronRight className="h-4 w-4" />
                </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
