import type { Metadata } from 'next'
import { SearchContent } from './search-content'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search our jewelry collection.',
}

export default function SearchPage() {
  return <SearchContent />
}
