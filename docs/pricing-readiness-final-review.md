# Pricing Readiness Final Review

这份文档是当前复杂包装报价系统的 readiness 收口结论。

目标不是继续扩模板，也不是继续拆新的局部报价 blocker，而是正式回答：当前系统到底已经完整到什么程度，哪些路径已经可作为正式自动报价能力，哪些仍只能参考报价，哪些应长期人工兜底，以及后续重点是否应转向业务交付能力。

当前结论以以下证据为基础：

1. [docs/pricing-trial-scope.md](docs/pricing-trial-scope.md)
2. [src/server/pricing/pricingTrialScopeDraft.ts](src/server/pricing/pricingTrialScopeDraft.ts)
3. [src/server/pricing/pricingTrialReleaseGateDraft.ts](src/server/pricing/pricingTrialReleaseGateDraft.ts)
4. [docs/workbook-pricing-calibration-comparison.md](docs/workbook-pricing-calibration-comparison.md)
5. [docs/workbook-order-alignment-review.md](docs/workbook-order-alignment-review.md)
6. [docs/workbook-pricing-acceptance-gate.md](docs/workbook-pricing-acceptance-gate.md)
7. [src/tests/complex-packaging-extraction.test.ts](src/tests/complex-packaging-extraction.test.ts)
8. [src/tests/chat-api-consultative-packaging-routing.test.ts](src/tests/chat-api-consultative-packaging-routing.test.ts)
9. [src/tests/complex-packaging-pricing.test.ts](src/tests/complex-packaging-pricing.test.ts)
10. [src/tests/pricing-trial-scope-source-of-truth.test.ts](src/tests/pricing-trial-scope-source-of-truth.test.ts)

## 1. 当前完整报价能力已经做到什么程度

明确判断：当前系统还不能称为“全范围完整报价系统”，但在当前 active limited-trial scope 内，已经基本具备完整报价能力。

这不是一句模糊的“差不多可用”。更准确地说，它已经完成了完整报价所必需的主干结构：

1. 模板化报价已经成型，不再是顶层乘数拼装。
2. line-item 计价、组件 subtotal、订单 subtotal 已经贯通。
3. markup、tax、shipping 的口径已经从结构层明确下来。
4. quoted / estimated / handoff 边界已经有 runtime gate、acceptance gate、release wording 三层统一约束。
5. workbook calibration、order alignment、source-of-truth regression 和 build 已经给出当前版本的稳定性证据。

所以，从“结构完整度”看，它已经不是 demo 化拼装，而是一个完整的、受控的自动报价子系统。

## 2. 当前正式自动报价能力 / 参考报价能力 / 长期人工兜底范围分别是什么

### A. 正式自动报价能力

这些路径当前可以视为 fully-accepted auto quote scope，但这个结论只在 active limited-trial scope 内成立。

#### 单品路径

1. 标准 tuck_end_box
2. 已验证 mailer_box
3. window_box 标准 gloss-film 路径
4. 标准 leaflet_insert
5. generic leaflet（高频标准化）
6. 标准 box_insert（显式克重）
7. proxy box_insert（高频标准化）
8. 标准 seal_sticker
9. blank foil_bag
10. simple carton_packaging

#### bundle 路径

1. 标准主盒 + 标准说明书
2. 标准双插盒 + 高频 generic 说明书
3. 标准双插盒 + 标准内托
4. 标准双插盒 + 高频 proxy 内托
5. 标准主盒 + 标准贴纸
6. 标准主盒 + simple carton_packaging
7. 标准双插盒 + 标准说明书 + 标准贴纸
8. blank foil_bag + simple carton_packaging

这里需要特别强调两点：

1. `generic leaflet` 和 `proxy box_insert` 已经进入正式自动报价能力，但它们是高频标准化 narrow path，不是 generic/proxy 全家族放开。
2. quoted bundle 仍是窄白名单体系，不存在“组件 individually computable 就自动 quoted”的外推。

### B. 参考报价能力

这些路径当前可以继续作为 estimated-only usable scope，但不能当作完整自动报价能力。

#### 单品路径

1. window_box no-film
2. printed/custom foil_bag（非标准 8 丝单面四色 quoted candidate 子集）
3. printed carton_packaging（未进入标准 K636K 单面四色大外箱 quoted candidate 子集）
4. 其他仍依赖更宽 generic / proxy 的活跃模板路径

#### bundle 路径

1. 非白名单主盒 + 内托
2. 非白名单主盒 + 高频 generic leaflet
3. no-film window bundle
4. printed/custom foil_bag bundle
5. printed carton_packaging bundle
6. 更宽的多配件标准 bundle
7. 继续叠加 additional accessory 的主盒 + simple carton bundle

这些路径的共同点是：

