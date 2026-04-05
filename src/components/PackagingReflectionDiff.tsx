import React from 'react'

import {
  buildPackagingReflectionDiff,
  getPackagingDiffSideSummary,
  getPackagingReasonChangeLabel,
  getPackagingSubItemChangeLabel,
  type PackagingReflectionDiff as PackagingReflectionDiffView,
} from '@/lib/reflection/packagingDiff'
import { type ReflectionIssueType } from '@/lib/reflection/issueTypes'

function DiffFieldList({
  changes,
}: {
  changes: PackagingReflectionDiffView['mainItemChanges']
}) {
  return (
    <div className='space-y-2'>
      {changes.map((change) => (
        <div key={`${change.field}-${change.before}-${change.after}`} className='rounded bg-white px-3 py-2 text-sm text-slate-700'>
          <span className='font-medium text-slate-900'>{change.label}</span>
          <span>：{change.before} -&gt; {change.after}</span>
        </div>
      ))}
    </div>
  )
}

export function PackagingReflectionDiff({
  issueType,
  originalExtractedParams,
  correctedParams,
}: {
  issueType: ReflectionIssueType
  originalExtractedParams?: Record<string, any> | null
  correctedParams?: Record<string, any> | null
}) {
  const diff = buildPackagingReflectionDiff({
    issueType,
    originalExtractedParams,
    correctedParams,
  })

  if (!diff) {
    return null
  }

  return (
    <div className='mt-3 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4'>
      <div>
        <h3 className='text-sm font-semibold text-slate-900'>AI 原始结果 vs 人工 correctedParams</h3>
        <p className='mt-1 text-xs text-slate-500'>默认按可读 diff 展示主件、子组件、结果和复核原因变化，避免直接给业务同学看大段 JSON。</p>
      </div>

      <div className='grid gap-3 md:grid-cols-2'>
        <div className='rounded bg-white p-3'>
          <div className='text-sm font-semibold text-slate-900'>AI 原始结果</div>
          <div className='mt-2 space-y-1 text-sm text-slate-700'>
            {getPackagingDiffSideSummary(diff.originalContext, diff.originalStatus).map((item) => (
              <div key={item}>{item}</div>
            ))}
          </div>
        </div>
        <div className='rounded bg-white p-3'>
          <div className='text-sm font-semibold text-slate-900'>人工 correctedParams</div>
          <div className='mt-2 space-y-1 text-sm text-slate-700'>
            {getPackagingDiffSideSummary(diff.correctedContext, diff.correctedStatus).map((item) => (
              <div key={item}>{item}</div>
            ))}
          </div>
        </div>
      </div>

      <section>
        <div className='mb-2 text-sm font-semibold text-slate-900'>主件差异</div>
        {diff.mainItemChanges.length > 0 ? (
          <DiffFieldList changes={diff.mainItemChanges} />
        ) : (
          <div className='rounded bg-white px-3 py-2 text-sm text-slate-500'>当前没有主件字段变化。</div>
        )}
      </section>

      <section>
        <div className='mb-2 text-sm font-semibold text-slate-900'>子组件变化</div>
        {diff.subItemChanges.length > 0 ? (
          <div className='space-y-3'>
            {diff.subItemChanges.map((change) => (
              <div key={`${change.type}-${change.title}-${change.productType || 'unknown'}`} className='rounded bg-white p-3 text-sm text-slate-700'>
                <div className='font-medium text-slate-900'>{getPackagingSubItemChangeLabel(change)}</div>
                {change.fieldChanges.length > 0 && (
                  <div className='mt-2'>
                    <DiffFieldList changes={change.fieldChanges} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className='rounded bg-white px-3 py-2 text-sm text-slate-500'>当前没有子组件变化。</div>
        )}
      </section>

      <section>
        <div className='mb-2 text-sm font-semibold text-slate-900'>结果与审核变化</div>
        {diff.resultChanges.length > 0 ? (
          <DiffFieldList changes={diff.resultChanges} />
        ) : (
          <div className='rounded bg-white px-3 py-2 text-sm text-slate-500'>当前没有结果或人工复核变化。</div>
        )}
      </section>

      <section>
        <div className='mb-2 text-sm font-semibold text-slate-900'>复核原因变化</div>
        {diff.reviewReasonChanges.length > 0 ? (
          <div className='space-y-2'>
            {diff.reviewReasonChanges.map((change) => (
              <div key={`${change.type}-${change.label}`} className='rounded bg-white px-3 py-2 text-sm text-slate-700'>
                {getPackagingReasonChangeLabel(change)}
              </div>
            ))}
          </div>
        ) : (
          <div className='rounded bg-white px-3 py-2 text-sm text-slate-500'>当前没有复核原因变化。</div>
        )}
      </section>

      <details className='rounded bg-white p-3'>
        <summary className='cursor-pointer text-sm font-medium text-slate-700'>查看原始 JSON</summary>
        <div className='mt-3 grid gap-3 md:grid-cols-2'>
          <div>
            <div className='mb-1 text-xs font-medium text-slate-500'>AI 原始结果</div>
            <pre className='overflow-x-auto rounded bg-slate-50 p-3 text-xs text-slate-700'>
              {JSON.stringify(diff.originalRaw, null, 2)}
            </pre>
          </div>
          <div>
            <div className='mb-1 text-xs font-medium text-slate-500'>人工 correctedParams</div>
            <pre className='overflow-x-auto rounded bg-slate-50 p-3 text-xs text-slate-700'>
              {JSON.stringify(diff.correctedRaw, null, 2)}
            </pre>
          </div>
        </div>
      </details>
    </div>
  )
}