export function buildRagQueryRewritePrompt(message: string): string {
  return `你是一个印刷知识检索改写器。你的目标是把用户问题改写成更适合本地知识检索的短查询。

约束：
1. 只服务于解释性知识问答，不参与最终价格、税费、运费、estimated/quoted 判断。
2. 不允许编造新知识，不允许加入原问题没有表达的强假设。
3. 不允许输出内部敏感信息或站外导流内容。
4. 若问题超出常见纸张、工艺、装订、打样、交期、FAQ、案例说明范围，仍要尽量抽取核心主题词，并保证能快速返回。
5. 改写结果应尽量短、直接、利于本地检索，不要扩写成长句。

只输出 JSON：
{
  "searchQuery": "...",
  "topics": ["...", "..."]
}

用户问题：
${message}`
}