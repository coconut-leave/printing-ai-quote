# 推荐方案链路前台验收说明

## 测试目标

验证首页 Demo 页中的推荐方案链路在 MVP 范围内可重复执行、可人工验收、可用于后续回归测试。

本次重点关注这条连续链路：

1. 咨询后返回推荐方案
2. 基于推荐方案做单轮或多轮 patch
3. 在未明确报价前保持 `recommendation_updated`
4. 用户明确要求后进入 `estimated` 或 `quoted`
5. 文件型询价仍优先进入 `handoff_required`

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
npx tsx src/tests/recommendation-flow-regression.test.ts
```

## 页面地址

- 首页 Demo 页：`http://localhost:3000/`
- 如果本地开发端口不是 `3000`，请改成实际端口，例如 `http://localhost:3007/`

## 推荐方案链路说明

首页 Demo 页当前会按以下顺序展示链路信息：

1. `intent / status`
2. `reply`
3. `当前推荐方案`
4. `本轮 patch 修改`
5. `patch 后最新方案`
6. `最终报价结果`（如已进入 `estimated` / `quoted`）

其中需要重点确认：

1. `consultation_reply` 时存在 `recommendedParams`
2. `recommendation_updated` 时只更新方案，不自动报价
3. `estimated` 时显示参考报价
4. `quoted` 时显示正式报价
5. `handoff_required` 时仍优先转人工

## 连续对话脚本与预期结果

### 场景 1：咨询后返回推荐方案

步骤：

1. 输入：`A4画册一般多少页比较合适？`

预期：

1. `intent` 为咨询型意图
2. `status` 为 `consultation_reply`
3. 页面出现“当前推荐方案”
4. `recommendedParams` 中可见如 `A4`、`32页` 等推荐字段

### 场景 2：单轮 patch 后 recommendation_updated

步骤：

1. 输入：`A4画册一般多少页比较合适？`
2. 输入：`页数改成40`

预期：

1. 第二轮 `intent` 为 `PARAM_SUPPLEMENT`
2. 第二轮 `status` 为 `recommendation_updated`
3. 页面出现“本轮 patch 修改”
4. 页面出现“patch 后最新方案”
5. 页面提示“当前方案已更新”，但没有正式或参考报价金额

### 场景 3：多轮 patch 后 recommendation_updated

步骤：

1. 输入：`A4画册一般多少页比较合适？`
2. 输入：`页数改成40`
3. 输入：`改成胶装`

预期：

1. 第 2、3 轮都保持 `recommendation_updated`
2. 第 3 轮“patch 后最新方案”同时包含 `40页` 和 `胶装`
3. 没有自动进入 `estimated` 或 `quoted`

### 场景 4：recommendation_updated 但尚未报价

步骤：

1. 输入：`A4画册一般多少页比较合适？`
2. 输入：`内页改128g`

预期：

1. `status` 为 `recommendation_updated`
2. 页面提示可继续回复：
   - `按这个方案报价`
   - `现在算一下`
   - `按这个估个参考价`
3. 页面未出现报价详情卡片

### 场景 5：明确要求报价后进入 estimated

步骤：

1. 输入：`传单常见方案是什么？`
2. 输入：`尺寸改成A3`
3. 输入：`按这个估个参考价，2000张`

预期：

1. 第 2 轮状态为 `recommendation_updated`
2. 第 3 轮状态为 `estimated`
3. 页面明确显示“参考报价”
4. `mergedRecommendedParams` 或当前最新方案中保留 `A3`

### 场景 6：明确要求报价后进入 quoted

步骤：

1. 输入：`A4画册一般多少页比较合适？`
2. 输入：`页数改成40`
3. 输入：`现在算一下，1000本`

预期：

1. 第 2 轮状态为 `recommendation_updated`
2. 第 3 轮状态为 `quoted`
3. 页面明确显示“正式报价”
4. 最终合并参数中页数为 `40`

### 场景 7：文件型询价优先 handoff_required

步骤：

1. 输入：`推荐一个常见标准方案`
2. 输入：`我有PDF设计稿，按文件报价`

预期：

1. 第 1 轮返回推荐方案
2. 第 2 轮优先识别文件型询价
3. `status` 为 `handoff_required`
4. 不应误进入推荐方案报价链路

## 人工验收关注点

每个场景都建议确认以下字段：

1. 当前 `intent` 是否正确
2. 当前 `status` 是否正确
3. `recommendedParams` 是否存在
4. `patch` 后 `mergedRecommendedParams` 是否正确
5. 最终是否正确进入 `estimated` / `quoted` / `handoff_required`

## 建议执行命令

### 手动验收前

```bash
npm run dev
```

### 推荐方案链路自动回归

```bash
npx tsx src/tests/recommendation-flow-regression.test.ts
```

### 全量 MVP 回归

```bash
npm run test:mvp
```