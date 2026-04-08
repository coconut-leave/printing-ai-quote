# Pricing Blocker Review

这轮不继续追局部小误差，也不继续无序扩模板。
目标是把当前复杂包装报价系统的剩余问题按 blocker 分层收口，并把后续开发顺序固定下来，让后续工作从“局部打磨”切换成“按 blocker 推进”。

## Evidence Base

本次分层只基于当前已经落地的证据，不按感觉扩写：

1. `src/server/pricing/pricingTrialScopeDraft.ts`：当前 limited trial 的 request-level / bundle-level gate 已经进入 runtime。
2. `src/server/pricing/pricingAcceptanceGateDraft.ts`：当前 component / order acceptance gate 已按 quoted 与 estimated_only 分开收口。
3. `src/tests/complex-packaging-pricing.test.ts`：当前 quoted / estimated / handoff 边界、bundle quoted 扩展、order tolerance 和 regression 已有回归覆盖。
4. `src/tests/chat-api-consultative-packaging-routing.test.ts`：当前 trial gate 在 chat routing 层已覆盖 quoted bundle / estimated bundle / handoff 路径。
5. `docs/pricing-module-maturity-review.md`：当前整体成熟度结论仍然是 `ready_for_limited_trial`，不是 `ready_for_general_use`。
6. `docs/workbook-pricing-calibration-comparison.md`、`docs/workbook-order-alignment-review.md`、`docs/workbook-pricing-acceptance-gate.md`：当前活跃路径的 workbook-grounded 证据和 acceptance 结论。

## 1. Trial Blocker

### 结论

当前 **core runtime trial blocker 已经基本清空**。

换句话说，真正会阻止 limited trial 跑起来的核心问题，已经不再是 pricing engine 本身，而主要剩下一个偏治理层的 source-of-truth 同步问题。

### 当前 trial blocker 篮子

| blocker | status | why it is a blocker | evidence |
| --- | --- | --- | --- |
| runtime trial gate 未落地 | cleared | 这个问题原本会导致文档与系统行为分离，但现在 gate 已在主链路里生效，不再是 open blocker。 | `src/server/pricing/pricingTrialScopeDraft.ts`、`src/server/packaging/extractComplexPackagingQuote.ts` |
| estimated-only / handoff-only 边界会误升 quoted | cleared | 这类问题会直接破坏 limited trial 的稳定性，但当前 extraction、pricing、chat routing 回归都已覆盖。 | `src/tests/complex-packaging-extraction.test.ts`、`src/tests/chat-api-consultative-packaging-routing.test.ts` |
| 已 accepted 的 quoted / estimated 边界在 order 层不稳定 | cleared | 当前 component 与 order acceptance gate 都是 accepted，没有 blocked / guardrailed。 | `src/server/pricing/pricingAcceptanceGateDraft.ts` |
| 业务侧 source-of-truth 仍有旧文档残留 | cleared | canonical trial scope 已经把 runtime gate、acceptance gate 与 release wording 收到同一事实源，这个治理 blocker 已经清掉。 | `docs/pricing-trial-scope.md`、`src/server/pricing/pricingTrialReleaseGateDraft.ts` |

### 判断

1. 如果只看 runtime，trial blocker 基本已经清空。
2. 如果看“试运行能否被业务团队稳定执行”，当前也已经具备单一事实源；后续重点转回 coverage blocker。

## 2. Coverage Blocker

### 定义

这类问题不会阻止当前 limited trial 启动，但会明显限制自动报价覆盖范围，也是当前最值得继续投入开发的 blocker 篮子。

### 当前 coverage blocker 篮子

