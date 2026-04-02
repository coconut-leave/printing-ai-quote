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

// 从 /api/chat 中抽离的函数（为了单元测试）
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

function checkMissingFields(params: Record<string, any>): string[] {
  const productType = (params.productType || 'album').toLowerCase()

  let requiredFields: string[]
  if (productType === 'flyer') {
    requiredFields = [
      'productType',
      'finishedSize',
      'quantity',
      'paperType',
      'paperWeight',
      'printSides',
    ]
  } else if (productType === 'business_card') {
    requiredFields = [
      'productType',
      'finishedSize',
      'quantity',
      'paperType',
      'paperWeight',
      'printSides',
    ]
  } else if (productType === 'poster') {
    requiredFields = [
      'productType',
      'finishedSize',
      'quantity',
      'paperType',
      'paperWeight',
    ]
  } else {
    requiredFields = [
      'productType',
      'finishedSize',
      'quantity',
      'coverPaper',
      'coverWeight',
      'innerPaper',
      'innerWeight',
      'bindingType',
      'pageCount',
    ]
  }

  return requiredFields.filter((key) => {
    const value = params[key]
    if (value === undefined || value === null) {
      return true
    }
    if (typeof value === 'string' && value.trim() === '') {
      return true
    }
    return false
  })
}

function isFileBasedInquiry(message: string): boolean {
  const fileKeywords = [
    'pdf', 'ai', 'cdr', 'psd', 'zip',
    '附件', '设计稿', '文件发你了', '按文件报价', '审稿'
  ]

  const lowerMessage = message.toLowerCase()
  return fileKeywords.some(keyword => lowerMessage.includes(keyword))
}

console.log('\n=== 参数合并与缺陷检测单元测试 ===\n')

// 参数合并测试
test('参数合并: 从空历史开始', () => {
  const current = { productType: 'album', finishedSize: 'A4', quantity: 1000 }
  const merged = mergeParameters(null, current)

  assert(merged.productType === 'album', 'productType 应被保留')
  assert(merged.finishedSize === 'A4', 'finishedSize 应被保留')
  assert(merged.quantity === 1000, 'quantity 应被保留')
})

test('参数合并: 新参数覆盖历史', () => {
  const historical = { productType: 'album', finishedSize: 'A4', quantity: 1000 }
  const current = { quantity: 2000 }
  const merged = mergeParameters(historical, current)

  assert(merged.quantity === 2000, '新的 quantity 应覆盖历史值')
  assert(merged.productType === 'album', '未覆盖的字段应保留')
  assert(merged.finishedSize === 'A4', '未覆盖的字段应保留')
})

test('参数合并: 部分字段更新', () => {
  const historical = {
    productType: 'album',
    finishedSize: 'A4',
    quantity: 1000,
    coverPaper: 'coated',
    coverWeight: 200,
  }
  const current = { innerPaper: 'matte', innerWeight: 157 }
  const merged = mergeParameters(historical, current)

  assert(merged.quantity === 1000, '保存历史 quantity')
  assert(merged.innerPaper === 'matte', '新增 innerPaper')
  assert(merged.innerWeight === 157, '新增 innerWeight')
  assert(merged.coverPaper === 'coated', '保留历史 coverPaper')
})

test('参数合并: 清理嵌套字段', () => {
  const historical = { productType: 'album', quantity: 1000, mergedParams: { old: 'value' } }
  const current = {}
  const merged = mergeParameters(historical, current)

  assert(merged.mergedParams === undefined, 'mergedParams 应被清理')
  assert(merged.missingFields === undefined, 'missingFields 应被清理')
  assert(merged.productType === 'album', '其他字段应保留')
})

test('参数合并: 避免补参轮次将非 album 覆盖为默认 album', () => {
  const historical = {
    productType: 'poster',
    finishedSize: 'A2',
    quantity: 80,
  }
  const current = {
    productType: 'album',
    paperType: 'coated',
    paperWeight: 157,
  }

  const merged = mergeParameters(historical, current)
  assert(merged.productType === 'poster', 'poster 不应被默认 album 覆盖')
  assert(merged.paperType === 'coated', '补参字段应正常合并')
})

// 缺陷检测测试
test('缺陷检测: Album 缺所有必填字段', () => {
  const params = { productType: 'album' }
  const missing = checkMissingFields(params)

  assert(missing.includes('finishedSize'), '应缺 finishedSize')
  assert(missing.includes('quantity'), '应缺 quantity')
  assert(missing.includes('coverPaper'), '应缺 coverPaper')
  assert(missing.includes('pageCount'), '应缺 pageCount')
  assert(missing.length === 8, '应缺 8 个字段')
})

test('缺陷检测: Album 完全齐全', () => {
  const params = {
    productType: 'album',
    finishedSize: 'A4',
    quantity: 1000,
    coverPaper: 'coated',
    coverWeight: 200,
    innerPaper: 'coated',
    innerWeight: 157,
    bindingType: 'saddle_stitch',
    pageCount: 32,
  }
  const missing = checkMissingFields(params)

  assert(missing.length === 0, '所有字段齐全，不应缺陷')
})

