import {
  PRICING_TRIAL_RELEASE_ENTRIES,
  type PricingTrialReleaseEntry,
} from './pricingTrialReleaseGateDraft'
import { buildPricingAcceptanceGateEntries } from './pricingAcceptanceGateDraft'

export type PricingParityClosureTrack = 'parity_closure'

export type PricingParityStatus =
  | 'stable_close'
  | 'acceptable_but_watch'
  | 'not_stably_close'
  | 'component_close_order_residual'

export type PricingParityPathGroup = {
  label: string
  paths: string[]
  evidence: string
}

export type PricingParityGapSource = {
  id: string
  label: string
  affectedPaths: string[]
  whyItMatters: string
  evidence: string
  recommendedAction: 'monitor_only' | 'targeted_calibration'
}

export type PricingParityStopRule = {
  label: string
  status: 'met' | 'pending'
  note: string
}

export const PRICING_PARITY_CLOSURE_REVIEW_DOC_PATH = 'docs/pricing-parity-closure-review.md'

const ACTIVE_QUOTED_ITEMS = PRICING_TRIAL_RELEASE_ENTRIES
  .filter((entry) => entry.bucket === 'allowed_quoted_in_trial' && entry.scopeType === 'item')
  .map((entry) => entry.label)

const ACTIVE_QUOTED_BUNDLES = PRICING_TRIAL_RELEASE_ENTRIES
  .filter((entry) => entry.bucket === 'allowed_quoted_in_trial' && entry.scopeType === 'bundle')
  .map((entry) => entry.label)

const ACCEPTANCE_ENTRIES = buildPricingAcceptanceGateEntries()
const ACCEPTED_QUOTED_GATES = ACCEPTANCE_ENTRIES.filter(
  (entry) => entry.release_mode === 'quoted' && entry.acceptance_status === 'accepted',
)

function getQuotedEntry(label: string): PricingTrialReleaseEntry {
  const entry = PRICING_TRIAL_RELEASE_ENTRIES.find(
    (item) => item.bucket === 'allowed_quoted_in_trial' && item.label === label,
  )

  if (!entry) {
    throw new Error(`Missing quoted release entry: ${label}`)
  }

  return entry
}

