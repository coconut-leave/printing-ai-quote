import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PackagingReflectionDiff } from '@/components/PackagingReflectionDiff'
import { buildPackagingReflectionDiff } from '@/lib/reflection/packagingDiff'

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function test(name: string, fn: () => Promise<void> | void) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      results.push({ name, passed: true })
      console.log(`✓ ${name}`)
    })
    .catch((err) => {
      const error = err instanceof Error ? err.message : String(err)
      results.push({ name, passed: false, error })
      console.error(`✗ ${name}`)
      console.error(`  └─ ${error}`)
    })
}

function buildOriginalParams() {
  return {
    productType: 'window_box',
    packagingContext: {
      flow: 'complex_packaging',
      mainItem: {
        productType: 'window_box',
        title: '开窗彩盒',
        quantity: 1200,
        length: 16,
        width: 10,
        height: 5,
        sizeUnit: 'cm',
        material: 'single_coated',
        weight: 400,
        printColor: 'four_color',
        surfaceFinish: 'matte_lamination',
        windowFilmThickness: 0.2,
        windowSizeLength: 6,
        windowSizeWidth: 4,
        processes: ['啤', '粘'],
      },
      subItems: [
        {
          productType: 'leaflet_insert',
          title: '说明书',
          quantity: 1200,
          length: 14,
          width: 10,
          sizeUnit: 'cm',
          paperType: 'double_coated',
          paperWeight: 128,
          printColor: 'double_four_color_print',
          foldType: 'bi_fold',
          foldCount: 2,
        },
        {
          productType: 'seal_sticker',
          title: '透明贴纸',
          quantity: 1200,
          stickerMaterial: 'clear_sticker',
          stickerLength: 2.5,
          stickerWidth: 2,
          sizeUnit: 'cm',
        },
      ],
      reviewReasons: [
        {
          code: 'large_window_ratio',
          label: 'large_window_ratio',
          message: '窗位占比较高，建议人工复核',
        },
      ],
      requiresHumanReview: false,
      packagingReview: {
        status: 'estimated',
      },
    },
  }
}

function buildCorrectedParams() {
  return {
    productType: 'window_box',
    isBundle: true,
    packagingContext: {
      flow: 'complex_packaging',
      mainItem: {
        productType: 'window_box',
        title: '开窗彩盒',
        quantity: 1500,
        length: 16,
        width: 10,
        height: 5,
        sizeUnit: 'cm',
        material: 'white_card',
        weight: 350,
        printColor: 'double_four_color',
        surfaceFinish: 'glossy_lamination',
        windowFilmThickness: 0.3,
        windowSizeLength: 6.5,
        windowSizeWidth: 4.2,
        processes: ['裱', '啤', '粘'],
      },
      subItems: [
        {
          productType: 'leaflet_insert',
          title: '说明书',
          quantity: 1200,
          length: 14,
          width: 10,
          sizeUnit: 'cm',
          paperType: 'double_coated',
          paperWeight: 157,
          printColor: 'black',
          printSides: 'double',
          foldType: 'tri_fold',
          foldCount: 3,
        },
        {
          productType: 'box_insert',
          title: '内托',
          quantity: 1200,
          insertMaterial: 'specialty_board',
          insertLength: 15,
          insertWidth: 9,
          sizeUnit: 'cm',
        },
      ],
      reviewReasons: [
        {
          code: 'large_window_ratio',
          label: 'large_window_ratio',
          message: '窗位占比较高，建议人工复核',
        },
        {
          code: 'high_spot_color_count',
          label: 'high_spot_color_count',
          message: '专色较多，建议人工确认',
        },
      ],
      requiresHumanReview: true,
    },
  }
}

console.log('\n=== 包装 AI vs correctedParams diff 回归测试 ===\n')

