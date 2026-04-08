import type {
  ComplexPackagingItem,
  ComplexPackagingLineQuote,
  ComplexPackagingProductType,
  ComplexPackagingQuoteResult,
  ComplexPackagingRequest,
  ComplexPackagingReviewReason,
  ComplexPackagingReviewReasonCode,
} from '@/server/packaging/types'
import { aggregateBundlePricing } from './bundleAggregation'
import { buildWorkbookLineItemQuote } from './complexPackagingLineItemEngine'

const round2 = (value: number) => Math.round(value * 100) / 100
const BASE_SHIPPING_FEE = 80
const LARGE_WINDOW_RATIO_THRESHOLD = 0.65

type QuantityLadderEntry = {
  minQty: number
  runMultiplier: number
  setupMultiplier: number
  label: string
}

type LineCostBreakdown = {
  quantity: number
  setupCost: number
  runCost: number
  totalPrice: number
  unitPrice: number
  materialUnitCost: number
  printUnitCost: number
  processUnitCost: number
  notes: string[]
  reviewFlags: string[]
  reviewReasons: ComplexPackagingReviewReason[]
}

type PackagingPricingReview = {
  requiresHumanReview: boolean
  reviewFlags: string[]
  reviewReasons: ComplexPackagingReviewReason[]
}

const BOX_ITEM_TYPES: ComplexPackagingProductType[] = ['mailer_box', 'tuck_end_box', 'window_box', 'carton_packaging']

const BOX_QUANTITY_LADDER: QuantityLadderEntry[] = [
  { minQty: 10000, runMultiplier: 0.82, setupMultiplier: 1.0, label: '10000+ 个大货阶梯' },
  { minQty: 5000, runMultiplier: 0.9, setupMultiplier: 1.0, label: '5000+ 个量产阶梯' },
  { minQty: 2000, runMultiplier: 0.96, setupMultiplier: 1.0, label: '2000+ 个常规阶梯' },
  { minQty: 1000, runMultiplier: 1.0, setupMultiplier: 1.0, label: '1000+ 个标准阶梯' },
  { minQty: 500, runMultiplier: 1.08, setupMultiplier: 1.04, label: '500+ 个小批量阶梯' },
  { minQty: 200, runMultiplier: 1.18, setupMultiplier: 1.08, label: '200+ 个试单阶梯' },
  { minQty: 0, runMultiplier: 1.3, setupMultiplier: 1.12, label: '低于 200 个开机分摊阶梯' },
]

const PAPER_QUANTITY_LADDER: QuantityLadderEntry[] = [
  { minQty: 20000, runMultiplier: 0.8, setupMultiplier: 1.0, label: '20000+ 张大货阶梯' },
  { minQty: 10000, runMultiplier: 0.86, setupMultiplier: 1.0, label: '10000+ 张量产阶梯' },
  { minQty: 5000, runMultiplier: 0.92, setupMultiplier: 1.0, label: '5000+ 张常规阶梯' },
  { minQty: 2000, runMultiplier: 1.0, setupMultiplier: 1.0, label: '2000+ 张标准阶梯' },
  { minQty: 1000, runMultiplier: 1.08, setupMultiplier: 1.04, label: '1000+ 张小批量阶梯' },
  { minQty: 0, runMultiplier: 1.16, setupMultiplier: 1.08, label: '低于 1000 张开机分摊阶梯' },
]

const STICKER_QUANTITY_LADDER: QuantityLadderEntry[] = [
  { minQty: 50000, runMultiplier: 0.72, setupMultiplier: 1.0, label: '50000+ 张超大量阶梯' },
  { minQty: 20000, runMultiplier: 0.8, setupMultiplier: 1.0, label: '20000+ 张大货阶梯' },
  { minQty: 10000, runMultiplier: 0.88, setupMultiplier: 1.0, label: '10000+ 张量产阶梯' },
  { minQty: 5000, runMultiplier: 0.96, setupMultiplier: 1.0, label: '5000+ 张常规阶梯' },
  { minQty: 1000, runMultiplier: 1.06, setupMultiplier: 1.04, label: '1000+ 张小批量阶梯' },
  { minQty: 0, runMultiplier: 1.2, setupMultiplier: 1.08, label: '低于 1000 张开机分摊阶梯' },
]

