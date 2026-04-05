# Complex Packaging Second-Phase Alignment Evaluation Draft

本文档用于定义 second-phase shadow 在进入更强产品角色前的真实报价单对齐评估框架。

范围约束：

- 只服务于产品层判断依据
- 不接管理端可视化
- 不接 review / reflection
- 不改 live phase-one 对外结果
- 不扩展治理、审批、actor 能力

当前目标：

1. 固定首批真实报价单对齐评估集结构
2. 固定 second-phase vs phase-one 的核心对齐指标
3. 固定 second-phase 灰度切换条件草案
4. 给出当前 second-phase 距离“可灰度”的差距判断
5. 明确下一步最值得优先补的产品能力方向

## 1. 首批真实报价单对齐评估集结构

对应草案文件：

- `src/server/packaging/secondPhaseAlignmentEvaluationDraft.ts`

每条样本建议包含：

| 字段 | 说明 |
|---|---|
| sampleId | 稳定样本 ID |
| sourceWorkbook / sourceSheet / sourceRowHint | 指向真实报价单来源 |
| packagingFamilyExpected / packagingTypeExpected / variantTagsExpected | 基于真实单据整理的期望归并结果 |
| productNameRaw / specRaw / materialProcessRaw | 原始品名、规格、材质工艺串 |
| quantity / quotedUnitPrice / quotedAmount | 真实订单数量与可用价格信息 |
| realSummary | 人工整理后的真实摘要信息 |
| realCostItems | 若真实单据存在，记录 line-item 明细 |
| expectedDecision | 期望的 second-phase 决策边界 |
| expectedDecisionReason | 为什么这条样本应该是 quoted / estimated / handoff |
| grayCandidate | 是否属于后续最接近可灰度的 clean subset |

### 1.1 首批样本选取原则

- 只纳入首批 second-phase 盒型族：普通彩盒、双插盒、挂钩彩盒、普通飞机盒
- 优先选择真实单据里拆项清晰、术语真实、能代表边界差异的样本
- 不要求一次覆盖全部复杂结构
- 高复杂样本可以保留在评估集里，但只作为 handoff / estimated 边界样本，不作为灰度候选

### 1.2 当前首批评估样本构成

当前 first-batch runner 维持 8 条主样本，另补若干 `excluded_reference_only` 支持桶样本。主样本覆盖：

- 普通彩盒 quoted 候选：2 条
- 普通飞机盒 quoted 候选：2 条
- 挂钩彩盒 estimated 候选：2 条
- 双插盒高复杂 handoff 候选：2 条

其中：

- 报价单 `1688报价2026-4月-黄娟.xlsx` 提供了更适合 line-item 对齐的样本
- 月结单 `1688月结单2026-03月---叶子康.xlsx` 提供了更适合决策边界与价格区间验证的样本
- 图片归档 `data/quotes/images` 只补支持桶，不直接抬进当前 clean subset admitted 主路径：
- 第三张 bundle 图里的双插盒主件先挂 `tuck_end_box_clean_subset_pending_review`
- 第一张图里的 AE 加强芯双插盒挂 `reinforced estimated-boundary`
- 第二张图里的开窗彩盒挂 `window_box deferred/glossary`

## 2. Second-Phase vs Phase-One 对齐指标

### 2.1 主类归并准确性

要回答的问题：

- phase-one 归并结果是什么
- second-phase 归并结果是什么
- 谁更接近真实单据期望主类和变体标签

规则：

- 完全命中真实主类和关键变体，记为 aligned
- 主类命中但缺 variant，记为 partial
- 主类错误，记为 mismatch
- 每条样本必须明确记录：phase-one 更接近、second-phase 更接近、或两者持平

为什么重要：

- 主类归并是后续材料识别、line-item 生成和决策边界判断的前提

### 2.2 术语识别覆盖度

要回答的问题：

- second-phase 命中了哪些关键术语
- unresolved terms 有多少
- 是否命中了关键材料、坑型、工艺

规则：

- 关键术语分成四层：材料、坑型、印刷、后道工艺
- 若未识别术语不影响核心成本判断，可接受
- 若关键术语进入 unresolved，并影响材料或后道理解，则判为 blocking gap

### 2.3 核心 Line-Item 对齐度

要回答的问题：

- second-phase 的 line-item 是否更接近真实报价单拆法
- 哪些成本项已对齐
- 哪些仍缺失或只落在 manual adjustment

规则：

- 真实单据存在且 second-phase 能直接表达，记为 aligned cost item
- 真实单据存在但 second-phase 只能挂 manual adjustment，记为 partial aligned
- 真实单据存在而 second-phase 无法表达，记为 missing cost item

首批重点看：

- `face_paper`
- `corrugated_core`
- `backing_or_duplex`
- `printing`
- `lamination`
- `die_mold`
- `die_cut_machine`
- `gluing`

