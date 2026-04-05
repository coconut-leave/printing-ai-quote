# MVP 测试用例文档

本文档列出 MVP 核心功能的最小测试用例集，用于手工验证和回归测试基准。

---

## 测试用例总览

| 序号 | 用例名称 | 优先级 | 类型 |
|------|---------|--------|------|
| 1 | Album 一轮完整报价成功 | P0 | 功能 |
| 2 | Album 多轮参数补全后报价 | P0 | 功能 |
| 3 | Flyer 一轮完整报价成功 | P0 | 功能 |
| 4 | Flyer 多轮参数补全后报价 | P0 | 功能 |
| 5 | 文件型询价触发人工接管 | P0 | 功能 |
| 6 | 人工接管状态正确保存 | P1 | 数据 |
| 7 | 会话列表页能显示所有会话 | P1 | UI |
| 8 | 会话详情页显示完整信息 | P1 | UI |
| 9 | 报价单导出接口可访问 | P1 | 功能 |
| 10 | 异常输入的兜底行为 | P1 | 容错 |
| 11 | 飞机盒结构化预报价 | P0 | 功能 |
| 12 | 双插盒结构化预报价 | P0 | 功能 |
| 13 | 开窗彩盒结构化预报价 | P0 | 功能 |
| 14 | 说明书结构化报价 | P1 | 功能 |
| 15 | 主盒 + 内托 + 说明书 + 贴纸组合报价 | P0 | 功能 |
| 16 | PDF / 刀模文件进入人工复核 | P0 | 功能 |

---

## 详细测试用例

### TC-001: Album 一轮完整报价成功

**优先级**：P0

**功能**：测试单轮完整参数能直接报价并保存 Quote

**输入**：
```json
{
  "message": "我想印1000本A4画册，封面200g铜版纸，内页157g铜版纸，骑马钉，32页"
}
```

**预期行为**：
- AI 成功提取所有必填参数（productType, finishedSize, quantity, coverPaper, coverWeight, innerPaper, innerWeight, bindingType, pageCount）
- 系统调用 calculateAlbumQuote() 计价
- 返回 status = "quoted" 且 finalPrice > 0
- Quote 入库成功

**预期结果**：
```json
{
  "ok": true,
  "status": "quoted",
  "conversationId": <number>,
  "data": {
    "normalizedParams": {
      "finishedSize": "A4",
      "pageCount": 32,
      "coverPaper": "coated",
      "coverWeight": 200,
      "innerPaper": "coated",
      "innerWeight": 157,
      "bindingType": "saddle_stitch",
      "quantity": 1000
    },
    "unitPrice": <number>,
    "totalPrice": <number>,
    "shippingFee": 50,
    "tax": 0,
    "finalPrice": <number>,
    "notes": []
  },
  "reply": "已为您生成报价：..."
}
```

**验证点**：
- [ ] conversationId 不为空
- [ ] unitPrice > 0
- [ ] finalPrice = totalPrice + shippingFee + tax
- [ ] 数据库查询 quotes 表可找到对应记录

---

### TC-002: Album 多轮参数补全后报价

**优先级**：P0

**功能**：测试多轮对话中参数合并与补全流程

**输入（第一轮）**：
```json
{
  "message": "我想印A4画册，骑马钉，32页"
}
```

**预期行为（第一轮）**：
- 缺：productType（默认 album）, quantity, coverPaper, coverWeight, innerPaper, innerWeight
- 返回 status = "missing_fields"
- 返回 missingFields 列表

**预期结果（第一轮）**：
```json
{
  "ok": true,
  "status": "missing_fields",
  "conversationId": <number>,
  "missingFields": ["quantity", "coverPaper", "coverWeight", "innerPaper", "innerWeight"],
  "reply": "我已识别部分参数，但还需要补充：..."
}
```

**输入（第二轮）**：
```json
{
  "conversationId": <from-first-round>,
  "message": "1000本，封面200g铜版纸，内页157g"
}
```

**预期行为（第二轮）**：
- 提取新参数并与历史参数合并
- 所有必填字段齐全
- 计价成功

**预期结果（第二轮）**：
```json
{
  "ok": true,
  "status": "quoted",
  "conversationId": <same-as-first>,
  "data": {
    "normalizedParams": {
      "finishedSize": "A4",
      "pageCount": 32,
      "coverPaper": "coated",
      "coverWeight": 200,
      "innerPaper": "coated",
      "innerWeight": 157,
      "bindingType": "saddle_stitch",
      "quantity": 1000
    },
    "unitPrice": 28.51,
    "finalPrice": <computed>
  }
}
```

**验证点**：
- [ ] conversationId 保持一致
- [ ] 参数来自于多轮合并（finishedSize 来自默认，quantity/paper 来自第二轮）
- [ ] finalPrice 正确计算
- [ ] messages 表记录两条消息

