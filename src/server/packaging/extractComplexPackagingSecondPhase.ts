import type {
  SecondPhaseApplicabilityDraft,
  SecondPhaseComplexPackagingItemDraft,
  SecondPhaseComplexPackagingRequestDraft,
  SecondPhaseCorrugationDraft,
  SecondPhaseFacePaperMaterialDraft,
  SecondPhasePackagingFamilyDraft,
  SecondPhasePackagingTypeDraft,
  SecondPhasePrintModeDraft,
  SecondPhaseQuotedRequirementCheckDraft,
  SecondPhaseRecognizedTermDraft,
  SecondPhaseShadowDecisionReasonCodeDraft,
  SecondPhaseUnknownTermDraft,
  SecondPhaseVariantTagDraft,
} from './secondPhaseDraft'
import {
  collectNormalizedSecondPhaseTerms,
  findSecondPhaseAliasInText,
  findSecondPhaseTermNormalization,
} from './secondPhaseTermNormalizationDraft'

type Classification = {
  applicability: SecondPhaseApplicabilityDraft
  packagingFamily?: SecondPhasePackagingFamilyDraft
  packagingType?: SecondPhasePackagingTypeDraft
  variantTags: SecondPhaseVariantTagDraft[]
  statusReasons: SecondPhaseShadowDecisionReasonCodeDraft[]
}

const IN_SCOPE_CLASSIFICATIONS: Array<{
  aliases: string[]
  packagingFamily: SecondPhasePackagingFamilyDraft
  packagingType: SecondPhasePackagingTypeDraft
  variantTags: SecondPhaseVariantTagDraft[]
  reason: SecondPhaseShadowDecisionReasonCodeDraft
}> = [
  {
    aliases: ['挂钩彩盒'],
    packagingFamily: 'folding_carton',
    packagingType: 'folding_carton',
    variantTags: ['hanging_tab'],
    reason: 'folding_carton_in_scope',
  },
  {
    aliases: ['双插盒'],
    packagingFamily: 'tuck_end_box',
    packagingType: 'tuck_end_box',
    variantTags: [],
    reason: 'tuck_end_box_in_scope',
  },
  {
    aliases: ['飞机盒'],
    packagingFamily: 'mailer_box',
    packagingType: 'mailer_box',
    variantTags: [],
    reason: 'mailer_box_in_scope',
  },
  {
    aliases: ['彩盒', '包装盒'],
    packagingFamily: 'folding_carton',
    packagingType: 'folding_carton',
    variantTags: ['plain_carton'],
    reason: 'folding_carton_in_scope',
  },
]

const DEFERRED_CLASSIFICATIONS: Array<{
  aliases: string[]
  packagingFamily: SecondPhasePackagingFamilyDraft
  packagingType: SecondPhasePackagingTypeDraft
}> = [
  {
    aliases: ['开窗彩盒', '开窗盒'],
    packagingFamily: 'window_box',
    packagingType: 'window_box',
  },
  {
    aliases: ['扣底盒'],
    packagingFamily: 'folding_carton',
    packagingType: 'auto_lock_bottom_box',
  },
  {
    aliases: ['天地盒', '天地盖', '上下盖'],
    packagingFamily: 'rigid_box',
    packagingType: 'lid_base_box',
  },
  {
    aliases: ['外箱', '空白箱'],
    packagingFamily: 'outer_carton',
    packagingType: 'outer_carton',
  },
  {
    aliases: ['卡牌套装', '一套卡牌', '卡牌上下盖天地盒', '卡牌'],
    packagingFamily: 'card_set_or_kit',
    packagingType: 'card_set_or_kit',
  },
]

const FLAT_PRINT_ALIASES = ['彩卡', '说明书', '折页', '感谢卡', '卡片']
const OUT_OF_SCOPE_KEYWORDS = ['磁吸', '木盒', '吸塑', 'eva', 'EVA']

const MATERIAL_ALIASES: Array<{ alias: string; normalized: SecondPhaseFacePaperMaterialDraft }> = [
  { alias: '宁波单铜纸', normalized: 'single_coated' },
  { alias: '白卡', normalized: 'white_card' },
  { alias: '单铜', normalized: 'single_coated' },
  { alias: '单白', normalized: 'single_white_board' },
  { alias: '银卡', normalized: 'silver_card' },
  { alias: '棉纸', normalized: 'cotton_paper' },
  { alias: '单白纸', normalized: 'single_white_board' },
  { alias: '白板纸', normalized: 'duplex_board' },
  { alias: '白板', normalized: 'duplex_board' },
  { alias: '牛纸', normalized: 'kraft' },
  { alias: '牛皮纸', normalized: 'kraft' },
]

const KNOWN_UPPER_TERMS = new Set(['WE', 'W9', 'A9', 'AE', 'AF', 'APET', 'UV', '4C', 'K636K'])
const NON_BLOCKING_UPPER_TERMS = new Set(['MM', 'CM'])
const HIGH_COMPLEXITY_PROCESS_TERMS = ['逆向UV', '局部UV', '激凸', '半穿', 'V槽']
const WINDOW_FEATURE_TERMS = ['贴窗口片', '窗口片', 'APET']
const BASIC_UV_TERMS = ['UV印', 'UV']
const MATERIAL_CODE_TERMS = ['K636K']
const KNOWN_PROCESS_TERMS = ['裱', '裱坑', '对裱', '啤', '粘', '粘盒', '配内卡*1', '贴双面胶', '驳接']

