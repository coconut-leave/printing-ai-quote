# Pricing Trial Run Review

## 复盘定位

这轮不继续开新模板，也不继续先追局部数值误差，而是基于当前已经稳定下来的 limited trial 闭环，做一次完整的内部 trial review。

当前复盘仍采用 **internal simulated trial**，但下一阶段执行重点已经切换为 **trial 运营落地与真实反馈收集**：

- 样本来源：`docs/pricing-trial-scope.md` 对应的 35 条 canonical representative messages
- 运行口径：直接复用 runtime gate、acceptance gate、quoted / estimated / handoff 分流、quote export、批量导出 / 台账、trial review queue、manual confirmation、audit trail、reflection / business feedback
- 目标：在 pricing freeze 前提下，判断当前 trial 运营链路是否足够承接真实 quoted feedback、manual confirmation 闭环、quoted rollback 证据积累与 calibration reopen trigger

## 一、当前 limited trial 最值得看的指标

### 1. 运行结果指标

- quoted 数量 / 占比
- estimated 数量 / 占比
- handoff 数量 / 占比
- review queue 进入量
- manual confirmation 数量
- returned_as_estimate 数量
- handoff_to_human 数量

### 2. 交付指标

- 可直接导出正式报价单的数量
- 可导出参考报价单的数量
- handoff-only 路径被正确阻断的数量
- 批量导出 / 台账是否能稳定区分 quoted / estimated / handoff

### 3. 运营复盘指标

- 哪些 path family 最常进入 quoted
- 哪些 estimated-only path 最常出现
- 哪些 handoff-only path 最常出现
- 哪些 bundle 类型最常出现
- 哪些 accepted path 业务上仍不完全放心

## 二、当前 quoted / estimated / handoff / review 的分布

### 1. trial 运行结果分布

内部 35 条 representative scenarios 的运行结果是：

- `quoted`: 26 条，占 74.3%
- `estimated`: 5 条，占 14.3%
- `handoff_required`: 4 条，占 11.4%

其中 `模板外结构 / 复杂礼盒 / 复杂外箱` 这一条在原始 runtime 里会先落到 `missing_fields`，但在 trial 复盘口径里等价于 `handoff_required`，因为业务动作仍然是直接人工兜底，不会继续自动补参报价。

结论：当前 active scope 已经不是“大量 case 都停在保守 fallback”，而是 **quoted 成为主流，estimated 与 handoff 收缩到少量明确边界**。

### 2. review queue / manual confirmation 分布

- 自动进入 review queue：9 条，占 25.7%
- `manual_confirmed`: 2 条，占 queue 的 22.2%
- `returned_as_estimate`: 2 条，占 queue 的 22.2%
- `handoff_to_human`: 5 条，占 queue 的 55.6%

结论：当前 review workflow 的主要工作量不在 quoted，而在 **确认少量保守边界是否继续维持参考报价，或直接转人工**。

### 3. quote export / ledger 分布

- 可导出正式报价单：19 条，占 67.9%
- 可导出参考报价单：5 条，占 17.9%
- 只保留人工处理提示：4 条，占 14.3%

结论：quote export 已经能稳定分开 formal quote / reference quote / manual review。交付 coverage 补齐后，批量导出 / 台账也已有时间筛选、quoted / estimated 区分、业务归档分类和对外使用建议保护，不再是当前 trial 的主要风险点。

### 4. acceptance gate 与主回归基线

- 当前 acceptance gate：15 条
- `accepted`: 14 / 15
- `npm run test:mvp`: 37 / 37 模块通过
- `npm run build`: 通过

结论：当前最重要的事实不是“某条 acceptance gate 还在漂移”，而是 **运行边界、交付边界和主回归基线都已经稳定**。

## 三、路径分布与 active scope 外热点

### 1. 哪些路径最常进入 quoted

当前 quoted 最集中的 path family 是：

1. `双插盒 / 标准主盒路径`
2. `说明书路径`
3. `内托路径`

结构性结论：

- 当前 quoted 覆盖最集中在双插盒及其白名单 bundle
- accessory 单品（说明书 / 内托 / 贴纸）已经可以支撑 quoted，但仍偏向 narrow accepted path
- 2.5 批的 `blank foil_bag` / `standard printed foil_bag` / `simple carton_packaging` 已经可用，但不是当前 trial 主流压力来源

