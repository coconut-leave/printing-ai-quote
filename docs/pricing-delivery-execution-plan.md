# Pricing Delivery Execution Plan

这份文档把下一阶段的主线从“继续扩报价能力”切到“业务交付闭环执行”。

前提已经明确：

1. 当前 pricing kernel 已达到 `ready_for_limited_trial`。
2. active quoted scope 已基本可用。
3. 当前最限制系统继续往前走的，已经不是报价引擎局部 1% 误差，而是交付闭环是否可执行。

因此，这一轮不继续扩报价模板，也不继续打局部数值误差，而是把真正需要落地的业务交付工作拆成执行清单，并按 blocker 和优先级排序。

## 1. 业务交付闭环应拆成哪些模块

### 模块 1. 安全与环境治理

目标：把当前 trial 从“可跑通”推进到“可稳定运行”，先解决暴露密钥、弱后台密钥和环境配置混用风险。

当前基线：

1. 已有 [docs/deploy-checklist.md](docs/deploy-checklist.md) 和 [docs/deploy-runbook.md](docs/deploy-runbook.md)。
2. 已有 `ADMIN_SECRET` 后台保护、health check 和最小 smoke 路径。

当前缺口：

1. 当前 `.env` 中出现已暴露的 `OPENAI_API_KEY` 和弱 `ADMIN_SECRET`，必须视为已失效并轮换。
2. trial 环境和未来正式环境的变量模板、轮换流程、异常处理口径还没有固定。
3. 还没有一份专门面向 trial 的 secret ownership / rotation / fallback 操作说明。

依赖关系：无前置依赖，是第一优先。

### 模块 2. 报价单导出 / 报价交付

目标：把当前已有的单张报价导出能力收口成业务可直接发送和解释的交付格式。

当前基线：

1. 已有单张报价 HTML 预览和 Excel 导出。参考 [src/app/api/quotes/[id]/export/route.ts](src/app/api/quotes/[id]/export/route.ts) 和 [src/tests/quote-excel-export.test.ts](src/tests/quote-excel-export.test.ts)。
2. 导出已经使用中文业务抬头、中文产品名和中文状态表达。

当前缺口：

1. `quoted` / `estimated` 的对外文案口径还需要冻结，避免业务把参考报价当正式承诺价发出去。
2. 当前导出已经能用，但还缺业务签字版字段冻结和模板验收。
3. 还没有把 quote delivery 与 trial review 明确联动，例如 `estimated` 是否必须显示人工确认提示。

依赖关系：依赖安全与环境治理、trial review / 人工复核协同。

### 模块 3. 台账 / 月结 / 批量导出

目标：把当前已有的会话筛选和批量导出能力变成业务台账，而不是只停留在技术导出接口。

当前基线：

1. 已有会话时间筛选和批量 Excel 导出。参考 [src/app/api/conversations/export/route.ts](src/app/api/conversations/export/route.ts) 和 [src/tests/conversation-export-filters.test.ts](src/tests/conversation-export-filters.test.ts)。
2. 当前导出台账已经能区分正式报价和参考报价，并排除纯 handoff 且无报价结果的会话。

当前缺口：

1. 还没有冻结业务台账字段、筛选规则和日/周/月导出操作口径。
2. 还没有把导出结果和 review 结果、人工确认状态、责任人串起来。
3. 还缺一份“今日 / 本月 / 当前筛选结果导出怎么用”的业务说明。

依赖关系：依赖安全与环境治理、trial review / 人工复核协同。

### 模块 4. 后台业务可读性

目标：让业务员不用看技术术语，也能一眼看懂当前结果属于哪类 trial 范围、为什么是 quoted / estimated / handoff。

当前基线：

1. 已有 [src/app/conversations/page.tsx](src/app/conversations/page.tsx)、[src/app/dashboard/page.tsx](src/app/dashboard/page.tsx)、[src/lib/admin/presentation.ts](src/lib/admin/presentation.ts) 的中文化展示基础。
2. 已有 packaging review summary 和部分中文原因解释。

当前缺口：

1. 还缺“当前 trial scope 内正式报价 / 参考报价 / 人工兜底”三层的统一视觉说明。
2. 还缺“当前单据属于哪条 trial 路径”的显式标签。
3. 后台虽然中文化了，但业务决策解释仍然分散，不够集中。

依赖关系：依赖报价单导出 / 报价交付、trial review / 人工复核协同。

### 模块 5. trial review / 人工复核协同

目标：把 `estimated` 和 `handoff` 的处理从“有人去看”变成有明确责任、状态和留痕的流程。

当前基线：

1. 已有 handoff request、reflections 页面、review API、business feedback 表单和 packaging diff。参考 [src/app/reflections/page.tsx](src/app/reflections/page.tsx)。
2. 已有待人工跟进状态和部分 learning / review 入口。

当前缺口：

1. 还没有专门面向 trial 的 review queue、复核状态流转和最小 SLA。
2. 还没有把“参考报价”和“正式报价”在业务动作上彻底分开。
3. 复核记录、人工确认、责任人和对外承诺状态还没有形成稳定流程。

依赖关系：依赖安全与环境治理。

### 模块 6. 运营 / 试运行观察

目标：让团队能用数据判断 trial 是否稳定，而不是靠主观印象。

当前基线：