| blocker | priority | why it blocks coverage | current boundary | evidence |
| --- | --- | --- | --- | --- |
| 普通标准 bundle quoted 覆盖仍偏窄 | P1 | 当前已放开主盒 + 标准说明书、标准双插盒 + 标准内托、标准双插盒 + 标准说明书 + 标准贴纸、主盒 + 标准贴纸、主盒 + simple carton、空白铝箔袋 + simple carton；但 generic leaflet、更宽的多配件 bundle 和非白名单主盒 + 内托仍停在 estimated。 | estimated_only / selective quoted | `src/server/pricing/pricingTrialScopeDraft.ts`、`src/tests/complex-packaging-pricing.test.ts` |
| `box_insert` proxy 已被进一步收窄 | P1 | 显式克重标准内托单品已可 quoted，最稳定的标准双插盒 + 标准内托 bundle 也已放开；缺显式克重路径仍靠默认 proxy，其他主盒 + 内托组合还不能直接放开。 | narrow quoted bundle + proxy estimated_only | `docs/pricing-trial-scope.md`、`src/tests/complex-packaging-pricing.test.ts` |
| `generic leaflet` 仍只能 estimated | P1 | 真实业务里很多说明书只会给“单面印/双面印”等通用印刷描述；当前虽然价格 close，但边界仍保守。 | estimated_only | `docs/pricing-module-maturity-review.md`、`src/tests/complex-packaging-pricing.test.ts` |
| `window_box` no-film 仍只能 estimated | P2 | 这个路径已经从 handoff 收紧到 estimated，但 עדיין没有进入 quoted，可用性提升了一步，覆盖仍有限。 | estimated_only | `docs/pricing-module-maturity-review.md`、`src/tests/complex-packaging-extraction.test.ts` |
| `printed/custom foil_bag`、非白名单 `printed carton_packaging` 仍保守 | P2 | 当前 2.5 批已把 blank foil bag、标准 printed foil bag 窄单品子集、标准 printed carton 窄单品子集与 simple carton 做到 quoted；更宽定制印刷袋型和非白名单 printed carton 仍停在 conservative path。 | estimated_only / selective quoted | `docs/pricing-module-maturity-review.md`、`src/server/pricing/pricingTrialScopeDraft.ts` |

### 当前最值得优先打的 coverage blocker Top 3

1. **普通标准 bundle quoted 覆盖**
原因：这是当前最直接影响业务实际订单承接的 coverage 缺口。系统现在已经能稳定 quoted 单主件和部分 bundle，但“普通主盒 + 配件”仍大面积停在 estimated，直接限制对真实咨询单的自动成交能力。

2. **`generic leaflet` 标准化**
原因：在最稳的标准双插盒 + 标准内托 bundle 放开后，下一批最有收益的 coverage 缺口已经回到高频说明书 generic path，而不是继续外推更宽的主盒 + 内托白名单。

3. **`generic leaflet` 标准化**
原因：说明书是高频配件，很多客户输入并不会给出 fully structured 印色。当前价格已经接近 workbook，但边界仍停在 estimated；如果把这条从“generic proxy”推进到“受控 quoted 子路径”，收益会比继续打少数长尾路径更直接。

## 3. General-Use Blocker

### 定义

这类问题不会阻止 limited trial，也不应该在当前阶段硬推进自动化，但它们会阻止系统从 limited trial 走向更完整的通用自动报价能力。

### 当前 general-use blocker 篮子

| blocker | why it blocks general use | current treatment | evidence |
| --- | --- | --- | --- |
| 模板外结构 | 当前模板只覆盖活跃范围，更多盒型、混合结构、礼盒家族还未进入结构化模板。 | human handoff | `docs/pricing-module-maturity-review.md` |
| 复杂礼盒 / 复杂外箱 | 结构复杂度高，往往和刀线、材质、装配强耦合，当前不适合自动放开。 | human handoff | `docs/pricing-module-maturity-review.md` |
| 设计稿 / 刀线图 / 文件驱动案例 | 当前系统默认对 PDF、AI、CDR、PSD、ZIP、刀线文件走人工兜底。 | human handoff | `docs/pricing-module-maturity-review.md`、`src/server/pricing/pricingTrialScopeDraft.ts` |
| 高复杂术语 / 特材 / 长尾工艺 | 当前 blocking term 机制是正确的，但也说明这些路径还远未到 deterministic workbook copy。 | human handoff | `docs/pricing-module-maturity-review.md` |
| 业务交付闭环仍不完整 | 若目标是更完整自动报价系统，后续还需要更稳定的报价单、导出、交付单据等业务闭环，而不只是 price engine。 | manual / later system work | 当前仓库能力边界与成熟度评审 |
| 样本池和术语池仍有限 | 当前 close / accepted 结论来自代表样本，不足以支撑 general use 级别的广覆盖承诺。 | guardrailed trial | `docs/pricing-module-maturity-review.md` |