type Dimension2D = {
  length: number
  width: number
  unit: 'mm' | 'cm'
}

type MaterialMatch = {
  value?: SecondPhaseFacePaperMaterialDraft
  raw?: string
  weight?: number
}

type ParsedCompositeTerms = {
  recognizedTerms: SecondPhaseRecognizedTermDraft[]
  unknownTerms: SecondPhaseUnknownTermDraft[]
}

function normalizeText(text: string): string {
  return text.trim()
}

function toLowerText(text: string): string {
  return text.trim().toLowerCase()
}

function includesAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value))
}

function detectTuckEndVariantTags(text: string): SecondPhaseVariantTagDraft[] {
  const variantTags: SecondPhaseVariantTagDraft[] = []

  if (text.includes('屏幕')) {
    variantTags.push('screen_style')
  }

  if (text.includes('大盒')) {
    variantTags.push('large_box')
  }

  return variantTags
}

function detectClassification(text: string): Classification {
  if (includesAny(text, FLAT_PRINT_ALIASES)) {
    return {
      applicability: 'flat_print',
      variantTags: [],
      statusReasons: ['flat_print_redirect'],
    }
  }

  if (includesAny(text, OUT_OF_SCOPE_KEYWORDS)) {
    return {
      applicability: 'out_of_scope',
      variantTags: [],
      statusReasons: ['unknown_blocking_term'],
    }
  }

  if (text.includes('开窗') && text.includes('双插')) {
    return {
      applicability: 'deferred_type',
      packagingFamily: 'window_box',
      packagingType: 'window_box',
      variantTags: detectTuckEndVariantTags(text),
      statusReasons: ['deferred_packaging_type'],
    }
  }

  if (text.includes('双插')) {
    return {
      applicability: 'in_scope',
      packagingFamily: 'tuck_end_box',
      packagingType: 'tuck_end_box',
      variantTags: detectTuckEndVariantTags(text),
      statusReasons: ['tuck_end_box_in_scope'],
    }
  }

  for (const item of DEFERRED_CLASSIFICATIONS) {
    if (includesAny(text, item.aliases)) {
      return {
        applicability: 'deferred_type',
        packagingFamily: item.packagingFamily,
        packagingType: item.packagingType,
        variantTags: [],
        statusReasons: ['deferred_packaging_type'],
      }
    }
  }

  for (const item of IN_SCOPE_CLASSIFICATIONS) {
    if (includesAny(text, item.aliases)) {
      return {
        applicability: 'in_scope',
        packagingFamily: item.packagingFamily,
        packagingType: item.packagingType,
        variantTags: item.variantTags,
        statusReasons: [item.reason],
      }
    }
  }

  return {
    applicability: 'not_packaging',
    variantTags: [],
    statusReasons: ['phase_one_shadow_only'],
  }
}

function extractQuantity(text: string): number | undefined {
  const patterns = [
    /数量\s*[:：]?\s*(\d{2,6})/i,
    /(\d{2,6})\s*(个|张|套|pcs)(?![a-z0-9])/i,
    /(?:^|[，,；;\s])(\d{2,6})\s*$/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (!match) continue
    const value = Number(match[1])
    if (Number.isFinite(value)) {
      return value
    }
  }

  return undefined
}

function extractThreeDimensions(text: string): { length: number; width: number; height: number; unit: 'mm' | 'cm' } | null {
  const match = text.match(/(\d+(?:\.\d+)?)\s*[*xX×]\s*(\d+(?:\.\d+)?)\s*[*xX×]\s*(\d+(?:\.\d+)?)\s*(mm|cm)?/i)
  if (!match) return null

  return {
    length: Number(match[1]),
    width: Number(match[2]),
    height: Number(match[3]),
    unit: ((match[4] || 'mm').toLowerCase() as 'mm' | 'cm'),
  }
}

function extractWeight(text: string): number | undefined {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:g|G|克)/)
  if (!match) return undefined
  return Number(match[1])
}

function extractKeywordTwoDimensions(text: string, keywordPattern: RegExp): Dimension2D | null {
  const match = text.match(keywordPattern)
  if (!match) return null

  return {
    length: Number(match[1]),
    width: Number(match[2]),
    unit: ((match[3] || 'cm').toLowerCase() as 'mm' | 'cm'),
  }
}

function extractFacePaperMaterial(text: string): { value?: SecondPhaseFacePaperMaterialDraft; raw?: string } {
  for (const item of MATERIAL_ALIASES) {
    if (text.includes(item.alias)) {
      return {
        value: item.normalized,
        raw: item.alias,
      }
    }
  }

  return {}
}

function extractLeadingMaterial(text: string): MaterialMatch {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:g|G|克)\s*(宁波单铜纸|白卡|单铜|单白纸|单白|银卡|棉纸|白板纸|白板|牛纸|牛皮纸)/i)
  if (!match) {
    return extractFacePaperMaterial(text)
  }

  const raw = match[2]
  const material = MATERIAL_ALIASES.find((item) => raw.includes(item.alias))
  return {
    value: material?.normalized,
    raw,
    weight: Number(match[1]),
  }
}

