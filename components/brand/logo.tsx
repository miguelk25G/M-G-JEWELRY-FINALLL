'use client'

import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LogoProps {
  variant?: 'primary' | 'horizontal' | 'icon' | 'badge'
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  asLink?: boolean
}

const sizeMap = {
  sm: { primary: 80, horizontal: 100, icon: 32, badge: 40 },
  md: { primary: 120, horizontal: 150, icon: 40, badge: 56 },
  lg: { primary: 160, horizontal: 200, icon: 48, badge: 72 },
  xl: { primary: 200, horizontal: 250, icon: 64, badge: 96 },
}

export function Logo({ 
  variant = 'primary', 
  className, 
  size = 'md',
  asLink = true 
}: LogoProps) {
  
  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-5xl',
  }
  
  const iconSizes = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-5xl',
    xl: 'text-6xl',
  }

  const logoContent = (
    <div className={cn('relative flex items-center', className)}>
      {variant === 'icon' ? (
        <span className={cn('font-serif font-bold text-foreground drop-shadow-sm', iconSizes[size] || iconSizes.md)}>
          M&G
        </span>
      ) : (
        <span className={cn('font-serif font-bold tracking-widest text-foreground drop-shadow-sm', textSizes[size] || textSizes.md)}>
          M&G JEWELRY
        </span>
      )}
    </div>
  )

  if (asLink) {
    return (
      <Link href="/" className="inline-block hover:opacity-90 transition-opacity">
        {logoContent}
      </Link>
    )
  }

  return logoContent
}

// Text-based logo for when image isn't needed
export function LogoText({ 
  className,
  size = 'md' 
}: { 
  className?: string
  size?: 'sm' | 'md' | 'lg' 
}) {
  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  }

  return (
    <Link href="/" className={cn('flex items-center gap-1', className)}>
      <span className={cn('font-serif font-bold tracking-tight text-foreground', textSizes[size])}>
        M
        <span className="text-muted-foreground">&</span>
        G
      </span>
      <span className="text-xs uppercase tracking-widest text-muted-foreground ml-2">
        Jewelry
      </span>
    </Link>
  )
}
