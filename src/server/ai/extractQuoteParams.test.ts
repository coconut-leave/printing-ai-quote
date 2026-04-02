import dotenv from 'dotenv'
import { extractQuoteParams } from './extractQuoteParams'

dotenv.config({ path: './.env' })

async function run() {
  const userText = '我想印1000本A4画册，封面200g铜版纸，内页157g铜版纸，骑马钉，大概多少钱？'
  const result = await extractQuoteParams(userText)
  console.log('Extracted params:', JSON.stringify(result, null, 2))

  if (result.productType !== 'album') {
    throw new Error('productType should be album')
  }
  if (result.missingFields.length > 0) {
    console.log('Missing fields (预计部分字段可能未识别，正常可手动补全):', result.missingFields)
  }

  console.log('AI parsing basic run complete.')

  const posterText = '我要做200张A2海报，157g铜版纸，哑膜'
  const poster = await extractQuoteParams(posterText)
  console.log('Poster extracted:', JSON.stringify(poster, null, 2))

  if (poster.productType !== 'poster') {
    throw new Error('poster productType should be poster')
  }
  if (poster.finishedSize !== 'A2') {
    throw new Error('poster finishedSize should be A2')
  }
  if (poster.quantity !== 200) {
    throw new Error('poster quantity should be 200')
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
