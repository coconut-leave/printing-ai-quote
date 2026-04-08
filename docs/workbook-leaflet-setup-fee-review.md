# Workbook Leaflet Setup Fee Review

这份 scoped review 只看 `leaflet_setup_fee cluster` 与说明书相邻的 `generic print handling`，不触碰 bundle 聚合逻辑、不触碰 bundle_main_box_path KEEP 结论。

## Component Residuals

| sample_id | status | expected_total | actual_total | gap_amount | gap_ratio | cost_subtotal | quoted_amount | quote_markup | actual_quantity | charge_quantity | setup_fee_amount | printing_amount | fold_process_amount |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| leaflet_insert_standard_5000 | quoted | 1000.00 | 1002.42 | 2.42 | 0.24% | 835.35 | 1002.42 | 1.20 | 5000 | 5150 | 12.00 | 268.80 | 515.00 |
| leaflet_insert_real_220x170_6100 | estimated | 360.00 | 359.47 | -0.53 | -0.15% | 299.56 | 359.47 | 1.20 | 6100 | 6250 | 12.00 | 235.20 | 0.00 |

## Line-Item Breakdown

1. leaflet_insert_standard_5000:
- leaflet_paper: 39.55
- leaflet_printing: 268.80
- leaflet_setup: 12.00
- leaflet_folding: 515.00
2. leaflet_insert_real_220x170_6100:
- leaflet_paper: 52.36
- leaflet_printing: 235.20
- leaflet_setup: 12.00

## Residual Attribution

1. setup fee residual: 当前 5000 档说明书 setup fee 已收敛到 12.00，不再是主要 residual 源。
2. printing residual: 标准说明书印刷固定费当前为 268.80，generic print 样本为 235.20；generic handling 保留 estimated，但固定费更轻。
3. fold/process residual: 当前说明书后道主要来自折页，标准样本当前折页/裁切合计 515.00。
4. quantity ladder effect: 5000 档标准说明书当前 actual_quantity=5000，charge_quantity=5150；generic 样本 actual_quantity=6100，charge_quantity=6250。
5. order carryover effect: 主件+说明书整单 accessory residual 当前为 2.42，full bundle 中 accessory residual 当前为 -7.33。

## Order Carryover

| sample_id | accessory_expected | accessory_actual | order_expected | order_actual | gap_amount | gap_ratio | main_gap_source | boundary_status |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| order_tuck_end_plus_leaflet | 1000.00 | 1002.42 | 3750.00 | 3732.54 | -17.46 | -0.47% | bundle_main_box_path | estimated |
| order_tuck_end_full_bundle | 2750.00 | 2742.67 | 5500.00 | 5472.79 | -27.21 | -0.49% | bundle_main_box_path | estimated |

## Guardrails

1. leaflet_standard_quoted: accepted，worst gap 0.24%。
2. leaflet_general_estimated: accepted，worst gap -0.15%。
3. bundle_main_box_path keep entries: all_keep。

## Decision

1. 当前说明书 residual 已从 setup-fee 主导，收敛到 close-band 内的小幅余差。
2. generic print handling 仍保持 estimated 边界，没有被误放宽。
3. order-level 余差当前重新回到 main_box_path source，不再由 leaflet_setup_fee 主导。