function extractBackingMaterial(text: string): MaterialMatch {
  const match = text.match(/(?:裱|对裱)\s*(\d+(?:\.\d+)?)\s*(?:g|G|克)\s*(宁波单铜纸|白卡|单铜|单白纸|单白|银卡|棉纸|白板纸|白板|牛纸|牛皮纸)/i)
  if (!match) {
    return {}
  }

  const raw = match[2]
  const material = MATERIAL_ALIASES.find((item) => raw.includes(item.alias))
  return {
    value: material?.normalized,
    raw,
    weight: Number(match[1]),
  }
}

function extractCorrugation(text: string): { value?: Exclude<SecondPhaseCorrugationDraft, 'other'>; raw?: string } {
  const aeAlias = findSecondPhaseAliasInText(text, 'AE坑')
  if (aeAlias) {
    return {
      value: 'AE',
      raw: aeAlias,
    }
  }

  const whiteEAlias = findSecondPhaseAliasInText(text, '白E高强芯')
  if (whiteEAlias) {
    return {
      value: 'E',
      raw: whiteEAlias,
    }
  }

  const match = text.match(/(?:^|[^A-Z])(WE|W9|A9|AF)(?:坑|加|加强芯|[^A-Z]|$)/i)
  if (!match) {
    return {}
  }

  return {
    value: match[1].toUpperCase() as Exclude<SecondPhaseCorrugationDraft, 'other'>,
    raw: match[1].toUpperCase(),
  }
}

function extractReinforcementWeight(text: string): number | undefined {
  const match = text.match(/(?:加|\+)\s*(\d+(?:\.\d+)?)\s*(?:g|G|克)?\s*(?:芯)?(?=(?:\+|裱|四色|4C|单面|双面|印刷|$))/i)
  if (!match) return undefined
  return Number(match[1])
}

function extractMaterialCodes(text: string): string[] {
  return Array.from(new Set(Array.from(text.matchAll(/K\d+[A-Z0-9]*/gi)).map((match) => match[0].toUpperCase())))
}

function hasCorrugatedMountingCue(input: {
  text: string
  corrugationType?: string
  reinforcementWeight?: number
  backingMaterial?: string
  backingWeight?: number
}): boolean {
  if (findSecondPhaseAliasInText(input.text, '裱坑')) {
    return true
  }

  if (!input.text.includes('裱')) {
    return false
  }

  return Boolean(
    input.corrugationType
      || input.reinforcementWeight
      || (input.backingMaterial && input.backingWeight)
  )
}

function extractMountingMode(input: {
  text: string
  corrugationType?: string
  reinforcementWeight?: number
  backingMaterial?: string
  backingWeight?: number
}): 'corrugated_mounting' | 'duplex_mounting' | 'pre_mounted' | undefined {
  const { text } = input
  if (findSecondPhaseAliasInText(text, '已对裱')) return 'pre_mounted'
  if (findSecondPhaseAliasInText(text, '对裱')) return 'duplex_mounting'
  if (hasCorrugatedMountingCue(input)) return 'corrugated_mounting'
  return undefined
}

function extractPrintMode(text: string): { front?: SecondPhasePrintModeDraft; back?: SecondPhasePrintModeDraft; printSides?: 'single' | 'double' } {
  if (findSecondPhaseAliasInText(text, '无印刷')) {
    return { front: 'none', printSides: 'single' }
  }

  if (text.includes('4C') && (text.includes('正反') || text.includes('双面'))) {
    return { front: 'double_four_color', back: 'double_four_color', printSides: 'double' }
  }

  if (text.includes('正反四色') || text.includes('双面四色')) {
    return { front: 'double_four_color', back: 'double_four_color', printSides: 'double' }
  }

  if (text.includes('印黑色') || text.includes('黑色')) {
    return { front: 'black', printSides: text.includes('双面') ? 'double' : 'single' }
  }

  if (text.includes('四色') && text.includes('专色')) {
    return { front: 'four_color_plus_spot', printSides: text.includes('双面') ? 'double' : 'single' }
  }

  if (text.includes('4C') && text.includes('专')) {
    return { front: 'four_color_plus_spot', printSides: text.includes('双面') ? 'double' : 'single' }
  }

  if (text.includes('4C')) {
    return { front: 'four_color', printSides: text.includes('双面') ? 'double' : 'single' }
  }

  if (text.includes('四色')) {
    return { front: 'four_color', printSides: text.includes('双面') ? 'double' : 'single' }
  }

  if ((/(?:^|\+|，|,|；|;)黑(?:$|\+|，|,|；|;)/.test(text) || text.includes('印黑色')) && text.includes('专')) {
    return { front: 'spot_only', printSides: text.includes('双面') ? 'double' : 'single' }
  }

  if (text.includes('专色')) {
    return { front: 'spot_only', printSides: text.includes('双面') ? 'double' : 'single' }
  }

  return {}
}

function extractSpotColorCount(text: string): number | undefined {
  const explicitCount = text.match(/(\d+)\s*专/)
  if (explicitCount) {
    return Number(explicitCount[1])
  }

  const generalCount = text.match(/(\d+)\s*个?专色/)
  if (generalCount) {
    return Number(generalCount[1])
  }

  return text.includes('专色') ? 1 : undefined
}

function extractLamination(text: string): 'gloss' | 'matte' | undefined {
  if (findSecondPhaseAliasInText(text, '过光油')) return 'gloss'
  if (findSecondPhaseAliasInText(text, '过哑胶')) return 'matte'
  return undefined
}

function extractLaminationSideCount(text: string): number | undefined {
  if (!extractLamination(text)) return undefined
  if (text.includes('双面')) return 2
  if (text.includes('正面') || text.includes('单面')) return 1
  return 1
}

