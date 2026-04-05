import type {
  SecondPhaseComplexPackagingRequestDraft,
  SecondPhaseDecisionStatusDraft,
  SecondPhaseQuotedRequirementCheckDraft,
  SecondPhaseShadowDecisionReasonCodeDraft,
} from '@/server/packaging/secondPhaseDraft'
import type { SecondPhaseLineItemCodeDraft, SecondPhaseLineItemDraft } from './complexPackagingSecondPhaseLineItemsDraft'

const round2 = (value: number) => Math.round(value * 100) / 100

const FACE_PAPER_RATE: Record<string, number> = {
  kraft: 0.00038,
  white_card: 0.00044,
  single_coated: 0.00048,
  single_white_board: 0.00045,
  duplex_board: 0.00046,
  silver_card: 0.00058,
  cotton_paper: 0.00055,
  other: 0.0005,
}

const CORRUGATION_RATE: Record<string, number> = {
  WE: 0.03,
  W9: 0.035,
  A9: 0.032,
  AE: 0.033,
  E: 0.031,
  AF: 0.034,
  other: 0.036,
}

const PRINT_RATE: Record<string, number> = {
  none: 0,
  black: 0.04,
  four_color: 0.09,
  double_four_color: 0.16,
  spot_only: 0.07,
  four_color_plus_spot: 0.12,
  other: 0.1,
}

const LAMINATION_RATE: Record<string, number> = {
  gloss: 0.012,
  matte: 0.015,
  soft_touch: 0.02,
  other: 0.018,
}

const DIE_MOLD_FEE: Record<string, number> = {
  folding_carton: 120,
  tuck_end_box: 110,
  mailer_box: 150,
}

const SETUP_FEE: Record<string, number> = {
  folding_carton: 80,
  tuck_end_box: 90,
  mailer_box: 110,
}

function toSquareCm(length?: number, width?: number, unit: 'mm' | 'cm' = 'mm'): number {
  if (!length || !width) return 0
  const factor = unit === 'mm' ? 0.1 : 1
  return round2(length * factor * width * factor)
}

function getAreaSquareCm(request: SecondPhaseComplexPackagingRequestDraft): number {
  const item = request.items[0]
  const dimensionUnit = item?.finishedGoods.sizeUnit || 'mm'
  const expandedArea = toSquareCm(
    item?.productionDimensions.unfoldedLength,
    item?.productionDimensions.unfoldedWidth,
    dimensionUnit
  )
  if (expandedArea) return expandedArea

  const sheetArea = toSquareCm(
    item?.productionDimensions.sheetCutLength,
    item?.productionDimensions.sheetCutWidth,
    dimensionUnit
  )
  if (sheetArea) return sheetArea

  const length = item?.finishedGoods.finishedLength || 0
  const width = item?.finishedGoods.finishedWidth || 0
  const height = item?.finishedGoods.finishedHeight || 0
  const factor = dimensionUnit === 'mm' ? 0.1 : 1
  const lengthCm = length * factor
  const widthCm = width * factor
  const heightCm = height * factor

  if (!lengthCm || !widthCm) return 0
  return round2(Math.max(lengthCm * widthCm + heightCm * (lengthCm + widthCm), lengthCm * widthCm))
}

function getQuantity(request: SecondPhaseComplexPackagingRequestDraft): number {
  return request.items[0]?.finishedGoods.orderQuantity || request.items[0]?.productionPricing.orderQuantity || 0
}

function getPackagingTypeKey(request: SecondPhaseComplexPackagingRequestDraft): string {
  return request.items[0]?.finishedGoods.packagingType || 'folding_carton'
}

function createLineItem(input: Omit<SecondPhaseLineItemDraft, 'confidence' | 'rawEvidence'> & { rawEvidence?: string[] }): SecondPhaseLineItemDraft {
  return {
    ...input,
    confidence: 'medium',
    rawEvidence: input.rawEvidence || [],
  }
}

function getProcessEvidence(request: SecondPhaseComplexPackagingRequestDraft): string[] {
  return request.items[0]?.printProcess.processRawTerms || []
}

function getMaterialEvidence(request: SecondPhaseComplexPackagingRequestDraft): string[] {
  return request.items[0]?.materialRecipe.rawMaterialTerms || []
}

