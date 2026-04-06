const BUSINESS_SIGNAL_KEYWORDS = [
  '报价', '价格', '多少钱', '询价', '核价', '推荐', '方案', '怎么做', '怎么选', '怎么卖',
  '画册', '册子', '传单', '名片', '海报',
  '飞机盒', '双插盒', '开窗彩盒', '开窗盒', '说明书', '内托', '封口贴', '贴纸', '包装', '包装盒', '彩盒', '纸盒', '纸箱', '盒子', '箱子',
  '尺寸', '规格', '数量', '页数', '材质', '工艺', '印色', '克重', '覆膜', '装订', '骑马钉', '胶装',
  '正面', '反面', '单面', '双面', '四色', '专色', '黑白', '过哑胶', '过光胶', '哑胶', '光胶', '哑膜', '光膜', '上光',
  '改', '修改', '换', '加', '新增', '删', '删除', '去掉', '不要', '补', '继续', '重算', '再算', '按这个', '按此', '照这个', '版本',
  '适合', '区别', '介绍', '建议', '估一下', '算一下', '先估', '先算',
  '人工', '客服', '业务员', '销售', '文件', '设计稿', '打样', '样品', '进度',
]

const CONTEXT_REUSE_ACTION_KEYWORDS = [
  '改', '修改', '换', '加', '新增', '删', '删除', '去掉', '不要', '补', '继续', '重算', '再算',
  '按这个', '按此', '照这个', '就这个', '这个方案', '上一个', '上一轮', '当前报价',
  '数量', '尺寸', '材质', '工艺', '印色', '克重', '页数',
]

const WEAK_BUSINESS_INPUTS = [
  '纸盒', '飞机盒', '双插盒', '报价', '价格', '包装', '做盒子',
]

const SPECIFIC_BUSINESS_OBJECT_KEYWORDS = [
  '画册', '册子', '传单', '名片', '海报',
  '飞机盒', '双插盒', '开窗彩盒', '开窗盒', '说明书', '内托', '封口贴', '贴纸',
  '尺寸', '规格', '数量', '页数', '材质', '工艺', '印色', '克重', '覆膜', '装订', '骑马钉', '胶装',
]

const PARAMETER_UNIT_PATTERN = /\d+\s*(本|张|份|个|套|页|mm|cm|m|g|克|pcs|pc)|([aA]\d\b)|(\d+\s*[xX×]\s*\d+)/u

export type StableBusinessInputDecision = {
  shouldBlock: boolean
  reason: string
  reply?: string
}

function normalizeText(message: string): string {
  return message.trim().toLowerCase()
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword))
}

function hasHan(text: string): boolean {
  return /\p{Script=Han}/u.test(text)
}

export function hasConcreteBusinessSignal(message: string): boolean {
  const text = normalizeText(message)
  if (!text) {
    return false
  }

  return includesAny(text, BUSINESS_SIGNAL_KEYWORDS) || PARAMETER_UNIT_PATTERN.test(text)
}

export function looksLikeContextReuseAction(message: string): boolean {
  const text = normalizeText(message)
  return includesAny(text, CONTEXT_REUSE_ACTION_KEYWORDS) || PARAMETER_UNIT_PATTERN.test(text)
}

export function looksLikeAbnormalNoiseInput(message: string): boolean {
  const text = normalizeText(message)
  if (!text) {
    return true
  }

  if (/^[0-9]+$/u.test(text)) {
    return true
  }

  if (/^[^\p{Script=Han}a-zA-Z0-9]+$/u.test(text)) {
    return true
  }

  if (/^[a-z0-9_~`!@#$%^&*()+=[\]{}\\|;:'",.<>/?\-]{6,}$/i.test(text) && !/\s/.test(text)) {
    return true
  }

  return !hasHan(text) && !/[a-z]/i.test(text)
}

function hasSpecificBusinessObject(message: string): boolean {
  const text = normalizeText(message)
  return includesAny(text, SPECIFIC_BUSINESS_OBJECT_KEYWORDS) || PARAMETER_UNIT_PATTERN.test(text)
}

function looksLikeWeakBusinessInput(message: string): boolean {
  const text = normalizeText(message)
  if (!text || text.length > 8) {
    return false
  }

  if (PARAMETER_UNIT_PATTERN.test(text)) {
    return false
  }

  if (includesAny(text, ['推荐', '方案', '怎么选', '怎么做', '怎么卖', '多少钱', '预算'])) {
    return false
  }

  if (WEAK_BUSINESS_INPUTS.includes(text)) {
    return true
  }

  return /^(做|做个)(盒子|纸盒|包装|外包装)$/u.test(text)
}

function looksLikeVagueReferenceInput(message: string): boolean {
  const text = normalizeText(message)
  if (!text.includes('这个') && !text.includes('那个')) {
    return false
  }

  if (hasSpecificBusinessObject(text)) {
    return false
  }

  return includesAny(text, [
    '怎么卖', '多少钱', '报价', '价格',
    '按这个', '按此', '照这个', '就这个', '按这个做', '这个不要', '那个改一下',
  ])
}

export function buildUnstableBusinessInputReply(message: string, hasContext: boolean): string {
  if (looksLikeAbnormalNoiseInput(message)) {
    return hasContext
      ? '抱歉，我暂时没法确认您这条是在继续当前报价。请直接说明产品、尺寸、数量、材质或工艺；如果方便，我也可以直接帮您转人工。'
      : '抱歉，我暂时没法稳定识别您这条需求。请直接描述产品、尺寸、数量和工艺；如果需要，我也可以帮您转人工。'
  }

  return hasContext
    ? '抱歉，我这边没法确认您这条是在继续当前报价。您可以直接告诉我是想补参数、改数量/材质、加子项、删子项，还是我直接帮您转人工。'
    : '抱歉，我暂时没法稳定理解您这条需求。您可以换一种说法，直接告诉我产品、尺寸、数量和工艺；如果需要，我也可以帮您转人工。'
}

export function assessStableBusinessInput(params: {
  message: string
  hasContext: boolean
}): StableBusinessInputDecision {
  const text = normalizeText(params.message)
  if (!text) {
    return {
      shouldBlock: true,
      reason: 'empty_message',
      reply: buildUnstableBusinessInputReply(params.message, params.hasContext),
    }
  }

  if (looksLikeAbnormalNoiseInput(text)) {
    return {
      shouldBlock: true,
      reason: 'unstable_or_noise_input',
      reply: buildUnstableBusinessInputReply(params.message, params.hasContext),
    }
  }

  if (!params.hasContext && looksLikeWeakBusinessInput(text)) {
    return {
      shouldBlock: true,
      reason: 'weak_business_input',
      reply: buildUnstableBusinessInputReply(params.message, false),
    }
  }

  if (!params.hasContext && looksLikeVagueReferenceInput(text)) {
    return {
      shouldBlock: true,
      reason: 'unstable_reference_input',
      reply: buildUnstableBusinessInputReply(params.message, false),
    }
  }

  if (!hasConcreteBusinessSignal(text) && !looksLikeContextReuseAction(text)) {
    if (params.hasContext) {
      return {
        shouldBlock: true,
        reason: 'context_reuse_not_stable',
        reply: buildUnstableBusinessInputReply(params.message, true),
      }
    }

    if (!/[？?]/u.test(text) && text.length <= 12) {
      return {
        shouldBlock: true,
        reason: 'cannot_stably_answer_input',
        reply: buildUnstableBusinessInputReply(params.message, false),
      }
    }
  }

  return {
    shouldBlock: false,
    reason: 'stable_business_input',
  }
}