const MINIMUM_LINE_TOTAL: Record<ComplexPackagingProductType, number> = {
  mailer_box: 900,
  tuck_end_box: 700,
  window_box: 1100,
  leaflet_insert: 220,
  box_insert: 300,
  seal_sticker: 180,
  foil_bag: 320,
  carton_packaging: 260,
}

const BASE_SETUP_COST: Record<ComplexPackagingProductType, number> = {
  mailer_box: 120,
  tuck_end_box: 110,
  window_box: 150,
  leaflet_insert: 60,
  box_insert: 80,
  seal_sticker: 50,
  foil_bag: 70,
  carton_packaging: 65,
}

const BOX_MATERIAL_RATE: Record<string, number> = {
  kraft: 0.072,
  white_card: 0.082,
  single_coated: 0.088,
  double_coated: 0.084,
  specialty_board: 0.104,
  clear_sticker: 0.11,
}

const LEAFLET_MATERIAL_RATE: Record<string, number> = {
  kraft: 0.03,
  white_card: 0.032,
  single_coated: 0.034,
  double_coated: 0.033,
  specialty_board: 0.042,
  clear_sticker: 0.09,
}

const INSERT_MATERIAL_RATE: Record<string, number> = {
  kraft: 0.05,
  white_card: 0.056,
  single_coated: 0.058,
  double_coated: 0.054,
  specialty_board: 0.075,
  clear_sticker: 0.09,
}

const STICKER_MATERIAL_RATE: Record<string, number> = {
  kraft: 0.078,
  white_card: 0.082,
  single_coated: 0.086,
  double_coated: 0.09,
  specialty_board: 0.1,
  clear_sticker: 0.12,
}

const MATERIAL_LABELS: Record<string, string> = {
  kraft: '牛纸/牛皮纸',
  white_card: '白卡',
  single_coated: '单铜',
  double_coated: '双铜',
  specialty_board: '特种纸板',
  clear_sticker: '透明贴纸',
  foil_bag: '铝箔袋材',
  corrugated_carton: '瓦楞纸箱',
}

const PRINT_LABELS: Record<string, string> = {
  black: '印黑色',
  four_color: '四色',
  double_four_color: '正反四色',
  double_four_color_print: '双面四色印',
  four_color_spot: '四色加专色',
  spot: '专色',
}

function toCm(value: number | undefined, unit: 'mm' | 'cm' | undefined): number {
  if (!value) return 0
  return unit === 'mm' ? value / 10 : value
}

function isBoxItem(productType: ComplexPackagingProductType): boolean {
  return BOX_ITEM_TYPES.includes(productType)
}

function getQuantityLadder(productType: ComplexPackagingProductType, quantity: number | undefined): QuantityLadderEntry {
  const qty = quantity || 0
  const ladder = productType === 'seal_sticker'
    ? STICKER_QUANTITY_LADDER
    : productType === 'leaflet_insert'
      ? PAPER_QUANTITY_LADDER
      : BOX_QUANTITY_LADDER

  return ladder.find((entry) => qty >= entry.minQty) || ladder[ladder.length - 1]
}

function getPrimaryMaterial(item: ComplexPackagingItem): string | undefined {
  if (item.productType === 'leaflet_insert') {
    return item.paperType || item.material
  }

  if (item.productType === 'box_insert') {
    return item.insertMaterial || item.material
  }

  if (item.productType === 'seal_sticker') {
    return item.stickerMaterial || item.material
  }

  return item.material
}

function getPrimaryWeight(item: ComplexPackagingItem): number | undefined {
  if (item.productType === 'leaflet_insert') {
    return item.paperWeight || item.weight
  }

  return item.weight
}

function getMaterialRate(item: ComplexPackagingItem): number {
  const material = getPrimaryMaterial(item) || 'white_card'

  switch (item.productType) {
    case 'mailer_box':
    case 'tuck_end_box':
    case 'window_box':
      return BOX_MATERIAL_RATE[material] || BOX_MATERIAL_RATE.white_card
    case 'leaflet_insert':
      return LEAFLET_MATERIAL_RATE[material] || LEAFLET_MATERIAL_RATE.double_coated
    case 'box_insert':
      return INSERT_MATERIAL_RATE[material] || INSERT_MATERIAL_RATE.white_card
    case 'seal_sticker':
      return STICKER_MATERIAL_RATE[material] || STICKER_MATERIAL_RATE.clear_sticker
    case 'foil_bag':
      return 0.11
    case 'carton_packaging':
      return 0.068
    default:
      return BOX_MATERIAL_RATE.white_card
  }
}

