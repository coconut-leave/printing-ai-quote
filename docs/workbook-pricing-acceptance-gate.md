# Workbook Pricing Acceptance Gate

当前 live trial release scope 以 `docs/pricing-trial-scope.md` 和 `src/server/pricing/pricingTrialReleaseGateDraft.ts` 为准；本文件是 acceptance 证据，不单独定义业务 release 边界。

这份 gate 不是新样本池，而是把当前 workbook calibration / order alignment 的代表样本压成可发布判断。

判断规则：
- component tolerance: close <= 5%，acceptable <= 12%，其余 review。
- order tolerance: close <= 1.5%，acceptable <= 3%，其余 review。
- acceptance_status: tolerance 为 review 或 boundary 不匹配时 blocked；tolerance 为 acceptable 时 guardrailed；其余为 accepted。

## 组件路径 Gate

| gate_id | scope | release_mode | sample_count | expected_boundary | actual_boundaries | worst_sample_id | worst_gap_ratio | tolerance_band | acceptance_status | status_note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuck_end_main_item_quoted | component | quoted | 1 | quoted | quoted | tuck_end_image_bundle_main_item | -0.72% | close | accepted | 标准双插盒主件路径已用 workbook 主件行做 close 锚点。 |
| mailer_box_quoted_paths | component | quoted | 3 | quoted | quoted | mailer_box_0402_xinmeng | -1.65% | close | accepted | 飞机盒 acceptance 继续按 quoted path 评估，但要保留双层+A9 的 guardrail。 |
| window_box_gloss_quoted | component | quoted | 1 | quoted | quoted | window_box_image_gloss_film | 0.47% | close | accepted | 标准开窗覆光胶路径可按 quoted 管理。 |
| window_box_no_film_estimated | component | estimated_only | 1 | estimated | estimated | window_box_no_film_boundary_46085 | 3.43% | close | accepted | 不贴胶片的 window path 继续只接受 estimated。 |
| leaflet_standard_quoted | component | quoted | 1 | quoted | quoted | leaflet_insert_standard_5000 | 0.24% | close | accepted | 标准说明书 path 可以 quoted，但 fixed-fee 仍需持续盯住。 |
| leaflet_general_estimated | component | estimated_only | 1 | estimated | estimated | leaflet_insert_real_220x170_6100 | -0.15% | close | accepted | generic 说明书印刷描述仍只接受 estimated。 |
| box_insert_standard_quoted_candidate | component | quoted | 1 | quoted | quoted | box_insert_standard_white_card_5000 | 0.00% | close | accepted | 显式克重的标准内托单品可按 quoted candidate gate 管理，但这不等于放开主盒 + 内托 bundle。 |
| box_insert_weight_proxy_estimated | component | estimated_only | 1 | estimated | estimated | box_insert_web_specialty_board_5000 | -0.08% | close | accepted | 缺显式克重的内托仍属于默认克重 proxy，只能 estimated。 |
| seal_sticker_standard_quoted | component | quoted | 1 | quoted | quoted | seal_sticker_clear_5000 | 3.93% | close | accepted | 标准透明封口贴路径可 quoted，主要 watch 点是 plate/process 组合。 |
| foil_bag_blank_quoted | component | quoted | 1 | quoted | quoted | foil_bag_blank_8si_10000 | 0.50% | close | accepted | blank foil bag path 继续作为 2.5 批 quoted 基线。 |
| carton_packaging_quoted | component | quoted | 2 | quoted | quoted | carton_packaging_fee_10000 | 0.78% | close | accepted | 纸箱包装模板已经承担 quoted 订单级附加项角色。 |

## 整单路径 Gate

| gate_id | scope | release_mode | sample_count | expected_boundary | actual_boundaries | worst_sample_id | worst_gap_ratio | tolerance_band | acceptance_status | status_note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| standard_bundle_quoted | order | quoted | 5 | quoted | quoted | order_tuck_end_plus_simple_carton | 1.00% | close | accepted | trial 已放开的标准双插盒 + 单一标准说明书 / 标准内托 / 贴纸 / simple carton，以及标准双插盒 + 标准说明书 + 标准贴纸，应按 quoted gate 管理。 |
| standard_bundle_estimated | order | estimated_only | 2 | estimated | estimated | order_tuck_end_plus_insert | -0.49% | close | accepted | proxy 内托 bundle、generic / no-film / printed-custom bundle、未放开的主盒 + 内托组合与更复杂多配件 bundle 继续只接受 estimated，但 order gap 应进入 3% 以内。 |
| order_addon_bundle_quoted | order | quoted | 1 | quoted | quoted | order_foil_bag_plus_carton | 0.59% | close | accepted | 显式订单级附加项 bundle 可继续 quoted。 |

## Accepted
1. tuck_end_main_item_quoted: quoted，worst tuck_end_image_bundle_main_item，gap -0.72%。
2. mailer_box_quoted_paths: quoted，worst mailer_box_0402_xinmeng，gap -1.65%。
3. window_box_gloss_quoted: quoted，worst window_box_image_gloss_film，gap 0.47%。
4. window_box_no_film_estimated: estimated_only，worst window_box_no_film_boundary_46085，gap 3.43%。
5. leaflet_standard_quoted: quoted，worst leaflet_insert_standard_5000，gap 0.24%。
6. leaflet_general_estimated: estimated_only，worst leaflet_insert_real_220x170_6100，gap -0.15%。
7. box_insert_standard_quoted_candidate: quoted，worst box_insert_standard_white_card_5000，gap 0.00%。
8. box_insert_weight_proxy_estimated: estimated_only，worst box_insert_web_specialty_board_5000，gap -0.08%。
9. seal_sticker_standard_quoted: quoted，worst seal_sticker_clear_5000，gap 3.93%。
10. foil_bag_blank_quoted: quoted，worst foil_bag_blank_8si_10000，gap 0.50%。
11. carton_packaging_quoted: quoted，worst carton_packaging_fee_10000，gap 0.78%。
12. standard_bundle_quoted: quoted，worst order_tuck_end_plus_simple_carton，gap 1.00%。
13. standard_bundle_estimated: estimated_only，worst order_tuck_end_plus_insert，gap -0.49%。
14. order_addon_bundle_quoted: quoted，worst order_foil_bag_plus_carton，gap 0.59%。

## Guardrailed
1. 当前无 guardrailed gate。

## Blocked
1. 当前无 blocked gate。