---

### TC-003: Flyer 一轮完整报价成功

**优先级**：P0

**功能**：测试 Flyer 产品单轮完整报价

**输入**：
```json
{
  "message": "我想要5000份传单，A4，200克哑光纸，双面"
}
```

**预期行为**：
- AI 提取 productType = "flyer"
- 提取所有 flyer 必填参数（finishedSize, quantity, paperType, paperWeight, printSides）
- 系统调用 calculateFlyerQuote()
- 返回 status = "quoted"

**预期结果**：
```json
{
  "ok": true,
  "status": "quoted",
  "conversationId": <number>,
  "data": {
    "normalizedParams": {
      "finishedSize": "A4",
      "quantity": 5000,
      "paperType": "matte",
      "paperWeight": 200,
      "printSides": "double",
      "taxRate": 0,
      "shippingRegion": "domestic"
    },
    "unitPrice": 8.94,
    "totalPrice": 44700,
    "shippingFee": 30,
    "tax": 0,
    "finalPrice": 44730,
    "notes": ["双面印刷"]
  },
  "reply": "已为您生成报价：单价 ¥8.94/份，..."
}
```

**验证点**：
- [ ] productType = "flyer"
- [ ] shippingFee = 30（flyer 运费更低）
- [ ] notes 包含"双面印刷"
- [ ] unitPrice 按 flyer 公式计算（基础价 ¥5.0）

---

### TC-004: Flyer 多轮参数补全后报价

**优先级**：P0

**功能**：测试 Flyer 多轮补全

**输入（第一轮）**：
```json
{
  "message": "我要2000份A5传单"
}
```

**预期行为（第一轮）**：
- 缺 paperType, paperWeight, printSides
- 返回 status = "missing_fields"

**输入（第二轮）**：
```json
{
  "conversationId": <from-first>,
  "message": "200克铜版纸，双面"
}
```

**预期行为（第二轮）**：
- 合并得到完整参数，计价成功

**预期结果**：
```json
{
  "ok": true,
  "status": "quoted",
  "conversationId": <same>,
  "data": {
    "normalizedParams": {
      "finishedSize": "A5",
      "quantity": 2000,
      "paperType": "coated",
      "paperWeight": 200,
      "printSides": "double"
    },
    "unitPrice": <computed>,
    "finalPrice": <computed>
  }
}
```

**验证点**：
- [ ] conversationId 保持一致
- [ ] 参数正确合并
- [ ] finalPrice 按 flyer 公式计算

---

### TC-005: 文件型询价触发人工接管

**优先级**：P0

**功能**：测试文件关键词检测和自动转人工

**输入**：
```json
{
  "message": "请按设计稿文件来报价，PDF已发"
}
```

**预期行为**：
- 检测到文件关键词（"设计稿", "PDF"）
- 不进行 AI 参数提取
- 返回 status = "handoff_required"
- 创建 HandoffRecord
- 更新 Conversation.status = "PENDING_HUMAN"
- 创建 ASSISTANT 消息说明已转人工

**预期结果**：
```json
{
  "ok": true,
  "status": "handoff_required",
  "conversationId": <number>,
  "reply": "您的询价涉及设计文件或专业审稿需求，已为您转接专业人工服务团队进行核价。请稍候，我们的专业人员将尽快联系您。"
}
```

**验证点**：
- [ ] conversationId 有效
- [ ] 数据库 conversations 表，对应会话 status = "PENDING_HUMAN"
- [ ] handoff_records 表有新记录
- [ ] reason = "涉及设计文件或专业审稿需求"
- [ ] assignedTo = "design_team"

---

### TC-006: 人工接管状态正确保存

**优先级**：P1

**功能**：验证人工接管逻辑的数据库状态

**前置条件**：执行 TC-005 获取 conversationId

**验证操作**：
```sql
-- 查询 conversations 表
SELECT status FROM conversations WHERE id = <id from TC-005>;
-- 预期：PENDING_HUMAN

-- 查询 handoff_records 表
SELECT * FROM "handoffRecords" WHERE "conversationId" = <id from TC-005>;
-- 预期：reason = "涉及设计文件或专业审稿需求", assignedTo = "design_team"

-- 查询 messages 表
SELECT sender, content FROM messages WHERE "conversationId" = <id from TC-005> ORDER BY "createdAt";
-- 预期：最后一条消息为 sender = ASSISTANT，content 包含"人工服务"
```

**预期结果**：
- [ ] conversations.status = "PENDING_HUMAN"
- [ ] handoffRecords 有 1 条记录
- [ ] messages 包含客户消息 + 系统回复消息

---

### TC-007: 会话列表页能显示所有会话

