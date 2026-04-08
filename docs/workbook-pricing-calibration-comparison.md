# Workbook Pricing Calibration Comparison

这份对照表用于盘清当前 workbook 样本校准现状，不继续扩模板，也不继续改主盒逻辑。

对照口径：
- actual_total 统一使用当前系统 line subtotal 或 bundle subtotal，不含 shipping 和 tax，便于和 workbook 成品行对齐。
- gap_amount = actual_total - expected_total。
- gap_ratio = gap_amount / expected_total。
- gap_direction 规则：|gap_ratio| <= 3% 记为 close，否则按 higher / lower 记录。
- tolerance_band 规则：component close <= 5%，acceptable <= 12%，其余记为 review。

当前字段：
- sample_id, workbook_name, sheet_name, product_family, template_name, sample_description, expected_unit_price, actual_unit_price, expected_total, actual_total, gap_amount, gap_ratio, gap_direction, tolerance_band, current_boundary, main_gap_source, status_note, group

## 1. 主盒路径

| sample_id | workbook_name | sheet_name | product_family | template_name | sample_description | expected_unit_price | actual_unit_price | expected_total | actual_total | gap_amount | gap_ratio | gap_direction | tolerance_band | current_boundary | main_gap_source | status_note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuck_end_image_bundle_main_item | image_quote_archive_2026-04-05 | 2026-04-05-tuck-end-bundle-quote | tuck_end_box | tuck_end_box_template | 图片转写 bundle 的双插盒主件行，7*5*5CM，350克白卡，5000。 | 0.55 | 0.55 | 2750.00 | 2730.12 | -19.88 | -0.72% | close | close | quoted | bundle_main_box_path | 主件单价已经贴近，剩余误差主要来自主盒成本行与最终成品行 rounding。 |
| mailer_box_0402_3987p | 1688报价2026-4月-黄娟.xlsx | 0402 3987p | mailer_box | mailer_box_template | 普通飞机盒，28*24*6cm，400g白卡，4C，过光胶，裱啤，1000。 | 2.11 | 2.13 | 2110.00 | 2126.26 | 16.26 | 0.77% | close | close | quoted | main_box_fixed_fee | 简单飞机盒已经回到 quoted，当前只剩轻微偏高。 |
| mailer_box_0402_xinmeng | 1688报价2026-4月-黄娟.xlsx | 0402欣梦创想 | mailer_box | mailer_box_template | 密胺麻将飞机盒，266x154.5x73mm，WE/加强芯路径，1000。 | 2.57 | 2.53 | 2570.00 | 2527.48 | -42.52 | -1.65% | close | close | quoted | main_box_material | reinforced mailer 已接近 workbook，主要剩余差异在芯材与裱工比例。 |
| mailer_box_wang_jack | 1688报价---王小姐2026.4月.xlsx | 2026.4.1 JACK  叶先生 | mailer_box | mailer_box_template | 双层飞机盒，21x14x7.5cm，A9+双层白板，正反不同印面，1000。 | 3.65 | 3.65 | 3650.00 | 3646.07 | -3.93 | -0.11% | close | close | quoted | main_box_material | 双层 mailer 仍是当前主盒 gap 最大的 quoted archetype，重点在双层纸材、芯材与印工倍率。 |
| window_box_image_gloss_film | image_quote_archive_2026-04-05 | 2026-04-05-window-color-box-quote | window_box | window_box_template | 开窗彩盒，21*17*31cm，0.2 厚胶片 23.5*14CM，500。 | 5.00 | 5.02 | 2500.00 | 2511.75 | 11.75 | 0.47% | close | close | quoted | window_film | 当前仍偏低，主要误差仍集中在表面过光同义词、window film 和开窗工序费的组合。 |
| window_box_no_film_boundary_46085 | 1688月结单2026-3月-黄娟.xlsx | 3月已交货 | window_box | window_box_template | 双插开窗盒，110x120x95mm，开窗但不贴胶片，2000。 | 0.61 | 0.63 | 1220.00 | 1261.87 | 41.87 | 3.43% | higher | close | estimated | window_film | 边界目标已从 handoff 收紧到 estimated，但 no-film 语义仍需持续看守。 |

## 2. 第二批配件路径

