import type { Metadata } from 'next'
import { FavoritesContent } from './favorites-content'

export const metadata: Metadata = {
  title: 'My Favorites',
  description: 'Your saved favorite jewelry items.',
}

export default function FavoritesPage() {
  return <FavoritesContent />
}
