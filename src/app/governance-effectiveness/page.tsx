'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminPageNav } from '@/components/AdminPageNav'
import { GovernanceEffectivenessView } from '@/components/GovernanceEffectivenessView'
import type { GovernanceEffectivenessData } from '@/server/learning/governanceEffectiveness'

export default function GovernanceEffectivenessPage() {
  const [data, setData] = useState<GovernanceEffectivenessData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const response = await fetch('/api/governance-effectiveness', {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      const result = await response.json()
      if (result.ok) {
        setData(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch governance effectiveness:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='mx-auto max-w-7xl px-4 py-8'>
        <AdminPageNav current='governance-effectiveness' />
        <div className='mb-8 flex items-start justify-between gap-4'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900'>Governance Effectiveness</h1>
            <p className='mt-2 text-gray-600'>
              基于现有专项治理任务、action draft 和时间字段，观察治理前后问题是否下降、是否复发，以及哪些治理方向投入产出更高。
            </p>
          </div>
          <div className='flex gap-3'>
            <Link href='/governance-dashboard' className='rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50'>
              查看 Governance Dashboard
            </Link>
            <Link href='/learning-dashboard' className='rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50'>
              查看 Learning Dashboard
            </Link>
          </div>
        </div>

        <GovernanceEffectivenessView data={data} loading={loading} />
      </div>
    </div>
  )
}