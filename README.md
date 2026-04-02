# Printing AI Quote Assistant MVP

这是一个印刷厂 AI 报价客服机器人 MVP 系统，专为 1688/Alibaba 平台上的印刷工厂设计。

## 项目简介

本项目是一个 AI 辅助报价系统，帮助印刷工厂处理标准印刷询价需求。

### 核心能力
- **标准品类支持**: 画册 / 传单 / 名片 / 海报等标准印刷询价与建议场景
- **自然语言参数抽取**: 从用户消息中智能提取报价参数
- **多轮补参**: 自动识别缺失参数并进行跟进询问
- **报价引擎**: 结构化定价引擎计算报价
- **会话管理**: Conversation / Message / Quote 数据入库
- **会话界面**: 会话列表（含状态筛选）和详情页面
- **人工接管**: 支持复杂情况转人工处理
- **文件处理**: 复杂设计文件（PDF/AI/CDR/PSD/ZIP）自动转人工
- **报价单导出**: 生成可导出的报价单
- **Demo 首页**: 快速测试和演示界面

## 技术栈

- **Frontend**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **AI**: OpenAI API (GPT-4o-mini)
- **Styling**: Tailwind CSS
- **Validation**: Zod

## 本地运行要求

- **Node.js**: 版本 20.x (推荐使用 nvm 管理)
- **PostgreSQL**: 版本 12+
- **OpenAI API Key**: 需要有效的 OpenAI API 密钥

## 环境变量说明

复制 `.env.example` 到 `.env` 并填写以下变量：

```env
# 数据库连接 (PostgreSQL)
DATABASE_URL="postgresql://username:password@localhost:5432/printing_ai_quote"

# OpenAI API 密钥
OPENAI_API_KEY="sk-your-openai-api-key-here"

# 后台访问保护密钥
# 开发环境可留空；生产环境建议必须配置
ADMIN_SECRET="change-this-admin-secret"

# 可选：生产启动端口
PORT="3000"

# 仅用于一次性生产 seed，默认不要开启
ALLOW_SEED=""
```

## 安装与启动步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd printing-ai-quote
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **设置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，填写 DATABASE_URL 和 OPENAI_API_KEY
   ```

4. **数据库迁移**
   ```bash
   npx prisma migrate dev
   ```

   如果你的本地数据库是在旧 migration 链上创建的，先看 `docs/migration-baseline.md`，按文档重建或重置本地库后再执行。

   对当前仓库推荐的本地重建捷径是：
   ```bash
   npm run db:reset:local
   ```

5. **种子数据（可选）**
   ```bash
   npm run seed
   ```

6. **启动开发服务器**
   ```bash
   npm run dev
   ```

项目将在 `http://localhost:3000` 启动。

## 常用命令

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务器
- `npm run check:launch` - 执行上线前最小回归：deploy 环境变量检查 + `test:mvp` + `build` + `prisma migrate status`
- `npm run db:reset:local` - 重建本地开发数据库并重新写入 seed
- `npm run seed` - 运行种子数据
- `npm run test` - 运行定价引擎测试
- `npm run test:business-card` - 运行名片定价引擎测试
- `npm run test:ai` - 运行 AI 参数抽取测试
- `npm run test:mvp` - 运行 MVP 回归测试
- `npm run test:pricing` - 运行定价引擎测试
- `npm run test:params` - 运行参数合并测试
- `npx prisma studio` - 打开 Prisma Studio 数据库管理界面
- `bash scripts/admin-access-smoke.sh` - 验证后台访问控制是否生效

## 主要页面与接口说明

### 页面
- `/` - Demo 首页，支持咨询、推荐方案、补参、参考报价和正式报价演示
- `/admin-access` - 后台访问入口，用于建立或清除后台访问会话
- `/conversations` - 会话列表页面，支持状态筛选
- `/conversations/[id]` - 会话详情页面，显示完整对话和参数信息
- `/dashboard` - 主链路、咨询链路与 learning 总览
- `/learning-dashboard` - learning effectiveness 与优化优先级总览