### 2.4 决策边界一致性

要回答的问题：

- quoted / estimated / handoff 是否合理
- second-phase 是否比 phase-one 更保守或更准确

规则：

- 对窗口片、高复杂工艺、关键未知术语样本，只要 second-phase 更保守并更符合业务边界，即可记为 boundary win
- 对普通彩盒 / 双插盒 / 飞机盒的 clean subset，如果 second-phase 频繁误降级，要记为 false conservative
- 内部对比观察前，必须保证 second-phase 不比 phase-one 更激进

### 2.5 价格偏差代理指标

要回答的问题：

- 如果真实样本有单价或金额，second-phase 与真实价的偏差落在哪个区间
- 哪类样本偏差最大

规则：

- 优先做方向性判断：偏低、偏高、接近
- 含 manual adjustment 的样本，只做代理比较，不把绝对误差当作硬门槛
- 偏差最大的样本要按原因分桶：窗口片、内卡、特材、高复杂工艺、尺寸来源不清

## 3. 灰度切换条件草案

### 3.1 可以进入下一阶段的条件

下一阶段先定义为：`internal_compare_observation`

满足以下条件时，second-phase 可以进入内部对比观察阶段：

1. 首批真实评估集覆盖普通彩盒、双插盒/挂钩彩盒、普通飞机盒三类样本，且包含 quoted、estimated、handoff 三种边界。
2. second-phase 在多数样本上主类归并结果“更接近或不差于 phase-one”。
3. quoted 候选样本中，关键材料、坑型、印刷和主工艺术语稳定命中。
4. quoted 候选样本中，核心 line-item 主骨架能稳定对齐到真实报价单。
5. 对窗口片、高复杂工艺、关键未知术语样本，second-phase 不比 phase-one 更激进。

### 3.2 仍必须停留在 Shadow 的场景

以下场景继续停留在 shadow：

1. 关键未知术语仍影响材料或后道理解。
2. 开窗、APET、窗口片、贴双面胶等 line-item 尚未稳定建模。
3. 配内卡、内托、组合件或 companion insert 仍依赖 manual adjustment。
4. 高复杂工艺叠加，如逆向UV、局部UV、激凸、半穿。
5. 天地盒、外箱、卡牌套装、扣底盒等不在首批范围内的结构。
6. 任何仍依赖设计稿、刀线图、人工拆项理解的样本。

### 3.3 更强产品角色前的额外条件

即使 second-phase 能进入内部对比观察，也还不能直接承担更强产品角色。至少还要满足：

1. 准备灰度的具体子场景连续通过真实样本对齐。
2. 候选子场景满足：主类稳定、材料配方完整、关键 line-item 可计算、未识别术语不影响核心成本。
3. 如果样本有真实价格，偏差必须可解释，而不是持续集中在同一子场景。
4. core cost 不能长期落在 `manual_adjustment`。

## 4. 当前 Second-Phase 距离“可灰度”的差距

当前判断：

- 适合进入内部对比观察阶段：是
- 适合进入更强产品角色：否

原因：

1. 第一批主类、术语和核心拆项已经具备可比较基础。
2. 但普通彩盒真实 line-item 证据仍少于飞机盒样本，普通彩盒的对齐稳定性还需要补样本。
3. 挂钩彩盒与配内卡、窗口片之间的边界还依赖 manual adjustment，不能视为稳定 quoted 子场景。
4. 真实样本评估目前还是静态草案，尚未变成可重复运行的评估 runner。
5. 价格偏差代理只能帮助解释偏差来源，还不足以作为灰度放行证据。

## 5. 下一阶段产品推进建议

### 5.1 当前是否适合进入内部对比观察阶段

适合，但仅限内部对比观察，不改变任何 live phase-one 输出。

### 5.2 最接近可灰度的首批场景

1. 普通飞机盒：白卡/白板纸 + 4C + 覆膜 + 裱 + 啤 的 clean subset。
2. 普通彩盒：普通白卡/单铜 + 常规覆膜 + 啤 + 粘，且无窗口、无高复杂工艺。
3. 标准双插盒：无窗口、无特材、无 companion insert 的常规样本。

### 5.3 仍需补强的能力

1. 普通彩盒真实拆项样本还不够多，特别是带完整金额映射的成本明细。
2. 挂钩彩盒的 companion insert / manual adjustment 边界还不稳。
3. 真实对齐还缺少一个结构化 runner，用于批量比较 phase-one 与 second-phase。

### 5.4 接下来最值得先补的 1 到 2 个产品能力方向

1. 继续优先补 `gloss / 过光油 BOM-rich` 普通彩盒样本，不让图片支持桶分散当前 folding carton 产品层推进节奏。
2. 标准双插盒继续按分桶补样本：main-item 先挂 pending review，reinforced 与 window 相关样本只进 boundary / glossary 支持桶。
