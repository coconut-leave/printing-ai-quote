export type SecondPhaseTermNormalizationLayerDraft = 'material_recipe' | 'print_process' | 'decision_boundary'

export type SecondPhaseTermNormalizationImpactDraft = 'material_recipe' | 'process' | 'boundary'

export type SecondPhaseTermBoundaryEffectDraft = 'none' | 'estimated' | 'handoff_required'

export type SecondPhaseTermNormalizationDraft = {
  canonical: string
  aliases: string[]
  layers: SecondPhaseTermNormalizationLayerDraft[]
  impactAreas: SecondPhaseTermNormalizationImpactDraft[]
  boundaryEffect: SecondPhaseTermBoundaryEffectDraft
  note: string
}

export const SECOND_PHASE_TERM_NORMALIZATIONS_DRAFT: readonly SecondPhaseTermNormalizationDraft[] = [
  {
    canonical: 'WE+120',
    aliases: ['WE+120', 'WE+120g', 'WE+120G'],
    layers: ['material_recipe', 'decision_boundary'],
    impactAreas: ['material_recipe', 'boundary'],
    boundaryEffect: 'none',
    note: '普通飞机盒常见的 WE+120 连写配方，先归一成可识别的 reinforced mailer shorthand，不单独触发保守降级。',
  },
  {
    canonical: 'W9',
    aliases: ['W9', 'W9坑'],
    layers: ['material_recipe', 'decision_boundary'],
    impactAreas: ['material_recipe', 'boundary'],
    boundaryEffect: 'estimated',
    note: '普通彩盒里出现 W9 时，当前 shadow 仍按 reinforced folding-carton 边界保守降级 estimated。',
  },
  {
    canonical: 'A9',
    aliases: ['A9', 'A9坑'],
    layers: ['material_recipe', 'decision_boundary'],
    impactAreas: ['material_recipe', 'boundary'],
    boundaryEffect: 'estimated',
    note: 'A9 加强芯普通彩盒当前仅作为 estimated 边界样本，不直接放进 quoted 主路径。',
  },
  {
    canonical: 'AE坑',
    aliases: ['AE坑', 'AE'],
    layers: ['material_recipe', 'decision_boundary'],
    impactAreas: ['material_recipe', 'boundary'],
    boundaryEffect: 'estimated',
    note: 'AE 坑保留为正式归一词条，便于后续双插盒 / 普通盒加强芯路径单独校准。',
  },
  {
    canonical: '白E高强芯',
    aliases: ['白E高强芯', '白E芯', 'E高强芯'],
    layers: ['material_recipe', 'decision_boundary'],
    impactAreas: ['material_recipe', 'boundary'],
    boundaryEffect: 'estimated',
    note: '白 E 高强芯先按 reinforcement / corrugation 边界处理，不进入普通 quoted 主路径。',
  },
  {
    canonical: '对裱',
    aliases: ['对裱'],
    layers: ['material_recipe', 'print_process'],
    impactAreas: ['material_recipe', 'process'],
    boundaryEffect: 'estimated',
    note: '对裱会改变面纸之外的底纸或裱合拆项，当前以 estimated 为主。',
  },
  {
    canonical: '已对裱',
    aliases: ['已对裱'],
    layers: ['material_recipe', 'decision_boundary'],
    impactAreas: ['material_recipe', 'boundary'],
    boundaryEffect: 'estimated',
    note: '已对裱表示用户输入已包含预裱合语义，当前 shadow 按 pre-mounted 边界保守处理。',
  },
  {
    canonical: '加强芯',
    aliases: ['加强芯'],
    layers: ['material_recipe', 'decision_boundary'],
    impactAreas: ['material_recipe', 'boundary'],
    boundaryEffect: 'estimated',
    note: '加强芯属于强化配方线索，普通彩盒场景默认保守降级 estimated。',
  },
  {
    canonical: '裱坑',
    aliases: ['裱坑', '裱坑/纸'],
    layers: ['material_recipe', 'print_process'],
    impactAreas: ['material_recipe', 'process'],
    boundaryEffect: 'none',
    note: '裱坑既影响材料配方，也影响 line-item 模板里的 backing_or_duplex。',
  },
  {
    canonical: '过哑胶',
    aliases: ['过哑胶', '覆哑膜', '覆哑胶', '哑膜', 'matte'],
    layers: ['print_process'],
    impactAreas: ['process'],
    boundaryEffect: 'none',
    note: '哑膜 / 哑胶归并为 matte 路径，作为 lamination 主工艺词条。',
  },
  {
    canonical: '过光油',
    aliases: ['过光油', '过光胶', '光胶', '覆光膜', '光膜', '表面过光', 'gloss'],
    layers: ['print_process'],
    impactAreas: ['process'],
    boundaryEffect: 'none',
    note: '光油 / 光胶 / gloss 统一归并为 gloss finish，避免 runner 和 extractor 用不同术语。',
  },
  {
    canonical: '无印刷',
    aliases: ['无印刷', '不印刷', '空白盒'],
    layers: ['print_process', 'decision_boundary'],
    impactAreas: ['process', 'boundary'],
    boundaryEffect: 'estimated',
    note: '无印刷普通盒当前不进入 quoted 主路径，保留为 estimated 边界。',
  },
  {
    canonical: 'V槽',
    aliases: ['V槽'],
    layers: ['print_process', 'decision_boundary'],
    impactAreas: ['process', 'boundary'],
    boundaryEffect: 'handoff_required',
    note: 'V 槽属于高复杂结构工艺，当前首批直接 handoff。',
  },
  {
    canonical: '开窗不贴胶片',
    aliases: ['开窗不贴胶片'],
    layers: ['print_process', 'decision_boundary'],
    impactAreas: ['process', 'boundary'],
    boundaryEffect: 'handoff_required',
    note: '开窗且不贴胶片属于 window/deferred 结构边界词条。',
  },
  {
    canonical: '逆向UV',
    aliases: ['逆向UV'],
    layers: ['print_process', 'decision_boundary'],
    impactAreas: ['process', 'boundary'],
    boundaryEffect: 'handoff_required',
    note: '逆向UV 属于首批明确的高复杂工艺，应直接进入 handoff boundary。',
  },
  {
    canonical: '局部UV',
    aliases: ['局部UV'],
    layers: ['print_process', 'decision_boundary'],
    impactAreas: ['process', 'boundary'],
    boundaryEffect: 'handoff_required',
    note: '局部UV 在双插盒/彩盒首批 shadow 中应视为高复杂工艺边界。',
  },
  {
    canonical: '激凸',
    aliases: ['激凸'],
    layers: ['print_process', 'decision_boundary'],
    impactAreas: ['process', 'boundary'],
    boundaryEffect: 'handoff_required',
    note: '激凸 属于高复杂后道，不应被当成未识别噪声。',
  },
] as const