### API 接口
- `POST /api/chat` - 聊天接口，处理用户询价消息
- `POST /api/admin/session` - 建立/清除后台访问会话
- `GET /api/hello` - 最小 liveness 检查
- `GET /api/health` - 最小 readiness 检查，返回数据库/关键环境变量状态
- `GET /api/conversations` - 获取会话列表
- `GET /api/conversations/[id]` - 获取单个会话详情
- `POST /api/conversations/[id]/handoff` - 人工接管接口
- `GET /api/quotes/[id]/export` - 导出报价单（HTML 格式，当前按后台受保护接口处理）

## 后台访问控制

- 当前后台页面和管理 API 使用 `ADMIN_SECRET` 做最小保护
- 受保护页面包括：`/conversations`、`/dashboard`、`/learning-dashboard`、`/reflections`、`/improvements`、`/actions`、`/consultation-tracking`
- 受保护 API 包括：`/api/conversations/*`、`/api/dashboard`、`/api/learning-dashboard`、`/api/quotes/*`、`/api/reflections/*`、`/api/improvements/*`、`/api/consultation-tracking`
- 公开链路如 `/`、`/api/chat` 仍保持可访问
- 浏览器访问后台页时，未授权会跳转到 `/admin-access`
- 脚本访问管理 API 时，可直接传请求头 `x-admin-secret: <ADMIN_SECRET>`

## 快速演示流程

1. **启动项目**
   ```bash
   npm run dev
   ```

2. **打开首页**
   访问 `http://localhost:3000`，查看 Demo 首页

3. **测试询价流程**
   - **画册测试**: 输入 "我想印1000本A4画册" → 系统询问补参 → 输入 "封面200g铜版纸，内页157g铜版纸，骑马钉"
   - **传单测试**: 输入 "我想印5000份A4传单，双面彩印" → 系统询问补参 → 输入 "200g铜版纸"
   - **名片测试**: 输入 "我想印2000张90x54mm名片" → 系统询问补参 → 输入 "300g铜版纸，双面印刷，UV上光"
   - 系统生成报价并显示结果

4. **查看会话管理**
   - 访问 `/conversations` 查看所有会话列表
   - 使用状态筛选按钮筛选：全部、进行中、缺参数、已报价、人工接管中
   - 点击进入具体会话查看详情
   - 可以看到参数抽取过程和报价结果

5. **测试报价单导出**
   - 先通过 `/admin-access` 建立后台访问会话
   - 再在会话详情页点击导出报价单链接
   - 系统生成 HTML 格式的报价单

## 当前 MVP 边界

### 支持范围
- 仅支持标准印刷品类和规则化知识建议（当前以画册、传单、名片、海报为主）
- 基础印刷知识问答
- 结构化参数抽取和报价计算
- 本地 PostgreSQL 数据存储
- 基础的人工接管功能
- 会话状态筛选和管理

### 不支持范围
- sticker、standard paper bag 的实际报价与主链路尚未在当前代码库落地
- 复杂设计文件自动解析（PDF/AI/CDR/PSD/ZIP 等文件类型）
- 非标准包装产品自动化报价
- 完整的 ERP/OMS 系统集成
- 自动订单成交和支付流程
- 复杂投诉和售后自动化
- 正式的用户认证和权限系统
- 1688 平台的正式集成

### 核心规则
- LLM 仅负责参数抽取，不直接计算价格
- 所有价格由本地结构化规则引擎计算
- 复杂情况必须转人工处理
- 内部敏感数据不会暴露给用户

## Learning 边界

- reflection 记录存数据库，可持久化
- improvement 列表由 approved reflections 动态派生
- improvement/action 的状态、implementationNote、verificationNote、implementedAt、verifiedAt 当前仍主要保存在进程内存中
- improvement/action 的 implementationSummary、targetFileHint、lastActionAt 也仍主要保存在进程内存中
- 服务重启后，这些 improvement/action 状态和备注不会完整保留，因此 learning 页面当前更偏演示和人工研判辅助，不是正式台账系统，也不应作为正式工单或审计台账

## Quote productCategory 落库说明

