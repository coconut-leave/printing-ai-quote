import type { ClarificationReason } from '@/lib/chat/clarification'

export type InputBoundaryBehavior =
  | 'clarify'
  | 'recommendation'
  | 'missing_fields'
  | 'estimated'
  | 'quoted'
  | 'handoff_required'

export type InputBoundarySample = {
  message: string
  expectedBehavior: InputBoundaryBehavior
  expectedClarificationReason?: ClarificationReason
  expectedIntent?: string
  note?: string
}

export const PURE_NOISE_INPUT_SAMPLES: InputBoundarySample[] = [
  { message: '111222', expectedBehavior: 'clarify', expectedClarificationReason: 'noisy_input' },
  { message: '666666', expectedBehavior: 'clarify', expectedClarificationReason: 'noisy_input' },
  { message: '。。。。。', expectedBehavior: 'clarify', expectedClarificationReason: 'noisy_input' },
  { message: 'asdadasd', expectedBehavior: 'clarify', expectedClarificationReason: 'noisy_input' },
  { message: 'qweqwe', expectedBehavior: 'clarify', expectedClarificationReason: 'noisy_input' },
  { message: '哈哈哈哈', expectedBehavior: 'clarify', expectedClarificationReason: 'unstable_intent' },
  { message: '额额额', expectedBehavior: 'clarify', expectedClarificationReason: 'unstable_intent' },
  { message: '？', expectedBehavior: 'clarify', expectedClarificationReason: 'noisy_input' },
  { message: '在吗', expectedBehavior: 'clarify', expectedClarificationReason: 'unstable_intent' },
  { message: '你好', expectedBehavior: 'clarify', expectedClarificationReason: 'unstable_intent' },
]

export const WEAK_BUSINESS_INPUT_SAMPLES: InputBoundarySample[] = [
  { message: '纸盒', expectedBehavior: 'clarify', expectedClarificationReason: 'unstable_intent' },
  { message: '飞机盒', expectedBehavior: 'clarify', expectedClarificationReason: 'unstable_intent' },
  { message: '双插盒', expectedBehavior: 'clarify', expectedClarificationReason: 'unstable_intent' },
  { message: '报价', expectedBehavior: 'clarify', expectedClarificationReason: 'unstable_intent' },
  { message: '价格', expectedBehavior: 'clarify', expectedClarificationReason: 'unstable_intent' },
  { message: '包装', expectedBehavior: 'clarify', expectedClarificationReason: 'unstable_intent' },
  { message: '做盒子', expectedBehavior: 'clarify', expectedClarificationReason: 'unstable_intent' },
]

export const AMBIGUOUS_CONSULTATION_SAMPLES: InputBoundarySample[] = [
  { message: '我想做个包装', expectedBehavior: 'recommendation', expectedIntent: 'SOLUTION_RECOMMENDATION' },
  { message: '我想做个盒子', expectedBehavior: 'recommendation', expectedIntent: 'SOLUTION_RECOMMENDATION' },
  { message: '你们这个怎么卖', expectedBehavior: 'clarify', expectedClarificationReason: 'unstable_intent', expectedIntent: 'UNKNOWN' },
  { message: '我做外包装', expectedBehavior: 'recommendation', expectedIntent: 'SOLUTION_RECOMMENDATION' },
  { message: '预算不高有什么推荐', expectedBehavior: 'recommendation', expectedIntent: 'SOLUTION_RECOMMENDATION' },
]

export const IRRELEVANT_FOLLOW_UP_SAMPLES: InputBoundarySample[] = [
  { message: '111222', expectedBehavior: 'clarify', expectedClarificationReason: 'blocked_context_reuse' },
  { message: '在吗', expectedBehavior: 'clarify', expectedClarificationReason: 'blocked_context_reuse' },
  { message: '你好', expectedBehavior: 'clarify', expectedClarificationReason: 'blocked_context_reuse' },
  { message: '哈哈', expectedBehavior: 'clarify', expectedClarificationReason: 'blocked_context_reuse' },
  { message: '男男女女男男女女', expectedBehavior: 'clarify', expectedClarificationReason: 'blocked_context_reuse' },
  { message: '挖洞啊文件哦大危机大宋', expectedBehavior: 'clarify', expectedClarificationReason: 'blocked_context_reuse' },
]

export const SHORT_PATCH_SAMPLES: Array<InputBoundarySample & { setup: 'quoted_main_packaging' | 'estimated_bundle' }> = [
  { message: '正面过哑胶', expectedBehavior: 'quoted', setup: 'quoted_main_packaging' },
  { message: '数量改成10000', expectedBehavior: 'quoted', setup: 'quoted_main_packaging' },
  { message: '贴纸不要了', expectedBehavior: 'estimated', setup: 'estimated_bundle' },
  { message: '再加说明书', expectedBehavior: 'missing_fields', setup: 'quoted_main_packaging' },
  { message: '改成双面黑白', expectedBehavior: 'estimated', setup: 'estimated_bundle' },
]

export const BOUNDARY_NO_CONTEXT_SAMPLES: InputBoundarySample[] = [
  { message: '就这个', expectedBehavior: 'clarify', expectedClarificationReason: 'unstable_intent' },
  { message: '按这个做', expectedBehavior: 'clarify', expectedClarificationReason: 'unstable_intent' },
  { message: '可以', expectedBehavior: 'clarify', expectedClarificationReason: 'unstable_intent' },
  { message: '行那你算吧', expectedBehavior: 'clarify', expectedClarificationReason: 'unstable_intent' },
  { message: '这个不要', expectedBehavior: 'clarify', expectedClarificationReason: 'unstable_intent' },
  { message: '那个改一下', expectedBehavior: 'clarify', expectedClarificationReason: 'unstable_intent' },
  { message: '我再看看', expectedBehavior: 'clarify', expectedClarificationReason: 'unstable_intent' },
]

export const BOUNDARY_RECOMMENDATION_CONTEXT_SAMPLES: InputBoundarySample[] = [
  { message: '就这个', expectedBehavior: 'recommendation', expectedIntent: 'RECOMMENDATION_CONFIRMATION' },
  { message: '按这个做', expectedBehavior: 'recommendation', expectedIntent: 'RECOMMENDATION_CONFIRMATION' },
  { message: '行那你算吧', expectedBehavior: 'recommendation', expectedIntent: 'RECOMMENDATION_CONFIRMATION' },
]

export const INPUT_BOUNDARY_SAMPLE_BUCKETS = [
  { key: 'pure_noise', label: '纯噪声输入', samples: PURE_NOISE_INPUT_SAMPLES },
  { key: 'weak_business', label: '弱业务输入', samples: WEAK_BUSINESS_INPUT_SAMPLES },
  { key: 'ambiguous_consultation', label: '模糊咨询', samples: AMBIGUOUS_CONSULTATION_SAMPLES },
  { key: 'irrelevant_follow_up', label: '已有报价后的无关输入', samples: IRRELEVANT_FOLLOW_UP_SAMPLES },
  { key: 'short_patch', label: '真正的补参/改单短句', samples: SHORT_PATCH_SAMPLES },
  { key: 'boundary_no_context', label: '无上下文的难判断边界句', samples: BOUNDARY_NO_CONTEXT_SAMPLES },
  { key: 'boundary_with_recommendation_context', label: '推荐上下文中的边界确认句', samples: BOUNDARY_RECOMMENDATION_CONTEXT_SAMPLES },
] as const