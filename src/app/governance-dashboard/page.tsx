'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { GovernanceDashboardView } from '@/components/GovernanceDashboardView'
import { AdminPageNav } from '@/components/AdminPageNav'
import type { GovernanceCampaignStatus } from '@/server/learning/governanceCampaign'
import type { GovernanceAssignmentSource, GovernanceRecommendationRole } from '@/server/learning/governanceAssignment'
import type { GovernancePlanDecisionType } from '@/server/learning/governancePlanning'
import type {
  GovernanceWorkbenchData,
} from '@/server/learning/governanceWorkbench'

export default function GovernanceDashboardPage() {
  const [data, setData] = useState<GovernanceWorkbenchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [campaignTitle, setCampaignTitle] = useState('')
  const [batchTitle, setBatchTitle] = useState('')
  const [batchNote, setBatchNote] = useState('')
  const [changedWhat, setChangedWhat] = useState('')
  const [expectedImpact, setExpectedImpact] = useState('')
  const [planDecisionNotes, setPlanDecisionNotes] = useState<Record<string, string>>({})
  const [planTargetCampaignIds, setPlanTargetCampaignIds] = useState<Record<string, string>>({})
  const [planAssignmentActorIds, setPlanAssignmentActorIds] = useState<Record<string, string>>({})
  const [selectedDetailType, setSelectedDetailType] = useState<'candidate' | 'campaign'>('candidate')
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const response = await fetch('/api/governance-dashboard', {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      const result = await response.json()
      if (result.ok) {
        const nextData = result.data as GovernanceWorkbenchData
        setData(nextData)
        const hasSelectedCandidate = selectedDetailType === 'candidate'
          && nextData.candidateCampaigns.some((item) => item.candidateId === selectedDetailId)
        const hasSelectedCampaign = selectedDetailType === 'campaign'
          && nextData.campaigns.some((item) => item.id === selectedDetailId)

        if (!hasSelectedCandidate && !hasSelectedCampaign) {
          if (nextData.candidateCampaigns[0]) {
            setSelectedDetailType('candidate')
            setSelectedDetailId(nextData.candidateCampaigns[0].candidateId)
          } else if (nextData.campaigns[0]) {
            setSelectedDetailType('campaign')
            setSelectedDetailId(nextData.campaigns[0].id)
          } else {
            setSelectedDetailId(null)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch governance dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedCandidate = useMemo(() => {
    if (!data || selectedDetailType !== 'candidate') return null
    return data.candidateCampaigns.find((item) => item.candidateId === selectedDetailId) || null
  }, [data, selectedDetailId, selectedDetailType])

  const selectedCampaign = useMemo(() => {
    if (!data || selectedDetailType !== 'campaign') return null
    return data.campaigns.find((item) => item.id === selectedDetailId) || null
  }, [data, selectedDetailId, selectedDetailType])

  function toggleAction(actionDraftId: string) {
    setSelectedActionIds((prev) => prev.includes(actionDraftId)
      ? prev.filter((id) => id !== actionDraftId)
      : [...prev, actionDraftId])
  }

  function toggleAll() {
    if (!data) return
    setSelectedActionIds((prev) => prev.length === data.actionDrafts.length ? [] : data.actionDrafts.map((item) => item.id))
  }

  async function createCampaign() {
    if (selectedActionIds.length === 0) return
    const response = await fetch('/api/governance-campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'create',
        actionDraftIds: selectedActionIds,
        campaignTitle,
      }),
    })
    const result = await response.json()
    if (!response.ok || !result.ok) return

    setCampaignTitle('')
    setSelectedActionIds([])
    await fetchData()
  }

  async function mergeIntoCampaign() {
    if (selectedActionIds.length === 0 || !selectedCampaignId) return
    const response = await fetch('/api/governance-campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'merge',
        actionDraftIds: selectedActionIds,
        campaignId: selectedCampaignId,
      }),
    })
    const result = await response.json()
    if (!response.ok || !result.ok) return

    setSelectedActionIds([])
    await fetchData()
  }

  async function updateBatchActionStatus(status: 'IN_GOVERNANCE' | 'ARCHIVED') {
    if (selectedActionIds.length === 0) return
    const response = await fetch('/api/governance-campaigns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'action-status',
        actionDraftIds: selectedActionIds,
        status,
      }),
    })
    const result = await response.json()
    if (!response.ok || !result.ok) return

    setSelectedActionIds([])
    await fetchData()
  }

  async function updateCampaignStatus(campaignId: string, status: GovernanceCampaignStatus) {
    const response = await fetch('/api/governance-campaigns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'campaign-status',
        campaignId,
        status,
      }),
    })
    const result = await response.json()
    if (!response.ok || !result.ok) return

    await fetchData()
  }

  async function saveBatchNote(campaignId: string) {
    const response = await fetch('/api/governance-campaigns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'batch-note',
        campaignId,
        batchTitle,
        batchNote,
        changedWhat,
        expectedImpact,
      }),
    })
    const result = await response.json()
    if (!response.ok || !result.ok) return

    setBatchTitle('')
    setBatchNote('')
    setChangedWhat('')
    setExpectedImpact('')
    await fetchData()
  }

  function getPlanDecisionNote(planId: string) {
    return planDecisionNotes[planId] || ''
  }

  function getPlanTargetCampaignId(planId: string) {
    return planTargetCampaignIds[planId] || ''
  }

  function getPlanAssignmentActorId(planId: string, recommendationRole: GovernanceRecommendationRole) {
    return planAssignmentActorIds[`${planId}:${recommendationRole}`] || ''
  }

  async function applyPlanDecision(planId: string, decisionType: GovernancePlanDecisionType) {
    const response = await fetch('/api/governance-campaigns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'plan-decision',
        planId,
        decisionType,
        campaignId: getPlanTargetCampaignId(planId) || undefined,
        decisionNote: getPlanDecisionNote(planId) || undefined,
      }),
    })
    const result = await response.json()
    if (!response.ok || !result.ok) return

    setPlanDecisionNotes((prev) => ({ ...prev, [planId]: '' }))
    await fetchData()
  }

  async function applyPlanAssignment(params: {
    planId: string
    recommendationRole: GovernanceRecommendationRole
    assignmentSource: GovernanceAssignmentSource
    actorId?: string
    clearAssignment?: boolean
  }) {
    const response = await fetch('/api/governance-campaigns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'plan-assignment',
        planId: params.planId,
        recommendationRole: params.recommendationRole,
        assignmentSource: params.assignmentSource,
        actorId: params.actorId || undefined,
        clearAssignment: params.clearAssignment || false,
      }),
    })
    const result = await response.json()
    if (!response.ok || !result.ok) return

    setPlanAssignmentActorIds((prev) => ({
      ...prev,
      [`${params.planId}:${params.recommendationRole}`]: '',
    }))
    await fetchData()
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='mx-auto max-w-7xl px-4 py-8'>
        <AdminPageNav current='governance-dashboard' />
        <div className='mb-8 flex items-start justify-between gap-4'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900'>Governance Dashboard</h1>
            <p className='mt-2 text-gray-600'>
              将同类 action draft 归并成专项治理任务，支持批量归并、批量流转和专项详情视图，不自动执行任何代码修改。
            </p>
          </div>
          <div className='flex gap-3'>
            <Link href='/action-draft-dashboard' className='rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50'>
              查看 Priority Dashboard
            </Link>
            <Link href='/governance-effectiveness' className='rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50'>
              查看 Effectiveness
            </Link>
            <Link href='/actions' className='rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50'>
              查看 Actions
            </Link>
          </div>
        </div>

        <GovernanceDashboardView
          data={data}
          loading={loading}
          selectedActionIds={selectedActionIds}
          selectedCampaignId={selectedCampaignId}
          campaignTitle={campaignTitle}
          batchTitle={batchTitle}
          batchNote={batchNote}
          changedWhat={changedWhat}
          expectedImpact={expectedImpact}
          selectedDetailType={selectedDetailType}
          selectedDetailId={selectedDetailId}
          selectedCandidate={selectedCandidate}
          selectedCampaign={selectedCampaign}
          onToggleAction={toggleAction}
          onToggleAll={toggleAll}
          onSelectCampaign={(campaignId) => {
            setSelectedDetailType('campaign')
            setSelectedDetailId(campaignId)
          }}
          onSelectCandidate={(candidateId) => {
            setSelectedDetailType('candidate')
            setSelectedDetailId(candidateId)
          }}
          onSelectedCampaignIdChange={setSelectedCampaignId}
          onCampaignTitleChange={setCampaignTitle}
          onBatchTitleChange={setBatchTitle}
          onBatchNoteChange={setBatchNote}
          onChangedWhatChange={setChangedWhat}
          onExpectedImpactChange={setExpectedImpact}
          onCreateCampaign={createCampaign}
          onMergeIntoCampaign={mergeIntoCampaign}
          onBatchActionStatus={updateBatchActionStatus}
          onCampaignStatusChange={updateCampaignStatus}
          onSaveBatchNote={saveBatchNote}
          getPlanDecisionNote={getPlanDecisionNote}
          getPlanTargetCampaignId={getPlanTargetCampaignId}
          onPlanDecisionNoteChange={(planId, value) => setPlanDecisionNotes((prev) => ({ ...prev, [planId]: value }))}
          onPlanTargetCampaignIdChange={(planId, campaignId) => setPlanTargetCampaignIds((prev) => ({ ...prev, [planId]: campaignId }))}
          onPlanDecision={applyPlanDecision}
          getPlanAssignmentActorId={getPlanAssignmentActorId}
          onPlanAssignmentActorIdChange={(planId, recommendationRole, actorId) => setPlanAssignmentActorIds((prev) => ({
            ...prev,
            [`${planId}:${recommendationRole}`]: actorId,
          }))}
          onPlanAssign={applyPlanAssignment}
        />
      </div>
    </div>
  )
}