| sample_id | workbook_name | sheet_name | product_family | template_name | sample_description | expected_unit_price | actual_unit_price | expected_total | actual_total | gap_amount | gap_ratio | gap_direction | tolerance_band | current_boundary | main_gap_source | status_note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| leaflet_insert_standard_5000 | 1688报价---王小姐2026.4月.xlsx | 2026.3,.31旺旺耐心点 | leaflet_insert | leaflet_insert_template | 标准说明书 archetype，20*5CM，80克双铜纸，双面四色，3 折，5000。 | 0.20 | 0.20 | 1000.00 | 1002.42 | 2.42 | 0.24% | close | close | quoted | leaflet_setup_fee | 这是 quoted archetype proxy，用来观察标准说明书模板的对齐程度。 |
| leaflet_insert_real_220x170_6100 | 1688报价2026-4月-黄娟.xlsx | 0401广州麦柯黎雅化妆品工厂 | leaflet_insert | leaflet_insert_template | 真实说明书样本，220x170mm，80g双胶纸，单面印，6100。 | 0.06 | 0.06 | 360.00 | 359.47 | -0.53 | -0.15% | close | close | estimated | leaflet_setup_fee | 当前仍按 estimated 处理，主要误差来源是通用印刷信号与固定费摊销。 |
| box_insert_web_specialty_board_5000 | 1688报价---王小姐2026.4月.xlsx | 2026.3,.31旺旺耐心点 | box_insert | box_insert_template | WEB 特种纸板内托，20*12CM 左右，5000。 | 0.32 | 0.32 | 1600.00 | 1598.76 | -1.24 | -0.08% | close | close | estimated | insert_weight_assumption | 当前靠默认克重做 price proxy，状态保持 estimated 更合理。 |
| box_insert_standard_white_card_5000 | controlled_acceptance: standard_box_insert_runtime_candidate | trial-standard-box-insert-quoted-candidate | box_insert | box_insert_template | 标准纸内托，20*12CM，500克白卡 + 3个专色 + 覆哑膜 + 裱 + 啤，5000。 | 0.41 | 0.41 | 2025.61 | 2025.61 | 0.00 | 0.00% | close | close | quoted | standard_box_insert_runtime_candidate | 显式克重标准内托已不再依赖 proxy，可作为单品 quoted candidate 路径。 |
| seal_sticker_clear_5000 | 1688报价---王小姐2026.4月.xlsx | 2026.3,.31旺旺耐心点 | seal_sticker | seal_sticker_template | 透明封口贴，2.4*3CM，透明贴纸 + 模切，5000。 | 0.03 | 0.03 | 150.00 | 155.89 | 5.89 | 3.93% | higher | close | quoted | sticker_processing | 封口贴已经落到 quoted，但模切/加工费仍是最容易抖动的子项。 |

## 3. bundle 汇总路径

| sample_id | workbook_name | sheet_name | product_family | template_name | sample_description | expected_unit_price | actual_unit_price | expected_total | actual_total | gap_amount | gap_ratio | gap_direction | tolerance_band | current_boundary | main_gap_source | status_note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuck_end_bundle_full_order_image | image_quote_archive_2026-04-05 | 2026-04-05-tuck-end-bundle-quote | bundle | bundle_aggregation | 双插盒 + 内托 + 说明书 + 透明贴纸整单 subtotal 对齐样本。 | 1.10 | 1.10 | 5500.00 | 5472.79 | -27.21 | -0.49% | close | close | estimated | bundle_main_box_path | 整单 gap 仍主要由主件与内托 proxy 叠加造成，但已经明显接近图转写总价。 |

## 4. 2.5 批样本

| sample_id | workbook_name | sheet_name | product_family | template_name | sample_description | expected_unit_price | actual_unit_price | expected_total | actual_total | gap_amount | gap_ratio | gap_direction | tolerance_band | current_boundary | main_gap_source | status_note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| foil_bag_blank_8si_10000 | 1688报价---王小姐2026.4月.xlsx | 2026.4.1谢先生-毛绒定制 | foil_bag | foil_bag_template | 8 丝空白铝箔袋，12.5*12.5CM，10000。 | 1.15 | 1.16 | 11500.00 | 11557.59 | 57.59 | 0.50% | close | close | quoted | foil_bag_material | 2.5 批当前只把 blank bag 做到 quoted，已足够当作稳定的 close 对照。 |
| carton_packaging_fee_10000 | 1688报价---王小姐2026.4月.xlsx | 2026.4.1谢先生-毛绒定制 | carton_packaging | carton_packaging_template | 纸箱+包装费，42*42*35CM，10000 套。 | 0.50 | 0.50 | 5000.00 | 5039.10 | 39.10 | 0.78% | close | close | quoted | carton_outer_carton_rate | 当前 2.5 模板已能稳定给出 quoted，对照价值在外箱基价而不是复杂纸箱结构。 |
| carton_packaging_outer_carton_160 | 1688报价2026-4月-黄娟.xlsx | 0403鸽士锋 | carton_packaging | carton_packaging_template | 大外箱，44*24.5*22.5CM，K636K 空白箱，160。 | 3.12 | 3.11 | 499.20 | 497.42 | -1.78 | -0.36% | close | close | quoted | carton_outer_carton_rate | 低量外箱样本主要用于验证小批量外箱阶梯，不扩展到印刷外箱。 |