1. 当前仍带 proxy、generic、printed/custom 或更宽白名单外组合。
2. 数值上可能已经 close，但逻辑上还不够稳定，不能作为自动正式承诺价。
3. 系统可以给业务参考价，但业务仍需人工确认后再承诺。

### C. 长期人工兜底范围

这些路径当前应明确视为 handoff-only / manual scope，而不是当前阶段继续强推自动化的对象。

1. 模板外结构 / 复杂礼盒 / 复杂外箱
2. 设计稿 / 刀线图 / PDF / AI / CDR / PSD / ZIP 驱动询价
3. 高复杂术语 / 特材 / blocking workbook term
4. 复杂 box_insert，例如 EVA、磁吸、模板外复杂内托
5. 明显依赖人工工艺判断和人工交期判断的长尾复杂结构组合

## 3. 当前是否可以称为“完整报价”

明确结论：

1. 从整个复杂包装系统角度看，当前还不能称为“完整报价”。
2. 从当前 active limited-trial scope 角度看，已经可以称为“在活跃范围内基本具备完整报价能力”。
3. 更准确的表述应是：当前系统属于“只在 limited trial 活跃范围内可视为完整报价”的状态。

原因很清楚：

1. 当前 quoted scope 已经具备完整报价所需的结构、数值、边界和 acceptance 支撑。
2. 但系统覆盖范围仍明显有限，很多真实业务路径仍在 estimated 或 handoff。
3. 因此它不是 general-use 的完整报价系统，而是一个 active-scope-complete 的报价子系统。

## 4. 给出相同参数时，哪些路径已经能报出与 Excel 相同或足够接近的价格

### 同参数 -> 同价或极接近价

1. tuck_end_box
2. mailer_box
3. window_box 标准 gloss-film 路径
4. 标准 leaflet_insert
5. 标准 box_insert（显式克重）
6. blank foil_bag
7. simple carton_packaging

这些路径最接近 workbook-grounded 主干路径，可以视为当前最强的 Excel parity 层。

### 同参数 -> close / acceptable 近似价

1. 标准 seal_sticker
2. 高频 generic leaflet
3. 高频 proxy box_insert
4. 对应已放开的窄白名单 quoted bundle

这些路径当前已经 accepted 并可自动 quoted，但可信度更接近“受控近似完整报价”，而不是全无代理痕迹的 workbook copy。

### 当前还不能承诺同参数稳定复现 workbook 价格

1. window_box no-film
2. printed/custom foil_bag（更宽保守子集）
3. 非白名单 printed carton_packaging
4. 非白名单更宽 bundle
5. 模板外复杂结构
6. 文件驱动和刀线图驱动案例

## 5. 哪些计算公式 / 逻辑已经较准确

当前已经可以视为 workbook-grounded、且足够可信的逻辑主要有：

1. 吨价纸材公式
2. 面积型材料 / 工艺公式
3. 固定费用公式
4. 数量型工序公式
5. component subtotal 聚合
6. order subtotal 聚合
7. 当前 accepted quoted bundle 的 order-level 聚合口径
8. quoted / estimated / handoff 的主边界骨架

换句话说，完整报价所依赖的“算价骨架”已经成立。

## 6. 哪些仍然只是 calibrated approximation

当前仍带明显校准或代理性质、因此不能视为完全 workbook-grounded 的逻辑主要有：

1. 高频 generic leaflet 的标准化近似路径
2. 高频 proxy box_insert 的默认克重代理路径
3. seal_sticker 的 processing 梯度
4. 部分 quote markup 分层
5. blank / outer-carton 之外更宽的 foil_bag / carton 逻辑
6. shipping 默认为 0 的当前 goods-subtotal 口径

这些逻辑当前已经“可用”，但不应被误说成“已经完全等价于 Excel 的逐行成本复刻”。

## 7. 当前成熟度等级是什么

这里需要明确区分两个层级：

1. 整个系统级成熟度：`ready_for_limited_trial`
2. 当前活跃范围内的新细节报价模块成熟度：`pricing_ready_within_active_scope`

为什么系统级还不是 `ready_for_general_use`：

1. 覆盖范围仍明显有限。
2. 仍有 estimated-only 与 handoff-only 大片保守边界。
3. 业务交付闭环仍未完成。

为什么 active scope 已经能到 `pricing_ready_within_active_scope`：

1. 结构层已经完整。
2. 当前活跃 quoted scope 的数值已 close。
3. order-level 逻辑稳定。
4. acceptance gate 已基本收口，标准 quoted/estimated 口径与 1 条 no-film estimated guardrail 已同步。
5. runtime / acceptance / release / doc 口径已统一。

## 8. 当前是否适合进入更稳定的小范围试运行