function describeWeightMaterial(weight?: number, raw?: string): string | undefined {
  if (!weight && !raw) return undefined
  if (weight && raw) return `${weight}g${raw}`
  if (weight) return `${weight}g`
  return raw
}

function getMaterialScalingDivisor(request: SecondPhaseComplexPackagingRequestDraft): number {
  const item = request.items[0]
  const packagingType = item?.finishedGoods.packagingType
  const corrugationType = item?.materialRecipe.corrugationType
  const reinforcementWeight = item?.materialRecipe.reinforcementWeight || 0

  if (
    packagingType === 'mailer_box'
    && !item?.materialRecipe.hasCorrugatedMounting
    && !item?.materialRecipe.hasDuplexMounting
    && !corrugationType
    && !reinforcementWeight
    && !item?.materialRecipe.backingMaterial
  ) {
    return 120
  }

  if (reinforcementWeight > 0) {
    return 90
  }

  if (
    item?.materialRecipe.hasCorrugatedMounting
    || item?.materialRecipe.hasDuplexMounting
    || corrugationType === 'W9'
    || corrugationType === 'A9'
    || corrugationType === 'AE'
    || corrugationType === 'E'
    || corrugationType === 'AF'
  ) {
    return 55
  }

  return 50
}

function getPrintPassCount(request: SecondPhaseComplexPackagingRequestDraft): number {
  const process = request.items[0]?.printProcess
  if (!process) return 0

  let passes = 0

  switch (process.frontPrintMode) {
    case 'four_color':
      passes += 4
      break
    case 'double_four_color':
      passes += 8
      break
    case 'four_color_plus_spot':
      passes += 4
      break
    case 'spot_only':
      break
    case 'black':
      passes += 1
      break
    default:
      break
  }

  if (process.backPrintMode === 'spot_only') {
    passes += process.spotColorCount || 0
  }

  if (process.blackInkIncluded && process.frontPrintMode !== 'four_color' && process.frontPrintMode !== 'double_four_color' && process.frontPrintMode !== 'four_color_plus_spot') {
    passes += 1
  }

  passes += process.spotColorCount || 0

  return Math.max(passes, process.frontPrintMode && process.frontPrintMode !== 'none' ? 1 : 0)
}

function hasHighComplexityProcess(request: SecondPhaseComplexPackagingRequestDraft): boolean {
  const process = request.items[0]?.printProcess
  if (!process) return false

  return Boolean(
    process.uvModes?.includes('reverse_uv')
      || process.uvModes?.includes('spot_uv')
      || process.embossingModes?.length
      || process.halfCutRequired
      || process.processTags.includes('V槽')
  )
}

function buildFacePaperLine(request: SecondPhaseComplexPackagingRequestDraft, areaSquareCm: number, quantity: number): SecondPhaseLineItemDraft | null {
  const item = request.items[0]
  const material = item?.materialRecipe.facePaperMaterial
  const weight = item?.materialRecipe.facePaperWeight || 0
  if (!material || !weight || !areaSquareCm || !quantity) return null

  const rate = FACE_PAPER_RATE[material] || FACE_PAPER_RATE.other
  const divisor = getMaterialScalingDivisor(request)
  const subtotal = round2((areaSquareCm * quantity * weight * rate) / divisor)

  return createLineItem({
    id: 'shadow-line-face-paper',
    itemId: item.id,
    lineCode: 'face_paper',
    displayName: '面纸',
    category: 'material',
    pricingBasisType: 'sheet_count',
    relatedLayer: 'material_recipe',
    dimensionRef: 'finished_size',
    actualQuantity: quantity,
    areaSquareCm,
    unitRate: rate,
    variableFee: subtotal,
    subtotal,
    calculationSummary: `${areaSquareCm}cm2 x ${quantity} x ${weight}g x ${rate} / ${divisor}`,
    rawEvidence: item.materialRecipe.rawMaterialTerms,
  })
}

