import {
  WORKBOOK_FORMULA_TEMPLATES,
  WORKBOOK_PRODUCT_FAMILY_TEMPLATES,
  WORKBOOK_QUOTE_CORE_COLUMNS,
  WORKBOOK_REQUIRED_FIELDS,
  canTemplateBeQuoted,
  getWorkbookProductFamilyTemplate,
} from '@/server/pricing/workbookPricingEngineDraft'

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

console.log('\n=== Workbook 报价引擎抽象草案测试 ===\n')

test('产品族模板应覆盖要求的 7 个 template', () => {
  const ids = WORKBOOK_PRODUCT_FAMILY_TEMPLATES.map((item) => item.id)
  assert(ids.includes('tuck_end_box_template'), '应包含 tuck_end_box_template')
  assert(ids.includes('folding_carton_template'), '应包含 folding_carton_template')
  assert(ids.includes('mailer_box_template'), '应包含 mailer_box_template')
  assert(ids.includes('window_box_template'), '应包含 window_box_template')
  assert(ids.includes('leaflet_insert_template'), '应包含 leaflet_insert_template')
  assert(ids.includes('box_insert_template'), '应包含 box_insert_template')
  assert(ids.includes('seal_sticker_template'), '应包含 seal_sticker_template')
})

test('workbook 核心列和必须保留字段应完整存在', () => {
  assert(WORKBOOK_QUOTE_CORE_COLUMNS.includes('项目'), '应保留 workbook 项目列')
  assert(WORKBOOK_QUOTE_CORE_COLUMNS.includes('吨价'), '应保留 workbook 吨价列')
  assert(WORKBOOK_QUOTE_CORE_COLUMNS.includes('实际数量'), '应保留 workbook 实际数量列')

  assert(WORKBOOK_REQUIRED_FIELDS.includes('actual_quantity'), '应保留 actual_quantity')
  assert(WORKBOOK_REQUIRED_FIELDS.includes('charge_quantity'), '应保留 charge_quantity')
  assert(WORKBOOK_REQUIRED_FIELDS.includes('basis_weight'), '应保留 basis_weight')
  assert(WORKBOOK_REQUIRED_FIELDS.includes('basis_factor'), '应保留 basis_factor')
  assert(WORKBOOK_REQUIRED_FIELDS.includes('flat_length'), '应保留 flat_length')
  assert(WORKBOOK_REQUIRED_FIELDS.includes('flat_width'), '应保留 flat_width')
  assert(WORKBOOK_REQUIRED_FIELDS.includes('markup_rate'), '应保留 markup_rate')
  assert(WORKBOOK_REQUIRED_FIELDS.includes('tax_rate'), '应保留 tax_rate')
})

test('通用公式模板应与技术草案一致', () => {
  const formulaMap = new Map(WORKBOOK_FORMULA_TEMPLATES.map((item) => [item.id, item]))

  assert(
    formulaMap.get('ton_price_material')?.expression === 'amount = basis_weight * length * width * ton_price * charge_quantity / 10000000000',
    'ton_price_material 公式应一致'
  )
  assert(
    formulaMap.get('area_based_material')?.expression === 'amount = basis_factor * (length / 2.54) * (width / 2.54) * area_unit_price * charge_quantity / 1000',
    'area_based_material 公式应一致'
  )
  assert(formulaMap.get('fixed_fee')?.expression === 'amount = fixed_amount', 'fixed_fee 公式应一致')
  assert(formulaMap.get('quantity_based_process')?.expression === 'amount = unit_price * charge_quantity', 'quantity_based_process 公式应一致')
  assert(formulaMap.get('line_unit_price')?.expression === 'unit_price = amount / actual_quantity', 'line_unit_price 公式应一致')
  assert(formulaMap.get('subtotal')?.expression === 'cost_subtotal = sum(line_item.amount)', 'subtotal 公式应一致')
  assert(formulaMap.get('quote_markup')?.expression === 'quoted_amount = cost_subtotal * quote_markup', 'quote_markup 公式应一致')
  assert(formulaMap.get('tax_markup')?.expression === 'final_amount = quoted_amount * tax_multiplier', 'tax_markup 公式应一致')
})

