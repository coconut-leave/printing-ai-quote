# 试运行环境治理基线

当前仓库进入有限试运行时，环境治理只保留最小且可执行的 P0 基线，不引入额外平台。

## 必须满足

- `DATABASE_URL` 非空，数据库可正常连通。
- `OPENAI_API_KEY` 非空，且不能继续保留 `sk-...` 之类占位值。
- `ADMIN_SECRET` 非空，且必须为高强度密钥。
- `ADMIN_SECRET` 不得继续使用默认占位值或弱口令，例如 `change-this-admin-secret`、`admin`、`123456`。
- `ALLOW_SEED` 在试运行和生产环境必须保持为空。

## 当前落地方式

- `src/server/config/env.ts`
  - 统一输出 `getTrialEnvGovernanceSummary(...)`
  - 对占位 OpenAI key、弱 `ADMIN_SECRET`、`ALLOW_SEED=true` 做治理判断
- `scripts/check-launch-env.ts`
  - deploy 彩排和上线前直接阻断不合格环境
- `src/app/api/health/route.ts`
  - readiness 返回中带出 `trialGovernance`
  - 生产环境下治理阻塞会直接返回 `not_ready`
- `src/app/trial-reviews/page.tsx`
  - 后台复核页顶部直接展示当前环境治理告警，避免业务在不合格环境里继续试运行

## 轮换要求

- 如果当前 `.env` 中曾出现已暴露的 `OPENAI_API_KEY` 或弱 `ADMIN_SECRET`，上线前必须先完成轮换。
- 这类“已暴露”事实无法仅靠运行时代码自动证明，因此仍需要人工执行密钥更换。

## 最小操作清单

1. 替换真实 `OPENAI_API_KEY`。
2. 设置新的强 `ADMIN_SECRET`。
3. 确认 `ALLOW_SEED` 为空。
4. 执行 `npm run check:launch:env`。
5. 访问 `/api/health`，确认 `trialGovernance.status` 为 `ready`。