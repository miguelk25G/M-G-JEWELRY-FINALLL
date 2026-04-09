import React from "react"
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { MessageCircle } from 'lucide-react'
import { BrandConfig } from '@/lib/config/brand'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const waLink = `https://wa.me/${BrandConfig.CONTACT.whatsappNumber.replace(/\+/g, '')}`

  return (
    <div className="flex min-h-screen flex-col relative">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      
      {/* Mobile-only Floating WhatsApp */}
      <a 
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="md:hidden fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-lg shadow-black/20 flex items-center justify-center hover:scale-110 transition-transform"
        aria-label="Contact us on WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
      </a>
    </div>
  )
}
