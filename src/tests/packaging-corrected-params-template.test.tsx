import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PackagingCorrectedParamsEditor } from '@/components/PackagingCorrectedParamsEditor'
import { mergeReflectionPackagingContext } from '@/lib/reflection/context'
import {
  addPackagingDraftReviewReason,
  addPackagingDraftSubItem,
  buildPackagingCorrectedParamsDraft,
  buildPackagingCorrectedParamsPayload,
  removePackagingDraftReviewReason,
  removePackagingDraftSubItem,
  updatePackagingDraftReviewReason,
  updatePackagingDraftSubItem,
} from '@/lib/reflection/packagingCorrectedParams'

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

const baseOriginalExtractedParams = {
  productType: 'window_box',
  isBundle: true,
  packagingContext: {
    flow: 'complex_packaging',
    mainItem: {
      productType: 'window_box',
      title: '开窗彩盒',
      quantity: 500,
      length: 21,
      width: 17,
      height: 31,
      sizeUnit: 'cm',
      material: 'specialty_board',
      weight: 400,
      printColor: 'four_color',
      surfaceFinish: 'matte_lamination',
      processes: ['裱', '啤'],
      windowFilmThickness: 0.2,
      windowSizeLength: 8,
      windowSizeWidth: 5,
    },
    subItems: [
      {
        productType: 'seal_sticker',
        title: '封口贴',
        quantity: 500,
        stickerMaterial: 'clear_sticker',
        stickerLength: 2.4,
        stickerWidth: 1.6,
        sizeUnit: 'cm',
      },
    ],
    reviewReasons: [
      {
        code: 'thick_window_film',
        label: '胶片偏厚',
        message: '胶片偏厚，建议人工复核',
      },
    ],
    requiresHumanReview: true,
  },
}

console.log('\n=== 包装 correctedParams 模板回归测试 ===\n')

