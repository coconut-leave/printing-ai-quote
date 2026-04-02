# 单机部署 Runbook

本文档定义当前项目推荐的唯一部署路径：单机 Node.js 20 + PostgreSQL。

该路径适用于当前 MVP，目标是让项目可以稳定上线、便于交付和排查，而不是一次支持所有部署平台。

当前仓库的 Prisma migration 基线已收敛为单一 baseline：`20260402113000_mvp_baseline`。

## 1. 适用范围

- 当前 live scope：album / flyer / business_card / poster
- 当前后台页和管理 API 使用 `ADMIN_SECRET` 做最小访问保护
- 当前不包含完整账号体系、SSO、复杂权限系统、Docker 编排和多节点部署

## 2. 环境要求

- Node.js 20.x
- npm 8+
- PostgreSQL 12+
- Linux/macOS 均可，推荐 Linux 服务器
- 可访问 OpenAI API

## 3. 必备环境变量

在服务器项目根目录创建 `.env`：

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/printing_ai_quote"
OPENAI_API_KEY="sk-..."
ADMIN_SECRET="replace-with-a-strong-secret"
PORT="3000"
ALLOW_SEED=""
```

说明：

- `DATABASE_URL`：生产数据库连接串
- `OPENAI_API_KEY`：OpenAI 密钥
- `ADMIN_SECRET`：后台访问控制密钥。生产环境必须配置
- `PORT`：可选，默认 3000
- `ALLOW_SEED`：默认留空。仅在极少数一次性初始化场景下，才临时设为 `true`

## 4. 安装步骤

```bash
git clone <repository-url>
cd printing-ai-quote
npm ci
```

## 5. 发布前校验

```bash
npm run check:launch
```

要求：

- `check:launch` 通过
- `check:launch` 会先校验 `DATABASE_URL`、`OPENAI_API_KEY`、`ADMIN_SECRET` 都为非空
- `migrate status` 没有未处理的异常状态

如果本地 `.env` 主要用于开发，且把 `ADMIN_SECRET` 留空，做部署彩排时请先临时补一个非空值，例如：

```bash
ADMIN_SECRET="deploy-rehearsal-secret" npm run check:launch
```

## 6. 数据库迁移

如果目标数据库是旧 migration 链时代创建的本地 / 测试库，不要直接复用；先按 [migration-baseline](./migration-baseline.md) 重建或重置，再继续。

发布顺序建议固定为：

```bash
npm ci
npx prisma migrate status
npx prisma migrate deploy
npm run build
npm start
```

如果 `migrate status` 已经出现 history conflict / drift / last common migration 为 null，不要继续发布，先按 migration baseline 文档处理数据库来源问题。

生产环境只使用：

```bash
npx prisma migrate deploy
```

不要在生产环境使用：

- `npx prisma migrate dev`
- `npx prisma db push`

更多说明见 [migration-baseline](./migration-baseline.md)。

## 7. 启动步骤

```bash
npm start
```

如果要指定端口：

```bash
PORT=3000 npm start
```

当前仓库没有内置 PM2 / Docker / Nginx 配置；若要增加这些部署包装层，应在后续阶段单独补齐，不应影响当前 runbook 的唯一性。

## 8. 健康检查

### 8.1 基础健康检查

```bash
curl -i http://127.0.0.1:3000/api/hello
```

预期：HTTP 200。

### 8.2 就绪健康检查

```bash
curl -i http://127.0.0.1:3000/api/health
```

预期：HTTP 200，且 JSON 中 `status` 为 `ready`。

如果返回 `503` 且 `status` 为 `not_ready`，优先检查 `DATABASE_URL`、`OPENAI_API_KEY`、`ADMIN_SECRET` 是否都已按生产口径配置为非空。

### 8.3 公开链路检查

```bash
curl -i -X POST http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"我想印1000本A4画册"}'
```

预期：HTTP 200，返回 `missing_fields` / `estimated` / `quoted` 等正常业务状态，而不是 401。

### 8.4 后台保护检查

未授权访问后台页：

```bash
curl -I http://127.0.0.1:3000/dashboard
```

预期：3xx，跳转到 `/admin-access`。

未授权访问管理 API：

```bash
curl -i http://127.0.0.1:3000/api/dashboard
```

预期：401。

未授权访问报价导出 API：

```bash
curl -i http://127.0.0.1:3000/api/quotes/1/export
```

预期：401。

带 `x-admin-secret` 访问管理 API：

```bash
curl -i http://127.0.0.1:3000/api/dashboard \
  -H "x-admin-secret: $ADMIN_SECRET"
