import test from "node:test"
import assert from "node:assert/strict"
import nodemailer from "nodemailer"
import {
  createWhiteGloveService,
  createMailSender,
  getBusinessNotificationEmail,
  getEmailDeliveryConfigStatus,
  OFFICIAL_ADMIN_NOTIFICATION_EMAIL,
  validateAndNormalizeEmail,
  validateAndNormalizeInstagram,
  resetSubmissionRateLimitForTests,
  type EmailMessagePayload,
} from "../lib/white-glove"
import { validateAdminRole } from "../lib/actions/auth-helper"

function createMockQuizDb() {
  const rows: Array<{
    id: string
    answers: string
    preferredContact: string
    createdAt: Date
  }> = []
  let seq = 1

  const db = {
    siteSettings: {
      findUnique: async () => ({
        id: "main",
        contactEmail: "concierge@mngjewelry.com",
      }),
    },
    quizSubmission: {
      create: async ({ data }: any) => {
        const record = {
          id: `wg_req_${seq++}_${Date.now()}`,
          answers: data.answers,
          preferredContact: data.preferredContact,
          createdAt: new Date(),
        }
        rows.push(record)
        return structuredClone(record)
      },
      findMany: async ({ orderBy, take }: any = {}) => {
        const sorted = [...rows].sort((a, b) => {
          const dir = orderBy?.createdAt === "asc" ? 1 : -1
          return (a.createdAt.getTime() - b.createdAt.getTime()) * dir
        })
        const sliced = typeof take === "number" ? sorted.slice(0, take) : sorted
        return structuredClone(sliced)
      },
      findUnique: async ({ where }: any) => {
        const found = rows.find((r) => r.id === where.id)
        return found ? structuredClone(found) : null
      },
      updateMany: async ({ where, data }: any) => {
        const row = rows.find(r => r.id === where.id && r.answers === where.answers)
        if (!row) return { count: 0 }
        Object.assign(row, data)
        return { count: 1 }
      },
      update: async ({ where, data }: any) => {
        const idx = rows.findIndex((r) => r.id === where.id)
        if (idx === -1) throw new Error("QuizSubmission not found")
        rows[idx] = {
          ...rows[idx],
          ...data,
        }
        return structuredClone(rows[idx])
      },
    },
    _rows: rows,
  }

  return db
}

const SAMPLE_ANSWERS: Record<string, string> = {
  q1: "Gift",
  q2: "$550 - $1200",
  q3: "Chain",
  q4: "Street-Lux",
  q5: "Yellow",
  q6: "Daily",
  q7: "Yes",
  q8: '20"',
  q9: "2 weeks",
  q10: "Natural Stones",
}

test("Validation helpers: validate emails and normalize Instagram usernames safely", () => {
  // Email validation
  assert.equal(validateAndNormalizeEmail("  VIP.Client@Example.com ").valid, true)
  assert.equal(
    validateAndNormalizeEmail("  VIP.Client@Example.com ").email,
    "vip.client@example.com"
  )
  assert.equal(validateAndNormalizeEmail("not-an-email").valid, false)
  assert.equal(validateAndNormalizeEmail("").valid, false)

  // Instagram handle & URL normalization
  const ig1 = validateAndNormalizeInstagram("@mng_luxury.client")
  assert.equal(ig1.valid, true)
  assert.equal(ig1.handle, "mng_luxury.client")
  assert.equal(ig1.display, "@mng_luxury.client")
  assert.equal(ig1.profileUrl, "https://www.instagram.com/mng_luxury.client")

  const ig2 = validateAndNormalizeInstagram("https://www.instagram.com/gold_collector99/?hl=en")
  assert.equal(ig2.valid, true)
  assert.equal(ig2.handle, "gold_collector99")
  assert.equal(ig2.display, "@gold_collector99")
  assert.equal(ig2.profileUrl, "https://www.instagram.com/gold_collector99")

  // Invalid Instagram handles rejected
  assert.equal(validateAndNormalizeInstagram("invalid..dots").valid, false)
  assert.equal(validateAndNormalizeInstagram("<script>alert(1)</script>").valid, false)
})

