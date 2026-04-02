import { z } from 'zod'

const MAX_HANDOFF_REASON_LENGTH = 200
const MAX_ASSIGNEE_LENGTH = 80

const handoffRequestSchema = z.object({
  reason: z.string({ invalid_type_error: '转人工原因必须是字符串' })
    .trim()
    .max(MAX_HANDOFF_REASON_LENGTH, `转人工原因不能超过${MAX_HANDOFF_REASON_LENGTH}个字符`)
    .optional(),
  assignedTo: z.string({ invalid_type_error: 'assignedTo 必须是字符串' })
    .trim()
    .max(MAX_ASSIGNEE_LENGTH, `assignedTo 不能超过${MAX_ASSIGNEE_LENGTH}个字符`)
    .optional(),
})

export interface NormalizedHandoffRequest {
  reason: string
  assignedTo?: string
}

export function parseHandoffRequestPayload(payload: unknown): {
  success: true
  data: NormalizedHandoffRequest
} | {
  success: false
  error: string
} {
  if (payload !== undefined && (payload === null || typeof payload !== 'object' || Array.isArray(payload))) {
    return { success: false, error: '人工接管请求体必须是 JSON 对象' }
  }

  const result = handoffRequestSchema.safeParse(payload ?? {})
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message ?? '人工接管请求参数无效',
    }
  }

  const normalizedReason = result.data.reason && result.data.reason.length > 0
    ? result.data.reason
    : '人工接管请求'
  const normalizedAssignedTo = result.data.assignedTo && result.data.assignedTo.length > 0
    ? result.data.assignedTo
    : undefined

  return {
    success: true,
    data: {
      reason: normalizedReason,
      assignedTo: normalizedAssignedTo,
    },
  }
}