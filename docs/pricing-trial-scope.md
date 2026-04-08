# Pricing Trial Scope

这份文档是当前 limited trial 的 primary source of truth。

当前试运行边界的优先级如下：

1. `docs/pricing-trial-scope.md`
2. `src/server/pricing/pricingTrialReleaseGateDraft.ts`
3. runtime gate 与 acceptance gate 的具体实现 / 证据文档

如果 supporting docs 与这里冲突，以这份 trial scope 和结构化 draft 为准，并应尽快回写 supporting docs。

## Bundle And Upgrade Classes

当前 bundle 统一按以下几类理解，而不是继续按单个组合零散拍板：

1. `standard_quoted_bundle_candidate`
只包含当前已经满足 order-ready、risk-controlled、gate-consistent 的标准 bundle。当前已纳入：标准主盒 + 标准说明书、标准双插盒 + 标准内托、标准双插盒 + 高频 proxy 内托、标准主盒 + 标准贴纸、标准主盒 + simple carton_packaging、标准双插盒 + 标准说明书 + 标准贴纸、blank foil_bag + simple carton_packaging。
2. `high_frequency_estimated_upgrade_candidate`
只包含已经有 component/order evidence、且剩余不确定性只来自 generic/proxy 描述的高频 estimated path。当前已纳入：generic leaflet、默认克重 proxy box_insert，以及它们对应的窄白名单 `标准双插盒 + 高频 generic 说明书`、`标准双插盒 + 高频 proxy 内托`。
3. `extended_main_plus_insert_quoted_candidate`
只包含这轮第一步已验证可放开的非白名单主盒 + 内托子集。当前已纳入：已验证飞机盒 + 标准内托、已验证飞机盒 + 高频 proxy 内托。
4. `extended_main_plus_insert_estimated_only`
只包含仍需继续保守的非白名单主盒 + 内托子集。当前已纳入：window_box + 标准内托、window_box + 高频 proxy 内托，以及其他尚未补齐 order-level evidence 的主盒 + 内托组合。
5. `multi_accessory_standard_bundle_quoted_candidate`
只包含这轮已验证可放开的更宽多配件标准 bundle。当前只纳入标准双插盒 / 已验证飞机盒 + 标准说明书 + 标准贴纸、+ 标准内托 + 标准说明书、+ 标准内托 + 标准贴纸、+ 标准说明书 + simple carton_packaging。
6. `multi_accessory_standard_bundle_estimated_only`
只包含仍需继续保守的多配件标准 bundle 子集。当前继续覆盖 generic leaflet / proxy insert 参与的多配件组合，以及 window_box 或其他未验证主盒的多配件标准组合。
7. `standard_no_film_window_quoted_candidate`
只包含这轮保守拆出的 no-film 单品窄白名单。当前只纳入：明确不贴胶片、标准覆光胶、标准材质印刷、无复杂工艺叠加的 `window_box` 单品路径。
8. `estimated_only_no_film_window`
只包含仍需继续保守的 no-film window 子集。当前继续覆盖非 glossy、非标准、非完整或未进入上述窄白名单的 no-film 单品路径。
9. `handoff_only_no_film_window`
只包含命中复杂工艺、blocking term、特材、文件驱动或其他高复杂信号的 no-film window 子集，继续人工兜底。
10. `estimated_only_bundle`
只要 bundle 内仍含 generic / proxy / no-film / printed-custom / 非白名单组合，且未进入已定义的 quoted 子类，就继续只允许参考报价。
11. `handoff_only_bundle`
模板外结构、高复杂术语 / 特材、文件 / 刀线图 / 设计稿驱动组合、明显依赖人工工艺判断的 bundle，继续人工兜底。

## No-Film Window Classes

这轮 `window_box no-film` 统一拆成以下三层：

1. `standard_no_film_window_quoted_candidate`
只放开最小、最标准、最不依赖胶片假设的一条单品路径：明确不贴胶片、标准覆光胶、标准材质印刷、无复杂工艺叠加，并且 line-item 只生成真实 `window_process`，不生成 `window_film`。
2. `estimated_only_no_film_window`
仍处在 no-film 范围内，但不满足 glossy 窄白名单或仍有不完整/不确定因素的子集，继续只允许参考报价。
3. `handoff_only_no_film_window`
命中复杂开窗结构、复杂工艺、blocking term、特材、文件驱动或其他明显依赖人工判断的 no-film 路径，继续人工兜底。

## Extended Main Plus Insert Classes