function extractUvModes(text: string): Array<'uv' | 'reverse_uv' | 'spot_uv'> {
  const modes: Array<'uv' | 'reverse_uv' | 'spot_uv'> = []
  if (BASIC_UV_TERMS.some((term) => text.includes(term))) {
    modes.push('uv')
  }
  if (text.includes('逆向UV')) {
    modes.push('reverse_uv')
  }
  if (text.includes('局部UV')) {
    modes.push('spot_uv')
  }
  return Array.from(new Set(modes))
}

function extractEmbossingModes(text: string): Array<'emboss'> {
  return text.includes('激凸') ? ['emboss'] : []
}

function extractWindowFilmMaterial(text: string): { value?: string; raw?: string } {
  if (text.includes('APET')) {
    return { value: 'apet', raw: 'APET' }
  }

  if (text.includes('窗口片') || text.includes('贴窗口片')) {
    return { value: 'window_film', raw: '窗口片' }
  }

  return {}
}

function extractWindowFilmThickness(text: string): number | undefined {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:厚)?\s*(?:APET|胶片|窗口片)/i)
  if (!match) return undefined
  return Number(match[1])
}

function extractProcessTags(text: string): string[] {
  const processTags: string[] = []

  if (findSecondPhaseAliasInText(text, '裱坑')) processTags.push('裱坑')
  if (findSecondPhaseAliasInText(text, '已对裱')) processTags.push('已对裱')
  if (findSecondPhaseAliasInText(text, '对裱') && !processTags.includes('已对裱')) processTags.push('对裱')
  if (text.includes('裱') && !processTags.includes('裱坑') && !processTags.includes('对裱')) processTags.push('裱')
  if (text.includes('啤')) processTags.push('啤')
  if (text.includes('粘')) processTags.push('粘盒')
  if (findSecondPhaseAliasInText(text, '过光油')) processTags.push('过光油')
  if (findSecondPhaseAliasInText(text, '过哑胶')) processTags.push('过哑胶')
  if (findSecondPhaseAliasInText(text, '无印刷')) processTags.push('无印刷')
  if (text.includes('贴双面胶')) processTags.push('贴双面胶')
  if (text.includes('贴窗口片') || text.includes('窗口片') || text.includes('APET')) processTags.push('贴窗口片')
  if (findSecondPhaseAliasInText(text, '开窗不贴胶片')) processTags.push('开窗不贴胶片')
  if (BASIC_UV_TERMS.some((term) => text.includes(term))) processTags.push('UV印')
  if (text.includes('逆向UV')) processTags.push('逆向UV')
  if (text.includes('局部UV')) processTags.push('局部UV')
  if (text.includes('激凸')) processTags.push('激凸')
  if (text.includes('半穿')) processTags.push('半穿')
  if (findSecondPhaseAliasInText(text, 'V槽')) processTags.push('V槽')
  if (text.includes('驳接')) processTags.push('驳接')
  if (text.includes('配内卡*1') || text.includes('配内卡')) processTags.push('配内卡*1')

  return Array.from(new Set(processTags))
}

function findUppercaseCandidates(text: string): string[] {
  return Array.from(new Set(Array.from(text.matchAll(/[A-Z]{1,6}[0-9+-]{0,8}/g)).map((match) => match[0])))
}

function sanitizeUppercaseToken(token: string): string {
  return token.toUpperCase().replace(/^[+.-]+|[+.-]+$/g, '')
}

function extractUnknownTerms(text: string, knownTerms: string[]): SecondPhaseUnknownTermDraft[] {
  const unknownTerms: SecondPhaseUnknownTermDraft[] = []
  const knownSet = new Set(knownTerms.map((term) => term.toUpperCase()))

  for (const token of findUppercaseCandidates(text)) {
    const upperToken = sanitizeUppercaseToken(token)
    if (upperToken.length <= 1) {
      continue
    }
    if (!/[0-9]/.test(upperToken) && upperToken.length > 4) {
      continue
    }
    if (upperToken === 'C' || upperToken === '4C') {
      continue
    }
    if (/^(WE|W9|A9|AE|AF)\+\d+(?:G)?(?:\+4C?)?$/.test(upperToken)) {
      continue
    }
    if (NON_BLOCKING_UPPER_TERMS.has(upperToken) || KNOWN_UPPER_TERMS.has(upperToken) || knownSet.has(upperToken)) {
      continue
    }

    unknownTerms.push({
      term: token,
      severity: 'non_blocking',
      reason: 'uppercase_token_not_mapped',
    })
  }

  const blockingPatternMatches = Array.from(
    text.matchAll(/[A-Z0-9.+-]{1,12}(?:坑|芯|膜|结构|窗口片)/g)
  ).map((match) => match[0].replace(/^[+.-]+/, ''))

  for (const token of blockingPatternMatches) {
    if (knownTerms.some((term) => token.includes(term))) {
      continue
    }

    unknownTerms.push({
      term: token,
      severity: 'blocking',
      reason: 'blocking_material_or_structure_term',
    })
  }

  for (const term of HIGH_COMPLEXITY_PROCESS_TERMS) {
    if (text.includes(term) && !knownTerms.includes(term)) {
      unknownTerms.push({
        term,
        severity: 'blocking',
        reason: 'high_complexity_process_in_initial_scope',
      })
    }
  }

  return unknownTerms.filter((term, index, array) => array.findIndex((candidate) => candidate.term === term.term) === index)
}

