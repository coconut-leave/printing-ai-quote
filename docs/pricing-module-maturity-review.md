# Pricing Module Maturity Review

当前 live trial release scope 以 `docs/pricing-trial-scope.md` 和 `src/server/pricing/pricingTrialReleaseGateDraft.ts` 为准；本文档保留成熟度判断与证据归纳，不再单独充当业务 release 白名单。

这轮评审不继续扩模板，也不继续追打局部误差；目标是回答当前新增的细节报价模块已经成熟到什么程度，以及是否适合进入试运行。

## 评审范围

本次只评审当前仓库内已经落地并验证过的复杂包装细节报价能力：

- 第一批主盒模板：tuck_end_box、mailer_box、window_box
- 第二批配件模板：leaflet_insert、box_insert、seal_sticker
- 2.5 批模板：foil_bag、carton_packaging
- line-item engine
- bundle aggregation
- workbook calibration comparison
- workbook order alignment review
- pricing acceptance gate
- 相关回归测试与 build 结果

本次判断不覆盖当前活跃范围之外的包装家族，也不把文件型复杂设计稿、刀线图、未建模礼盒等场景强行算作“已完善”。

## 证据基础

1. workbook calibration comparison 显示当前活跃模板族在代表样本上全部进入 component close band。
2. workbook order alignment review 显示当前 order-level 代表样本全部进入 order close band。
3. pricing acceptance gate 当前无 blocked、无 guardrailed，全部 accepted。
4. bundle_main_box_path 复盘确认 bundle 不再引入额外主盒漂移，KEEP 结论成立。
5. 当前回归验证结果为：复杂包装定价 38/38、抽取 18/18、咨询式路由 14/14，build 通过。

## 1. 当前细节报价模块已经做到什么程度

明确判断：当前不是“只是能跑”，也不再只是“可用但仍需大幅校准”；它已经到了“在当前活跃范围内基本可用”，但这个“可用”必须带 guardrails，适合受控试运行，不适合直接放成全量通用自动报价。

原因是：

1. 当前活跃模板的 workbook 对照样本已经全部进入 close band，不再是明显漂移状态。
2. quoted / estimated / handoff_required 的边界已经有 acceptance gate 保护，不是纯数值贴近却边界失控。
3. line-item、组件 subtotal、订单汇总、quote markup、tax、shipping 的口径已经串起来，且 bundle 汇总不再额外拉偏主盒。
4. 但它仍然不是“完整报价系统”：活跃范围有限，若遇到模板外结构、默认 proxy、复杂文件、复杂术语，仍要 estimated 或 handoff。

## 2. 给出相同参数时，是否已经能报出和 Excel 相同或足够接近的价格

明确判断：在当前活跃范围内，系统已经能稳定报出与 workbook 样本“足够接近”的价格；少数样本几乎同价，但还不能声称“所有相同参数都精确复刻 Excel 最终价”。

### 按模板族判断

| 模板族 | 当前判断 | 现状说明 |
| --- | --- | --- |
| tuck_end_box | 极接近，可 quoted | 代表主件样本 gap -0.72%，已处于 quoted + close。更接近“同参数可稳定复现 close 价格”，不是逐分逐角完全同价。 |
| mailer_box | 极接近，可 quoted | 三个主样本 gap 分别约 0.77%、-1.65%、-0.11%，都在 close。普通、reinforced、双层路径已能稳定复现接近 workbook 的价格形状。 |
| window_box | 标准覆膜贴片路径极接近；no-film 仍保守 | gloss film 样本 gap 0.47%，quoted + close；no-film 边界样本 gap 3.43%，仍是 estimated，不应说成“同参数可完整复现真实价格”。 |
| leaflet_insert | 标准路径极接近；generic 路径只可 estimated 近似 | 标准说明书 gap 0.24%，quoted + close；generic print 真实样本 gap -0.15%，estimated + close。标准路径已很强，generic 路径仍是保守代理。 |
| box_insert | 标准显式克重路径可 quoted；缺克重 proxy 仍保守 | 标准内托 candidate 当前已能单品 quoted；workbook proxy 样本 gap -0.08%，estimated + close，说明缺显式克重时仍只能当 price proxy。 |
| seal_sticker | 已 close，可 quoted，但仍偏经验校准 | 标准封口贴 gap 3.93%，quoted + close。可以报近似正确价格，但比 leaflet / tuck_end 更依赖经验化梯度。 |
| foil_bag | blank path 已 close；标准 printed 单品可 quoted candidate；更宽定制印刷路径仍保守 | blank 8 丝样本 gap 0.50%，quoted + close。当前已进一步放开标准 8 丝单面四色 10000 个单品作为 controlled acceptance quoted candidate；generic print、双面印刷、打样和特殊袋型仍不能说“同参数可复现真实价格”。 |
| carton_packaging | 简单外箱/纸箱+包装费已 close；复杂外箱仍保守 | 两个样本 gap 0.78%、-0.36%，quoted + close。当前能复现简单外箱价位，但不是复杂印刷纸箱的完整自动报价。 |