这轮 `非白名单主盒 + 内托` 不再一刀切按一个 bucket 理解，而是拆成以下三层：

1. `extended_main_plus_insert_quoted_candidate`
只放开已验证 `mailer_box` 主件 + 单一 `box_insert` 配件，并且主件与内托都必须已经各自落在 `allowed_quoted_in_trial`。当前仅纳入：已验证飞机盒 + 标准内托、已验证飞机盒 + 高频 proxy 内托。
2. `extended_main_plus_insert_estimated_only`
主件和内托虽然都可算，但 bundle-level order evidence 还不足以放开 quoted。当前以 `window_box + 内托` 为代表，继续只允许参考报价。
3. `extended_main_plus_insert_handoff_only`
只要主盒 + 内托组合命中文件驱动、复杂内托、blocking term、特材或其他 handoff signal，就继续人工兜底，不因为主件本身可 quoted 就放开 bundle。

## High-Frequency Estimated Upgrade Admission

第三大步新增的 `high_frequency_estimated_upgrade_candidate` 当前统一要求：

1. pricing engine 已能稳定生成完整 line-items，且 component gap 已进入 close / accepted 区间。
2. residual risk 只能来自单一 generic/proxy 或当前已明确定义的窄 quoted-candidate 信号，不能再叠加 no-film、更宽 printed-custom、special process 或其他复杂 blocker。
3. 核心尺寸、材质、基础工艺信号必须齐全，不能靠 missing-fields 或多层猜测兜底。
4. runtime gate、acceptance gate、release wording 必须同步把该路径视为 quoted candidate，而不是一边 quoted 一边 estimated。
5. bundle 只放最窄白名单，不因为单品 candidate 可算就自动放开所有主盒组合；非白名单主盒 + 内托必须额外满足 `extended_main_plus_insert_*` 的专门分类。

## Standard Quoted Bundle Admission

`standard_quoted_bundle_in_trial` 当前统一要求：

1. 主件已在 `allowed_quoted_in_trial`。
2. 子项也必须已经落在各自的 `allowed_quoted_in_trial`，或者属于已定义的高频 quoted candidate，且只能出现在明确白名单 bundle 中。
3. 主件与子项核心参数齐全：尺寸、材质 / 克重、关键工艺信号必须足够支撑当前模板稳定计价。
4. 不能含关键 blocker：例如 no-film window、未进入标准 8 丝单面四色窄白名单的 printed/custom foil_bag、未进入标准 K636K 单面四色大外箱窄白名单的 printed carton_packaging，或未进入当前高频标准化 candidate 的 generic/proxy 子项。
5. bundle 必须落在当前白名单组合内，而不是“组件 individually computable 就自动 quoted”。
6. order subtotal / markup / shipping / tax 口径必须明确，不能靠隐式 shipping 或临时补差。
7. 现有 workbook-grounded 或 controlled acceptance order 样本必须证明 bundle 聚合不会把 close / acceptable band 打坏。
8. runtime gate、acceptance gate、release wording 必须同步一致。

## Multi-Accessory Standard Bundle Classes

这轮“更宽多配件标准 bundle 扩张”统一按以下三层理解：

1. `multi_accessory_standard_bundle_quoted_candidate`
主件必须是标准双插盒或已验证飞机盒，所有子项都必须 individually 落在 accepted quoted scope，且只能命中这四类白名单结构：标准说明书 + 标准贴纸、标准内托 + 标准说明书、标准内托 + 标准贴纸、标准说明书 + simple carton_packaging。
2. `multi_accessory_standard_bundle_estimated_only`
组件 individually 虽然大体可算，但 order-level 还存在 generic / proxy / 未验证主盒 / 更宽组合关系等保守因素时，继续只允许 estimated。
3. `multi_accessory_standard_bundle_handoff_only`
多配件组合里只要命中文件驱动、复杂内托、blocking term、特材或其他明显依赖人工工艺判断的路径，就继续人工兜底。

## What This Replaces

下列文件仍然保留，但现在只作为 supporting evidence，不再单独定义业务 release 口径：

1. `docs/workbook-pricing-acceptance-gate.md`
2. `docs/workbook-order-alignment-review.md`
3. `docs/workbook-bundle-main-box-path-review.md`
4. `docs/pricing-module-maturity-review.md`

## Synced Inconsistencies

这轮已确认并收口的主要不一致点：