async function main() {
  await test('复杂包装 reflection 应生成带 mainItem 和 subItems 的初始模板', () => {
    const draft = buildPackagingCorrectedParamsDraft({
      issueType: 'PACKAGING_PARAM_WRONG',
      originalExtractedParams: baseOriginalExtractedParams,
    })

    assert(Boolean(draft), '复杂包装 issueType 应生成草稿')
    assert(draft?.productType === 'window_box', '主件 productType 应保留为 window_box')
    assert(draft?.packagingContext.mainItem.productType === 'window_box', '主件信息应保留')
    assert(draft?.packagingContext.subItems.length === 1, '应预填 subItems')
    assert(draft?.packagingContext.reviewReasons.length === 1, '应预填 reviewReasons')
  })

  await test('window_box 模板渲染应显示中文字段与 bundle 结构', () => {
    const draft = buildPackagingCorrectedParamsDraft({
      issueType: 'PACKAGING_REVIEW_REASON_WRONG',
      originalExtractedParams: baseOriginalExtractedParams,
    })

    if (!draft) {
      throw new Error('window_box draft 未生成')
    }

    const html = renderToStaticMarkup(
      <PackagingCorrectedParamsEditor
        issueType='PACKAGING_REVIEW_REASON_WRONG'
        draft={draft}
        onMainItemFieldChange={() => undefined}
        onSubItemFieldChange={() => undefined}
        onAddSubItem={() => undefined}
        onRemoveSubItem={() => undefined}
        onReviewReasonChange={() => undefined}
        onAddReviewReason={() => undefined}
        onRemoveReviewReason={() => undefined}
        onRequiresHumanReviewChange={() => undefined}
      />
    )

    assert(html.includes('主件'), '模板应显示主件区块')
    assert(html.includes('配套件 1'), '模板应显示 subItem 区块')
    assert(html.includes('包装项名称'), '模板应显示中文名称字段')
    assert(html.includes('产品类型'), '模板应显示中文产品类型')
    assert(html.includes('胶片厚度'), 'window_box 应显示胶片厚度字段')
    assert(html.includes('窗长'), 'window_box 应显示窗长字段')
    assert(html.includes('窗宽'), 'window_box 应显示窗宽字段')
    assert(html.includes('复核与转人工'), '复核类 issueType 应显示复核面板')
  })

  await test('subItems 应支持新增、编辑、删除，并保持结构化 correctedParams', () => {
    const draft = buildPackagingCorrectedParamsDraft({
      issueType: 'BUNDLE_STRUCTURE_WRONG',
      originalExtractedParams: baseOriginalExtractedParams,
    })

    if (!draft) {
      throw new Error('bundle draft 未生成')
    }

    const added = addPackagingDraftSubItem(draft, 'box_insert')
    assert(added.packagingContext.subItems.length === 2, '应支持新增 subItem')

    const updated = updatePackagingDraftSubItem(added, 1, 'insertMaterial', 'white_card')
    assert(updated.packagingContext.subItems[1].insertMaterial === 'white_card', '应支持编辑 subItem 字段')

    const removed = removePackagingDraftSubItem(updated, 0)
    assert(removed.packagingContext.subItems.length === 1, '应支持删除 subItem')
    assert(removed.packagingContext.subItems[0].productType === 'box_insert', '删除后剩余 subItem 应正确保留')

    const payload = buildPackagingCorrectedParamsPayload(removed)
    assert(payload.isBundle === true, '仍有 subItems 时 isBundle 应保持 true')
    assert(payload.packagingContext.subItems[0].insertMaterial === 'white_card', '保存前结构化 correctedParams 应保留编辑结果')
  })

  await test('清空 subItems 与 reviewReasons 应覆盖原始 packaging context，而不是回退旧值', () => {
    const draft = buildPackagingCorrectedParamsDraft({
      issueType: 'PACKAGING_REVIEW_REASON_WRONG',
      originalExtractedParams: baseOriginalExtractedParams,
    })

    if (!draft) {
      throw new Error('review draft 未生成')
    }

    const withoutSubItems = removePackagingDraftSubItem(draft, 0)
    const payloadWithoutSubItems = buildPackagingCorrectedParamsPayload(withoutSubItems)
    const mergedWithoutSubItems = mergeReflectionPackagingContext(baseOriginalExtractedParams, payloadWithoutSubItems)
    assert(payloadWithoutSubItems.isBundle === false, '删除全部 subItems 后 isBundle 应为 false')
    assert(payloadWithoutSubItems.packagingContext.subItems.length === 0, 'payload 应保留空 subItems 数组')
    assert((mergedWithoutSubItems?.subItems.length || 0) === 0, '合并上下文后不应回退原始 subItems')

    const withAddedReason = addPackagingDraftReviewReason(draft)
    const updatedReason = updatePackagingDraftReviewReason(withAddedReason, 1, 'message', '新加的复核原因说明')
    assert(updatedReason.packagingContext.reviewReasons.length === 2, '应支持新增复核原因')
    assert(updatedReason.packagingContext.reviewReasons[1].message === '新加的复核原因说明', '应支持编辑复核原因')

    const clearedReasons = removePackagingDraftReviewReason(removePackagingDraftReviewReason(updatedReason, 1), 0)
    const payloadWithoutReasons = buildPackagingCorrectedParamsPayload(clearedReasons)
    const mergedWithoutReasons = mergeReflectionPackagingContext(baseOriginalExtractedParams, payloadWithoutReasons)
    assert(payloadWithoutReasons.packagingContext.reviewReasons.length === 0, 'payload 应保留空 reviewReasons 数组')
    assert((mergedWithoutReasons?.reviewReasons.length || 0) === 0, '合并上下文后不应回退原始 reviewReasons')
  })

  await test('非包装 reflection issueType 不应生成包装模板', () => {
    const draft = buildPackagingCorrectedParamsDraft({
      issueType: 'PARAM_WRONG',
      originalExtractedParams: baseOriginalExtractedParams,
    })

    assert(draft === null, '非包装 issueType 应保持原有 JSON 流程')
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