### 总结

1. 已达到“同参数 -> 同价或极接近价格”的，是当前标准主路径：tuck_end_box、mailer_box、window_box 的 gloss-film 标准路径、leaflet_insert 标准路径、box_insert 显式克重标准路径、foil_bag blank path、carton_packaging 简单路径。
2. 已达到“同参数 -> 近似接近价格”的，是 seal_sticker、box_insert proxy path、leaflet generic path。
3. 仍不能说“同参数可稳定复现真实价格”的，是 window_box no-film 边界、更宽 printed/custom foil_bag、printed/复杂 carton_packaging、模板外复杂结构。

## 3. 哪些公式/计算逻辑已经较准确

这里的“较准确”指：已经有 workbook-grounded 结构，且当前样本验证显示 close，不只是凭经验乘数。

### 已经比较准确、可视为 workbook-grounded 的逻辑

1. 吨价纸材公式：主纸材、面纸、内外层纸材、说明书纸材、内托材质等，已经按 basis weight、展开尺寸、ton price、charge quantity 明确计算。
2. 面积型材料/工艺公式：覆膜、裱纸、胶片、贴合等，已经按面积型 line-item 计算，不再是顶层拍脑袋乘数。
3. 固定费用公式：印刷固定费、刀模费、开机费、贴纸版费、foil bag setup 等已被显式拆成 fixed_fee。
4. 数量型工序公式：啤机、粘盒、成型、折页、模切、贴纸 processing、纸箱包装费等已被显式拆成 quantity_based_process。
5. 组件 subtotal 聚合：各 line-item 成本汇总为 costSubtotal，再乘报价倍率得到 quotedAmount，已经不是单个总乘数黑盒。
6. 订单级 subtotal 汇总：bundle aggregation 现在按组件 subtotal、quotedAmount、taxMultiplier 聚合，且默认不再凭空追加 shipping。
7. quoted / estimated / handoff_required 边界骨架：关键 line-items 不全不能 quoted，blocking term 命中可直接 handoff，普通 bundle 默认 estimated，这部分逻辑已经比较清晰。

## 4. 哪些公式/计算逻辑仍然只是近似

这里的“近似”不是说完全不可信，而是说当前仍带模板 proxy、经验梯度或保守假设。

### 已经合理但仍属 calibrated approximation 的逻辑

1. specialty_board 默认 proxy 克重：box_insert 在缺显式克重时仍靠 260g 默认值做 price proxy，因此结果虽然 close，但本质仍是 estimated approximation。
2. generic print handling：leaflet 的 generic_print 已压到 close，但它仍是“通用印刷信号 -> 保守估算”，不是 workbook 明细级印色复现。
3. sticker_processing 梯度：封口贴已经 close，但 plate/process 仍是经验校准后收敛的梯度，不是强结构化的工艺明细表。
4. 结构化 quote markup：当前 quote markup 已稳定，但仍是模板分层校准值，不是每个 workbook 行都能逐行反推到同一 business markup 来源。
5. 纸箱外箱单价与袋材单价：carton_packaging、foil_bag 当前主要在简单 blank/outer-carton 场景 close，复杂材质与复杂工艺尚未 fully workbookized。
6. no explicit shipping 默认 0：对于当前 workbook-grounded goods subtotal 口径这是正确的，但若真实业务把运费单列协商，这套逻辑还不能替代完整物流报价。