1. `docs/workbook-pricing-acceptance-gate.md` 旧版仍只有 `standard_bundle_estimated` 和 `order_addon_bundle_quoted`，没有同步当前已放开的 `standard_bundle_quoted` 与新的 `extended_main_plus_insert_quoted_candidate`。
2. `docs/workbook-order-alignment-review.md` 旧版仍把部分已放开的 quoted bundle 写成 `estimated`，但 runtime 与 acceptance gate 已经把它们放入 quoted bundle。
3. `docs/workbook-bundle-main-box-path-review.md` 旧版仍缺失这轮已放开的 mailer + insert 第一层 quoted 子集。
4. 这轮 `box_insert` 不再被一刀切视为 estimated：显式克重标准内托单品与高频 proxy 内托单品都已进入 quoted candidate，复杂内托继续 handoff。
5. 这轮进一步把 `已验证飞机盒 + 标准内托 / 高频 proxy 内托` 从“非白名单主盒 + 内托”里拆出，单独收口到 `extended_main_plus_insert_quoted_candidate`；window_box + 内托等其余子集继续 estimated。

## Current Trial Scope

### 1. 当前 trial 中允许自动正式报价的

#### 单品路径

1. 标准 tuck_end_box
2. 已验证 mailer_box
3. window_box 标准 gloss-film 路径
4. window_box 标准 no-film gloss 路径
5. 标准 leaflet_insert
6. generic leaflet（高频标准化）
7. 标准 box_insert（显式克重）
8. proxy box_insert（高频标准化）
9. 标准 seal_sticker
10. blank foil_bag
11. standard printed foil_bag
12. standard printed carton_packaging
13. simple carton_packaging

#### bundle 路径

1. 标准主盒 + 标准说明书
2. 标准双插盒 + 高频 generic 说明书
3. 标准双插盒 + 标准内托
4. 已验证飞机盒 + 标准内托
5. 标准双插盒 + 高频 proxy 内托
6. 已验证飞机盒 + 高频 proxy 内托
7. 标准主盒 + 标准贴纸
8. 标准主盒 + simple carton_packaging
9. 标准主盒 / 已验证飞机盒 + 标准说明书 + 标准贴纸
10. 标准主盒 / 已验证飞机盒 + 标准内托 + 标准说明书
11. 标准主盒 / 已验证飞机盒 + 标准内托 + 标准贴纸
12. 标准主盒 / 已验证飞机盒 + 标准说明书 + simple carton_packaging
13. blank foil_bag + simple carton_packaging

### 2. 当前 trial 中仅允许参考报价的

#### 单品路径

1. window_box no-film（保守子集）
2. printed/custom foil_bag（非标准 8 丝单面四色 quoted candidate 子集）
3. printed carton_packaging（未进入标准 K636K 单面四色大外箱 quoted candidate 子集）
4. 其他仍依赖更宽 generic / proxy 的活跃模板路径

#### bundle 路径

1. 非白名单主盒 + 内托（当前以 window_box + 内托等 `extended_main_plus_insert_estimated_only` 子集为代表）
2. 非白名单主盒 + 高频 generic leaflet
3. no-film window bundle
4. printed/custom foil_bag bundle
5. printed carton_packaging bundle
6. 多配件标准 bundle（generic / proxy / 更宽保守子集）中的 generic leaflet / proxy insert 组合
7. 多配件标准 bundle（generic / proxy / 更宽保守子集）中的 window_box 或其他未验证主盒组合
8. 任何继续叠加 additional accessory 的主盒 + simple carton bundle

### 3. 当前 trial 中必须人工兜底的

1. 模板外结构 / 复杂礼盒 / 复杂外箱
2. 设计稿 / 刀线图 / 高复杂文件型询价
3. 高复杂术语 / 特材 / blocking workbook term
4. 明显强依赖人工工艺判断的长尾路径
5. 复杂 box_insert
6. 复杂主盒 + 内托组合（`extended_main_plus_insert_handoff_only`）

## Runtime And Acceptance Alignment

### Runtime Gate

当前 runtime gate 以 `src/server/pricing/pricingTrialScopeDraft.ts` 为准，并已在 `decideComplexPackagingQuotePath(...)` 主链路中生效。

### Acceptance Gate

当前 acceptance gate 以 `src/server/pricing/pricingAcceptanceGateDraft.ts` 为准。

当前已 accepted 且与 runtime 对齐的 quoted gate：

