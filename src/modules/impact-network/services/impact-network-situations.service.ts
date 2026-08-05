import { fetchSituations } from '@/modules/api/situations.api'
import type {
  AIInterpretation,
  OperationalEvent,
  OperationalEventStatus,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'
import {
  mapAnalysisToInterpretation,
  mapSituationToOperationalEvent,
} from '@/modules/services/mappers/analysisPresentation.mapper'
import { tryFetchSituationAnalysis } from '@/modules/api/analysis.api'
import { situationOwnerLabel } from '@/modules/situations/utils/situationOwner'
import type {
  SituationResponse,
  SituationSeverity,
} from '@/modules/situations/types/situation.types'

const SEVERITY_TO_RISK: Record<SituationSeverity, RiskLevel> = {
  LOW: 'low',
  MEDIUM: 'moderate',
  HIGH: 'high',
  CRITICAL: 'critical',
}

const SEVERITY_TO_SCORE: Record<SituationSeverity, number> = {
  LOW: 25,
  MEDIUM: 50,
  HIGH: 75,
  CRITICAL: 92,
}

const SEVERITY_TO_IMPACT = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 4,
  CRITICAL: 5,
} as const

export function mapSituationStatusToEventStatus(
  status: string,
): OperationalEventStatus {
  switch (status) {
    case 'IN_PROGRESS':
      return 'monitoring'
    case 'RESOLVED':
      return 'resolved'
    case 'CLOSED':
      return 'archived'
    case 'OPEN':
    default:
      return 'open'
  }
}

function buildFallbackInterpretation(
  situation: SituationResponse,
): AIInterpretation {
  const riskLevel = SEVERITY_TO_RISK[situation.severity]
  return {
    id: `fallback-${situation.id}`,
    eventId: situation.id,
    categoryId: situation.categoryCode,
    categoryName: situation.categoryName,
    affectedAreaIds: situation.coordinationCode ? [situation.coordinationCode] : [],
    affectedAreaNames: situation.coordinationName ? [situation.coordinationName] : [],
    impactSeverity: SEVERITY_TO_IMPACT[situation.severity],
    affectationPercentage: SEVERITY_TO_SCORE[situation.severity],
    impactInternal: Math.round(SEVERITY_TO_SCORE[situation.severity] * 0.55),
    impactExternal: Math.round(SEVERITY_TO_SCORE[situation.severity] * 0.25),
    impactStudents: Math.round(SEVERITY_TO_SCORE[situation.severity] * 0.2),
    riskLevel,
    riskScore: SEVERITY_TO_SCORE[situation.severity],
    executiveSummary: situation.description,
    narrative: situation.description,
    suggestedIndicators: [],
    detectedPatterns: [],
    modelLabel: 'pending',
    interpretedAt: situation.updatedAt,
    confidence: 0,
  }
}

/**
 * Adapta SituationResponse al contrato OperationalEvent de la Red de impacto.
 * Usa coordinationCode como sourceAreaId para resolver islas del mapa.
 */
export function mapSituationToImpactOperationalEvent(
  situation: SituationResponse,
  interpretation?: AIInterpretation | null,
): OperationalEvent {
  const resolvedInterpretation =
    interpretation ?? buildFallbackInterpretation(situation)
  const base = mapSituationToOperationalEvent(
    situation,
    resolvedInterpretation,
  )

  return {
    ...base,
    sourceAreaId: situation.coordinationCode ?? 'sin-coordinacion',
    sourceAreaName: situationOwnerLabel(situation),
    status: mapSituationStatusToEventStatus(situation.status),
  }
}

export async function loadImpactNetworkSituations(): Promise<{
  events: OperationalEvent[]
  situations: SituationResponse[]
  lastSynchronizedAt: string
}> {
  const response = await fetchSituations({ limit: 100, page: 1 })
  const situations = response.items
  const events = situations.map((situation) =>
    mapSituationToImpactOperationalEvent(situation),
  )

  return {
    events,
    situations,
    lastSynchronizedAt: new Date().toISOString(),
  }
}

export async function enrichSituationEvent(
  situation: SituationResponse,
): Promise<OperationalEvent> {
  const analysis = await tryFetchSituationAnalysis(situation.id)
  const interpretation = analysis
    ? mapAnalysisToInterpretation(analysis, situation.id)
    : null
  return mapSituationToImpactOperationalEvent(situation, interpretation)
}
