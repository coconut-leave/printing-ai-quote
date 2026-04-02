# 上线前检查清单

当前项目推荐只走一条部署路径：单机 Node.js 20 + PostgreSQL，按 [deploy-runbook](./deploy-runbook.md) 执行，按 [migration-baseline](./migration-baseline.md) 管理数据库迁移。

## 发布前

- [ ] 使用与生产一致的 `.env` 模板，至少配置 `DATABASE_URL`、`OPENAI_API_KEY`、`ADMIN_SECRET`
- [ ] 执行 `npm ci`
- [ ] 执行 `npm run check:launch`，覆盖 deploy 环境变量检查、`test:mvp`、`build`、`prisma migrate status`
- [ ] 执行 `npx prisma migrate status`，确认 migration 状态正常
- [ ] 确认 `prisma/migrations` 当前基线从 `20260402113000_mvp_baseline` 起连续演进，没有继续混用旧 migration 链
- [ ] 确认当前数据库不是旧 migration 链遗留库；当前仓库应以 `20260402113000_mvp_baseline` 作为唯一基线
- [ ] 确认生产只使用 `npx prisma migrate deploy`，不使用 `prisma migrate dev` / `prisma db push`
- [ ] 确认后台访问保护已启用，`ADMIN_SECRET` 不是空值或默认弱口令
- [ ] 如果本地开发 `.env` 故意留空 `ADMIN_SECRET`，做部署彩排前先临时导出一个非空值再运行 `check:launch` 和 `npm start`
- [ ] 确认生产默认不运行 `npm run seed`；如需一次性初始化演示数据，只能显式使用 `ALLOW_SEED=true npm run seed:prod:allow`
- [ ] 确认团队知晓 learning 页面当前不是正式持久化工单系统；服务重启后 improvement/action 状态与备注不会完整保留

## 发布中

- [ ] 执行 `npx prisma migrate deploy`
- [ ] 执行 `npm start` 或等价启动命令
- [ ] 访问 `/api/hello`，确认 liveness 正常
- [ ] 访问 `/api/health`，确认 readiness 为 `ready`
- [ ] 访问 `/admin-access`，确认可建立后台访问会话

## 发布后最小验收

- [ ] 首页 `/` 可正常打开
- [ ] `/api/hello` 返回 200 且可用于基础存活检查
- [ ] `/api/health` 返回 200，且数据库与关键环境变量状态正常
- [ ] `POST /api/chat` 可正常返回询价结果
- [ ] 未授权访问 `/dashboard` 会返回 3xx 并跳转到 `/admin-access`
- [ ] 未授权访问 `/api/dashboard` 返回 401
- [ ] 未授权访问 `/api/quotes/[id]/export` 返回 401
- [ ] 已授权后可访问 `/dashboard`、`/conversations`、`/learning-dashboard`
- [ ] 已授权后可访问会话详情中的报价单导出链接
- [ ] 画册 / 传单 / 名片 / 海报四类 live scope 询价至少各验证 1 条
- [ ] 至少抽查 1 条新 Quote，确认 productCategory 落库使用 canonical 分类：`brochure` / `flyer` / `business-card` / `poster`
- [ ] `bash scripts/admin-access-smoke.sh` 至少跑通一次，且在状态不符合预期时会直接失败
- [ ] Dashboard 至少确认以下 4 组指标有值且口径正常：`quoted`、`missing_fields`、`handoff_required`、`consultation → recommendation_confirmation / quoted`
- [ ] Learning Dashboard、改进建议池、建议落地工作台能打开，但团队需明确其 improvement/action 状态是演示态，不作为正式长期台账

## 已知构建说明

- [ ] 若构建输出中仍出现 `Dynamic server usage` 针对后台列表 API，视为回归，需要排查路由动态配置
- [ ] 若构建输出中出现 `webpack.cache.PackFileCacheStrategy` 与可选 `@next/swc-*` 包相关 warning，但最终 `Compiled successfully` 且退出码为 0，可视为当前本地环境下的非阻塞 warning

## 回滚前提

- [ ] 保留上一版代码与 `.env` 备份
- [ ] 保留数据库备份或快照
- [ ] 只在确认新版本不可用时再执行代码回滚；数据库回滚需按 [migration-baseline](./migration-baseline.md) 的建议人工评估，避免直接破坏生产数据