export const PRICING_PARITY_CLOSURE_REVIEW_DRAFT = {
  reviewDate: '2026-04-07',
  docPath: PRICING_PARITY_CLOSURE_REVIEW_DOC_PATH,
  primaryTrack: 'parity_closure' as PricingParityClosureTrack,
  scopeFreeze: {
    summary:
      '本轮主线固定为当前 active quoted scope 的 Excel/workbook 对价收口，不再扩新模板、不再放开新 quoted path、不再继续 coverage blocker 扩张。',
    activeQuotedItemPaths: ACTIVE_QUOTED_ITEMS,
    activeQuotedBundlePaths: ACTIVE_QUOTED_BUNDLES,
    doNotDo: [
      '不扩新模板。',
      '不继续放开新的 quoted path。',
      '不继续推进 printed/custom foil_bag、printed carton_packaging 的更宽 coverage。',
      '不继续推进模板外结构、复杂礼盒、复杂外箱、文件/刀线图驱动案例。',
      '不顺手改 trial scope 或 accepted scope。',
    ],
  },
  currentAssessment: {
    headline:
      '当前 active quoted scope 的 parity 主体已经收敛到 close band 内，现阶段更需要冻结范围、收口误差解释与 stop rule，而不是继续扩范围。',
    acceptedQuotedGateCount: ACCEPTED_QUOTED_GATES.length,
    quotedGateStatus:
      '当前 quoted acceptance gates 均为 accepted，没有 active quoted scope 内的 blocked gate。',
    customerServiceTrack:
      '当前不是主攻方向。客服回复链路没有在本轮 parity 审计中暴露新的 P0/P1 阻塞。',
  },
  parityGroups: {
    stable_close: {
      label: '当前已经稳定 close',
      paths: [
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
      ],
      evidence:
        '这些路径当前已有 workbook calibration / order alignment / acceptance 三层证据，且代表样本处于 close band。',
    } satisfies PricingParityPathGroup,
    acceptable_but_watch: {
      label: '当前 acceptable，但仍需盯住',
      paths: [
        getQuotedEntry('window_box 标准 no-film gloss 路径').label,
        getQuotedEntry('generic leaflet（高频标准化）').label,
        getQuotedEntry('proxy box_insert（高频标准化）').label,
        getQuotedEntry('标准 seal_sticker').label,
        getQuotedEntry('standard printed foil_bag').label,
        getQuotedEntry('标准双插盒 + 高频 generic 说明书').label,
        getQuotedEntry('标准双插盒 + 高频 proxy 内托').label,
        getQuotedEntry('已验证飞机盒 + 高频 proxy 内托').label,
        getQuotedEntry('标准主盒 / 已验证飞机盒 + 标准说明书 + 标准贴纸').label,
        getQuotedEntry('标准主盒 / 已验证飞机盒 + 标准内托 + 标准说明书').label,
        getQuotedEntry('标准主盒 / 已验证飞机盒 + 标准内托 + 标准贴纸').label,
        getQuotedEntry('标准主盒 / 已验证飞机盒 + 标准说明书 + simple carton_packaging').label,
      ],
      evidence:
        '这些路径当前已 accepted，但仍带 narrow generic/proxy/printed/no-film 信号，数值 close 不等于可以继续外推。',
    } satisfies PricingParityPathGroup,
    not_stably_close: {
      label: '当前还不能说稳定接近 Excel',
      paths: [],
      evidence:
        '按当前 active quoted scope 的 acceptance 与 alignment 证据，范围内没有需要立刻打回 quoted 的不稳定路径。',
    } satisfies PricingParityPathGroup,
    component_close_order_residual: {
      label: 'component 已 close，但 order-level 仍有残差',
      paths: [
        getQuotedEntry('标准主盒 + simple carton_packaging').label,
        getQuotedEntry('blank foil_bag + simple carton_packaging').label,
        getQuotedEntry('标准主盒 / 已验证飞机盒 + 标准说明书 + simple carton_packaging').label,
      ],
      evidence:
        '这些路径当前 order-level 仍有轻微 residual，但都在 close band 内，主要集中在 carton add-on 与 order markup 的组合层。',
    } satisfies PricingParityPathGroup,
  },
  topGapSources: [
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
        '这是当前 active quoted scope 内最直接影响整单总价的残差源，既影响 simple carton 单品，也影响带 carton add-on 的 quoted bundle。',
      evidence:
        '当前 order-level 最大正向 residual 集中在 carton 相关 quoted 样本，但仍保持在 close band 内。',
      recommendedAction: 'monitor_only',
    },
    {
      id: 'sticker_processing',
      label: 'sticker_processing',
      affectedPaths: [
        getQuotedEntry('标准 seal_sticker').label,
        getQuotedEntry('标准主盒 / 已验证飞机盒 + 标准说明书 + 标准贴纸').label,
        getQuotedEntry('标准主盒 / 已验证飞机盒 + 标准内托 + 标准贴纸').label,
      ],
      whyItMatters:
        '这是当前 active quoted scope 内组件层最明显的单点残差源，会传导到带 sticker 的 quoted bundle。',
      evidence:
        'seal sticker 当前仍在 close band 内，但 processing/plate 组合是 quoted scope 里波动最明显的配件子项。',
      recommendedAction: 'monitor_only',
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
        '它不是最大的单点误差，但会在多个高价值 quoted bundle 里重复出现，是 active quoted scope 中覆盖面最广的轻微 residual。',
      evidence:
        '当前 bundle-specific drift 已证实不是主因，但标准主盒路径本身的轻微 under-gap 仍会被多个 bundle 继承。',
      recommendedAction: 'monitor_only',
    },
  ] satisfies PricingParityGapSource[],
  calibrationDecision: {
    shouldChangePricingCodeNow: false,
    summary:
      '本轮不建议继续改 pricing 公式。当前 active quoted scope 已经满足 close/accepted 证据，继续打这 3 个 gap source 的边际收益低于维持 scope freeze 的价值。',
    allowedIfFutureTuningNeeded:
      '如果后续真实 trial 数据显示这 3 个误差源出现系统性高报或低报，再做定向 calibration，但不能借机扩 quoted scope。',
  },
  stopRules: [
    {
      label: '高价值 quoted path 大多数维持 close',
      status: 'met',
      note: '当前 active quoted scope 的代表样本已经没有需要立刻打回的 quoted path。',
    },
    {
      label: 'order-level 主要 quoted 样本维持 close / acceptable',
      status: 'met',
      note: '当前 quoted bundle 的 order-level evidence 已保持在 close band。',
    },
    {
      label: '没有明显系统性高报或低报',
      status: 'met',
      note: '当前 residual 仍存在，但没有证据显示 active quoted scope 内存在统一方向的系统性漂移。',
    },
    {
      label: '继续投入同等开发成本已不划算',
      status: 'met',
      note: '在不扩范围的前提下，当前更适合冻结范围并用真实 trial 数据继续观察，而不是继续手工追 close-band 微差。',
    },
    {
      label: '若未来 10+ 连续真实 quoted 订单出现同向漂移，再重开 calibration',
      status: 'pending',
      note: '这是一条重新开工条件，不是当前 closure 的前置条件。',
    },
  ] satisfies PricingParityStopRule[],
} as const