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
      {/* v0 – built-with badge */}
  <div dangerouslySetInnerHTML={{ __html: `<div id="v0-built-with-button-0c26c97d-be84-4ff2-93e0-46ef79004cf2" style="
border: 1px solid hsl(0deg 0% 100% / 12%);
position: fixed;
bottom: 24px;
right: 24px;
z-index: 1000;
background: #121212;
color: white;
padding: 8px 12px;
border-radius: 8px;
font-weight: 400;
font-size: 14px;
box-shadow: 0 2px 8px rgba(0,0,0,0.12);
letter-spacing: 0.02em;
transition: all 0.2s;
display: flex;
align-items: center;
gap: 4px;
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
">
<a
  href="https://v0.app/chat/api/open/built-with-v0/b_aXBR5fWBaq8?ref=5H0Z91"
  target="_blank"
  rel="noopener"
  style="
    color: inherit;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 4px;
  "
>
  Built with
  <svg
    fill="currentColor"
    viewBox="0 0 147 70"
    xmlns="http://www.w3.org/2000/svg"
    style="width: 20px; height: 20px;"
  >
    <path d="M56 50.2031V14H70V60.1562C70 65.5928 65.5928 70 60.1562 70C57.5605 70 54.9982 68.9992 53.1562 67.1573L0 14H19.7969L56 50.2031Z" />
    <path d="M147 56H133V23.9531L100.953 56H133V70H96.6875C85.8144 70 77 61.1856 77 50.3125V14H91V46.1562L123.156 14H91V0H127.312C138.186 0 147 8.81439 147 19.6875V56Z" />
  </svg>
</a>

<button
  onclick="document.getElementById('v0-built-with-button-0c26c97d-be84-4ff2-93e0-46ef79004cf2').style.display='none'"
  onmouseenter="this.style.opacity='1'"
  onmouseleave="this.style.opacity='0.7'"
  style="
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 2px;
    margin-left: 4px;
    border-radius: 2px;
    display: flex;
    align-items: center;
    opacity: 0.7;
    transition: opacity 0.2s;
    transform: translateZ(0);
  "
  aria-label="Close"
>
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
</button>

<span style="
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
">
  v0
</span>
</div>` }} />
</body>
    </html>
  )
}
