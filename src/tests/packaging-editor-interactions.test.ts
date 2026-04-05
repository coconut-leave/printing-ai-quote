import {
  addPackagingDraftSubItem,
  buildPackagingCorrectedParamsPayload,
  removePackagingDraftSubItem,
  updatePackagingDraftMainItem,
  updatePackagingDraftSubItem,
} from '@/lib/reflection/packagingCorrectedParams'
import {
  buildPackagingDraftSeed,
  resolvePackagingDraftOnIssueTypeChange,
} from '@/lib/reflection/packagingEditorState'

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
        label: '胶片偏厚',
        message: '胶片偏厚，建议人工复核',
      },
    ],
    requiresHumanReview: true,
  },
}

console.log('\n=== 包装编辑状态交互回归测试 ===\n')

test('保存后重新进入编辑应加载上次保存的包装修正结构', () => {
  const seedDraft = buildPackagingDraftSeed({
    issueType: 'PACKAGING_PARAM_WRONG',
    originalExtractedParams: baseOriginalExtractedParams,
  })
  if (!seedDraft) {
    throw new Error('初始草稿未生成')
  }

  const updatedDraft = updatePackagingDraftMainItem(seedDraft, 'surfaceFinish', 'matte_lamination')
  const addedDraft = addPackagingDraftSubItem(updatedDraft, 'box_insert')
  const editedDraft = updatePackagingDraftSubItem(addedDraft, 1, 'insertMaterial', 'white_card')
  const savedPayload = buildPackagingCorrectedParamsPayload(editedDraft)

  const reloadedDraft = buildPackagingDraftSeed({
    issueType: 'PACKAGING_PARAM_WRONG',
    originalExtractedParams: baseOriginalExtractedParams,
    correctedParams: savedPayload,
  })

  assert(reloadedDraft?.packagingContext.mainItem.surfaceFinish === 'matte_lamination', '重新进入编辑后应加载已保存主件字段')
  assert(reloadedDraft?.packagingContext.subItems.length === 2, '重新进入编辑后应保留新增 subItem')
  assert(reloadedDraft?.packagingContext.subItems[1].insertMaterial === 'white_card', '重新进入编辑后应保留 subItem 编辑结果')
})

test('删除 subItems 后保存再重载，不应回退为原始结构', () => {
  const seedDraft = buildPackagingDraftSeed({
    issueType: 'BUNDLE_STRUCTURE_WRONG',
    originalExtractedParams: baseOriginalExtractedParams,
  })
  if (!seedDraft) {
    throw new Error('bundle 草稿未生成')
  }

  const removedDraft = removePackagingDraftSubItem(seedDraft, 0)
  const savedPayload = buildPackagingCorrectedParamsPayload(removedDraft)
  const reloadedDraft = buildPackagingDraftSeed({
    issueType: 'BUNDLE_STRUCTURE_WRONG',
    originalExtractedParams: baseOriginalExtractedParams,
    correctedParams: savedPayload,
  })

  assert(savedPayload.packagingContext.subItems.length === 0, '保存载荷中应保留空 subItems')
  assert(reloadedDraft?.packagingContext.subItems.length === 0, '重载后不应回退原始 subItems')
})

test('包装 issueType 切换应保留结构，只按规则调整人工复核标记', () => {
  const seedDraft = buildPackagingDraftSeed({
    issueType: 'PACKAGING_PARAM_WRONG',
    originalExtractedParams: baseOriginalExtractedParams,
  })
  if (!seedDraft) {
    throw new Error('初始草稿未生成')
  }

  const expandedDraft = addPackagingDraftSubItem(seedDraft, 'leaflet_insert')
  const handoffDraft = resolvePackagingDraftOnIssueTypeChange({
    nextIssueType: 'SHOULD_HANDOFF_BUT_NOT',
    currentDraft: expandedDraft,
    seedDraft: null,
  })
  const quotedDraft = resolvePackagingDraftOnIssueTypeChange({
    nextIssueType: 'SHOULD_QUOTED_BUT_ESTIMATED',
    currentDraft: handoffDraft,
    seedDraft: null,
  })

  assert(handoffDraft?.packagingContext.subItems.length === 2, '切到 handoff 类 issueType 时不应丢失结构')
  assert(handoffDraft?.packagingContext.requiresHumanReview === true, 'SHOULD_HANDOFF_BUT_NOT 应强制 requiresHumanReview=true')
  assert(quotedDraft?.packagingContext.subItems.length === 2, '继续切换 issueType 时应保留同一套结构')
  assert(quotedDraft?.packagingContext.requiresHumanReview === false, 'SHOULD_QUOTED_BUT_ESTIMATED 应强制 requiresHumanReview=false')
})

test('从包装切到非包装再切回包装，不应清空已编辑结构', () => {
  const seedDraft = buildPackagingDraftSeed({
    issueType: 'PACKAGING_REVIEW_REASON_WRONG',
    originalExtractedParams: baseOriginalExtractedParams,
  })
  if (!seedDraft) {
    throw new Error('review 草稿未生成')
  }

  const editedDraft = updatePackagingDraftMainItem(seedDraft, 'surfaceFinish', 'glossy_lamination')
  const hiddenDraft = resolvePackagingDraftOnIssueTypeChange({
    nextIssueType: 'PARAM_WRONG',
    currentDraft: editedDraft,
    seedDraft: null,
  })
  const shownAgainDraft = resolvePackagingDraftOnIssueTypeChange({
    nextIssueType: 'PACKAGING_REVIEW_REASON_WRONG',
    currentDraft: hiddenDraft,
    seedDraft: seedDraft,
  })

  assert(hiddenDraft?.packagingContext.mainItem.surfaceFinish === 'glossy_lamination', '切到非包装时应暂存当前包装结构')
  assert(shownAgainDraft?.packagingContext.mainItem.surfaceFinish === 'glossy_lamination', '切回包装时应恢复之前已编辑结构')
})

test('会话页与审核页使用同一套 seed 逻辑时，应得到一致的可继续编辑结果', () => {
  const conversationDraft = buildPackagingDraftSeed({
    issueType: 'PACKAGING_PARAM_WRONG',
    originalExtractedParams: baseOriginalExtractedParams,
  })
  if (!conversationDraft) {
    throw new Error('会话页草稿未生成')
  }

  const savedPayload = buildPackagingCorrectedParamsPayload(
    updatePackagingDraftMainItem(conversationDraft, 'surfaceFinish', 'matte_lamination')
  )
  const reviewDraft = buildPackagingDraftSeed({
    issueType: 'PACKAGING_PARAM_WRONG',
    originalExtractedParams: baseOriginalExtractedParams,
    correctedParams: savedPayload,
  })

  assert(reviewDraft?.packagingContext.mainItem.surfaceFinish === 'matte_lamination', '审核页应加载和会话页相同的已保存修正')
  assert(buildPackagingCorrectedParamsPayload(reviewDraft!).packagingContext.mainItem.surfaceFinish === 'matte_lamination', '审核页继续保存时应沿用同一结构化载荷')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((result) => result.passed).length
const total = results.length

console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) {
  process.exit(1)
}