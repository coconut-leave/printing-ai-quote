export const PRICING_DELIVERY_COVERAGE_REVIEW_DOC_PATH = 'docs/pricing-delivery-coverage-review.md'

export type PricingDeliveryCoverageStatus = 'stable' | 'covered_but_watch' | 'gap_closed_this_round' | 'still_risky'

export type PricingDeliveryCoverageChain = {
  id: string
  title: string
  status: PricingDeliveryCoverageStatus
  currentCoverage: string[]
  gapsBeforeThisRound: string[]
  currentResidualRisk: string[]
}

export type PricingDeliveryCoverageRecommendation = {
  suitableToReturnToCoverageExpansion: boolean
  gatingReason: string
  nextEstimatedOnlyPath: string
  whyThisPathFirst: string
}

export const PRICING_DELIVERY_COVERAGE_REVIEW_DRAFT: {
  reviewDate: string
  stableChains: PricingDeliveryCoverageChain[]
  watchChains: PricingDeliveryCoverageChain[]
  minimalFixesThisRound: string[]
  recommendation: PricingDeliveryCoverageRecommendation
} = {
  reviewDate: '2026-04-07',
  stableChains: [
    {
      id: 'quote_export',
      title: '报价单导出',
      status: 'stable',
      currentCoverage: [
        'quoted 导出回归已覆盖正式报价单、HTML 预览、bundle 导出。',
        'estimated 导出回归已覆盖参考报价单文案和对外使用边界。',
        'handoff-only 回归已覆盖不误导出正式或参考单据。',
      ],
      gapsBeforeThisRound: [],
      currentResidualRisk: [
        '主要剩余风险不在导出生成本身，而在未来字段继续演化时的文案漂移。',
      ],
    },
    {
      id: 'batch_export_and_ledger',
      title: '批量导出 / 台账 / 月结导出',
      status: 'stable',
      currentCoverage: [
        '今日 / 本月 / 本年筛选回归已覆盖时间窗口。',
        '台账导出已覆盖 quoted / estimated 区分、业务归档分类、对外使用建议。',
      ],
      gapsBeforeThisRound: [],
      currentResidualRisk: [
        '月结字段目前仍以台账列为主，若后续新增结算字段，需要再补回归。',
      ],
    },
    {
      id: 'delivery_scope_consistency',
      title: 'quoted / estimated / handoff 交付层展示一致性',
      status: 'stable',
      currentCoverage: [
        'observation 面板已覆盖 quoted / estimated / handoff、trial scope 内外、bundle 状态和 acceptance 一致性。',
        '后台列表新增交付状态一致性回归，覆盖 hasExportableResult、exportableResultStatus 和复核状态标签。',
      ],
      gapsBeforeThisRound: [
        '后台列表的交付结果状态和 trial review 状态此前没有直接回归保护。',
      ],
      currentResidualRisk: [
        '如果后续后台列表字段继续扩展，需要同步补字段级断言。',
      ],
    },
  ],
  watchChains: [
    {
      id: 'trial_review_workflow',
      title: 'trial review queue / manual confirmation / review status flow',
      status: 'gap_closed_this_round',
      currentCoverage: [
        'review queue 入队规则、不误入队、returned_as_estimate 和 handoff_to_human 已有回归。',
        '本轮补上 manual_confirmed 流转、manualConfirmedAt、处理人、状态筛选和非法筛选值保护。',
      ],
      gapsBeforeThisRound: [
        'manual_confirmed 之前没有直接断言时间、处理人和反馈区展示。',
        'trial review route 的非法筛选值之前没有单独保护。',
      ],
      currentResidualRisk: [
        'quoted 抽检/打回仍不是当前 workflow 主链路，quoted review 留痕仍偏弱。',
      ],
    },
    {
      id: 'reflection_business_feedback',
      title: 'reflection / business feedback / audit trail',
      status: 'covered_but_watch',
      currentCoverage: [
        '会话详情到 reflection 创建、packaging context 注入、structured correctedParams 持久化已有回归。',
        '本轮补上 trial review observation 反馈区对 business feedback、当前复核状态、处理人、确认时间和备注的直连回归。',
      ],
      gapsBeforeThisRound: [
        'business feedback 虽然已进入 observation 反馈区，但此前没有专门测试保护。',
        '处理人此前没有进入反馈区事实列表。',
      ],
      currentResidualRisk: [
        'reflection 列表和 trial review 队列之间仍是“通过详情页接上”，还不是单独的跨页面闭环报表。',
      ],
    },
    {
      id: 'backend_filtering_and_state_flow',
      title: '后台筛选与状态流转',
      status: 'covered_but_watch',
      currentCoverage: [
        '会话列表已有状态、交付结果、trial review 最新动作字段。',
        'trial review queue 已覆盖状态筛选、来源筛选和关闭后再查询。',
      ],
      gapsBeforeThisRound: [
        '后台列表此前没有直接证明 estimated manual_confirmed 和 handoff_to_human 的展示一致性。',
      ],
      currentResidualRisk: [
        '会话列表仍按 conversation status 过滤，不是按 trial review status 聚合；更细后台运营筛选后续还可继续补。',
      ],
    },
  ],
  minimalFixesThisRound: [
    '在 trial review observation 反馈区补充当前处理人，避免人工确认链路只在最新留痕卡片可见。',
  ],
  recommendation: {
    suitableToReturnToCoverageExpansion: true,
    gatingReason: '当前 limited-trial 交付主链路已经有导出、台账、review queue、manual confirmation、business feedback 接入和后台状态一致性的回归保护，剩余风险更多属于 quoted 抽检深度与后续字段演化，不再阻塞回到 coverage 扩张。',
    nextEstimatedOnlyPath: 'window_box no-film',
    whyThisPathFirst: '它是当前最清晰、业务价值高、边界可解释的 estimated-only 单路径，且已经有 runtime gate 和交付层展示基础，适合在不扩新模板的前提下优先评估是否能继续收敛。',
  },
}