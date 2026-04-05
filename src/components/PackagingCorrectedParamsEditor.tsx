import React from 'react'
import type { ReactNode } from 'react'
import {
  buildPackagingCorrectedParamsPayload,
  getPackagingFieldDisplayLabel,
  getPackagingFieldOptions,
  getPackagingItemFields,
  getPackagingProcessOptions,
  isPackagingBooleanField,
  isPackagingNumericField,
  isPackagingStringListField,
  type PackagingCorrectedParamsDraft,
  type PackagingDraftItem,
} from '@/lib/reflection/packagingCorrectedParams'
import { type ReflectionIssueType } from '@/lib/reflection/issueTypes'

type PackagingCorrectedParamsEditorProps = {
  issueType: ReflectionIssueType
  draft: PackagingCorrectedParamsDraft
  onMainItemFieldChange: (field: string, value: unknown) => void
  onSubItemFieldChange: (index: number, field: string, value: unknown) => void
  onAddSubItem: (productType: string) => void
  onRemoveSubItem: (index: number) => void
  onReviewReasonChange: (index: number, field: 'label' | 'message', value: string) => void
  onAddReviewReason: () => void
  onRemoveReviewReason: (index: number) => void
  onRequiresHumanReviewChange: (value: boolean) => void
}

function joinListValue(value: unknown): string {
  return Array.isArray(value) ? value.join('、') : ''
}

function renderInputField(
  item: PackagingDraftItem,
  field: string,
  onChange: (field: string, value: unknown) => void,
  scopeKey: string
) {
  const label = getPackagingFieldDisplayLabel(item.productType, field)
  const options = getPackagingFieldOptions(field)
  const fieldId = `${scopeKey}-${field}`

  if (field === 'processes') {
    const selectedValues = Array.isArray(item.processes) ? item.processes : []

    return (
      <div key={field} className='md:col-span-2'>
        <div className='mb-1 block font-medium text-slate-700'>{label}</div>
        <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
          {getPackagingProcessOptions().map((option) => {
            const checked = selectedValues.includes(option.value)
            return (
              <label key={option.value} className='flex items-center gap-2 rounded border px-3 py-2 text-sm text-slate-700'>
                <input
                  type='checkbox'
                  checked={checked}
                  onChange={(event) => {
                    const nextValues = event.target.checked
                      ? [...selectedValues, option.value]
                      : selectedValues.filter((value) => value !== option.value)
                    onChange(field, nextValues)
                  }}
                />
                <span>{option.label}</span>
              </label>
            )
          })}
        </div>
      </div>
    )
  }

  if (isPackagingBooleanField(field)) {
    return (
      <label key={field} htmlFor={fieldId} className='flex items-center gap-2 rounded border px-3 py-2 text-sm text-slate-700'>
        <input
          id={fieldId}
          type='checkbox'
          checked={Boolean(item[field])}
          onChange={(event) => onChange(field, event.target.checked)}
        />
        <span>{label}</span>
      </label>
    )
  }

  if (options.length > 0) {
    return (
      <label key={field} htmlFor={fieldId} className='text-sm'>
        <span className='mb-1 block font-medium text-slate-700'>{label}</span>
        <select
          id={fieldId}
          value={typeof item[field] === 'string' ? item[field] : ''}
          onChange={(event) => onChange(field, event.target.value)}
          className='w-full rounded border px-3 py-2 text-sm'
        >
          <option value=''>请选择</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    )
  }

  if (isPackagingStringListField(field)) {
    return (
      <label key={field} htmlFor={fieldId} className='text-sm'>
        <span className='mb-1 block font-medium text-slate-700'>{label}</span>
        <input
          id={fieldId}
          value={joinListValue(item[field])}
          onChange={(event) => onChange(field, event.target.value)}
          placeholder='多个值可用 顿号 / 逗号 分隔'
          className='w-full rounded border px-3 py-2 text-sm'
        />
      </label>
    )
  }

  return (
    <label key={field} htmlFor={fieldId} className='text-sm'>
      <span className='mb-1 block font-medium text-slate-700'>{label}</span>
      <input
        id={fieldId}
        type={isPackagingNumericField(field) ? 'number' : 'text'}
        step={isPackagingNumericField(field) ? 'any' : undefined}
        value={item[field] ?? ''}
        onChange={(event) => onChange(field, isPackagingNumericField(field) ? event.target.value : event.target.value)}
        className='w-full rounded border px-3 py-2 text-sm'
      />
    </label>
  )
}

function PackagingItemSection({
  title,
  item,
  scopeKey,
  onFieldChange,
  action,
}: {
  title: string
  item: PackagingDraftItem
  scopeKey: string
  onFieldChange: (field: string, value: unknown) => void
  action?: ReactNode
}) {
  const fields = getPackagingItemFields(item.productType)

  return (
    <div className='rounded border border-slate-200 bg-slate-50 p-4'>
      <div className='mb-3 flex items-center justify-between gap-3'>
        <div>
          <div className='text-sm font-semibold text-slate-900'>{title}</div>
          <div className='text-xs text-slate-500'>按品类自动切换字段，提交时仍保存为结构化 correctedParams。</div>
        </div>
        {action}
      </div>
      <div className='grid gap-3 md:grid-cols-2'>
        {fields.map((field) => renderInputField(item, field, onFieldChange, scopeKey))}
      </div>
    </div>
  )
}

