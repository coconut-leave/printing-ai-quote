export type DeliveryExecutionPriority = 'P0' | 'P1' | 'P2'

export type DeliveryExecutionBlockerStatus = 'blocking' | 'partial_blocking' | 'not_blocking'

export type DeliveryExecutionModuleId =
  | 'security_and_environment_governance'
  | 'quote_delivery_and_export'
  | 'ledger_and_batch_export'
  | 'admin_business_readability'
  | 'trial_review_and_human_collaboration'
  | 'operations_and_trial_observability'

export type DeliveryExecutionModule = {
  id: DeliveryExecutionModuleId
  title: string
  goal: string
  currentBaseline: string[]
  currentGap: string[]
  blockerStatus: DeliveryExecutionBlockerStatus
  priority: DeliveryExecutionPriority
  dependencies: DeliveryExecutionModuleId[]
  executionItems: string[]
}

export type DeliveryExecutionStep = {
  step: number
  title: string
  whyNow: string
  modules: DeliveryExecutionModuleId[]
  outcome: string
}

export const PRICING_DELIVERY_EXECUTION_PLAN_DOC_PATH = 'docs/pricing-delivery-execution-plan.md'

export const PRICING_DELIVERY_EXECUTION_MODULES: DeliveryExecutionModule[] = [
  {
    id: 'security_and_environment_governance',
    title: '安全与环境治理',
    goal: '把当前 trial 从可跑通状态提升到可稳定运行状态，先消除暴露密钥、弱后台密钥和环境配置混用风险。',
    currentBaseline: [
      '已有 deploy checklist、runbook、health check、ADMIN_SECRET 后台保护和最小 smoke 路径。',
      '当前后台页面和管理 API 已经受 ADMIN_SECRET 保护。',
    ],
    currentGap: [
      '当前 .env 中出现已暴露的 OPENAI_API_KEY 和弱 ADMIN_SECRET，需要立即轮换。',
      'trial 环境和未来正式环境的变量模板、轮换流程、操作口径还没有固定。',
      '还没有一份明确的 trial secret ownership / rotation / incident response 执行口径。',
    ],
    blockerStatus: 'blocking',
    priority: 'P0',
    dependencies: [],
    executionItems: [
      '轮换 OPENAI_API_KEY 和 ADMIN_SECRET，并把当前值视为已失效。',
      '整理 .env.example / trial env template / production env template 的最小差异。',
      '固化 trial 启动检查、后台访问创建/撤销、密钥轮换和异常回滚步骤。',
      '补一页 trial 环境治理说明，明确谁能看后台、谁能导出、谁能改配置。',
    ],
  },
  {
    id: 'quote_delivery_and_export',
    title: '报价单导出 / 报价交付',
    goal: '把当前已有的单张报价导出能力变成业务可直接使用的交付格式，并明确 quoted / estimated 的对外口径。',
    currentBaseline: [
      '已有单张报价 HTML 预览和 Excel 导出。',
      '导出已经使用中文业务抬头、中文产品名和中文状态表达。',
    ],
    currentGap: [
      'quoted / estimated 的外部文案口径还需要冻结，避免业务对外误用参考报价。',
      '当前导出能力已经能用，但还缺业务签字版格式和字段冻结清单。',
      '还没有把 quote delivery 和 trial review 结果明确联动，例如 estimated 是否必须显示人工确认提示。',
    ],
    blockerStatus: 'partial_blocking',
    priority: 'P1',
    dependencies: ['security_and_environment_governance', 'trial_review_and_human_collaboration'],
    executionItems: [
      '冻结正式报价与参考报价的抬头、状态文案、提示语和对外承诺边界。',
      '确认单张报价单最小字段集：客户、产品、参数摘要、拆解、金额、状态、有效说明。',
      '明确 estimated 导出是否强制附加“需人工确认”标识。',
      '为业务员整理一页“何时可直接发报价单、何时只能发参考价”的操作说明。',
    ],
  },
  {
    id: 'ledger_and_batch_export',
    title: '台账 / 月结 / 批量导出',
    goal: '把当前已有的会话筛选和批量导出能力收口成业务台账，而不是只作为技术导出接口存在。',
    currentBaseline: [
      '已有会话时间筛选和批量 Excel 导出。',
      '当前导出台账已经能区分正式报价和参考报价，并排除纯 handoff 无报价记录的会话。',
    ],
    currentGap: [
      '还没有冻结业务台账字段、筛选规则和日/周/月导出操作口径。',
      '还没有把导出结果和 trial review 结果、人工确认状态、复核责任人串起来。',
      '还缺“今日 / 本月 / 当前筛选结果”的业务使用说明和验收样例。',
    ],
    blockerStatus: 'not_blocking',
    priority: 'P1',
    dependencies: ['security_and_environment_governance', 'trial_review_and_human_collaboration'],
    executionItems: [
      '冻结台账列：报价时间、客户、产品、状态、金额、是否需人工复核、导出说明。',
      '定义今日 / 本月 / 当前筛选结果三种导出使用场景。',
      '确认月结/批量导出是否需要增加复核状态、复核人、复核时间等字段。',
      '补一份业务侧抽查清单，确保导出台账能直接用于 trial 复盘。',
    ],
  },
  {
    id: 'admin_business_readability',
    title: '后台业务可读性',
    goal: '让业务员不用读技术术语，也能一眼看懂当前结果属于哪类范围、为什么是 quoted / estimated / handoff。',
    currentBaseline: [
      '已有会话列表、运营看板、learning dashboard、中文化产品名和状态名。',
      '已有 packaging review summary 和部分中文原因解释。',
    ],
    currentGap: [
      '还缺“当前 trial scope 内正式报价 / 参考报价 / 人工兜底”三层的统一视觉说明。',
      '还缺“当前单据属于哪条 trial scope 路径”的业务化标签。',
      '后台虽然已经中文化，但 quoted / estimated / handoff 的业务决策解释还不够集中。',
    ],
    blockerStatus: 'partial_blocking',
    priority: 'P1',
    dependencies: ['quote_delivery_and_export', 'trial_review_and_human_collaboration'],
    executionItems: [
      '在会话详情或报价详情里增加 scope badge、状态说明和 trial gate 中文理由。',
      '增加“当前是否属于正式自动报价范围”的显式标签。',
      '把 quoted / estimated / handoff 的业务解释收成一套固定展示组件。',
      '给会话列表、导出页和详情页统一同一套中文状态与原因表达。',
    ],
  },
  {
    id: 'trial_review_and_human_collaboration',
    title: 'trial review / 人工复核协同',
    goal: '把 estimated 和 handoff 的处理从“有人去看”变成有明确责任、状态和留痕的流程。',
    currentBaseline: [
      '已有 handoff request、reflections 页面、review API、business feedback 表单和 packaging diff 辅助。',
      '已有待人工跟进状态和部分 learning / review 记录入口。',
    ],
    currentGap: [
      '还没有一套专门面向 trial 的 review queue、复核状态流转和最小 SLA。',
      '还没有把“参考报价”与“正式报价”在业务动作上彻底分开。',
      '复核记录、人工确认、责任人和对外承诺状态还没有成为一套稳定流程。',
    ],
    blockerStatus: 'blocking',
    priority: 'P0',
    dependencies: ['security_and_environment_governance'],
    executionItems: [
      '定义 trial review queue：哪些 estimated 必须复核、哪些 handoff 直接转人工、哪些 quoted 只抽检。',
      '定义 review 状态：待复核、复核中、已确认、转人工、驳回等最小状态集。',
      '明确“参考报价不能直接承诺成交价”的业务动作规则。',
      '记录复核意见、人工确认结论、责任人和时间戳，至少形成最小留痕。',
    ],
  },
  {
    id: 'operations_and_trial_observability',
    title: '运营 / 试运行观察',
    goal: '让团队能用数据判断 trial 是否稳定，而不是靠主观印象。',
    currentBaseline: [
      '已有 dashboard、learning dashboard、会话筛选和时间范围过滤。',
      '已有 quoted / estimated / handoff、缺失字段、咨询漏斗等基础指标。',
    ],
    currentGap: [
      '还缺专门面向 limited trial 的观察口径，例如 in-scope vs out-of-scope、estimated top reasons、handoff top reasons。',
      '还缺周度 review 节奏和异常阈值。',
      '还没有把试运行观察指标与后续 coverage / delivery 决策直接联动。',
    ],
    blockerStatus: 'not_blocking',
    priority: 'P1',
    dependencies: ['trial_review_and_human_collaboration', 'admin_business_readability'],
    executionItems: [
      '增加 trial 观察维度：正式报价范围命中率、estimated top reasons、handoff top reasons、scope 外输入占比。',
      '固定周报视图和异常阈值。',
      '明确哪些指标触发运营修正，哪些指标触发产品或规则评审。',
      '把 trial review 结果和 dashboard 指标放到同一观察面板里。',
    ],
  },
]