## 5. 哪些路径仍然不能算“完整报价”

当前还不能称为“完整报价已经完善”的地方主要有五类。

### 1. 还没覆盖的模板/路径

1. 当前活跃范围外的包装家族仍未进入模板，例如天地盖、扣底盒、白盒、外箱复杂结构、更多混合组合结构。
2. 文件型复杂案例仍不自动进入完整报价，包括 PDF、AI、CDR、PSD、ZIP、刀线文件。

### 2. 还没完全准确的公式/代理逻辑

1. box_insert 的默认克重 proxy。
2. leaflet generic print handling。
3. sticker processing 经验梯度。
4. window_box no-film 边界的替代逻辑。
5. foil_bag / carton_packaging 的更复杂材质与印刷路径。

### 3. 还不能稳定 quoted 的场景

1. 普通主盒 + 配件 bundle，即便组件都可算，当前 order-level 仍默认 estimated。
2. window_box no-film path。
3. generic leaflet path。
4. 缺克重的 box_insert path。
5. 更宽 printed/custom foil_bag、非白名单 printed carton_packaging。

### 4. 仍然必须 estimated 或 handoff 的场景

1. 命中 blocking workbook term、未知坑型、未知特材代码的场景。
2. 高复杂特殊工艺叠加场景。
3. 设计稿/刀线图驱动场景。
4. 当前活跃模板之外的结构场景。

### 5. 还不适合给业务员完全信任的地方

1. estimated 路径不能当正式对客成交价，只能当预估参考。
2. 没有显式材料/克重/胶片/结构关键信息时，系统现在更擅长保守降级，而不是自动补全真实成本。
3. 当前 close 证据来自有限 workbook 样本，不代表所有客户表述、所有工厂缩写、所有工艺组合都已被覆盖。

## 6. 当前成熟度等级是什么

明确等级：ready_for_limited_trial。

不选 prototype_only 的原因：

1. 关键模板族已经有 workbook-grounded close 证据。
2. 组件级、整单级、边界级三层都有回归和 acceptance gate 保护。
3. build 与相关回归已通过，说明它不只是 demo。

不选 ready_for_general_use 的原因：

1. 覆盖范围仍明显有限。
2. 多条 estimated path 仍依赖 proxy 或保守假设。
3. 复杂结构、复杂文件、复杂工艺仍需人工兜底。

## 7. 当前是否适合进入试运行

明确判断：适合进入小范围试运行，但不适合无 guardrails 地全量上线。

这意味着：

1. 可以作为业务员的受控报价辅助使用。
2. 可以在当前活跃范围内承担第一轮快速核价与参数补全。
3. 不能把所有 complex packaging 自动结果都当作最终成交价。

## 8. 如果适合，试运行范围怎么定

建议把试运行范围限定为“当前已 close 且边界稳定的活跃路径”，并配人工兜底。

### 建议先试的 quoted 路径

1. tuck_end_box 标准 clean path。
2. mailer_box 已验证的 quoted 主路径。
3. window_box 的标准 gloss-film path。
4. leaflet_insert 标准 quoted path。
5. box_insert 的显式克重标准单品 path。
6. seal_sticker 标准透明封口贴 path。
7. foil_bag 的 blank bag path。
8. carton_packaging 的 simple outer-carton / 纸箱+包装费 path。
9. 当前已放开的 quoted bundle 仅限：标准主盒 + 标准说明书、标准双插盒 + 标准内托、标准主盒 + 标准贴纸、标准主盒 + simple carton_packaging、标准双插盒 + 标准说明书 + 标准贴纸、blank foil_bag + simple carton add-on bundle。

### 建议试运行时仍强制人工兜底的路径

1. 所有 estimated path。
2. 所有 handoff_required path。
3. window_box no-film。
4. box_insert 缺克重 proxy。
5. generic leaflet。
6. custom print foil_bag。
7. printed / more complex carton_packaging。
8. 所有文件型和高复杂结构型询价。

### 试运行建议口径

1. 把 quoted path 作为“可优先参考并可对外使用的受控报价”。
2. 把 estimated path 作为“业务参考价，须人工确认后再承诺”。
3. 把 handoff_required path 作为“明确转人工”。

## 9. 如果不适合全面试运行，剩余 blocker 是什么

