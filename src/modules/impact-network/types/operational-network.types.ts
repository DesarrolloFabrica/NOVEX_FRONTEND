import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import type {
  OperationalEventStatus,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'

export type CoordinationOperationalStatus =
  | 'stable'
  | 'attention'
  | 'critical'

export interface OperationalDirection {
  id: string
  name: string
  shortName: string
  coordinationIds: readonly CoordinationId[]
  globalRiskScore: number
  activeSituationCount: number
  lastSynchronizedAt: string
}

export interface Coordination {
  id: CoordinationId
  name: string
  shortName: string
  islandAsset: string
  operationalStatus: CoordinationOperationalStatus
  responsiblePeople: readonly string[]
  situationIds: readonly string[]
  lastActivityAt: string
}

export interface Situation {
  id: string
  coordinationId: CoordinationId
  title: string
  priority: RiskLevel
  status: OperationalEventStatus
  riskLevel: RiskLevel
  riskScore: number
  reportedAt: string
  lastActivityAt: string
}

export interface SituationPropagation {
  situationId: string
  originCoordinationId: CoordinationId
  affectedCoordinationIds: readonly CoordinationId[]
}

export interface SituationImpact {
  situationId: string
  coordinationId: CoordinationId
  level: RiskLevel
  score: number
}

export interface SituationSummary {
  situationId: string
  executiveSummary: string
  affectedAreaCount: number
  generatedAt: string
}

export interface OperationalNetworkSnapshot {
  direction: OperationalDirection
  coordinations: readonly Coordination[]
  situations: readonly Situation[]
  propagations: readonly SituationPropagation[]
  impacts: readonly SituationImpact[]
  summaries: readonly SituationSummary[]
}