function getWeightMultiplier(item: ComplexPackagingItem): number {
  const weight = getPrimaryWeight(item)
  if (!weight) return 1.0

  if (item.productType === 'leaflet_insert') {
    if (weight <= 80) return 1.0
    if (weight <= 105) return 1.06
    if (weight <= 128) return 1.12
    if (weight <= 157) return 1.18
    if (weight <= 200) return 1.28
    if (weight <= 250) return 1.42
    return 1.55
  }

  if (item.productType === 'seal_sticker') {
    if (weight <= 80) return 1.0
    if (weight <= 100) return 1.06
    if (weight <= 128) return 1.12
    return 1.22
  }

  if (item.productType === 'foil_bag') {
    return 1.0
  }

  if (weight <= 250) return 0.94
  if (weight <= 300) return 1.0
  if (weight <= 350) return 1.12
  if (weight <= 400) return 1.24
  return 1.36
}

function getPrintPassCount(item: ComplexPackagingItem): number {
  const explicitSpotCount = Math.max(item.spotColorCount || 0, item.pantoneCodes?.length || 0)

  switch (item.printColor) {
    case 'black':
      return item.printSides === 'double' ? 2 : 1
    case 'four_color':
      return item.printSides === 'double' ? 8 : 4
    case 'double_four_color':
    case 'double_four_color_print':
      return 8
    case 'four_color_spot':
      return 4 + Math.max(explicitSpotCount, 1)
    case 'spot':
      return Math.max(explicitSpotCount, 1)
    default:
      return 0
  }
}

function getPrintSetupPerPass(productType: ComplexPackagingProductType): number {
  switch (productType) {
    case 'mailer_box':
    case 'tuck_end_box':
    case 'window_box':
      return 22
    case 'leaflet_insert':
      return 14
    case 'box_insert':
      return 12
    case 'seal_sticker':
      return 10
    case 'foil_bag':
      return 12
    case 'carton_packaging':
      return 16
    default:
      return 12
  }
}

function getPrintRunRatePerPass(productType: ComplexPackagingProductType): number {
  switch (productType) {
    case 'mailer_box':
    case 'tuck_end_box':
    case 'window_box':
      return 0.012
    case 'leaflet_insert':
      return 0.008
    case 'box_insert':
      return 0.006
    case 'seal_sticker':
      return 0.007
    case 'foil_bag':
      return 0.01
    case 'carton_packaging':
      return 0.009
    default:
      return 0.008
  }
}

function getLaminationRunRate(productType: ComplexPackagingProductType): number {
  switch (productType) {
    case 'leaflet_insert':
      return 0.009
    case 'seal_sticker':
      return 0.007
    case 'foil_bag':
      return 0.005
    case 'carton_packaging':
      return 0.012
    default:
      return 0.018
  }
}

function getAreaUnits(areaCm2: number, floor = 0.08): number {
  return Math.max(areaCm2 / 100, floor)
}

function getMaterialLabel(material?: string): string {
  return MATERIAL_LABELS[material || ''] || material || '默认材质'
}

function getPrintLabel(printColor?: string): string {
  return PRINT_LABELS[printColor || ''] || printColor || '默认印色'
}

function getBoxBlankAreaCm2(item: ComplexPackagingItem): number {
  const length = toCm(item.length, item.sizeUnit)
  const width = toCm(item.width, item.sizeUnit)
  const height = toCm(item.height, item.sizeUnit)

  if (!length || !width || !height) {
    return 0
  }

  const surfaceArea = 2 * (length * width + length * height + width * height)
  const styleMultiplier = item.productType === 'mailer_box'
    ? 1.58
    : item.productType === 'window_box'
      ? 1.38
      : 1.34
  const flapAllowance = item.productType === 'mailer_box'
    ? 42
    : item.productType === 'window_box'
      ? 36
      : 32

  return surfaceArea * styleMultiplier + flapAllowance
}