**优先级**：P1

**功能**：验证会话列表 UI 正常展示

**访问方式**：
```
GET http://localhost:3007/conversations
```

**预期行为**：
- 页面加载成功（HTTP 200）
- 显示会话数量与数据库记录相符
- 每条会话显示 ID、创建时间、状态、是否有报价

**预期结果**：
- [ ] 页面标题："会话列表"
- [ ] 若有 conversationId = 1，页显示一行包含 "#1"、创建时间、"OPEN" 或其他状态
- [ ] 有报价的会话显示 "已报价: 是"

---

### TC-008: 会话详情页显示完整信息

**优先级**：P1

**功能**：验证会话详情 UI 显示所有关键信息

**访问方式**：
```
GET http://localhost:3007/conversations/1
```

**前置条件**：确保会话 ID 1 存在

**预期行为**：
- 页面正常加载
- 显示会话基本信息（ID、状态、创建时间）
- 显示消息历史（按时间顺序）
- 显示报价记录（若有）
- 显示人工接管记录（若有）

**预期结果**：
- [ ] 页面标题：会话详情 #1
- [ ] 显示 "基本信息" 卡片
- [ ] 显示 "消息历史" 卡片，消息列表不为空
- [ ] 显示 "报价记录" 卡片，若有报价则显示"查看报价单"按钮
- [ ] 显示 "人工接管记录" 卡片（若有记录）

---

### TC-009: 报价单导出接口可访问

**优先级**：P1

**功能**：验证报价单导出功能

**访问方式**：
```
GET http://localhost:3007/api/quotes/{quoteId}/export
```

**前置条件**：需要有有效的 quoteId（从 TC-001 或 TC-003 获取）

**预期行为**：
- 返回 HTTP 200 和 HTML 内容
- HTML 包含报价单完整信息
- HTML 可在浏览器中正常打印或渲染

**预期结果**：
```html
<!-- 包含以下内容 -->
<h1>报价单 #<quoteId></h1>
<!-- Quote ID, Conversation ID -->
<tr><th>Quote ID</th><td>...</td></tr>
<tr><th>Conversation ID</th><td>...</td></tr>
<!-- 状态、创建时间 -->
<tr><th>状态</th><td>PENDING</td></tr>
<!-- 产品类型、规格参数 -->
<tr><th>产品类型</th><td>album / flyer</td></tr>
<tr><th>规格参数摘要</th><td>...</td></tr>
<!-- 价格字段 -->
<tr><th>单价</th><td>¥...</td></tr>
<tr><th>总价</th><td>¥...</td></tr>
<tr><th>运费</th><td>¥...</td></tr>
<tr><th>税费</th><td>¥...</td></tr>
<tr><th>最终价格</th><td>¥...</td></tr>
<!-- 打印按钮 -->
<button onclick="window.print()">打印此页</button>
```

**验证点**：
- [ ] status code = 200
- [ ] content-type = "text/html; charset=utf-8"
- [ ] 页面包含"报价单"标题
- [ ] 所有核心字段存在
- [ ] 打印按钮可点击

---

### TC-010: 异常输入的兜底行为

**优先级**：P1

**功能**：测试系统对非预期输入的容错

#### TC-010-A: 空消息

**输入**：
```json
{
  "message": ""
}
```

**预期结果**：
```json
{
  "ok": false,
  "status": "error",
  "message": "message field is required and must be non-empty"
}
```

#### TC-010-B: 非 JSON 格式

**输入**：
```
POST /api/chat
Body: "invalid json"
```

**预期结果**：
```json
{
  "ok": false,
  "status": "error",
  "message": "Invalid JSON payload"
}
```

#### TC-010-C: 无法解析的产品类型

**输入**：
```json
{
  "message": "我要定制一款不存在的产品，特别定制"
}
```

**预期行为**：
- AI 无法识别产品类型或提取无效参数
- 系统降级处理（默认 album 或返回 missing_fields）

**预期结果**：
```json
{
  "ok": true,
  "status": "missing_fields",
  "missingFields": [...],
  "reply": "我已识别部分参数，但还需要补充：..."
}
```

**验证点**：
- [ ] 系统不崩溃
- [ ] 返回有意义的错误或降级处理
- [ ] 不将客户输入暴露在错误消息中

---

### TC-011: 飞机盒结构化预报价

**优先级**：P0

**功能**：验证 `mailer_box` 可进入复杂包装一期的结构化预报价链路。

**输入**：
```json
{
  "message": "飞机盒报价，长20宽12高6cm，E坑，300g白卡，单面彩印，5000个"
}
```

**预期行为**：
- 系统识别为复杂包装一期场景，而不是简单品类正式报价
- 系统提取长宽高、材料、克重、印色、数量等关键字段
- 返回结构化预报价、缺参追问或人工复核提示之一
- 不应宣称复杂包装已经完全自动化

