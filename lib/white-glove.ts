/**
 * M&G Jewelry — White-Glove Quiz Submission, Lead Management & Notifications Service
 *
 * Provides:
 * - Input validation & sanitization (email validation, Instagram handle normalization, XSS escaping)
 * - Versioned, structured Question & Answer persistence in QuizSubmission
 * - Idempotency & rate-limiting protection against double-clicks and spam
 * - Business notification email ("New White-Glove Request — M&G Jewelry")
 * - Customer confirmation email ("We've Received Your White-Glove Request | M&G Jewelry")
 * - Safe notification retry without duplicate email delivery
 * - Admin Dashboard query, search, filter, sort, badge count, and status workflow
 */

import nodemailer from "nodemailer"
import { BrandConfig } from "@/lib/config/brand"

export const WHITE_GLOVE_SCHEMA_VERSION = 2

export const WHITE_GLOVE_STATUSES = [
  "New",
  "Contacted",
  "In Progress",
  "Completed",
  "Closed",
] as const

export type WhiteGloveStatus = (typeof WHITE_GLOVE_STATUSES)[number]

export type WhiteGloveContactMethod =
  | "Email"
  | "Instagram"
  | "WhatsApp"
  | "Phone Text"

export interface WhiteGloveQuestionAnswer {
  id: string
  questionNumber: number
  questionEn: string
  questionEs?: string
  answer: string
  isConditional?: boolean
}

export interface WhiteGloveNotificationRecord {
  status: "pending" | "sent" | "failed" | "skipped_unconfigured" | "skipped_not_applicable"
  recipient?: string
  sentAt?: string
  error?: string
  attempts: number
  messageId?: string
}

export interface WhiteGloveStoredPayload {
  schemaVersion: number
  submissionId?: string
  submittedAt: string
  updatedAt: string
  status: WhiteGloveStatus
  locale: string
  idempotencyKey?: string
  contact: {
    method: WhiteGloveContactMethod
    rawInput: string
    displayValue: string
    email?: string
    instagramHandle?: string
    instagramUrl?: string
    phone?: string
  }
  questionsAndAnswers: WhiteGloveQuestionAnswer[]
  rawAnswers: Record<string, string>
  preferences: {
    recipient?: string
    budget?: string
    pieceType?: string
    style?: string
    metal?: string
    usage?: string
    wearsWatch?: string
    sizing?: string
    deadline?: string
    stonePreference?: string
  }
  additionalInfo?: string
  adminNotes?: string
  notifications: {
    adminEmail: WhiteGloveNotificationRecord
    customerEmail: WhiteGloveNotificationRecord
  }
  statusHistory: Array<{
    status: WhiteGloveStatus
    changedAt: string
    note?: string
  }>
}

export interface WhiteGloveAdminRequest {
  id: string
  createdAt: string
  updatedAt: string
  status: WhiteGloveStatus
  locale: string
  preferredContact: WhiteGloveContactMethod
  contactDisplay: string
  email: string | null
  instagramHandle: string | null
  instagramUrl: string | null
  phone: string | null
  mailtoHref: string | null
  questionsAndAnswers: WhiteGloveQuestionAnswer[]
  rawAnswers: Record<string, string>
  preferences: WhiteGloveStoredPayload["preferences"]
  additionalInfo: string
  adminNotes: string
  notifications: WhiteGloveStoredPayload["notifications"]
  statusHistory: WhiteGloveStoredPayload["statusHistory"]
}

export interface SubmitWhiteGloveInput {
  answers: Record<string, string>
  questions?: Array<{
    id: string
    label_en: string
    label_es?: string
    isConditional?: boolean
  }>
  preferredContactMethod: string
  contactValue: string
  phonePrefix?: string
  additionalInfo?: string
  locale?: string
  idempotencyKey?: string
  clientIp?: string
}

export interface EmailMessagePayload {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
}

export type MailTransportSender = (
  msg: EmailMessagePayload
) => Promise<{ sent: boolean; messageId?: string; skippedReason?: string }>

// Default catalog of standard quiz questions for fallback reconstruction of legacy records
export const DEFAULT_QUIZ_QUESTIONS: Array<{
  id: string
  label_en: string
  label_es: string
  isConditional?: boolean
}> = [
  { id: "q1", label_en: "Who is it for?", label_es: "¿Para quién es?" },
  { id: "q2", label_en: "Budget range", label_es: "Rango de presupuesto" },
  { id: "q3", label_en: "Which piece are you dreaming of?", label_es: "¿Con qué pieza estás soñando?" },
  { id: "q4", label_en: "Style vibe", label_es: "Estilo" },
  { id: "q5", label_en: "Metal preference", label_es: "Preferencia de metal" },
  { id: "q6", label_en: "Usage", label_es: "Uso" },
  { id: "q7", label_en: "Do you wear a watch?", label_es: "¿Usas reloj?" },
  { id: "q8", label_en: "Sizing", label_es: "Tamaño o Talla", isConditional: true },
  { id: "q9", label_en: "Deadline", label_es: "Límite de tiempo" },
  { id: "q10", label_en: "Stone preference", label_es: "Preferencia de piedras" },
  { id: "q11", label_en: "Preferred contact method", label_es: "Método de contacto preferido" },
]

/**
 * Escapes HTML special characters to prevent XSS in emails and dashboard rendering.
 */
export function escapeHtml(input: string | null | undefined): string {
  if (!input) return ""
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * Sanitizes plain text input by trimming and stripping control characters.
 */
export function sanitizeText(input: string | null | undefined, maxLength = 1000): string {
  if (!input) return ""
  return String(input)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength)
}