### 2. 哪些路径最常停在 estimated

当前 estimated 压力主要来自：

1. `printed/custom foil_bag`
2. `printed carton_packaging`（非标准 printed / bundle）
3. `window_box no-film（保守子集）`
4. `generic / proxy 多配件标准 bundle`
5. `window_box + insert conservative subset`

关键结论：标准 K636K 单面四色大外箱单品已经从 estimated-only 中拆出后，当前最值得继续扩的 estimated-only，已经回到 **更宽但仍边界清晰的保守单项路径**，首位转到 `printed/custom foil_bag`；非白名单 printed carton 与 `window_box no-film` 则先守住当前 quoted / estimated guardrail。

### 3. 哪些路径最常进入 handoff

handoff 样本主要仍集中在：

- 文件 / 刀线图驱动
- 模板外结构
- 高复杂术语 / 特材 / blocking workbook term
- 复杂 box_insert

这说明 handoff 不是 active scope 自己失控，而是系统仍在正确拦截长尾高复杂路径。

### 4. 哪些 bundle 类型最常出现

当前 bundle 样本里最常见的仍是：

1. `主盒 + 说明书`
2. `主盒 + 内托`
3. `主盒 + 贴纸 / 双标准配件`

这也解释了为什么下一步 coverage 候选更应该从 **order-level bundle 扩张** 开始，而不是继续先拆散单项。

### 5. 当前 active scope 外最常见的询价类型是什么

如果按 path family 聚合，当前 active scope 外最常见的询价类型是：

1. `文件 / 模板外 / 高复杂术语路径`
2. `复杂 box_insert`

需要单独说明的是：在当前 canonical simulated trial 里，`文件驱动`、`模板外结构`、`blocking workbook term` 三类各出现 1 次，所以我们能确认最常见的是 **这一整类 family**，但还不能用这批模拟样本证明其中某个单独子类比另外两个更高频。

## 四、哪些路径最常被人工确认、打回或转人工

### 1. 哪些路径最常被人工确认

当前最常被人工确认的路径：

- `window_box no-film（保守子集）`
- `printed carton_packaging`

共同点是：

- 业务通常还能接受先按参考报价继续跟进
- 但还不值得直接升级成 quoted
- 人工动作更像“确认当前保守边界可接受”，不是“推翻系统判断”

### 2. 哪些路径最常被保留为参考报价

- `printed/custom foil_bag`
- `window_box no-film（保守子集）`

这说明 returned_as_estimate 的主压力，已经明显落在 **window 保守子集边界** 和 **定制印刷袋型仍不够稳** 两类问题上。

### 3. 哪些路径最常从 estimated 转人工

当前最明显的 estimated-to-handoff 候选是：

- `generic / proxy 多配件标准 bundle`

这说明当前真正把业务从“还可继续沟通”推向“必须转人工”的主因，已经收缩到 **generic / proxy 参与的更宽整单组合复杂度**，而不是标准两配件 bundle 本身。

### 4. 哪些 accepted path 业务上仍不够放心

当前最值得持续观察的 accepted-but-watch path 是：

- `generic leaflet（高频标准化）`
- `proxy box_insert（高频标准化）`
- `standard printed foil_bag`
- `标准双插盒 + 高频 generic 说明书`
- `标准双插盒 + 高频 proxy 内托`

这些路径不是“不该放开”，而是 **虽然 acceptance 已通过，但业务信心仍然依赖 narrow path 和持续观察，不适合马上外推到更宽长尾**。

### 5. 哪些路径最常从 quoted 被打回

当前内部 simulated trial 里 **没有观察到已留痕的 quoted 打回案例**。

这不表示 quoted 路径已经没有风险，而是表示：

- 当前 workflow 主要覆盖 estimated / handoff 复核
- quoted 抽检 / quoted 打回的证据面仍然偏弱

它是真实的 trial blocker，但从当前复盘看，已经 **不再足以阻断下一条 coverage 扩张**。

## 五、当前交付链路还有哪些真实问题

### 1. quote export 是否够用

结论：**够用。**

formal quote / reference quote / manual review 已经明确分层，handoff-only 不会误导出正式或参考单据。

### 2. 批量导出 / 台账是否够用

结论：**够 limited trial 使用。**

