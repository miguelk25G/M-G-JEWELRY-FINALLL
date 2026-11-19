"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Trash2,
  Copy,
  AlertTriangle,
  Infinity as InfinityIcon,
  Layers,
} from "lucide-react"
import {
  VARIANT_TYPE_OPTIONS,
  type VariantType,
  getVariantTypeOption,
} from "@/lib/inventory"

export interface VariantDraftRow {
  id: string
  size: string
  price: string
  comparePrice: string
  weight: string
  sku: string
  stockQuantity: string
  isUnlimited: boolean
  isActive: boolean
}

export function createEmptyVariantDraft(baseSku?: string, index = 0): VariantDraftRow {
  const cleanBase = (baseSku || "").trim()
  return {
    id: `temp_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
    size: "",
    price: "",
    comparePrice: "",
    weight: "",
    sku: cleanBase ? `${cleanBase}-V${index + 1}` : "",
    stockQuantity: "1",
    isUnlimited: false,
    isActive: true,
  }
}

export function validateVariantDrafts(rows: VariantDraftRow[]): string[] {
  const errors: string[] = []
  if (rows.length === 0) {
    errors.push("Please add at least one variant when Product Variants are enabled.")
    return errors
  }

  const seenSizes = new Set<string>()
  const seenSkus = new Set<string>()

  rows.forEach((row, idx) => {
    const num = idx + 1
    const cleanSize = row.size.trim()
    const labelRef = cleanSize ? `"${cleanSize}" (Row #${num})` : `Row #${num}`

    if (!cleanSize) {
      errors.push(`Row #${num}: Missing size or length label.`)
    } else {
      const sizeKey = cleanSize.toLowerCase()
      if (seenSizes.has(sizeKey)) {
        errors.push(`${labelRef}: Duplicate size/length "${cleanSize}". Each variant must be distinct.`)
      }
      seenSizes.add(sizeKey)
    }

    const rawPrice = row.price.trim()
    const priceNum = rawPrice === "" ? NaN : Number(rawPrice)
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      errors.push(`${labelRef}: Invalid selling price. Must be greater than $0.00 USD.`)
    }

    const rawCompare = row.comparePrice.trim()
    if (rawCompare !== "") {
      const compareNum = Number(rawCompare)
      if (!Number.isFinite(compareNum) || compareNum < 0) {
        errors.push(`${labelRef}: Invalid compare-at price. Must be a non-negative number.`)
      }
    }

    const rawWeight = row.weight.trim().replace(/\s*(g|gr|grams)$/i, "")
    if (rawWeight !== "") {
      const weightNum = Number(rawWeight)
      if (!Number.isFinite(weightNum) || weightNum <= 0) {
        errors.push(`${labelRef}: Invalid weight. Weight must be a positive number in grams.`)
      }
    }

    const cleanSku = row.sku.trim()
    if (cleanSku) {
      const skuKey = cleanSku.toLowerCase()
      if (seenSkus.has(skuKey)) {
        errors.push(`${labelRef}: Duplicate variant SKU "${cleanSku}". Each variant must have a unique SKU.`)
      }
      seenSkus.add(skuKey)
    }

    if (!row.isUnlimited) {
      const rawStock = row.stockQuantity.trim()
      if (rawStock === "") {
        errors.push(`${labelRef}: Stock quantity is required when Unlimited Stock is not enabled.`)
      } else {
        const stockNum = Number(rawStock)
        if (!Number.isFinite(stockNum) || !Number.isInteger(stockNum)) {
          errors.push(`${labelRef}: Invalid stock quantity. Must be a whole number.`)
        } else if (stockNum < 0) {
          errors.push(`${labelRef}: Negative stock quantities are not allowed.`)
        }
      }
    }
  })

  return errors
}

const PRESETS_BY_TYPE: Record<VariantType, string[]> = {
  length: ['16"', '18"', '20"', '22"', '24"', '26"'],
  ring_size: ["5", "6", "7", "8", "9", "10"],
  bracelet_size: ['6.5"', '7"', '7.5"', '8"', '8.5"'],
  custom: [],
}

interface ProductVariantsEditorProps {
  hasVariants: boolean
  onHasVariantsChange: (enabled: boolean) => void
  variantType: VariantType
  onVariantTypeChange: (type: VariantType) => void
  variants: VariantDraftRow[]
  onVariantsChange: (variants: VariantDraftRow[]) => void
  baseSku?: string
}

