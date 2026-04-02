export type PosterPaperType = 'coated' | 'matte' | 'art' | 'standard'
export type PosterLamination = 'none' | 'glossy' | 'matte'

export type PosterQuoteInput = {
  finishedSize: string
  quantity: number
  paperType: PosterPaperType
  paperWeight: number
  lamination?: PosterLamination
  taxRate?: number
  shippingRegion?: 'domestic' | 'international' | 'remote'
}

export type PosterQuoteResult = {
  normalizedParams: PosterQuoteInput
  unitPrice: number
  totalPrice: number
  shippingFee: number
  tax: number
  finalPrice: number
  notes: string[]
}

const round2 = (value: number) => Math.round(value * 100) / 100

const paperTypeMultiplier = (paper: PosterPaperType): number => {
  switch (paper) {
    case 'art':
      return 1.3
    case 'coated':
      return 1.2
    case 'matte':
      return 1.1
    case 'standard':
    default:
      return 1.0
  }
}

const laminationMultiplier = (lamination: PosterLamination): number => {
  switch (lamination) {
    case 'glossy':
      return 1.08
    case 'matte':
      return 1.06
    case 'none':
    default:
      return 1.0
  }
}

const shippingForRegion = (region: PosterQuoteInput['shippingRegion']): number => {
  switch (region) {
    case 'international':
      return 100
    case 'remote':
      return 70
    case 'domestic':
    default:
      return 40
  }
}

const weightMultiplier = (weight: number): number => {
  if (weight <= 128) return 1.0
  if (weight <= 157) return 1.08
  if (weight <= 200) return 1.16
  return 1.25
}

export function calculatePosterQuote(input: PosterQuoteInput): PosterQuoteResult {
  const normalizedParams: PosterQuoteInput = {
    ...input,
    lamination: input.lamination || 'none',
    taxRate: input.taxRate ?? 0,
    shippingRegion: input.shippingRegion ?? 'domestic',
  }

  const baseUnitPrice = 12
  const unitPrice = round2(
    baseUnitPrice
    * paperTypeMultiplier(normalizedParams.paperType)
    * weightMultiplier(normalizedParams.paperWeight)
    * laminationMultiplier(normalizedParams.lamination || 'none')
  )

  const totalPrice = round2(unitPrice * normalizedParams.quantity)
  const shippingFee = round2(shippingForRegion(normalizedParams.shippingRegion))
  const tax = round2(totalPrice * (normalizedParams.taxRate || 0))
  const finalPrice = round2(totalPrice + shippingFee + tax)

  const notes: string[] = []
  if (normalizedParams.lamination !== 'none') {
    notes.push(`已含覆膜: ${normalizedParams.lamination}`)
  }
  if (normalizedParams.quantity < 50) {
    notes.push('小批量单价较高')
  }

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
