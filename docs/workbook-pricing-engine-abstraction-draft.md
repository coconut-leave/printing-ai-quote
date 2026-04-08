# Workbook Pricing Engine Abstraction Draft

本文档补充 complex packaging 技术草案，但只定义 workbook 驱动的报价引擎抽象层，不改 live phase-one 运行路径。

对应 draft 常量文件：

- `src/server/pricing/workbookPricingEngineDraft.ts`

## 1. Workbook 证据

这轮抽象不是凭空泛化，而是直接按已上传 workbook 的结构收口。

### 1.1 关键列结构

在 `1688报价2026-4月-黄娟.xlsx` 的以下 sheet 中，可以看到统一的 line-item 列结构：

- `0401广州麦柯黎雅化妆品工厂`
- `0401江苏维凯`
- `0402欣梦创想`
- `0402鸽士锋`
- `0402 3987p`

这些 sheet 的 line-item 表头基本都是：

- 项目
- 材质
- 基数
- 长
- 宽
- 吨价
- 数量(+抛纸)
- 金额
- 单价
- 实际数量

这和这次要求保留的核心字段是一一对应的：

- `actual_quantity` 对应 `实际数量`
- `charge_quantity` 对应 `数量(+抛纸)`
- `basis_weight` / `basis_factor` 对应 `基数`
- `flat_length` 对应 `长`
- `flat_width` 对应 `宽`
- `ton_price` / `area_unit_price` / `fixed_amount` / `unit_price` 对应 `吨价`

### 1.2 Workbook 中已出现的 line-item 证据

从实际 sheet 可见，当前首批可稳定抽象的 line-item 已经明确出现：

- 面纸
- 坑纸 / 芯纸 / 加强芯
- 哑胶 / 光胶
- 裱坑/纸
- 印刷费
- 刀模
- 啤机
- 粘盒
- 胶片 / APET
- 纸箱 / 纸箱+包装费

同时还能看到 workbook 里已经有汇总乘数：

- `报价*1.2倍`
- `含税含运*1.15`

所以这次抽象不再把 markup 和 tax 当作口头规则，而是明确纳入模板层。

## 2. 产品族模板

首批模板 ID 固定为：

- `tuck_end_box_template`
- `folding_carton_template`
- `mailer_box_template`
- `window_box_template`
- `leaflet_insert_template`
- `box_insert_template`
- `seal_sticker_template`

其中 workbook 对应关系如下：

### 2.1 `tuck_end_box_template`

对应证据：

- `1688报价---王小姐2026.4月.xlsx` / `2026.3,.31旺旺耐心点` / 双插盒
- `1688报价2026-4月-黄娟.xlsx` / `0401广州麦柯黎雅化妆品工厂` / 中盒、彩盒

### 2.2 `folding_carton_template`

对应证据：

- `1688报价---王小姐2026.4月.xlsx` / `2026.4.1谢先生-毛绒定制` / 彩盒
- `1688报价2026-4月-黄娟.xlsx` / `0403鸽士锋` / 挂钩彩盒、内彩盒

### 2.3 `mailer_box_template`

对应证据：

- `1688报价---王小姐2026.4月.xlsx` / `2026.4.1 JACK  叶先生` / 飞机盒
- `1688报价2026-4月-黄娟.xlsx` / `0401江苏维凯` / Dexas飞机彩盒
- `1688报价2026-4月-黄娟.xlsx` / `0402欣梦创想` / 密胺麻将飞机盒

### 2.4 `window_box_template`

对应证据：

- `1688报价---王小姐2026.4月.xlsx` / `2026..4.2黄小姐-毛绒定制` / 开窗彩盒
- `1688报价2026-4月-黄娟.xlsx` / `0402鸽士锋` / 挂钩彩盒 + 胶片0.2APET10x10cm

### 2.5 `leaflet_insert_template`

对应证据：

- `1688报价---王小姐2026.4月.xlsx` / `2026.3,.31旺旺耐心点` / 说明书
- `1688报价2026-4月-黄娟.xlsx` / `0401广州麦柯黎雅化妆品工厂` / 说明书

### 2.6 `box_insert_template`

对应证据：

- `1688报价---王小姐2026.4月.xlsx` / `2026.3,.31旺旺耐心点` / 内托
- `1688报价2026-4月-黄娟.xlsx` / `0401广州麦柯黎雅化妆品工厂` / 纸内托

### 2.7 `seal_sticker_template`

对应证据：

- `1688报价---王小姐2026.4月.xlsx` / `2026.3,.31旺旺耐心点` / 透明贴纸

## 3. 通用 line-item 类型

本轮草案固定通用 line-item 类型为：

