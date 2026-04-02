import { calculatePosterQuote } from '@/server/pricing/posterQuote'
import { getEstimatedDefaults, getRequiredFields } from '@/lib/catalog/helpers'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function checkMissingFields(params: Record<string, any>): string[] {
  const requiredFields = getRequiredFields(params.productType)
  return requiredFields.filter((key) => {
    const value = params[key]
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
  })
}

console.log('\n=== Poster 闭环测试 ===\n')

// 1) 一轮完整报价测试
const fullParams = {
  productType: 'poster',
  finishedSize: 'A2',
  quantity: 120,
  paperType: 'coated' as const,
  paperWeight: 157,
  lamination: 'matte' as const,
}

const fullMissing = checkMissingFields(fullParams)
assert(fullMissing.length === 0, 'Poster 完整参数不应缺参')

const fullQuote = calculatePosterQuote(fullParams)
assert(fullQuote.finalPrice > 0, 'Poster 完整报价应成功')
console.log('✓ Poster 一轮完整报价测试通过')

// 2) 缺参补参测试（缺 paperWeight）
const partialParams = {
  productType: 'poster',
  finishedSize: 'A2',
  quantity: 120,
  paperType: 'coated' as const,
}
const partialMissing = checkMissingFields(partialParams)
assert(partialMissing.includes('paperWeight'), 'Poster 缺参应识别 paperWeight')
console.log('✓ Poster 缺参检测测试通过')

const supplemented = { ...partialParams, paperWeight: 157 }
const supplementedMissing = checkMissingFields(supplemented)
assert(supplementedMissing.length === 0, '补参后应不缺参')
const supplementedQuote = calculatePosterQuote({ ...supplemented, lamination: 'none' as const })
assert(supplementedQuote.finalPrice > 0, '补参后应可报价')
console.log('✓ Poster 补参后报价测试通过')

// 3) estimated 测试（缺 paperWeight，走默认值）
const estimatedCandidate = {
  productType: 'poster',
  finishedSize: 'A2',
  quantity: 80,
  paperType: 'coated' as const,
}
const estimatedMissing = checkMissingFields(estimatedCandidate)
assert(estimatedMissing.includes('paperWeight'), 'Poster estimated 场景应缺 paperWeight')

const estimatedDefaults = getEstimatedDefaults('poster')
const estimatedQuote = calculatePosterQuote({
  ...estimatedCandidate,
  paperWeight: estimatedDefaults.paperWeight || 157,
  lamination: estimatedDefaults.lamination || 'none',
})
assert(estimatedQuote.finalPrice > 0, 'Poster estimated 场景应可生成参考报价')
console.log('✓ Poster estimated 测试通过')

console.log('\nPoster 闭环测试全部通过')