时间筛选、quoted / estimated 区分、业务归档分类、对外使用建议和 handoff 排除规则都已回归覆盖。当前主要缺口不是导出本身，而是 period-level 聚合看板。

### 3. review queue 是否清楚

结论：**对非 quoted 主链路已经够清楚。**

状态筛选、来源筛选、非法筛选保护、中文流转展示和状态切换都已经稳定；剩余缺口是 quoted 抽检没有直接纳入 queue。

### 4. manual confirmation 是否顺手

结论：**已经顺手。**

处理人必填、manualConfirmedAt、中文动作留痕、后台状态联动和 observation 反馈区展示都已补齐，不再是 trial 顺滑度的主要问题。

### 5. audit trail / reflection / business feedback 是否够留痕

结论：**单案例层面已经够用。**

当前会话可以留下 reflection、business feedback、当前处理人、人工确认时间和最近处理备注，已经足够支撑 case review。

### 6. 后台中文业务化展示是否足够

结论：**足够支撑当前 limited trial。**

会话详情、导出、trial review 面板和后台列表当前都能用中文解释 quoted / estimated / handoff / trial scope / bundle gate，不再主要暴露内部枚举。

### 7. 当前交付链路真正还差什么

当前真正还差的是：

- quoted 抽检 / 打回留痕
- period-level trial 指标与 disposition 汇总
- 固定周报或批次复盘入口

这些已经是 **运营复盘能力缺口**，不是“现有交付链路不顺手”的断链问题。

## 六、当前最真实的 blocker 是什么

### A. 真实 trial blocker

**quoted 抽检留痕仍是盲区。**

当前 35 条样本里有 26 条直接走 quoted，但自动进入 review queue 的只有 9 条非 quoted case。当前最缺的不是“让更多 case 先进入 quoted”，而是 **让已经 quoted 的 narrow accepted path 也能留下抽检 / 打回证据**。

但这条 blocker 的性质已经变成：

- 它仍然值得补
- 它影响真实 trial 信心积累
- **它不再阻断下一条 coverage 扩张**

### B. 真实 coverage blocker

**estimated-only 主压力已转到更宽 `printed/custom foil_bag` 与非白名单 `printed carton_packaging` 边界。**

当前 estimated 里最值得下一步放开的首位是：

1. `printed/custom foil_bag`

标准 K636K 单面四色大外箱单品这轮已经拆出 quoted candidate；`window_box no-film` 更宽子集、非白名单 printed carton / bundle、generic / proxy 多配件组合与 `window_box + insert conservative subset` 继续留在 guardrail，不在这一轮继续放开。

### C. 真实运营 blocker

**trial 复盘仍然依赖人工拼接证据。**

当前系统已经有 queue、导出、台账、panel、audit trail、business feedback，但如果要看：

- 本周 quoted / estimated / handoff 分布
- 哪些 accepted path 业务上仍不放心
- 哪些路径最常从 estimated 转人工

仍需要人工把证据拼起来。这会让后续决策继续退回到“凭感觉推进”。

## 七、下一步更适合 coverage 扩张还是继续运营交付优化

### 结论

**下一步更适合进入：trial 运营落地与真实反馈收集。**

### 原因

因为当前 trial 结果已经说明：

- quoted 已是主流结果：26 / 35
- acceptance gate 已基本收口：19 accepted + 1 no-film estimated guardrailed
- quote export、批量导出 / 台账、review queue、manual confirmation、audit trail / business feedback 都已完成交付补测
- 顶层 MVP 主回归 37 / 37 全通过
- `npm run build` 通过
- 当前真正缺的是 quoted rollback 证据和 calibration reopen trigger，而不是继续放开更多路径

所以当前主矛盾已经从“现有试运行链路稳不稳”转成“**真实反馈有没有被结构化留痕，以及何时有资格重开 calibration**”。

### 主次顺序

1. **主线：trial 运营落地与真实反馈收集**
2. **次线：coverage 候选继续观察，但不进入当前主线**

coverage 候选仍可保留观察，但在真实 quoted feedback 没有积累到足够证据前，不再作为当前主线。

## 八、如果进入 coverage 扩张，最值得先扩哪条 estimated-only path

### 当前总体优先级

如果把所有 estimated-only 候选放在一起排，建议顺序是：