test("Test A — Email contact: saves submission, appears in Admin, sends business notification & customer confirmation email", async () => {
  resetSubmissionRateLimitForTests()
  const prevAdminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
  process.env.ADMIN_NOTIFICATION_EMAIL = "owner@mngjewelry.com"

  try {
    const db = createMockQuizDb()
    const sentEmails: EmailMessagePayload[] = []
    const service = createWhiteGloveService(db, async (msg) => {
      sentEmails.push(msg)
      return { sent: true, messageId: `msg_${sentEmails.length}` }
    })

    const submitResult = await service.submitQuiz({
      answers: {
        ...SAMPLE_ANSWERS,
        q11: "Email",
        q12_future_custom_question: "18K Box Clasp Upgrade",
      },
      preferredContactMethod: "Email",
      contactValue: "Elena.Vance@Example.com",
      additionalInfo: "Looking for an anniversary gift box and custom engraving.",
      locale: "en",
      idempotencyKey: "idem_test_email_1",
    })

    assert.equal(submitResult.success, true)
    assert.equal(submitResult.deduplicated, false)
    assert.ok(submitResult.submissionId.startsWith("wg_req_"))

    // 1. Verify saved in database & appears in Admin > White-Glove Requests
    const { requests, newCount, totalCount } = await service.listRequests()
    assert.equal(totalCount, 1)
    assert.equal(newCount, 1, "Unreviewed badge must count 1 New request")

    const saved = requests[0]
    assert.equal(saved.id, submitResult.submissionId)
    assert.equal(saved.status, "New")
    assert.equal(saved.preferredContact, "Email")
    assert.equal(saved.email, "elena.vance@example.com")
    assert.equal(saved.contactDisplay, "elena.vance@example.com")
    assert.ok(saved.mailtoHref?.startsWith("mailto:elena.vance@example.com"))
    assert.equal(
      saved.additionalInfo,
      "Looking for an anniversary gift box and custom engraving."
    )

    // 2. Verify all answers (including conditional q8 sizing and future q12 question) are stored
    assert.equal(saved.preferences.pieceType, "Chain")
    assert.equal(saved.preferences.sizing, '20"')
    assert.equal(saved.preferences.budget, "$550 - $1200")
    assert.ok(
      saved.questionsAndAnswers.some(
        (qa) => qa.id === "q8" && qa.answer === '20"' && qa.isConditional === true
      ),
      "Conditional sizing answer must be preserved"
    )
    assert.ok(
      saved.questionsAndAnswers.some(
        (qa) =>
          qa.id === "q12_future_custom_question" &&
          qa.answer === "18K Box Clasp Upgrade"
      ),
      "Future dynamic quiz questions must be preserved without data loss"
    )

    // 3. Verify Business Notification Email and Customer Confirmation Email
    assert.equal(sentEmails.length, 2, "Must send 1 business email + 1 customer email")

    const businessEmail = sentEmails[0]
    assert.equal(businessEmail.to, "owner@mngjewelry.com")
    assert.equal(businessEmail.subject, "New White-Glove Request — M&G Jewelry")
    assert.ok(businessEmail.html.includes(saved.id), "Business email must include Submission ID")
    assert.ok(
      businessEmail.html.includes("elena.vance@example.com"),
      "Business email must include customer contact"
    )
    assert.ok(
      businessEmail.html.includes("/admin/white-glove?requestId="),
      "Business email must include secure link to Admin Dashboard"
    )
    assert.ok(
      businessEmail.html.includes("Street-Lux") && businessEmail.html.includes("Natural Stones"),
      "Business email must include all quiz answers"
    )

    const customerEmail = sentEmails[1]
    assert.equal(customerEmail.to, "elena.vance@example.com")
    assert.equal(
      customerEmail.subject,
      "We've Received Your White-Glove Request | M&G Jewelry"
    )
    assert.ok(
      customerEmail.html.includes("Your White-Glove Experience Begins Here."),
      "Customer email must include confirmation heading"
    )
    assert.ok(
      customerEmail.html.includes(
        "Thank you for choosing M&amp;G Jewelry. We've received your preferences, and our team will personally review your request to help you find the perfect piece."
      )
    )
  } finally {
    if (prevAdminEmail === undefined) delete process.env.ADMIN_NOTIFICATION_EMAIL
    else process.env.ADMIN_NOTIFICATION_EMAIL = prevAdminEmail
  }
})