- 新 Quote 落库时，当前 canonical productCategory 映射为：`album -> brochure`、`flyer -> flyer`、`business_card -> business-card`、`poster -> poster`
- 如果数据库里只有旧 slug（如 `album`、`business_card`）的分类记录，当前代码会在新 Quote 落库时优先把这类旧记录归一到 canonical slug，减少历史遗留库继续写出错误分类
- 如果历史库里已经同时存在 canonical 分类和旧错误分类，当前版本不会自动合并旧 Quote 到新分类；这类历史数据若要修复，应单独做 backfill，不应混入日常发布流程

## 上线能力第一版

- 可部署：推荐唯一部署路径为单机 Node.js 20 + PostgreSQL，生产库只用 `npx prisma migrate deploy`
- 可观测：`/api/hello` 用于基础存活探测，`/api/health` 用于最小就绪探测；关键运营 API 已统一接入最小错误日志包装
- 可回归：上线前优先执行 `npm run check:launch`，它会先校验 `DATABASE_URL`、`OPENAI_API_KEY`、`ADMIN_SECRET` 是否为非空；上线后再按 `docs/demo-flow.md` 和 `scripts/admin-access-smoke.sh` 做手动验收
- 可运营：Dashboard 上线后优先看 `quoted`、`missing_fields`、`handoff_required`、`consultation → recommendation_confirmation / quoted` 这几组指标

如果本地开发时故意把 `ADMIN_SECRET` 留空，`npm run dev` 仍可使用；但做部署彩排或生产启动前，需要先把 `ADMIN_SECRET` 设为非空，否则 `/api/health` 会保持 `not_ready`。

## Seed 生产限制

- 默认不要在生产环境运行 `npm run seed`
- 当前 `prisma/seed.ts` 已显式阻止普通生产 seed
- 只有在明确的一次性初始化场景下，才使用 `ALLOW_SEED=true npm run seed:prod:allow`
- 生产 seed 前应先确认目标库、备份和执行人，避免把演示数据误写入正式环境

## 部署与迁移文档

- 部署 runbook：`docs/deploy-runbook.md`
- migration baseline 与 schema 对齐说明：`docs/migration-baseline.md`
- 上线前检查清单：`docs/deploy-checklist.md`

当前仓库的 Prisma migration 已收敛为单一 baseline：`20260402113000_mvp_baseline`。如果你本地还有旧迁移链生成的数据库，请不要直接复用，先按 migration baseline 文档处理。

当前代码与 schema 的关键依赖点包括：

- `Conversation.status` 依赖当前 `ConversationStatus` 枚举
- learning 相关接口依赖 `ReflectionRecord` 已存在
- Quote 落库依赖 `Quote.productCategoryId -> ProductCategory.id` 外键和 canonical 分类 slug

其中只有 `updateConversationStatus` 在开发环境会临时容忍 schema 未对齐，生产环境会直接报错；如果线上出现这类错误，应优先排查 migration 是否已正确执行，而不是继续放宽业务逻辑。

## 已知构建说明

- 当前已将 `request.url` 相关的后台列表 API 显式标记为动态路由，避免它们在构建阶段被误判为静态页面问题
- 某些本地环境下，`npm run build` 仍可能看到 Next.js / webpack 关于可选 `@next/swc-*` 包的本地缓存 warning；如果构建最终显示 `Compiled successfully` 且退出码为 0，可视为非阻塞警告

## 后续可扩展方向

- **更多品类支持**: 扩展到更多印刷品类
- **增强状态管理**: 会话状态的更细粒度筛选和管理
- **AI 稳定性提升**: 改进参数抽取的准确性和鲁棒性
- **平台集成**: 与 1688/Alibaba 平台的正式对接
- **后台管理系统**: 完整的管理员界面和业务流程
- **多语言支持**: 支持更多语言的询价处理
- **报价优化**: 智能推荐更优的规格组合
- **数据分析**: 询价数据统计和业务洞察

## 架构原则

- 前后端分离：Next.js App Router
- 数据层：Prisma + PostgreSQL
- AI 逻辑与定价逻辑分离
- API 路由保持薄层，业务逻辑在 server/lib 中
- 定价引擎保持确定性和可读性

## 许可证

本项目仅用于演示和学习目的。
