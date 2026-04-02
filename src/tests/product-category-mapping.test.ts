import {
  getAllLiveProductCategoryDefinitions,
  getProductCategoryDefinition,
  getProductCategoryLookup,
} from '@/lib/catalog/productCategoryMapping'

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

console.log('\n=== 产品分类映射回归测试 ===\n')

test('当前 live scope 应只包含 4 个真实支持品类', () => {
  const definitions = getAllLiveProductCategoryDefinitions()
  assert(definitions.length === 4, 'live scope 应只包含 4 个品类定义')
})

test('album 应映射到 brochure 分类，其他品类应映射到各自分类', () => {
  assert(getProductCategoryDefinition('album').slug === 'brochure', 'album 应映射到 brochure')
  assert(getProductCategoryDefinition('flyer').slug === 'flyer', 'flyer 应映射到 flyer')
  assert(getProductCategoryDefinition('business_card').slug === 'business-card', 'business_card 应映射到 business-card')
  assert(getProductCategoryDefinition('poster').slug === 'poster', 'poster 应映射到 poster')
})

test('旧 productCategory 标识应有最小兼容别名，避免历史 slug 继续污染新落库', () => {
  const albumLookup = getProductCategoryLookup('album')
  const businessCardLookup = getProductCategoryLookup('business_card')

  assert(albumLookup.canonical.slug === 'brochure', 'album canonical slug 应为 brochure')
  assert(albumLookup.legacySlugs.includes('album'), 'album 应兼容旧 slug album')
  assert(businessCardLookup.canonical.slug === 'business-card', 'business_card canonical slug 应为 business-card')
  assert(businessCardLookup.legacySlugs.includes('business_card'), 'business_card 应兼容旧 slug business_card')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((item) => item.passed).length
const total = results.length
console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) {
  process.exit(1)
}