'use client'

import React from 'react'
import type { GovernanceThemeRecommendationSummary } from '@/server/learning/governancePlanAdoption'
import { formatThemeQualityLabel, getThemeQualityBadgeClass } from '@/lib/governanceThemeQuality'

type GovernanceThemeQualitySummaryListProps = {
  title: string
  items: GovernanceThemeRecommendationSummary[]
  emptyText: string
  description?: string
}

function formatPriorityLevel(value: string) {
  const map: Record<string, string> = {
    HIGH: '高优先级',
    MEDIUM: '中优先级',
    LOW: '低优先级',
  }
  return map[value] || value
}

export function GovernanceThemeQualitySummaryList(props: GovernanceThemeQualitySummaryListProps) {
  const { title, items, emptyText, description } = props

  return (
    <div className='rounded-lg bg-white p-6 shadow'>
      <div className='mb-4 flex items-start justify-between gap-3'>
        <div>
          <h2 className='text-lg font-semibold text-gray-900'>{title}</h2>
          {description && <p className='mt-1 text-sm text-gray-600'>{description}</p>}
        </div>
      </div>
      {items.length === 0 ? (
        <div className='rounded border border-dashed border-gray-200 p-4 text-sm text-gray-600'>{emptyText}</div>
      ) : (
        <div className='space-y-3'>
          {items.map((item) => (
            <div key={item.governanceTheme} className='rounded border border-gray-100 p-4'>
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <div className='font-medium text-gray-900'>{item.governanceTheme}</div>
                  <div className='mt-1 text-xs text-gray-500'>
                    {formatThemeQualityLabel(item.themeQualityLabel)} / 最高优先级 {formatPriorityLevel(item.highestPriorityLevel)}
                  </div>
                </div>
                <div className={getThemeQualityBadgeClass(item.themeQualityLabel)}>{formatThemeQualityLabel(item.themeQualityLabel)}</div>
              </div>
              <div className='mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 md:grid-cols-3'>
                <div>计划数 {item.planCount}</div>
                <div>已采纳 {item.acceptedCount}</div>
                <div>采纳率 {item.acceptedRate}%</div>
                <div>进入执行 {item.enteredExecutionCount}</div>
                <div>改善计划 {item.improvingCount}</div>
                <div>复发累计 {item.recurringCount}</div>
              </div>
              <div className='mt-3 text-xs text-gray-600'>{item.recommendationQualitySummary}</div>
              <div className='mt-2 rounded bg-slate-50 p-3 text-xs text-slate-700'>{item.themePriorityHint}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}