1. `tuck_end_main_item_quoted`
2. `mailer_box_quoted_paths`
3. `window_box_gloss_quoted`
4. `window_box_no_film_gloss_quoted_candidate`
5. `leaflet_standard_quoted`
6. `leaflet_generic_high_frequency_quoted`
7. `box_insert_standard_quoted_candidate`
8. `box_insert_proxy_high_frequency_quoted`
9. `seal_sticker_standard_quoted`
10. `foil_bag_blank_quoted`
11. `foil_bag_standard_printed_quoted_candidate`
12. `carton_packaging_standard_printed_quoted_candidate`
13. `carton_packaging_quoted`
14. `extended_main_plus_insert_quoted_candidate`
15. `standard_bundle_quoted`
16. `multi_accessory_standard_bundle_quoted_candidate`
17. `order_addon_bundle_quoted`

当前 `standard_bundle_quoted` 已覆盖：

1. 标准主盒 + 标准说明书
2. 标准双插盒 + 高频 generic 说明书
3. 标准双插盒 + 标准内托
4. 标准双插盒 + 高频 proxy 内托
5. 标准主盒 + 标准贴纸
6. 标准主盒 + simple carton_packaging

当前 `multi_accessory_standard_bundle_quoted_candidate` 已覆盖：

1. 标准主盒 / 已验证飞机盒 + 标准说明书 + 标准贴纸
2. 标准主盒 / 已验证飞机盒 + 标准内托 + 标准说明书
3. 标准主盒 / 已验证飞机盒 + 标准内托 + 标准贴纸
4. 标准主盒 / 已验证飞机盒 + 标准说明书 + simple carton_packaging

当前 `extended_main_plus_insert_quoted_candidate` 已覆盖：

1. 已验证飞机盒 + 标准内托
2. 已验证飞机盒 + 高频 proxy 内托

当前与 runtime 对齐的 estimated-only gate：

1. `window_box_no_film_estimated`
2. `extended_main_plus_insert_estimated_only`
3. `multi_accessory_standard_bundle_estimated_only`

## Release Guidance For Business

给业务或试运行参与者的统一口径：

1. 出现在“允许自动正式报价”的路径，可以按系统 quoted 结果做受控试运行。
2. 出现在“仅允许参考报价”的路径，只能作为参考价，不能作为自动正式承诺价。
3. 出现在“必须人工兜底”的路径，应直接转人工，不应尝试通过当前 limited trial 自动放开。
4. `generic leaflet` 与 `proxy box_insert` 已进入高频标准化 quoted candidate，但只放开对应的窄白名单路径，不外推到长尾 generic/proxy 描述。
5. `非白名单主盒 + 内托` 这轮已拆成三层：`extended_main_plus_insert_quoted_candidate` 只放开已验证飞机盒 + 标准 / 高频 proxy 内托；`extended_main_plus_insert_estimated_only` 继续覆盖 window_box + 内托等保守子集；命中复杂内托、特材、文件或 blocking term 的组合继续走 `extended_main_plus_insert_handoff_only`。
6. `multi_accessory_standard_bundle_quoted_candidate` 当前只放开标准双插盒 / 已验证飞机盒的四类两配件标准组合；不外推到 generic / proxy、window_box 或三配件以上标准组合。
7. `标准主盒 + simple carton_packaging` 已进入 quoted，但只限单一标准 bundle 或本轮已验证的“标准说明书 + simple carton_packaging”两配件组合；继续叠加其他 accessory 仍不放开。
8. `window_box no-film` 这轮已拆成三层：`standard_no_film_window_quoted_candidate` 只放开标准覆光胶 no-film 单品；`estimated_only_no_film_window` 继续覆盖非 glossy / 非标准 / 非完整子集；复杂 no-film 路径继续走 `handoff_only_no_film_window`。
9. 新拆出的 no-film glossy 单品 quoted 不代表 no-film window bundle 被放开；带配件组合继续保持 estimated-only。
10. `standard printed carton_packaging` 这轮只放开单品窄白名单：`大外箱` + 明确尺寸 + `K636K空白箱` + `单面四色印刷` + `啤/模切` + `10000个及以上`；双面印刷、成箱/粘箱、包装费、打样、复杂结构和 bundle 继续维持 estimated 或 handoff。

## Next Coverage Blocker

完成这轮 `printed carton_packaging` 保守升级后，下一步最适合进入的 coverage blocker 是：

1. `printed/custom foil_bag` 的更宽保守升级。

更具体地说，这一步已经把最稳的标准 K636K 单面四色大外箱单品从 estimated-only 中拆出，形成最小 quoted candidate；下一条更适合继续评估的 estimated-only 单项路径，转到 `printed/custom foil_bag` 的更宽但仍具清晰单品边界的保守子集，同时继续保持非白名单 printed carton 与 printed carton bundle 的 guardrail。
