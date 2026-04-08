import {
  buildWorkbookCalibrationComparisonEntries,
  type WorkbookCalibrationComparisonEntry,
} from './workbookCalibrationComparisonDraft'
import {
  buildWorkbookOrderAlignmentEntries,
  type WorkbookOrderAlignmentEntry,
} from './workbookOrderAlignmentDraft'
import { buildPricingAcceptanceGateEntries } from './pricingAcceptanceGateDraft'
import {
  PRICING_TRIAL_RELEASE_ENTRIES,
  type PricingTrialReleaseEntry,
} from './pricingTrialReleaseGateDraft'

export type PricingFinalAuditPathVerdict = 'stable_close' | 'close_but_watch' | 'needs_watch_but_not_rollback'

export type PricingFinalAuditPathGroup = {
  label: string
  paths: string[]
  why: string
}

export type PricingFinalAuditGapSource = {
  id: string
  label: string
  affectedPaths: string[]
  whyItMatters: string
  evidence: string
  action: 'stop_here_and_monitor' | 'reopen_only_if_repeated_real_drift'
}

export type PricingFinalAuditStopRule = {
  label: string
  status: 'met' | 'pending'
  note: string
}

export const PRICING_FINAL_AUDIT_WITHIN_ACTIVE_SCOPE_DOC_PATH = 'docs/pricing-final-audit-within-active-scope.md'

const ACTIVE_QUOTED_ENTRIES = PRICING_TRIAL_RELEASE_ENTRIES.filter(
  (entry) => entry.bucket === 'allowed_quoted_in_trial',
)

const ACTIVE_QUOTED_ITEM_PATHS = ACTIVE_QUOTED_ENTRIES
  .filter((entry) => entry.scopeType === 'item')
  .map((entry) => entry.label)

const ACTIVE_QUOTED_BUNDLE_PATHS = ACTIVE_QUOTED_ENTRIES
  .filter((entry) => entry.scopeType === 'bundle')
  .map((entry) => entry.label)

const CALIBRATION_ENTRIES = new Map(
  buildWorkbookCalibrationComparisonEntries().map((entry) => [entry.sample_id, entry]),
)

const ORDER_ALIGNMENT_ENTRIES = new Map(
  buildWorkbookOrderAlignmentEntries().map((entry) => [entry.sample_id, entry]),
)

const QUOTED_ACCEPTANCE_GATES = buildPricingAcceptanceGateEntries().filter(
  (entry) => entry.release_mode === 'quoted',
)

function getQuotedEntry(label: string): PricingTrialReleaseEntry {
  const entry = ACTIVE_QUOTED_ENTRIES.find((item) => item.label === label)

  if (!entry) {
    throw new Error(`Missing active quoted scope entry: ${label}`)
  }

  return entry
}

function getSampleRows() {
  return QUOTED_ACCEPTANCE_GATES.flatMap((gate) => gate.sample_ids.map((sampleId) => {
    const componentEntry = CALIBRATION_ENTRIES.get(sampleId)
    if (componentEntry) {
      return {
        gateId: gate.gate_id,
        scope: 'component' as const,
        sampleId,
        gapAmount: componentEntry.gap_amount,
        gapRatio: componentEntry.gap_ratio,
        toleranceBand: componentEntry.tolerance_band,
        source: componentEntry.main_gap_source,
      }
    }

    const orderEntry = ORDER_ALIGNMENT_ENTRIES.get(sampleId)
    if (orderEntry) {
      return {
        gateId: gate.gate_id,
        scope: 'order' as const,
        sampleId,
        gapAmount: orderEntry.gap_amount,
        gapRatio: orderEntry.gap_ratio,
        toleranceBand: orderEntry.tolerance_band,
        source: orderEntry.main_gap_source,
      }
    }

    throw new Error(`Missing quoted acceptance sample row: ${sampleId}`)
  }))
}

function summarizeGapSources(rows: ReturnType<typeof getSampleRows>) {
  const sourceMap = new Map<string, {
    count: number
    absGapAmount: number
    maxAbsGapRatio: number
  }>()

  rows.forEach((row) => {
    const previous = sourceMap.get(row.source) || {
      count: 0,
      absGapAmount: 0,
      maxAbsGapRatio: 0,
    }

    sourceMap.set(row.source, {
      count: previous.count + 1,
      absGapAmount: previous.absGapAmount + Math.abs(row.gapAmount),
      maxAbsGapRatio: Math.max(previous.maxAbsGapRatio, Math.abs(row.gapRatio)),
    })
  })

  return [...sourceMap.entries()]
    .map(([source, summary]) => ({ source, ...summary }))
    .sort((left, right) => {
      if (right.absGapAmount !== left.absGapAmount) {
        return right.absGapAmount - left.absGapAmount
      }

      if (right.maxAbsGapRatio !== left.maxAbsGapRatio) {
        return right.maxAbsGapRatio - left.maxAbsGapRatio
      }

      return right.count - left.count
    })
}