test("Test B — Instagram contact: normalizes handle, saves in DB, appears in Admin with profile link, notifies business by email, does not send fake IG DM", async () => {
  resetSubmissionRateLimitForTests()
  const db = createMockQuizDb()
  const sentEmails: EmailMessagePayload[] = []
  const service = createWhiteGloveService(db, async (msg) => {
    sentEmails.push(msg)
    return { sent: true, messageId: `msg_ig_${sentEmails.length}` }
  })

  const submitResult = await service.submitQuiz({
    answers: {
      ...SAMPLE_ANSWERS,
      q3: "Bracelet",
      q8: '7" - 7.5"',
      q11: "Instagram DM",
    },
    preferredContactMethod: "Instagram DM",
    contactValue: "@Golden_Wrist_TX",
    locale: "en",
    idempotencyKey: "idem_test_ig_1",
  })

  assert.equal(submitResult.success, true)

  const { requests } = await service.listRequests()
  assert.equal(requests.length, 1)
  const saved = requests[0]

  assert.equal(saved.preferredContact, "Instagram")
  assert.equal(saved.instagramHandle, "Golden_Wrist_TX")
  assert.equal(saved.contactDisplay, "@Golden_Wrist_TX")
  assert.equal(saved.instagramUrl, "https://www.instagram.com/Golden_Wrist_TX")
  assert.equal(saved.email, null)

  // Only business email is sent; customer email is marked skipped_not_applicable
  assert.equal(sentEmails.length, 1)
  assert.equal(sentEmails[0].subject, "New White-Glove Request — M&G Jewelry")
  assert.ok(sentEmails[0].html.includes("@Golden_Wrist_TX"))
  assert.ok(sentEmails[0].html.includes("https://www.instagram.com/Golden_Wrist_TX"))
  assert.equal(saved.notifications.adminEmail.status, "sent")
  assert.equal(saved.notifications.customerEmail.status, "skipped_not_applicable")
})

