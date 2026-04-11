"use client"

import React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MapPin, Phone, Mail, Clock, Send, Loader2, CheckCircle, Instagram } from "lucide-react"
import { useLocale } from "@/i18n/locale-context"
import { BrandConfig } from "@/lib/config/brand"
import { submitContactForm } from "@/lib/actions/contact"
import { toast } from "sonner"

export default function ContactPage() {
  const { t } = useLocale()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    honeypot: "", // anti-spam
  })

  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault()
    if (formData.honeypot) return // Bot caught

    setIsSubmitting(true)
    
    const dbData = new FormData()
    dbData.append("name", formData.name)
    dbData.append("email", formData.email)
    dbData.append("phone", formData.phone)
    dbData.append("reason", formData.subject || "general")
    dbData.append("message", formData.message)

    const res = await submitContactForm(dbData)
    
    if (res.success) {
      setIsSubmitted(true)
    } else {
      toast.error("Hubo un error enviando el mensaje.")
    }
    
    setIsSubmitting(false)
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">{t("contact.thankYou")}</h2>
            <p className="text-muted-foreground mb-6">{t("contact.thankYouMessage")}</p>
            <Button onClick={() => setIsSubmitted(false)}>{t("contact.sendAnother")}</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-semibold mb-4">{t("contact.title")}</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t("contact.subtitle")}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Info Cards */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">{t("contact.visitUs")}</h3>
                    <p className="text-sm text-muted-foreground">
                      123 Luxury Avenue
                      <br />
                      New York, NY 10001
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">{t("contact.callUs")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {BrandConfig.CONTACT.phoneNumber}
                      <br />
                      <a href={`https://wa.me/${BrandConfig.CONTACT.whatsappNumber.replace(/\+/g, '')}`} className="hover:underline">
                        {BrandConfig.CONTACT.whatsappNumber} (WhatsApp)
                      </a>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Instagram className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Instagram</h3>
                    <p className="text-sm text-muted-foreground">
                      <a href={BrandConfig.CONTACT.instagramUrl} target="_blank" className="hover:underline">
                         @mgjewelry
                      </a>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">{t("contact.emailUs")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {BrandConfig.CONTACT.supportEmail}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">{t("contact.hours")}</h3>
                    <p className="text-sm text-muted-foreground">
                      Mon - Fri: 10am - 7pm
                      <br />
                      Sat - Sun: 11am - 6pm
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("contact.formTitle")}</CardTitle>
              <CardDescription>{t("contact.formDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Anti-spam honeypot */}
                <input 
                  type="text" 
                  name="honeypot" 
                  value={formData.honeypot}
                  style={{ display: 'none' }}
                  onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
                  tabIndex={-1}
                  autoComplete="off"
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("contact.name")}</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("contact.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("contact.phone")}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">{t("contact.subject")}</Label>
                    <Select
                      value={formData.subject}
                      onValueChange={(value) => setFormData({ ...formData, subject: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("contact.selectSubject")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">{t("contact.subjectGeneral")}</SelectItem>
                        <SelectItem value="order">{t("contact.subjectOrder")}</SelectItem>
                        <SelectItem value="return">{t("contact.subjectReturn")}</SelectItem>
                        <SelectItem value="custom">{t("contact.subjectCustom")}</SelectItem>
                        <SelectItem value="whiteGlove">{t("contact.subjectWhite-Glove")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">{t("contact.message")}</Label>
                  <Textarea
                    id="message"
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("common.sending")}
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {t("contact.send")}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

