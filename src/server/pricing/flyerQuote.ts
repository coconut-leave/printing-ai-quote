export type PaperType = 'coated' | 'matte' | 'art' | 'standard'
export type PrintSides = 'single' | 'double'

export type FlyerQuoteInput = {
  finishedSize: string
  quantity: number
  paperType: PaperType
  paperWeight: number
  printSides: PrintSides
  taxRate?: number
  shippingRegion?: 'domestic' | 'international' | 'remote'
}

export type FlyerQuoteResult = {
  normalizedParams: FlyerQuoteInput
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

const shippingForRegion = (region: FlyerQuoteInput['shippingRegion']): number => {
  switch (region) {
    case 'international':
      return 80.0
    case 'remote':
      return 60.0
    case 'domestic':
    default:
      return 30.0
  }
}

export function calculateFlyerQuote(input: FlyerQuoteInput): FlyerQuoteResult {
  const normalizedParams = {
    ...input,
    taxRate: input.taxRate ?? 0,
    shippingRegion: input.shippingRegion ?? 'domestic',
  }

  const basePrice = 5.0
  const colorFactor = normalizedParams.printSides === 'double' ? 1.25 : 1.0
  const paperFactor = paperTypeMultiplier(normalizedParams.paperType)
  const weightFactor = normalizedParams.paperWeight <= 120 ? 1.0 : normalizedParams.paperWeight <= 180 ? 1.15 : 1.3

  const unitPriceRaw = basePrice * colorFactor * paperFactor * weightFactor
  const unitPrice = round2(unitPriceRaw)

  const totalPrice = round2(unitPrice * normalizedParams.quantity)
  const shippingFee = round2(shippingForRegion(normalizedParams.shippingRegion))
  const tax = round2(totalPrice * normalizedParams.taxRate)
  const finalPrice = round2(totalPrice + shippingFee + tax)

  const notes: string[] = []
  if (normalizedParams.printSides === 'single') {
    notes.push('单面印刷')
  } else {
    notes.push('双面印刷')
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