- `ton_price_material`
- `area_based_material`
- `fixed_fee`
- `quantity_based_process`
- `subtotal`
- `quote_markup`
- `tax_markup`

为什么这样拆：

- workbook 的材料行明显分成两类：吨价材料型和面积计费型
- 刀模、运费这类更适合作为固定费
- 印刷费、啤机、粘盒、贴双面胶这类更接近数量型后道
- 汇总、报价倍率、税倍率在 workbook 中是单独的总结层，不应混进材料或工艺 line-item

## 4. 通用公式模板

公式模板按你指定的结构固定如下：

### 4.1 `ton_price_material`

`amount = basis_weight * length * width * ton_price * charge_quantity / 10000000000`

### 4.2 `area_based_material`

`amount = basis_factor * (length / 2.54) * (width / 2.54) * area_unit_price * charge_quantity / 1000`

### 4.3 `fixed_fee`

`amount = fixed_amount`

### 4.4 `quantity_based_process`

`amount = unit_price * charge_quantity`

### 4.5 `line_unit_price`

`unit_price = amount / actual_quantity`

### 4.6 `subtotal`

`cost_subtotal = sum(line_item.amount)`

### 4.7 `quote_markup`

`quoted_amount = cost_subtotal * quote_markup`

运行时保留 `markup_rate` 字段，派生：

- `quote_markup = 1 + markup_rate`

### 4.8 `tax_markup`

`final_amount = quoted_amount * tax_multiplier`

运行时保留 `tax_rate` 字段，派生：

- `tax_multiplier = 1 + tax_rate`

## 5. 必须保留的字段

抽象层固定保留这些字段：

- `actual_quantity`
- `charge_quantity`
- `basis_weight`
- `basis_factor`
- `flat_length`
- `flat_width`
- `ton_price`
- `area_unit_price`
- `fixed_amount`
- `unit_price`
- `markup_rate`
- `tax_rate`

说明：

- `基数` 在材料类 line-item 上可以解释为 `basis_weight`
- `基数` 在覆膜、胶片等面积类 line-item 上可以解释为 `basis_factor`
- `吨价` 这一列在 workbook 中实际上既可能装吨价，也可能装面积单价、固定金额、数量单价，所以草案保留四类数值字段，而不是强行统一成单一字段

## 6. 当前首批必须覆盖的 line-items

### 6.1 双插盒 / 彩盒

- 面纸
- 芯材/加强芯
- 覆膜
- 裱纸
- 印刷费
- 刀模
- 啤机
- 粘盒
- 特殊工艺
- 运费
- 纸箱

### 6.2 飞机盒

- 外层纸材
- 内层纸材（如存在）
- 芯材/加强芯
- 覆膜
- 裱纸
- 印刷费
- 刀模
- 啤机
- 粘盒/成型
- 运费
- 纸箱

### 6.3 开窗彩盒

- 主纸材
- 覆膜
- 裱纸
- 印刷费
- 刀模
- 啤机
- 粘盒
- 胶片
- 开窗相关工艺
- 运费
- 纸箱

## 7. `estimated / quoted / handoff_required` 边界

核心原则固定为：

- 如果关键 line-items 无法确定，就不能 quoted。

具体落法：

### 7.1 `quoted`

只有在选中的产品模板里，`quotedRequiredLineItems` 全部确定后，才允许 `quoted`。

例如：

- 双插盒至少要确定：面纸、印刷费、刀模、啤机、粘盒
- 开窗彩盒至少要确定：主纸材、印刷费、刀模、啤机、粘盒、胶片、开窗相关工艺

### 7.2 `estimated`

产品模板已经稳定，但非关键 line-item 仍有保守兜底时，可以 `estimated`。

例如：

- 双插盒的特殊工艺单价未定
- 飞机盒的内层纸材存在但还没完全拆清
- 开窗彩盒窗位尺寸未完全确认，但主盒成本骨架已稳定

### 7.3 `handoff_required`

关键 line-item 缺失，或 workbook 等价结构仍有 blocking unknown term 时，必须 `handoff_required`。

例如：

- 主材层拆不出来
- 印刷费、刀模、啤机、粘盒这些核心行无法稳定确定
- 开窗胶片材质/厚度/窗位尺寸不清
- 未知坑型、未知特材代码影响成本判断

## 8. 建议的落地方式

先只把这层抽象作为 draft 常量与校验测试存在：

1. 不替换 live `complexPackagingQuote.ts`
2. 不改当前 phase-one 报价结果
3. 先让 shadow / draft 层和 workbook 结构对齐
4. 后续再把真实 line-item builder 接到这个抽象上

这样能先把“模板、字段、公式、边界”锁死，再进入实现阶段，不会一边写引擎一边继续改抽象口径。