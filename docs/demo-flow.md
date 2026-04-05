# MVP 演示流程

本文档描述了 Printing AI Quote Assistant MVP 的完整演示流程，覆盖简单品类正式报价，以及复杂包装一期的结构化预报价与人工复核路径。

## 前置准备

1. **环境要求**
   - Node.js 20.x
   - PostgreSQL 12+
   - OpenAI API Key

2. **项目启动**
   ```bash
   # 克隆项目
   git clone <repository-url>
   cd printing-ai-quote

   # 安装依赖
   npm install

   # 配置环境变量
   cp .env.example .env
  # 编辑 .env，填写 DATABASE_URL、OPENAI_API_KEY
  # 如需验证后台访问控制，再补 ADMIN_SECRET

  # 数据库迁移
  npx prisma migrate dev

  # 如果本地库来自旧 migration 链，先用下面的方式重建
  # npm run db:reset:local

   # 可选：运行种子数据
   npm run seed

   # 启动开发服务器
   npm run dev
   ```

3. **上线前本地回归建议**
  ```bash
  npm run check:launch
  ```

  如果当前本地 `.env` 里把 `ADMIN_SECRET` 留空用于开发模式，做部署彩排前请先临时补一个非空值，例如：

  ```bash
  ADMIN_SECRET="deploy-rehearsal-secret" npm run check:launch
  ```

  然后再按本文的 Demo / 手动验收路径回归一次公开链路和后台保护链路。

## 演示流程

### 1. 打开 Demo 首页
- 访问 `http://localhost:3000`
- 查看系统介绍和快速入口

### 2. 测试多轮补参报价

#### 画册询价演示
```bash
# 第一轮：缺少参数
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"我想印1000本A4画册"}'
# 预期：系统询问缺少的参数（纸张、装订等）

# 第二轮：补全参数
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"封面200g铜版纸，内页157g铜版纸，骑马钉"}'
# 预期：系统生成报价，显示单价、总价、运费、税费等
```

#### 传单询价演示
```bash
# 第一轮：基本信息
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"我想印5000份A4传单，双面彩印"}'
# 预期：系统询问纸张信息

# 第二轮：补全参数
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"200g铜版纸"}'
# 预期：生成传单报价
```

#### 名片询价演示
```bash
# 第一轮：基本信息
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"我想印2000张90x54mm名片"}'
# 预期：系统询问纸张和印刷信息

# 第二轮：补全参数
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"300g铜版纸，双面印刷，UV上光"}'
# 预期：生成名片报价
```

### 2.1 复杂包装一期演示

以下场景用于验证复杂包装一期的文档方向：系统以结构化预报价 + 人工复核为主，不承诺复杂包装已经完全自动化。

#### 飞机盒预报价演示
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"飞机盒报价，长20宽12高6cm，E坑，300g白卡，单面彩印，5000个"}'
# 预期：进入复杂包装一期的结构化预报价或缺参追问，不应宣称已完成复杂包装全自动报价
```

#### 双插盒预报价演示
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"双插盒报价，18x8x4cm，350g白卡，四色印刷，覆哑膜，3000个"}'
# 预期：系统整理盒型、尺寸、材料、印刷和表面处理参数，返回结构化预报价或继续补参
```

#### 开窗彩盒预报价演示
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"开窗彩盒预报价，长16宽10高5cm，开窗正面，PET贴窗，350g白卡，覆亮膜，2000个"}'
# 预期：系统识别开窗参数，但仍按一期复杂包装口径返回预报价或人工复核提示
```

#### 说明书报价演示
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"说明书报价，A5，双面四色，157g双胶纸，5000张"}'
# 预期：系统能整理 leaflet_insert 的尺寸、材料、印色和数量信息
```

#### 组合报价演示
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"主盒 + 内托 + 说明书 + 透明封口贴一起预报价，主盒18x12x6cm，内托白卡，说明书A5，贴纸3x3cm"}'
# 预期：系统把主件 + 子组件整理成组合报价上下文，返回结构化预报价或人工复核提示
```

### 2.2 推荐方案连续 patch 手动回归

以下 6 组脚本建议直接在首页同一个会话里手动输入，验证系统是否会先更新方案、再按明确指令进入报价链路。

#### 用例 1：推荐后修改一个字段，再显式报价
1. 输入：`A4画册一般多少页比较合适？`
2. 输入：`页数改成40`
3. 预期：页面显示“推荐方案已更新”，不直接出价。
4. 输入：`现在算一下，1000本`
5. 预期：进入正式报价，页数应按 40 页计算。

#### 用例 2：连续两轮 patch 后再报价
1. 输入：`A4画册一般多少页比较合适？`
2. 输入：`页数改成40`
3. 输入：`改成胶装`
4. 预期：前两轮都只显示方案已更新。
5. 输入：`按这个方案报价，1000本`
6. 预期：正式报价同时带入 40 页和胶装。

#### 用例 3：连续 patch 但未明确报价
1. 输入：`A4画册一般多少页比较合适？`
2. 输入：`页数改成40`
3. 输入：`内页改128g`
4. 预期：仍停留在“推荐方案已更新”，不会误进 quoted。

#### 用例 4：后一轮覆盖前一轮同字段
1. 输入：`A4画册一般多少页比较合适？`
2. 输入：`页数改成40`
3. 输入：`页数改成48`
4. 预期：第二轮覆盖第一轮，页面只提示当前方案已更新。
5. 输入：`现在算一下，1000本`
6. 预期：报价按 48 页计算。

#### 用例 5：名片推荐方案只改工艺
1. 输入：`名片常见方案是什么？`
2. 输入：`改成UV上光`
3. 预期：页面提示方案已更新，不直接报价。
4. 输入：`按这个方案报价，2000张`
5. 预期：报价时沿用推荐的尺寸/纸张参数，并带入 UV 工艺。

#### 用例 6：海报推荐方案只改覆膜
1. 输入：`海报常见方案是什么？`
2. 输入：`改哑膜`
3. 预期：页面提示方案已更新，不直接报价。
4. 输入：`按这个方案报价`
5. 预期：如果其他参数齐全则直接报价；若仍缺允许估算字段则进入 estimated，并保留哑膜配置。

### 3. 测试文件型询价与人工复核
```bash
# 发送包含文件的询价
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"我有PDF文件，想印画册，能帮我报价吗？"}'
# 预期：系统识别文件类型，建议转人工处理