/**
 * Validates and normalizes an email address.
 */
export function validateAndNormalizeEmail(raw: string | null | undefined): {
  valid: boolean
  email?: string
  error?: string
} {
  const cleaned = sanitizeText(raw, 254).toLowerCase()
  if (!cleaned) {
    return { valid: false, error: "Please enter your email address." }
  }
  // Standard RFC-5322 practical check
  const emailRegex = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i
  if (!emailRegex.test(cleaned)) {
    return { valid: false, error: "Please enter a valid email address (e.g. name@example.com)." }
  }
  return { valid: true, email: cleaned }
}

/**
 * Validates and normalizes an Instagram username or profile URL into:
 * - handle: clean username without '@' (1-30 chars, alphanumeric, underscores, periods)
 * - display: '@username'
 * - profileUrl: 'https://www.instagram.com/username'
 */
export function validateAndNormalizeInstagram(raw: string | null | undefined): {
  valid: boolean
  handle?: string
  display?: string
  profileUrl?: string
  error?: string
} {
  let cleaned = sanitizeText(raw, 200)
  if (!cleaned) {
    return { valid: false, error: "Please enter your Instagram username." }
  }

  // Strip full instagram URL if the user pasted a profile link
  const urlMatch = cleaned.match(
    /^(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9._]+)\/?(?:\?.*)?$/i
  )
  if (urlMatch && urlMatch[1]) {
    cleaned = urlMatch[1]
  }

  // Remove leading @ symbols and surrounding whitespace
  cleaned = cleaned.replace(/^@+/, "").trim()

  if (!cleaned) {
    return { valid: false, error: "Please enter a valid Instagram username." }
  }

  // Instagram username rules: 1-30 characters, letters, numbers, periods, underscores, no consecutive periods
  const igRegex = /^[a-zA-Z0-9._]{1,30}$/
  if (!igRegex.test(cleaned) || cleaned.includes("..")) {
    return {
      valid: false,
      error: "Please enter a valid Instagram username (letters, numbers, periods, and underscores only).",
    }
  }

  return {
    valid: true,
    handle: cleaned,
    display: `@${cleaned}`,
    profileUrl: `https://www.instagram.com/${encodeURIComponent(cleaned)}`,
  }
}

/**
 * Validates and normalizes a phone number for WhatsApp / Phone Text contact methods.
 */
export function validateAndNormalizePhone(
  rawDigits: string | null | undefined,
  prefix = "+1"
): {
  valid: boolean
  phone?: string
  error?: string
} {
  const cleanedPrefix = sanitizeText(prefix, 8).replace(/[^\d+]/g, "") || "+1"
  const raw = sanitizeText(rawDigits, 40)
  const digitsOnly = raw.replace(/\D/g, "")
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return {
      valid: false,
      error: "Please enter a valid phone number (7 to 15 digits).",
    }
  }
  const formatted = raw.startsWith("+") ? raw : `${cleanedPrefix} ${raw}`
  return { valid: true, phone: formatted }
}

/**
 * Normalizes a contact method label to one of the canonical WhiteGloveContactMethod values.
 */
export function normalizeContactMethod(raw: string | null | undefined): WhiteGloveContactMethod {
  const val = String(raw || "").trim().toLowerCase()
  if (val === "email" || val.includes("email") || val.includes("correo")) {
    return "Email"
  }
  if (val === "instagram" || val === "instagram dm" || val.includes("instagram") || val === "ig") {
    return "Instagram"
  }
  if (val.includes("whatsapp")) {
    return "WhatsApp"
  }
  if (val.includes("phone") || val.includes("text") || val.includes("sms") || val.includes("tel")) {
    return "Phone Text"
  }
  throw new Error("Please select a valid preferred contact method (Email or Instagram).")
}

/**
 * Resolves the business notification recipient email address from environment variables or BrandConfig.
 */
export function getBusinessNotificationEmail(siteSettingsEmail?: string | null): string {
  return (
    process.env.ADMIN_NOTIFICATION_EMAIL?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    siteSettingsEmail?.trim() ||
    BrandConfig.CONTACT.supportEmail ||
    "mngjewerly25k@gmail.com"
  )
}

/**
 * Resolves the base site URL for Admin Dashboard deep links inside notification emails.
 */
export function getSiteBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://www.mngjewelry.com")
  return raw.replace(/\/+$/, "")
}

/**
 * Builds the luxury HTML and plain-text email sent to the M&G Jewelry business email
 * whenever a customer submits the White-Glove Quiz.
 * Subject: New White-Glove Request — M&G Jewelry
 */
