import type { SituationSeverity } from '@/modules/situations/types/situation.types'
import type { OperationalEnvironmentStatus } from '@/modules/operational-events/types/operational-event.types'
import type { RiskLevel } from '@/modules/operational-events/types/operational-event.types'

export interface ExecutiveDashboardKpis {
  openSituations: number
  criticalSituations: number
  resolvedSituations: number
  averageAttentionMinutes: number | null
  pendingRecommendations: number
  completedRecommendations: number
  affectedCoordinations: number
  averageAiConfidence: number | null
}

export interface PrioritySituationCard {
  id: string
  title: string
  coordinationName: string
  coordinationCode: string
  categoryName: string
  severity: SituationSeverity
  status: string
  riskScore: number | null
  riskLevel: RiskLevel | null
  updatedAt: string
}

export interface CoordinationImpactEntry {
  coordinationId: string
  coordinationCode: string
  coordinationName: string
  impactLevel: SituationSeverity
  situationCount: number
  intensity: number
}

export interface RecentActivityEntry {
  id: string
  situationId: string
  situationTitle: string
  eventType: string
  title: string
  description: string
  createdAt: string
  userName: string | null
}

export interface AiIndicators {
  totalAnalyses: number
  averageConfidence: number | null
  averageExecutionMinutes: number | null
  lastAnalysisAt: string | null
  reanalysisCount: number
}

export interface ExecutiveDashboardData {
  kpis: ExecutiveDashboardKpis
  executiveNarrative: string
  environment: OperationalEnvironmentStatus
  prioritySituations: PrioritySituationCard[]
  latestSituations: PrioritySituationCard[]
  coordinationImpact: CoordinationImpactEntry[]
  recentActivity: RecentActivityEntry[]
  aiIndicators: AiIndicators
  generatedAt: string
}

export type ExecutiveDashboardStatus = 'loading' | 'ready' | 'empty' | 'error'
