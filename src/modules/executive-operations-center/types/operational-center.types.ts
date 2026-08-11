import type { SituationSeverity } from '@/modules/situations/types/situation.types'

export type OperationalHealth = 'stable' | 'attention' | 'critical'

export interface OperationalAiSnapshot {
  hasAnalysis: boolean
  version: number | null
  provider: string | null
  model: string | null
  confidence: number | null
  analyzedAt: string | null
  classifiedSeverity: SituationSeverity | null
  headline: string | null
  summary: string | null
  recommendedNextStep: string | null
  decision: string | null
  urgency: SituationSeverity | null
  riskScore: number | null
  estimatedDurationMinutes: number | null
  missingInformationCount: number
  immediateRisksCount: number
  versionsCount: number
}

export interface OperationalCenterSituation {
  id: string
  code: string
  title: string
  description: string
  coordinationId: string
  coordinationCode: string
  coordinationName: string
  categoryId: string
  categoryCode: string
  categoryName: string
  status: string
  severity: SituationSeverity
  occurredAt: string
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  closedAt: string | null
  dueAt: string | null
  slaBreachedAt: string | null
  slaHealth: 'on_track' | 'at_risk' | 'overdue' | 'closed'
  closedOnTime: boolean | null
  createdByUserId: string
  createdByUserName: string
  assignedUserName: string | null
  lastStatusComment: string | null
  affectedCoordinations: Array<{
    id: string
    code: string
    name: string
    impactLevel: SituationSeverity
  }>
  recommendationsTotal: number
  recommendationsPending: number
  recommendationsCompleted: number
  evidencesCount: number
  timelineEventsCount: number
  lastTimelineEventAt: string | null
  ai: OperationalAiSnapshot
}

export interface OperationalAuditEvent {
  id: string
  situationId: string
  situationCode: string
  situationTitle: string
  coordinationName: string
  eventType: string
  title: string
  description: string
  createdAt: string
  userName: string | null
  isAiEvent: boolean
}

export interface OperationalCoordinationRollup {
  id: string
  code: string
  name: string
  color: string
  totalSituations: number
  activeSituations: number
  criticalSituations: number
  overdueSituations: number
  affectedBySituations: number
  pendingRecommendations: number
  analyzedSituations: number
  lastActivityAt: string | null
  health: OperationalHealth
}

export interface OperationalCenterMetrics {
  totalSituations: number
  openSituations: number
  inProgressSituations: number
  resolvedSituations: number
  closedSituations: number
  criticalOpenSituations: number
  overdueActiveSituations: number
  atRiskActiveSituations: number
  closedOnTimeRate: number | null
  averageClosureDelayMinutes: number | null
  situationsWithAnalysis: number
  situationsWithoutAnalysis: number
  analysisCoverage: number
  averageAiConfidence: number | null
  totalAiVersions: number
  reanalyzedSituations: number
  pendingRecommendations: number
  completedRecommendations: number
  affectedCoordinations: number
  evidenceCount: number
  auditEventCount: number
  averageRegistrationDelayMinutes: number | null
}

export interface OperationalCenterData {
  situations: OperationalCenterSituation[]
  auditEvents: OperationalAuditEvent[]
  coordinations: OperationalCoordinationRollup[]
  metrics: OperationalCenterMetrics
  generatedAt: string
  totalReportedByApi: number
  partialFailures: number
}

export type OperationalCenterLoadStatus =
  | 'loading'
  | 'ready'
  | 'empty'
  | 'error'
