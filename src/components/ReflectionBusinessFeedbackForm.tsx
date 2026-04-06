'use client'

import type { ReflectionIssueType } from '@/lib/reflection/issueTypes'
import {
  REFLECTION_BUSINESS_HANDLING_OPTIONS,
  REFLECTION_BUSINESS_HANDOFF_OPTIONS,
  REFLECTION_BUSINESS_ISSUE_TYPE_OPTIONS,
  type ReflectionBusinessFeedback,
} from '@/lib/reflection/businessFeedback'

type ReflectionBusinessFeedbackFormProps = {
  issueType: ReflectionIssueType
  feedback: ReflectionBusinessFeedback
  onIssueTypeChange: (value: ReflectionIssueType) => void
  onFeedbackChange: (field: keyof ReflectionBusinessFeedback, value: string) => void
}

export function ReflectionBusinessFeedbackForm(props: ReflectionBusinessFeedbackFormProps) {
  return (
    <div className='grid gap-3'>
      <label className='text-sm'>
        <span className='mb-1 block font-medium text-slate-700'>问题类型</span>
        <select
          value={props.issueType}
          onChange={(event) => props.onIssueTypeChange(event.target.value as ReflectionIssueType)}
          className='w-full rounded border border-gray-300 px-3 py-2 text-sm'
        >
          {REFLECTION_BUSINESS_ISSUE_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>

      <label className='text-sm'>
        <span className='mb-1 block font-medium text-slate-700'>问题说明</span>
        <textarea
          value={props.feedback.problemSummary || ''}
          onChange={(event) => props.onFeedbackChange('problemSummary', event.target.value)}
          rows={4}
          placeholder='例如：客户只发了数字串，系统却把它当成画册缺参数报价。'
          className='w-full rounded border border-gray-300 px-3 py-2 text-sm'
        />
      </label>

      <label className='text-sm'>
        <span className='mb-1 block font-medium text-slate-700'>正确处理方式</span>
        <select
          value={props.feedback.correctHandling || ''}
          onChange={(event) => props.onFeedbackChange('correctHandling', event.target.value)}
          className='w-full rounded border border-gray-300 px-3 py-2 text-sm'
        >
          <option value=''>请选择</option>
          {REFLECTION_BUSINESS_HANDLING_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>

      <label className='text-sm'>
        <span className='mb-1 block font-medium text-slate-700'>正确结果 / 正确价格</span>
        <textarea
          value={props.feedback.correctResult || ''}
          onChange={(event) => props.onFeedbackChange('correctResult', event.target.value)}
          rows={3}
          placeholder='例如：应提示“无法识别，请重新描述”；或“正确价格应为 ¥1980”。'
          className='w-full rounded border border-gray-300 px-3 py-2 text-sm'
        />
      </label>

      <label className='text-sm'>
        <span className='mb-1 block font-medium text-slate-700'>是否应该转人工</span>
        <select
          value={props.feedback.shouldHandoff || 'unsure'}
          onChange={(event) => props.onFeedbackChange('shouldHandoff', event.target.value)}
          className='w-full rounded border border-gray-300 px-3 py-2 text-sm'
        >
          {REFLECTION_BUSINESS_HANDOFF_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>

      <label className='text-sm'>
        <span className='mb-1 block font-medium text-slate-700'>补充备注</span>
        <textarea
          value={props.feedback.notes || ''}
          onChange={(event) => props.onFeedbackChange('notes', event.target.value)}
          rows={3}
          placeholder='可填写客户背景、业务判断依据或后续跟进说明。'
          className='w-full rounded border border-gray-300 px-3 py-2 text-sm'
        />
      </label>
    </div>
  )
}