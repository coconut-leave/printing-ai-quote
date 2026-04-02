import { NextResponse } from 'next/server'

// 统一错误响应格式
export interface ApiErrorResponse {
  ok: false
  error: string
  code?: string
  requestId?: string
}

// 统一成功响应格式（可选）
export interface ApiSuccessResponse<T = any> {
  ok: true
  data?: T
  message?: string
}

// 错误代码枚举
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  BAD_REQUEST = 'BAD_REQUEST',
}

// 环境判断
const isProduction = process.env.NODE_ENV === 'production'

type LogLevel = 'INFO' | 'WARN' | 'ERROR'

// 生成轻量 requestId（可选）
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function formatLogLine(level: LogLevel, message: string, context?: string): string {
  const timestamp = new Date().toISOString()
  return `[${timestamp}] ${level}${context ? ` [${context}]` : ''}: ${message}`
}

function sanitizeLogDetails(details: unknown): unknown {
  if (!details || typeof details !== 'object') {
    return details
  }

  return JSON.parse(JSON.stringify(details, (_key, value) => {
    if (typeof value !== 'string') {
      return value
    }

    if (value.includes('postgres://') || value.includes('postgresql://')) {
      return '[REDACTED_DATABASE_URL]'
    }

    if (value.startsWith('sk-')) {
      return '[REDACTED_OPENAI_KEY]'
    }

    return value
  }))
}

// 创建成功响应
export function createSuccessResponse<T = any>(
  data?: T,
  message?: string,
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      ok: true,
      ...(data !== undefined && { data }),
      ...(message && { message }),
    },
    { status }
  )
}

// 创建错误响应
export function createErrorResponse(
  error: string,
  code?: ErrorCode,
  status = 500,
  includeRequestId = true
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    ok: false,
    error,
    ...(code && { code }),
    ...(includeRequestId && { requestId: generateRequestId() }),
  }

  return NextResponse.json(response, { status })
}

// 将未知异常转换为安全错误消息
export function safeErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    // 生产环境：隐藏敏感信息
    if (isProduction) {
      // 检查是否是已知的安全错误类型
      if (err.message.includes('OPENAI_API_KEY') ||
          err.message.includes('api key') ||
          err.message.includes('database') ||
          err.message.includes('connection') ||
          err.message.includes('stack')) {
        return '服务暂时不可用，请稍后重试'
      }
      // 对于其他错误，返回通用消息
      return '操作失败，请稍后重试'
    } else {
      // 开发环境：保留适度调试信息，但过滤敏感信息
      let message = err.message
      // 移除可能的敏感信息
      message = message.replace(/OPENAI_API_KEY[^&\s]*/gi, '[REDACTED]')
      message = message.replace(/password[^&\s]*/gi, '[REDACTED]')
      message = message.replace(/Bearer\s+[^&\s]*/gi, 'Bearer [REDACTED]')
      return message
    }
  }

  return '未知错误，请稍后重试'
}

// 记录错误日志（服务端使用）
export function logError(err: unknown, context?: string): void {
  const errorMessage = err instanceof Error ? err.message : String(err)
  const errorStack = err instanceof Error ? err.stack : undefined

  console.error(formatLogLine('ERROR', errorMessage, context))

  // 生产环境记录更多调试信息到日志
  if (isProduction && errorStack) {
    console.error(formatLogLine('ERROR', 'stack trace follows', context))
    console.error(errorStack)
  }
}

export function logInfo(message: string, context?: string, details?: unknown): void {
  console.info(formatLogLine('INFO', message, context))
  if (details !== undefined) {
    console.info(sanitizeLogDetails(details))
  }
}

export function logWarn(message: string, context?: string, details?: unknown): void {
  console.warn(formatLogLine('WARN', message, context))
  if (details !== undefined) {
    console.warn(sanitizeLogDetails(details))
  }
}

// 通用 API 路由错误处理包装器
export async function withErrorHandler(
  handler: () => Promise<NextResponse<any>>,
  context?: string
): Promise<NextResponse<any>> {
  try {
    return await handler()
  } catch (err) {
    logError(err, context)

    const safeMessage = safeErrorMessage(err)
    let code: ErrorCode = ErrorCode.INTERNAL_ERROR
    let status = 500

    // 根据错误类型设置适当的代码和状态
    if (err instanceof Error) {
      if (err.message.includes('not found') || err.message.includes('Not found')) {
        code = ErrorCode.NOT_FOUND
        status = 404
      } else if (err.message.includes('validation') || err.message.includes('Invalid')) {
        code = ErrorCode.VALIDATION_ERROR
        status = 400
      } else if (err.message.includes('unauthorized') || err.message.includes('Unauthorized')) {
        code = ErrorCode.UNAUTHORIZED
        status = 401
      } else if (err.message.includes('OpenAI') || err.message.includes('API')) {
        code = ErrorCode.EXTERNAL_SERVICE_ERROR
        status = 502
      } else if (err.message.includes('database') || err.message.includes('prisma')) {
        code = ErrorCode.DATABASE_ERROR
        status = 500
      }
    }

    return createErrorResponse(safeMessage, code, status)
  }
}