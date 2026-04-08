# Workbook Order Alignment Review

当前 live trial release scope 以 `docs/pricing-trial-scope.md` 和 `src/server/pricing/pricingTrialReleaseGateDraft.ts` 为准；本文件是 order-level 对齐证据，不单独定义业务 release 边界。

这份复盘把视角从单组件切到整单层。当前 expected shipping / tax 默认按 0 处理，因为现有 workbook-grounded 样本主要保留的是货值行，不单独暴露运费或税额。
markup_expected 采用反推口径：用 workbook 目标 goods subtotal 反推当前 order costSubtotal 需要的倍率，便于判断当前 aggregate markup 是否偏离。
tolerance_band 规则：order close <= 1.5%，acceptable <= 3%，其余记为 review。

字段：sample_id, workbook_name, sheet_name, sample_description, main_item_subtotal_expected, main_item_subtotal_actual, accessory_subtotal_expected, accessory_subtotal_actual, order_subtotal_expected, order_subtotal_actual, markup_expected, markup_actual, shipping_expected, shipping_actual, tax_expected, tax_actual, final_expected, final_actual, gap_amount, gap_ratio, gap_direction, tolerance_band, main_gap_source, boundary_status, status_note

| sample_id | workbook_name | sheet_name | sample_description | main_item_subtotal_expected | main_item_subtotal_actual | accessory_subtotal_expected | accessory_subtotal_actual | order_subtotal_expected | order_subtotal_actual | markup_expected | markup_actual | shipping_expected | shipping_actual | tax_expected | tax_actual | final_expected | final_actual | gap_amount | gap_ratio | gap_direction | tolerance_band | main_gap_source | boundary_status |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| order_tuck_end_plus_leaflet | composite: image_quote_archive_2026-04-05 + 1688报价---王小姐2026.4月.xlsx | 2026-04-05-tuck-end-bundle-quote + 2026.3,.31旺旺耐心点 | 双插盒主件 + 标准说明书的 workbook-grounded 整单复盘。 | 2750.00 | 2730.12 | 1000.00 | 1002.42 | 3750.00 | 3732.54 | 1.21 | 1.20 | 0.00 | 0.00 | 0.00 | 0.00 | 3750.00 | 3732.54 | -17.46 | -0.47% | close | close | bundle_main_box_path | quoted |
| order_tuck_end_plus_insert | composite: image_quote_archive_2026-04-05 + 1688报价---王小姐2026.4月.xlsx | 2026-04-05-tuck-end-bundle-quote + 2026.3,.31旺旺耐心点 | 双插盒主件 + WEB 特种纸板内托的 workbook-grounded 整单复盘。 | 2750.00 | 2730.12 | 1600.00 | 1598.76 | 4350.00 | 4328.88 | 1.21 | 1.20 | 0.00 | 0.00 | 0.00 | 0.00 | 4350.00 | 4328.88 | -21.12 | -0.49% | close | close | bundle_main_box_path | estimated |
| order_tuck_end_plus_standard_insert | controlled_acceptance: tuck_end_main_anchor + standard_box_insert_candidate | trial-standard-bundle-insert-quoted | 标准双插盒主件 + 显式克重标准内托的受控 quoted bundle acceptance 样本。 | 2750.00 | 2730.12 | 2025.61 | 2025.61 | 4775.61 | 4755.73 | 1.21 | 1.20 | 0.00 | 0.00 | 0.00 | 0.00 | 4775.61 | 4755.73 | -19.88 | -0.42% | close | close | bundle_main_box_path | quoted |
| order_tuck_end_plus_leaflet_sticker | controlled_acceptance: tuck_end_main_anchor + standard_leaflet + standard_sticker | trial-standard-bundle-leaflet-sticker-quoted | 标准双插盒主件 + 标准说明书 + 标准贴纸的受控 quoted bundle acceptance 样本。 | 2750.00 | 2730.12 | 1150.00 | 1158.31 | 3900.00 | 3888.43 | 1.20 | 1.20 | 0.00 | 0.00 | 0.00 | 0.00 | 3900.00 | 3888.43 | -11.57 | -0.30% | close | close | bundle_main_box_path | quoted |
| order_tuck_end_plus_sticker | composite: image_quote_archive_2026-04-05 + 1688报价---王小姐2026.4月.xlsx | 2026-04-05-tuck-end-bundle-quote + 2026.3,.31旺旺耐心点 | 双插盒主件 + 透明封口贴的 workbook-grounded 整单复盘。 | 2750.00 | 2730.12 | 150.00 | 155.89 | 2900.00 | 2886.01 | 1.21 | 1.20 | 0.00 | 0.00 | 0.00 | 0.00 | 2900.00 | 2886.01 | -13.99 | -0.48% | close | close | bundle_main_box_path | quoted |
| order_tuck_end_plus_simple_carton | controlled_acceptance: tuck_end_main_anchor + simple_carton_runtime_bundle | trial-standard-bundle-carton-quoted | 标准双插盒主件 + simple carton_packaging 的首批 quoted bundle acceptance 样本。 | 2750.00 | 2730.12 | 3020.00 | 3097.60 | 5770.00 | 5827.72 | 1.13 | 1.14 | 0.00 | 0.00 | 0.00 | 0.00 | 5770.00 | 5827.72 | 57.72 | 1.00% | close | close | carton_outer_carton_rate | quoted |
| order_tuck_end_full_bundle | image_quote_archive_2026-04-05 | 2026-04-05-tuck-end-bundle-quote | 双插盒 + 内托 + 说明书 + 透明贴纸整单样本。 | 2750.00 | 2730.12 | 2750.00 | 2742.67 | 5500.00 | 5472.79 | 1.21 | 1.20 | 0.00 | 0.00 | 0.00 | 0.00 | 5500.00 | 5472.79 | -27.21 | -0.49% | close | close | bundle_main_box_path | estimated |
| order_foil_bag_plus_carton | 1688报价---王小姐2026.4月.xlsx | 2026.4.1谢先生-毛绒定制 | 8 丝空白铝箔袋 + 纸箱包装费的 2.5 批整单样本。 | 11500.00 | 11557.59 | 5000.00 | 5039.10 | 16500.00 | 16596.69 | 1.11 | 1.11 | 0.00 | 0.00 | 0.00 | 0.00 | 16500.00 | 16596.69 | 96.69 | 0.59% | close | close | foil_bag_material | quoted |

