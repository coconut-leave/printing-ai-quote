export type PricingReadinessLevel =
  | 'prototype_only'
  | 'usable_with_guardrails'
  | 'ready_for_limited_trial'
  | 'pricing_ready_within_active_scope'
  | 'ready_for_general_use'

export type PricingCapabilityTier =
  | 'fully_accepted_auto_quote_scope'
  | 'estimated_only_usable_scope'
  | 'handoff_only_manual_scope'

export type PricingExcelParityTier =
  | 'same_or_near_same'
  | 'close_acceptable'
  | 'not_yet_reproducible'

export type PricingLogicTrustTier =
  | 'workbook_grounded'
  | 'calibrated_approximation'
  | 'not_ready_for_full_quote'

export type PricingBlockerImpact =
  | 'blocks_stable_trial'
  | 'blocks_beyond_trial'
  | 'does_not_block_trial'
  | 'defer'

export type PricingReadinessEvidence = {
  label: string
  summary: string
  evidencePaths: string[]
}

export type PricingReadinessCapabilityEntry = {
  label: string
  scopeType: 'item' | 'bundle' | 'family_or_boundary'
  notes: string
}

export type PricingReadinessParityEntry = {
  label: string
  tier: PricingExcelParityTier
  notes: string
}

export type PricingReadinessLogicEntry = {
  label: string
  tier: PricingLogicTrustTier
  notes: string
}

export type PricingReadinessBlockerEntry = {
  label: string
  impact: PricingBlockerImpact
  notes: string
}

export const PRICING_READINESS_FINAL_REVIEW_DOC_PATH = 'docs/pricing-readiness-final-review.md'

export const PRICING_READINESS_FINAL_REVIEW_EVIDENCE: PricingReadinessEvidence[] = [
  {
    label: 'runtime trial scope',
    summary: '当前 quoted / estimated / handoff 边界已经统一到 runtime gate、acceptance gate 与 release wording。',
    evidencePaths: [
      'docs/pricing-trial-scope.md',
      'src/server/pricing/pricingTrialScopeDraft.ts',
      'src/server/pricing/pricingTrialReleaseGateDraft.ts',
    ],
  },
  {
    label: 'workbook calibration',
    summary: '当前活跃模板代表样本都在 component close band 内，说明结构和数值骨架已经稳定。',
    evidencePaths: [
      'docs/workbook-pricing-calibration-comparison.md',
      'src/server/pricing/workbookCalibrationComparisonDraft.ts',
    ],
  },
  {
    label: 'order alignment',
    summary: '当前代表整单样本都在 order close band 内，order subtotal / markup / shipping / tax 口径已可控。',
    evidencePaths: [
      'docs/workbook-order-alignment-review.md',
      'src/server/pricing/workbookOrderAlignmentDraft.ts',
    ],
  },
  {
    label: 'acceptance gate',
    summary: '当前 component 和 order acceptance gate 合计 20 个条目，其中 19 个 accepted，1 个 no-film estimated 边界保持 guardrailed，没有 blocked。',
    evidencePaths: [
      'docs/workbook-pricing-acceptance-gate.md',
      'src/server/pricing/pricingAcceptanceGateDraft.ts',
    ],
  },
  {
    label: 'regression and build',
    summary: '最新一轮 targeted regressions 与 production build 已通过，说明当前结论不只是纸面判断。',
    evidencePaths: [
      'src/tests/complex-packaging-extraction.test.ts',
      'src/tests/chat-api-consultative-packaging-routing.test.ts',
      'src/tests/complex-packaging-pricing.test.ts',
      'src/tests/pricing-trial-scope-source-of-truth.test.ts',
    ],
  },
]

