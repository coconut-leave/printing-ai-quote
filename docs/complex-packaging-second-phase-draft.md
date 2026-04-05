# Complex Packaging Second-Phase Draft

本文档用于收口 complex packaging 第二阶段的中间设计层。

范围约束：

- 不替换当前 phase-one 运行路径
- 不改变当前 chat 对外行为
- 不接入新的 UI 流程
- 不直接改写现有 complex packaging 报价结果
- second-phase 结果首批不落正式数据库字段，只挂内部 metadata / debug payload

当前目标：

1. 固定 second-phase 标准参数草模
2. 固定 line-item 成本结构与计算顺序
3. 固定保守的品类归并与变体策略
4. 固定阶段化实装边界
5. 列出必须确认的决策点

## 1. 标准参数草模

第二阶段建议将 complex packaging 报价对象统一为：

- 一个请求 `SecondPhaseComplexPackagingRequestDraft`
- 多个成品项 `SecondPhaseComplexPackagingItemDraft`
- 每个成品项由 6 个层组成：
  - 成品层
  - 生产尺寸层
  - 材料配方层
  - 印刷工艺层
  - 生产计价层
  - 原始保真层
- 可选 line-item 成本明细行
- 可选解析诊断与决策边界信息

### 1.1 成品层

| 字段 | 说明 | 类型建议 | 与 phase-one 关系 |
|---|---|---|---|
| packagingFamily | 归一化包装主族 | 枚举 | 新增 |
| packagingType | 当前可落地主类 | 枚举 | 现有 productType 可映射 |
| variantTags | 结构变体标签 | 枚举数组 | 新增 |
| productName | 归一化品名 | 自由文本 | 扩展 |
| customerAlias | 客户叫法或原品名 | 必须保真文本 | 新增 |
| finishedLength | 成品长 | 数值 | 扩展，现有 length 需重释义 |
| finishedWidth | 成品宽 | 数值 | 扩展，现有 width 需重释义 |
| finishedHeight | 成品高 | 数值 | 扩展，现有 height 需重释义 |
| sizeUnit | 尺寸单位 | 枚举 | 现有字段可复用 |
| orderQuantity | 客户订单数量 | 数值 | 现有 quantity 需明确含义 |
| unit | 单位，如 个、张、套 | 枚举 | 新增 |
| bundleRole | 主件、配件、说明书、内卡、外箱等 | 枚举 | 新增 |
| customerNote | 客户备注 | 自由文本 | 扩展 |

### 1.2 生产尺寸层

| 字段 | 说明 | 类型建议 | 与 phase-one 关系 |
|---|---|---|---|
| finishedSpecRaw | 成品规格原文 | 必须保真文本 | 新增 |
| unfoldedLength | 展开长 | 数值 | 新增 |
| unfoldedWidth | 展开宽 | 数值 | 新增 |
| sheetCutLength | 开料长 | 数值 | 新增 |
| sheetCutWidth | 开料宽 | 数值 | 新增 |
| sheetSpecRaw | 开料或纸张规格原文 | 必须保真文本 | 新增 |
| expandSpecRaw | 展开原文 | 必须保真文本 | 新增 |
| productionSizeSource | 尺寸来源 | 枚举 | 新增 |
| dimensionConfidence | 尺寸解析可信度 | 枚举 | 新增 |

### 1.3 材料配方层

| 字段 | 说明 | 类型建议 | 与 phase-one 关系 |
|---|---|---|---|
| materialProcessRaw | 材质工艺原串 | 必须保真文本 | 新增 |
| facePaperMaterial | 面纸材质 | 枚举加原文保留 | 扩展 |
| facePaperWeight | 面纸克重 | 数值 | 扩展 |
| corrugationType | 坑型或瓦楞/加强芯简称，如 WE、W9、A9、AF | 枚举加原文保留 | 新增 |
| reinforcementMaterial | 加强芯或芯材描述 | 自由文本 | 新增 |
| reinforcementWeight | 芯纸或加强芯克重 | 数值 | 新增 |
| backingMaterial | 背纸或对裱层材质 | 自由文本 | 新增 |
| backingWeight | 背纸或对裱层克重 | 数值 | 新增 |
| mountingMode | 裱坑、对裱、已对裱等 | 枚举 | 扩展 |
| hasCorrugatedMounting | 是否裱坑 | 布尔 | 新增 |
| hasDuplexMounting | 是否对裱 | 布尔 | 新增 |
| windowFilmMaterial | 窗口片材质，如 APET | 枚举加原文保留 | 扩展 |
| windowFilmThickness | 窗口片厚度 | 数值 | 扩展 |
| insertMaterial | 内卡或内托材质 | 自由文本 | 扩展 |
| rawMaterialTerms | 命中的原始材质术语 | 必须保真数组 | 新增 |