function collectRecognizedTerms(input: {
  text: string
  faceMaterialRaw?: string
  backingMaterialRaw?: string
  corrugationRaw?: string
  reinforcementWeight?: number
  printModeRaw?: string
  spotColorCount?: number
  laminationRaw?: string
  materialCodes: string[]
  processTags: string[]
  uvModes: Array<'uv' | 'reverse_uv' | 'spot_uv'>
  embossingModes: Array<'emboss'>
  windowFilmMaterialRaw?: string
}): SecondPhaseRecognizedTermDraft[] {
  const recognized: SecondPhaseRecognizedTermDraft[] = []

  if (input.faceMaterialRaw) recognized.push({ term: input.faceMaterialRaw, category: 'material' })
  if (input.backingMaterialRaw) recognized.push({ term: input.backingMaterialRaw, category: 'material' })
  if (input.corrugationRaw) recognized.push({ term: input.corrugationRaw, category: 'corrugation' })
  if (input.text.includes('加强芯') || /(?:加|\+)\s*\d+(?:\.\d+)?\s*(?:g|G|克)?\s*芯/.test(input.text)) {
    recognized.push({ term: '加强芯', category: 'material' })
  }
  if (typeof input.reinforcementWeight === 'number') recognized.push({ term: `${input.reinforcementWeight}g`, category: 'material' })
  if (input.printModeRaw) recognized.push({ term: input.printModeRaw, category: 'print' })
  if ((input.spotColorCount || 0) > 0) recognized.push({ term: `${input.spotColorCount}专`, category: 'spot_color' })
  if (input.text.includes('4C')) recognized.push({ term: '4C', category: 'print' })
  if (input.text.includes('黑色') || /(?:^|\+|，|,|；|;)黑(?:$|\+|，|,|；|;)/.test(input.text)) {
    recognized.push({ term: '黑', category: 'print' })
  }
  if (input.laminationRaw) recognized.push({ term: input.laminationRaw, category: 'lamination' })
  for (const code of input.materialCodes) {
    recognized.push({ term: code, category: 'material_code' })
  }
  for (const processTag of input.processTags) {
    const category = processTag.includes('窗口')
      ? 'window'
      : processTag === '配内卡*1'
        ? 'structure'
        : processTag === '裱坑' || processTag === '对裱' || KNOWN_PROCESS_TERMS.includes(processTag)
          ? 'process'
          : 'process'
    recognized.push({ term: processTag, category })
  }
  for (const uvMode of input.uvModes) {
    recognized.push({ term: uvMode === 'uv' ? 'UV' : uvMode === 'reverse_uv' ? '逆向UV' : '局部UV', category: 'uv' })
  }
  for (const embossingMode of input.embossingModes) {
    recognized.push({ term: embossingMode === 'emboss' ? '激凸' : embossingMode, category: 'embossing' })
  }
  if (input.windowFilmMaterialRaw) recognized.push({ term: input.windowFilmMaterialRaw, category: 'window' })

  for (const canonicalTerm of collectNormalizedSecondPhaseTerms(input.text)) {
    const normalization = findSecondPhaseTermNormalization(canonicalTerm)
    const category: SecondPhaseRecognizedTermDraft['category'] = normalization?.impactAreas.includes('material_recipe')
      ? canonicalTerm === 'AE坑' || canonicalTerm === '白E高强芯' || canonicalTerm === 'W9' || canonicalTerm === 'A9'
        ? 'corrugation'
        : 'material'
      : normalization?.impactAreas.includes('boundary')
        ? 'structure'
        : canonicalTerm === '过哑胶' || canonicalTerm === '过光油'
          ? 'lamination'
          : 'process'

    recognized.push({ term: canonicalTerm, category })
  }

  return recognized.filter((term, index, array) => array.findIndex((candidate) => candidate.term === term.term && candidate.category === term.category) === index)
}

function buildQuotedChecks(input: {
  packagingType?: SecondPhasePackagingTypeDraft
  facePaperMaterial?: SecondPhaseFacePaperMaterialDraft
  facePaperWeight?: number
  mountingMode?: string
  corrugationType?: string
  reinforcementMaterial?: string
  backingMaterial?: string
  backingWeight?: number
  materialCodes?: string[]
  windowFilmRequired?: boolean
  hasHighComplexityProcess?: boolean
  unknownTerms: SecondPhaseUnknownTermDraft[]
}): SecondPhaseQuotedRequirementCheckDraft {
  const coreMaterialRecipeComplete = Boolean(input.facePaperMaterial && input.facePaperWeight) && (
    !input.mountingMode || Boolean(input.corrugationType || input.reinforcementMaterial || (input.backingMaterial && input.backingWeight))
  )

  const keyLineItemsComputable = Boolean(input.packagingType && input.facePaperMaterial && input.facePaperWeight)
    && !input.windowFilmRequired
    && !(input.materialCodes && input.materialCodes.length > 0)
    && !input.hasHighComplexityProcess
  const unresolvedTermsSafe = input.unknownTerms.every((term) => term.severity !== 'blocking')

  return {
    packagingTypeResolved: Boolean(input.packagingType),
    coreMaterialRecipeComplete,
    keyLineItemsComputable,
    unresolvedTermsSafe,
  }
}