export function buildBusinessNotificationEmail(
  request: WhiteGloveAdminRequest
): { subject: string; html: string; text: string } {
  const subject = "New White-Glove Request — M&G Jewelry"
  const baseUrl = getSiteBaseUrl()
  const adminUrl = `${baseUrl}/admin/white-glove?requestId=${encodeURIComponent(request.id)}`
  const formattedDate = new Date(request.createdAt).toUTCString()

  const qaRowsHtml = request.questionsAndAnswers
    .map(
      (qa) => `
      <tr>
        <td style="padding: 12px 14px; border-bottom: 1px solid #262626; color: #a3a3a3; font-size: 13px; width: 45%; vertical-align: top;">
          <strong style="color: #e5e5e5;">Q${qa.questionNumber}.</strong> ${escapeHtml(qa.questionEn)}
        </td>
        <td style="padding: 12px 14px; border-bottom: 1px solid #262626; color: #ffffff; font-size: 14px; font-weight: 500; vertical-align: top;">
          ${escapeHtml(qa.answer)}
        </td>
      </tr>`
    )
    .join("")

  const qaRowsText = request.questionsAndAnswers
    .map((qa) => `Q${qa.questionNumber}. ${qa.questionEn}: ${qa.answer}`)
    .join("\n")

  let contactActionHtml = escapeHtml(request.contactDisplay)
  if (request.email) {
    contactActionHtml = `<a href="mailto:${escapeHtml(request.email)}" style="color: #D4AF37; text-decoration: underline;">${escapeHtml(request.email)}</a>`
  } else if (request.instagramUrl && request.instagramHandle) {
    contactActionHtml = `<a href="${escapeHtml(request.instagramUrl)}" target="_blank" rel="noopener noreferrer" style="color: #D4AF37; text-decoration: underline;">@${escapeHtml(request.instagramHandle)}</a>`
  }

  const additionalInfoBlock = request.additionalInfo
    ? `
      <div style="margin-top: 24px; padding: 16px; background-color: #111111; border: 1px solid #262626; border-radius: 6px;">
        <p style="margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #D4AF37;">Additional Customer Notes</p>
        <p style="margin: 0; font-size: 14px; color: #e5e5e5; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(request.additionalInfo)}</p>
      </div>`
    : ""

  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; background-color: #000000; color: #ffffff; padding: 36px 28px; border-radius: 8px; border: 1px solid #262626;">
      <div style="text-align: center; margin-bottom: 28px; border-bottom: 1px solid #262626; padding-bottom: 20px;">
        <p style="margin: 0; color: #D4AF37; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">White-Glove Concierge Lead</p>
        <h1 style="margin: 8px 0 0 0; color: #ffffff; font-size: 24px; font-weight: 400; letter-spacing: 1px;">M&amp;G JEWELRY</h1>
      </div>

      <p style="font-size: 15px; line-height: 1.6; color: #d4d4d4; margin-bottom: 20px;">
        A customer has completed the <strong>White-Glove Quiz</strong> on M&amp;G Jewelry. Review their full profile and preferences below:
      </p>

      <div style="background-color: #0d0d0d; border: 1px solid #262626; border-radius: 6px; padding: 18px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #a3a3a3; font-size: 13px; width: 40%;">Submission ID:</td>
            <td style="padding: 6px 0; color: #ffffff; font-size: 13px; font-family: monospace;">${escapeHtml(request.id)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #a3a3a3; font-size: 13px;">Submitted At:</td>
            <td style="padding: 6px 0; color: #ffffff; font-size: 13px;">${escapeHtml(formattedDate)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #a3a3a3; font-size: 13px;">Preferred Contact Method:</td>
            <td style="padding: 6px 0; color: #D4AF37; font-size: 13px; font-weight: 600;">${escapeHtml(request.preferredContact)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #a3a3a3; font-size: 13px;">Customer Contact:</td>
            <td style="padding: 6px 0; color: #ffffff; font-size: 14px; font-weight: 600;">${contactActionHtml}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #a3a3a3; font-size: 13px;">Status:</td>
            <td style="padding: 6px 0; color: #ffffff; font-size: 13px;">${escapeHtml(request.status)}</td>
          </tr>
        </table>
      </div>

      <h2 style="font-size: 15px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #D4AF37; margin: 24px 0 12px 0;">
        Complete Quiz Responses
      </h2>
      <table style="width: 100%; border-collapse: collapse; background-color: #0a0a0a; border: 1px solid #262626; border-radius: 6px; overflow: hidden;">
        <tbody>
          ${qaRowsHtml}
        </tbody>
      </table>

      ${additionalInfoBlock}

      <div style="text-align: center; margin-top: 32px; margin-bottom: 16px;">
        <a href="${escapeHtml(adminUrl)}" style="display: inline-block; background-color: #ffffff; color: #000000; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 4px; letter-spacing: 0.5px;">
          View Request in Admin Dashboard
        </a>
      </div>

      <p style="text-align: center; font-size: 12px; color: #737373; margin-top: 24px; border-top: 1px solid #262626; padding-top: 16px;">
        M&amp;G Jewelry Admin Notification • Direct link: ${escapeHtml(adminUrl)}
      </p>
    </div>
  `

  const text = [
    "NEW WHITE-GLOVE REQUEST — M&G JEWELRY",
    "======================================",
    `Submission ID: ${request.id}`,
    `Date & Time: ${formattedDate}`,
    `Preferred Contact Method: ${request.preferredContact}`,
    `Customer Contact: ${request.contactDisplay}`,
    `Status: ${request.status}`,
    "",
    "QUIZ QUESTIONS & ANSWERS:",
    qaRowsText,
    request.additionalInfo ? `\nAdditional Info: ${request.additionalInfo}` : "",
    "",
    `View in Admin Dashboard: ${adminUrl}`,
  ]
    .filter(Boolean)
    .join("\n")

  return { subject, html, text }
}

/**
 * Builds the luxury confirmation email sent to the customer when they provide an email address.
 * Subject: We've Received Your White-Glove Request | M&G Jewelry
 */
export function buildCustomerConfirmationEmail(
  request: WhiteGloveAdminRequest
): { subject: string; html: string; text: string } {
  const subject = "We've Received Your White-Glove Request | M&G Jewelry"

  const summaryRowsHtml = request.questionsAndAnswers
    .filter((qa) => qa.id !== "q11")
    .map(
      (qa) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #222222; color: #a3a3a3; font-size: 13px; width: 48%;">
          ${escapeHtml(qa.questionEn)}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #222222; color: #ffffff; font-size: 13px; font-weight: 500;">
          ${escapeHtml(qa.answer)}
        </td>
      </tr>`
    )
    .join("")

  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #000000; color: #ffffff; padding: 40px 32px; border-radius: 8px; border: 1px solid #262626;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #D4AF37; font-size: 26px; font-weight: 300; letter-spacing: 3px; text-transform: uppercase; margin: 0;">M&amp;G JEWELRY</h1>
        <div style="height: 1px; background-color: #D4AF37; width: 60px; margin: 18px auto 0 auto;"></div>
      </div>

      <h2 style="font-size: 22px; font-weight: 400; text-align: center; color: #ffffff; margin: 0 0 20px 0;">
        Your White-Glove Experience Begins Here.
      </h2>

      <p style="font-size: 15px; line-height: 1.7; color: #d4d4d4; text-align: center; margin-bottom: 28px;">
        Thank you for choosing M&amp;G Jewelry. We've received your preferences, and our team will personally review your request to help you find the perfect piece. We look forward to connecting with you.
      </p>

      <div style="background-color: #0d0d0d; border: 1px solid #262626; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0 0 10px 0; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: #D4AF37;">
          Your Request Summary (Ref: ${escapeHtml(request.id)})
        </p>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            ${summaryRowsHtml}
          </tbody>
        </table>
      </div>

      <div style="text-align: center; margin-top: 36px; font-size: 13px; color: #888888; border-top: 1px solid #262626; padding-top: 20px;">
        <p style="margin: 0; color: #cccccc;">With appreciation,<br/><strong>The M&amp;G Jewelry Concierge Team</strong></p>
        <p style="font-size: 12px; margin-top: 8px; color: #666666;">www.mngjewelry.com</p>
      </div>
    </div>
  `

  const text = [
    "M&G JEWELRY — Your White-Glove Experience Begins Here.",
    "",
    "Thank you for choosing M&G Jewelry. We've received your preferences, and our team will personally review your request to help you find the perfect piece. We look forward to connecting with you.",
    "",
    `Request Reference: ${request.id}`,
    "",
    "Your Preferences:",
    ...request.questionsAndAnswers
      .filter((qa) => qa.id !== "q11")
      .map((qa) => `- ${qa.questionEn}: ${qa.answer}`),
    "",
    "With appreciation,",
    "The M&G Jewelry Concierge Team",
  ].join("\n")

  return { subject, html, text }
}

/**
 * Default server-side email sender supporting:
 * 1. Resend HTTP API (if RESEND_API_KEY is configured)
 * 2. Nodemailer SMTP (if SMTP_USER & SMTP_PASS are configured, matching lib/actions/vip.ts)
 */
export const defaultMailSender: MailTransportSender = async (msg) => {
  const fromAddress =
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    (process.env.SMTP_USER ? `"M&G Jewelry" <${process.env.SMTP_USER}>` : `"M&G Jewelry" <noreply@mngjewelry.com>`)

  // Option 1: Resend API if configured
  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      }),
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => "")
      throw new Error(`Resend API error (${response.status}): ${errBody.slice(0, 200)}`)
    }
    const data: any = await response.json().catch(() => ({}))
    return { sent: true, messageId: data?.id || "resend_ok" }
  }

  // Option 2: Nodemailer SMTP if configured
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = parseInt(process.env.SMTP_PORT || "465", 10)
    const secure = process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === "true"
      : port === 465

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const info = await transporter.sendMail({
      from: fromAddress,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      ...(msg.replyTo ? { replyTo: msg.replyTo } : {}),
    })

    return { sent: true, messageId: info.messageId || "smtp_ok" }
  }

  return {
    sent: false,
    skippedReason:
      "Email transport credentials are not configured (set SMTP_USER & SMTP_PASS or RESEND_API_KEY).",
  }
}

/**
 * Parses a raw QuizSubmission database row (both v2 structured JSON and v1 legacy JSON)
 * into a normalized WhiteGloveAdminRequest.
 */
export function parseQuizSubmissionRecord(record: {
  id: string
  answers: string
  preferredContact: string
  createdAt: Date | string
}): WhiteGloveAdminRequest {
  const createdAtIso =
    record.createdAt instanceof Date
      ? record.createdAt.toISOString()
      : new Date(record.createdAt || Date.now()).toISOString()

  let parsed: any = {}
  try {
    parsed = JSON.parse(record.answers || "{}")
  } catch {
    parsed = {}
  }

  // Check if this is a v2 structured payload
  if (parsed && typeof parsed === "object" && parsed.schemaVersion >= 2 && parsed.contact) {
    const payload = parsed as WhiteGloveStoredPayload
    const status: WhiteGloveStatus = WHITE_GLOVE_STATUSES.includes(payload.status)
      ? payload.status
      : "New"
    const email = payload.contact.email || null
    const igHandle = payload.contact.instagramHandle || null
    const igUrl =
      payload.contact.instagramUrl ||
      (igHandle ? `https://www.instagram.com/${encodeURIComponent(igHandle)}` : null)

    return {
      id: record.id,
      createdAt: payload.submittedAt || createdAtIso,
      updatedAt: payload.updatedAt || createdAtIso,
      status,
      locale: payload.locale || "en",
      preferredContact: payload.contact.method,
      contactDisplay: payload.contact.displayValue || record.preferredContact,
      email,
      instagramHandle: igHandle,
      instagramUrl: igUrl,
      phone: payload.contact.phone || null,
      mailtoHref: email
        ? `mailto:${email}?subject=${encodeURIComponent("Your White-Glove Request at M&G Jewelry")}`
        : null,
      questionsAndAnswers: Array.isArray(payload.questionsAndAnswers)
        ? payload.questionsAndAnswers
        : [],
      rawAnswers: payload.rawAnswers || {},
      preferences: payload.preferences || {},
      additionalInfo: payload.additionalInfo || "",
      adminNotes: payload.adminNotes || "",
      notifications: payload.notifications || {
        adminEmail: { status: "pending", attempts: 0 },
        customerEmail: { status: "pending", attempts: 0 },
      },
      statusHistory: Array.isArray(payload.statusHistory) ? payload.statusHistory : [],
    }
  }

  // Fallback for legacy flat JSON map (e.g., { q1: 'Me', q2: '$150 - $350', ... })
  const rawAnswers: Record<string, string> =
    parsed && typeof parsed === "object" ? parsed : {}
  let method: WhiteGloveContactMethod = "Email"
  try {
    method = normalizeContactMethod(record.preferredContact || rawAnswers.q11)
  } catch {
    method = "Instagram"
  }

  const rawContactStr = String(rawAnswers._finalContact || record.preferredContact || "")
  let email: string | null = null
  let instagramHandle: string | null = null
  let instagramUrl: string | null = null
  let phone: string | null = null
  let contactDisplay = rawContactStr || method

  if (method === "Email") {
    const extracted = rawContactStr.replace(/^email:\s*/i, "").trim()
    const check = validateAndNormalizeEmail(extracted)
    if (check.valid && check.email) {
      email = check.email
      contactDisplay = check.email
    }
  } else if (method === "Instagram") {
    const extracted = rawContactStr.replace(/^instagram(?:\s*dm)?:\s*/i, "").trim()
    const check = validateAndNormalizeInstagram(extracted)
    if (check.valid && check.handle) {
      instagramHandle = check.handle
      instagramUrl = check.profileUrl || null
      contactDisplay = `@${check.handle}`
    }
  } else {
    phone = rawContactStr.replace(/^(?:whatsapp|phone text):\s*/i, "").trim() || null
    if (phone) contactDisplay = phone
  }

  const questionsAndAnswers: WhiteGloveQuestionAnswer[] = DEFAULT_QUIZ_QUESTIONS.map(
    (q, idx) => ({
      id: q.id,
      questionNumber: idx + 1,
      questionEn: q.label_en,
      questionEs: q.label_es,
      answer:
        q.id === "q11"
          ? `${method} (${contactDisplay})`
          : String(rawAnswers[q.id] || "Not answered"),
      isConditional: q.isConditional,
    })
  )

  return {
    id: record.id,
    createdAt: createdAtIso,
    updatedAt: createdAtIso,
    status: "New",
    locale: "en",
    preferredContact: method,
    contactDisplay,
    email,
    instagramHandle,
    instagramUrl,
    phone,
    mailtoHref: email
      ? `mailto:${email}?subject=${encodeURIComponent("Your White-Glove Request at M&G Jewelry")}`
      : null,
    questionsAndAnswers,
    rawAnswers,
    preferences: {
      recipient: rawAnswers.q1,
      budget: rawAnswers.q2,
      pieceType: rawAnswers.q3,
      style: rawAnswers.q4,
      metal: rawAnswers.q5,
      usage: rawAnswers.q6,
      wearsWatch: rawAnswers.q7,
      sizing: rawAnswers.q8,
      deadline: rawAnswers.q9,
      stonePreference: rawAnswers.q10,
    },
    additionalInfo: String(rawAnswers.additionalInfo || ""),
    adminNotes: "",
    notifications: {
      adminEmail: { status: "skipped_unconfigured", attempts: 0 },
      customerEmail: { status: "skipped_unconfigured", attempts: 0 },
    },
    statusHistory: [{ status: "New", changedAt: createdAtIso }],
  }
}

// In-memory rate-limit window tracker (per IP / contact identifier)
const submissionRateBuckets = new Map<string, number[]>()

export function checkSubmissionRateLimit(
  identifier: string,
  maxRequests = 5,
  windowMs = 60_000,
  now = Date.now()
): { allowed: boolean; retryAfterSeconds?: number } {
  const key = identifier.trim().toLowerCase() || "anonymous"
  const existing = (submissionRateBuckets.get(key) || []).filter((t) => now - t < windowMs)
  if (existing.length >= maxRequests) {
    const oldest = existing[0]
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000))
    return { allowed: false, retryAfterSeconds }
  }
  existing.push(now)
  submissionRateBuckets.set(key, existing)
  return { allowed: true }
}