function getPlanarAreaCm2(length: number | undefined, width: number | undefined, unit: 'mm' | 'cm' | undefined, minFloorCm2: number): number {
  const lengthCm = toCm(length, unit)
  const widthCm = toCm(width, unit)
  return Math.max(lengthCm * widthCm, minFloorCm2)
}

function getPricingAreaCm2(item: ComplexPackagingItem): number {
  switch (item.productType) {
    case 'mailer_box':
    case 'tuck_end_box':
    case 'window_box':
      return getBoxBlankAreaCm2(item)
    case 'leaflet_insert':
      return getPlanarAreaCm2(item.length, item.width, item.sizeUnit, 60)
    case 'box_insert':
      return getPlanarAreaCm2(item.insertLength, item.insertWidth, item.sizeUnit, 120)
    case 'seal_sticker':
      return getPlanarAreaCm2(item.stickerLength, item.stickerWidth, item.sizeUnit, 8)
    case 'foil_bag':
      return getPlanarAreaCm2(item.length, item.width, item.sizeUnit, 30)
    case 'carton_packaging':
      return getBoxBlankAreaCm2(item)
    default:
      return 0
  }
}

function getWindowAreaCm2(item: ComplexPackagingItem): number {
  return getPlanarAreaCm2(item.windowSizeLength, item.windowSizeWidth, item.sizeUnit, 0)
}

function getWindowReferenceAreaCm2(item: ComplexPackagingItem): number {
  const length = toCm(item.length, item.sizeUnit)
  const width = toCm(item.width, item.sizeUnit)
  const height = toCm(item.height, item.sizeUnit)

  if (!length || !width || !height) {
    return 0
  }

  return Math.min(length, width) * height
}

function getWindowAreaRatio(item: ComplexPackagingItem): number {
  const referenceArea = getWindowReferenceAreaCm2(item)
  if (!referenceArea) return 0
  return getWindowAreaCm2(item) / referenceArea
}

function calculateMaterialUnitCost(item: ComplexPackagingItem, areaUnits: number): number {
  return areaUnits * getMaterialRate(item) * getWeightMultiplier(item)
}

function calculatePrintCost(item: ComplexPackagingItem, areaUnits: number): { setupCost: number; runUnitCost: number; notes: string[] } {
  const passes = getPrintPassCount(item)
  if (passes === 0) {
    return {
      setupCost: 0,
      runUnitCost: 0,
      notes: [],
    }
  }

  const setupCost = passes * getPrintSetupPerPass(item.productType)
  const runUnitCost = areaUnits * passes * getPrintRunRatePerPass(item.productType)
  const notes = [`${getPrintLabel(item.printColor)}按 ${passes} 个印色通道计价。`]

  if ((item.spotColorCount || 0) > 0 || (item.pantoneCodes?.length || 0) > 0) {
    const spotCount = Math.max(item.spotColorCount || 0, item.pantoneCodes?.length || 0)
    notes.push(`专色/Pantone 按 ${spotCount} 个附加色序计版费与印工。`)
  }

  return {
    setupCost,
    runUnitCost,
    notes,
  }
}