function normalizeLookupTerm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '')
}

export function normalizeSecondPhaseTerm(value?: string): string {
  const normalizedValue = normalizeLookupTerm(value || '')
  if (!normalizedValue) {
    return ''
  }

  const entry = SECOND_PHASE_TERM_NORMALIZATIONS_DRAFT.find((candidate) =>
    candidate.aliases.some((alias) => normalizeLookupTerm(alias) === normalizedValue)
      || normalizeLookupTerm(candidate.canonical) === normalizedValue
  )

  return entry?.canonical || value!.trim()
}

export function findSecondPhaseTermNormalization(value?: string): SecondPhaseTermNormalizationDraft | undefined {
  const normalizedValue = normalizeLookupTerm(value || '')
  if (!normalizedValue) {
    return undefined
  }

  return SECOND_PHASE_TERM_NORMALIZATIONS_DRAFT.find((candidate) =>
    normalizeLookupTerm(candidate.canonical) === normalizedValue
      || candidate.aliases.some((alias) => normalizeLookupTerm(alias) === normalizedValue)
  )
}

export function findSecondPhaseAliasInText(text: string, canonical: string): string | undefined {
  const entry = findSecondPhaseTermNormalization(canonical)
  if (!entry) {
    return undefined
  }

  return [entry.canonical, ...entry.aliases]
    .sort((left, right) => right.length - left.length)
    .find((alias) => text.includes(alias))
}

export function collectNormalizedSecondPhaseTerms(text: string): string[] {
  return SECOND_PHASE_TERM_NORMALIZATIONS_DRAFT
    .filter((entry) => [entry.canonical, ...entry.aliases].some((alias) => text.includes(alias)))
    .map((entry) => entry.canonical)
}