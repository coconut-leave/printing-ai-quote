# Pricing Parity Closure Review

这份文档只回答一件事：在 **当前 active quoted scope** 已经冻结的前提下，系统离“同参数 -> 接近 Excel/workbook 价格”还差多少。

本轮不继续扩新模板，不继续扩 quoted path，不继续打 coverage blocker，也不继续做长尾复杂路径。

## 一、范围冻结

当前主线固定为 **scope freeze + parity closure**。

这轮明确不做：

- 不扩新模板。
- 不继续放开新的 quoted path。
- 不继续推进 printed/custom foil_bag、printed carton_packaging 的更宽 coverage。
- 不继续推进模板外结构、复杂礼盒、复杂外箱、文件/刀线图驱动案例。
- 不顺手改 trial scope 或 accepted scope。

当前只看已经在 active quoted scope 内的路径。

### 当前 active quoted item scope

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
12. simple carton_packaging
13. standard printed carton_packaging

### 当前 active quoted bundle scope

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

## 二、当前 active quoted scope 已经做到什么程度

当前 active quoted scope 的 parity 主体已经收敛到 close band 内。

按现有 workbook calibration、order alignment、acceptance gate 与 readiness evidence 来看：

1. 当前 quoted acceptance gates 没有 active quoted scope 内的 blocked gate。
2. 当前 quoted bundle 的 order-level 代表样本仍维持在 close band。
3. 当前没有证据表明 active quoted scope 内存在明显系统性高报或低报。
4. 当前主问题已经不是“能不能继续放开更多路径”，而是“要不要继续花同样成本追已经在 close band 里的微小残差”。

结论很明确：

**当前 active quoted scope 已经足够接近“同参数 -> 接近 Excel 价格”。**

## 三、哪些路径已经稳定 close

这些路径当前可以视为 stable close：

1. 标准 tuck_end_box
2. 已验证 mailer_box
3. window_box 标准 gloss-film 路径
4. 标准 leaflet_insert
5. 标准 box_insert（显式克重）
6. blank foil_bag
7. simple carton_packaging
8. standard printed carton_packaging
9. 标准主盒 + 标准说明书
10. 标准双插盒 + 标准内托
11. 已验证飞机盒 + 标准内托
12. blank foil_bag + simple carton_packaging

这些路径的共同点：

1. 已有 workbook calibration 或 controlled acceptance 锚点。
2. 当前 acceptance 证据已经接受它们作为 quoted path。
3. 现有 residual 已经不再构成继续深挖的主理由。

## 四、哪些路径还没有做到“稳定 close”，但当前仍可接受

这些路径当前属于 **acceptable but watch**，不是不准 quote，而是不能外推：

1. window_box 标准 no-film gloss 路径
2. generic leaflet（高频标准化）
3. proxy box_insert（高频标准化）
4. 标准 seal_sticker
5. standard printed foil_bag
6. 标准双插盒 + 高频 generic 说明书
7. 标准双插盒 + 高频 proxy 内托
8. 已验证飞机盒 + 高频 proxy 内托
9. 标准主盒 / 已验证飞机盒 + 标准说明书 + 标准贴纸
10. 标准主盒 / 已验证飞机盒 + 标准内托 + 标准说明书
11. 标准主盒 / 已验证飞机盒 + 标准内托 + 标准贴纸
12. 标准主盒 / 已验证飞机盒 + 标准说明书 + simple carton_packaging

这些路径当前已 accepted，但仍带 generic / proxy / printed / no-film / 多配件窄白名单信号。

这里的正确动作不是继续放开，而是：

**继续把它们当作 frozen quoted scope 内的可用路径观察，不外推。**

## 五、哪些路径当前还不能稳定接近 Excel

在 **当前 active quoted scope 内部**，目前没有需要立刻打回 quoted 的“不稳定路径”。

也就是说：

1. 当前没有 active quoted scope 内的 blocked parity path。
2. 当前“不稳定”的主要问题已经移到 active quoted scope 外的 wider estimated / handoff 边界。
3. 这些 scope 外问题不应该再反向拉动本轮主线。

## 六、哪些路径是 component close，但 order-level 仍有残差

当前最典型的几类是：

1. 标准主盒 + simple carton_packaging
2. blank foil_bag + simple carton_packaging
3. 标准主盒 / 已验证飞机盒 + 标准说明书 + simple carton_packaging

它们的问题不是 component 算不准，而是 order-level 仍有轻微 residual。

但这类 residual 当前仍在 close band 内，所以结论不是“要立刻继续调”，而是：

**保留为已收口但需观察的 order-level residual。**

## 七、当前 Top 3 误差源是什么

本轮只看 active quoted scope 内。

### 1. carton_outer_carton_rate

影响路径：

1. simple carton_packaging
2. 标准主盒 + simple carton_packaging
3. blank foil_bag + simple carton_packaging
4. 标准主盒 / 已验证飞机盒 + 标准说明书 + simple carton_packaging

为什么排第一：

1. 它直接影响整单总价。
2. 它不是长尾复杂结构，而是当前 active quoted scope 里的真实订单型附加项。
3. 它会在多个 quoted bundle 里重复出现。

### 2. sticker_processing

影响路径：

1. 标准 seal_sticker
2. 标准主盒 / 已验证飞机盒 + 标准说明书 + 标准贴纸
3. 标准主盒 / 已验证飞机盒 + 标准内托 + 标准贴纸

为什么排第二：

1. 这是当前 quoted scope 内最明显的组件层残差源。
2. 它会传导到带 sticker 的 bundle。
3. 它已经 close，但仍是 active quoted scope 里最值得继续盯住的 accessory 波动点。

### 3. bundle_main_box_path

影响路径：

1. 标准主盒 + 标准说明书
2. 标准双插盒 + 标准内托
3. 标准双插盒 + 高频 generic 说明书
4. 标准双插盒 + 高频 proxy 内托

为什么排第三：

1. 它不是最大的单点误差，但覆盖面最广。
2. 它会在多个高价值主盒 bundle 中重复出现。
3. 当前 bundle-specific drift 已经被证实不是主因，剩余 residual 更像主盒基线路径的统一轻微继承。

## 八、这轮要不要继续改 pricing 代码

当前结论：

**这轮不建议继续改 pricing 公式。**

原因是：

1. 当前 active quoted scope 已经满足 close / accepted 证据。
2. 这 3 个 gap source 都还没有达到“值得继续动公式”的程度。
3. 如果现在继续手工追这些微差，更大概率是在破坏 frozen scope 的稳定性，而不是显著提升 parity。

允许的未来动作只有一种：

如果真实 trial 数据显示这 3 个误差源出现连续、同向、系统性的高报或低报，再做 **定向 calibration**，但不能借机扩 quoted scope。

## 九、停止条件是什么

当前 active quoted scope 可视为“足够收口”的条件：

1. 高价值 quoted path 大多数维持 close。
2. 主要 quoted bundle 的 order-level 样本维持 close / acceptable。
3. 没有明显系统性高报或低报。
4. 当前 residual 继续投入同等开发成本已经不划算。

按当前证据，这 4 条已经满足。

重新开 calibration 的条件不是“我还看得到一点 residual”，而是：

**未来 10+ 连续真实 quoted 订单在同一误差源上出现同向漂移。**

在这之前，当前 active quoted scope 已经可以视为 parity closure 完成。

## 十、客服回复链路当前是否还是主攻方向

当前不是主攻方向。

本轮 parity 审计没有发现新的客服回复链路 P0/P1 阻塞；如果后续出现真实试运行问题，再单独开问题单，不应继续挤占当前报价 parity 主线。