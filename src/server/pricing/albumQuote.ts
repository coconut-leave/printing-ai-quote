export type PaperType = 'coated' | 'matte' | 'art' | 'standard'
export type BindingType = 'saddle_stitch' | 'perfect_bind' | 'spiral' | 'other'

export type AlbumQuoteInput = {
  finishedSize: string
  pageCount: number
  coverPaper: PaperType
  coverWeight: number
  innerPaper: PaperType
  innerWeight: number
  bindingType: BindingType
  quantity: number
  taxRate?: number // 0-1, e.g. 0.13
  shippingRegion?: 'domestic' | 'international' | 'remote'
}

export type AlbumQuoteResult = {
  normalizedParams: AlbumQuoteInput
  unitPrice: number
  totalPrice: number
  shippingFee: number
  tax: number
  finalPrice: number
  notes: string[]
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const round2 = (value: number) => Math.round(value * 100) / 100

const paperTypeMultiplier = (paper: PaperType): number => {
  switch (paper) {
    case 'art':
      return 1.35
    case 'coated':
      return 1.2
    case 'matte':
      return 1.1
    case 'standard':
    default:
      return 1.0
  }
}

const weightMultiplier = (weight: number): number => {
  if (weight <= 150) return 1.0
  if (weight <= 200) return 1.1
  if (weight <= 250) return 1.2
  if (weight <= 300) return 1.3
  return 1.5
}

const bindingMultiplier = (type: BindingType): number => {
  switch (type) {
    case 'saddle_stitch':
      return 1.0
    case 'perfect_bind':
      return 1.18
    case 'spiral':
      return 1.26
    default:
      return 1.2
  }
}

const shippingForRegion = (region: AlbumQuoteInput['shippingRegion']): number => {
  switch (region) {
    case 'international':
      return 120.0
    case 'remote':
      return 80.0
    case 'domestic':
    default:
      return 50.0
  }
}

export function calculateAlbumQuote(input: AlbumQuoteInput): AlbumQuoteResult {
  const normalizedParams = {
    ...input,
    taxRate: input.taxRate ?? 0,
    shippingRegion: input.shippingRegion ?? 'domestic',
  }

  const basePrice = 20.0
  const pageFactor = 1 + clamp((normalizedParams.pageCount - 24) / 100, 0, 0.8)
  const coverFactor = paperTypeMultiplier(normalizedParams.coverPaper) * weightMultiplier(normalizedParams.coverWeight)
  const innerFactor = paperTypeMultiplier(normalizedParams.innerPaper) * weightMultiplier(normalizedParams.innerWeight)
  const bindingFactor = bindingMultiplier(normalizedParams.bindingType)

  const unitPriceRaw = basePrice * pageFactor * (0.5 * coverFactor + 0.5 * innerFactor) * bindingFactor
  const unitPrice = round2(unitPriceRaw)

  const totalPrice = round2(unitPrice * normalizedParams.quantity)
  const shippingFee = round2(shippingForRegion(normalizedParams.shippingRegion))

  const tax = round2(totalPrice * normalizedParams.taxRate)
  const finalPrice = round2(totalPrice + shippingFee + tax)

  const notes: string[] = []
  if (normalizedParams.quantity < 100) notes.push('Small quantity, cost per unit may be higher.')
  if (normalizedParams.pageCount > 200) notes.push('High page count requires manual review for accuracy.')
  if (normalizedParams.taxRate && normalizedParams.taxRate > 0) notes.push(`含税率 ${normalizedParams.taxRate * 100}%`)

  return {
    normalizedParams,
    unitPrice,
    totalPrice,
    shippingFee,
    tax,
    finalPrice,
    notes,
  }
}