function calculateProcessCost(item: ComplexPackagingItem, areaUnits: number): { setupCost: number; runUnitCost: number; notes: string[] } {
  let setupCost = 0
  let runUnitCost = 0
  const notes: string[] = []
  const processText = new Set((item.processes || []).map((value) => value.toLowerCase()))
  const hasMounting = item.mounting || processText.has('裱')
  const hasDieCut = item.dieCut || processText.has('啤')
  const hasGluing = item.gluing || processText.has('粘') || processText.has('粘合')
  const hasMatteLamination = item.surfaceFinish === 'matte_lamination' || item.laminationType === 'matte' || processText.has('过哑胶')
  const hasGlossyLamination = item.surfaceFinish === 'glossy_lamination' || item.laminationType === 'glossy' || processText.has('过光胶')
  const hasUv = item.surfaceFinish === 'uv' || processText.has('uv')
  const hasAeCore = (item.notes || []).some((note) => note.includes('A/E加强芯'))

  if (hasMatteLamination || hasGlossyLamination) {
    setupCost += item.productType === 'leaflet_insert' ? 35 : 60
    runUnitCost += areaUnits * getLaminationRunRate(item.productType)
    notes.push(hasMatteLamination ? '已计入过哑胶。' : '已计入过光胶。')
  }

  if (hasMounting) {
    setupCost += item.productType === 'box_insert' ? 30 : 45
    runUnitCost += areaUnits * (item.productType === 'box_insert' ? 0.018 : 0.022)
    notes.push('已计入裱工。')
  }

  if (hasDieCut) {
    setupCost += item.productType === 'seal_sticker' ? 35 : 80
    runUnitCost += areaUnits * (item.productType === 'seal_sticker' ? 0.01 : 0.015)
    notes.push('已计入啤刀与啤工。')
  }

  if (hasGluing) {
    setupCost += item.productType === 'box_insert' ? 20 : 35
    runUnitCost += item.productType === 'box_insert' ? 0.025 : 0.04
    notes.push('已计入粘盒/粘合工。')
  }

  if (hasUv) {
    setupCost += 50
    runUnitCost += areaUnits * 0.012
    notes.push('已计入 UV 工艺。')
  }

  if (item.productType === 'leaflet_insert' && item.foldCount && item.foldCount > 0) {
    if (item.foldCount >= 2) {
      setupCost += 20
    }
    runUnitCost += item.foldCount * 0.018
    notes.push(`已按 ${item.foldCount} 折计入折页工。`)
  }

  if (item.productType === 'window_box' || item.hasWindow || processText.has('开窗') || (item.windowFilmThickness || 0) > 0) {
    const windowAreaUnits = getAreaUnits(getWindowAreaCm2(item), 0)
    const thickness = item.windowFilmThickness || 0.15
    const thicknessMultiplier = thickness >= 0.3 ? 1.5 : thickness >= 0.2 ? 1.2 : 1.0
    const ratio = getWindowAreaRatio(item)
    setupCost += 110 + (ratio >= 0.35 ? 40 : 0)
    runUnitCost += windowAreaUnits * (0.09 * thicknessMultiplier + 0.03)
    notes.push(`开窗贴胶片按 ${round2(thickness)}mm 胶片和窗位面积计价。`)
  }

  if (hasAeCore) {
    runUnitCost += areaUnits * 0.03
    notes.push('已计入 A/E 加强芯纸板附加。')
  }

  return {
    setupCost,
    runUnitCost,
    notes,
  }
}

function summarizeLine(item: ComplexPackagingItem): string {
  return item.title || item.productType
}

function createReviewReason(
  item: ComplexPackagingItem,
  code: ComplexPackagingReviewReasonCode,
  label: string,
  message: string,
): ComplexPackagingReviewReason {
  return {
    code,
    label,
    message,
    severity: 'warning',
    itemType: item.productType,
    itemTitle: summarizeLine(item),
  }
}

function isStandardWorkbookTemplateProcessCombo(item: ComplexPackagingItem, processCount: number): boolean {
  if (item.productType === 'tuck_end_box') {
    const standardTuckEndTerms = new Set([
      '啤',
      '模切',
      '粘',
      '粘合',
      '过哑胶',
      '过光胶',
      '过光油',
      '表面过光',
      'matte',
      'glossy',
      'matte_lamination',
      'gloss_lamination',
    ])
    const hasOnlyStandardTerms = (item.processes || []).every((term) => standardTuckEndTerms.has(term))
    return hasOnlyStandardTerms && processCount <= 6
  }

  if (item.productType === 'mailer_box') {
    return processCount <= 5
  }

  if (item.productType === 'window_box') {
    const standardWindowTerms = new Set(['裱', '啤', '粘', '粘合', '过哑胶', '过光胶', '过光油', '表面过光', '开窗', '贴胶片'])
    const hasOnlyStandardTerms = (item.processes || []).every((term) => standardWindowTerms.has(term))
    return hasOnlyStandardTerms && (item.windowFilmThickness || 0) <= 0.2
  }

  if (item.productType === 'leaflet_insert') {
    return processCount <= 4
  }

  if (item.productType === 'box_insert') {
    const standardInsertTerms = new Set(['裱', '啤', '模切', '成型', '贴合', '过哑胶', '过光胶'])
    return (item.processes || []).every((term) => standardInsertTerms.has(term))
  }

  if (item.productType === 'seal_sticker') {
    const standardStickerTerms = new Set(['模切', '半穿', '裁切'])
    return (item.processes || []).every((term) => standardStickerTerms.has(term)) || processCount <= 3
  }

  if (item.productType === 'foil_bag') {
    const standardBagTerms = new Set(['制袋', '打样'])
    return (item.processes || []).every((term) => standardBagTerms.has(term)) || processCount <= 3
  }

  if (item.productType === 'carton_packaging') {
    const standardCartonTerms = new Set(['成箱', '粘箱', '打包', '包装费'])
    return (item.processes || []).every((term) => standardCartonTerms.has(term)) || processCount <= 4
  }

  return false
}