function buildRecommendedStatus(classification: Classification, checks: SecondPhaseQuotedRequirementCheckDraft): 'quoted' | 'estimated' | 'handoff_required' {
  if (classification.applicability === 'deferred_type' || classification.applicability === 'out_of_scope') {
    return 'handoff_required'
  }

  if (classification.applicability === 'flat_print') {
    return 'estimated'
  }

  if (!checks.unresolvedTermsSafe) {
    return 'handoff_required'
  }

  if (!checks.packagingTypeResolved || !checks.coreMaterialRecipeComplete || !checks.keyLineItemsComputable) {
    return 'estimated'
  }

  if (checks.unresolvedTermsSafe && classification.applicability === 'in_scope') {
    return 'quoted'
  }

  return 'estimated'
}

function shouldForceHandoffForRecognizedHighComplexity(input: {
  classification: Classification
  hasHighComplexityProcess: boolean
}): boolean {
  if (input.classification.applicability !== 'in_scope') {
    return false
  }

  return input.hasHighComplexityProcess
}

function hasNonBlockingUnknownTerms(unknownTerms: SecondPhaseUnknownTermDraft[]): boolean {
  return unknownTerms.some((term) => term.severity === 'non_blocking')
}

function shouldConservativelyEstimateReinforcedFoldingCarton(input: {
  classification: Classification
  corrugationType?: Exclude<SecondPhaseCorrugationDraft, 'other'>
  reinforcementWeight?: number
  mountingMode?: 'none' | 'corrugated_mounting' | 'duplex_mounting' | 'pre_mounted' | 'other'
  noPrinting?: boolean
}): boolean {
  if (input.classification.packagingType !== 'folding_carton') {
    return false
  }

  if (input.noPrinting) {
    return true
  }

  if (input.mountingMode === 'duplex_mounting' || input.mountingMode === 'pre_mounted') {
    return true
  }

  if (input.corrugationType === 'A9' || input.corrugationType === 'AE' || input.corrugationType === 'E' || input.corrugationType === 'AF') {
    return true
  }

  if (input.corrugationType === 'W9') {
    return true
  }

  if (input.reinforcementWeight && input.reinforcementWeight > 0 && input.corrugationType && input.corrugationType !== 'WE') {
    return true
  }

  return false
}

function shouldConservativelyEstimateMailerBox(input: {
  classification: Classification
  corrugationType?: Exclude<SecondPhaseCorrugationDraft, 'other'>
  reinforcementWeight?: number
  mountingMode?: 'none' | 'corrugated_mounting' | 'duplex_mounting' | 'pre_mounted' | 'other'
}): boolean {
  if (input.classification.packagingType !== 'mailer_box') {
    return false
  }

  if (input.mountingMode === 'duplex_mounting' || input.mountingMode === 'pre_mounted') {
    return true
  }

  if (input.corrugationType === 'W9' || input.corrugationType === 'A9' || input.corrugationType === 'AE' || input.corrugationType === 'E' || input.corrugationType === 'AF') {
    return true
  }

  if (input.reinforcementWeight && input.reinforcementWeight > 0 && input.corrugationType && input.corrugationType !== 'WE') {
    return true
  }

  return false
}

function resolveRequestStatus(
  classification: Classification,
  checks: SecondPhaseQuotedRequirementCheckDraft,
  unknownTerms: SecondPhaseUnknownTermDraft[],
  conservativeBoundaryReason?: SecondPhaseShadowDecisionReasonCodeDraft,
  forceHandoffBoundary = false
): 'quoted' | 'estimated' | 'handoff_required' {
  if (forceHandoffBoundary) {
    return 'handoff_required'
  }

  const baseStatus = buildRecommendedStatus(classification, checks)
  if (baseStatus === 'quoted' && hasNonBlockingUnknownTerms(unknownTerms)) {
    return 'estimated'
  }

  if (baseStatus === 'quoted' && conservativeBoundaryReason) {
    return 'estimated'
  }

  return baseStatus
}

function buildStatusReasons(
  classification: Classification,
  quotedChecks: SecondPhaseQuotedRequirementCheckDraft,
  unknownTerms: SecondPhaseUnknownTermDraft[],
  conservativeBoundaryReason?: SecondPhaseShadowDecisionReasonCodeDraft
): SecondPhaseShadowDecisionReasonCodeDraft[] {
  return [
    ...classification.statusReasons,
    ...(conservativeBoundaryReason ? [conservativeBoundaryReason] : []),
    ...(!quotedChecks.coreMaterialRecipeComplete ? ['core_material_incomplete' as const] : []),
    ...(!quotedChecks.keyLineItemsComputable ? ['line_item_template_incomplete' as const] : []),
    ...(!quotedChecks.unresolvedTermsSafe ? ['unknown_blocking_term' as const] : []),
    ...(hasNonBlockingUnknownTerms(unknownTerms) ? ['line_item_calculation_incomplete' as const] : []),
  ]
}

