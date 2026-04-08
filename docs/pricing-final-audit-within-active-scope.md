# Active Quoted Scope Final Pricing Audit

这份文档只回答一个问题：

在当前 active quoted scope 内，给出与 Excel/workbook 相同或等价参数时，系统现在到底能不能稳定报出足够接近的价格。

这轮不扩模板，不扩 quoted path，不扩 coverage，不做交付层优化。

## 一、当前 active quoted scope 已经做到什么程度

当前结论很明确：

**当前 active quoted scope 已经足够接近 Excel/workbook，可以进入报价层 stop rule。**

理由不是一句抽象的“看起来差不多”，而是当前 evidence 同时满足：

1. active quoted scope 内的 quoted acceptance gate 当前没有 blocked 项。
2. quoted gate 级最差样本仍保持 close，没有落到 review band。
3. quoted bundle 的 order-level 主样本仍保持 close，没有出现需要从 quoted 打回 estimated 的主样本。
4. 当前 top residual source 仍存在，但还没有出现统一方向的系统性高报或低报。

所以这轮更像 final pricing audit，而不是继续微调 pricing 公式。

## 二、哪些路径已经稳定 close

这些路径现在可以放心说“同参数 -> 接近 Excel”：

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

这些路径的共同点是：

1. 已有 workbook calibration 或 controlled acceptance 锚点。
2. 当前 quoted gate 级最差样本仍在 close band。
3. 没有 active quoted scope 内的 rollback 证据要求继续改公式。

## 三、哪些 quoted 路径还不够让我完全放心

这些路径当前仍在 quoted scope 内，但我不会把它们描述成“完全等价复制 Excel”：

1. window_box 标准 no-film gloss 路径
2. generic leaflet（高频标准化）
3. proxy box_insert（高频标准化）
4. 标准 seal_sticker
5. standard printed foil_bag
6. 标准主盒 + 标准贴纸
7. 标准主盒 + simple carton_packaging
8. 标准主盒 / 已验证飞机盒 + 标准说明书 + 标准贴纸
9. 标准主盒 / 已验证飞机盒 + 标准内托 + 标准贴纸
10. 标准主盒 / 已验证飞机盒 + 标准说明书 + simple carton_packaging

不是因为这些路径现在不 close，而是因为它们仍带以下风险：

1. 公式或路径仍带代理色彩，例如 generic / proxy / no-film / printed 的窄白名单语义。
2. 部分固定费或梯度仍是标准化近似，而不是逐行 workbook copy。
3. 某些 bundle 主件或 accessory 残差会重复出现，但当前还没有严重到要打回 quoted。

## 四、哪些路径是 component-level close，但 order-level 仍有残差

当前最典型的是：

1. 标准主盒 + simple carton_packaging
2. blank foil_bag + simple carton_packaging
3. 标准主盒 / 已验证飞机盒 + 标准说明书 + simple carton_packaging

这里的含义不是 component 算错，而是：

1. 组件层当前已经 close。
2. order-level 仍能看到轻微 residual。
3. residual 主要集中在 carton add-on 与整单汇总层，而不是主件计算骨架本身被打坏。

## 五、当前 Top 3 残余误差源

这轮只看 active quoted scope 内。

### 1. carton_outer_carton_rate

影响路径：

1. simple carton_packaging
2. 标准主盒 + simple carton_packaging
3. blank foil_bag + simple carton_packaging
4. 标准主盒 / 已验证飞机盒 + 标准说明书 + simple carton_packaging

为什么重要：

1. 它直接影响 quoted scope 内的 carton add-on 总价。
2. 它会在单品和 bundle 两层重复出现。
3. 它是现在最典型的 order-level residual 传播源。

### 2. sticker_processing

影响路径：

1. 标准 seal_sticker
2. 标准主盒 + 标准贴纸
3. 标准主盒 / 已验证飞机盒 + 标准说明书 + 标准贴纸
4. 标准主盒 / 已验证飞机盒 + 标准内托 + 标准贴纸

