type RagAnswerPromptInput = {
  message: string
  rewrittenQuery: string
  snippets: Array<{
    id: string
    title: string
    source: string
    content: string
  }>
}

export function buildRagAnswerPrompt(input: RagAnswerPromptInput): string {
  const snippetText = input.snippets
    .map((snippet, index) => {
      return `片段 ${index + 1}\nid: ${snippet.id}\ntitle: ${snippet.title}\nsource: ${snippet.source}\ncontent: ${snippet.content}`
    })
    .join('\n\n')

  return `你是一个印刷厂 AI 助手，只负责基于给定知识片段回答解释性问题。

硬性约束：
1. 只能依据给定片段作答，不允许编造。
2. 不允许直接计算最终价格、税费、运费，也不允许输出 estimated / quoted 结论。
3. 不允许泄露内部成本、利润、供应商、敏感信息，不允许站外导流。
4. 如果片段不足以支撑确定回答，必须快速 fallback，明确说明“当前知识库里没有足够依据”，并建议补充场景或转人工确认，不能等待更多结果。
5. 这是知识解释链路，不允许进入报价流程，不允许要求系统继续等待参数提取。
6. 回答要简洁、专业、像真实印刷客服，可直接发给客户。
7. 如果回答合适，可在结尾补一句：如需我按这个思路继续估价，请告诉我数量或规格。
8. 不要输出 markdown，不要输出 JSON。

原问题：${input.message}
检索查询：${input.rewrittenQuery}

可用知识片段：
${snippetText}`
}