function buildCorrugatedCoreLine(request: SecondPhaseComplexPackagingRequestDraft, areaSquareCm: number, quantity: number): SecondPhaseLineItemDraft | null {
  const item = request.items[0]
  const corrugationType = item?.materialRecipe.corrugationType
  const reinforcementWeight = item?.materialRecipe.reinforcementWeight || 0
  if ((!corrugationType && !reinforcementWeight) || !areaSquareCm || !quantity) return null

  const rate = CORRUGATION_RATE[corrugationType || 'other'] || CORRUGATION_RATE.other
  const multiplier = reinforcementWeight > 0 ? 1 + reinforcementWeight / 200 : 1
  const divisor = getMaterialScalingDivisor(request)
  const subtotal = round2((areaSquareCm * quantity * rate * multiplier) / divisor)
  const displayName = reinforcementWeight > 0 || item?.materialRecipe.reinforcementMaterial === '加强芯' ? '坑纸/加强芯' : '坑纸/芯纸'

  return createLineItem({
    id: 'shadow-line-core',
    itemId: item.id,
    lineCode: 'corrugated_core',
    displayName,
    category: 'material',
    pricingBasisType: 'sheet_count',
    relatedLayer: 'material_recipe',
    dimensionRef: 'finished_size',
    actualQuantity: quantity,
    areaSquareCm,
    unitRate: rate,
    variableFee: subtotal,
    subtotal,
    calculationSummary: `${areaSquareCm}cm2 x ${quantity} x ${rate} x ${multiplier} / ${divisor}`,
    rawEvidence: item.materialRecipe.rawMaterialTerms,
  })
}

function buildBackingLine(request: SecondPhaseComplexPackagingRequestDraft, areaSquareCm: number, quantity: number): SecondPhaseLineItemDraft | null {
  const item = request.items[0]
  const mounted = item?.materialRecipe.hasCorrugatedMounting || item?.materialRecipe.hasDuplexMounting || Boolean(item?.materialRecipe.backingMaterial)
  if (!mounted || !quantity) return null

  const backingWeight = item?.materialRecipe.backingWeight || 0
  const backingMaterial = item?.materialRecipe.backingMaterial
  const corrugatedMounting = Boolean(item?.materialRecipe.hasCorrugatedMounting)
  const duplexMounting = Boolean(item?.materialRecipe.hasDuplexMounting || backingMaterial)
  const backingRate = backingMaterial ? (FACE_PAPER_RATE[backingMaterial] || FACE_PAPER_RATE.other) : 0
  const divisor = getMaterialScalingDivisor(request)
  const materialFee = backingWeight > 0 && areaSquareCm > 0 ? (areaSquareCm * quantity * backingWeight * backingRate) / divisor : 0
  const processRate = corrugatedMounting ? 0.026 : duplexMounting ? 0.022 : 0.02
  const processFee = quantity * processRate
  const subtotal = round2(materialFee + processFee)
  const displayName = corrugatedMounting ? '裱坑/纸' : duplexMounting ? '对裱/已对裱' : '对裱底纸'
  const summaryParts = [
    backingWeight > 0 && backingRate > 0 && areaSquareCm > 0 ? `${areaSquareCm}cm2 x ${quantity} x ${backingWeight}g x ${backingRate} / ${divisor}` : undefined,
    `${quantity} x ${processRate}`,
  ].filter(Boolean)

  return createLineItem({
    id: 'shadow-line-backing',
    itemId: item.id,
    lineCode: 'backing_or_duplex',
    displayName,
    category: 'material',
    pricingBasisType: 'fixed_plus_units',
    relatedLayer: 'material_recipe',
    dimensionRef: 'not_applicable',
    actualQuantity: quantity,
    areaSquareCm: areaSquareCm || undefined,
    unitRate: processRate,
    variableFee: round2(processFee),
    subtotal,
    calculationSummary: summaryParts.join(' + '),
    rawEvidence: [...getMaterialEvidence(request), ...getProcessEvidence(request)],
  })
}