export function ProductVariantsEditor({
  hasVariants,
  onHasVariantsChange,
  variantType,
  onVariantTypeChange,
  variants,
  onVariantsChange,
  baseSku = "",
}: ProductVariantsEditorProps) {
  const typeMeta = getVariantTypeOption(variantType)
  const validationErrors = hasVariants ? validateVariantDrafts(variants) : []

  const handleToggleVariants = (checked: boolean) => {
    onHasVariantsChange(checked)
    if (checked && variants.length === 0) {
      onVariantsChange([createEmptyVariantDraft(baseSku, 0)])
    }
  }

  const handleAddVariant = (presetSize?: string) => {
    const cleanBase = baseSku.trim()
    const nextIdx = variants.length + 1
    const suffix = presetSize
      ? presetSize.replace(/[^a-zA-Z0-9.]/g, "")
      : `V${nextIdx}`
    const newRow: VariantDraftRow = {
      id: `temp_${Date.now()}_${nextIdx}_${Math.random().toString(36).slice(2, 6)}`,
      size: presetSize || "",
      price: "",
      comparePrice: "",
      weight: "",
      sku: cleanBase ? `${cleanBase}-${suffix}` : "",
      stockQuantity: "1",
      isUnlimited: false,
      isActive: true,
    }
    onVariantsChange([...variants, newRow])
  }

  const handleUpdateRow = (index: number, patch: Partial<VariantDraftRow>) => {
    const next = variants.map((row, i) => (i === index ? { ...row, ...patch } : row))
    onVariantsChange(next)
  }

  const handleDuplicateRow = (index: number) => {
    const source = variants[index]
    if (!source) return
    const copyIdx = variants.length + 1
    const duplicated: VariantDraftRow = {
      ...source,
      id: `temp_${Date.now()}_${copyIdx}_${Math.random().toString(36).slice(2, 6)}`,
      size: source.size ? `${source.size} (Copy)` : "",
      sku: source.sku ? `${source.sku}-COPY` : "",
    }
    const next = [...variants]
    next.splice(index + 1, 0, duplicated)
    onVariantsChange(next)
  }

  const handleDeleteRow = (index: number) => {
    const next = variants.filter((_, i) => i !== index)
    onVariantsChange(next)
  }

  const presets = PRESETS_BY_TYPE[variantType] || []

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card/60 p-4 sm:p-5">
      {/* Header & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold text-foreground">Product Variants</h3>
            {hasVariants && (
              <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                {variants.length} {variants.length === 1 ? "Variant" : "Variants"}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Configure individual sizes or lengths with their own selling prices, weights (g), SKUs, and stock quantities.
          </p>
        </div>

        <label
          htmlFor="toggle-has-variants"
          className="flex items-center gap-3 rounded-lg border border-border bg-background/80 px-3.5 py-2.5 cursor-pointer hover:border-foreground/40 transition-colors"
        >
          <input
            id="toggle-has-variants"
            data-testid="toggle-has-variants"
            type="checkbox"
            checked={hasVariants}
            onChange={(e) => handleToggleVariants(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
          />
          <span className="text-sm font-medium text-foreground select-none">
            Does this product have multiple sizes or lengths?
          </span>
        </label>
      </div>

      {!hasVariants ? (
        <div className="rounded-lg border border-dashed border-border bg-background/40 px-4 py-3 text-xs text-muted-foreground">
          Single-price mode is active. This product uses the main selling price, weight, and inventory fields. Enable the checkbox above if different lengths or sizes have their own prices, weights, or inventory quantities.
        </div>
      ) : (
        <div className="space-y-4 pt-2 border-t border-border/60">
          {/* Variant Type & Presets */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5 sm:w-64">
              <Label htmlFor="variant-type-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Variant Type
              </Label>
              <select
                id="variant-type-select"
                data-testid="variant-type-select"
                value={variantType}
                onChange={(e) => onVariantTypeChange(e.target.value as VariantType)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {VARIANT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {presets.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground mr-1">Quick add size:</span>
                {presets.map((preset) => {
                  const exists = variants.some(
                    (v) => v.size.trim().toLowerCase() === preset.toLowerCase()
                  )
                  return (
                    <Button
                      key={preset}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={exists}
                      onClick={() => handleAddVariant(preset)}
                      className="h-7 px-2.5 text-xs"
                    >
                      + {preset}
                    </Button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3.5 py-2 text-xs text-muted-foreground">
            <strong className="text-foreground">Source of Truth:</strong> When variants are enabled, each variant&apos;s individual selling price, compare-at price, weight, SKU, and inventory quantity are used on the storefront, cart, and Stripe Checkout.
          </div>

          {/* Desktop Variants Table & Mobile Cards */}
          <div className="overflow-x-auto rounded-lg border border-border bg-background">
            <table className="w-full text-left border-collapse min-w-[780px]">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-2.5 px-3 w-[130px]">Size / Length *</th>
                  <th className="py-2.5 px-3 w-[125px]">Selling Price ($) *</th>
                  <th className="py-2.5 px-3 w-[120px]">Compare-at ($)</th>
                  <th className="py-2.5 px-3 w-[110px]">Weight (g)</th>
                  <th className="py-2.5 px-3 w-[150px]">SKU</th>
                  <th className="py-2.5 px-3 w-[115px]">Stock Qty</th>
                  <th className="py-2.5 px-3 text-center w-[85px]">Unlimited</th>
                  <th className="py-2.5 px-3 text-center w-[85px]">Active</th>
                  <th className="py-2.5 px-3 text-right w-[85px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {variants.map((row, idx) => (
                  <tr
                    key={row.id}
                    data-testid={`variant-row-${idx}`}
                    className={!row.isActive ? "opacity-60 bg-muted/20" : "hover:bg-muted/10"}
                  >
                    {/* Size / Length */}
                    <td className="p-2.5 align-middle">
                      <Input
                        aria-label={`Variant ${idx + 1} Size or Length`}
                        data-testid={`variant-size-${idx}`}
                        value={row.size}
                        onChange={(e) => handleUpdateRow(idx, { size: e.target.value })}
                        placeholder={typeMeta.placeholder}
                        className="h-9 text-xs font-medium"
                      />
                    </td>

                    {/* Selling Price */}
                    <td className="p-2.5 align-middle">
                      <Input
                        aria-label={`Variant ${idx + 1} Selling Price`}
                        data-testid={`variant-price-${idx}`}
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={row.price}
                        onChange={(e) => handleUpdateRow(idx, { price: e.target.value })}
                        placeholder="650.00"
                        className="h-9 text-xs"
                      />
                    </td>

                    {/* Compare-at Price */}
                    <td className="p-2.5 align-middle">
                      <Input
                        aria-label={`Variant ${idx + 1} Compare-at Price`}
                        data-testid={`variant-compare-price-${idx}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.comparePrice}
                        onChange={(e) => handleUpdateRow(idx, { comparePrice: e.target.value })}
                        placeholder="Optional"
                        className="h-9 text-xs"
                      />
                    </td>

                    {/* Weight (grams) */}
                    <td className="p-2.5 align-middle">
                      <Input
                        aria-label={`Variant ${idx + 1} Weight in grams`}
                        data-testid={`variant-weight-${idx}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.weight}
                        onChange={(e) => handleUpdateRow(idx, { weight: e.target.value })}
                        placeholder="e.g. 6.2"
                        className="h-9 text-xs"
                      />
                    </td>

                    {/* Variant SKU */}
                    <td className="p-2.5 align-middle">
                      <Input
                        aria-label={`Variant ${idx + 1} SKU`}
                        data-testid={`variant-sku-${idx}`}
                        value={row.sku}
                        onChange={(e) => handleUpdateRow(idx, { sku: e.target.value })}
                        placeholder="Unique SKU"
                        className="h-9 font-mono text-xs"
                      />
                    </td>

                    {/* Stock Quantity */}
                    <td className="p-2.5 align-middle">
                      {row.isUnlimited ? (
                        <div className="flex h-9 items-center justify-center rounded-md border border-border bg-secondary/40 px-2 text-xs text-muted-foreground gap-1">
                          <InfinityIcon className="h-3.5 w-3.5" />
                          <span>Unlimited</span>
                        </div>
                      ) : (
                        <Input
                          aria-label={`Variant ${idx + 1} Stock Quantity`}
                          data-testid={`variant-stock-${idx}`}
                          type="number"
                          step="1"
                          min="0"
                          value={row.stockQuantity}
                          onChange={(e) => handleUpdateRow(idx, { stockQuantity: e.target.value })}
                          placeholder="0"
                          className="h-9 text-xs text-center font-semibold"
                        />
                      )}
                    </td>

                    {/* Unlimited Stock Checkbox */}
                    <td className="p-2.5 align-middle text-center">
                      <input
                        aria-label={`Variant ${idx + 1} Unlimited Stock`}
                        data-testid={`variant-unlimited-${idx}`}
                        type="checkbox"
                        checked={row.isUnlimited}
                        onChange={(e) =>
                          handleUpdateRow(idx, {
                            isUnlimited: e.target.checked,
                            stockQuantity: e.target.checked
                              ? row.stockQuantity || "0"
                              : row.stockQuantity === ""
                              ? "1"
                              : row.stockQuantity,
                          })
                        }
                        className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                      />
                    </td>

                    {/* Active / Inactive Switch */}
                    <td className="p-2.5 align-middle text-center">
                      <div className="flex items-center justify-center">
                        <Switch
                          aria-label={`Variant ${idx + 1} Active`}
                          data-testid={`variant-active-${idx}`}
                          checked={row.isActive}
                          onCheckedChange={(checked) => handleUpdateRow(idx, { isActive: checked })}
                        />
                      </div>
                    </td>

                    {/* Actions: Duplicate & Delete */}
                    <td className="p-2.5 align-middle text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleDuplicateRow(idx)}
                          title="Duplicate variant"
                          data-testid={`variant-duplicate-${idx}`}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => handleDeleteRow(idx)}
                          title="Delete variant"
                          data-testid={`variant-delete-${idx}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddVariant()}
              data-testid="add-variant-button"
              className="gap-1.5 self-start"
            >
              <Plus className="h-4 w-4" />
              Add Variant
            </Button>

            <span className="text-xs text-muted-foreground">
              {variants.filter((v) => v.isActive).length} active variant(s) •{" "}
              {variants.filter((v) => !v.isActive).length} inactive
            </span>
          </div>

          {/* Validation Errors Display */}
          {validationErrors.length > 0 && (
            <div
              data-testid="variants-validation-errors"
              className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-400 space-y-1"
            >
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Please resolve the following variant issues before saving:</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