如果这里的目标是“全面试运行”或“接近完整报价”，那当前仍有 blocker。

### 真正的 blocker

1. 覆盖 blocker：当前模板只覆盖活跃小范围，不覆盖更多真实业务盒型与复杂结构。
2. 边界 blocker：虽然现在已有单标准配件 bundle 与一条最简单双标准配件 bundle 进入 quoted，但 order-level 普通 bundle 仍大面积只能 estimated，说明整单完整报价能力还不是普适完成态。
3. 代理逻辑 blocker：缺克重的 box_insert proxy、generic leaflet、sticker processing、window no-film 等仍是 calibrated approximation，不是 fully deterministic workbook copy。
4. 文件/复杂工艺 blocker：设计稿、刀线、复杂材质、复杂术语仍需人工判断。
5. 样本 blocker：当前结论建立在代表样本 close 和 gate accepted 上，但样本池仍有限，不足以支撑 general use 结论。

### blocker 的性质

1. 不是 build blocker，也不是核心运行 blocker。
2. 主要是覆盖问题、边界问题和少量代理逻辑问题。
3. 不是“数值大范围失真”，而是“可用范围已经稳定，但完整性还不够广”。

## 10. 面向业务/产品视角的结论摘要

从业务视角看，这版系统已经能做三件事：

1. 对当前活跃范围内的标准包装询价，快速给出结构化、可解释的报价。
2. 对标准主盒、说明书、贴纸、空白铝箔袋、标准 printed 铝箔袋窄子集、简单纸箱这些路径，给出和 Excel 报价表非常接近或可控的 trial quoted 价格。
3. 在信息不全、结构复杂或风险较高时，自动收紧到“预估”或“转人工”，而不是乱报正式价。

业务上可以这样理解它当前的可信度：

1. 标准路径的 quoted 结果，已经可以拿来做小范围试运行。
2. estimated 结果可以拿来做业务参考，但不能当最终承诺价。
3. 一旦客户发复杂文件、特殊结构、复杂工艺，或者参数本身不完整，仍然必须人工介入。

所以，这版已经不是单纯演示系统；它已经具备“小范围试运行”的条件。但它还不是“所有复杂包装都能自动完整报价”的版本。

## 11. 我应该如何用现有 workbook 和样本继续复核这份结论

建议继续用当前 workbook 和样本，按下面的顺序复核，而不是盲目扩模板。

### 复核方法

1. 先看 component 层：对照 workbook-pricing-calibration-comparison 里的每个代表样本，确认当前系统是否仍在 close / acceptable 内。
2. 再看 order 层：对照 workbook-order-alignment-review，确认 bundle 最终 subtotal 是否仍在 order close band。
3. 再看 gate：确认 quoted / estimated_only 的边界没有被新改动破坏。
4. 最后看 KEEP：确认 bundle_main_box_path 仍然没有被 bundle aggregation 额外拉偏。

### 复核重点

1. 不要只看“价格更接近了没有”，还要看 boundary 是否被误放宽。
2. 对 quoted path，优先关心是否还能稳定保持 close。
3. 对 estimated path，优先关心是否仍然保守，而不是被误放成 quoted。
4. 若新增样本只证明某一路径 close，但没有提升覆盖或边界清晰度，不应轻易升级成熟度等级。

### 当前可直接复核的命令

```bash
./node_modules/.bin/tsx src/tests/complex-packaging-pricing.test.ts
./node_modules/.bin/tsx src/tests/complex-packaging-extraction.test.ts
./node_modules/.bin/tsx src/tests/chat-api-consultative-packaging-routing.test.ts
npm run build
```

### 当前最值得对照的文档

1. docs/workbook-pricing-calibration-comparison.md
2. docs/workbook-order-alignment-review.md
3. docs/workbook-pricing-acceptance-gate.md
4. docs/workbook-bundle-main-box-path-review.md
5. docs/workbook-leaflet-setup-fee-review.md

## 结论一句话

当前细节报价模块已经达到“活跃范围内基本可用 + 可做小范围试运行”的阶段；它已经能在当前模板范围内给出与 workbook 很接近的价格，但仍未达到“覆盖足够广、所有路径都可完整自动报价”的 general use 状态。