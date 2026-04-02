# Printing AI Quote Assistant MVP

这是一个印刷厂 AI 报价客服机器人 MVP 系统，专为 1688/Alibaba 平台上的印刷工厂设计。

## 项目简介

本项目是一个 AI 辅助报价系统，帮助印刷工厂处理标准印刷询价需求。

### 核心能力
- **标准品类支持**: album / flyer 两个核心品类（brochure、business card、poster、sticker、standard paper bag 等）
- **自然语言参数抽取**: 从用户消息中智能提取报价参数
- **多轮补参**: 自动识别缺失参数并进行跟进询问
- **报价引擎**: 结构化定价引擎计算报价
- **会话管理**: Conversation / Message / Quote 数据入库
- **会话界面**: 会话列表和详情页面
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
   npx prisma migrate dev --name init
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
- `npm run seed` - 运行种子数据
- `npm run test` - 运行定价引擎测试
- `npm run test:ai` - 运行 AI 参数抽取测试
- `npm run test:mvp` - 运行 MVP 回归测试
- `npm run test:pricing` - 运行定价引擎测试
- `npm run test:params` - 运行参数合并测试
- `npx prisma studio` - 打开 Prisma Studio 数据库管理界面

## 主要页面与接口说明

### 页面
- `/` - Demo 首页，支持快速测试报价流程
- `/conversations` - 会话列表页面，支持状态筛选
- `/conversations/[id]` - 会话详情页面，显示完整对话和参数信息

### API 接口
- `POST /api/chat` - 聊天接口，处理用户询价消息
- `GET /api/conversations` - 获取会话列表
- `GET /api/conversations/[id]` - 获取单个会话详情
- `POST /api/conversations/[id]/handoff` - 人工接管接口
- `GET /api/quotes/[id]/export` - 导出报价单（HTML 格式）

## 快速演示流程

1. **启动项目**
   ```bash
   npm run dev
   ```

2. **打开首页**
   访问 `http://localhost:3000`，查看 Demo 首页

3. **测试询价流程**
   - 在首页输入框输入："我想印1000本A4画册"
   - 系统会识别出缺少参数，自动询问补参
   - 继续输入："封面200g铜版纸，内页157g铜版纸，骑马钉"
   - 系统生成报价并显示结果

4. **查看会话管理**
   - 访问 `/conversations` 查看所有会话列表
   - 点击进入具体会话查看详情
   - 可以看到参数抽取过程和报价结果

5. **测试报价单导出**
   - 在会话详情页点击导出报价单链接
   - 系统生成 HTML 格式的报价单

## 当前 MVP 边界

### 支持范围
- 仅支持标准印刷品类（album/brochure、flyer 等）
- 基础印刷知识问答
- 结构化参数抽取和报价计算
- 本地 PostgreSQL 数据存储
- 基础的人工接管功能

### 不支持范围
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
