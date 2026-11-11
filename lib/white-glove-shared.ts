export const WHITE_GLOVE_SCHEMA_VERSION = 2

export const WHITE_GLOVE_STATUSES = [
  "New",
  "Contacted",
  "In Progress",
  "Quoted",
  "Awaiting Payment",
  "Paid",
  "In Production",
  "Shipped",
  "Cancelled",
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
  status: "sending" | "uncertain" | "pending" | "sent" | "failed" | "skipped_unconfigured" | "skipped_not_applicable"
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
  linkedOrderId?: string
  contactHistory?: Array<{ channel: WhiteGloveContactMethod; note: string; recordedAt: string }>
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
  linkedOrderId?: string
  contactHistory?: Array<{ channel: WhiteGloveContactMethod; note: string; recordedAt: string }>
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