test("Test C — Persistence, status workflow, search/filter/sort, email failure resilience & safe retry, duplicate click prevention, and admin authorization", async () => {
  resetSubmissionRateLimitForTests()
  const db = createMockQuizDb()
  let shouldFailAdminEmail = true
  const sentEmails: EmailMessagePayload[] = []

  const service = createWhiteGloveService(db, async (msg) => {
    if (shouldFailAdminEmail && msg.subject.includes("New White-Glove Request")) {
      throw new Error("SMTP connection timeout")
    }
    sentEmails.push(msg)
    return { sent: true, messageId: `msg_retry_${sentEmails.length}` }
  })

  // 1. Submit while business email provider is temporarily unavailable -> submission MUST still be saved!
  const sub1 = await service.submitQuiz({
    answers: { ...SAMPLE_ANSWERS, q11: "Email" },
    preferredContactMethod: "Email",
    contactValue: "resilient.buyer@example.com",
    idempotencyKey: "idem_resilient_1",
  })

  assert.equal(sub1.success, true, "Submission must succeed even when email provider fails")
  assert.equal(
    sub1.request.notifications.adminEmail.status,
    "failed",
    "Failed business email must be recorded"
  )
  assert.match(sub1.request.notifications.adminEmail.error || "", /Email sending failed/)
  assert.equal(
    sub1.request.notifications.customerEmail.status,
    "sent",
    "Customer email succeeded and is recorded as sent"
  )
  assert.equal(sentEmails.length, 1)

  // 2. Repeat clicks / retries with same idempotencyKey do NOT create duplicate records
  const duplicateClick = await service.submitQuiz({
    answers: { ...SAMPLE_ANSWERS, q11: "Email" },
    preferredContactMethod: "Email",
    contactValue: "resilient.buyer@example.com",
    idempotencyKey: "idem_resilient_1",
  })
  assert.equal(duplicateClick.success, true)
  assert.equal(duplicateClick.deduplicated, true)
  assert.equal(duplicateClick.submissionId, sub1.submissionId)
  assert.equal(db._rows.length, 1, "Must not create duplicate database row on double-click")

  // 3. Safe retry of notifications sends ONLY the failed business email without duplicating the customer email!
  shouldFailAdminEmail = false
  const retried = await service.retryNotifications(sub1.submissionId)
  assert.equal(retried.notifications.adminEmail.status, "sent")
  assert.equal(retried.notifications.adminEmail.attempts, 2)
  assert.equal(
    retried.notifications.customerEmail.attempts,
    1,
    "Customer email was already sent on attempt 1 and must NOT be sent a second time"
  )
  assert.equal(sentEmails.length, 2)

  // 4. Add a second submission (Instagram) to test search, filter, sort, and status updates across refreshes
  await new Promise((r) => setTimeout(r, 15))
  const sub2 = await service.submitQuiz({
    answers: { ...SAMPLE_ANSWERS, q11: "Instagram DM" },
    preferredContactMethod: "Instagram DM",
    contactValue: "@austin_vip_collector",
    idempotencyKey: "idem_ig_2",
  })

  // Re-instantiate service to simulate server restart / page refresh against persisted DB rows
  const freshService = createWhiteGloveService(db)
  assert.equal(await freshService.getNewRequestsCount(), 2)

  // Update first request status through workflow: New -> Contacted -> In Progress -> Completed -> Closed
  for (const nextStatus of ["Contacted", "In Progress", "Completed", "Closed"] as const) {
    const updated = await freshService.updateRequestStatus(
      sub1.submissionId,
      nextStatus,
      `Updated to ${nextStatus}`
    )
    assert.equal(updated.status, nextStatus)
    assert.equal(updated.adminNotes, `Updated to ${nextStatus}`)
  }

  // Unreviewed New count should now be 1 (only sub2 is New)
  assert.equal(await freshService.getNewRequestsCount(), 1)

  // Search by Instagram username
  const searchIg = await freshService.listRequests({ search: "austin_vip" })
  assert.equal(searchIg.requests.length, 1)
  assert.equal(searchIg.requests[0].id, sub2.submissionId)

  // Search by email
  const searchEmail = await freshService.listRequests({ search: "resilient.buyer" })
  assert.equal(searchEmail.requests.length, 1)
  assert.equal(searchEmail.requests[0].id, sub1.submissionId)

  // Filter by status
  const closedOnly = await freshService.listRequests({ status: "Closed" })
  assert.equal(closedOnly.requests.length, 1)
  assert.equal(closedOnly.requests[0].id, sub1.submissionId)

  // Sort newest first
  const allSorted = await freshService.listRequests({ sortOrder: "desc" })
  assert.equal(allSorted.requests[0].id, sub2.submissionId, "Newest submission must be first")
  assert.equal(allSorted.requests[1].id, sub1.submissionId)

  // 5. Unauthorized access is strictly blocked
  assert.throws(() => validateAdminRole(null), /Unauthorized/)
  assert.throws(
    () => validateAdminRole({ user: { email: "user@test.com", role: "customer" } }),
    /Forbidden/
  )
})