export const PRICING_DELIVERY_EXECUTION_STEPS: DeliveryExecutionStep[] = [
  {
    step: 1,
    title: '先清安全和 review 流程',
    whyNow: '这一步不完成，limited trial 即使继续跑，风险和责任边界也不受控。',
    modules: ['security_and_environment_governance', 'trial_review_and_human_collaboration'],
    outcome: '系统从“报价内核 ready”推进到“trial 具备最小安全和人工协同闭环”。',
  },
  {
    step: 2,
    title: '再冻结对外交付口径和后台可读性',
    whyNow: '安全和 review 流程稳定后，业务最需要的是知道什么能发、怎么发、为什么这样发。',
    modules: ['quote_delivery_and_export', 'admin_business_readability'],
    outcome: '系统从“能报价”推进到“业务员能看懂、能交付、能解释”。',
  },
  {
    step: 3,
    title: '最后补台账和 trial 观察',
    whyNow: '交付动作固定后，才值得把台账和运营观察做成稳定复盘工具。',
    modules: ['ledger_and_batch_export', 'operations_and_trial_observability'],
    outcome: '系统从“可执行 trial”推进到“可追踪、可复盘、可持续优化的 trial”。',
  },
]

export const PRICING_DELIVERY_P0 = [
  '安全与环境治理',
  'trial review / 人工复核协同',
] as const