function assessItemPricingReviewReasons(item: ComplexPackagingItem): ComplexPackagingReviewReason[] {
  const reasons: ComplexPackagingReviewReason[] = []
  const quantity = item.quantity || 0
  const spotCount = Math.max(item.spotColorCount || 0, item.pantoneCodes?.length || 0)
  const weight = getPrimaryWeight(item) || 0
  const material = getPrimaryMaterial(item)
  const processCount = new Set([
    ...(item.processes || []),
    ...(item.mounting ? ['裱'] : []),
    ...(item.dieCut ? ['啤'] : []),
    ...(item.gluing ? ['粘合'] : []),
    ...(item.surfaceFinish ? [item.surfaceFinish] : []),
    ...(item.laminationType && item.laminationType !== 'none' ? [item.laminationType] : []),
    ...((item.hasWindow || (item.windowFilmThickness || 0) > 0) ? ['开窗贴胶片'] : []),
  ]).size

  if (isBoxItem(item.productType) && quantity > 0 && quantity < 500) {
    reasons.push(createReviewReason(item, 'low_quantity_box', '低数量盒型', `${summarizeLine(item)}数量低于 500，开机费和损耗分摊敏感。`))
  }

  if (isBoxItem(item.productType) && spotCount >= 3) {
    reasons.push(createReviewReason(item, 'high_spot_color_count', '专色数量高', `${summarizeLine(item)}专色较多，建议人工确认专色版费与油墨损耗。`))
  }

  if (item.productType === 'window_box') {
    const thickness = item.windowFilmThickness || 0
    const ratio = getWindowAreaRatio(item)
    if (thickness >= 0.3) {
      reasons.push(createReviewReason(item, 'thick_window_film', '胶片较厚', `${summarizeLine(item)}胶片厚度达到 ${round2(thickness)}mm，建议人工确认胶片成本。`))
    }
    if (ratio >= LARGE_WINDOW_RATIO_THRESHOLD || (ratio >= 0.5 && thickness >= 0.3)) {
      reasons.push(createReviewReason(item, 'large_window_ratio', '开窗比例大', `${summarizeLine(item)}开窗面积占比偏大，建议人工确认结构强度与损耗。`))
    }
  }

  if (material === 'specialty_board' && weight >= 400) {
    reasons.push(createReviewReason(item, 'high_weight_specialty_board', '高克重特种纸板', `${summarizeLine(item)}使用高克重特种纸板，建议人工确认纸板单价。`))
  }

  if (processCount >= 4 && !isStandardWorkbookTemplateProcessCombo(item, processCount)) {
    reasons.push(createReviewReason(item, 'nonstandard_process_combo', '工艺组合复杂', `${summarizeLine(item)}涉及较多叠加工艺，建议人工确认实际损耗和后道排产。`))
  }

  return reasons
}

export function assessComplexPackagingPricingReview(request: ComplexPackagingRequest): PackagingPricingReview {
  const reviewReasons = request.allItems.flatMap((item) => assessItemPricingReviewReasons(item))
  const reviewFlags = Array.from(new Set(reviewReasons.map((reason) => reason.message)))

  return {
    requiresHumanReview: request.requiresHumanReview || reviewReasons.length > 0,
    reviewFlags,
    reviewReasons,
  }
}