结论：适合，但前提不是“继续扩报价范围”，而是“把业务交付和基础运营收口”。

从 pricing kernel 角度看，它已经适合进入更稳定的小范围试运行，因为：

1. 当前 acceptance gate 已基本收口：19 个 accepted，1 个 no-film estimated 边界保持 guardrailed。
2. 代表样本 component / order 全在 close band。
3. quoted / estimated / handoff 边界已经稳定。
4. 最新 targeted regressions 和 build 已通过。

但要进入“更稳定”的真实 trial，至少还有两个非报价内核 blocker 需要先处理：

1. 当前 `.env` 里的 OpenAI key 和后台密钥应视为已暴露，必须轮换。
2. 报价单导出、后台可读性、人工复核工作流等业务交付能力还没有收口。

所以更准确地说：

1. 当前 pricing system 已经足够支撑更稳定的小范围试运行。
2. 当前整个 trial delivery stack 还需要先补齐基础运营和交付闭环，才能把这个 trial 稳定跑起来。

## 9. 剩余哪些 blocker 仍然阻止继续前进

### 仍然阻止“更稳定 trial”前进的 blocker

1. 密钥与后台安全配置仍未轮换
2. 报价单导出、业务台账 / 月结导出、后台业务可读性、人工复核协同流程仍未成型

### 虽然存在，但不阻止当前版本试运行的 blocker

1. 活跃范围外模板覆盖不足
2. window no-film、更宽 printed/custom foil_bag、非白名单 printed carton_packaging 仍停在 estimated
3. 非白名单 main + insert、更宽多配件 bundle 仍停在 estimated
4. 文件驱动、复杂术语、复杂特材、模板外结构仍然 handoff

这些问题阻止的是“更广覆盖”和“general use”，不是当前 limited trial 的稳定启动。

### 可以明确延后的事项

1. close-band 微小残差继续下钻
2. 再扩新模板
3. 再拆新的局部报价 blocker

这些都不应再是当前阶段主线。

## 10. 后续重点是否应开始转向业务交付能力

明确判断：是，后续开发重点应该开始从“继续扩报价能力”转向“业务交付能力”。

原因不是因为报价已经做到 general use，而是因为：

1. 当前试运行主干 quoted scope 已经足够稳定。
2. 剩余 open 问题更多是覆盖扩展问题，而不是当前 trial 主干的生死问题。
3. 如果不补交付闭环，业务就算拿到稳定 quoted 结果，也很难把它稳定用起来。

后续更应该优先投入的方向是：

1. 报价单导出
2. Excel 单据 / 台账 / 月结导出
3. 后台业务可读性
4. 业务员操作体验
5. 试运行中的人工复核与交接流程
6. 试运行观测、问题回流和责任边界

报价能力扩展并不是完全停止，而是应降为 secondary lane，只保留对 live trial 有高业务价值的少量边界改进。

## 11. 新增了哪些文件

1. [docs/pricing-readiness-final-review.md](docs/pricing-readiness-final-review.md)
2. [src/server/pricing/pricingReadinessFinalReviewDraft.ts](src/server/pricing/pricingReadinessFinalReviewDraft.ts)

## 12. 我应该如何继续复核这份 readiness 结论

建议按四层顺序复核，而不是回到继续拆小误差：

1. 先复核 scope：对照 [docs/pricing-trial-scope.md](docs/pricing-trial-scope.md)，确认 quoted / estimated / handoff 划分没有被误放宽。
2. 再复核 acceptance：对照 [docs/workbook-pricing-acceptance-gate.md](docs/workbook-pricing-acceptance-gate.md)，确认 14 个 gate 仍全部 accepted。
3. 再复核 parity：对照 [docs/workbook-pricing-calibration-comparison.md](docs/workbook-pricing-calibration-comparison.md) 和 [docs/workbook-order-alignment-review.md](docs/workbook-order-alignment-review.md)，确认 component / order close 没有回弹。
4. 最后复核业务可交付性：确认报价单导出、后台展示、人工复核协作、权限与密钥治理是否足以支撑稳定 trial。

当前最值得继续执行的验证命令：

```bash
./node_modules/.bin/tsx src/tests/complex-packaging-extraction.test.ts
./node_modules/.bin/tsx src/tests/chat-api-consultative-packaging-routing.test.ts
./node_modules/.bin/tsx src/tests/complex-packaging-pricing.test.ts
./node_modules/.bin/tsx src/tests/pricing-trial-scope-source-of-truth.test.ts
npm run build
```

## 一句话结论

当前系统还不能称为“全范围完整报价”，但已经可以明确称为“在当前 active limited-trial scope 内，基本具备完整报价能力”；因此后续主重点应从继续扩报价能力，转向把业务交付与稳定试运行闭环补齐。