```

预期：200。

也可以直接执行：

```bash
ADMIN_SECRET="$ADMIN_SECRET" BASE_URL=http://127.0.0.1:3000 bash scripts/admin-access-smoke.sh
```

当前脚本会在状态码不符合预期时直接退出非 0，适合做最小运行态 smoke。

## 9. 发布后手动验收

至少完成以下检查：

1. 首页 `/` 可正常打开
2. `/api/hello` 返回 200，`/api/health` 返回 `ready`
3. `POST /api/chat` 正常
4. `/admin-access` 可正常建立后台访问会话
5. `/dashboard`、`/conversations`、`/learning-dashboard` 需在授权后才能访问
6. 报价单导出接口 `/api/quotes/[id]/export` 需在授权后才能访问
7. album / flyer / business_card / poster 各完成 1 条最小询价验证
8. 反思 / improvements / learning dashboard 能正常打开并返回数据
9. Dashboard 至少确认 `quoted`、`missing_fields`、`handoff_required`、`consultation → recommendation_confirmation / quoted` 指标口径正常

## 9.1 Quote 分类落库抽查

当前新 Quote 的 canonical productCategory 口径为：

- `album -> brochure`
- `flyer -> flyer`
- `business_card -> business-card`
- `poster -> poster`

如果数据库里只残留旧分类 slug（例如 `album`、`business_card`），当前代码会在新 Quote 落库时优先把旧分类记录归一到 canonical slug，再继续写入。

如果历史库里已经同时存在 canonical 分类和旧错误分类，当前版本不会自动合并旧 Quote 历史记录；如需修复，应在发布后单独做数据 backfill。

建议至少抽查 1 条新 Quote：

```bash
npx prisma studio
```

确认 `Quote.productCategoryId` 指向的 `ProductCategory.slug` 为 `brochure` / `flyer` / `business-card` / `poster` 之一。

## 9.2 Learning 边界

- reflection 记录存数据库，可持久化
- improvement 列表由 approved reflections 动态派生
- improvement / action 的状态、实施备注、验证备注、时间戳当前仍主要保存在进程内存中
- 服务重启后，这些 improvement / action 字段不会完整保留

因此，learning 相关页面当前只适合作为演示和人工研判辅助，不应当作正式持久化工单系统或对外承诺的长期统计台账。

## 9.3 Seed 限制

- 默认不要在生产环境执行 `npm run seed`
- 当前仓库只允许显式执行 `ALLOW_SEED=true npm run seed:prod:allow`
- 这只适用于明确的一次性初始化，不应作为常规发布步骤

## 9.4 最小错误日志口径

- 当前关键运营 API 建议至少观察这些 context：`health-check-database`、`dashboard-stats`、`learning-dashboard-stats`、`consultation-tracking-stats`
- 路由异常统一通过 `src/server/api/response.ts` 输出时间戳 + level + context，便于上线后按接口定位问题

## 10. 回滚建议

### 代码回滚

如果新版本启动失败或核心链路不可用：

1. 切回上一个稳定提交
2. 保持原 `.env` 不变
3. 重新执行 `npm ci`
4. 重新启动应用

### 数据库回滚

当前项目不提供自动数据库回滚脚本。

建议：

1. 发布前先备份数据库
2. 若 `migrate deploy` 失败，先停止继续发布
3. 根据 [migration-baseline](./migration-baseline.md) 检查失败的 migration 和当前数据库状态
4. 如果 migration 尚未成功应用，优先回滚代码并保留数据库现场用于排查
5. 如果 migration 已成功应用且需要回退，优先使用数据库快照或备份恢复，不要尝试手写不完整的 down SQL 直接修改生产库

## 11. 已知构建说明

### 当前可接受 warning

- 某些本地环境下，`npm run build` 可能输出 `webpack.cache.PackFileCacheStrategy` 与可选 `@next/swc-*` 包相关 warning
- 如果构建最终显示 `Compiled successfully`、类型检查通过且退出码为 0，这类 warning 当前可视为本地缓存噪音，不阻塞上线

### 当前不应再出现的 warning

- 针对 `/api/reflections` 或 `/api/improvements` 的 `Dynamic server usage` warning 已通过显式动态路由配置处理
- 如果这些 warning 再出现，说明路由配置被改回或发生回归，应在发布前排查