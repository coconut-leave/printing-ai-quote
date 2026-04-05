# Knowledge Rule Boundary v1

## 目标

这一版只做边界清晰化，不重写主链路。

目的是把当前 MVP 中的知识回答、推荐方案、报价规则和人工接管边界明确下来，避免后续扩展时把 FAQ、推荐配置、正式报价和人工接管混在一起。

## 四层边界

### 1. 知识层

知识层负责解释性回答，不负责最终价格计算。

当前主要包含：

- MATERIAL_CONSULTATION
- PROCESS_CONSULTATION
- SPEC_RECOMMENDATION

知识层可以输出常见理解、材料差异、工艺区别、标准规格建议。

如果某个知识回答天然适合附一个常见配置，则允许顺带输出 `recommendedParams`，从知识层自然引导到推荐层。

### 2. 推荐方案层

推荐方案层负责给出一个可执行的标准配置，但仍然不是最终报价。

当前主要包含：

- SOLUTION_RECOMMENDATION
- RECOMMENDATION_CONFIRMATION
- BARGAIN_REQUEST

其中：

- `SOLUTION_RECOMMENDATION` 用于直接给出标准方案
- `RECOMMENDATION_CONFIRMATION` 表示用户确认采用上一轮推荐方案
- `BARGAIN_REQUEST` 在 MVP 中不直接改正式报价，而是优先引导到更经济的推荐方案或参考价路径

推荐层的核心输出是 `recommendedParams`，它是后续报价的结构化输入，但本身不等于正式价格。

### 3. 报价规则层

报价规则层负责参数提取、缺参判断、estimated / quoted / missing_fields / handoff_required 的正式分流。

对于复杂包装一期，报价规则层更偏向结构化预报价与参数整理，而不是承诺完全自动化最终报价。

当前主要包含：

- QUOTE_REQUEST
- PARAM_SUPPLEMENT
- PROGRESS_INQUIRY

其中：

- `QUOTE_REQUEST` 进入报价主链路
- `PARAM_SUPPLEMENT` 默认用于补齐报价参数；当会话里已有 `recommendedParams` 时，也允许作为推荐方案 patch
- `PROGRESS_INQUIRY` 不做新报价，而是读取当前会话状态，回答是否缺参、是否已报价、是否已转人工

### 4. 人工接管层

人工接管层负责承接 MVP 外、风险高或情绪风险场景。

当前必须优先 handoff 的场景：

- FILE_REVIEW_REQUEST
- HUMAN_REQUEST
- COMPLAINT

说明：

- 文件审稿、设计附件、复杂稿件默认转人工
- 复杂包装中的 PDF / AI / CDR / 刀模文件默认转人工复核
- 用户明确要人工时，优先满足人工接管
- 投诉、强情绪、风险会话默认转人工

`SAMPLE_REQUEST` 当前仍保留轻量回复，但完整样品处理更适合人工继续跟进，因此属于条件性人工边界。

## 当前分层与跨层规则

### 按场景归类

1. MATERIAL_CONSULTATION: 主要属于知识层；当回答里附带常见纸张配置时，可跨到推荐层。
2. PROCESS_CONSULTATION: 主要属于知识层；当回答里附带常见工艺配置时，可跨到推荐层。
3. SPEC_RECOMMENDATION: 主要属于知识层；当输出标准页数、尺寸、克重方案时，可跨到推荐层。
4. SOLUTION_RECOMMENDATION: 主要属于推荐层；输出标准方案，后续可进入报价层。
5. RECOMMENDATION_CONFIRMATION: 主要属于推荐层；它是推荐层进入报价层的正式桥接动作。
6. QUOTE_REQUEST: 主要属于报价规则层；进入参数抽取、缺参检查和报价分流。
7. PARAM_SUPPLEMENT: 默认属于报价规则层；若当前上下文已有推荐方案，则也可跨到推荐层作为 patch。
8. FILE_REVIEW_REQUEST: 主要属于人工接管层；MVP 默认直接 handoff。
9. HUMAN_REQUEST: 主要属于人工接管层；用户明确要人工时直接 handoff。
10. COMPLAINT: 主要属于人工接管层；默认 handoff 给服务团队。
11. BARGAIN_REQUEST: 主要属于推荐层；不直接修改正式报价，而是引导到更省成本的方案或参考价。
12. PROGRESS_INQUIRY: 主要属于报价规则层；读取当前状态并回答是否缺参、已报价或已转人工。

## 当前系统如何从一层流向下一层

## 复杂包装一期补充边界

- 一期复杂包装范围包括：`mailer_box`、`tuck_end_box`、`window_box`、`leaflet_insert`、`box_insert`、`seal_sticker`
- 这部分以结构化预报价 + 人工复核为主
- 允许整理长宽高、材料克重、印色专色、表面处理、开窗参数、裱 / 啤 / 粘等工艺字段
- 如果客户直接上传 PDF / AI / CDR / 刀模文件，默认优先进入人工复核，不承诺稳定自动结构解析

### 知识层 -> 推荐层

允许场景：

- MATERIAL_CONSULTATION
- PROCESS_CONSULTATION
- SPEC_RECOMMENDATION

方式：知识回答在不直接给最终价格的前提下，可以附带一组常见 `recommendedParams`。

### 推荐层 -> 报价规则层

允许场景：

- RECOMMENDATION_CONFIRMATION

补充场景：

- PARAM_SUPPLEMENT 在已有 `recommendedParams` 的上下文中，可先 patch 推荐方案，再进入报价链路。

### 任意层 -> 人工接管层

满足以下任一条件时，优先进入人工：

- 文件、审稿、复杂附件
- 用户明确要求人工
- 投诉或风险会话
- 超出标准规则范围
- 报价引擎无法可靠返回结果

## 代码落点

边界配置集中在 [src/server/catalog/flowBoundaries.ts](../src/server/catalog/flowBoundaries.ts)。

当前这个模块主要定义：

- 哪些 intent 默认属于知识层
- 哪些 intent 默认属于推荐层
- 哪些 intent 默认属于报价规则层
- 哪些 intent 必须优先 handoff
- 哪些知识类 intent 允许顺带输出推荐方案
- 哪些推荐类 intent 允许进入报价

这一版是轻量 catalog，不替代现有 handler，只负责把边界显式化。