# Migration Baseline 与 Schema 对齐说明

本文档用于说明当前仓库的 Prisma migration 基线、开发/生产执行口径、当前代码与 schema 的关键依赖关系，以及旧 migration 链遗留库的处理方式。

## 1. 当前结论

当前仓库已把 Prisma migration 收敛为单一 baseline：

- `20260402113000_mvp_baseline`

这份 baseline 直接对应当前 `prisma/schema.prisma`，包含：

- 当前 `ConversationStatus` 枚举
- Conversation / Message / Quote / ProductCategory 等核心表
- ReflectionRecord 与相关 enum
- 当前 schema 中已有的索引和外键

这样做的原因是：旧 migration 链同时存在顺序不一致、缺少 Reflection 相关结构、以及状态枚举演进不完整的问题，已经不适合作为继续上线的基线。

## 2. 执行原则

- 开发环境：允许使用 `npx prisma migrate dev`
- 生产环境：只允许使用 `npx prisma migrate deploy`
- 生产环境不要使用 `prisma db push`
- 如果数据库来自旧 migration 链，不要继续混用旧记录和新 baseline

## 2.1 当前代码对 schema 的关键依赖

当前仓库中，最容易直接暴露 schema 不一致的关键依赖有：

- `Conversation.status` 必须包含 `OPEN`、`MISSING_FIELDS`、`QUOTED`、`PENDING_HUMAN`、`CLOSED`
- learning 相关接口依赖 `ReflectionRecord`、`ReflectionIssueType`、`ReflectionStatus`
- Quote 落库依赖 `Quote.productCategoryId` 和 `ProductCategory.slug` 的 canonical 映射

如果这些结构未对齐，当前应用不会通过“兼容层”替你修复数据库，只会在相关写入或查询路径报错。

## 3. 哪些数据库可以直接使用新 baseline

可以直接使用新 baseline 的情况：

- 全新创建的数据库
- 还没有写入重要数据的本地开发库 / 演示库 / 测试库

这类数据库的推荐步骤：

```bash
npx prisma migrate dev
```

或生产首次部署时：

```bash
npx prisma migrate deploy
```

## 4. 旧 migration 链遗留库怎么处理

如果数据库是在旧 migration 链阶段创建的，不要直接把它当作当前 baseline 的继续运行环境。

典型信号包括：

- `npx prisma migrate status` 显示 pending / history conflict
- 数据库里缺少 `ReflectionRecord`
- `ConversationStatus` 与当前 schema 不一致

### 4.1 本地开发库 / 演示库

如果没有必须保留的数据，推荐直接重建。

在这类旧库上执行 `npx prisma migrate status`，当前常见现象是：

- `The last common migration is: null`
- 旧 migration 被标记为 `not found locally`
- 新 baseline `20260402113000_mvp_baseline` 被标记为 `have not yet been applied`

这属于预期提示，表示当前数据库还停留在旧链历史上，而不是新 baseline 本身有问题。

可选做法：

1. 删除并重建本地数据库
2. 或执行 `npx prisma migrate reset`
3. 然后重新运行：

```bash
npx prisma migrate dev
```

当前仓库也提供了本地快捷命令：

```bash
npm run db:reset:local
```

它会执行：

- `npx prisma migrate reset --force`
- `npm run seed`

### 4.2 已有数据但还未正式上线的测试库 / 预发布库

先备份，再重建为当前 baseline；不要继续叠旧链。

如果必须保留旧数据，建议：

1. 先导出旧数据
2. 用新 baseline 重建数据库
3. 再按需要做一次定向 backfill / 数据导入

## 5. 生产环境推荐步骤

适用于全新或已按当前 baseline 对齐的数据库：

```bash
npm ci
npx prisma migrate status
npx prisma migrate deploy
npm run build
npm start
```

要求：

- 先执行 `migrate status`
- 确认没有 pending / history conflict / drift
- 再执行 `migrate deploy`
- 确认迁移成功后再启动新版本

推荐的生产升级顺序固定为：

1. `npm ci`
2. `npx prisma migrate status`
3. `npx prisma migrate deploy`
4. `npm run build`
5. `npm start`

## 6. ConversationStatus 风险说明

当前 `ConversationStatus` 为：

- `OPEN`
- `MISSING_FIELDS`
- `QUOTED`
- `PENDING_HUMAN`
- `CLOSED`

当前代码已明确：

- 开发环境：`updateConversationStatus` 失败时会告警并容忍，方便本地库迁移整理
- 生产环境：不再静默吞错，而是直接抛异常，避免 schema drift 被悄悄带进线上

这也是当前仓库里少数仍对本地 schema 未对齐做宽容处理的地方。除这类开发态容忍外，其余 Prisma 读写路径默认直接按当前 schema 执行。

所以如果生产环境会话状态更新报错，优先检查的不是聊天逻辑，而是数据库是否真的已按当前 baseline 对齐。

## 7. 常见失败排查

### 7.1 `migrate status` 报错或退出码非 0

先判断数据库是不是旧 migration 链遗留库。

如果是本地开发库，优先重建；不要继续试图在旧链基础上硬补。

### 7.2 `migrate deploy` 失败

先检查：

```bash
npx prisma migrate status
```

重点确认：

- 目标数据库是否是按当前 baseline 建立的
- 是否有人手工改过 schema
- 当前代码和数据库是否来自同一发布版本
- 当前数据库里是否还残留旧链时代的 enum / 表结构

### 7.3 应用启动后更新会话状态失败

优先检查：

1. 生产库是否已经执行 `npx prisma migrate deploy`
2. 当前数据库是否真的包含 `MISSING_FIELDS`、`QUOTED`、`PENDING_HUMAN`
3. 数据库是不是旧 migration 链留下的半对齐状态

## 8. 回滚建议

当前项目没有自动 migration down。

更稳妥的回滚策略是：

1. 发布前先备份数据库或做快照
2. 若迁移失败，停止继续发布
3. 先回滚应用代码
4. 如果 migration 未完成，先保留失败现场并判断是否需要恢复数据库备份
5. 数据库是否回滚，必须基于实际影响人工判断，不建议手写临时 down SQL 直接修改生产库

如果数据库已经按新 baseline 建好，不建议为了“快速回滚”再混回旧 migration 链。

## 9. productCategory 历史数据说明

当前版本已修正新 Quote 落库时的 `productCategory` 映射：

- `album -> brochure`
- `flyer -> flyer`
- `business_card -> business-card`
- `poster -> poster`

此外，如果数据库里只存在旧分类 slug（例如 `album`、`business_card`），当前代码会在新 Quote 落库时优先把这类旧分类记录归一到 canonical slug，再继续写入，避免错误分类继续污染新增数据。

但旧版本历史数据里，Quote 可能仍有分类不正确的记录。

如果历史库里已经同时存在 canonical 分类和旧错误分类，这类历史数据当前没有自动 backfill；如果后续需要修复，应单独做数据回填，不要把它混进 migration baseline 本身。