### 1.4 印刷工艺层

| 字段 | 说明 | 类型建议 | 与 phase-one 关系 |
|---|---|---|---|
| frontPrintMode | 正面印刷模式 | 枚举加原文保留 | 扩展 |
| backPrintMode | 反面印刷模式 | 枚举加原文保留 | 新增 |
| fourColorCount | 四色面数或序数 | 数值 | 新增 |
| spotColorCount | 专色数量 | 数值 | 现有字段可复用 |
| blackInkIncluded | 是否包含黑色印刷 | 布尔 | 新增 |
| pantoneCodes | Pantone 色号 | 数组 | 现有字段可复用 |
| printSides | 单双面 | 枚举 | 现有字段可复用 |
| laminationType | 覆光胶、覆哑胶等 | 枚举 | 扩展 |
| uvModes | UV、逆向 UV、局部 UV | 枚举数组 | 新增 |
| embossingModes | 激凸、压纹等 | 枚举数组 | 新增 |
| dieCutRequired | 是否啤 | 布尔 | 扩展 |
| gluingRequired | 是否粘盒 | 布尔 | 扩展 |
| halfCutRequired | 是否半穿 | 布尔 | 新增 |
| splicingRequired | 是否驳接 | 布尔 | 新增 |
| doubleTapeRequired | 是否贴双面胶 | 布尔 | 新增 |
| windowFilmRequired | 是否贴窗口片 | 布尔 | 扩展 |
| processTags | 工艺标签集合 | 枚举数组 | 扩展 |
| processRawTerms | 命中的原始工艺术语 | 必须保真数组 | 新增 |

### 1.5 生产计价层

| 字段 | 说明 | 类型建议 | 与 phase-one 关系 |
|---|---|---|---|
| orderQuantity | 客户下单数量 | 数值 | 现有 quantity 可映射 |
| basisQuantity | 基数 | 数值 | 新增 |
| spoilageQuantity | 抛纸或损耗数量 | 数值 | 新增 |
| actualProductionQuantity | 实际生产数量 | 数值 | 新增 |
| tonPrice | 吨价 | 数值 | 新增 |
| sheetCount | 张数或投料张数 | 数值 | 新增 |
| fixedSetupFee | 固定开机费 | 数值 | 新增 |
| printFee | 印刷费汇总 | 数值 | 新增 |
| dieMoldFee | 刀模费 | 数值 | 新增 |
| dieCutMachineFee | 啤机费 | 数值 | 新增 |
| gluingFee | 粘盒费 | 数值 | 新增 |
| mountingFee | 裱坑或对裱费 | 数值 | 新增 |
| filmFee | 胶片费 | 数值 | 新增 |
| tapeFee | 双面胶费 | 数值 | 新增 |
| specialProcessFee | 其他工艺费 | 数值 | 新增 |
| itemSubtotal | 成品项小计 | 数值 | 新增 |
| pricingLineRefs | 对应成本明细行引用 | 数组 | 新增 |

### 1.6 原始保真层

| 字段 | 说明 | 类型建议 | 与 phase-one 关系 |
|---|---|---|---|
| rawProductName | 原始品名 | 必须保真文本 | 新增 |
| rawSpecText | 原始规格文本 | 必须保真文本 | 新增 |
| rawMaterialProcessText | 原始材质工艺文本 | 必须保真文本 | 新增 |
| rawRemarkText | 原始备注 | 必须保真文本 | 新增 |
| recognizedTerms | 已识别术语列表 | 必须保真数组 | 新增 |
| unresolvedTerms | 未识别术语片段 | 必须保真数组 | 新增 |
| sourceWorkbook | 来源文件 | 必须保真文本 | 新增 |
| sourceSheet | 来源 sheet | 必须保真文本 | 新增 |
| sourceRowHint | 来源行提示 | 必须保真文本 | 新增 |
| parseWarnings | 解析警告 | 数组 | 新增 |

