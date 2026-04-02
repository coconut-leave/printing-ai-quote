import { buildHomeDemoViewModel } from '@/app/homeDemoView'

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

console.log('\n=== 首页推荐方案可视化回归测试 ===\n')

test('咨询后返回推荐方案', () => {
  const viewModel = buildHomeDemoViewModel({
    status: 'consultation_reply',
    recommendedParams: {
      productType: 'album',
      recommendedParams: {
        finishedSize: 'A4',
        pageCount: 32,
        coverWeight: 200,
      },
    },
  })

  assert(viewModel.statusText === '已给出顾问建议', '应显示推荐方案状态')
  assert(viewModel.recommendedEntries.length >= 2, '应展示推荐方案字段')
})

test('单轮 patch 后更新方案但未报价', () => {
  const viewModel = buildHomeDemoViewModel({
    status: 'recommendation_updated',
    recommendedParams: {
      productType: 'album',
      recommendedParams: { finishedSize: 'A4', pageCount: 32 },
    },
    patchParams: { pageCount: 40 },
    mergedRecommendedParams: { productType: 'album', finishedSize: 'A4', pageCount: 40 },
    patchSummary: '页数改为 40',
  })

  assert(viewModel.statusText === '方案已更新，待确认报价', '应显示未报价状态')
  assert(viewModel.patchEntries.length === 1, '应展示本轮 patch 字段')
  assert(viewModel.latestEntries.some((entry) => entry.field === 'pageCount' && entry.value === '40'), '应展示 patch 后最新方案')
  assert(viewModel.statusGuideLines.includes('当前方案已经按您的要求更新'), '应给出继续报价引导')
})

test('多轮 patch 后更新方案但未报价', () => {
  const viewModel = buildHomeDemoViewModel({
    status: 'recommendation_updated',
    recommendedParams: {
      productType: 'album',
      recommendedParams: { finishedSize: 'A4', pageCount: 32, bindingType: 'saddle_stitch' },
    },
    patchParams: { bindingType: 'perfect_bind' },
    mergedRecommendedParams: { productType: 'album', finishedSize: 'A4', pageCount: 40, bindingType: 'perfect_bind' },
    patchSummary: '装订方式改为 胶装',
  })

  assert(viewModel.latestEntries.length >= 3, '多轮 patch 后应展示完整最新方案')
  assert(viewModel.patchSummaryItems[0] === '装订方式改为 胶装', '应展示本轮修改摘要')
})

test('明确要求报价后进入 estimated', () => {
  const viewModel = buildHomeDemoViewModel({
    status: 'estimated',
    recommendedParams: {
      productType: 'flyer',
      recommendedParams: { finishedSize: 'A4', paperType: 'coated', paperWeight: 157 },
    },
    mergedRecommendedParams: { productType: 'flyer', finishedSize: 'A4', paperType: 'coated', paperWeight: 157 },
  })

  assert(viewModel.statusText === '已生成参考报价', '应显示 estimated 状态')
  assert(viewModel.quoteKindText === '参考报价', '应标识参考报价')
})

test('明确要求报价后进入 quoted', () => {
  const viewModel = buildHomeDemoViewModel({
    status: 'quoted',
    recommendedParams: {
      productType: 'album',
      recommendedParams: { finishedSize: 'A4', pageCount: 40 },
    },
    mergedRecommendedParams: { productType: 'album', finishedSize: 'A4', pageCount: 40, quantity: 1000 },
  })

  assert(viewModel.statusText === '已生成正式报价', '应显示 quoted 状态')
  assert(viewModel.quoteKindText === '正式报价', '应标识正式报价')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((r) => r.passed).length
const total = results.length

console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) process.exit(1)