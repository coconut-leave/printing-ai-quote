# Workbook Bundle Main Box Path Review

当前 live trial release scope 以 `docs/pricing-trial-scope.md` 和 `src/server/pricing/pricingTrialReleaseGateDraft.ts` 为准；本文件只提供 main-box residual 证据，不单独定义业务 release 边界。

这份复盘只看 bundle_main_box_path 残余 under-gap，不继续扩模板、不继续打配件 fixed-fee。
对照方式是把同一个主盒路径拆成 A. 单主件报价 与 B. 进入 bundle 后的主件报价，直接检查 builder、line-items、subtotal 和 markup 是否漂移。

字段：sample_id, main_only_message, bundle_message, main_only_boundary, bundle_boundary, main_only_template_id, bundle_main_template_id, main_only_line_items, bundle_main_line_items, main_only_subtotal, bundle_main_subtotal, expected_main_subtotal, main_only_gap_amount, main_only_gap_ratio, bundle_main_gap_amount, bundle_main_gap_ratio, main_only_tolerance_band, bundle_main_tolerance_band, bundle_vs_single_gap_amount, bundle_vs_single_gap_ratio, bundle_vs_single_tolerance_band, main_only_quote_markup, bundle_main_quote_markup, bundle_order_quote_markup, order_level_treatment, main_box_contributed_amount, line_item_delta_summary, residual_source_layer, calibration_action, status_note

| sample_id | main_only_boundary | bundle_boundary | main_only_template_id | bundle_main_template_id | main_only_subtotal | bundle_main_subtotal | expected_main_subtotal | main_only_gap_ratio | bundle_main_gap_ratio | bundle_vs_single_gap_amount | bundle_vs_single_gap_ratio | main_only_quote_markup | bundle_main_quote_markup | bundle_order_quote_markup | order_level_treatment | residual_source_layer | calibration_action |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| order_tuck_end_plus_leaflet | quoted | quoted | tuck_end_box_template | tuck_end_box_template | 2730.12 | 2730.12 | 2750.00 | -0.72% | -0.72% | 0.00 | 0.00% | 1.20 | 1.20 | 1.20 | quoted | main_box_path_itself | keep |
| order_tuck_end_plus_insert | quoted | estimated | tuck_end_box_template | tuck_end_box_template | 2730.12 | 2730.12 | 2750.00 | -0.72% | -0.72% | 0.00 | 0.00% | 1.20 | 1.20 | 1.20 | estimated | main_box_path_itself | keep |
| order_tuck_end_plus_standard_insert | quoted | quoted | tuck_end_box_template | tuck_end_box_template | 2730.12 | 2730.12 | 2750.00 | -0.72% | -0.72% | 0.00 | 0.00% | 1.20 | 1.20 | 1.20 | quoted | main_box_path_itself | keep |
| order_tuck_end_plus_leaflet_sticker | quoted | quoted | tuck_end_box_template | tuck_end_box_template | 2730.12 | 2730.12 | 2750.00 | -0.72% | -0.72% | 0.00 | 0.00% | 1.20 | 1.20 | 1.20 | quoted | main_box_path_itself | keep |
| order_tuck_end_plus_sticker | quoted | quoted | tuck_end_box_template | tuck_end_box_template | 2730.12 | 2730.12 | 2750.00 | -0.72% | -0.72% | 0.00 | 0.00% | 1.20 | 1.20 | 1.20 | quoted | main_box_path_itself | keep |
| order_tuck_end_plus_simple_carton | quoted | quoted | tuck_end_box_template | tuck_end_box_template | 2730.12 | 2730.12 | 2750.00 | -0.72% | -0.72% | 0.00 | 0.00% | 1.20 | 1.20 | 1.14 | quoted | main_box_path_itself | keep |
| order_tuck_end_full_bundle | quoted | estimated | tuck_end_box_template | tuck_end_box_template | 2730.12 | 2730.12 | 2750.00 | -0.72% | -0.72% | 0.00 | 0.00% | 1.20 | 1.20 | 1.20 | estimated | main_box_path_itself | keep |

## Main Findings