**验证点**：
- [ ] 能识别飞机盒场景
- [ ] 能整理尺寸和材料参数
- [ ] 回复中明确这是预报价或仍需人工复核

---

### TC-012: 双插盒结构化预报价

**优先级**：P0

**功能**：验证 `tuck_end_box` 的尺寸、材料、印刷和表面处理参数整理。

**输入**：
```json
{
  "message": "双插盒报价，18x8x4cm，350g白卡，四色印刷，覆哑膜，3000个"
}
```

**验证点**：
- [ ] 能识别双插盒场景
- [ ] 能整理长宽高、材料克重、印色、表面处理
- [ ] 返回结果属于一期复杂包装口径，不夸大为最终自动报价

---

### TC-013: 开窗彩盒结构化预报价

**优先级**：P0

**功能**：验证 `window_box` 的开窗参数进入结构化预报价上下文。

**输入**：
```json
{
  "message": "开窗彩盒预报价，长16宽10高5cm，正面开窗，PET贴窗，350g白卡，覆亮膜，2000个"
}
```

**验证点**：
- [ ] 能识别开窗彩盒场景
- [ ] 能整理开窗位置、贴窗、表面处理等参数
- [ ] 默认仍保留人工复核边界

---

### TC-014: 说明书结构化报价

**优先级**：P1

**功能**：验证 `leaflet_insert` 的尺寸、印色、材料和数量信息整理。

**输入**：
```json
{
  "message": "说明书报价，A5，双面四色，157g双胶纸，5000张"
}
```

**验证点**：
- [ ] 能识别说明书场景
- [ ] 能整理尺寸、印色、纸张和数量
- [ ] 回复口径与一期复杂包装一致

---

### TC-015: 主盒 + 内托 + 说明书 + 贴纸组合报价

**优先级**：P0

**功能**：验证主件 + 子组件的组合报价表达可被整理为结构化上下文。

**输入**：
```json
{
  "message": "主盒 + 内托 + 说明书 + 透明封口贴一起预报价，主盒18x12x6cm，内托白卡，说明书A5，贴纸3x3cm"
}
```

**验证点**：
- [ ] 能识别组合报价，而不是只保留第一项
- [ ] 能区分主件与子组件
- [ ] 返回结构化预报价或人工复核提示

---

### TC-016: PDF / 刀模文件进入人工复核

**优先级**：P0

**功能**：验证复杂包装中的 PDF / 刀模文件默认进入人工复核，不直接自动报价。

**输入**：
```json
{
  "message": "我上传了飞机盒刀模 PDF，按这个文件先预报价"
}
```

**预期行为**：
- 系统识别出 PDF / 刀模文件属于设计附件场景
- 默认进入人工复核链路
- 不承诺对刀模 PDF 做稳定自动结构解析

**验证点**：
- [ ] 返回人工复核或 handoff 相关提示
- [ ] 不直接给出完全自动化最终报价

---

---

## 执行手册

### 手工测试流程

1. **启动服务**：
   ```bash
   npm run dev
   ```
   确保服务运行在 http://localhost:3007

2. **逐个执行测试用例**：
  - 对于 API 类用例（TC-001-006, TC-010-016），使用 curl 或 Postman
   - 对于 UI 类用例（TC-007-008），浏览器打开对应 URL
   - 对于数据库验证（TC-006），使用 SQL 客户端或 Prisma Studio（`npx prisma studio`）
   - 对于文件导出（TC-009），浏览器访问或 curl 检查

3. **记录结果**：
   建议创建 Excel 或 markdown 表格，标记通过 / 失败 / 阻碍因素

### 回归测试快速验证

每次开发后，执行以下命令快速验证核心逻辑：

```bash
# 运行所有回归测试（纯函数层面）
npm run test:mvp

# 或分模块运行
npm run test:pricing    # 计价引擎
npm run test:params     # 参数抽取 & 合并
npm run test:detection  # 文件检测
```

---

## 附录：测试环境要求

- Node.js >= 18
- PostgreSQL（测试数据库需可访问）
- OPENAI_API_KEY 已配置
- Next.js 开发服务运行

## 附录：常见问题排查

| 症状 | 可能原因 | 解决方案 |
|------|--------|--------|
| conversationId 为 0 或无效 | 会话创建失败 | 检查数据库连接 |
| finalPrice 计算错误 | 定价公式问题 | 查看 albumQuote.ts / flyerQuote.ts |
| AI 提取参数不完整 | Prompt 不清晰 | 检查 extractQuoteParams.ts 的 prompt |
| HTML 导出为空 | Quote 数据缺失 | 检查 Quote 入库是否成功 |