export function resetSubmissionRateLimitForTests() {
  submissionRateBuckets.clear()
}

/**
 * Creates the White-Glove Quiz & Lead Management service.
 */
export function createWhiteGloveService(
  db: any,
  mailSender: MailTransportSender = defaultMailSender
) {
  /**
   * Sends pending/failed notifications for a saved QuizSubmission and updates its notification state.
   * Never throws or loses the submission if email delivery fails.
   */
  async function dispatchNotifications(
    submissionId: string,
    payload: WhiteGloveStoredPayload
  ): Promise<WhiteGloveAdminRequest> {
    let siteSettingsEmail: string | null = null
    try {
      if (db.siteSettings && typeof db.siteSettings.findUnique === "function") {
        const settings = await db.siteSettings.findUnique({ where: { id: "main" } })
        siteSettingsEmail = settings?.contactEmail || null
      }
    } catch {
      siteSettingsEmail = null
    }

    const adminRecipient = getBusinessNotificationEmail(siteSettingsEmail)
    const nowIso = new Date().toISOString()

    // Reconstruct admin request view for email templates
    const currentView = parseQuizSubmissionRecord({
      id: submissionId,
      answers: JSON.stringify(payload),
      preferredContact: `${payload.contact.method}: ${payload.contact.displayValue}`,
      createdAt: payload.submittedAt,
    })

    // 1. Business Notification Email (always triggered if not already sent)
    if (payload.notifications.adminEmail.status !== "sent") {
      payload.notifications.adminEmail.attempts =
        (payload.notifications.adminEmail.attempts || 0) + 1
      payload.notifications.adminEmail.recipient = adminRecipient

      try {
        const adminMail = buildBusinessNotificationEmail(currentView)
        const res = await mailSender({
          to: adminRecipient,
          subject: adminMail.subject,
          html: adminMail.html,
          text: adminMail.text,
          replyTo: payload.contact.email || undefined,
        })

        if (res.sent) {
          payload.notifications.adminEmail.status = "sent"
          payload.notifications.adminEmail.sentAt = nowIso
          payload.notifications.adminEmail.messageId = res.messageId
          delete payload.notifications.adminEmail.error
        } else {
          payload.notifications.adminEmail.status = "skipped_unconfigured"
          payload.notifications.adminEmail.error = res.skippedReason
        }
      } catch (err: any) {
        payload.notifications.adminEmail.status = "failed"
        payload.notifications.adminEmail.error = sanitizeText(
          err?.message || "Failed to send business notification email",
          300
        )
      }
    }

    // 2. Customer Confirmation Email (only when customer provided an email address)
    if (payload.contact.email) {
      if (payload.notifications.customerEmail.status !== "sent") {
        payload.notifications.customerEmail.attempts =
          (payload.notifications.customerEmail.attempts || 0) + 1
        payload.notifications.customerEmail.recipient = payload.contact.email

        try {
          const customerMail = buildCustomerConfirmationEmail(currentView)
          const res = await mailSender({
            to: payload.contact.email,
            subject: customerMail.subject,
            html: customerMail.html,
            text: customerMail.text,
          })

          if (res.sent) {
            payload.notifications.customerEmail.status = "sent"
            payload.notifications.customerEmail.sentAt = nowIso
            payload.notifications.customerEmail.messageId = res.messageId
            delete payload.notifications.customerEmail.error
          } else {
            payload.notifications.customerEmail.status = "skipped_unconfigured"
            payload.notifications.customerEmail.error = res.skippedReason
          }
        } catch (err: any) {
          payload.notifications.customerEmail.status = "failed"
          payload.notifications.customerEmail.error = sanitizeText(
            err?.message || "Failed to send customer confirmation email",
            300
          )
        }
      }
    } else {
      payload.notifications.customerEmail.status = "skipped_not_applicable"
    }

    payload.updatedAt = new Date().toISOString()

    // Persist updated notification statuses back to QuizSubmission
    const updatedRow = await db.quizSubmission.update({
      where: { id: submissionId },
      data: {
        answers: JSON.stringify(payload),
      },
    })

    return parseQuizSubmissionRecord(updatedRow)
  }

  /**
   * Validates, deduplicates, persists a White-Glove Quiz submission, and triggers notifications.
   */
  async function submitQuiz(input: SubmitWhiteGloveInput) {
    if (!input || typeof input.answers !== "object" || !input.answers) {
      throw new Error("Please complete the quiz questions before submitting.")
    }

    const method = normalizeContactMethod(
      input.preferredContactMethod || input.answers.q11
    )
    const rawContactInput = sanitizeText(input.contactValue, 254)
    if (!rawContactInput) {
      throw new Error(
        method === "Email"
          ? "Please enter your email address."
          : method === "Instagram"
            ? "Please enter your Instagram username."
            : "Please enter your contact information."
      )
    }

    // Validate & normalize contact details based on chosen method
    let email: string | undefined
    let instagramHandle: string | undefined
    let instagramUrl: string | undefined
    let phone: string | undefined
    let displayValue = rawContactInput

    if (method === "Email") {
      const check = validateAndNormalizeEmail(rawContactInput)
      if (!check.valid || !check.email) {
        throw new Error(check.error || "Invalid email address.")
      }
      email = check.email
      displayValue = check.email
    } else if (method === "Instagram") {
      const check = validateAndNormalizeInstagram(rawContactInput)
      if (!check.valid || !check.handle) {
        throw new Error(check.error || "Invalid Instagram username.")
      }
      instagramHandle = check.handle
      instagramUrl = check.profileUrl
      displayValue = `@${check.handle}`
    } else {
      const check = validateAndNormalizePhone(rawContactInput, input.phonePrefix || "+1")
      if (!check.valid || !check.phone) {
        throw new Error(check.error || "Invalid phone number.")
      }
      phone = check.phone
      displayValue = check.phone
    }

    // Sanitize all answers dynamically (preserving any future or conditional questions)
    const cleanAnswers: Record<string, string> = {}
    for (const [key, val] of Object.entries(input.answers)) {
      if (key.startsWith("_")) continue
      const cleanKey = sanitizeText(key, 64)
      const cleanVal = sanitizeText(val, 500)
      if (cleanKey && cleanVal) {
        cleanAnswers[cleanKey] = cleanVal
      }
    }
    cleanAnswers.q11 = method === "Instagram" ? "Instagram DM" : method

    // Ensure questions were actually answered (at least the core quiz questions)
    const answeredCount = Object.keys(cleanAnswers).filter((k) => k !== "q11").length
    if (answeredCount === 0) {
      throw new Error("Please answer the quiz questions before submitting.")
    }

    const cleanIdempotencyKey = sanitizeText(input.idempotencyKey, 120) || undefined
    const additionalInfo = sanitizeText(input.additionalInfo, 1000) || undefined

    // Idempotency / duplicate-click check:
    // Inspect recent submissions (last 10 minutes) for matching idempotencyKey or identical contact + answers
    const recentSubmissions = await db.quizSubmission.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
    })

    const nowMs = Date.now()
    for (const existingRow of recentSubmissions) {
      try {
        const existingParsed = JSON.parse(existingRow.answers || "{}")
        const createdMs = new Date(existingRow.createdAt).getTime()
        const isRecent = nowMs - createdMs < 10 * 60 * 1000 // 10 minutes

        if (
          cleanIdempotencyKey &&
          existingParsed?.idempotencyKey &&
          existingParsed.idempotencyKey === cleanIdempotencyKey
        ) {
          const existingReq = parseQuizSubmissionRecord(existingRow)
          return {
            success: true,
            deduplicated: true,
            submissionId: existingRow.id,
            request: existingReq,
          }
        }

        if (
          isRecent &&
          nowMs - createdMs < 60 * 1000 && // 60 seconds identical payload guard
          existingParsed?.contact?.method === method &&
          existingParsed?.contact?.displayValue === displayValue &&
          JSON.stringify(existingParsed?.rawAnswers) === JSON.stringify(cleanAnswers)
        ) {
          const existingReq = parseQuizSubmissionRecord(existingRow)
          return {
            success: true,
            deduplicated: true,
            submissionId: existingRow.id,
            request: existingReq,
          }
        }
      } catch {
        // Ignore malformed legacy rows
      }
    }

    // Rate limiting check (per client IP or contact displayValue)
    const rateKey = input.clientIp || displayValue
    const rateCheck = checkSubmissionRateLimit(rateKey)
    if (!rateCheck.allowed) {
      throw new Error(
        `Too many requests. Please wait ${rateCheck.retryAfterSeconds || 30} seconds before trying again.`
      )
    }

    // Build structured, versioned questionsAndAnswers list
    const questionDefs =
      Array.isArray(input.questions) && input.questions.length > 0
        ? input.questions
        : DEFAULT_QUIZ_QUESTIONS

    const seenKeys = new Set<string>()
    const questionsAndAnswers: WhiteGloveQuestionAnswer[] = []

    questionDefs.forEach((qDef, idx) => {
      seenKeys.add(qDef.id)
      const rawAns =
        qDef.id === "q11"
          ? `${method} (${displayValue})`
          : cleanAnswers[qDef.id] || "Not answered"
      questionsAndAnswers.push({
        id: qDef.id,
        questionNumber: idx + 1,
        questionEn: sanitizeText(qDef.label_en, 250) || qDef.id,
        questionEs: sanitizeText(qDef.label_es, 250) || undefined,
        answer: rawAns,
        isConditional: Boolean(qDef.isConditional || qDef.id === "q8"),
      })
    })

    // Append any additional/future dynamic questions not in questionDefs so no answer is ever lost
    for (const [k, v] of Object.entries(cleanAnswers)) {
      if (!seenKeys.has(k)) {
        questionsAndAnswers.push({
          id: k,
          questionNumber: questionsAndAnswers.length + 1,
          questionEn: k,
          answer: v,
        })
      }
    }

    const nowIso = new Date().toISOString()
    const payload: WhiteGloveStoredPayload = {
      schemaVersion: WHITE_GLOVE_SCHEMA_VERSION,
      submittedAt: nowIso,
      updatedAt: nowIso,
      status: "New",
      locale: input.locale === "es" ? "es" : "en",
      idempotencyKey: cleanIdempotencyKey,
      contact: {
        method,
        rawInput: rawContactInput,
        displayValue,
        ...(email ? { email } : {}),
        ...(instagramHandle ? { instagramHandle, instagramUrl } : {}),
        ...(phone ? { phone } : {}),
      },
      questionsAndAnswers,
      rawAnswers: cleanAnswers,
      preferences: {
        recipient: cleanAnswers.q1,
        budget: cleanAnswers.q2,
        pieceType: cleanAnswers.q3,
        style: cleanAnswers.q4,
        metal: cleanAnswers.q5,
        usage: cleanAnswers.q6,
        wearsWatch: cleanAnswers.q7,
        sizing: cleanAnswers.q8,
        deadline: cleanAnswers.q9,
        stonePreference: cleanAnswers.q10,
      },
      ...(additionalInfo ? { additionalInfo } : {}),
      notifications: {
        adminEmail: { status: "pending", attempts: 0 },
        customerEmail: {
          status: email ? "pending" : "skipped_not_applicable",
          attempts: 0,
        },
      },
      statusHistory: [{ status: "New", changedAt: nowIso }],
    }

    // 1. Save submission in QuizSubmission table first (guaranteed persistence before email attempt)
    const created = await db.quizSubmission.create({
      data: {
        answers: JSON.stringify(payload),
        preferredContact: `${method}: ${displayValue}`,
      },
    })

    payload.submissionId = created.id

    // 2. Dispatch business & customer emails (never loses the saved record if email fails)
    const finalRequest = await dispatchNotifications(created.id, payload)

    return {
      success: true,
      deduplicated: false,
      submissionId: created.id,
      request: finalRequest,
    }
  }

  /**
   * Lists all White-Glove quiz submissions sorted newest-first by default,
   * plus the count of unreviewed ('New') requests.
   */
  async function listRequests(options?: {
    status?: string
    search?: string
    sortOrder?: "desc" | "asc"
  }): Promise<{
    requests: WhiteGloveAdminRequest[]
    newCount: number
    totalCount: number
  }> {
    const sortOrder = options?.sortOrder === "asc" ? "asc" : "desc"
    const rows = await db.quizSubmission.findMany({
      orderBy: { createdAt: sortOrder },
    })

    const allRequests: WhiteGloveAdminRequest[] = rows.map(parseQuizSubmissionRecord)
    const newCount = allRequests.filter((r) => r.status === "New").length

    let filtered = allRequests
    if (options?.status && options.status !== "all") {
      filtered = filtered.filter(
        (r) => r.status.toLowerCase() === options.status!.toLowerCase()
      )
    }

    if (options?.search && options.search.trim() !== "") {
      const q = options.search.trim().toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.contactDisplay.toLowerCase().includes(q) ||
          (r.email && r.email.toLowerCase().includes(q)) ||
          (r.instagramHandle && r.instagramHandle.toLowerCase().includes(q)) ||
          (r.phone && r.phone.toLowerCase().includes(q))
      )
    }

    return {
      requests: filtered,
      newCount,
      totalCount: allRequests.length,
    }
  }

  /**
   * Returns the count of unreviewed ('New') White-Glove requests for the Admin sidebar badge.
   */
  async function getNewRequestsCount(): Promise<number> {
    try {
      const rows = await db.quizSubmission.findMany({
        orderBy: { createdAt: "desc" },
      })
      return rows
        .map(parseQuizSubmissionRecord)
        .filter((r: WhiteGloveAdminRequest) => r.status === "New").length
    } catch {
      return 0
    }
  }

  /**
   * Updates the status (and optional admin notes) of a White-Glove request.
   */
  async function updateRequestStatus(
    id: string,
    newStatus: WhiteGloveStatus,
    adminNotes?: string
  ): Promise<WhiteGloveAdminRequest> {
    if (!id) {
      throw new Error("Request ID is required.")
    }
    if (!WHITE_GLOVE_STATUSES.includes(newStatus)) {
      throw new Error(
        `Invalid status "${newStatus}". Must be one of: ${WHITE_GLOVE_STATUSES.join(", ")}`
      )
    }

    const row = await db.quizSubmission.findUnique({ where: { id } })
    if (!row) {
      throw new Error("White-Glove request not found.")
    }

    const current = parseQuizSubmissionRecord(row)
    const nowIso = new Date().toISOString()

    const nextPayload: WhiteGloveStoredPayload = {
      schemaVersion: WHITE_GLOVE_SCHEMA_VERSION,
      submissionId: row.id,
      submittedAt: current.createdAt,
      updatedAt: nowIso,
      status: newStatus,
      locale: current.locale,
      contact: {
        method: current.preferredContact,
        rawInput: current.contactDisplay,
        displayValue: current.contactDisplay,
        ...(current.email ? { email: current.email } : {}),
        ...(current.instagramHandle
          ? {
              instagramHandle: current.instagramHandle,
              instagramUrl: current.instagramUrl || undefined,
            }
          : {}),
        ...(current.phone ? { phone: current.phone } : {}),
      },
      questionsAndAnswers: current.questionsAndAnswers,
      rawAnswers: current.rawAnswers,
      preferences: current.preferences,
      ...(current.additionalInfo ? { additionalInfo: current.additionalInfo } : {}),
      adminNotes:
        adminNotes !== undefined
          ? sanitizeText(adminNotes, 2000)
          : current.adminNotes,
      notifications: current.notifications,
      statusHistory: [
        ...current.statusHistory,
        ...(current.status !== newStatus
          ? [{ status: newStatus, changedAt: nowIso }]
          : []),
      ],
    }

    const updated = await db.quizSubmission.update({
      where: { id },
      data: {
        answers: JSON.stringify(nextPayload),
      },
    })

    return parseQuizSubmissionRecord(updated)
  }

  /**
   * Safely retries failed or pending email notifications for an existing request
   * without re-sending notifications that were already delivered.
   */
  async function retryNotifications(id: string): Promise<WhiteGloveAdminRequest> {
    const row = await db.quizSubmission.findUnique({ where: { id } })
    if (!row) {
      throw new Error("White-Glove request not found.")
    }

    const current = parseQuizSubmissionRecord(row)
    const payload: WhiteGloveStoredPayload = {
      schemaVersion: WHITE_GLOVE_SCHEMA_VERSION,
      submissionId: row.id,
      submittedAt: current.createdAt,
      updatedAt: current.updatedAt,
      status: current.status,
      locale: current.locale,
      contact: {
        method: current.preferredContact,
        rawInput: current.contactDisplay,
        displayValue: current.contactDisplay,
        ...(current.email ? { email: current.email } : {}),
        ...(current.instagramHandle
          ? {
              instagramHandle: current.instagramHandle,
              instagramUrl: current.instagramUrl || undefined,
            }
          : {}),
        ...(current.phone ? { phone: current.phone } : {}),
      },
      questionsAndAnswers: current.questionsAndAnswers,
      rawAnswers: current.rawAnswers,
      preferences: current.preferences,
      ...(current.additionalInfo ? { additionalInfo: current.additionalInfo } : {}),
      ...(current.adminNotes ? { adminNotes: current.adminNotes } : {}),
      notifications: current.notifications,
      statusHistory: current.statusHistory,
    }

    return dispatchNotifications(id, payload)
  }

  return {
    submitQuiz,
    listRequests,
    getNewRequestsCount,
    updateRequestStatus,
    retryNotifications,
  }
}