function buildPrintingLine(request: SecondPhaseComplexPackagingRequestDraft, areaSquareCm: number, quantity: number): SecondPhaseLineItemDraft | null {
  const item = request.items[0]
  const printMode = item?.printProcess.frontPrintMode || 'none'
  if (printMode === 'none' || !quantity) return null

  const passCount = getPrintPassCount(request)
  const baseRate = PRINT_RATE[printMode] || PRINT_RATE.other
  const areaFactor = Math.max(areaSquareCm / 100, 0.6)
  const unitRate = round2(baseRate + passCount * 0.008 * areaFactor)
  const packagingType = getPackagingTypeKey(request)
  const fixedFee = SETUP_FEE[packagingType] || 90
  const subtotal = round2(fixedFee + quantity * unitRate)

  return createLineItem({
    id: 'shadow-line-printing',
    itemId: item.id,
    lineCode: 'printing',
    displayName: '印刷费',
    category: 'printing',
    pricingBasisType: 'fixed_plus_units',
    relatedLayer: 'print_process',
    dimensionRef: 'not_applicable',
    actualQuantity: quantity,
    unitRate,
    fixedFee,
    variableFee: round2(quantity * unitRate),
    subtotal,
    calculationSummary: `${fixedFee} + ${quantity} x ${unitRate} (${passCount} pass)`,
    rawEvidence: item.printProcess.processRawTerms,
  })
}

function buildLaminationLine(request: SecondPhaseComplexPackagingRequestDraft, areaSquareCm: number, quantity: number): SecondPhaseLineItemDraft | null {
  const item = request.items[0]
  const laminationType = item?.printProcess.laminationType
  if (!laminationType || laminationType === 'none' || !areaSquareCm || !quantity) return null

  const rate = LAMINATION_RATE[laminationType] || LAMINATION_RATE.other
  const sideCount = item?.printProcess.laminationSideCount || 1
  const divisor = getMaterialScalingDivisor(request)
  const subtotal = round2((areaSquareCm * quantity * rate * sideCount) / divisor)
  const displayName = laminationType === 'gloss' ? '过光油/光胶' : laminationType === 'matte' ? '过哑胶/覆哑膜' : '覆膜/过胶'

  return createLineItem({
    id: 'shadow-line-lamination',
    itemId: item.id,
    lineCode: 'lamination',
    displayName,
    category: 'process',
    pricingBasisType: 'area_usage',
    relatedLayer: 'print_process',
    dimensionRef: 'finished_size',
    actualQuantity: quantity,
    areaSquareCm,
    unitRate: rate,
    variableFee: subtotal,
    subtotal,
    calculationSummary: `${areaSquareCm}cm2 x ${quantity} x ${rate} x ${sideCount} side / ${divisor}`,
    rawEvidence: item.printProcess.processRawTerms,
  })
}

function buildDieMoldLine(request: SecondPhaseComplexPackagingRequestDraft): SecondPhaseLineItemDraft | null {
  const item = request.items[0]
  if (!item?.printProcess.dieCutRequired) return null

  const packagingType = getPackagingTypeKey(request)
  const fixedFee = DIE_MOLD_FEE[packagingType] || 120

  return createLineItem({
    id: 'shadow-line-die-mold',
    itemId: item.id,
    lineCode: 'die_mold',
    displayName: '刀模',
    category: 'fixed_fee',
    pricingBasisType: 'fixed_tooling_fee',
    relatedLayer: 'production_pricing',
    dimensionRef: 'not_applicable',
    fixedFee,
    subtotal: fixedFee,
    calculationSummary: `fixed tooling ${fixedFee}`,
    rawEvidence: item.printProcess.processRawTerms,
  })
}

function buildDieCutLine(request: SecondPhaseComplexPackagingRequestDraft, quantity: number): SecondPhaseLineItemDraft | null {
  const item = request.items[0]
  if (!item?.printProcess.dieCutRequired || !quantity) return null

  const subtotal = round2(quantity * 0.035)

  return createLineItem({
    id: 'shadow-line-die-cut',
    itemId: item.id,
    lineCode: 'die_cut_machine',
    displayName: '啤机',
    category: 'process',
    pricingBasisType: 'actual_units',
    relatedLayer: 'production_pricing',
    dimensionRef: 'not_applicable',
    actualQuantity: quantity,
    unitRate: 0.035,
    variableFee: subtotal,
    subtotal,
    calculationSummary: `${quantity} x 0.035`,
    rawEvidence: item.printProcess.processRawTerms,
  })
}

function buildGluingLine(request: SecondPhaseComplexPackagingRequestDraft, quantity: number): SecondPhaseLineItemDraft | null {
  const item = request.items[0]
  if (!item?.printProcess.gluingRequired || !quantity) return null

  const subtotal = round2(quantity * 0.028)

  return createLineItem({
    id: 'shadow-line-gluing',
    itemId: item.id,
    lineCode: 'gluing',
    displayName: '粘盒',
    category: 'process',
    pricingBasisType: 'actual_units',
    relatedLayer: 'production_pricing',
    dimensionRef: 'not_applicable',
    actualQuantity: quantity,
    unitRate: 0.028,
    variableFee: subtotal,
    subtotal,
    calculationSummary: `${quantity} x 0.028`,
    rawEvidence: item.printProcess.processRawTerms,
  })
}

