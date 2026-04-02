import { calculateAlbumQuote } from './albumQuote'

const samples = [
  {
    input: {
      finishedSize: '210x297mm',
      pageCount: 48,
      coverPaper: 'coated' as const,
      coverWeight: 250,
      innerPaper: 'standard' as const,
      innerWeight: 150,
      bindingType: 'saddle_stitch' as const,
      quantity: 200,
      taxRate: 0.13,
      shippingRegion: 'domestic' as const,
    },
  },
  {
    input: {
      finishedSize: '210x297mm',
      pageCount: 128,
      coverPaper: 'art' as const,
      coverWeight: 300,
      innerPaper: 'matte' as const,
      innerWeight: 200,
      bindingType: 'perfect_bind' as const,
      quantity: 500,
      taxRate: 0.13,
      shippingRegion: 'international' as const,
    },
  },
  {
    input: {
      finishedSize: '210x297mm',
      pageCount: 80,
      coverPaper: 'standard' as const,
      coverWeight: 170,
      innerPaper: 'standard' as const,
      innerWeight: 120,
      bindingType: 'spiral' as const,
      quantity: 50,
    },
  },
]

for (const [i, sample] of samples.entries()) {
  const quote = calculateAlbumQuote(sample.input)
  console.log(`Sample ${i + 1} result:`, JSON.stringify(quote, null, 2))

  if (quote.unitPrice <= 0) {
    throw new Error(`Sample ${i + 1}: unitPrice must be > 0`)
  }
  if (quote.finalPrice <= quote.totalPrice) {
    throw new Error(`Sample ${i + 1}: finalPrice must be totalPrice + shipping + tax`)
  }
}

console.log('All tests passed.')
