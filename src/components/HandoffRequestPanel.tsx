'use client'

import { useMemo, useState } from 'react'

type HandoffRequestPanelProps = {
  conversationId: number | null | undefined
  statusLabel?: string
  summary: string
  reason?: string
  assignedTo?: string
  existingHandoffCount?: number
  alreadyPending?: boolean
  triggerLabel?: string
  onSubmitted?: () => Promise<void> | void
}

function buildRequestReason(baseReason: string, note: string): string {
  const trimmedBaseReason = baseReason.trim() || '人工接管请求'
  const trimmedNote = note.trim()

  if (!trimmedNote) {
    return trimmedBaseReason
  }

  return `${trimmedBaseReason} | 补充备注：${trimmedNote}`
}

export function HandoffRequestPanel(props: HandoffRequestPanelProps) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const resolvedReason = useMemo(() => {
    return props.reason?.trim() || '当前会话已进入待人工处理流程。'
  }, [props.reason])

  const triggerLabel = props.triggerLabel
    || (props.alreadyPending ? '查看人工处理说明' : '转人工服务')

  async function handleSubmit() {
    if (!props.conversationId || submitting) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/conversations/${props.conversationId}/handoff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          reason: buildRequestReason(resolvedReason, note),
          assignedTo: props.assignedTo || 'sales_team',
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.ok) {
        setError(data.message || data.error || '提交人工处理失败')
        return
      }

      setSuccessMessage('已转人工处理，当前状态已更新。')
      setOpen(false)
      setNote('')
      await props.onSubmitted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交人工处理失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (!props.conversationId) {
    return null
  }

  return (
    <div className='space-y-3'>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className={props.alreadyPending
          ? 'rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-900 hover:bg-orange-100'
          : 'rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700'}
      >
        {triggerLabel}
      </button>

      {successMessage && (
        <div className='rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800'>
          {successMessage}
        </div>
      )}

      {error && (
        <div className='rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
          {error}
        </div>
      )}

      {open && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4'>
          <div className='w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p className='text-sm font-medium tracking-[0.18em] text-slate-500'>人工协同</p>
                <h3 className='mt-2 text-xl font-bold text-slate-900'>人工处理入口</h3>
                <p className='mt-2 text-sm text-slate-600'>
                  {props.alreadyPending
                    ? '当前会话已经处于人工处理状态。您可以查看说明，或补充一条人工处理备注。'
                    : '当前会话可提交给人工客服继续处理。'}
                </p>
              </div>
              <button
                type='button'
                onClick={() => setOpen(false)}
                className='rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50'
              >
                关闭
              </button>
            </div>

            <div className='mt-5 grid gap-4 md:grid-cols-2'>
              <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                <p className='text-sm font-semibold text-slate-900'>当前会话摘要</p>
                <p className='mt-2 text-sm leading-6 text-slate-700'>{props.summary}</p>
              </div>
              <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                <p className='text-sm font-semibold text-slate-900'>人工处理说明</p>
                <p className='mt-2 text-sm leading-6 text-slate-700'>{resolvedReason}</p>
                <div className='mt-3 space-y-1 text-xs text-slate-500'>
                  {props.statusLabel && <div>当前状态：{props.statusLabel}</div>}
                  {typeof props.existingHandoffCount === 'number' && <div>已有人工处理记录：{props.existingHandoffCount} 条</div>}
                </div>
              </div>
            </div>

            <label className='mt-5 block text-sm'>
              <span className='mb-2 block font-medium text-slate-900'>可选备注</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                placeholder='例如：客户希望尽快安排人工核价；已有设计稿待进一步沟通。'
                className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500'
              />
            </label>

            <div className='mt-5 flex flex-wrap items-center justify-between gap-3'>
              <p className='text-xs text-slate-500'>
                提交后会复用现有人工接管 API 更新状态与记录，不会新增新的后端流程。
              </p>
              <div className='flex gap-2'>
                <button
                  type='button'
                  onClick={() => setOpen(false)}
                  className='rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'
                >
                  取消
                </button>
                <button
                  type='button'
                  onClick={handleSubmit}
                  disabled={submitting}
                  className='rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {submitting ? '提交中...' : props.alreadyPending ? '补充人工备注' : '提交给人工客服'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}