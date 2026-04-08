# Workbook Next Calibration Candidates

这份候选列表只基于当前已有的 workbook calibration、order alignment 与 acceptance gate 证据排序，没有扩样本池，也没有继续下钻新 workbook 行。

当前证据足够给出一版谨慎排序，但它仍然只是下一轮候选清单，不是自动批准继续调价的结论。

| rank | target | suspected_source | expected_benefit | risk |
| --- | --- | --- | --- | --- |
| 1 | leaflet_setup_fee cluster | 说明书 fixed-fee 摊销与 generic print 口径仍偏高，集中体现在 `leaflet_insert_real_220x170_6100` 与 `leaflet_insert_standard_5000` | 一次调整有机会同时压缩说明书组件 residual，并继续改善 `order_tuck_end_plus_leaflet` / `order_tuck_end_full_bundle` 的 accessory subtotal | 风险是打坏 `leaflet_standard_quoted` 已接受 gate，或把 `leaflet_general_estimated` 误推向过度乐观 |
| 2 | sticker_processing cluster | 5000 档贴纸的 plate/process 组合仍是最明显的 quoted accessory 抖动源，集中体现在 `seal_sticker_clear_5000` | 预期收益比较直接，既能改善单组件 quoted path，也能继续收敛 `order_tuck_end_plus_sticker` 的 order residual | 风险是小批量或非标准贴纸会被一起带动，导致当前 close gate 反向过冲 |
| 3 | window_box_no_film_boundary_46085 | `window_film` 的 no-film 语义路径仍偏保守，当前更像边界校准问题而不是普通数值微调 | 预期收益主要在 estimated boundary 稳定性，能减少 no-film 开窗样本的语义摇摆并提升主盒边界一致性 | 风险最高，稍有过调就可能把 no-film 样本误放成 quoted，或虚构出本不该存在的 film line-item |

## Evidence Notes

1. `leaflet_setup_fee` 是当前唯一同时出现在 component residual 与 order residual 里的重复来源，边际收益最大。
2. `sticker_processing` 仍然是标准 quoted 贴纸路径里最清晰、最局部的可解释残余源。
3. `window_box_no_film_boundary_46085` 的数值已经在 close band 内，但它仍然是当前最值得看的边界型主盒样本。