## 4. 哪些问题不是 blocker

以下问题当前不应再当 blocker 处理，而应明确归为 later improvement：

1. 已经在 close band 内的局部 residual gap。
2. 已 accepted 的 quoted / estimated gate 内部继续压小数点误差。
3. `bundle_main_box_path` 的 KEEP 路径继续下钻微调。
4. 当前活跃范围之外的新模板扩张本身。
5. line-item 展示细节或报表美化。

这些问题可以优化，但不再决定当前 limited trial 能不能稳定推进。

## 5. 当前 trial blocker 是否已经基本清空

**是，已经基本清空。**

更准确地说：

1. 核心 runtime trial blocker 已经清空。
2. 当前没有证据显示 allowed quoted / estimated-only / handoff-only 在主链路里继续大面积互相串门。
3. 当前剩余的 open trial blocker 更像“治理 blocker”，不是“引擎 blocker”：需要把业务侧文档、acceptance 报告、release 口径和 runtime gate 保持单一事实源。

## 6. 当前哪些路径应继续坚定保留人工兜底

这些路径当前应继续长期保留在人工兜底范围，不建议立即推进自动化：

1. 模板外结构。
2. 复杂礼盒。
3. 复杂外箱。
4. 设计稿 / 刀线图 / 文件型询价。
5. 高复杂特材与复杂术语驱动案例。
6. 明显依赖人工工艺判断和人工交期判断的长尾路径。

## 7. 后续开发推荐顺序

### Step 1. 先把 trial source-of-truth 收口

**目标**：把当前 runtime gate、acceptance gate、业务侧 release 口径统一成一份稳定事实源。

**为什么排第一**：当前 core runtime 已经基本 ready for limited trial；如果不先统一事实源，后续继续扩 coverage 时，业务和开发会基于不同口径行动。

**做完后的系统状态**：系统从“技术上可控试运行”推进到“业务和技术对 trial 范围有同一解释”的版本。

### Step 2. 再扩普通标准 bundle quoted 覆盖

**目标**：优先把最标准、最常见、最有业务价值的 bundle 从 estimated 推进到 quoted；目前已完成主盒 + simple carton、`box_insert` 单品去 proxy、标准双插盒 + 标准内托，以及标准双插盒 + 标准说明书 + 标准贴纸这条最简单双标准配件组合，再决定是否存在新的 workbook-grounded bundle 候选。

**为什么排第二**：这是当前 coverage blocker 里业务收益最高的一层，而且已有 order close、shipping/tax 口径和 selective quoted bundle 作为基础。

**做完后的系统状态**：系统已经从“单主件 quoted + 少量 quoted bundle”推进到“标准单配件 bundle 与一条最简单双标准配件 bundle 也可 quoted”，下一步更适合回到高频 estimated 单品路径，而不是继续外推更宽的多配件白名单。

### Step 3. 再做组件去 proxy 与保守路径升级

**目标**：优先评估 `generic leaflet`，再看 `window no-film` 是否能升级成更窄、更明确的 quoted 子路径。

**为什么排第三**：`box_insert` 这一步已经完成到最稳 bundle 子路径；后续这层更适合处理剩余高频 estimated path，而不是继续混在 insert bundle 审核里一起推进。

**做完后的系统状态**：系统从“少量标准路径 quoted”推进到“更大一批高频标准单品进入 quoted 或更清晰的保守子路径”，但仍保持 limited trial guardrails。

### Step 4. General-use blocker 继续留在人工兜底

**目标**：模板外结构、复杂文件、复杂礼盒/外箱和高复杂术语继续保持 handoff，不把有限 trial 目标扩成 general-use 项目。

**为什么排这里**：这些问题的收益低于 coverage 扩展，但风险和投入显著更高；当前阶段不适合把自动化推进到这里。

**做完后的系统状态**：系统保持“limited trial with strong guardrails”，而不是过早追求 general use。

## 8. 一句话结论

当前系统的核心 trial blocker 已经基本清空；`主盒 + simple carton_packaging`、`box_insert` 单品去 proxy、`标准双插盒 + 标准内托` quoted bundle 这三步都已落地。下一步不该回头继续抠局部误差，而应该转向 **`generic leaflet` coverage blocker**。