function buildSpecialProcessLine(request: SecondPhaseComplexPackagingRequestDraft, quantity: number): SecondPhaseLineItemDraft | null {
  const item = request.items[0]
  const extraProcesses = (item?.printProcess.processTags || []).filter((tag) => !['裱', '裱坑', '对裱', '已对裱', '啤', '粘盒', '过光油', '过哑胶', '无印刷', '贴窗口片', '配内卡*1'].includes(tag))
  if (extraProcesses.length === 0 || !quantity) return null

  if (hasHighComplexityProcess(request)) return null

  const hasSimpleUv = item?.printProcess.uvModes?.includes('uv')
  const fixedFee = hasSimpleUv ? 60 : 50
  const unitRate = hasSimpleUv ? 0.024 : 0.02
  const subtotal = round2(fixedFee + quantity * unitRate)

  return createLineItem({
    id: 'shadow-line-special',
    itemId: item.id,
    lineCode: 'special_process',
    displayName: '特殊工艺附加项',
    category: 'process',
    pricingBasisType: 'manual_entry',
    relatedLayer: 'manual',
    dimensionRef: 'not_applicable',
    actualQuantity: quantity,
    fixedFee,
    unitRate,
    variableFee: round2(quantity * unitRate),
    subtotal,
    calculationSummary: `${fixedFee} + ${quantity} x ${unitRate}`,
    rawEvidence: extraProcesses,
  })
}

function buildManualAdjustmentLine(request: SecondPhaseComplexPackagingRequestDraft, quantity: number): SecondPhaseLineItemDraft | null {
  const item = request.items[0]
  const reasons: string[] = []

  if (item?.printProcess.windowFilmRequired) {
    reasons.push(item.materialRecipe.windowFilmMaterialRaw || '贴窗口片')
  }

  if (item?.materialRecipe.specialMaterialCodes?.length) {
    reasons.push(...item.materialRecipe.specialMaterialCodes)
  }

  if (item?.printProcess.processTags.includes('配内卡*1')) {
    reasons.push('配内卡*1')
  }

  if (hasHighComplexityProcess(request)) {
    reasons.push(...(item?.printProcess.processTags || []).filter((tag) => ['逆向UV', '局部UV', '激凸', '半穿', 'V槽'].includes(tag)))
  }

  const uniqueReasons = Array.from(new Set(reasons))
  if (uniqueReasons.length === 0) return null

  const fixedFee = round2(30 + uniqueReasons.length * 20)
  const unitRate = round2(0.01 * uniqueReasons.length)
  const subtotal = round2(fixedFee + quantity * unitRate)

  return createLineItem({
    id: 'shadow-line-manual-adjustment',
    itemId: item.id,
    lineCode: 'manual_adjustment',
    displayName: '人工修正项',
    category: 'manual_adjustment',
    pricingBasisType: 'manual_entry',
    relatedLayer: 'manual',
    dimensionRef: 'not_applicable',
    actualQuantity: quantity,
    fixedFee,
    unitRate,
    variableFee: round2(quantity * unitRate),
    subtotal,
    calculationSummary: `${fixedFee} + ${quantity} x ${unitRate}`,
    rawEvidence: uniqueReasons,
    note: 'shadow 用于保留真实报价单中的人工修正来源，不作为 live 对外报价',
  })
}