function calculateLineCost(item: ComplexPackagingItem): LineCostBreakdown {
  const quantity = item.quantity || 0
  const areaUnits = getAreaUnits(getPricingAreaCm2(item))
  const ladder = getQuantityLadder(item.productType, quantity)
  const materialUnitCost = calculateMaterialUnitCost(item, areaUnits)
  const printCost = calculatePrintCost(item, areaUnits)
  const processCost = calculateProcessCost(item, areaUnits)
  const setupCost = round2((BASE_SETUP_COST[item.productType] + printCost.setupCost + processCost.setupCost) * ladder.setupMultiplier)
  const printUnitCost = printCost.runUnitCost
  const processUnitCost = processCost.runUnitCost
  const runUnitCost = round2((materialUnitCost + printUnitCost + processUnitCost) * ladder.runMultiplier)
  const subtotalBeforeMinimum = quantity > 0 ? round2(setupCost + runUnitCost * quantity) : 0
  const minimumCharge = quantity > 0 ? MINIMUM_LINE_TOTAL[item.productType] : 0
  const minimumApplied = quantity > 0 && subtotalBeforeMinimum < minimumCharge
  const totalPrice = quantity > 0 ? round2(Math.max(subtotalBeforeMinimum, minimumCharge)) : 0
  const unitPrice = quantity > 0 ? round2(totalPrice / quantity) : 0
  const notes = Array.from(new Set([
    `${getMaterialLabel(getPrimaryMaterial(item))}${getPrimaryWeight(item) ? ` ${getPrimaryWeight(item)}g` : ''} 按面积计料。`,
    ...printCost.notes,
    ...processCost.notes,
    `已采用 ${ladder.label}。`,
    ...(minimumApplied ? [`已应用 ${MINIMUM_LINE_TOTAL[item.productType]} 元最低开机收费。`] : []),
  ]))

  return {
    quantity,
    setupCost,
    runCost: quantity > 0 ? round2(totalPrice - setupCost) : 0,
    totalPrice,
    unitPrice,
    materialUnitCost: round2(materialUnitCost),
    printUnitCost: round2(printUnitCost),
    processUnitCost: round2(processUnitCost),
    notes,
    reviewFlags: assessItemPricingReviewReasons(item).map((reason) => reason.message),
    reviewReasons: assessItemPricingReviewReasons(item),
  }
}

function buildLineQuote(item: ComplexPackagingItem, breakdown: LineCostBreakdown): ComplexPackagingLineQuote {
  return {
    itemType: item.productType,
    title: summarizeLine(item),
    pricingModel: 'legacy_multiplier',
    templateId: 'legacy_fallback',
    normalizedParams: item,
    quantity: breakdown.quantity,
    actualQuantity: breakdown.quantity,
    chargeQuantity: breakdown.quantity,
    unitPrice: breakdown.unitPrice,
    totalPrice: breakdown.totalPrice,
    costSubtotal: breakdown.totalPrice,
    quotedAmount: breakdown.totalPrice,
    quoteMarkup: 1,
    taxMultiplier: 1,
    setupCost: breakdown.setupCost,
    runCost: breakdown.runCost,
    materialUnitCost: breakdown.materialUnitCost,
    printUnitCost: breakdown.printUnitCost,
    processUnitCost: breakdown.processUnitCost,
    lineItems: [],
    reviewFlags: breakdown.reviewFlags,
    reviewReasons: breakdown.reviewReasons,
    notes: breakdown.notes,
  }
}

export function calculateMailerBoxQuote(item: ComplexPackagingItem): ComplexPackagingLineQuote {
  const breakdown = calculateLineCost(item)
  breakdown.notes.unshift('飞机盒按展开用纸、印工、啤粘与开机费分摊计算。')
  return buildLineQuote(item, breakdown)
}

export function calculateTuckEndBoxQuote(item: ComplexPackagingItem): ComplexPackagingLineQuote {
  const breakdown = calculateLineCost(item)
  breakdown.notes.unshift('双插盒按展开用纸、印工、啤粘与开机费分摊计算。')
  return buildLineQuote(item, breakdown)
}

export function calculateWindowBoxQuote(item: ComplexPackagingItem): ComplexPackagingLineQuote {
  const breakdown = calculateLineCost(item)
  breakdown.notes.unshift('开窗彩盒按展开用纸、窗位胶片、啤粘与开机费分摊计算。')
  return buildLineQuote(item, breakdown)
}

export function calculateLeafletInsertQuote(item: ComplexPackagingItem): ComplexPackagingLineQuote {
  const breakdown = calculateLineCost(item)
  breakdown.notes.unshift('说明书按展开面积、纸张克重、印工与折页工计价。')
  return buildLineQuote(item, breakdown)
}

