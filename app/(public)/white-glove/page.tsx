'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  Check,
  Instagram,
  Phone,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Mail,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BrandConfig } from '@/lib/config/brand'
import { useTranslation } from '@/i18n/locale-context'
import { submitWhiteGloveQuizAction } from '@/lib/actions/white-glove'
import { toast } from 'sonner'

function createAttemptKey() {
  return `wg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export default function WhiteGlovePage() {
  const { t, locale } = useTranslation()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submissionReceipt, setSubmissionReceipt] = useState<{
    submissionId: string
    preferredContact: string
    contactDisplay: string
    submittedAt: string
  } | null>(null)

  // Contact & optional additional notes state
  const [phonePrefix, setPhonePrefix] = useState('+1')
  const [contactValue, setContactValue] = useState('')
  const [additionalInfo, setAdditionalInfo] = useState('')

  // Synchronous double-click lock + stable idempotency key per quiz attempt
  const submittingLockRef = useRef(false)
  const idempotencyKeyRef = useRef<string>(createAttemptKey())

  const getDynamicSizes = (type: string) => {
    switch (type) {
      case 'Chain':
        return ['16"', '18"', '20"', '22"', '24"', 'Not sure']
      case 'Bracelet':
        return ['6" - 6.5"', '7" - 7.5"', '8"+', 'Not sure']
      case 'Earrings':
        return ['Standard', 'Large / Statement', 'Not sure']
      case 'Set':
        return ['Standard (18" / 7")', 'Large (22" / 8")', 'Will measure later']
      default:
        return ['Standard', 'Not sure']
    }
  }

  // Define QUESTIONS inside to have access to answers dynamically
  const QUESTIONS = [
    {
      id: 'q1',
      type: 'radio',
      options: ['Me', 'Gift'],
      label_en: 'Who is it for?',
      label_es: '¿Para quién es?',
    },
    {
      id: 'q2',
      type: 'radio',
      options: ['<$150', '$150 - $350', '$350 - $550', '$550 - $1200', '$1200+'],
      label_en: 'Budget range',
      label_es: 'Rango de presupuesto',
    },
    {
      id: 'q3',
      type: 'radio',
      options: ['Chain', 'Bracelet', 'Earrings', 'Set'],
      label_en: 'Which piece are you dreaming of?',
      label_es: '¿Con qué pieza estás soñando?',
    },
    {
      id: 'q4',
      type: 'radio',
      options: ['Clean Minimal', 'Classic', 'Street-Lux', 'Statement'],
      label_en: 'Style vibe',
      label_es: 'Estilo',
    },
    {
      id: 'q5',
      type: 'radio',
      options: ['Yellow', 'White', 'Rose', 'Not sure'],
      label_en: 'Metal preference',
      label_es: 'Preferencia de metal',
    },
    {
      id: 'q6',
      type: 'radio',
      options: ['Daily', 'Occasions', 'Gift'],
      label_en: 'Usage',
      label_es: 'Uso',
    },
    {
      id: 'q7',
      type: 'radio',
      options: ['Yes', 'No'],
      label_en: 'Do you wear a watch?',
      label_es: '¿Usas reloj?',
    },
    {
      id: 'q8',
      type: 'radio',
      options: getDynamicSizes(answers.q3),
      label_en: 'Sizing',
      label_es: 'Tamaño o Talla',
      isConditional: true,
    },
    {
      id: 'q9',
      type: 'radio',
      options: ['Within 1 week', '2 weeks', '1 month', 'Flexible'],
      label_en: 'Deadline',
      label_es: 'Límite de tiempo',
    },
    {
      id: 'q10',
      type: 'radio',
      options: ['Natural Stones', 'Lab-Grown Stones', 'No Stones / Solid Gold', 'Not sure'],
      label_en: 'Stone preference',
      label_es: 'Preferencia de piedras',
    },
    {
      id: 'q11',
      type: 'radio',
      options: ['Email', 'Instagram DM', 'WhatsApp', 'Phone Text'],
      label_en: 'Preferred contact method',
      label_es: 'Método de contacto preferido',
    },
  ]

  const currentQ = QUESTIONS[step]
  const progress = ((step + 1) / QUESTIONS.length) * 100

  const handleSelect = (val: string) => {
    setSubmitError(null)
    setAnswers((prev) => {
      const next = { ...prev, [currentQ.id]: val }
      // If user changes q3 (piece type), ensure conditional q8 sizing remains valid for the new piece type
      if (currentQ.id === 'q3' && prev.q3 !== val) {
        const validSizes = getDynamicSizes(val)
        if (next.q8 && !validSizes.includes(next.q8)) {
          delete next.q8
        }
      }
      return next
    })

    // Auto advance except for the last step
    if (step < QUESTIONS.length - 1) {
      setTimeout(() => setStep((s) => Math.min(QUESTIONS.length - 1, s + 1)), 300)
    }
  }

  const handleSubmit = async () => {
    if (submittingLockRef.current || isSubmitting) {
      return
    }

    setSubmitError(null)
    const selectedMethod = answers.q11
    const trimmedContact = contactValue.trim()

    if (!selectedMethod || !trimmedContact) {
      const msg =
        locale === 'es'
          ? 'Por favor selecciona tu método de contacto e ingresa tu correo o usuario de Instagram.'
          : 'Please select your preferred contact method and enter your email or Instagram username.'
      setSubmitError(msg)
      toast.error(msg)
      return
    }

    // Check if any earlier question was skipped (e.g. if q3 changed and invalidated q8)
    const missingQuestionIndex = QUESTIONS.findIndex((q) => !answers[q.id])
    if (missingQuestionIndex !== -1) {
      setStep(missingQuestionIndex)
      const missingQ = QUESTIONS[missingQuestionIndex]
      const msg =
        locale === 'es'
          ? `Por favor responde: "${missingQ.label_es}" antes de enviar.`
          : `Please answer: "${missingQ.label_en}" before submitting.`
      setSubmitError(msg)
      toast.error(msg)
      return
    }

    submittingLockRef.current = true
    setIsSubmitting(true)

    try {
      const res = await submitWhiteGloveQuizAction({
        answers,
        questions: QUESTIONS.map((q) => ({
          id: q.id,
          label_en: q.label_en,
          label_es: q.label_es,
          isConditional: Boolean((q as any).isConditional),
        })),
        preferredContactMethod: selectedMethod,
        contactValue: trimmedContact,
        phonePrefix,
        additionalInfo: additionalInfo.trim() || undefined,
        locale,
        idempotencyKey: idempotencyKeyRef.current,
      })

      if (!res.success || !res.submissionId) {
        const errMsg =
          res.error ||
          (locale === 'es'
            ? 'No pudimos guardar tu solicitud. Tus respuestas están seguras; por favor intenta de nuevo.'
            : 'We could not save your request. Your answers are preserved; please try again.')
        setSubmitError(errMsg)
        toast.error(errMsg)
        return
      }

      setSubmissionReceipt({
        submissionId: res.submissionId,
        preferredContact: res.preferredContact || selectedMethod,
        contactDisplay: res.contactDisplay || trimmedContact,
        submittedAt: res.submittedAt || new Date().toISOString(),
      })
      setIsSubmitted(true)
      toast.success(
        locale === 'es'
          ? 'Solicitud White-Glove recibida con éxito.'
          : 'Your White-Glove request has been received.'
      )
    } catch (err: any) {
      const errMsg =
        locale === 'es'
          ? 'Error de conexión al enviar tu solicitud. Tus respuestas no se han perdido; por favor intenta nuevamente.'
          : 'Network error while submitting your request. Your answers have been preserved; please try again.'
      setSubmitError(errMsg)
      toast.error(errMsg)
    } finally {
      submittingLockRef.current = false
      setIsSubmitting(false)
    }
  }

  if (isSubmitted && submissionReceipt) {
    const isEmailContact = submissionReceipt.preferredContact === 'Email'
    const isInstagramContact = submissionReceipt.preferredContact === 'Instagram'

    return (
      <div className="mx-auto max-w-xl px-4 py-20 md:py-28 text-center">
        <div className="rounded-xl border border-border/60 bg-card p-8 md:p-12 shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary mb-6">
            <Check className="h-8 w-8 text-primary-foreground" />
          </div>

          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-4">
            Your White-Glove Experience Begins Here.
          </h1>

          <p className="text-muted-foreground leading-relaxed text-base mb-8">
            &ldquo;Thank you for choosing M&amp;G Jewelry. We&apos;ve received your preferences, and our team will personally review your request to help you find the perfect piece. We look forward to connecting with you.&rdquo;
          </p>

          <div className="rounded-lg border border-border/60 bg-secondary/20 p-4 text-left text-sm space-y-2 mb-8">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">
                {locale === 'es' ? 'ID de Solicitud:' : 'Request ID:'}
              </span>
              <span className="font-mono text-xs font-medium text-foreground">
                {submissionReceipt.submissionId}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">
                {locale === 'es' ? 'Método de Contacto:' : 'Preferred Contact:'}
              </span>
              <span className="font-medium text-foreground flex items-center gap-1.5">
                {isEmailContact && <Mail className="h-3.5 w-3.5 text-primary" />}
                {isInstagramContact && <Instagram className="h-3.5 w-3.5 text-primary" />}
                {submissionReceipt.preferredContact} ({submissionReceipt.contactDisplay})
              </span>
            </div>
            {isEmailContact && (
              <p className="text-xs text-muted-foreground pt-2 border-t border-border/40">
                {locale === 'es'
                  ? `Hemos registrado tu correo electrónico (${submissionReceipt.contactDisplay}) y enviado una confirmación con el resumen de tu solicitud.`
                  : `We have recorded your email (${submissionReceipt.contactDisplay}) and sent a confirmation with your request details.`}
              </p>
            )}
            {isInstagramContact && (
              <p className="text-xs text-muted-foreground pt-2 border-t border-border/40">
                {locale === 'es'
                  ? `Hemos guardado tu usuario de Instagram (${submissionReceipt.contactDisplay}). Nuestro equipo de joyeros revisará tu perfil y te contactará personalmente.`
                  : `We have saved your Instagram username (${submissionReceipt.contactDisplay}). Our concierge team will personally review your request and reach out to you.`}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="px-6">
              <Link href="/collections">
                {locale === 'es' ? 'Explorar Colecciones' : 'Explore Collections'}
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                idempotencyKeyRef.current = createAttemptKey()
                setIsSubmitted(false)
                setSubmissionReceipt(null)
                setStep(0)
                setAnswers({})
                setContactValue('')
                setAdditionalInfo('')
                setSubmitError(null)
              }}
            >
              {locale === 'es' ? 'Enviar otra solicitud' : 'Submit Another Request'}
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-border/40">
            <p className="text-xs text-muted-foreground mb-3">
              {locale === 'es' ? 'Nuestros canales oficiales:' : 'Our official channels:'}
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="ghost" size="icon" asChild className="hover:text-primary">
                <a
                  href={BrandConfig.CONTACT.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" asChild className="hover:text-primary">
                <a href={`tel:${BrandConfig.CONTACT.phoneNumber}`} aria-label="Phone">
                  <Phone className="h-5 w-5" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background border-t border-border/40 pb-24">
      <div className="bg-secondary/20 py-12 px-4 mb-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="font-serif text-3xl md:text-5xl font-bold mb-4">
            {t('whiteGlove.title')}
          </h1>
          <p className="text-muted-foreground">{t('whiteGlove.subtitle')}</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="mb-8 w-full bg-secondary h-2 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardDescription className="text-primary font-medium flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {locale === 'es'
                ? `Pregunta ${step + 1} de ${QUESTIONS.length}`
                : `Question ${step + 1} of ${QUESTIONS.length}`}
            </CardDescription>
            <CardTitle className="text-2xl font-serif leading-tight">
              {locale === 'es' ? currentQ.label_es : currentQ.label_en}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* The Options Renderer */}
            <RadioGroup
              value={answers[currentQ.id] || ''}
              onValueChange={handleSelect}
              className="space-y-3 mt-2"
            >
              {currentQ.options.map((opt) => (
                <div
                  key={opt}
                  className={`flex items-center space-x-3 border p-4 rounded-md cursor-pointer transition-all ${
                    answers[currentQ.id] === opt
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-secondary/50'
                  }`}
                  onClick={() => handleSelect(opt)}
                >
                  <RadioGroupItem
                    value={opt}
                    id={opt}
                    className="text-primary border-primary/50"
                  />
                  <Label
                    htmlFor={opt}
                    className="flex-1 cursor-pointer font-medium text-[15px]"
                  >
                    {opt}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {/* Step 11: Render tailored input fields depending on method selected */}
            {step === QUESTIONS.length - 1 && answers[currentQ.id] && (
              <div className="mt-8 space-y-4 p-4 bg-secondary/30 rounded-lg border border-border/50">
                <div>
                  <Label htmlFor="wg-contact-input" className="mb-2 block font-medium">
                    {answers[currentQ.id] === 'WhatsApp' ||
                    answers[currentQ.id] === 'Phone Text'
                      ? locale === 'es'
                        ? 'Ingresa tu Número Móvil *'
                        : 'Enter your Mobile Number *'
                      : answers[currentQ.id] === 'Email'
                        ? locale === 'es'
                          ? 'Ingresa tu Correo Electrónico *'
                          : 'Enter your Email Address *'
                        : locale === 'es'
                          ? 'Ingresa tu Usuario de Instagram *'
                          : 'Enter your Instagram Username *'}
                  </Label>

                  {answers[currentQ.id] === 'WhatsApp' ||
                  answers[currentQ.id] === 'Phone Text' ? (
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
                        id="wg-contact-input"
                        type="tel"
                        value={contactValue}
                        onChange={(e) => {
                          setContactValue(e.target.value)
                          if (submitError) setSubmitError(null)
                        }}
                        className="flex-1 bg-background border border-border rounded-md px-4 h-12 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        placeholder="(555) 000-0000"
                        disabled={isSubmitting}
                      />
                    </div>
                  ) : (
                    <input
                      id="wg-contact-input"
                      type={answers[currentQ.id] === 'Email' ? 'email' : 'text'}
                      value={contactValue}
                      onChange={(e) => {
                        setContactValue(e.target.value)
                        if (submitError) setSubmitError(null)
                      }}
                      className="w-full bg-background border border-border rounded-md px-4 h-12 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      placeholder={
                        answers[currentQ.id] === 'Email'
                          ? 'you@email.com'
                          : '@username'
                      }
                      disabled={isSubmitting}
                    />
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="wg-additional-notes"
                    className="mb-2 block text-sm font-medium text-muted-foreground"
                  >
                    {locale === 'es'
                      ? 'Información o preferencias adicionales (Opcional)'
                      : 'Additional preferences or notes (Optional)'}
                  </Label>
                  <textarea
                    id="wg-additional-notes"
                    rows={2}
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    disabled={isSubmitting}
                    placeholder={
                      locale === 'es'
                        ? 'Ej. Grabado personalizado, quilates específicos, ocasión especial...'
                        : 'E.g. Custom engraving, specific karat, special occasion details...'
                    }
                    className="w-full bg-background border border-border rounded-md p-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                  />
                </div>
              </div>
            )}

            {submitError && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2.5 rounded-md border border-destructive/50 bg-destructive/10 p-3.5 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between pt-6 border-t border-border/30 mt-6 bg-secondary/10">
            <Button
              variant="ghost"
              onClick={() => {
                setSubmitError(null)
                setStep(Math.max(0, step - 1))
              }}
              disabled={step === 0 || isSubmitting}
              className="gap-2 hover:bg-secondary"
            >
              <ChevronLeft className="h-4 w-4" /> {locale === 'es' ? 'Atrás' : 'Back'}
            </Button>

            {step === QUESTIONS.length - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !answers.q11 || !contactValue.trim()}
                className="gap-2 px-8 shadow-md"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting
                  ? locale === 'es'
                    ? 'Enviando...'
                    : 'Submitting...'
                  : locale === 'es'
                    ? 'Finalizar Test'
                    : 'Submit Application'}
              </Button>
            ) : (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!answers[currentQ.id]}
                className="gap-2 shadow-md"
              >
                {locale === 'es' ? 'Siguiente' : 'Next'}{' '}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
