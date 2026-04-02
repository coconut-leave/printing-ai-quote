import { calculatePosterQuote } from './posterQuote'

const samples = [
  {
    input: {
      finishedSize: 'A2',
      quantity: 200,
      paperType: 'coated' as const,
      paperWeight: 157,
      lamination: 'matte' as const,
      taxRate: 0.13,
      shippingRegion: 'domestic' as const,
    },
  },
  {
    input: {
      finishedSize: 'A3',
      quantity: 50,
      paperType: 'art' as const,
      paperWeight: 200,
      lamination: 'glossy' as const,
      shippingRegion: 'international' as const,
    },
  },
]

for (const [i, sample] of samples.entries()) {
  const quote = calculatePosterQuote(sample.input)
  console.log(`Poster Sample ${i + 1} result:`, JSON.stringify(quote, null, 2))

  if (quote.unitPrice <= 0) {
    throw new Error(`Poster Sample ${i + 1}: unitPrice must be > 0`)
  }
  if (quote.finalPrice <= 0) {
    throw new Error(`Poster Sample ${i + 1}: finalPrice must be > 0`)
  }
}

console.log('All poster quote tests passed.')