test("Concurrent retries claim each recipient once and retain tracking", async () => {
  resetSubmissionRateLimitForTests()
  const db = createMockQuizDb()
  const initial = createWhiteGloveService(db, async () => ({ sent: false, skippedReason: "not configured" }))
  const result = await initial.submitQuiz({ answers: SAMPLE_ANSWERS, preferredContactMethod: "Email", contactValue: "concurrent@example.com", idempotencyKey: "concurrent-retry-test" })
  let calls = 0
  const retry = createWhiteGloveService(db, async () => { calls++; await new Promise(r => setTimeout(r, 5)); return { sent: true, messageId: "accepted" } })
  await Promise.all([retry.retryNotifications(result.submissionId), retry.retryNotifications(result.submissionId)])
  assert.equal(calls, 2)
  await assert.rejects(() => retry.updateRequestStatus(result.submissionId, "Paid"), /Link a real order/)
  const updated = await retry.updateRequestStatus(result.submissionId, "Quoted", "Quote prepared", { channel: "Instagram", note: "Client asked for a quote" })
  assert.equal(updated.contactHistory?.[0].channel, "Instagram")
  assert.equal(JSON.parse(db._rows[0].answers).idempotencyKey, "concurrent-retry-test")
})

test("Ambiguous SMTP outcomes never automatically resend", async () => {
  resetSubmissionRateLimitForTests()
  const db = createMockQuizDb()
  let calls = 0
  const service = createWhiteGloveService(db, async () => { calls++; throw Object.assign(new Error("secret must not leak"), { code: "ETIMEDOUT" }) })
  const saved = await service.submitQuiz({ answers: SAMPLE_ANSWERS, preferredContactMethod: "Instagram", contactValue: "test.client", idempotencyKey: "uncertain-test" })
  assert.equal(saved.request.notifications.adminEmail.status, "uncertain")
  assert.doesNotMatch(saved.request.notifications.adminEmail.error || "", /secret/)
  await service.retryNotifications(saved.submissionId)
  assert.equal(calls, 1)
})

