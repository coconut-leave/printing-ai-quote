import { applyRecommendedPatch } from '@/server/intent/applyRecommendedPatch'

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

console.log('\n=== 推荐方案 patch 回归测试 ===\n')

test('只改一个字段: 页数改成40', () => {
  const result = applyRecommendedPatch(
    {
      productType: 'album',
      recommendedParams: { finishedSize: 'A4', pageCount: 32, bindingType: 'saddle_stitch' },
    },
    '页数改成40'
  )

  assert(result?.patchParams.pageCount === 40, '应识别页数 patch')
  assert(result?.mergedRecommendedParams.pageCount === 40, '应合并页数 patch')
})

test('改一个工艺字段: 改胶装', () => {
  const result = applyRecommendedPatch(
    {
      productType: 'album',
      recommendedParams: { finishedSize: 'A4', pageCount: 32, bindingType: 'saddle_stitch' },
    },
    '不要骑马钉，改胶装'
  )

  assert(result?.patchParams.bindingType === 'perfect_bind', '应识别胶装 patch')
})

test('保留 + 替换: 页数不变，改胶装', () => {
  const result = applyRecommendedPatch(
    {
      productType: 'album',
      recommendedParams: { finishedSize: 'A4', pageCount: 32, bindingType: 'saddle_stitch' },
    },
    '页数不变，改胶装'
  )

  assert(result?.patchParams.bindingType === 'perfect_bind', '应识别装订替换 patch')
  assert(result?.mergedRecommendedParams.pageCount === 32, '未修改页数应保持原值')
  assert(Boolean(result?.patchSummary?.includes('页数保持 32')), '应识别显式保留语义')
})

test('同时改多个字段: 页数改成40，内页改128g', () => {
  const result = applyRecommendedPatch(
    {
      productType: 'album',
      recommendedParams: { finishedSize: 'A4', pageCount: 32, innerWeight: 157 },
    },
    '页数改成40，内页改128g'
  )

  assert(result?.patchParams.pageCount === 40, '应识别页数 patch')
  assert(result?.patchParams.innerWeight === 128, '应识别内页克重 patch')
})

test('局部保留 + 局部修改: 封面还是200g，内页改157g', () => {
  const result = applyRecommendedPatch(
    {
      productType: 'album',
      recommendedParams: { coverWeight: 200, innerWeight: 128 },
    },
    '封面还是200g，内页改157g'
  )

  assert(result?.patchParams.coverWeight === 200, '应保留封面克重')
  assert(result?.patchParams.innerWeight === 157, '应修改内页克重')
})

test('枚举替换: 传单改单面', () => {
  const result = applyRecommendedPatch(
    {
      productType: 'flyer',
      recommendedParams: { finishedSize: 'A4', printSides: 'double', paperWeight: 157 },
    },
    '传单改单面'
  )

  assert(result?.patchParams.printSides === 'single', '应识别单双面 patch')
})

test('否定 + 替换: 不要双面，改单面', () => {
  const result = applyRecommendedPatch(
    {
      productType: 'flyer',
      recommendedParams: { finishedSize: 'A4', printSides: 'double', paperWeight: 157 },
    },
    '不要双面，改单面'
  )

  assert(result?.patchParams.printSides === 'single', '应识别否定后改单面 patch')
})

test('相对修改: 纸张换薄一点', () => {
  const result = applyRecommendedPatch(
    {
      productType: 'flyer',
      recommendedParams: { finishedSize: 'A4', printSides: 'double', paperWeight: 157 },
    },
    '还是双面，但纸张换薄一点'
  )

  assert(result?.patchParams.paperWeight === 128, '应将纸张克重下调一档')
  assert(Boolean(result?.patchSummary?.includes('单双面保持 双面')), '应识别单双面保留语义')
})

test('相对修改: 封面改厚一点', () => {
  const result = applyRecommendedPatch(
    {
      productType: 'album',
      recommendedParams: { finishedSize: 'A4', coverWeight: 200, innerWeight: 157 },
    },
    '内页还是157g，封面改厚一点'
  )

  assert(result?.patchParams.coverWeight === 250, '应将封面克重上调一档')
  assert(result?.patchParams.innerWeight === 157, '显式保留内页克重时应维持原值')
})

test('尺寸修改: 名片尺寸改成90x50mm', () => {
  const result = applyRecommendedPatch(
    {
      productType: 'business_card',
      recommendedParams: { finishedSize: '90x54mm', paperWeight: 300, printSides: 'double' },
    },
    '名片尺寸改成90x50mm'
  )

  assert(result?.patchParams.finishedSize === '90x50mm', '应识别尺寸 patch')
})

test('名片工艺修改: 改成UV上光', () => {
  const result = applyRecommendedPatch(
    {
      productType: 'business_card',
      recommendedParams: { finishedSize: '90x54mm', paperWeight: 300, printSides: 'double', finishType: 'none' },
    },
    '名片改成UV上光'
  )

  assert(result?.patchParams.finishType === 'uv', '应识别名片 UV 工艺 patch')
  assert(result?.mergedRecommendedParams.finishType === 'uv', '应合并名片 UV 工艺 patch')
})

test('海报覆膜修改: 改哑膜', () => {
  const result = applyRecommendedPatch(
    {
      productType: 'poster',
      recommendedParams: { finishedSize: 'A2', paperWeight: 157, lamination: 'none' },
    },
    '海报改哑膜'
  )

  assert(result?.patchParams.lamination === 'matte', '应识别海报覆膜 patch')
  assert(result?.mergedRecommendedParams.lamination === 'matte', '应合并海报覆膜 patch')
})

test('推荐方案不存在时，不应误走 patch 合并', () => {
  const result = applyRecommendedPatch(null, '页数改成40')
  assert(result === null, '没有推荐方案时不应生成 patch 结果')
})

test('patch 失败时不应破坏原方案', () => {
  const result = applyRecommendedPatch(
    {
      productType: 'album',
      recommendedParams: { finishedSize: 'A4', pageCount: 32 },
    },
    '我想再看看'
  )

  assert(Boolean(result), '应返回安全结果')
  assert(Object.keys(result?.patchParams || {}).length === 0, '无法识别 patch 时应返回空 patch')
  assert(result?.mergedRecommendedParams.pageCount === 32, '无法识别 patch 时不应破坏推荐方案')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((r) => r.passed).length
const total = results.length

console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) process.exit(1)