test('缺陷检测: Album 部分缺陷', () => {
  const params = {
    productType: 'album',
    finishedSize: 'A4',
    quantity: 1000,
    coverPaper: 'coated',
    coverWeight: 200,
    // innerPaper, innerWeight, bindingType, pageCount 缺失
  }
  const missing = checkMissingFields(params)

  assert(missing.includes('innerPaper'), '应缺 innerPaper')
  assert(missing.includes('innerWeight'), '应缺 innerWeight')
  assert(missing.includes('bindingType'), '应缺 bindingType')
  assert(missing.includes('pageCount'), '应缺 pageCount')
  assert(!missing.includes('quantity'), 'quantity 已有不应缺')
})

test('缺陷检测: Flyer 缺所有必填字段', () => {
  const params = { productType: 'flyer' }
  const missing = checkMissingFields(params)

  assert(missing.includes('finishedSize'), '应缺 finishedSize')
  assert(missing.includes('quantity'), '应缺 quantity')
  assert(missing.includes('paperType'), '应缺 paperType')
  assert(missing.includes('paperWeight'), '应缺 paperWeight')
  assert(missing.includes('printSides'), '应缺 printSides')
  assert(!missing.includes('coverPaper'), 'Flyer 不应缺 coverPaper')
  assert(missing.length === 5, 'Flyer 应缺 5 个字段')
})

test('缺陷检测: Flyer 完全齐全', () => {
  const params = {
    productType: 'flyer',
    finishedSize: 'A4',
    quantity: 5000,
    paperType: 'matte',
    paperWeight: 200,
    printSides: 'double',
  }
  const missing = checkMissingFields(params)

  assert(missing.length === 0, 'Flyer 字段齐全，不应缺陷')
})

test('缺陷检测: Poster 必填检测', () => {
  const params = {
    productType: 'poster',
    finishedSize: 'A2',
    quantity: 100,
    paperType: 'coated',
    paperWeight: 157,
  }
  const missing = checkMissingFields(params)
  assert(missing.length === 0, 'Poster 必填齐全，不应缺陷')
})

test('缺陷检测: Poster 允许缺少覆膜字段', () => {
  const params = {
    productType: 'poster',
    finishedSize: 'A2',
    quantity: 100,
    paperType: 'coated',
    // paperWeight 缺失
  }
  const missing = checkMissingFields(params)

  assert(missing.includes('paperWeight'), 'Poster 应缺 paperWeight')
  assert(!missing.includes('lamination'), 'Poster 不应要求 lamination')
})

test('缺陷检测: 空字符串视为缺陷', () => {
  const params = {
    productType: 'album',
    finishedSize: '',
    quantity: 1000,
  }
  const missing = checkMissingFields(params)

  assert(missing.includes('finishedSize'), '空字符串应视为缺陷')
})

test('缺陷检测: null 值视为缺陷', () => {
  const params = {
    productType: 'album',
    finishedSize: 'A4',
    quantity: null,
  }
  const missing = checkMissingFields(params)

  assert(missing.includes('quantity'), 'null 应视为缺陷')
})

test('缺陷检测: undefined 值视为缺陷', () => {
  const params = {
    productType: 'album',
    finishedSize: 'A4',
    quantity: undefined,
  }
  const missing = checkMissingFields(params)

  assert(missing.includes('quantity'), 'undefined 应视为缺陷')
})

// 文件检测测试
test('文件检测: PDF 关键词触发', () => {
  const msg = '请按 PDF 发的设计稿来报价'
  assert(isFileBasedInquiry(msg) === true, '应检测到 pdf')
})

test('文件检测: 设计稿关键词触发', () => {
  const msg = '我已把设计稿给你发了'
  assert(isFileBasedInquiry(msg) === true, '应检测到设计稿')
})

test('文件检测: 附件关键词触发', () => {
  const msg = '附件里是我要印刷的文件'
  assert(isFileBasedInquiry(msg) === true, '应检测到附件')
})

test('文件检测: CDR 格式关键词触发', () => {
  const msg = 'CDR 文件我发了'
  assert(isFileBasedInquiry(msg) === true, '应检测到 cdr')
})

test('文件检测: 审稿关键词触发', () => {
  const msg = '请帮我审稿一下'
  assert(isFileBasedInquiry(msg) === true, '应检测到审稿')
})

test('文件检测: 大小写不敏感', () => {
  const msg = 'Please check my PDF file'
  assert(isFileBasedInquiry(msg) === true, '应不区分大小写检测到 pdf')
})

test('文件检测: 无关键词不触发', () => {
  const msg = '我想印一千本画册，200g 铜版纸'
  assert(isFileBasedInquiry(msg) === false, '不应误检测')
})

test('文件检测: 多个关键词同时存在', () => {
  const msg = 'PDF 和 AI 文件都发了，请按照附件设计稿审稿'
  assert(isFileBasedInquiry(msg) === true, '应检测到任意一个关键词')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((r) => r.passed).length
const total = results.length
console.log(`通过: ${passed}/${total}`)

if (passed < total) {
  console.log('\n失败的用例:')
  results.filter((r) => !r.passed).forEach((r) => {
    console.log(`  - ${r.name}`)
    if (r.error) console.log(`    ${r.error}`)
  })
  process.exit(1)
}