test("Test D — Official mngjewerly25k@gmail.com configuration & real Nodemailer MIME compilation (reusing VIP Waitlist Gmail SMTP variables)", async () => {
  resetSubmissionRateLimitForTests()

  const prevResend = process.env.RESEND_API_KEY
  delete process.env.RESEND_API_KEY
  const prevAdminNotification = process.env.ADMIN_NOTIFICATION_EMAIL
  const prevAdminEmail = process.env.ADMIN_EMAIL
  const prevSmtpHost = process.env.SMTP_HOST
  const prevSmtpPort = process.env.SMTP_PORT
  const prevSmtpSecure = process.env.SMTP_SECURE
  const prevSmtpUser = process.env.SMTP_USER
  const prevSmtpPass = process.env.SMTP_PASS

  try {
    // 1. Verify official recipient resolution defaults to mngjewerly25k@gmail.com even if ADMIN_EMAIL is admin@mgjewelry.com
    delete process.env.ADMIN_NOTIFICATION_EMAIL
    process.env.ADMIN_EMAIL = "admin@mgjewelry.com"
    assert.equal(OFFICIAL_ADMIN_NOTIFICATION_EMAIL, "mngjewerly25k@gmail.com")
    assert.equal(
      getBusinessNotificationEmail(),
      "mngjewerly25k@gmail.com",
      "Must route to mngjewerly25k@gmail.com and never fall back to login username admin@mgjewelry.com"
    )

    process.env.ADMIN_NOTIFICATION_EMAIL = "mngjewerly25k@gmail.com"
    assert.equal(getBusinessNotificationEmail(), "mngjewerly25k@gmail.com")

    // 2. Configure the exact VIP Waitlist Gmail SMTP environment variables
    delete process.env.SMTP_HOST // defaults to smtp.gmail.com
    delete process.env.SMTP_PORT // defaults to 465
    delete process.env.SMTP_SECURE // defaults to true on port 465
    process.env.SMTP_USER = "mngjewerly25k@gmail.com"
    process.env.SMTP_PASS = "test_16_char_app_password"

    const configStatus = getEmailDeliveryConfigStatus()
    assert.equal(configStatus.adminNotificationEmail, "mngjewerly25k@gmail.com")
    assert.equal(configStatus.activeTransport, "smtp")
    assert.equal(configStatus.reusesVipGmailSmtp, true)
    assert.equal(configStatus.smtpHost, "smtp.gmail.com")
    assert.equal(configStatus.smtpPort, 465)
    assert.deepEqual(configStatus.missingVariables, [])

    // 3. Verify createMailSender invokes Nodemailer with the exact Gmail SMTP config and generates valid RFC-5322 MIME messages
    const capturedTransportConfigs: any[] = []
    const compiledMimeMessages: Array<{ envelope: any; rawMime: string }> = []

    const realNodemailerSender = createMailSender((smtpOpts: any) => {
      capturedTransportConfigs.push(smtpOpts)
      const streamTransport = nodemailer.createTransport({
        streamTransport: true,
        buffer: true,
        newline: "windows",
      })
      const origSendMail = streamTransport.sendMail.bind(streamTransport)
      streamTransport.sendMail = async (mailOptions: any) => {
        const info: any = await origSendMail(mailOptions)
        compiledMimeMessages.push({
          envelope: info.envelope,
          rawMime: info.message.toString("utf8"),
        })
        return { ...info, accepted: info.envelope.to }
      }
      return streamTransport as any
    })

    const db = createMockQuizDb()
    const realMimeService = createWhiteGloveService(db, realNodemailerSender)

    const result = await realMimeService.submitQuiz({
      answers: { ...SAMPLE_ANSWERS, q11: "Email" },
      preferredContactMethod: "Email",
      contactValue: "real.smtp.customer@example.com",
      idempotencyKey: "idem_real_smtp_1",
    })

    assert.equal(result.success, true)
    assert.equal(result.request.notifications.adminEmail.status, "sent")
    assert.equal(
      result.request.notifications.adminEmail.recipient,
      "mngjewerly25k@gmail.com"
    )
    assert.equal(result.request.notifications.customerEmail.status, "sent")
    assert.equal(
      result.request.notifications.customerEmail.recipient,
      "real.smtp.customer@example.com"
    )

    // Verify exact VIP Waitlist Gmail SMTP options passed to Nodemailer
    assert.equal(capturedTransportConfigs.length, 2)
    assert.deepEqual(capturedTransportConfigs[0], {
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: {
        user: "mngjewerly25k@gmail.com",
        pass: "test_16_char_app_password",
      },
    })

    // Verify compiled MIME envelopes
    assert.equal(compiledMimeMessages.length, 2)
    assert.deepEqual(compiledMimeMessages[0].envelope.to, ["mngjewerly25k@gmail.com"])
    assert.equal(compiledMimeMessages[0].envelope.from, "mngjewerly25k@gmail.com")
    assert.ok(compiledMimeMessages[0].rawMime.includes("Reply-To: real.smtp.customer@example.com"))

    assert.deepEqual(compiledMimeMessages[1].envelope.to, ["real.smtp.customer@example.com"])
    assert.equal(compiledMimeMessages[1].envelope.from, "mngjewerly25k@gmail.com")
  } finally {
    if (prevResend === undefined) delete process.env.RESEND_API_KEY
    else process.env.RESEND_API_KEY = prevResend
    if (prevAdminNotification === undefined) delete process.env.ADMIN_NOTIFICATION_EMAIL
    else process.env.ADMIN_NOTIFICATION_EMAIL = prevAdminNotification
    if (prevAdminEmail === undefined) delete process.env.ADMIN_EMAIL
    else process.env.ADMIN_EMAIL = prevAdminEmail
    if (prevSmtpHost === undefined) delete process.env.SMTP_HOST
    else process.env.SMTP_HOST = prevSmtpHost
    if (prevSmtpPort === undefined) delete process.env.SMTP_PORT
    else process.env.SMTP_PORT = prevSmtpPort
    if (prevSmtpSecure === undefined) delete process.env.SMTP_SECURE
    else process.env.SMTP_SECURE = prevSmtpSecure
    if (prevSmtpUser === undefined) delete process.env.SMTP_USER
    else process.env.SMTP_USER = prevSmtpUser
    if (prevSmtpPass === undefined) delete process.env.SMTP_PASS
    else process.env.SMTP_PASS = prevSmtpPass
  }
})
