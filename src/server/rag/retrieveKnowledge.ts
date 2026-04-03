import { KNOWLEDGE_REGISTRY } from '@/server/knowledge/registry'

export type KnowledgeSnippet = {
  id: string
  title: string
  source: string
  category: string
  content: string
  keywords: string[]
  score?: number
}

type RetrieveKnowledgeInput = {
  query: string
  topK?: number
  conversationId?: number
  requestId?: string
}

const LOCAL_RAG_DOCUMENTS: KnowledgeSnippet[] = [
  {
    id: 'faq-sample-proofing',
    title: '打样说明',
    source: 'local_faq',
    category: 'FAQ',
    keywords: ['打样', '样品', '样张', '样册', 'proof'],
    content: '打样主要用于确认版式、颜色预期、纸张和基础工艺方向。常见做法是先确认核心规格，再决定是否安排正式打样；如果涉及复杂颜色控制、专色、特殊材质或正式打样排期，建议转人工确认。',
  },
  {
    id: 'faq-delivery-lead-time',
    title: '交期说明',
    source: 'local_faq',
    category: 'FAQ',
    keywords: ['交期', '工期', '多久', '发货', '交货', '周期', '排产'],
    content: '常见交期会受数量、纸张、装订和后道工艺、是否需要打样以及排产情况影响。标准品可以先解释为“确认参数后进入排产，复杂工艺或高峰期会延长”；最终交期仍应以人工确认和实际排产为准。',
  },
  {
    id: 'faq-general-case-company-brochure',
    title: '案例说明：企业宣传册',
    source: 'local_case',
    category: 'CASE',
    keywords: ['案例', '企业宣传册', '企业画册', '产品目录', '常见做法'],
    content: '企业宣传册常见会先明确用途、内容量和目标受众，再从 A4、24 到 32 页、较正式装订起步。案例说明只能帮助理解常见配置思路，不代表最终价格或生产承诺。',
  },
]

function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(/[a-z0-9]+|[\u4e00-\u9fff]{1,6}/g) || []
  return Array.from(new Set(matches.filter((token) => token.trim().length > 0)))
}

function buildKnowledgeCorpus(): KnowledgeSnippet[] {
  const registrySnippets = KNOWLEDGE_REGISTRY.map((card) => ({
    id: card.id,
    title: card.title,
    source: 'knowledge_registry',
    category: card.category,
    keywords: [...card.aliases, ...card.keywords],
    content: [card.shortAnswer, card.note].filter(Boolean).join(' '),
  }))

  return [...registrySnippets, ...LOCAL_RAG_DOCUMENTS]
}

function scoreSnippet(query: string, snippet: KnowledgeSnippet): number {
  const terms = tokenize(query)
  const title = snippet.title.toLowerCase()
  const content = snippet.content.toLowerCase()
  const keywords = snippet.keywords.map((keyword) => keyword.toLowerCase())

  let score = 0
  for (const term of terms) {
    if (title.includes(term)) score += 5
    if (content.includes(term)) score += 2
    if (keywords.some((keyword) => keyword.includes(term) || term.includes(keyword))) score += 4
  }

  if (query && title.includes(query.toLowerCase())) {
    score += 6
  }

  return score
}

export function getKnowledgeSnippetCorpus(): KnowledgeSnippet[] {
  return buildKnowledgeCorpus()
}

export function retrieveKnowledge(input: RetrieveKnowledgeInput): KnowledgeSnippet[] {
  const topK = input.topK ?? 3
  const query = input.query.trim()

  if (!query) {
    return []
  }

  const hits = buildKnowledgeCorpus()
    .map((snippet) => ({
      ...snippet,
      score: scoreSnippet(query, snippet),
    }))
    .filter((snippet) => (snippet.score || 0) > 0)
    .sort((left, right) => (right.score || 0) - (left.score || 0))
    .slice(0, topK)

  return hits
}