# Pricing Delivery Coverage Review

日期：2026-04-07

这份复盘不讨论新模板，也不讨论继续扩新的 quoted path。目标只有一个：确认当前 limited-trial 已有交付闭环链路，是否已经具备足够回归和稳定性保护，能支撑下一步再回到 coverage 扩张。

## 当前已稳定的交付链路

### 1. 报价单导出

- quoted 导出已经有正式报价单回归，覆盖 Excel、HTML 预览、bundle 明细与对外使用说明。
- estimated 导出已经有参考报价单回归，覆盖“仅供参考”“不作为正式成交承诺”等交付口径。
- handoff-only 已有阻断回归，确保不会误导出正式或参考单据。

结论：单张报价导出链路当前已经稳定，剩余主要风险不是生成逻辑，而是后续字段继续演化时的文案漂移。

### 2. 批量导出 / 台账 / 月结导出

- 已覆盖今日 / 本月 / 本年时间筛选。
- 已覆盖 quoted / estimated 区分、业务归档分类、对外使用建议。
- 已覆盖纯 handoff 且无报价结果的会话不会混入台账。

结论：当前台账导出已经具备业务留档可用性。剩余风险在于未来若新增月结字段，需要同步补列级回归。

### 3. quoted / estimated / handoff 交付层展示一致性

- observation 面板已覆盖 quoted / estimated / handoff、trial scope 内 / 外、bundle 状态和 acceptance 一致性。
- 本轮新增后台列表交付状态一致性回归，补上 hasExportableResult、exportableResultStatus、trialReviewStatusLabel 和 latestActionLabel 的联动保护。

结论：交付层当前不会轻易和 runtime gate / acceptance gate / trial scope 产生前后台分叉。

## 本轮补齐的 coverage 缺口

### 1. manual confirmation / review status flow

补齐前缺口：

- returned_as_estimate 和 handoff_to_human 已有回归，但 manual_confirmed 缺少直接保护。
- 没有直接证明 manualConfirmedAt、处理人和状态筛选是否稳定。
- trial review route 的非法筛选值没有专门测试保护。

本轮新增保护：

- pending_review -> manual_confirmed 回归
- manualConfirmedAt 持久化回归
- operatorName / note / 中文流转文案回归
- MANUAL_CONFIRMED 状态筛选回归
- 非法 status/sourceKind 筛选值 400 回归

### 2. reflection / business feedback 接入 trial review

补齐前缺口：

- reflection 创建和 packaging context 注入已有回归。
- 但 trial review observation 的反馈区此前没有直接证明会展示 business feedback、当前复核状态、人工确认时间和备注。
- operatorName 甚至没有进入反馈区事实列表。

本轮新增保护：

- feedbackSection 对 business feedback summary 的回归
- 当前复核状态、当前处理人、人工确认时间、最近处理备注的回归
- 同时做了最小实现修正：反馈区补充“当前处理人”事实项

### 3. 后台筛选与状态展示

补齐前缺口：

- 会话列表虽已返回 exportableResultStatus 和 trial review 状态字段，但没有直接回归保护。
- estimated manual_confirmed 和 handoff_to_human 在后台列表中的展示一致性未被验证。

本轮新增保护：

- 后台列表交付状态一致性回归
- quoted / estimated / handoff 三类会话在同一后台列表中的展示对照
- estimated -> manual_confirmed 与 handoff -> handoff_to_human 的最新动作文案对照

## 当前仍有风险但不阻塞回到 coverage 扩张的部分

### 1. quoted 抽检 / 打回留痕仍偏弱

当前 review queue 主链路仍更偏 estimated / handoff。quoted 抽检、quoted 打回、period-level quoted 复盘还不够强。

这不是当前导出或 review workflow 断链，但会影响后续对 quoted path 的真实业务信心积累。

### 2. 更细后台运营筛选仍可继续补

当前已经有：

- 会话状态
- 时间筛选
- trial review status/sourceKind 筛选

但还没有形成更强的运营维度筛选，例如按“需人工复核但已人工确认”“仅参考报价且未处理”等复合运营视图聚合。

### 3. 月结字段未来扩展仍需回归跟进

当前台账已经够业务留档使用，但如果后续加入更细月结/对账字段，需要继续补列级保护。

## 本轮最小修复

1. 在 trial review observation 的 feedbackSection 中补充“当前处理人”，让人工确认链路不只出现在审计卡片里，也进入反馈事实区。

## 这一步做完后，是否适合回到 coverage 扩张

适合。

原因不是“所有风险都清空了”，而是当前 limited-trial 的交付关键链路已经有了足够回归保护：

- 导出链路可用
- 台账链路可用
- review queue 可用
- manual confirmation 可用
- review status flow 可用
- reflection / business feedback 可接到 trial review
- 后台状态展示和交付口径保持一致

现在剩余的主要问题，已经不再是“已有交付链路会不会掉链子”，而是“下一批 coverage 应该先扩哪条边界”。

## 下一步最值得先扩的 estimated-only 路径

建议优先看 `window_box no-film`。

原因：

1. 这是一条边界清晰、业务价值高、表达稳定的 estimated-only 路径。
2. 它已经有 runtime gate、交付文案、observation 展示和 consistency 回归基础。
3. 不需要开新模板，更符合“先扩已有活跃边界，不扩新模板”的当前原则。

如果下一步不是继续补交付 coverage，而是回到 coverage 扩张，`window_box no-film` 会是当前最值得优先评估的一条 estimated-only path。