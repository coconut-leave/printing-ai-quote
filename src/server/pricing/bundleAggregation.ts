import type { ComplexPackagingLineQuote, ComplexPackagingQuoteResult, ComplexPackagingRequest } from '@/server/packaging/types'

const round2 = (value: number) => Math.round(value * 100) / 100

function getEmbeddedShipping(items: ComplexPackagingLineQuote[]): number {
  return round2(items
    .flatMap((item) => item.lineItems || [])
    .filter((line) => line.code === 'shipping')
    .reduce((sum, line) => sum + line.amount, 0))
}

function calculateShippingFee(request: ComplexPackagingRequest, items: ComplexPackagingLineQuote[]): number {
  const embeddedShipping = getEmbeddedShipping(items)
  if (embeddedShipping > 0) {
    return 0
  }

  return 0
}

function calculateOrderTaxMultiplier(items: ComplexPackagingLineQuote[]): number {
  return items.reduce((maxMultiplier, item) => Math.max(maxMultiplier, item.taxMultiplier || 1), 1)
}

export function aggregateBundlePricing(
  request: ComplexPackagingRequest,
  items: ComplexPackagingLineQuote[],
): Pick<ComplexPackagingQuoteResult, 'costSubtotal' | 'quotedAmount' | 'quoteMarkup' | 'taxMultiplier' | 'totalUnitPrice' | 'totalPrice' | 'shippingFee' | 'tax' | 'finalPrice'> {
  const costSubtotal = round2(items.reduce((sum, item) => sum + item.costSubtotal, 0))
  const quotedAmount = round2(items.reduce((sum, item) => sum + item.quotedAmount, 0))
  const totalUnitPrice = round2(items.reduce((sum, item) => sum + item.unitPrice, 0))
  const totalPrice = round2(items.reduce((sum, item) => sum + item.totalPrice, 0))
  const shippingFee = calculateShippingFee(request, items)
  const taxMultiplier = calculateOrderTaxMultiplier(items)
  const tax = taxMultiplier > 1 ? round2((totalPrice + shippingFee) * (taxMultiplier - 1)) : 0
  const finalPrice = round2(totalPrice + shippingFee + tax)

  return {
    costSubtotal,
    quotedAmount,
    quoteMarkup: costSubtotal > 0 ? round2(quotedAmount / costSubtotal) : 1,
    taxMultiplier,
    totalUnitPrice,
    totalPrice,
    shippingFee,
    tax,
    finalPrice,
  }
}