## Largest Final Gaps

1. order_foil_bag_plus_carton: gap_amount 96.69，gap_ratio 0.59%，tolerance close，source foil_bag_material。
2. order_tuck_end_plus_simple_carton: gap_amount 57.72，gap_ratio 1.00%，tolerance close，source carton_outer_carton_rate。
3. order_tuck_end_full_bundle: gap_amount -27.21，gap_ratio -0.49%，tolerance close，source bundle_main_box_path。
4. order_tuck_end_plus_insert: gap_amount -21.12，gap_ratio -0.49%，tolerance close，source bundle_main_box_path。
5. order_tuck_end_plus_standard_insert: gap_amount -19.88，gap_ratio -0.42%，tolerance close，source bundle_main_box_path。

## Layer Attribution

1. order_tuck_end_plus_leaflet: markup 1.20 vs implied 1.21，shipping 0.00，tax 0.00，tolerance close，boundary quoted。
2. order_tuck_end_plus_insert: markup 1.20 vs implied 1.21，shipping 0.00，tax 0.00，tolerance close，boundary estimated。
3. order_tuck_end_plus_standard_insert: markup 1.20 vs implied 1.21，shipping 0.00，tax 0.00，tolerance close，boundary quoted。
4. order_tuck_end_plus_leaflet_sticker: markup 1.20 vs implied 1.20，shipping 0.00，tax 0.00，tolerance close，boundary quoted。
5. order_tuck_end_plus_sticker: markup 1.20 vs implied 1.21，shipping 0.00，tax 0.00，tolerance close，boundary quoted。
6. order_tuck_end_plus_simple_carton: markup 1.14 vs implied 1.13，shipping 0.00，tax 0.00，tolerance close，boundary quoted。
7. order_tuck_end_full_bundle: markup 1.20 vs implied 1.21，shipping 0.00，tax 0.00，tolerance close，boundary estimated。
8. order_foil_bag_plus_carton: markup 1.11 vs implied 1.11，shipping 0.00，tax 0.00，tolerance close，boundary quoted。
