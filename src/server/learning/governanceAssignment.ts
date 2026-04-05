import type { GovernanceActor, GovernanceActorSource } from '@/lib/actorIdentity'

export type GovernanceAssignmentSource = 'recommended' | 'manual'
export type GovernanceRecommendationRole = 'approval' | 'execution'
export type GovernanceRecommendationConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'

export type GovernanceAssignmentCandidateSnapshot = {
  actorId: string
  actorName: string
  actorSource: GovernanceActorSource
  recommendationScore: number
  recommendationConfidence: GovernanceRecommendationConfidence
}

export type GovernanceAssignmentRecord = {
  assignedActorId?: string
  assignedActorName?: string
  assignedActorSource?: GovernanceActorSource
  assignedBy: string
  assignedByActor?: GovernanceActor
  assignedAt: string
  assignmentSource: GovernanceAssignmentSource
  recommendationRole?: GovernanceRecommendationRole
  recommendationOffered: boolean
  recommendationAccepted: boolean
  acceptedRecommendedActor: boolean
  manuallyOverridden: boolean
  recommendedActorId?: string
  recommendedActorName?: string
  recommendationScore?: number
  recommendationConfidence?: GovernanceRecommendationConfidence
  recommendationReason?: string
  candidateActors: GovernanceAssignmentCandidateSnapshot[]
}