import { calculateBusinessCardQuote } from './businessCardQuote'

const samples = [
  {
    input: {
      finishedSize: '90x54mm',
      quantity: 1000,
      paperType: 'coated' as const,
      paperWeight: 300,
      printSides: 'double' as const,
      finishType: 'glossy' as const,
      taxRate: 0.13,
      shippingRegion: 'domestic' as const,
    },
  },
  {
    input: {
      finishedSize: '85x55mm',
      quantity: 5000,
      paperType: 'art' as const,
      paperWeight: 350,
      printSides: 'double' as const,
      finishType: 'uv' as const,
      taxRate: 0.13,
      shippingRegion: 'international' as const,
    },
  },
  {
    input: {
      finishedSize: '90x54mm',
      quantity: 200,
      paperType: 'standard' as const,
      paperWeight: 250,
      printSides: 'single' as const,
      finishType: 'none' as const,
    },
  },
]

for (const [i, sample] of samples.entries()) {
  const quote = calculateBusinessCardQuote(sample.input)
  console.log(`Business Card Sample ${i + 1} result:`, JSON.stringify(quote, null, 2))

  if (quote.unitPrice <= 0) {
    console.error(`Sample ${i + 1} has invalid unit price: ${quote.unitPrice}`)
    process.exit(1)
  }

  if (quote.finalPrice <= 0) {
    console.error(`Sample ${i + 1} has invalid final price: ${quote.finalPrice}`)
    process.exit(1)
  }

  console.log(`Sample ${i + 1} validation passed`)
}

console.log('All business card samples passed validation')