export function calculateBoxInsertQuote(item: ComplexPackagingItem): ComplexPackagingLineQuote {
  const breakdown = calculateLineCost(item)
  breakdown.notes.unshift('内托按展开面积、材料与基础加工费计价。')
  return buildLineQuote(item, breakdown)
}

export function calculateSealStickerQuote(item: ComplexPackagingItem): ComplexPackagingLineQuote {
  const breakdown = calculateLineCost(item)
  breakdown.notes.unshift('封口贴按贴纸面积、印工与模切开机费计价。')
  return buildLineQuote(item, breakdown)
}

export function calculateFoilBagQuote(item: ComplexPackagingItem): ComplexPackagingLineQuote {
  const breakdown = calculateLineCost(item)
  breakdown.notes.unshift('铝箔袋按袋型面积、制袋工和必要开机费计价。')
  return buildLineQuote(item, breakdown)
}

export function calculateCartonPackagingQuote(item: ComplexPackagingItem): ComplexPackagingLineQuote {
  const breakdown = calculateLineCost(item)
  breakdown.notes.unshift('纸箱包装按外箱体积、数量阶梯与包装工计价。')
  return buildLineQuote(item, breakdown)
}

function calculateLineQuote(item: ComplexPackagingItem): ComplexPackagingLineQuote {
  const workbookLineItemQuote = buildWorkbookLineItemQuote(item)
  if (workbookLineItemQuote) {
    return workbookLineItemQuote.lineQuote
  }

  switch (item.productType) {
    case 'mailer_box':
      return calculateMailerBoxQuote(item)
    case 'tuck_end_box':
      return calculateTuckEndBoxQuote(item)
    case 'window_box':
      return calculateWindowBoxQuote(item)
    case 'leaflet_insert':
      return calculateLeafletInsertQuote(item)
    case 'box_insert':
      return calculateBoxInsertQuote(item)
    case 'seal_sticker':
      return calculateSealStickerQuote(item)
    case 'foil_bag':
      return calculateFoilBagQuote(item)
    case 'carton_packaging':
      return calculateCartonPackagingQuote(item)
    default:
      return buildLineQuote(item, {
        quantity: item.quantity || 0,
        setupCost: 0,
        runCost: 0,
        totalPrice: 0,
        unitPrice: 0,
        materialUnitCost: 0,
        printUnitCost: 0,
        processUnitCost: 0,
        notes: ['未识别的复杂包装项。'],
        reviewFlags: [],
        reviewReasons: [],
      })
  }
}

export function calculateBundleQuote(request: ComplexPackagingRequest): ComplexPackagingQuoteResult {
  const items = request.allItems.map((item) => calculateLineQuote(item))
  const mainItem = items[0]
  const subItems = items.slice(1)
  const pricingReview = assessComplexPackagingPricingReview(request)
  const aggregated = aggregateBundlePricing(request, items)

  return {
    normalizedParams: {
      ...mainItem.normalizedParams,
      productType: mainItem.normalizedParams.productType,
      isBundle: request.isBundle,
      subItemCount: subItems.length,
    },
    unitPrice: aggregated.totalUnitPrice,
    totalUnitPrice: aggregated.totalUnitPrice,
    costSubtotal: aggregated.costSubtotal,
    quotedAmount: aggregated.quotedAmount,
    quoteMarkup: aggregated.quoteMarkup,
    taxMultiplier: aggregated.taxMultiplier,
    totalPrice: aggregated.totalPrice,
    shippingFee: aggregated.shippingFee,
    tax: aggregated.tax,
    finalPrice: aggregated.finalPrice,
    reviewFlags: pricingReview.reviewFlags,
    reviewReasons: pricingReview.reviewReasons,
    notes: [
      ...(request.notes || []),
      ...pricingReview.reviewFlags.map((flag) => `复核提示：${flag}`),
      request.isBundle ? '组合件结果已按组件 line-item 独立计价后汇总。' : '复杂包装结果基于结构化 line-item 规则引擎生成。',
    ],
    mainItem,
    subItems,
    items,
    isBundle: request.isBundle,
    requiresHumanReview: pricingReview.requiresHumanReview,
    referenceFiles: request.referenceFiles,
  }
}
