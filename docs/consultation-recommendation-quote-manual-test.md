# 咨询到推荐到报价链路手动验收说明

## 目标

本说明用于人工复测当前 MVP 中这条智能主链路：

1. 咨询进入知识层
2. 咨询结果可返回推荐方案
3. 用户确认推荐后进入报价层
4. 推荐方案可先 patch 再报价
5. 文件型询价仍优先转人工

这份文档重点不是覆盖所有 FAQ，而是锁住“咨询 -> 推荐 -> 报价”主链路，避免后续继续扩知识卡片时把主链路改坏。

## 启动方式

1. 安装依赖

```bash
npm install
```

2. 启动开发环境

```bash
npm run dev
```

3. 如需先跑自动回归，可执行

```bash
npx tsx src/tests/consultation-recommendation-quote-regression.test.ts
```

也可以直接打本地 `/api/chat` 做连续 smoke test：

```bash
npm run test:chain-smoke
```

如果本地端口不是 `3000`，可显式指定：

```bash
BASE_URL=http://localhost:3007 npm run test:chain-smoke
```

4. 如需跑整套 MVP 回归，可执行

```bash
npm run test:mvp
```

## 页面地址

- 首页 Demo 页：`http://localhost:3000/`
- 如果本地端口不是 `3000`，请改成实际端口，例如 `http://localhost:3007/`

## 人工验收关注点

每轮输入后，重点确认这些字段：

1. `intent`
2. `status`
3. `reply`
4. `recommendedParams`
5. `mergedRecommendedParams`
6. `mergedParams`
7. 是否正确进入 `consultation_reply` / `recommendation_updated` / `estimated` / `quoted` / `handoff_required`

## 连续对话脚本

### 场景 1：咨询后仅返回知识回复

输入：

`铜版纸和哑粉纸有什么区别？`

预期：

1. `intent` 为 `MATERIAL_CONSULTATION`
2. `status` 为 `consultation_reply`
3. 页面显示知识说明
4. 不应直接进入 `estimated` 或 `quoted`

### 场景 2：咨询后返回 recommendedParams

输入：

`A4画册一般多少页比较合适？`

预期：

1. `intent` 为 `SPEC_RECOMMENDATION`
2. `status` 为 `consultation_reply`
3. 页面显示推荐方案
4. `recommendedParams` 中应可看到类似 `A4`、`32页`

### 场景 3：推荐方案确认后进入 estimated

连续输入：

1. `传单常见方案是什么？`
2. `按这个估个参考价，2000张`

预期：

1. 第 1 轮返回推荐方案
2. 第 2 轮 `intent` 为 `RECOMMENDATION_CONFIRMATION`
3. 第 2 轮 `status` 为 `estimated`
4. 由于缺少 `printSides`，应进入参考报价而不是正式报价

### 场景 4：推荐方案确认后进入 quoted

连续输入：

1. `A4画册一般多少页比较合适？`
2. `按这个方案报价，1000本`

预期：

1. 第 1 轮返回推荐方案
2. 第 2 轮 `status` 为 `quoted`
3. 正式报价应沿用推荐方案中的关键参数

### 场景 5：推荐方案 patch 后再报价

连续输入：

1. `A4画册一般多少页比较合适？`
2. `页数改成40，改成胶装`
3. `按这个方案报价，1000本`

预期：

1. 第 2 轮 `status` 为 `recommendation_updated`
2. patch 后方案中应包含 `40页` 和 `胶装`
3. 第 3 轮进入 `quoted`
4. 最终报价参数应保留 patch 结果

### 场景 6：文件型询价不应被咨询链路误吞

连续输入：

1. `推荐一个常见标准方案`
2. `我有PDF设计稿，按文件报价`

预期：

1. 第 1 轮返回推荐方案
2. 第 2 轮优先识别为 `FILE_REVIEW_REQUEST`
3. `status` 为 `handoff_required`
4. 不应误进入推荐确认或报价流程

## 建议命令

只跑这条正式链路回归：

```bash
npx tsx src/tests/consultation-recommendation-quote-regression.test.ts
```

直接通过本地 API 跑 smoke test：

```bash
npm run test:chain-smoke
```

如果本地端口是 `3007`：

```bash
BASE_URL=http://localhost:3007 npm run test:chain-smoke
```

跑现有推荐方案链路回归：

```bash
npx tsx src/tests/recommendation-flow-regression.test.ts
```

跑整套 MVP 回归：

```bash
npm run test:mvp
```