function extractCompositeSignals(text: string) {
  const faceMaterial = extractLeadingMaterial(text)
  const backingMaterial = extractBackingMaterial(text)
  const corrugation = extractCorrugation(text)
  const reinforcementWeight = extractReinforcementWeight(text)
  const materialCodes = extractMaterialCodes(text)
  const uvModes = extractUvModes(text)
  const embossingModes = extractEmbossingModes(text)
  const processTags = extractProcessTags(text)
  const lamination = extractLamination(text)
  const printMode = extractPrintMode(text)
  const spotColorCount = extractSpotColorCount(text)
  const windowFilmMaterial = extractWindowFilmMaterial(text)
  const windowFilmThickness = extractWindowFilmThickness(text)
  const windowFilmRequired = processTags.includes('贴窗口片') || Boolean(windowFilmMaterial.raw) || WINDOW_FEATURE_TERMS.some((term) => text.includes(term))
  const recognizedTerms = collectRecognizedTerms({
    text,
    faceMaterialRaw: faceMaterial.raw,
    backingMaterialRaw: backingMaterial.raw,
    corrugationRaw: corrugation.raw,
    reinforcementWeight,
    printModeRaw: printMode.front,
    spotColorCount,
    laminationRaw: lamination,
    materialCodes,
    processTags,
    uvModes,
    embossingModes,
    windowFilmMaterialRaw: windowFilmMaterial.raw,
  })
  const knownTerms = recognizedTerms.map((term) => term.term)
  const unknownTerms = extractUnknownTerms(text, knownTerms)

  return {
    faceMaterial,
    backingMaterial,
    corrugation,
    reinforcementWeight,
    materialCodes,
    uvModes,
    embossingModes,
    processTags,
    lamination,
    printMode,
    spotColorCount,
    windowFilmMaterial,
    windowFilmThickness,
    windowFilmRequired,
    recognizedTerms,
    unknownTerms,
  }
}