const QUOTED_SAMPLE_ROWS = getSampleRows()
const QUOTED_COMPONENT_ROWS = QUOTED_SAMPLE_ROWS.filter((row) => row.scope === 'component')
const QUOTED_ORDER_ROWS = QUOTED_SAMPLE_ROWS.filter((row) => row.scope === 'order')
const GAP_SOURCE_SUMMARY = summarizeGapSources(QUOTED_SAMPLE_ROWS)

const STABLE_CLOSE_PATHS = [
  getQuotedEntry('标准 tuck_end_box').label,
  getQuotedEntry('已验证 mailer_box').label,
  getQuotedEntry('window_box 标准 gloss-film 路径').label,
  getQuotedEntry('标准 leaflet_insert').label,
  getQuotedEntry('标准 box_insert（显式克重）').label,
  getQuotedEntry('blank foil_bag').label,
  getQuotedEntry('simple carton_packaging').label,
  getQuotedEntry('standard printed carton_packaging').label,
  getQuotedEntry('标准主盒 + 标准说明书').label,
  getQuotedEntry('标准双插盒 + 标准内托').label,
  getQuotedEntry('已验证飞机盒 + 标准内托').label,
  getQuotedEntry('blank foil_bag + simple carton_packaging').label,
] as const

const CLOSE_BUT_WATCH_PATHS = [
  getQuotedEntry('window_box 标准 no-film gloss 路径').label,
  getQuotedEntry('generic leaflet（高频标准化）').label,
  getQuotedEntry('proxy box_insert（高频标准化）').label,
  getQuotedEntry('标准 seal_sticker').label,
  getQuotedEntry('standard printed foil_bag').label,
  getQuotedEntry('标准双插盒 + 高频 generic 说明书').label,
  getQuotedEntry('标准双插盒 + 高频 proxy 内托').label,
  getQuotedEntry('已验证飞机盒 + 高频 proxy 内托').label,
  getQuotedEntry('标准主盒 + 标准贴纸').label,
  getQuotedEntry('标准主盒 + simple carton_packaging').label,
  getQuotedEntry('标准主盒 / 已验证飞机盒 + 标准说明书 + 标准贴纸').label,
  getQuotedEntry('标准主盒 / 已验证飞机盒 + 标准内托 + 标准说明书').label,
  getQuotedEntry('标准主盒 / 已验证飞机盒 + 标准内托 + 标准贴纸').label,
  getQuotedEntry('标准主盒 / 已验证飞机盒 + 标准说明书 + simple carton_packaging').label,
] as const

const NOT_FULLY_COMFORTABLE_QUOTED_PATHS = [
  getQuotedEntry('window_box 标准 no-film gloss 路径').label,
  getQuotedEntry('generic leaflet（高频标准化）').label,
  getQuotedEntry('proxy box_insert（高频标准化）').label,
  getQuotedEntry('标准 seal_sticker').label,
  getQuotedEntry('standard printed foil_bag').label,
  getQuotedEntry('标准主盒 + 标准贴纸').label,
  getQuotedEntry('标准主盒 + simple carton_packaging').label,
  getQuotedEntry('标准主盒 / 已验证飞机盒 + 标准说明书 + 标准贴纸').label,
  getQuotedEntry('标准主盒 / 已验证飞机盒 + 标准内托 + 标准贴纸').label,
  getQuotedEntry('标准主盒 / 已验证飞机盒 + 标准说明书 + simple carton_packaging').label,
] as const

const COMPONENT_CLOSE_ORDER_RESIDUAL_PATHS = [
  getQuotedEntry('标准主盒 + simple carton_packaging').label,
  getQuotedEntry('blank foil_bag + simple carton_packaging').label,
  getQuotedEntry('标准主盒 / 已验证飞机盒 + 标准说明书 + simple carton_packaging').label,
] as const

function pickGapSourceRows(source: string) {
  return QUOTED_SAMPLE_ROWS.filter((row) => row.source === source)
}

function isCloseBandOnly(rows: Array<{ toleranceBand: string }>) {
  return rows.every((row) => row.toleranceBand === 'close')
}