function updateQuotedChecks(
  request: SecondPhaseComplexPackagingRequestDraft,
  lineItems: SecondPhaseLineItemDraft[]
): SecondPhaseQuotedRequirementCheckDraft {
  const item = request.items[0]
  const lineCodeSet = new Set(lineItems.map((line) => line.lineCode))
  const needsMountingLine = Boolean(item?.materialRecipe.hasCorrugatedMounting || item?.materialRecipe.hasDuplexMounting)
  const hasPrinting = Boolean(item?.printProcess.frontPrintMode && item.printProcess.frontPrintMode !== 'none')
  const needsLamination = Boolean(item?.printProcess.laminationType && item.printProcess.laminationType !== 'none')
  const needsDieCut = Boolean(item?.printProcess.dieCutRequired)
  const needsGluing = Boolean(item?.printProcess.gluingRequired)

  const keyLineItemsComputable =
    lineCodeSet.has('face_paper')
    && (!needsMountingLine || (lineCodeSet.has('corrugated_core') && lineCodeSet.has('backing_or_duplex')))
    && (!hasPrinting || lineCodeSet.has('printing'))
    && (!needsLamination || lineCodeSet.has('lamination'))
    && (!needsDieCut || (lineCodeSet.has('die_mold') && lineCodeSet.has('die_cut_machine')))
    && (!needsGluing || lineCodeSet.has('gluing'))

  return {
    ...request.quotedChecks,
    keyLineItemsComputable,
  }
}

function resolveStatus(
  request: SecondPhaseComplexPackagingRequestDraft,
  quotedChecks: SecondPhaseQuotedRequirementCheckDraft
): { status: SecondPhaseDecisionStatusDraft; reasons: SecondPhaseShadowDecisionReasonCodeDraft[] } {
  const hasBlockingStatus = request.recommendedStatus === 'handoff_required'
  const hasEstimatedBoundary = request.recommendedStatus === 'estimated'
  const reasons = [...request.statusReasons]

  if (hasBlockingStatus) {
    return {
      status: 'handoff_required',
      reasons,
    }
  }

  if (hasEstimatedBoundary) {
    return {
      status: 'estimated',
      reasons,
    }
  }

  if (!quotedChecks.coreMaterialRecipeComplete) {
    return {
      status: 'estimated',
      reasons: Array.from(new Set([...reasons, 'core_material_incomplete'])),
    }
  }

  if (!quotedChecks.keyLineItemsComputable) {
    return {
      status: 'estimated',
      reasons: Array.from(new Set([...reasons, 'line_item_calculation_incomplete'])),
    }
  }

  if (!quotedChecks.unresolvedTermsSafe) {
    return {
      status: 'handoff_required',
      reasons: Array.from(new Set([...reasons, 'unknown_blocking_term'])),
    }
  }

  if (request.unresolvedTerms.length > 0) {
    return {
      status: 'estimated',
      reasons: Array.from(new Set([...reasons, 'line_item_template_incomplete'])),
    }
  }

  return {
    status: 'quoted',
    reasons,
  }
}

export type SecondPhaseQuoteComputation = {
  lineItems: SecondPhaseLineItemDraft[]
  subtotal: number
  status: SecondPhaseDecisionStatusDraft
  statusReasons: SecondPhaseShadowDecisionReasonCodeDraft[]
  quotedChecks: SecondPhaseQuotedRequirementCheckDraft
}

export function calculateSecondPhaseShadowQuote(
  request: SecondPhaseComplexPackagingRequestDraft
): SecondPhaseQuoteComputation {
  const quantity = getQuantity(request)
  const areaSquareCm = getAreaSquareCm(request)
  const lineItems = [
    buildFacePaperLine(request, areaSquareCm, quantity),
    buildCorrugatedCoreLine(request, areaSquareCm, quantity),
    buildBackingLine(request, areaSquareCm, quantity),
    buildPrintingLine(request, areaSquareCm, quantity),
    buildLaminationLine(request, areaSquareCm, quantity),
    buildDieMoldLine(request),
    buildDieCutLine(request, quantity),
    buildGluingLine(request, quantity),
    buildSpecialProcessLine(request, quantity),
    buildManualAdjustmentLine(request, quantity),
  ].filter(Boolean) as SecondPhaseLineItemDraft[]

  const quotedChecks = updateQuotedChecks(request, lineItems)
  const decision = resolveStatus(request, quotedChecks)
  const subtotal = round2(lineItems.reduce((sum, line) => sum + (line.subtotal || 0), 0))

  return {
    lineItems,
    subtotal,
    status: decision.status,
    statusReasons: decision.reasons,
    quotedChecks,
  }
}

export function listSecondPhaseLineCodes(result: SecondPhaseQuoteComputation): SecondPhaseLineItemCodeDraft[] {
  return result.lineItems.map((line) => line.lineCode)
}