export function extractComplexPackagingSecondPhaseDraft(message: string): SecondPhaseComplexPackagingRequestDraft | null {
  const text = normalizeText(message)
  if (!text) return null

  const classification = detectClassification(text)
  if (classification.applicability === 'not_packaging') {
    return null
  }

  const dimensions = extractThreeDimensions(text)
  const unfolded = extractKeywordTwoDimensions(text, /展开\s*[:：]?\s*(\d+(?:\.\d+)?)\s*[*xX×]\s*(\d+(?:\.\d+)?)\s*(mm|cm)?/i)
  const sheetCut = extractKeywordTwoDimensions(text, /(?:开料|纸张规格|纸张|料规)\s*[:：]?\s*(\d+(?:\.\d+)?)\s*[*xX×]\s*(\d+(?:\.\d+)?)\s*(mm|cm)?/i)
  const composite = extractCompositeSignals(text)
  const mountingMode = extractMountingMode({
    text,
    corrugationType: composite.corrugation.value,
    reinforcementWeight: composite.reinforcementWeight,
    backingMaterial: composite.backingMaterial.raw,
    backingWeight: composite.backingMaterial.weight,
  })
  const hasHighComplexityProcess = composite.uvModes.includes('reverse_uv')
    || composite.uvModes.includes('spot_uv')
    || composite.embossingModes.length > 0
    || text.includes('半穿')
    || Boolean(findSecondPhaseAliasInText(text, 'V槽'))
  const hasNoPrinting = composite.printMode.front === 'none'
  const quotedChecks = buildQuotedChecks({
    packagingType: classification.packagingType,
    facePaperMaterial: composite.faceMaterial.value,
    facePaperWeight: composite.faceMaterial.weight || extractWeight(text),
    mountingMode,
    corrugationType: composite.corrugation.value,
    reinforcementMaterial: composite.corrugation.raw,
    backingMaterial: composite.backingMaterial.raw,
    backingWeight: composite.backingMaterial.weight,
    materialCodes: composite.materialCodes,
    windowFilmRequired: composite.windowFilmRequired,
    hasHighComplexityProcess,
    unknownTerms: composite.unknownTerms,
  })
  const conservativeBoundaryReason = shouldConservativelyEstimateReinforcedFoldingCarton({
    classification,
    corrugationType: composite.corrugation.value,
    reinforcementWeight: composite.reinforcementWeight,
    mountingMode,
    noPrinting: hasNoPrinting,
  })
    ? 'reinforced_folding_carton_boundary'
    : shouldConservativelyEstimateMailerBox({
        classification,
        corrugationType: composite.corrugation.value,
        reinforcementWeight: composite.reinforcementWeight,
        mountingMode,
      })
      ? 'reinforced_mailer_box_boundary'
      : undefined
  const forceHandoffBoundary = shouldForceHandoffForRecognizedHighComplexity({
    classification,
    hasHighComplexityProcess,
  })
  const recommendedStatus = composite.materialCodes.length > 0
    ? 'handoff_required'
    : resolveRequestStatus(classification, quotedChecks, composite.unknownTerms, conservativeBoundaryReason, forceHandoffBoundary)

  const statusReasons = Array.from(new Set([
    ...buildStatusReasons(classification, quotedChecks, composite.unknownTerms, conservativeBoundaryReason),
    ...(composite.windowFilmRequired ? ['unsupported_window_feature' as const] : []),
    ...(composite.materialCodes.length > 0 ? ['unsupported_material_code' as const] : []),
    ...(hasHighComplexityProcess ? ['high_complexity_process' as const] : []),
  ]))

  const item: SecondPhaseComplexPackagingItemDraft = {
    id: 'shadow-item-1',
    finishedGoods: {
      packagingFamily: classification.packagingFamily || 'folding_carton',
      packagingType: classification.packagingType || 'folding_carton',
      variantTags: Array.from(new Set([
        ...classification.variantTags,
        ...(hasNoPrinting && (classification.packagingType || 'folding_carton') === 'folding_carton' ? ['blank_box' as const] : []),
      ])),
      productName: classification.packagingType,
      customerAlias: undefined,
      finishedLength: dimensions?.length,
      finishedWidth: dimensions?.width,
      finishedHeight: dimensions?.height,
      sizeUnit: dimensions?.unit,
      orderQuantity: extractQuantity(text),
      unit: '个',
      bundleRole: 'main_item',
      customerNote: undefined,
    },
    productionDimensions: {
      finishedSpecRaw: dimensions ? `${dimensions.length}*${dimensions.width}*${dimensions.height}${dimensions.unit}` : undefined,
      unfoldedLength: unfolded?.length,
      unfoldedWidth: unfolded?.width,
      sheetCutLength: sheetCut?.length,
      sheetCutWidth: sheetCut?.width,
      sheetSpecRaw: sheetCut ? `${sheetCut.length}*${sheetCut.width}${sheetCut.unit}` : undefined,
      expandSpecRaw: unfolded ? `${unfolded.length}*${unfolded.width}${unfolded.unit}` : undefined,
      productionSizeSource: 'user_input',
      dimensionConfidence: dimensions || unfolded || sheetCut ? 'high' : 'low',
    },
    materialRecipe: {
      materialProcessRaw: text,
      facePaperMaterial: composite.faceMaterial.value,
      facePaperMaterialRaw: composite.faceMaterial.raw,
      facePaperWeight: composite.faceMaterial.weight || extractWeight(text),
      corrugationType: composite.corrugation.value,
      corrugationRaw: composite.corrugation.raw,
      reinforcementMaterial: findSecondPhaseAliasInText(text, '加强芯') ? '加强芯' : composite.corrugation.raw,
      reinforcementWeight: composite.reinforcementWeight,
      backingMaterial: composite.backingMaterial.value,
      backingMaterialRaw: composite.backingMaterial.raw,
      backingWeight: composite.backingMaterial.weight,
      mountingMode,
      hasCorrugatedMounting: hasCorrugatedMountingCue({
        text,
        corrugationType: composite.corrugation.value,
        reinforcementWeight: composite.reinforcementWeight,
        backingMaterial: composite.backingMaterial.raw,
        backingWeight: composite.backingMaterial.weight,
      }),
      hasDuplexMounting: Boolean(findSecondPhaseAliasInText(text, '对裱') || findSecondPhaseAliasInText(text, '已对裱')),
      windowFilmMaterial: composite.windowFilmMaterial.value,
      windowFilmMaterialRaw: composite.windowFilmMaterial.raw,
      windowFilmThickness: composite.windowFilmThickness,
      specialMaterialCodes: composite.materialCodes,
      rawMaterialTerms: Array.from(new Set([
        composite.faceMaterial.raw,
        composite.backingMaterial.raw,
        composite.corrugation.raw,
        findSecondPhaseAliasInText(text, '加强芯') || undefined,
        composite.windowFilmMaterial.raw,
        ...composite.materialCodes,
      ].filter(Boolean) as string[])),
    },
    printProcess: {
      frontPrintMode: composite.printMode.front,
      frontPrintModeRaw: composite.printMode.front,
      backPrintMode: composite.printMode.back,
      backPrintModeRaw: composite.printMode.back,
      fourColorCount: text.includes('4C') || text.includes('四色') ? (composite.printMode.printSides === 'double' ? 2 : 1) : undefined,
      spotColorCount: composite.spotColorCount,
      blackInkIncluded: text.includes('黑色') || text.includes('印黑色') || /(?:^|\+|，|,|；|;)黑(?:$|\+|，|,|；|;)/.test(text),
      printSides: composite.printMode.printSides,
      laminationType: composite.lamination,
      laminationRaw: composite.lamination ? (composite.lamination === 'gloss' ? '过光油' : '过哑胶') : undefined,
      laminationSideCount: extractLaminationSideCount(text),
      uvModes: composite.uvModes,
      embossingModes: composite.embossingModes,
      dieCutRequired: text.includes('啤'),
      gluingRequired: text.includes('粘'),
      halfCutRequired: text.includes('半穿'),
      splicingRequired: text.includes('驳接'),
      doubleTapeRequired: text.includes('贴双面胶'),
      windowFilmRequired: composite.windowFilmRequired,
      processTags: composite.processTags,
      processRawTerms: composite.processTags,
    },
    productionPricing: {
      orderQuantity: extractQuantity(text),
      pricingLineRefs: [],
    },
    rawEvidence: {
      rawProductName: classification.packagingType,
      rawSpecText: dimensions ? `${dimensions.length}*${dimensions.width}*${dimensions.height}${dimensions.unit}` : undefined,
      rawMaterialProcessText: text,
      recognizedTerms: composite.recognizedTerms.map((term) => term.term),
      unresolvedTerms: composite.unknownTerms.map((term) => term.term),
      parseWarnings: text.includes('；') || text.includes(';') ? ['shadow 仅分析首个主包装结构，不处理组合拆项'] : [],
    },
    recognizedTerms: composite.recognizedTerms,
    unknownTerms: composite.unknownTerms,
    lineItemIds: [],
  }

  return {
    requestId: 'shadow-request-1',
    source: 'user_input',
    isBundle: text.includes('；') || text.includes(';'),
    items: [item],
    customerMessageRaw: text,
    unresolvedTerms: composite.unknownTerms.map((term) => term.term),
    parseWarnings: item.rawEvidence.parseWarnings,
    recommendedStatus,
    statusReasons,
    quotedChecks,
  }
}