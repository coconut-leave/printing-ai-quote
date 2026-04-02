// In-memory storage for improvement suggestion statuses
// In production, this should be persisted to a database

import type {
  ImprovementSuggestionStatus,
} from './improvementSuggestion'

type ImprovementStoreState = {
  statuses: Map<string, ImprovementSuggestionStatus>
  notes: Map<string, string>
  fileHints: Map<string, string>
  lastActionAt: Map<string, string>
  summaries: Map<string, string>
  verificationNotes: Map<string, string>
  implementedAt: Map<string, string>
  verifiedAt: Map<string, string>
}

declare global {
  // eslint-disable-next-line no-var
  var __improvementStoreState: ImprovementStoreState | undefined
}

const store = global.__improvementStoreState || {
  statuses: new Map<string, ImprovementSuggestionStatus>(),
  notes: new Map<string, string>(),
  fileHints: new Map<string, string>(),
  lastActionAt: new Map<string, string>(),
  summaries: new Map<string, string>(),
  verificationNotes: new Map<string, string>(),
  implementedAt: new Map<string, string>(),
  verifiedAt: new Map<string, string>(),
}

if (!global.__improvementStoreState) {
  global.__improvementStoreState = store
}

function markAction(improvementId: string): void {
  store.lastActionAt.set(improvementId, new Date().toISOString())
}

/**
 * Update improvement status in memory
 */
export function setImprovementStatus(
  improvementId: string,
  status: ImprovementSuggestionStatus
): void {
  store.statuses.set(improvementId, status)
  if (status === 'IMPLEMENTED' && !store.implementedAt.has(improvementId)) {
    store.implementedAt.set(improvementId, new Date().toISOString())
  }
  if (status === 'VERIFIED' && !store.verifiedAt.has(improvementId)) {
    store.verifiedAt.set(improvementId, new Date().toISOString())
  }
  markAction(improvementId)
}

/**
 * Get improvement status
 */
export function getImprovementStatus(improvementId: string): ImprovementSuggestionStatus {
  return store.statuses.get(improvementId) ?? 'NEW'
}

export function setImprovementNote(improvementId: string, implementationNote: string): void {
  const normalized = implementationNote.trim()
  if (!normalized) {
    store.notes.delete(improvementId)
    markAction(improvementId)
    return
  }
  store.notes.set(improvementId, normalized)
  markAction(improvementId)
}

export function getImprovementNote(improvementId: string): string | undefined {
  return store.notes.get(improvementId)
}

export function setImprovementSummary(improvementId: string, implementationSummary: string): void {
  const normalized = implementationSummary.trim()
  if (!normalized) {
    store.summaries.delete(improvementId)
    markAction(improvementId)
    return
  }
  store.summaries.set(improvementId, normalized)
  markAction(improvementId)
}

export function getImprovementSummary(improvementId: string): string | undefined {
  return store.summaries.get(improvementId)
}

export function setImprovementVerificationNote(improvementId: string, verificationNote: string): void {
  const normalized = verificationNote.trim()
  if (!normalized) {
    store.verificationNotes.delete(improvementId)
    markAction(improvementId)
    return
  }
  store.verificationNotes.set(improvementId, normalized)
  markAction(improvementId)
}

export function getImprovementVerificationNote(improvementId: string): string | undefined {
  return store.verificationNotes.get(improvementId)
}

export function setImprovementTargetFileHint(improvementId: string, targetFileHint: string): void {
  const normalized = targetFileHint.trim()
  if (!normalized) {
    store.fileHints.delete(improvementId)
    markAction(improvementId)
    return
  }
  store.fileHints.set(improvementId, normalized)
  markAction(improvementId)
}

export function getImprovementTargetFileHint(improvementId: string): string | undefined {
  return store.fileHints.get(improvementId)
}

export function getImprovementLastActionAt(improvementId: string): string | undefined {
  return store.lastActionAt.get(improvementId)
}

export function getImprovementImplementedAt(improvementId: string): string | undefined {
  return store.implementedAt.get(improvementId)
}

export function getImprovementVerifiedAt(improvementId: string): string | undefined {
  return store.verifiedAt.get(improvementId)
}

/**
 * Get all improvement statuses
 * (mainly for testing/debugging)
 */
export function getAllImprovementStatuses(): Map<string, ImprovementSuggestionStatus> {
  return new Map(store.statuses)
}

/**
 * Clear all statuses (for testing)
 */
export function clearAllStatuses(): void {
  store.statuses.clear()
  store.notes.clear()
  store.fileHints.clear()
  store.lastActionAt.clear()
  store.summaries.clear()
  store.verificationNotes.clear()
  store.implementedAt.clear()
  store.verifiedAt.clear()
}
