import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { cookies } from 'next/headers'
import { Toaster } from 'sonner'
import { LocaleProvider } from '@/i18n/locale-context'
import { getMessages } from '@/i18n/get-messages'
import { defaultLocale, type Locale } from '@/i18n/config'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'] })
const geistMono = Geist_Mono({ subsets: ['latin'] })
const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  title: {
    default: 'M&G Jewelry | Luxury Diamond Jewelry',
    template: '%s | M&G Jewelry',
  },
  description: 'Discover our curated collection of luxury diamond jewelry. Each piece tells a story of exceptional craftsmanship and enduring beauty.',
  keywords: ['jewelry', 'diamonds', 'luxury', 'gold', 'rings', 'necklaces', 'bracelets', 'earrings'],
  authors: [{ name: 'M&G Jewelry' }],
  creator: 'M&G Jewelry',
  publisher: 'M&G Jewelry',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://mgjewelry.com',
    siteName: 'M&G Jewelry',
    title: 'M&G Jewelry | Luxury Diamond Jewelry',
    description: 'Discover our curated collection of luxury diamond jewelry.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'M&G Jewelry',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'M&G Jewelry | Luxury Diamond Jewelry',
    description: 'Discover our curated collection of luxury diamond jewelry.',
    images: ['/og-image.jpg'],
  },
  icons: {
    icon: [
      { url: '/brand/logo.png', type: 'image/png' },
    ],
    apple: '/brand/logo.png',
  },
  manifest: '/manifest.json',
    generator: 'v0.app'
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get('locale')?.value as Locale | undefined
  const locale = localeCookie || defaultLocale
  const messages = await getMessages(locale)

  return (
    <html lang={locale} className={playfair.variable}>
      <body className="font-sans antialiased">
        <LocaleProvider locale={locale} messages={messages}>
          {children}
        </LocaleProvider>
        <Toaster 
          position="top-center" 
          toastOptions={{
            style: {
              background: 'oklch(0.12 0 0)',
              color: 'oklch(0.98 0 0)',
              border: '1px solid oklch(0.25 0 0)',
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  )
}
