'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ActionDraftDashboardView } from '@/components/ActionDraftDashboardView'
import { AdminPageNav } from '@/components/AdminPageNav'
import type {
  ActionDraftDashboardStats,
  ActionDraftDashboardTimeRange,
} from '@/server/learning/actionDraftDashboard'
import type {
  ImprovementActionChangeType,
  ImprovementActionRiskLevel,
  ImprovementSuggestionStatus,
  ImprovementTargetArea,
} from '@/server/learning/improvementSuggestion'

type DashboardFilters = {
  timeRangeDays: ActionDraftDashboardTimeRange
  status: ImprovementSuggestionStatus | 'ALL'
  targetArea: ImprovementTargetArea | 'ALL'
  changeType: ImprovementActionChangeType | 'ALL'
  riskLevel: ImprovementActionRiskLevel | 'ALL'
}

export default function ActionDraftDashboardPage() {
  const [stats, setStats] = useState<ActionDraftDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<DashboardFilters>({
    timeRangeDays: 'ALL',
    status: 'ALL',
    targetArea: 'ALL',
    changeType: 'ALL',
    riskLevel: 'ALL',
  })

  useEffect(() => {
    fetchStats()
  }, [filters])

  async function fetchStats() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== 'ALL') {
          params.set(key, String(value))
        }
      })

      const response = await fetch(`/api/action-draft-dashboard?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      const data = await response.json()
      if (data.ok) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch action draft dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleFilterChange(field: keyof DashboardFilters, value: string) {
    setFilters((prev) => ({
      ...prev,
      [field]: field === 'timeRangeDays' && value !== 'ALL' ? Number(value) : value,
    }))
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='mx-auto max-w-7xl px-4 py-8'>
        <AdminPageNav current='action-draft-dashboard' />
        <div className='mb-8 flex items-start justify-between gap-4'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900'>Action Draft Dashboard</h1>
            <p className='mt-2 text-gray-600'>
              从单条 action draft 提升到按 targetArea、changeType、riskLevel、targetFileHint 的治理视角，帮助排序优先级，不自动改主链路。
            </p>
          </div>
          <div className='flex gap-3'>
            <Link href='/improvements' className='rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50'>
              查看 Improvements
            </Link>
            <Link href='/actions' className='rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50'>
              查看 Actions
            </Link>
          </div>
        </div>

        <ActionDraftDashboardView
          stats={stats}
          loading={loading}
          filters={filters}
          onFilterChange={handleFilterChange}
        />
      </div>
    </div>
  )
}