### 1.7 字段类型原则

- 适合枚举：包装主族、包装主类、variant tag、尺寸单位、单双面、覆膜类型、UV 类型、常见坑型、bundleRole
- 适合自由文本：归一化品名、客户备注、加强芯描述、背纸描述、内托材质、补充工艺说明
- 必须保真：原始品名、规格原文、材质工艺原串、命中术语、未识别术语、来源文件和 sheet、原始备注

## 2. Line-Item 报价引擎结构草案

第二阶段报价引擎不直接替换现有 phase-one 汇总估算，而是先定义为 line-item 求和模型。

### 2.1 首批 line-item 类别

| lineCode | 真实报价单对应项 | 计价基础建议 |
|---|---|---|
| face_paper | 面纸 | 吨价型 或 面积张数型 |
| corrugated_core | 坑纸、芯纸、加强芯 | 吨价型 或 面积张数型 |
| backing_or_duplex | 背纸、对裱层、裱坑/纸 | 张数型 或 固定费加数量型 |
| printing | 印刷费 | 色序数 × 张数，加开机费 |
| lamination | 光胶、哑胶、覆膜 | 面积型 或 张数型 |
| die_mold | 刀模 | 固定费型 |
| die_cut_machine | 啤机 | 实际数量型 或 张数型 |
| gluing | 粘盒 | 实际数量型 |
| window_film | 胶片、APET 窗口片 | 面积型 或 片数型 |
| splicing | 驳接 | 固定费型 或 固定费加数量型 |
| double_tape | 贴双面胶 | 实际数量型 |
| special_process | 激凸、局部 UV、逆向 UV、半穿等 | 固定费加数量型 |
| manual_adjustment | 人工修正项 | 人工录入型 |

### 2.2 line-item 计价基础类型

- ton_price: 按吨价计料
- sheet_count: 按张数计价
- area_usage: 按面积计价
- actual_units: 按实际数量计价
- fixed_setup_fee: 固定开机费
- fixed_tooling_fee: 固定刀模费
- fixed_plus_units: 固定费加数量费
- manual_entry: 人工录入

### 2.3 计算顺序

1. 归一化原始文本，保留原文
2. 归并包装主类和 variant tags
3. 确定成品、展开、开料三套尺寸及来源
4. 拆分材料配方
5. 拆分印刷与工艺标签
6. 确定订单量、基数、抛纸、实际数量
7. 生成材料类 line-item
8. 生成印刷与工艺类 line-item
9. 汇总成品项 subtotal
10. 汇总订单级 shipping、tax、final

### 2.4 状态决策边界

#### quoted

- 主类已归并成功
- 关键尺寸完整
- 核心材料配方完整
- 关键 line-item 都可计算
- 未识别术语不影响成本判断

#### estimated

- 主类已识别，但存在少量非关键术语未识别
- 部分 line-item 使用保守模板或默认规则
- 缺少展开或开料尺寸，但可用成品尺寸做保守估算
- 存在特殊工艺但仍能使用模板预估

#### handoff_required

- 包装结构无法归并
- 核心材料配方不完整
- 关键 line-item 缺失
- 未识别术语影响成本判断
- 多结构组合件无法稳定拆项
- 依赖设计文件、刀线图或高度复杂工艺

## 3. 品类归并与变体策略

### 3.1 可先归并进现有主类的变体

| 真实叫法 | 归并建议 |
|---|---|
| 双插盒、双插大盒、屏幕双插盒 | `tuck_end_box` + variant tags |
| 激凸 UV 屏幕双插盒 | `tuck_end_box` + variant tags |
| 挂钩彩盒 | `tuck_end_box` + `hanging_tab` |
| 飞机盒、行李箱飞机盒 | `mailer_box` + variant tags |
| 开窗彩盒 | `window_box` |
| 说明书 | `leaflet_insert` |
| 纸内托、内卡 | `box_insert` |