export const PRICING_DELIVERY_P1 = [
  '报价单导出 / 报价交付',
  '台账 / 月结 / 批量导出',
  '后台业务可读性',
  '运营 / 试运行观察',
] as const

export const PRICING_DELIVERY_P2 = [
  '完整账号体系与细粒度权限系统',
  '正式 BI / 数仓级报表',
  'ERP / OMS 深度集成',
  '继续扩更多包装模板',
  '继续追 close-band 微小数值误差',
] as const

export const PRICING_DELIVERY_DO_NOT_DO = [
  '不要把下一阶段主线再拉回报价引擎 1% 误差优化。',
  '不要继续扩新包装模板。',
  '不要先做正式账号体系、复杂权限系统或 BI 大平台。',
  '不要把 estimated 路径包装成正式自动报价能力。',
  '不要在 trial 前期把 delivery scope 扩成 general-use 交付平台。',
] as const

export const PRICING_DELIVERY_TRUE_BLOCKERS = [
  '轮换已暴露的 OPENAI_API_KEY 和弱 ADMIN_SECRET。',
  '定义并落地 trial review queue、复核状态和人工确认留痕。',
] as const

export const PRICING_DELIVERY_NICE_TO_HAVE = [
  '更丰富的月结字段和更复杂的批量导出格式。',
  '更完整的运营趋势图和学习型大盘。',
  '更强的后台视觉 polish。',
  '完整账号体系和精细权限。',
] as const

export const PRICING_DELIVERY_IMMEDIATE_NEXT_FUNCTION = {
  moduleId: 'trial_review_and_human_collaboration' as DeliveryExecutionModuleId,
  feature: 'trial review queue + review status + manual confirmation record',
  reason:
    '这是当前最直接把 quoted / estimated / handoff 结果接到业务动作上的交付闭环，也是除密钥轮换外最明确的 P0。',
} as const