test('首批盒型模板应覆盖要求的 line-items', () => {
  const tuckEndBox = getWorkbookProductFamilyTemplate('tuck_end_box_template')
  const mailerBox = getWorkbookProductFamilyTemplate('mailer_box_template')
  const windowBox = getWorkbookProductFamilyTemplate('window_box_template')

  assert(Boolean(tuckEndBox), '应能获取 tuck_end_box_template')
  assert(Boolean(mailerBox), '应能获取 mailer_box_template')
  assert(Boolean(windowBox), '应能获取 window_box_template')

  const tuckLineNames = tuckEndBox!.lineItems.map((item) => item.displayName)
  assert(tuckLineNames.includes('面纸'), '双插盒模板应包含 面纸')
  assert(tuckLineNames.includes('芯材/加强芯'), '双插盒模板应包含 芯材/加强芯')
  assert(tuckLineNames.includes('覆膜'), '双插盒模板应包含 覆膜')
  assert(tuckLineNames.includes('裱纸'), '双插盒模板应包含 裱纸')
  assert(tuckLineNames.includes('印刷费'), '双插盒模板应包含 印刷费')
  assert(tuckLineNames.includes('刀模'), '双插盒模板应包含 刀模')
  assert(tuckLineNames.includes('啤机'), '双插盒模板应包含 啤机')
  assert(tuckLineNames.includes('粘盒'), '双插盒模板应包含 粘盒')
  assert(tuckLineNames.includes('特殊工艺'), '双插盒模板应包含 特殊工艺')
  assert(tuckLineNames.includes('运费'), '双插盒模板应包含 运费')
  assert(tuckLineNames.includes('纸箱'), '双插盒模板应包含 纸箱')

  const mailerLineNames = mailerBox!.lineItems.map((item) => item.displayName)
  assert(mailerLineNames.includes('外层纸材'), '飞机盒模板应包含 外层纸材')
  assert(mailerLineNames.includes('内层纸材（如存在）'), '飞机盒模板应包含 内层纸材（如存在）')
  assert(mailerLineNames.includes('芯材/加强芯'), '飞机盒模板应包含 芯材/加强芯')
  assert(mailerLineNames.includes('粘盒/成型'), '飞机盒模板应包含 粘盒/成型')

  const windowLineNames = windowBox!.lineItems.map((item) => item.displayName)
  assert(windowLineNames.includes('主纸材'), '开窗彩盒模板应包含 主纸材')
  assert(windowLineNames.includes('胶片'), '开窗彩盒模板应包含 胶片')
  assert(windowLineNames.includes('开窗相关工艺'), '开窗彩盒模板应包含 开窗相关工艺')
})

test('quoted 边界应要求关键 line-items 全部到位', () => {
  const tuckEndBox = getWorkbookProductFamilyTemplate('tuck_end_box_template')
  const windowBox = getWorkbookProductFamilyTemplate('window_box_template')
  assert(Boolean(tuckEndBox), '应能获取 tuck_end_box_template')
  assert(Boolean(windowBox), '应能获取 window_box_template')

  const tuckQuoted = canTemplateBeQuoted(tuckEndBox!, [
    'face_paper',
    'printing_fee',
    'die_mold',
    'die_cut_machine',
    'gluing',
  ])
  const tuckMissingCritical = canTemplateBeQuoted(tuckEndBox!, [
    'face_paper',
    'printing_fee',
    'die_mold',
    'gluing',
  ])
  const windowMissingFilm = canTemplateBeQuoted(windowBox!, [
    'main_paper',
    'printing_fee',
    'die_mold',
    'die_cut_machine',
    'gluing',
    'window_process',
  ])

  assert(tuckQuoted === true, '双插盒关键项齐全时应允许 quoted')
  assert(tuckMissingCritical === false, '双插盒少啤机时不应 quoted')
  assert(windowMissingFilm === false, '开窗彩盒缺胶片时不应 quoted')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((item) => item.passed).length
const total = results.length
console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) {
  process.exit(1)
}