function buildTopGapSources(): PricingFinalAuditGapSource[] {
  void GAP_SOURCE_SUMMARY

  return [
    {
      id: 'carton_outer_carton_rate',
      label: 'carton_outer_carton_rate',
      affectedPaths: [
        getQuotedEntry('simple carton_packaging').label,
        getQuotedEntry('标准主盒 + simple carton_packaging').label,
        getQuotedEntry('blank foil_bag + simple carton_packaging').label,
        getQuotedEntry('标准主盒 / 已验证飞机盒 + 标准说明书 + simple carton_packaging').label,
      ],
      whyItMatters:
        '它直接影响 quoted scope 内的 carton add-on 总价，是当前 active quoted scope 里最典型的 order-level residual 传播源。',
      evidence:
        isCloseBandOnly(pickGapSourceRows('carton_outer_carton_rate'))
          ? '当前相关 quoted 样本都还在 close band 内，但该源在单品与 bundle 两层同时重复出现。'
          : '当前相关 quoted 样本已出现超出 close band 的信号，需要继续追。',
      action: 'stop_here_and_monitor',
    },
    {
      id: 'sticker_processing',
      label: 'sticker_processing',
      affectedPaths: [
        getQuotedEntry('标准 seal_sticker').label,
        getQuotedEntry('标准主盒 + 标准贴纸').label,
        getQuotedEntry('标准主盒 / 已验证飞机盒 + 标准说明书 + 标准贴纸').label,
        getQuotedEntry('标准主盒 / 已验证飞机盒 + 标准内托 + 标准贴纸').label,
      ],
      whyItMatters:
        '它是当前 active quoted scope 内 accessory 残差最明显的一层，会直接传导到带 sticker 的 quoted bundle。',
      evidence:
        isCloseBandOnly(pickGapSourceRows('sticker_processing'))
          ? '当前 seal sticker 相关样本仍维持 close，但加工梯度是 quoted accessory 里最需要继续盯住的残差点。'
          : '当前 seal sticker 相关样本已出现超出 close band 的信号，需要继续追。',
      action: 'stop_here_and_monitor',
    },
    {
      id: 'bundle_main_box_path',
      label: 'bundle_main_box_path',
      affectedPaths: [
        getQuotedEntry('标准主盒 + 标准说明书').label,
        getQuotedEntry('标准双插盒 + 标准内托').label,
        getQuotedEntry('标准双插盒 + 高频 generic 说明书').label,
        getQuotedEntry('标准双插盒 + 高频 proxy 内托').label,
      ],
      whyItMatters:
        '它不是单点最大 gap，但覆盖高价值 bundle 最广，决定了“同参数下是否接近 Excel”的主盒基线是否让人放心。',
      evidence:
        isCloseBandOnly(pickGapSourceRows('bundle_main_box_path'))
          ? '当前 bundle main box 相关 quoted 样本仍都在 close band，残差更像主盒基线的轻微继承，而不是 bundle 聚合逻辑重新打坏。'
          : '当前 bundle main box 相关样本已出现超出 close band 的信号，需要继续追。',
      action: 'reopen_only_if_repeated_real_drift',
    },
  ]
}

