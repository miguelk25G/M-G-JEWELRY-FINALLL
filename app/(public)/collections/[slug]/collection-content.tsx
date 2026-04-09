'use client'

import { useState } from 'react'
import { SlidersHorizontal, Grid3X3, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { ProductCard } from '@/components/product/product-card'
import { useTranslation } from '@/i18n/locale-context'
import { cn } from '@/lib/utils'

interface Product {
  id: string
  name: string
  nameEs: string | null
  slug: string
  price: number
  comparePrice: number | null
  images: string
  category: string
  metalType: string
  karat: string | null
  stoneType: string
  isBestSeller: boolean
  inventoryQty: number
}

interface CollectionContentProps {
  collection: {
    name: string
    nameEs: string
    description: string
    descriptionEs: string
  }
  products: Product[]
}

const categories = ['all', 'rings', 'chains', 'bracelets', 'earrings', 'necklaces']
const metalTypes = ['all', 'gold', 'silver', 'platinum']
const stoneTypes = ['all', 'natural', 'lab', 'none']
const sortOptions = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
]

export function CollectionContent({ collection, products }: CollectionContentProps) {
  const { t, locale } = useTranslation()
  const [gridSize, setGridSize] = useState<'small' | 'large'>('large')
  const [sortBy, setSortBy] = useState('featured')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterMetal, setFilterMetal] = useState('all')
  const [filterStone, setFilterStone] = useState('all')

  const displayName = locale === 'es' ? collection.nameEs : collection.name
  const displayDescription = locale === 'es' ? collection.descriptionEs : collection.description

  // Filter products
  let filteredProducts = [...products]
  
  if (filterCategory !== 'all') {
    filteredProducts = filteredProducts.filter((p) => p.category === filterCategory)
  }
  if (filterMetal !== 'all') {
    filteredProducts = filteredProducts.filter((p) => p.metalType === filterMetal)
  }
  if (filterStone !== 'all') {
    filteredProducts = filteredProducts.filter((p) => p.stoneType === filterStone)
  }

  // Sort products
  if (sortBy === 'price-asc') {
    filteredProducts.sort((a, b) => a.price - b.price)
  } else if (sortBy === 'price-desc') {
    filteredProducts.sort((a, b) => b.price - a.price)
  }

  const activeFiltersCount = [filterCategory, filterMetal, filterStone].filter(
    (f) => f !== 'all'
  ).length

  const clearFilters = () => {
    setFilterCategory('all')
    setFilterMetal('all')
    setFilterStone('all')
  }

  return (
    <div className="py-8 lg:py-12">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-foreground lg:text-4xl">
            {displayName}
          </h1>
          <p className="mt-2 text-muted-foreground">{displayDescription}</p>
        </div>

        {/* Filters Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            {/* Mobile Filter Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 lg:hidden bg-transparent">
                  <SlidersHorizontal className="h-4 w-4" />
                  {t('search.filters')}
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 bg-background">
                <SheetHeader>
                  <SheetTitle>{t('search.filters')}</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <FilterGroup
                    label={t('search.category')}
                    options={categories}
                    value={filterCategory}
                    onChange={setFilterCategory}
                  />
                  <FilterGroup
                    label={t('search.metal')}
                    options={metalTypes}
                    value={filterMetal}
                    onChange={setFilterMetal}
                  />
                  <FilterGroup
                    label={t('search.stone')}
                    options={stoneTypes}
                    value={filterStone}
                    onChange={setFilterStone}
                  />
                  {activeFiltersCount > 0 && (
                    <Button variant="outline" className="w-full bg-transparent" onClick={clearFilters}>
                      {t('search.clearFilters')}
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop Filters */}
            <div className="hidden items-center gap-2 lg:flex">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-32 bg-transparent">
                  <SelectValue placeholder={t('search.category')} />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat === 'all' ? t('common.all') : t(`nav.${cat}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterMetal} onValueChange={setFilterMetal}>
                <SelectTrigger className="w-32 bg-transparent">
                  <SelectValue placeholder={t('search.metal')} />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {metalTypes.map((metal) => (
                    <SelectItem key={metal} value={metal}>
                      {metal === 'all' ? t('common.all') : metal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  {t('search.clearFilters')}
                </Button>
              )}
            </div>

            <span className="text-sm text-muted-foreground">
              {t('search.results', { count: filteredProducts.length })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 bg-transparent">
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

            {/* Grid Toggle */}
            <div className="hidden items-center gap-1 lg:flex">
              <Button
                variant="ghost"
                size="icon"
                className={cn(gridSize === 'large' && 'bg-secondary')}
                onClick={() => setGridSize('large')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(gridSize === 'small' && 'bg-secondary')}
                onClick={() => setGridSize('small')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg font-medium text-foreground">{t('search.noResults')}</p>
            <p className="mt-2 text-muted-foreground">{t('search.noResultsMessage')}</p>
            <Button variant="outline" className="mt-4 bg-transparent" onClick={clearFilters}>
              {t('search.clearFilters')}
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              'grid gap-6',
              gridSize === 'large'
                ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
            )}
          >
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useTranslation()
  
  return (
    <div>
      <h4 className="mb-3 text-sm font-medium text-foreground">{label}</h4>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Badge
            key={option}
            variant={value === option ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => onChange(option)}
          >
            {option === 'all' ? t('common.all') : option}
          </Badge>
        ))}
      </div>
    </div>
  )
}