1. order_tuck_end_plus_leaflet: line_item_delta none；single subtotal 2730.12 vs bundle main 2730.12；residual source main_box_path_itself。
2. order_tuck_end_plus_insert: line_item_delta none；single subtotal 2730.12 vs bundle main 2730.12；residual source main_box_path_itself。
3. order_tuck_end_plus_standard_insert: line_item_delta none；single subtotal 2730.12 vs bundle main 2730.12；residual source main_box_path_itself。
4. order_tuck_end_plus_leaflet_sticker: line_item_delta none；single subtotal 2730.12 vs bundle main 2730.12；residual source main_box_path_itself。
5. order_tuck_end_plus_sticker: line_item_delta none；single subtotal 2730.12 vs bundle main 2730.12；residual source main_box_path_itself。
6. order_tuck_end_plus_simple_carton: line_item_delta none；single subtotal 2730.12 vs bundle main 2730.12；residual source main_box_path_itself。
7. order_tuck_end_full_bundle: line_item_delta none；single subtotal 2730.12 vs bundle main 2730.12；residual source main_box_path_itself。

## Stop Or Tune

1. order_tuck_end_plus_leaflet: keep。bundle 内主件与单主件使用同一 builder / line-items / markup，残余 under-gap 来自主件路径本身，不是 bundle 特有压低。
2. order_tuck_end_plus_insert: keep。bundle 内主件与单主件使用同一 builder / line-items / markup，残余 under-gap 来自主件路径本身，不是 bundle 特有压低。
3. order_tuck_end_plus_standard_insert: keep。bundle 内主件与单主件使用同一 builder / line-items / markup，残余 under-gap 来自主件路径本身，不是 bundle 特有压低。
4. order_tuck_end_plus_leaflet_sticker: keep。bundle 内主件与单主件使用同一 builder / line-items / markup，残余 under-gap 来自主件路径本身，不是 bundle 特有压低。
5. order_tuck_end_plus_sticker: keep。bundle 内主件与单主件使用同一 builder / line-items / markup，残余 under-gap 来自主件路径本身，不是 bundle 特有压低。
6. order_tuck_end_plus_simple_carton: keep。bundle 内主件与单主件使用同一 builder / line-items / markup，残余 under-gap 来自主件路径本身，不是 bundle 特有压低。
7. order_tuck_end_full_bundle: keep。bundle 内主件与单主件使用同一 builder / line-items / markup，残余 under-gap 来自主件路径本身，不是 bundle 特有压低。

## Decision Snapshot

1. KEEP：当前 7 个 bundle_main_box_path 样本全部维持 keep，因为 bundle_vs_single_gap 全为 0，主件模板、line-items、subtotal 与 markup 没有 bundle-specific 漂移。
2. 停止继续压 bundle 分支：残余 under-gap 仍是主件路径自身的轻微残差，继续压 bundle-specific 逻辑只会打坏已经进入 close band 的现状，而不能解决真正来源。
3. 证据锚点：bundle 主件 subtotal 固定为 2730.12，expected main subtotal 固定为 2750.00，残余约 -0.72%，仍在 component close band。

## Guardrails Verified Unchanged

1. order_tuck_end_plus_leaflet: order tolerance close，boundary quoted，shipping 0.00，tax 0.00。
2. order_tuck_end_plus_insert: order tolerance close，boundary estimated，shipping 0.00，tax 0.00。
3. order_tuck_end_plus_standard_insert: order tolerance close，boundary quoted，shipping 0.00，tax 0.00。
4. order_tuck_end_plus_leaflet_sticker: order tolerance close，boundary quoted，shipping 0.00，tax 0.00。
5. order_tuck_end_plus_sticker: order tolerance close，boundary quoted，shipping 0.00，tax 0.00。
6. order_tuck_end_plus_simple_carton: order tolerance close，boundary quoted，shipping 0.00，tax 0.00。
7. order_tuck_end_full_bundle: order tolerance close，boundary estimated，shipping 0.00，tax 0.00。
8. leaflet_standard_quoted: quoted gate 仍为 accepted。
9. box_insert_standard_quoted_candidate: quoted gate 仍为 accepted。
10. box_insert_weight_proxy_estimated: estimated_only gate 仍为 accepted。
11. seal_sticker_standard_quoted: quoted gate 仍为 accepted。
12. standard_bundle_quoted: quoted gate 仍为 accepted。
13. standard_bundle_estimated: estimated_only gate 仍为 accepted。
14. order_addon_bundle_quoted: quoted gate 仍为 accepted。

## Needs Tuning

1. 当前无需要继续压的 bundle_main_box_path 样本。
