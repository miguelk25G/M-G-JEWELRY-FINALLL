'use client'

import { useState, useMemo } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ProductCard } from '@/components/product/product-card'
import { useTranslation } from '@/i18n/locale-context'

const categories = ['all', 'rings', 'chains', 'bracelets', 'earrings', 'necklaces']
const priceRanges = [
  { value: 'all', label: 'All Prices' },
  { value: '0-3000', label: 'Under $3,000' },
  { value: '3000-6000', label: '$3,000 - $6,000' },
  { value: '6000-10000', label: '$6,000 - $10,000' },
  { value: '10000+', label: '$10,000+' },
]
const sortOptions = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
]

export function SearchContent({ allProducts = [] }: { allProducts: any[] }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [priceRange, setPriceRange] = useState('all')
  const [sortBy, setSortBy] = useState('featured')

  const filteredProducts = useMemo(() => {
    let results = [...allProducts]

    // Search filter
    if (query) {
      const lowerQuery = query.toLowerCase()
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.nameEs?.toLowerCase().includes(lowerQuery) ||
          p.category.toLowerCase().includes(lowerQuery) ||
          p.metalType.toLowerCase().includes(lowerQuery)
      )
    }

    // Category filter
    if (category !== 'all') {
      results = results.filter((p) => p.category === category)
    }

    // Price filter
    if (priceRange !== 'all') {
      const [min, max] = priceRange.split('-').map((n) => (n === '+' ? Infinity : Number(n)))
      results = results.filter((p) => {
        if (max === undefined) return p.price >= 10000
        return p.price >= min && p.price <= max
      })
    }

    // Sort
    switch (sortBy) {
      case 'price-asc':
        results.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        results.sort((a, b) => b.price - a.price)
        break
      case 'newest':
        // In real app, would sort by createdAt
        break
    }

    return results
  }, [query, category, priceRange, sortBy])

  const clearFilters = () => {
    setQuery('')
    setCategory('all')
    setPriceRange('all')
    setSortBy('featured')
  }

  const hasActiveFilters = query || category !== 'all' || priceRange !== 'all'

  return (
    <div className="py-12 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Search Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-serif text-3xl font-bold text-foreground lg:text-4xl">
            {t('search.title')}
          </h1>
          <div className="relative mt-6">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('search.placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 pl-12 text-base bg-secondary"
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2"
                onClick={() => setQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-32 bg-transparent">
                <SelectValue placeholder={t('search.category')} />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'all' ? t('common.all') : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger className="w-40 bg-transparent">
                <SelectValue placeholder={t('search.priceRange')} />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {priceRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                {t('search.clearFilters')}
              </Button>
            )}

            <span className="text-sm text-muted-foreground">
              {t('search.results', { count: filteredProducts.length })}
            </span>
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44 bg-transparent">
              <SelectValue placeholder={t('search.sortBy')} />
            </SelectTrigger>
            <SelectContent className="bg-background">
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg font-medium text-foreground">{t('search.noResults')}</p>
            <p className="mt-2 text-muted-foreground">{t('search.noResultsMessage')}</p>
            <Button variant="outline" className="mt-4 bg-transparent" onClick={clearFilters}>
              {t('search.clearFilters')}
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