export function PackagingCorrectedParamsEditor({
  issueType,
  draft,
  onMainItemFieldChange,
  onSubItemFieldChange,
  onAddSubItem,
  onRemoveSubItem,
  onReviewReasonChange,
  onAddReviewReason,
  onRemoveReviewReason,
  onRequiresHumanReviewChange,
}: PackagingCorrectedParamsEditorProps) {
  const productTypeOptions = getPackagingFieldOptions('productType')
  const rawJson = JSON.stringify(buildPackagingCorrectedParamsPayload(draft), null, 2)
  const shouldShowReviewPanel = [
    'PACKAGING_REVIEW_REASON_WRONG',
    'SHOULD_ESTIMATE_BUT_QUOTED',
    'SHOULD_HANDOFF_BUT_NOT',
    'SHOULD_QUOTED_BUT_ESTIMATED',
  ].includes(issueType)

  return (
    <div className='space-y-4 rounded border border-indigo-100 bg-indigo-50/40 p-4'>
      <div>
        <div className='text-sm font-semibold text-slate-900'>包装专用 correctedParams 模板</div>
        <div className='mt-1 text-xs text-slate-500'>复杂包装 reflection 默认走表单编辑，避免手填 JSON；非包装问题类型仍保留原来的 JSON 输入。</div>
      </div>

      <PackagingItemSection
        title='主件'
        item={draft.packagingContext.mainItem}
        scopeKey='main-item'
        onFieldChange={onMainItemFieldChange}
      />

      <div className='space-y-3'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <div className='text-sm font-semibold text-slate-900'>配套件</div>
            <div className='text-xs text-slate-500'>支持新增、修改、删除 subItems，适合 bundle 结构纠偏。</div>
          </div>
          <div className='flex flex-wrap gap-2'>
            {productTypeOptions.map((option) => (
              <button
                key={option.value}
                type='button'
                onClick={() => onAddSubItem(option.value)}
                className='rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-100'
              >
                新增{option.label}
              </button>
            ))}
          </div>
        </div>

        {draft.packagingContext.subItems.length === 0 && (
          <div className='rounded border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500'>
            当前没有 subItems，可直接点击上方按钮新增。
          </div>
        )}

        {draft.packagingContext.subItems.map((item, index) => (
          <PackagingItemSection
            key={`${item.productType}-${index}`}
            title={`配套件 ${index + 1}`}
            item={item}
            scopeKey={`sub-item-${index}`}
            onFieldChange={(field, value) => onSubItemFieldChange(index, field, value)}
            action={(
              <button
                type='button'
                onClick={() => onRemoveSubItem(index)}
                className='rounded border border-red-200 bg-white px-3 py-1 text-xs text-red-600 hover:bg-red-50'
              >
                删除
              </button>
            )}
          />
        ))}
      </div>

      {shouldShowReviewPanel && (
        <div className='space-y-3 rounded border border-slate-200 bg-white p-4'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <div className='text-sm font-semibold text-slate-900'>复核与转人工</div>
              <div className='text-xs text-slate-500'>适用于复核原因错误、应转人工却未转人工、estimated / quoted 边界修正。</div>
            </div>
            <label className='flex items-center gap-2 text-sm text-slate-700'>
              <input
                type='checkbox'
                checked={Boolean(draft.packagingContext.requiresHumanReview)}
                onChange={(event) => onRequiresHumanReviewChange(event.target.checked)}
              />
              需要人工复核
            </label>
          </div>

          <div className='space-y-3'>
            {draft.packagingContext.reviewReasons.map((reason, index) => (
              <div key={`${reason.label}-${index}`} className='grid gap-3 rounded border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_2fr_auto]'>
                <label className='text-sm'>
                  <span className='mb-1 block font-medium text-slate-700'>复核标签</span>
                  <input
                    value={reason.label}
                    onChange={(event) => onReviewReasonChange(index, 'label', event.target.value)}
                    className='w-full rounded border px-3 py-2 text-sm'
                  />
                </label>
                <label className='text-sm'>
                  <span className='mb-1 block font-medium text-slate-700'>复核说明</span>
                  <input
                    value={reason.message}
                    onChange={(event) => onReviewReasonChange(index, 'message', event.target.value)}
                    className='w-full rounded border px-3 py-2 text-sm'
                  />
                </label>
                <div className='flex items-end'>
                  <button
                    type='button'
                    onClick={() => onRemoveReviewReason(index)}
                    className='rounded border border-red-200 bg-white px-3 py-2 text-xs text-red-600 hover:bg-red-50'
                  >
                    删除原因
                  </button>
                </div>
              </div>
            ))}

            <button
              type='button'
              onClick={onAddReviewReason}
              className='rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'
            >
              新增复核原因
            </button>
          </div>
        </div>
      )}

      <details className='rounded border border-slate-200 bg-white p-3'>
        <summary className='cursor-pointer text-sm font-medium text-slate-700'>查看原始 JSON</summary>
        <textarea
          readOnly
          value={rawJson}
          rows={12}
          className='mt-3 w-full rounded border bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700'
        />
      </details>
    </div>
  )
}