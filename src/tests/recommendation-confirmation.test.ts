import { buildRecommendationBaseParams, getLatestRecommendedParams } from '@/server/intent/recommendationContext'

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function test(name: string, fn: () => void) {
  try {
    fn()
    results.push({ name, passed: true })
    console.log(`✓ ${name}`)
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    results.push({ name, passed: false, error })
    console.error(`✗ ${name}`)
    console.error(`  └─ ${error}`)
  }
}

function mergeParameters(historical: Record<string, any> | null, current: Record<string, any>): Record<string, any> {
  const merged = { ...historical }

  const validFields = [
    'productType',
    'finishedSize',
    'quantity',
    'coverPaper',
    'coverWeight',
    'innerPaper',
    'innerWeight',
    'bindingType',
    'pageCount',
    'paperType',
    'paperWeight',
    'printSides',
    'finishType',
    'lamination',
  ]

  validFields.forEach((key) => {
    if (current[key] !== undefined && current[key] !== null) {
      if (
        key === 'productType' &&
        historical?.productType &&
        historical.productType !== 'album' &&
        current.productType === 'album'
      ) {
        return
      }
      merged[key] = current[key]
    }
  })

  delete merged.mergedParams
  delete merged.missingFields

  return merged
}

console.log('\n=== 推荐方案接续报价回归测试 ===\n')

test('提取最近一轮 recommendedParams', () => {
  const recommendation = getLatestRecommendedParams({
    messages: [
      { sender: 'ASSISTANT', metadata: { mergedParams: { productType: 'album' } } },
      {
        sender: 'ASSISTANT',
        metadata: {
          recommendedParams: {
            productType: 'album',
            recommendedParams: {
              finishedSize: 'A4',
              pageCount: 32,
              coverWeight: 200,
            },
          },
        },
      },
    ],
  })

  assert(recommendation?.productType === 'album', '应提取推荐方案 productType')
  assert(recommendation?.recommendedParams.pageCount === 32, '应提取推荐方案页数')
})

test('咨询后直接确认推荐方案时，应使用 recommendedParams 作为基础参数', () => {
  const baseParams = buildRecommendationBaseParams(
    {
      productType: 'album',
      recommendedParams: {
        finishedSize: 'A4',
        pageCount: 32,
        coverPaper: 'coated',
        coverWeight: 200,
        innerPaper: 'coated',
        innerWeight: 157,
        bindingType: 'saddle_stitch',
      },
    },
    { quantity: 1000 }
  )

  assert(baseParams?.productType === 'album', '应保留推荐方案 productType')
  assert(baseParams?.pageCount === 32, '应带入推荐页数')
  assert(baseParams?.quantity === 1000, '可复用历史 quantity')
})

test('咨询后确认并修改一个参数时，应覆盖推荐参数', () => {
  const baseParams = buildRecommendationBaseParams({
    productType: 'album',
    recommendedParams: {
      finishedSize: 'A4',
      pageCount: 32,
      bindingType: 'saddle_stitch',
    },
  })

  const merged = mergeParameters(baseParams, { bindingType: 'perfect_binding' })
  assert(merged.bindingType === 'perfect_binding', '应允许当前消息覆盖装订方式')
  assert(merged.pageCount === 32, '未修改字段应保留推荐值')
})

test('咨询后确认并修改多个参数时，应保留未改字段并覆盖改动字段', () => {
  const baseParams = buildRecommendationBaseParams({
    productType: 'album',
    recommendedParams: {
      finishedSize: 'A4',
      pageCount: 32,
      coverWeight: 200,
      innerWeight: 157,
      bindingType: 'saddle_stitch',
    },
  })

  const merged = mergeParameters(baseParams, { pageCount: 40, coverWeight: 200 })
  assert(merged.pageCount === 40, '页数应按当前消息覆盖')
  assert(merged.coverWeight === 200, '封面克重应保持用户确认值')
  assert(merged.bindingType === 'saddle_stitch', '未修改装订方式应保留推荐值')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((r) => r.passed).length
const total = results.length

console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) process.exit(1)