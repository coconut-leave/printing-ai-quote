export type PaperType = 'coated' | 'matte' | 'art' | 'standard'
export type PrintSides = 'single' | 'double'
export type FinishType = 'glossy' | 'matte' | 'uv' | 'embossed' | 'none'

export type BusinessCardQuoteInput = {
  finishedSize: string
  quantity: number
  paperType: PaperType
  paperWeight: number
  printSides: PrintSides
  finishType?: FinishType
  taxRate?: number // 0-1, e.g. 0.13
  shippingRegion?: 'domestic' | 'international' | 'remote'
}

export type BusinessCardQuoteResult = {
  normalizedParams: BusinessCardQuoteInput
  unitPrice: number
  totalPrice: number
  shippingFee: number
  tax: number
  finalPrice: number
  notes: string[]
}

const round2 = (value: number) => Math.round(value * 100) / 100

const paperTypeMultiplier = (paper: PaperType): number => {
  switch (paper) {
    case 'art':
      return 1.4
    case 'coated':
      return 1.25
    case 'matte':
      return 1.15
    case 'standard':
    default:
      return 1.0
  }
}

const finishTypeMultiplier = (finish: FinishType): number => {
  switch (finish) {
    case 'uv':
      return 1.3
    case 'embossed':
      return 1.4
    case 'glossy':
      return 1.1
    case 'matte':
      return 1.05
    case 'none':
    default:
      return 1.0
  }
}

const shippingForRegion = (region: BusinessCardQuoteInput['shippingRegion']): number => {
  switch (region) {
    case 'international':
      return 25.0
    case 'remote':
      return 15.0
    case 'domestic':
    default:
      return 8.0
  }
}

const calculatePrintingCost = (input: BusinessCardQuoteInput): number => {
  const basePrice = 0.08 // 基础单价（元/张）
  const paperMultiplier = paperTypeMultiplier(input.paperType)
  const finishMultiplier = finishTypeMultiplier(input.finishType || 'none')
  const sidesMultiplier = input.printSides === 'double' ? 1.8 : 1.0

  return basePrice * paperMultiplier * finishMultiplier * sidesMultiplier
}

const calculateQuantityDiscount = (quantity: number): number => {
  if (quantity >= 10000) return 0.7
  if (quantity >= 5000) return 0.75
  if (quantity >= 2000) return 0.8
  if (quantity >= 1000) return 0.85
  if (quantity >= 500) return 0.9
  return 1.0
}

export function calculateBusinessCardQuote(input: BusinessCardQuoteInput): BusinessCardQuoteResult {
  const normalizedParams: BusinessCardQuoteInput = {
    ...input,
    finishType: input.finishType || 'none',
    taxRate: input.taxRate || 0,
    shippingRegion: input.shippingRegion || 'domestic',
  }

  const unitPrintingCost = calculatePrintingCost(normalizedParams)
  const quantityDiscount = calculateQuantityDiscount(input.quantity)
  const discountedUnitCost = unitPrintingCost * quantityDiscount

  const totalPrintingCost = discountedUnitCost * input.quantity
  const shippingFee = shippingForRegion(normalizedParams.shippingRegion)
  const subtotal = totalPrintingCost + shippingFee
  const tax = subtotal * (normalizedParams.taxRate || 0)
  const finalPrice = round2(subtotal + tax)

  const notes: string[] = []
  if (quantityDiscount < 1.0) {
    notes.push(`数量折扣: ${Math.round((1 - quantityDiscount) * 100)}%`)
  }
  if (normalizedParams.finishType !== 'none') {
    notes.push(`表面处理: ${normalizedParams.finishType}`)
  }

  return {
    normalizedParams,
    unitPrice: round2(discountedUnitCost),
    totalPrice: round2(totalPrintingCost),
    shippingFee: round2(shippingFee),
    tax: round2(tax),
    finalPrice,
    notes,
  }
}