export const PRICING_READINESS_CAPABILITY_TIERS: Record<PricingCapabilityTier, PricingReadinessCapabilityEntry[]> = {
  fully_accepted_auto_quote_scope: [
    {
      label: '标准 tuck_end_box',
      scopeType: 'item',
      notes: '当前是 quoted 基线，component close，acceptance accepted。',
    },
    {
      label: '已验证 mailer_box',
      scopeType: 'item',
      notes: '已验证主路径 quoted，component close，acceptance accepted。',
    },
    {
      label: 'window_box 标准 gloss-film 路径',
      scopeType: 'item',
      notes: '只限标准覆光胶 + 胶片 line-item 完整路径。',
    },
    {
      label: '标准 leaflet_insert',
      scopeType: 'item',
      notes: '标准说明书 quoted path，component close。',
    },
    {
      label: 'generic leaflet（高频标准化）',
      scopeType: 'item',
      notes: '当前已 accepted，但只限高频标准化 narrow path，不外推到更宽 generic 描述。',
    },
    {
      label: '标准 box_insert（显式克重）',
      scopeType: 'item',
      notes: '当前已作为正式自动报价单品路径接受。',
    },
    {
      label: 'proxy box_insert（高频标准化）',
      scopeType: 'item',
      notes: '当前已 accepted，但只限高频标准化 narrow path，不外推到更宽 proxy insert 长尾。',
    },
    {
      label: '标准 seal_sticker',
      scopeType: 'item',
      notes: '当前可 quoted，主要 residual 仍在加工梯度，但 acceptance 已 accepted。',
    },
    {
      label: 'blank foil_bag',
      scopeType: 'item',
      notes: '2.5 批 blank path 已 close，可作为正式自动报价范围。',
    },
    {
      label: 'simple carton_packaging',
      scopeType: 'item',
      notes: '只限 simple outer-carton / 纸箱+包装费路径。',
    },
    {
      label: 'standard printed carton_packaging',
      scopeType: 'item',
      notes: '只限标准 K636K 单面四色大外箱单品 quoted candidate，不外推到双面印刷、成箱/包装费、打样或 bundle。',
    },
    {
      label: '标准主盒 + 标准说明书',
      scopeType: 'bundle',
      notes: 'order close，runtime quoted，acceptance accepted。',
    },
    {
      label: '标准双插盒 + 高频 generic 说明书',
      scopeType: 'bundle',
      notes: 'order close，quoted accepted，但只限双插盒窄白名单。',
    },
    {
      label: '标准双插盒 + 标准内托',
      scopeType: 'bundle',
      notes: '当前最稳的 insert quoted bundle。',
    },
    {
      label: '标准双插盒 + 高频 proxy 内托',
      scopeType: 'bundle',
      notes: 'order close，quoted accepted，但只限双插盒窄白名单。',
    },
    {
      label: '标准主盒 + 标准贴纸',
      scopeType: 'bundle',
      notes: 'order close，runtime quoted。',
    },
    {
      label: '标准主盒 + simple carton_packaging',
      scopeType: 'bundle',
      notes: 'order close，runtime quoted。',
    },
    {
      label: '标准双插盒 + 标准说明书 + 标准贴纸',
      scopeType: 'bundle',
      notes: '当前唯一放开的最简单双标准配件 quoted bundle。',
    },
    {
      label: 'blank foil_bag + simple carton_packaging',
      scopeType: 'bundle',
      notes: '当前唯一放开的 2.5 批 addon quoted bundle。',
    },
  ],
  estimated_only_usable_scope: [
    {
      label: 'window_box no-film',
      scopeType: 'item',
      notes: '当前数值 close，但逻辑仍是保守替代路径，只能参考报价。',
    },
    {
      label: 'printed/custom foil_bag',
      scopeType: 'item',
      notes: '当前只放开标准 8 丝单面四色单品 quoted candidate；generic print、双面印刷、打样或更复杂袋型继续只允许 estimated。',
    },
    {
      label: 'printed carton_packaging',
      scopeType: 'item',
      notes: '未进入标准 K636K 单面四色大外箱 quoted candidate 的 printed carton 与更复杂 carton path 继续只允许 estimated。',
    },
    {
      label: '其他更宽 generic / proxy 活跃模板路径',
      scopeType: 'family_or_boundary',
      notes: '只有高频标准化 narrow path 被提升，剩余 generic/proxy 长尾仍保守。',
    },
    {
      label: '非白名单主盒 + 内托',
      scopeType: 'bundle',
      notes: '即使子项可算，也不自动升为 quoted。',
    },
    {
      label: '非白名单主盒 + 高频 generic leaflet',
      scopeType: 'bundle',
      notes: 'generic leaflet 只对双插盒窄白名单放开 quoted。',
    },
    {
      label: 'no-film window bundle',
      scopeType: 'bundle',
      notes: '继续 estimated-only。',
    },
    {
      label: 'printed/custom foil_bag bundle',
      scopeType: 'bundle',
      notes: '继续 estimated-only。',
    },
    {
      label: 'printed carton_packaging bundle',
      scopeType: 'bundle',
      notes: '继续 estimated-only。',
    },
    {
      label: '更宽的多配件标准 bundle',
      scopeType: 'bundle',
      notes: '除当前唯一最简单双标准配件白名单外，其余多配件组合继续 estimated。',
    },
  ],
  handoff_only_manual_scope: [
    {
      label: '模板外结构 / 复杂礼盒 / 复杂外箱',
      scopeType: 'family_or_boundary',
      notes: '长期人工兜底，不应在当前阶段继续强推自动化。',
    },
    {
      label: '设计稿 / 刀线图 / 高复杂文件型询价',
      scopeType: 'family_or_boundary',
      notes: '文件驱动案例继续人工兜底。',
    },
    {
      label: '高复杂术语 / 特材 / blocking workbook term',
      scopeType: 'family_or_boundary',
      notes: '这类路径当前不具备 deterministic workbook copy 条件。',
    },
    {
      label: '复杂 box_insert',
      scopeType: 'item',
      notes: 'EVA、磁吸、模板外内托结构继续 handoff。',
    },
  ],
}

