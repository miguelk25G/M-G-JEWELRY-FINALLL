"use server"

import { db } from "@/lib/db"
import nodemailer from "nodemailer"

// Create elegant HTML Email Template
function generateVipEmailHtml(locale: string) {
  const isEs = locale === 'es'

  const title = isEs ? "Bienvenido a la Familia M&G" : "Welcome to the M&G Family"
  const p1 = isEs 
    ? "Su solicitud ha sido recibida con éxito. Le agradecemos profundamente su interés en formar parte de nuestro exclusivo círculo." 
    : "Your application has been successfully received. We deeply appreciate your interest in joining our exclusive circle."
  const p2 = isEs
    ? "Nuestra lista de espera VIP asegura que mantengamos el más alto estándar de servicio White-Glove. Uno de nuestros joyeros personales revisará su perfil y se pondrá en contacto con usted en breve cuando se libere un espacio."
    : "Our VIP waitlist ensures we maintain the highest standard of White-Glove service. One of our personal jewelers will review your profile and contact you shortly when a spot opens up."
  const footer = isEs ? "Con aprecio,<br>La Casa M&G Jewelry" : "With appreciation,<br>The M&G Jewelry House"

  return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #000000; color: #ffffff; padding: 40px; border-radius: 8px; border: 1px solid #333333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #D4AF37; font-size: 28px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase;">M&G JEWELRY</h1>
        <div style="height: 1px; background-color: #D4AF37; width: 60px; margin: 20px auto;"></div>
      </div>
      
      <h2 style="font-size: 20px; font-weight: 400; text-align: center; margin-bottom: 30px;">${title}</h2>
      
      <p style="font-size: 16px; line-height: 1.6; color: #cccccc; margin-bottom: 20px;">
        ${p1}
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: #cccccc; margin-bottom: 40px;">
        ${p2}
      </p>
      
      <div style="text-align: center; margin-top: 50px; font-size: 14px; color: #888888; border-top: 1px solid #333333; padding-top: 20px;">
        <p>${footer}</p>
        <p style="font-size: 12px; margin-top: 10px;">Los Angeles, CA - Worldwide</p>
      </div>
    </div>
  `
}

export async function subscribeVIP(formData: FormData, locale: string) {
  try {
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string || ""
    const ig = formData.get("ig") as string || ""

    if (!email) return { success: false, error: "Email is required" }

    // Save to CRM Database Document
    await db.vipWaitlist.create({
      data: {
        email,
        phone,
        igHandle: ig,
        preferredLanguage: locale
      }
    })

    // Try sending email via Nodemailer. 
    // If user has not configured SMTP credentials yet, we catch the error gracefully without breaking the logic.
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "465"),
        secure: true, 
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })

      const mailOptions = {
        from: `"M&G Jewelry" <${process.env.SMTP_USER}>`,
        to: email,
        subject: locale === 'es' ? "Su aplicación VIP - M&G Jewelry" : "Your VIP Application - M&G Jewelry",
        html: generateVipEmailHtml(locale),
      }

      // Check if variables are valid before trying to send to avoid hard crashes empty config
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        await transporter.sendMail(mailOptions)
      } else {
        console.warn("SMTP credentials not configured. VIP saved to DB but email skipped.")
      }
    } catch (emailError) {
      console.error("Nodemailer failed:", emailError)
      // We do not return false here, because the CRM saving was successful.
    }

    return { success: true }
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: "Email is already on the waitlist." }
    }
    return { success: false, error: "Failed to join waitlist." }
  }
}