1. `printed/custom foil_bag`
2. `printed carton_packaging`（非标准 printed / bundle）
3. `window_box no-film（保守子集）`
4. `generic / proxy 多配件标准 bundle`
5. `window_box + insert conservative subset`

### 为什么现在先做 printed/custom foil_bag

`printed/custom foil_bag` 的确具备这些优势：

- 边界清晰
- 当前最窄 printed carton 单品已经拆出后，它成为下一条仍是单项、仍可保守分层的估价边界
- runtime gate 和交付展示基础已齐
- 当前 returned_as_estimate 信号仍清晰，说明业务暂时还能接受它继续保守沟通

这轮 `printed carton_packaging` 保守升级做完后，它已经成为当前最值得先扩的下一条 estimated-only path，原因是：

- 当前最窄标准 printed carton 单品已经拆出 quoted candidate，剩余 non-standard printed carton 更适合先守边界
- 更宽的 generic / proxy 多配件组合和 `window_box + insert` 已明确继续留在 estimated-only guardrail，不在这一轮继续放开
- 与其他剩余 estimated-only 候选相比，更宽 `printed/custom foil_bag` 仍是单项路径，验证成本低于继续外推 printed carton bundle 或更宽 window 组合

### 如果只看单项 estimated-only 候选

如果暂时不做 bundle，只看单项 estimated-only path，那么：

1. `printed/custom foil_bag` 是第一顺位
2. `printed carton_packaging` 的更宽非白名单 printed / bundle 路径仍是第二顺位，但当前已先拆出最小标准单品 quoted candidate
3. `window_box no-film（保守子集）` 当前更适合先守住新边界

所以更准确的结论是：

- `printed/custom foil_bag` 已经是 **当前总体第一优先级**
- generic / proxy 多配件 bundle 与 `window_box + insert` 继续保守，不在本轮继续放开

## 九、`printed/custom foil_bag` 是否应作为下一步第一优先级

### 结论

**是。**

### 更准确的判断

1. 它现在应该作为下一步 coverage 扩张的第一优先级。
2. 这不是因为它商业价值一定高于其他路径，而是因为当前最窄 printed carton 单品已经拆出，继续扩大 non-standard printed carton / bundle 会比先评估更宽 printed/custom foil_bag 更容易越界。
3. 当前剩余的 bundle 保守子集主要是 generic / proxy 多配件组合和 `window_box + insert`，继续保持 estimated-only 更稳妥。
4. 因此下一步优先扩 `printed/custom foil_bag`，比继续扩大多配件白名单、继续放松 no-film 边界或马上外推 printed carton bundle 更合适。

## 十、如何继续复测或继续 trial

### 如果继续内部 trial

建议下一轮固定这样跑：

1. 用 canonical representative messages 继续跑一次 source-of-truth 回归。
2. 抽取 quoted narrow path 做一轮人工抽检，开始累积 quoted 打回证据。
3. 继续跑 trial review queue disposition 统计，确认 manual_confirmed / returned_as_estimate / handoff_to_human 分布没有漂移。
4. 导出 formal / reference / manual-review 三类样本各一批，顺带抽查批量导出 / 台账结果。
5. 继续按这份 markdown 结构做一次周报或批次复盘。

### 如果下一步继续 real limited trial

建议顺序：

下一步不扩模板、不扩 coverage、不改 pricing kernel，先把 trial 运营证据链跑起来。

1. 只登记真实回传的 quoted feedback，不自动拉所有 quoted 进 review queue。
2. 每条 quoted rollback 至少留下：review status、manual confirmation result、review note、rejection reason、rejection target area、calibration signal、drift source candidate。
3. 继续用 quote export、review queue、manual confirmation、audit trail 和 batch export 做 trial 留档。
4. 只有当连续 10 单正式报价反馈出现同源同向 drift，且足够证明是系统性偏差时，才重开 calibration。

### 如果后续要重开 coverage 扩张

前提先变成：

1. quoted feedback 已经积累到足够真实样本。
2. 连续同源同向 drift 没有触发，或已通过 calibration 结论消化。
3. trial 周报能说明当前 delivery chain 和 rollback evidence 已经稳定可复盘。

满足这些条件后，再回头重排 estimated-only coverage 候选，而不是现在直接继续扩张。