export const PRICING_FINAL_AUDIT_WITHIN_ACTIVE_SCOPE_DRAFT = {
  reviewDate: '2026-04-08',
  docPath: PRICING_FINAL_AUDIT_WITHIN_ACTIVE_SCOPE_DOC_PATH,
  scopeFreeze: {
    summary:
      '本轮严格冻结当前 active quoted scope，只回答当前已在 quoted scope 内的路径是否已经足够接近 Excel/workbook。',
    activeQuotedItemPaths: ACTIVE_QUOTED_ITEM_PATHS,
    activeQuotedBundlePaths: ACTIVE_QUOTED_BUNDLE_PATHS,
    doNotDo: [
      '不扩新模板。',
      '不扩新的 quoted path。',
      '不继续做新的 coverage blocker。',
      '不继续做 long-tail handoff 路径。',
      '不继续做交付层功能扩张。',
    ],
  },
  currentDegree: {
    activeQuotedItemCount: ACTIVE_QUOTED_ITEM_PATHS.length,
    activeQuotedBundleCount: ACTIVE_QUOTED_BUNDLE_PATHS.length,
    quotedGateCount: QUOTED_ACCEPTANCE_GATES.length,
    acceptedQuotedGateCount: QUOTED_ACCEPTANCE_GATES.filter((entry) => entry.acceptance_status === 'accepted').length,
    blockedQuotedGateCount: QUOTED_ACCEPTANCE_GATES.filter((entry) => entry.acceptance_status === 'blocked').length,
    componentCloseSampleCount: QUOTED_COMPONENT_ROWS.filter((row) => row.toleranceBand === 'close').length,
    orderCloseSampleCount: QUOTED_ORDER_ROWS.filter((row) => row.toleranceBand === 'close').length,
    headline:
      '当前 active quoted scope 已经达到可以明确说“同参数下足够接近 Excel/workbook”的程度；这轮更像 final audit，而不是继续改 pricing 公式。',
  },
  pathGroups: {
    stableClose: {
      label: '已经可以放心说同参数 -> 接近 Excel',
      paths: [...STABLE_CLOSE_PATHS],
      why:
        '这些路径当前同时满足 workbook calibration、order alignment 或 acceptance 的 close 证据，且没有 active quoted scope 内的 blocked gate。',
    } satisfies PricingFinalAuditPathGroup,
    closeButWatch: {
      label: '数值仍 close，但我还会继续盯住',
      paths: [...CLOSE_BUT_WATCH_PATHS],
      why:
        '这些路径当前数值层已经 close，但仍带 generic / proxy / no-film / printed / sticker / carton add-on 的语义或组合 residual。',
    } satisfies PricingFinalAuditPathGroup,
    notFullyComfortable: {
      label: '还不能完全放心的 quoted 路径',
      paths: [...NOT_FULLY_COMFORTABLE_QUOTED_PATHS],
      why:
        '当前不是说这些路径算不出来，而是它们仍带代理色彩、加工梯度或 order-level 残差，不能被误解为“完全等价复制 Excel”。',
    } satisfies PricingFinalAuditPathGroup,
    componentCloseOrderResidual: {
      label: 'component close，但 order-level 仍有残差',
      paths: [...COMPONENT_CLOSE_ORDER_RESIDUAL_PATHS],
      why:
        '这些路径的组件层已经 close，残差主要落在 carton add-on 组合或 order-level 汇总层。',
    } satisfies PricingFinalAuditPathGroup,
  },
  topGapSources: buildTopGapSources(),
  explicitJudgement: {
    canSaySameParamsNearExcel: true,
    canSaySameParamsNearExcelSummary:
      '可以。对当前 active quoted scope 内的路径，系统已经可以明确说“给出与 Excel/workbook 相同或等价参数时，价格足够接近 Excel”。',
    whyStillNotPerfect: [
      '部分路径仍带 generic / proxy / no-film / printed 的标准化代理色彩。',
      'carton add-on 相关 bundle 还保留轻微 order-level residual。',
      'sticker processing 与 bundle main box path 仍是重复出现的 residual source。',
    ],
    shouldChangePricingCodeNow: false,
    pricingCodeDecisionSummary:
      '当前不建议继续改 pricing 代码。现有 active quoted scope 已经够 close，继续微调的边际收益低于引入回归风险。',
  },
  stopRules: [
    {
      label: 'active quoted scope 的高价值路径大多数达到 close',
      status: 'met',
      note: '当前 quoted acceptance gates 没有 blocked 项，active quoted scope 的 gate 级最差样本仍保持 close。',
    },
    {
      label: 'order-level 主样本达到 close / acceptable，且没有 review band',
      status: 'met',
      note: '当前 quoted order 样本仍在 close band，未出现需要打回 quoted 的 order-level 主样本。',
    },
    {
      label: '没有明显系统性高报或低报',
      status: 'met',
      note: '当前 top residual source 仍存在，但没有证据显示 active quoted scope 内已出现统一方向的系统性漂移。',
    },
    {
      label: '继续投入同等开发成本的收益已明显变低',
      status: 'met',
      note: '继续追 close-band 微差更像高成本低收益，不值得继续作为当前主线。',
    },
    {
      label: '只有连续真实 quoted drift 才重开 calibration',
      status: 'pending',
      note: '若未来 10+ 连续真实 quoted 订单在同一误差源上出现同向漂移，再重开 calibration。',
    },
  ] satisfies PricingFinalAuditStopRule[],
  shouldStopPricingCalibrationNow: true,
  nextStageDecision:
    '应停止当前 quoted scope 内的报价层继续细调。先把这份 final audit 作为 stop rule，后续只有真实 quoted drift 达到重开条件才回到 calibration。',
  retestChecklist: [
    '重新跑 workbook calibration comparison，确认 active quoted component 样本仍保持 close。',
    '重新跑 workbook order alignment review，确认 quoted bundle order-level 样本仍保持 close。',
    '重新跑 pricing acceptance gate，确认 quoted gates 仍全部 accepted、没有 blocked。',
    '重点抽查 carton_outer_carton_rate、sticker_processing、bundle_main_box_path 三类样本，确认没有出现新的同向系统性漂移。',
  ],
} as const

export type PricingFinalAuditWithinActiveScopeDraft = typeof PRICING_FINAL_AUDIT_WITHIN_ACTIVE_SCOPE_DRAFT

export function getWorkbookSampleRow(sampleId: string): WorkbookCalibrationComparisonEntry | WorkbookOrderAlignmentEntry | null {
  return CALIBRATION_ENTRIES.get(sampleId) || ORDER_ALIGNMENT_ENTRIES.get(sampleId) || null
}