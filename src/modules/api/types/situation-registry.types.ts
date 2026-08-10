import type { RiskLevel } from '@/modules/operational-events/types/operational-event.types'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'

export interface SituationRegistryRow {
  id: string
  code: string
  title: string
  coordinationId: string
  coordinationCode: string
  coordinationName: string
  categoryId: string
  categoryCode: string
  categoryName: string
  status: string
  severity: SituationSeverity
  riskScore: number | null
  riskLevel: RiskLevel | null
  aiConfidence: number | null
  occurredAt: string
  updatedAt: string
  createdAt: string
  createdByUserId: string
  createdByUserName: string
  hasAnalysis: boolean
  isReanalyzed: boolean
  pendingRecommendations: number
  analysisVersion: number | null
  analysisProvider: string | null
}

export interface SituationRegistrySummary {
  openSituations: number
  criticalSituations: number
  closedSituations: number
  pendingRecommendations: number
  averageAiConfidence: number | null
}

export interface SituationRegistryIndicators {
  withAnalysis: number
  withoutAnalysis: number
  reanalyzed: number
  withPendingRecommendations: number
}

export interface SituationRegistryCategoryOption {
  id: string
  code: string
  name: string
}

export interface SituationRegistryData {
  rows: SituationRegistryRow[]
  summary: SituationRegistrySummary
  indicators: SituationRegistryIndicators
  categories: SituationRegistryCategoryOption[]
}