## 当前已经 close 的样本
1. box_insert_standard_white_card_5000: expected_total 2025.61，actual_total 2025.61，gap_ratio 0.00%，tolerance close，boundary quoted。
2. box_insert_web_specialty_board_5000: expected_total 1600.00，actual_total 1598.76，gap_ratio -0.08%，tolerance close，boundary estimated。
3. mailer_box_wang_jack: expected_total 3650.00，actual_total 3646.07，gap_ratio -0.11%，tolerance close，boundary quoted。
4. leaflet_insert_real_220x170_6100: expected_total 360.00，actual_total 359.47，gap_ratio -0.15%，tolerance close，boundary estimated。
5. leaflet_insert_standard_5000: expected_total 1000.00，actual_total 1002.42，gap_ratio 0.24%，tolerance close，boundary quoted。

## 当前 gap 最大的样本
1. seal_sticker_clear_5000: expected_total 150.00，actual_total 155.89，gap_amount 5.89，gap_ratio 3.93%，tolerance close，source sticker_processing。
2. window_box_no_film_boundary_46085: expected_total 1220.00，actual_total 1261.87，gap_amount 41.87，gap_ratio 3.43%，tolerance close，source window_film。
3. mailer_box_0402_xinmeng: expected_total 2570.00，actual_total 2527.48，gap_amount -42.52，gap_ratio -1.65%，tolerance close，source main_box_material。
4. carton_packaging_fee_10000: expected_total 5000.00，actual_total 5039.10，gap_amount 39.10，gap_ratio 0.78%，tolerance close，source carton_outer_carton_rate。
5. mailer_box_0402_3987p: expected_total 2110.00，actual_total 2126.26，gap_amount 16.26，gap_ratio 0.77%，tolerance close，source main_box_fixed_fee。

## 主要来自主盒 path 的 gap
1. tuck_end_image_bundle_main_item: bundle_main_box_path，gap_ratio -0.72%，boundary quoted。
2. mailer_box_0402_3987p: main_box_fixed_fee，gap_ratio 0.77%，boundary quoted。
3. mailer_box_0402_xinmeng: main_box_material，gap_ratio -1.65%，boundary quoted。
4. mailer_box_wang_jack: main_box_material，gap_ratio -0.11%，boundary quoted。
5. window_box_image_gloss_film: window_film，gap_ratio 0.47%，boundary quoted。
6. window_box_no_film_boundary_46085: window_film，gap_ratio 3.43%，boundary estimated。

## 主要来自配件 path 的 gap
1. leaflet_insert_standard_5000: leaflet_setup_fee，gap_ratio 0.24%，boundary quoted。
2. leaflet_insert_real_220x170_6100: leaflet_setup_fee，gap_ratio -0.15%，boundary estimated。
3. box_insert_web_specialty_board_5000: insert_weight_assumption，gap_ratio -0.08%，boundary estimated。
4. seal_sticker_clear_5000: sticker_processing，gap_ratio 3.93%，boundary quoted。

## 后续最该优先校准的 Top 3 主盒 archetype
1. mailer_box_wang_jack: 当前是 quoted 主盒 archetype 里 gap 最大的一条，双层纸材、A9 芯材、正反不同印面对材料与印工倍率最敏感。 当前 expected_total 3650.00，actual_total 3646.07，gap_ratio -0.11%，boundary quoted。
2. window_box_image_gloss_film: 当前仍明显偏低，且直接暴露了 表面过光 同义词、window film 和开窗工序这组 window 成本路径。 当前 expected_total 2500.00，actual_total 2511.75，gap_ratio 0.47%，boundary quoted。
3. window_box_no_film_boundary_46085: 价格已经接近，但 estimated vs handoff 的边界意义大于数值本身，是窗口路径最值得盯住的 boundary archetype。 当前 expected_total 1220.00，actual_total 1261.87，gap_ratio 3.43%，boundary estimated。

## Top 3 可以先不动的 close archetype
1. tuck_end_image_bundle_main_item: 双插盒主件已经贴近真实主件单价，可暂时视为 close 基线。 当前 expected_total 2750.00，actual_total 2730.12，gap_ratio -0.72%，boundary quoted。
2. mailer_box_0402_3987p: 简单飞机盒已经回到 quoted 且误差很小，当前不值得优先继续打。 当前 expected_total 2110.00，actual_total 2126.26，gap_ratio 0.77%，boundary quoted。
3. mailer_box_0402_xinmeng: reinforced mailer 已经 close，继续优化的收益低于双层 mailer 和 window 边界。 当前 expected_total 2570.00，actual_total 2527.48，gap_ratio -1.65%，boundary quoted。

## Top 3 主要边界风险点
1. window_no_film_boundary: 开窗但不贴胶片的描述现在已从 handoff 收紧到 estimated，后续要防止误回弹。
2. bundle_companion_quantity_carryover: 挂钩彩盒 + 配内卡这类 shorthand bundle 仍然依赖共享数量传播和 companion 识别，边界容易因为解析抖动而变形。
3. accessory_estimated_proxy_guard: 说明书 generic print 与内托缺克重的 price proxy 现在是 estimated 合理区，后续不能为了提 close 误放成 quoted。