export const PRICING_READINESS_EXCEL_PARITY: PricingReadinessParityEntry[] = [
  {
    label: 'tuck_end_box、mailer_box、window_box 标准 gloss-film、标准 leaflet_insert、标准 box_insert（显式克重）、blank foil_bag、simple carton_packaging、standard printed carton_packaging',
    tier: 'same_or_near_same',
    notes: '这些路径当前可视为同参数下同价或极接近价的主干路径。',
  },
  {
    label: 'seal_sticker、高频 generic leaflet、高频 proxy box_insert，以及对应已放开的窄白名单 bundle',
    tier: 'close_acceptable',
    notes: '这些路径当前已 accepted 并可 auto quote，但本质仍带更强的标准化/代理约束。',
  },
  {
    label: 'window_box no-film、更宽 printed/custom foil_bag、非白名单 printed carton_packaging、非白名单更宽 bundle、模板外复杂结构',
    tier: 'not_yet_reproducible',
    notes: '这些路径还不能承诺同参数稳定复现 workbook 最终价。',
  },
]

export const PRICING_READINESS_LOGIC_TRUST: PricingReadinessLogicEntry[] = [
  {
    label: '吨价纸材、面积型工艺、固定费用、数量型工序、component subtotal、order subtotal、当前 accepted quoted bundles 的 order 聚合口径',
    tier: 'workbook_grounded',
    notes: '这些逻辑已经是当前完整报价内核里最可信的部分。',
  },
  {
    label: '高频 generic leaflet、默认克重 proxy insert、sticker processing 梯度、部分 quote markup 分层、blank/outer-carton 之外的更宽 2.5 路径',
    tier: 'calibrated_approximation',
    notes: '这些逻辑当前可用，但仍带标准化代理或经验梯度。',
  },
  {
    label: 'window no-film 替代逻辑、更宽 printed/custom foil bag、printed carton、更宽多配件组合、模板外结构与文件驱动场景',
    tier: 'not_ready_for_full_quote',
    notes: '这些部分当前还不能视为完整自动报价逻辑。',
  },
]

export const PRICING_READINESS_REMAINING_BLOCKERS: PricingReadinessBlockerEntry[] = [
  {
    label: '环境密钥与后台密钥仍需轮换',
    impact: 'blocks_stable_trial',
    notes: '当前 .env 中的 OpenAI key 与弱 ADMIN_SECRET 应视为已暴露；若要进入更稳定的小范围真实试运行，必须先轮换。',
  },
  {
    label: '报价单导出、台账/月结导出、后台业务可读性、人工复核工作流仍未成型',
    impact: 'blocks_stable_trial',
    notes: '这不是 pricing kernel 问题，但会直接影响业务能否稳定使用自动报价结果。',
  },
  {
    label: '活跃范围外模板覆盖不足',
    impact: 'blocks_beyond_trial',
    notes: '阻止系统走向 general use，但不阻止当前 limited trial。',
  },
  {
    label: 'estimated-only 边界仍存在：window no-film、更宽 printed/custom foil_bag、非白名单 printed carton_packaging、非白名单更宽 bundle',
    impact: 'blocks_beyond_trial',
    notes: '这些问题阻止更广覆盖，不阻止当前已经 accepted 的 trial scope。',
  },
  {
    label: 'generic/proxy 长尾、复杂术语、复杂文件与模板外结构仍需人工兜底',
    impact: 'blocks_beyond_trial',
    notes: '它们阻止 general use，不阻止当前受控 trial。',
  },
  {
    label: '当前 acceptance gates 已基本收口：19 个 accepted，1 个 no-film estimated 边界 guardrailed，代表样本 component/order 全 close',
    impact: 'does_not_block_trial',
    notes: '说明当前 trial 主干并不存在仍阻止前进的 pricing-engine 级 blocker。',
  },
  {
    label: '继续追 close-band 微小残差、继续扩新模板、继续拆更多局部报价 blocker',
    impact: 'defer',
    notes: '这些项可以延后，不应再作为当前阶段主线。',
  },
]

export const PRICING_READINESS_FINAL_REVIEW_DRAFT = {
  reviewDate: '2026-04-07',
  docPath: PRICING_READINESS_FINAL_REVIEW_DOC_PATH,
  overallAssessment: {
    systemLevel: 'ready_for_limited_trial' as PricingReadinessLevel,
    activeScopeLevel: 'pricing_ready_within_active_scope' as PricingReadinessLevel,
    completenessJudgement:
      '当前系统还不能称为全范围完整报价，但在当前 active limited-trial scope 内，已经基本具备完整报价能力。',
    businessReadinessJudgement:
      '它已经不是仅开发可跑通的 demo，而是一个边界清晰、可受控交付的自动报价子系统。',
    shouldShiftPrimaryFocusToDelivery: true,
    focusShiftReason:
      '当前剩余 open 问题主要阻止更广 coverage 或业务落地闭环，而不是阻止当前 quoted scope 继续稳定试运行。',
  },
  evidence: PRICING_READINESS_FINAL_REVIEW_EVIDENCE,
  capabilityTiers: PRICING_READINESS_CAPABILITY_TIERS,
  excelParity: PRICING_READINESS_EXCEL_PARITY,
  logicTrust: PRICING_READINESS_LOGIC_TRUST,
  blockers: PRICING_READINESS_REMAINING_BLOCKERS,
} as const