# 发送复杂包装刀模文件
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"我上传了飞机盒刀模 PDF，按这个文件先预报价"}'
# 预期：复杂刀模 PDF 默认进入人工复核，不直接自动报价
```

### 3.1 文件处理说明

- PDF 作为知识资料或样例资料：可以作为案例、知识说明或样例参考，但当前阶段不承诺稳定自动结构解析
- PDF 作为客户设计附件或刀模文件：默认进入人工复核链路
- AI / CDR / PSD / ZIP / 刀模 PDF：默认视为文件型询价或人工复核场景
- 当前阶段不承诺对刀模 PDF 做稳定自动结构解析

### 4. 查看会话管理

如果配置了 `ADMIN_SECRET`，先访问 `http://localhost:3000/admin-access` 建立后台访问会话，再进入以下后台页。

#### 会话列表页面
- 访问 `http://localhost:3000/conversations`
- 查看所有会话记录
- 测试状态筛选：
  - 点击"全部" - 显示所有会话
  - 点击"🔵 进行中" - 只显示 OPEN 状态会话
  - 点击"⚠️ 缺参数" - 只显示 MISSING_FIELDS 状态会话
  - 点击"✅ 已报价" - 只显示 QUOTED 状态会话
  - 点击"👤 人工接管中" - 只显示 PENDING_HUMAN 状态会话

#### 会话详情页面
- 点击任意会话进入详情页
- 查看完整的对话历史
- 查看参数提取和合并结果
- 查看报价详情

### 5. 测试人工接管
```bash
# 在会话列表页，点击"标记为人工接管"
# 或通过 API：
curl -X POST http://localhost:3000/api/conversations/{id}/handoff \
  -H "Content-Type: application/json" \
  -d '{"reason":"复杂设计需求","assignedTo":"sales"}'
# 预期：会话状态变为 PENDING_HUMAN
```

### 6. 测试报价单导出
- 在会话详情页，点击"导出报价单"链接
- 系统生成 HTML 格式的报价单
- 包含产品信息、规格参数、价格明细等

## 验收标准

✅ **功能验收**
- [ ] 标准品类（album/flyer/business_card/poster）报价正常
- [ ] 复杂包装一期（mailer_box/tuck_end_box/window_box/leaflet_insert/box_insert/seal_sticker）至少完成结构化预报价或人工复核引导
- [ ] 主件 + 子组件组合报价场景可整理成结构化上下文
- [ ] 多轮补参流程完整
- [ ] 参数提取准确
- [ ] 报价计算正确
- [ ] 会话状态流转正常
- [ ] 人工接管功能可用
- [ ] PDF / AI / CDR / 刀模文件默认进入人工复核，不直接自动报价
- [ ] 报价单导出正常
- [ ] consultation → recommendation → patch → estimated / quoted 链路正常
- [ ] dashboard / learning-dashboard 可正常查看统计
- [ ] 未授权访问后台页会跳转到 `/admin-access`
- [ ] 未授权访问管理 API 返回 401，已授权后恢复正常

✅ **性能验收**
- [ ] API 响应时间 < 3秒
- [ ] 页面加载正常
- [ ] 数据库查询正常

✅ **用户体验验收**
- [ ] 界面简洁清晰
- [ ] 错误提示友好
- [ ] 操作流程顺畅

## 常见问题

**Q: 为什么报价结果不准确？**
A: 检查参数提取是否正确，可以查看会话详情中的参数信息。

**Q: 复杂包装和刀模 PDF 为什么没有直接自动报价？**
A: 复杂包装一期以结构化预报价 + 人工复核为主，复杂设计文件和刀模 PDF 默认不走稳定自动解析。

**Q: 数据库连接失败？**
A: 确认 PostgreSQL 服务正在运行，且 DATABASE_URL 配置正确。

**Q: OpenAI API 调用失败？**
A: 检查 OPENAI_API_KEY 是否正确配置，且账户有足够余额。

**Q: 构建失败？**
A: 运行 `npm run build` 检查是否有编译错误。

**Q: 为什么后台页面打开后跳到了 /admin-access？**
A: 当前后台页与管理 API 已启用最小访问保护。请先在 `.env` 中配置 `ADMIN_SECRET`，再访问 `/admin-access` 建立后台访问会话。