1. 已有 dashboard、learning dashboard、会话筛选和时间范围过滤。参考 [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx) 和 [src/app/learning-dashboard/page.tsx](src/app/learning-dashboard/page.tsx)。
2. 已有 `quoted` / `estimated` / `handoff`、缺失字段、咨询漏斗等基础指标。

当前缺口：

1. 还缺专门面向 limited trial 的观察口径，例如 in-scope vs out-of-scope、estimated top reasons、handoff top reasons。
2. 还缺周度 review 节奏和异常阈值。
3. 还没有把 trial review 结果和 delivery 决策放到同一观察面板上。

依赖关系：依赖 trial review / 人工复核协同、后台业务可读性。

## 2. 每个模块当前是否 blocker

| 模块 | 当前是否 blocker | 判断 |
| --- | --- | --- |
| 安全与环境治理 | 是 | 当前 `.env` 密钥暴露和弱后台密钥如果不处理，stable limited trial 不应继续开展。 |
| 报价单导出 / 报价交付 | 部分 blocker | 基础能力已存在，但 quoted / estimated 对外口径和模板冻结还没收口。 |
| 台账 / 月结 / 批量导出 | 不是当前主 blocker | 能力基础已存在，更多是业务化收口和字段冻结问题。 |
| 后台业务可读性 | 部分 blocker | 后台中文化基础已存在，但 trial scope、状态解释和业务决策说明还不够集中。 |
| trial review / 人工复核协同 | 是 | 如果没有明确 review queue、状态流转和人工确认留痕，estimated / handoff 无法稳定转成业务动作。 |
| 运营 / 试运行观察 | 不是当前主 blocker | 已有基础指标和看板，当前更像提升项，不是最先卡 trial 启动的点。 |

## 3. P0 / P1 / P2 分别是什么

### P0

必须先做，否则 limited trial 不适合稳定开展。

1. 安全与环境治理
2. trial review / 人工复核协同

### P1

做完后会明显提升业务试运行体验和交付效率。

1. 报价单导出 / 报价交付
2. 台账 / 月结 / 批量导出
3. 后台业务可读性
4. 运营 / 试运行观察

### P2

可以延后，不影响当前 limited trial 主线。

1. 完整账号体系与细粒度权限系统
2. 正式 BI / 数仓级报表
3. ERP / OMS 深度集成
4. 继续扩更多包装模板
5. 继续追 close-band 微小数值误差

## 4. 推荐执行顺序是什么

### Step 1

先做安全与环境治理 + trial review / 人工复核协同。

为什么：

1. 这一步不完成，trial 继续推进会同时带着安全风险和业务责任边界不清的问题。
2. 它们是当前真正会阻止 stable limited trial 的两个 blocker。

做完后，系统会从“报价内核 ready”推进到“trial 具备最小安全和人工协同闭环”。

### Step 2

再做报价单导出 / 报价交付 + 后台业务可读性。

为什么：

1. 安全和 review 流程稳定后，业务最先需要的不是更多模板，而是知道什么能发、怎么发、为什么这样发。
2. 当前这两块并不是从零开始，而是在已有交付和中文化基础上做收口。

做完后，系统会从“能报价”推进到“业务员能看懂、能交付、能解释”。

### Step 3

最后做台账 / 月结 / 批量导出 + 运营 / 试运行观察。

为什么：

1. 交付动作和 review 流程固定以后，台账与观察指标才有稳定口径。
2. 否则导出字段和 dashboard 指标会随着交付流程变化反复改口径。

做完后，系统会从“可执行 trial”推进到“可追踪、可复盘、可持续优化的 trial”。

## 5. 哪些事情先不要做

1. 不要把下一阶段主线再拉回报价引擎 1% 误差优化。
2. 不要继续扩新包装模板。
3. 不要先做完整账号体系、复杂权限系统或 BI 大平台。
4. 不要把 estimated 路径包装成正式自动报价能力。
5. 不要在 trial 前期把 delivery scope 扩成 general-use 交付平台。

## 6. 新增了哪些文件

1. [docs/pricing-delivery-execution-plan.md](docs/pricing-delivery-execution-plan.md)
2. [src/server/pricing/pricingDeliveryExecutionPlanDraft.ts](src/server/pricing/pricingDeliveryExecutionPlanDraft.ts)

## 7. 我下一步最应该先落哪个交付功能

如果只选一个最应该立刻落地的交付功能，优先级最高的是：

**trial review queue + review status + manual confirmation record**

原因：

1. 这是当前最直接把 `quoted / estimated / handoff` 结果接到业务动作上的交付闭环。
2. 它和密钥轮换一起构成当前最明确的 P0。
3. 一旦这块落下去，后面的报价单导出、后台中文化、台账导出都会更容易收口，因为业务动作规则先稳定了。

## 真正的 blocker vs nice-to-have

### 真正的 blocker

1. 轮换已暴露的 `OPENAI_API_KEY` 和弱 `ADMIN_SECRET`
2. 定义并落地 trial review queue、复核状态和人工确认留痕

### nice-to-have

1. 更丰富的月结字段和更复杂的批量导出格式
2. 更完整的运营趋势图和学习型大盘
3. 更强的后台视觉 polish
4. 完整账号体系和精细权限

## 一句话结论

下一阶段不该再围绕“继续扩报价能力”展开，而应先把 **安全治理 + trial review 流程** 两个 P0 做掉，然后再收口 **报价交付 + 后台可读性 + 台账与观察**，把当前已经 ready 的 limited trial 报价能力真正接成可执行的业务交付闭环。