async function main() {
  await test('mainItem 字段变更能正确显示 diff', () => {
    const diff = buildPackagingReflectionDiff({
      issueType: 'SHOULD_HANDOFF_BUT_NOT',
      originalExtractedParams: buildOriginalParams(),
      correctedParams: buildCorrectedParams(),
    })

    assert(Boolean(diff), '应生成 complex packaging diff')
    assert(diff?.mainItemChanges.some((item) => item.label === '材质' && item.before === '单铜纸' && item.after === '白卡纸'), '应显示材质变化')
    assert(diff?.mainItemChanges.some((item) => item.label === '克重' && item.before === '400' && item.after === '350'), '应显示克重变化')
    assert(diff?.mainItemChanges.some((item) => item.label === '印色' && item.before === '四色' && item.after === '正反四色'), '应显示印色变化')
  })

  await test('subItems 新增能显示', () => {
    const diff = buildPackagingReflectionDiff({
      issueType: 'BUNDLE_STRUCTURE_WRONG',
      originalExtractedParams: buildOriginalParams(),
      correctedParams: buildCorrectedParams(),
    })

    assert(diff?.subItemChanges.some((item) => item.type === 'added' && item.title === '内托'), '应显示新增内托')
  })

  await test('subItems 删除能显示', () => {
    const diff = buildPackagingReflectionDiff({
      issueType: 'BUNDLE_STRUCTURE_WRONG',
      originalExtractedParams: buildOriginalParams(),
      correctedParams: buildCorrectedParams(),
    })

    assert(diff?.subItemChanges.some((item) => item.type === 'removed' && item.title === '透明贴纸'), '应显示删除透明贴纸')
  })

  await test('subItems 修改能显示', () => {
    const diff = buildPackagingReflectionDiff({
      issueType: 'BUNDLE_STRUCTURE_WRONG',
      originalExtractedParams: buildOriginalParams(),
      correctedParams: buildCorrectedParams(),
    })
    const leaflet = diff?.subItemChanges.find((item) => item.type === 'modified' && item.title === '说明书')

    assert(Boolean(leaflet), '应识别说明书为修改')
    assert(leaflet?.fieldChanges.some((item) => item.field === 'paperWeight' && item.before === '128' && item.after === '157'), '应显示说明书克重修改')
    assert(leaflet?.fieldChanges.some((item) => item.field === 'printColor' && item.before === '双面四色印' && item.after === '印黑色'), '应显示说明书印色修改')
  })

  await test('reviewReasons 的新增 删除 保留能显示', () => {
    const diff = buildPackagingReflectionDiff({
      issueType: 'SHOULD_HANDOFF_BUT_NOT',
      originalExtractedParams: buildOriginalParams(),
      correctedParams: buildCorrectedParams(),
    })

    assert(diff?.reviewReasonChanges.some((item) => item.type === 'retained' && item.label === 'large_window_ratio'), '应显示保留的复核原因')
    assert(diff?.reviewReasonChanges.some((item) => item.type === 'added' && item.label === 'high_spot_color_count'), '应显示新增的复核原因')
  })

  await test('quoted estimated requiresHumanReview 变化能显示', () => {
    const diff = buildPackagingReflectionDiff({
      issueType: 'SHOULD_HANDOFF_BUT_NOT',
      originalExtractedParams: buildOriginalParams(),
      correctedParams: buildCorrectedParams(),
    })

    assert(diff?.resultChanges.some((item) => item.label === '结果' && item.before === '预报价' && item.after === '人工复核'), '应显示结果状态变化')
    assert(diff?.resultChanges.some((item) => item.label === '人工复核' && item.before === '不需要' && item.after === '需要'), '应显示人工复核变化')
  })

  await test('complex packaging 非 diff 路径不受影响', () => {
    const html = renderToStaticMarkup(
      <PackagingReflectionDiff
        issueType='PARAM_WRONG'
        originalExtractedParams={buildOriginalParams()}
        correctedParams={buildCorrectedParams()}
      />
    )

    assert(html === '', '非包装反思类型不应渲染 diff 区域')
  })

  await test('默认展示应可读而不是大段 JSON', () => {
    const html = renderToStaticMarkup(
      <PackagingReflectionDiff
        issueType='SHOULD_HANDOFF_BUT_NOT'
        originalExtractedParams={buildOriginalParams()}
        correctedParams={buildCorrectedParams()}
      />
    )

    assert(html.includes('主件差异'), '应渲染主件差异区块')
    assert(html.includes('子组件变化'), '应渲染子组件变化区块')
    assert(html.includes('结果与审核变化'), '应渲染结果与审核变化区块')
    assert(html.includes('复核原因变化'), '应渲染复核原因变化区块')
    assert(html.includes('材质'), '应渲染中文字段名')
    assert(html.includes('单铜纸 -&gt; 白卡纸'), '应渲染中文可读 diff 文案')
    assert(html.includes('查看原始 JSON'), '应保留查看原始 JSON 入口')
  })

  console.log('\n=== 测试总结 ===\n')
  const passed = results.filter((result) => result.passed).length
  const total = results.length
  console.log(`总计: ${passed}/${total} 通过`)
  if (passed < total) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})