为什么重要：

1. 它是当前 accessory 残差里最清晰的一层。
2. 它会把 residual 传导到带 sticker 的 quoted bundle。
3. 当前 still close，但它是 quoted accessory 中最需要继续 watch 的点。

### 3. bundle_main_box_path

影响路径：

1. 标准主盒 + 标准说明书
2. 标准双插盒 + 标准内托
3. 标准双插盒 + 高频 generic 说明书
4. 标准双插盒 + 高频 proxy 内托

为什么重要：

1. 它不是单点最大 gap，但覆盖高价值 bundle 最广。
2. 它决定了主盒基线 residual 是否会在 bundle 中重复继承。
3. 当前 evidence 更像主盒基线轻微 residual，而不是 bundle aggregation 把主件重新打坏。

## 六、这轮要不要继续改 pricing 代码

当前结论：

**不要。**

原因很直接：

1. active quoted scope 内当前已经可以明确说“同参数 -> 接近 Excel”。
2. top 3 residual source 当前都还在 close band 观察区，不是必须继续动公式的 blocker。
3. 继续追 close-band 微差的收益，已经低于引入回归风险的成本。

所以这轮不继续做 quoted scope 内的定向 calibration 代码修改。

## 七、这轮是否只做了 quoted scope 内的定向审计，没有扩范围

是。

这轮只做了：

1. 重新审计当前 active quoted scope 的 Excel 一致性。
2. 明确 stable close / close but watch / order residual 的路径分层。
3. 明确 Top 3 residual source。
4. 正式给出 stop rule。

这轮没有做：

1. 不扩新模板。
2. 不扩新的 quoted path。
3. 不扩 coverage。
4. 不继续做交付层优化。

## 八、现在到底能不能说“同参数下接近 Excel”

**可以说。**

但要精确表达成两层：

1. 对当前 stable close 路径，可以放心说“同参数 -> 接近 Excel”。
2. 对当前 close but watch 路径，可以说“现在已经 close，但仍带代理语义或残差，需要继续 watch，不能把它说成全范围等价 Excel”。

不该说的话是：

1. 不能把 generic / proxy / no-film / printed 的窄白名单路径说成“完全无代理色彩”。
2. 不能把 carton add-on 相关 bundle 说成“order-level 已完全无残差”。
3. 不能把当前 close 结论外推到 quoted scope 之外的 wider coverage。

## 九、本轮 stop rule 是什么

当前 quoted scope 已经足够收口的条件是：

1. active quoted scope 的高价值路径大多数达到 close。
2. order-level 主样本达到 close / acceptable，且没有 review band。
3. 没有明显系统性高报或低报。
4. 继续投入同等开发成本的收益已经很低。

按当前 evidence，这 4 条已经满足。

重新回到报价层 calibration 的条件只有一个：

**未来 10+ 连续真实 quoted 订单在同一误差源上出现同向漂移。**

在这之前，当前报价层 calibration 应视为停止。

## 十、现在是否应该停止报价层校准，转去做交付层

应该。

不是因为报价已经 general-use，而是因为：

1. 当前 active quoted scope 已经达到“足够接近 Excel”的 stop rule。
2. 再继续打 close-band 微差的收益很低。
3. 后续更高价值的工作应该是把已经够稳的 quoted scope 用到真实业务流里，而不是继续为微小 residual 开发。

## 十一、改完后我应该如何复测

按下面顺序复测：

1. 跑 workbook calibration comparison，确认 active quoted component 样本仍全部维持 close。
2. 跑 workbook order alignment review，确认 quoted bundle 的 order-level 主样本仍维持 close。
3. 跑 pricing acceptance gate，确认 active quoted gate 仍全部 accepted，没有 blocked。
4. 重点抽查 carton_outer_carton_rate、sticker_processing、bundle_main_box_path 三类样本，确认没有出现新的同向系统性漂移。