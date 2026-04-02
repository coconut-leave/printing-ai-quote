# MVP 测试与验证指南

本指南说明如何对 MVP 进行回归测试、手工验证和问题排查。

---

## 快速开始

### 快速回归测试（1 分钟）

运行一次完整的逻辑层回归测试：

```bash
npm run test:mvp
```

预期输出：
```
╔════════════════════════════════════════════╗
║        MVP 回归测试套件                      ║
╚════════════════════════════════════════════╝

📋 运行: 计价引擎测试...
✓ Album: 基础报价计算
✓ Album: 多页数系数计算
...
✓ Flyer: 金额精度（2 位小数）

=== 测试总结 ===
通过: 13/13

📋 运行: 参数合并与检测测试...
✓ 参数合并: 从空历史开始
...
✓ 文件检测: 多个关键词同时存在

=== 测试总结 ===
通过: 20/20

╔════════════════════════════════════════════╗
║         测试总结                           ║
╚════════════════════════════════════════════╝

✓ 计价引擎测试
✓ 参数合并与检测测试

总计: 2/2 个模块通过

✅ 所有测试通过！
```

---

## 详细的 MVP 验证

### 阶段 1：启动服务

```bash
npm run dev
```

确保你看到：
```
▲ Next.js 14.2.5
  - Local:        http://localhost:3007
  - Environments: .env

```

### 阶段 2：手工测试

参考 [📋 docs/test-cases.md](docs/test-cases.md) 中的 10 个测试用例，逐个验证 MVP 功能。

快速验证脚本（使用 curl）：

#### 测试 1: Album 完整报价
```bash
OPENAI_API_KEY="your_key_here" curl -X POST http://localhost:3007/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "我想印1000本A4画册，封面200g铜版纸，内页157g铜版纸，骑马钉，32页"
  }' | jq .
```

#### 测试 2: Flyer 完整报价
```bash
OPENAI_API_KEY="your_key_here" curl -X POST http://localhost:3007/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "我想要5000份传单，A4，200克哑光纸，双面"
  }' | jq .
```

#### 测试 3: 文件型查询触发人工接管
```bash
curl -X POST http://localhost:3007/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "请按PDF设计稿来报价"
  }' | jq .
```

#### 测试 4: 会话列表页
```
http://localhost:3007/conversations
```

#### 测试 5: 会话详情页（替换 1 为实际 conversationId）
```
http://localhost:3007/conversations/1
```

#### 测试 6: 报价单导出（替换 1 为实际 quoteId）
```
http://localhost:3007/api/quotes/1/export
```

---

## 阶段 3：回归测试套件

### 运行所有模块测试

```bash
npm run test:mvp
```

### 运行单个模块测试

```bash
# 只测计价引擎逻辑
npm run test:pricing

# 只测参数合并 & 缺陷检测 & 文件检测
npm run test:params
```

### 现有旧测试（保留兼容性）

```bash
# Album 定价测试（原有）
npm run test

# 参数提取测试（原有，需要 OpenAI 调用）
npm run test:ai
```

---

## 测试覆盖范围

### ✅ 已覆盖的核心逻辑

| 模块 | 函数 | 测试数 | 备注 |
|------|------|--------|------|
| 计价引擎 | `calculateAlbumQuote()` | 8 | 包含纸张类型、克重、装订、运费、税费 |
| 计价引擎 | `calculateFlyerQuote()` | 5 | 包含双面系数、克重、运费 |
| 参数合并 | `mergeParameters()` | 4 | 多轮场景、字段覆盖、清理 |
| 缺陷检测 | `checkMissingFields()` | 8 | Album/Flyer 品类差异、null/undefined |
| 文件检测 | `isFileBasedInquiry()` | 8 | 关键词检测、大小写、复合条件 |

**总计：33 个单元测试**

### ⚠️ 不在这一阶段测试的部分

- OpenAI API 集成（需要真实 API Key，采用 mock 输入）
- 数据库持久层（假设 Prisma 自测满足）
- 端到端集成（建议后期补充）
- UI 交互逻辑（依靠手工浏览器测试）

---

## 快速排查指南

### 问题 1: `npm run test:mvp` 失败

**症状**：看到 ✗ 标记和失败信息

**排查步骤**：
1. 检查 Node.js 版本：`node -v`（需要 >= 18）
2. 检查依赖：`npm install`
3. 运行单个模块定位问题：`npm run test:pricing`
4. 查看详细错误信息（完整输出）

### 问题 2: `/api/chat` 返回错误

**症状**：`"ok": false` 或 `"status": "error"`

**排查步骤**：
1. 确认 OPENAI_API_KEY 已配置：`echo $OPENAI_API_KEY`
2. 确认数据库可连接：`npx prisma studio`
3. 查看服务日志（npm run dev 的输出）
4. 尝试最小化请求：只发产品类型，看是否能识别

### 问题 3: 数据库相关错误

**症状**：`PrismaClientInitializationError` 或 `Connection refused`

**排查步骤**：
1. 确认 PostgreSQL 运行中
2. 确认 .env 配置的 DATABASE_URL 正确
3. 运行迁移：`npx prisma migrate deploy`
4. 重置数据库（开发环境）：`npx prisma migrate reset`

### 问题 4: 参数无法提取

**症状**：总是返回 `missing_fields` 或提取错误

**排查步骤**：
1. 检查 OpenAI Responses API 是否正常
2. 尝试简化消息内容（移除特殊字符）
3. 查看 src/server/ai/extractQuoteParams.ts 中的 Prompt
4. 考虑使用 mock 数据调试后端处理逻辑

---

## 维护与扩展

### 添加新的回归测试

1. 在 `src/tests/` 目录下新建 `<module>.test.ts`
2. 采用现有的 `test()` 和 `assert()` 模式
3. 在 `src/tests/mvp-regression.test.ts` 中注册该模块
4. 在 `package.json` 中新增对应的 npm script

### 更新测试用例文档

当功能变更时，及时更新 `docs/test-cases.md`，保持文档与实现同步。

---

## CI/CD 集成建议

如果后续接入 GitHub Actions 或其他 CI 平台，建议：

```yaml
# 例如 .github/workflows/test.yml
- name: Run MVP Regression Tests
  run: npm run test:mvp

- name: Run Pricing Tests
  run: npm run test:pricing

- name: Run Parameter Tests
  run: npm run test:params
```

---

## 常见命令速查

| 目的 | 命令 |
|------|------|
| 启动开发服务 | `npm run dev` |
| 快速回归测试 | `npm run test:mvp` |
| 计价引擎测试 | `npm run test:pricing` |
| 参数逻辑测试 | `npm run test:params` |
| 旧计价测试 | `npm run test` |
| 旧参数提取测试 | `npm run test:ai` |
| 查看 Prisma Studio | `npx prisma studio` |
| 运行数据库迁移 | `npx prisma migrate deploy` |
| 重置开发数据库 | `npx prisma migrate reset` |

---

## 更多信息

- 📋 手工测试用例：[docs/test-cases.md](docs/test-cases.md)
- 📖 项目 PRD：[docs/prd-summary.md](docs/prd-summary.md)
- 🏗️ 项目规范：[AGENTS.md](AGENTS.md)