### 3.2 需要作为候选结构类保留的

- `folding_carton`: 过渡主族，用于“已知是折叠彩盒，但暂时无法稳定细分”
- `auto_lock_bottom_box`: 扣底盒
- `rigid_box` 或 `lid_base_box`: 上下盖天地盒、灰板盒
- `outer_carton`: 外箱、空白箱
- `card_set_or_kit`: 卡牌套装、多组件组合件

### 3.3 暂时仍建议 estimated 或 handoff 的

- 结构明显不清
- 同一询盘混合多个结构且无法稳定拆项
- 命中未知坑型、未知板材、未知膜材等关键术语
- 高复杂工艺叠加但无稳定费率模板
- 需要依赖设计稿或刀线图

## 4. 分阶段实装建议

### 第一阶段

只落地折叠彩盒一族：

- 普通彩盒
- 双插盒
- 挂钩彩盒
- 普通飞机盒

策略：

- 先做 shadow 模式并行结构
- 不替换 phase-one 结果
- 优先验证展开尺寸、材料配方、印刷费、刀模、啤机、粘盒
- line-item 费率模板不完整时，宁可降为 estimated，不勉强 quoted

首批不进入 quoted 主路径的结构：

- 开窗彩盒
- 扣底盒
- 天地盒
- 外箱
- 卡牌套装
- 灰板结构

### 第二阶段

补结构更复杂但仍共享骨架的类：

- 开窗盒彩盒
- 扣底盒
- 再评估天地盒与外箱是否进入下一轮

### 第三阶段

扩知识库和术语词典：

- WE、W9、A9、AF、APET、K636K
- UV 变体、专色写法、裱坑、对裱、半穿
- 与历史报价单、月结单对齐的术语归一化

## 5. 必须确认的决策点

以下决策已经确认，可作为第一批最小实装约束：

1. 首批只做折叠彩盒一族：普通彩盒、双插盒、挂钩彩盒、普通飞机盒
2. 接受 `folding_carton` 作为过渡主族
3. 未识别术语边界：
  - 不影响核心成本的小备注，允许 `estimated`
  - 命中坑型、芯材、关键材料层、特殊膜材、窗口片材质、高复杂工艺、结构关键词的未知术语，直接 `handoff_required`
4. second-phase 首批采用 shadow 模式并行接入
5. 费率来源首批走规则模板 + 人工可修正
6. 明确延期：天地盒、外箱、卡牌套装、灰板结构，扣底盒放到第二批候选
7. 彩卡先归入平面件体系，不进入首批折叠彩盒配件体系
8. 原始保真字段允许长期存库
9. 首批 quoted 要求收紧为：
  - 主类可归并
  - 核心材料配方完整
  - 关键 line-item 可计算
  - 未识别术语不影响成本判断

## 6. Shadow Payload 约束

second-phase 首批仅输出 shadow payload，不替换当前 live 响应结构。该 payload 首批只用于：

- 内部 metadata
- debug 对比
- 后续人工复核与词典积累

shadow payload 至少应包含：

- `applicable`: 是否适用于首批范围
- `packagingFamily` / `packagingType`
- `variantTags`
- `shadowStatus`
- `statusReasons`
- `unresolvedTerms`
- `blockingUnknownTerms`
- `lineItems`
- `subtotal`
- `usedForResponse: false`
- `diffSummary`

`diffSummary` 首批至少包含：

- 主类归并是否一致
- 状态判断是否一致
- second-phase 识别到但 phase-one 未显式表达的关键未识别术语

## 7. 确认后第一批最小实装会涉及的文件

- `src/server/packaging/types.ts`
- `src/lib/catalog/productSchemas.ts`
- `src/server/packaging/extractComplexPackagingQuote.ts`
- `src/server/pricing/complexPackagingQuote.ts`
- `src/server/chat/createChatPostHandler.ts`
- `src/lib/packaging/reviewSummary.ts`
- `src/tests/complex-packaging-extraction.test.ts`
- `src/tests/complex-packaging-pricing.test.ts`
- `src/tests/chat-api-complex-packaging-context.test.ts`

注意：以上文件仅是确认后第一批最小实装的目标清单，不是本轮改动范围。