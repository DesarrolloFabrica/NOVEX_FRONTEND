import {
  fetchAnalysisHistory,
  tryFetchSituationAnalysis,
} from '@/modules/api/analysis.api'
import { fetchCoordinations } from '@/modules/api/coordinations.api'
import { fetchSituationAffectedCoordinations } from '@/modules/api/impact.api'
import { fetchSituationRecommendations } from '@/modules/api/recommendations.api'
import { fetchSituations } from '@/modules/api/situations.api'
import { fetchSituationTimeline } from '@/modules/api/timeline.api'
import type {
  AiIndicators,
  CoordinationImpactEntry,
  ExecutiveDashboardData,
  ExecutiveDashboardKpis,
  PrioritySituationCard,
  RecentActivityEntry,
} from '@/modules/api/types/dashboard.types'
import type { OperationalEnvironmentStatus } from '@/modules/operational-events/types/operational-event.types'
import type { RiskLevel } from '@/modules/operational-events/types/operational-event.types'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'
import {
  ANALYST_REGISTRY_CODE,
  situationOwnerCode,
  situationOwnerLabel,
} from '@/modules/situations/utils/situationOwner'

const SEVERITY_WEIGHT: Record<SituationSeverity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

const SEVERITY_TO_RISK: Record<SituationSeverity, RiskLevel> = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'moderate',
  LOW: 'low',
}

const SEVERITY_TO_SCORE: Record<SituationSeverity, number> = {
  CRITICAL: 92,
  HIGH: 75,
  MEDIUM: 50,
  LOW: 25,
}

const IMPACT_LEVEL_WEIGHT: Record<SituationSeverity, number> = {
  CRITICAL: 100,
  HIGH: 75,
  MEDIUM: 50,
  LOW: 25,
}

interface SituationEnrichment {
  situation: SituationResponse
  analysisConfidence: number | null
  analysisSeverity: SituationSeverity | null
  riskScore: number | null
  riskLevel: RiskLevel | null
  affectedCoordinations: Array<{
    coordinationId: string
    coordinationCode: string
    coordinationName: string
    impactLevel: SituationSeverity
  }>
  recommendations: Array<{
    status: string
  }>
  timelineItems: RecentActivityEntry[]
  analysisSessions: Array<{
    confidence: number
    executionTimeMs: number
    createdAt: string
    analysisVersion: number
  }>
}

function isOpenStatus(status: string): boolean {
  return (
    status === 'OPEN' ||
    status === 'IN_PROGRESS' ||
    status === 'RESOLVED'
  )
}

/** Solo CLOSED abandona el seguimiento; RESOLVED legado sigue abierto. */
function isClosedStatus(status: string): boolean {
  return status === 'CLOSED'
}

function severityToRiskScore(severity: SituationSeverity): number {
  return SEVERITY_TO_SCORE[severity]
}

function resolveRiskFromSituation(
  situation: SituationResponse,
  analysisSeverity: SituationSeverity | null,
): { riskScore: number; riskLevel: RiskLevel } {
  const severity = analysisSeverity ?? situation.severity
  return {
    riskScore: severityToRiskScore(severity),
    riskLevel: SEVERITY_TO_RISK[severity],
  }
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((total, value) => total + value, 0) / values.length
}

function resolveEnvironment(
  kpis: ExecutiveDashboardKpis,
): OperationalEnvironmentStatus {
  if (kpis.openSituations === 0 && kpis.criticalSituations === 0) {
    return kpis.resolvedSituations > 0 ? 'healthy' : 'pending'
  }
  if (kpis.criticalSituations > 0) return 'critical'
  if (kpis.openSituations >= 4 || kpis.pendingRecommendations >= 6) {
    return 'attention'
  }
  return 'healthy'
}

function buildExecutiveNarrative(
  kpis: ExecutiveDashboardKpis,
  recentSituations: PrioritySituationCard[],
): string {
  if (kpis.openSituations === 0 && kpis.resolvedSituations === 0) {
    return 'No hay situaciones registradas. Use el formulario de captura para documentar el primer evento operativo.'
  }

  const latest = recentSituations[0]
  const totalRegistered = kpis.openSituations + kpis.resolvedSituations

  if (latest) {
    const origin =
      latest.coordinationCode === ANALYST_REGISTRY_CODE
        ? 'registrado por un analista'
        : `en ${latest.coordinationName}`
    return `Hay ${totalRegistered} situación${totalRegistered === 1 ? '' : 'es'} registrada${totalRegistered === 1 ? '' : 's'}: ${kpis.openSituations} en seguimiento y ${kpis.resolvedSituations} cerrada${kpis.resolvedSituations === 1 ? '' : 's'}. El registro más reciente es «${latest.title}» ${origin}.`
  }

  return `La plataforma documenta ${totalRegistered} situación${totalRegistered === 1 ? '' : 'es'}: ${kpis.openSituations} en seguimiento y ${kpis.resolvedSituations} cerrada${kpis.resolvedSituations === 1 ? '' : 's'}.`
}

async function enrichSituation(
  situation: SituationResponse,
): Promise<SituationEnrichment> {
  const [
    analysisResult,
    affectedResult,
    recommendationsResult,
    timelineResult,
    historyResult,
  ] = await Promise.allSettled([
    tryFetchSituationAnalysis(situation.id),
    fetchSituationAffectedCoordinations(situation.id),
    fetchSituationRecommendations(situation.id),
    fetchSituationTimeline(situation.id),
    fetchAnalysisHistory(situation.id),
  ])

  const analysis =
    analysisResult.status === 'fulfilled' ? analysisResult.value : null
  const analysisSeverity =
    analysis?.analysis.incidentClassification.operationalSeverity ?? null
  const risk = resolveRiskFromSituation(situation, analysisSeverity)

  const affectedItems =
    affectedResult.status === 'fulfilled' ? affectedResult.value.items : []

  const recommendations =
    recommendationsResult.status === 'fulfilled'
      ? recommendationsResult.value.items
      : []

  const timelineItems =
    timelineResult.status === 'fulfilled'
      ? timelineResult.value.items.map((entry) => ({
          id: entry.id,
          situationId: situation.id,
          situationTitle: situation.title,
          eventType: entry.eventType,
          title: entry.title,
          description: entry.description,
          createdAt: entry.createdAt,
          userName: entry.userName,
        }))
      : []

  const analysisSessions =
    historyResult.status === 'fulfilled' ? historyResult.value.items : []

  return {
    situation,
    analysisConfidence: analysis?.analysis.confidence.overall ?? null,
    analysisSeverity,
    riskScore: risk.riskScore,
    riskLevel: risk.riskLevel,
    affectedCoordinations: affectedItems.map((item) => ({
      coordinationId: item.coordinationId,
      coordinationCode: item.coordinationCode,
      coordinationName: item.coordinationName,
      impactLevel: item.impactLevel,
    })),
    recommendations,
    timelineItems,
    analysisSessions: analysisSessions.map((session) => ({
      confidence: session.confidence,
      executionTimeMs: session.executionTimeMs,
      createdAt: session.createdAt,
      analysisVersion: session.analysisVersion,
    })),
  }
}

function buildPrioritySituations(
  enrichments: SituationEnrichment[],
): PrioritySituationCard[] {
  return enrichments
    .filter((item) => isOpenStatus(item.situation.status))
    .map((item) => ({
      id: item.situation.id,
      title: item.situation.title,
      coordinationName: situationOwnerLabel(item.situation),
      coordinationCode: situationOwnerCode(item.situation),
      categoryName: item.situation.categoryName,
      severity: item.analysisSeverity ?? item.situation.severity,
      status: item.situation.status,
      riskScore: item.riskScore,
      riskLevel: item.riskLevel,
      updatedAt: item.situation.updatedAt,
    }))
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() -
        new Date(left.updatedAt).getTime(),
    )
    .slice(0, 5)
}

function buildLatestSituations(
  enrichments: SituationEnrichment[],
): PrioritySituationCard[] {
  return enrichments
    .map((item) => ({
      id: item.situation.id,
      title: item.situation.title,
      coordinationName: situationOwnerLabel(item.situation),
      coordinationCode: situationOwnerCode(item.situation),
      categoryName: item.situation.categoryName,
      severity: item.analysisSeverity ?? item.situation.severity,
      status: item.situation.status,
      riskScore: item.riskScore,
      riskLevel: item.riskLevel,
      updatedAt: item.situation.updatedAt,
    }))
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() -
        new Date(left.updatedAt).getTime(),
    )
    .slice(0, 8)
}

function buildCoordinationImpact(
  enrichments: SituationEnrichment[],
  coordinations: Awaited<ReturnType<typeof fetchCoordinations>>,
): CoordinationImpactEntry[] {
  const map = new Map<
    string,
    CoordinationImpactEntry & { intensityTotal: number }
  >()

  for (const enrichment of enrichments) {
    for (const affected of enrichment.affectedCoordinations) {
      const existing = map.get(affected.coordinationId)
      const intensity = IMPACT_LEVEL_WEIGHT[affected.impactLevel]

      if (!existing) {
        map.set(affected.coordinationId, {
          coordinationId: affected.coordinationId,
          coordinationCode: affected.coordinationCode,
          coordinationName: affected.coordinationName,
          impactLevel: affected.impactLevel,
          situationCount: 1,
          intensity,
          intensityTotal: intensity,
        })
        continue
      }

      existing.situationCount += 1
      existing.intensityTotal += intensity
      existing.intensity = Math.round(
        existing.intensityTotal / existing.situationCount,
      )
      if (
        SEVERITY_WEIGHT[affected.impactLevel] >
        SEVERITY_WEIGHT[existing.impactLevel]
      ) {
        existing.impactLevel = affected.impactLevel
      }
    }
  }

  if (map.size === 0) {
    const openByCoordination = new Map<string, number>()
    for (const enrichment of enrichments) {
      if (!isOpenStatus(enrichment.situation.status)) continue
      const coordinationId = enrichment.situation.coordinationId
      if (!coordinationId) continue
      const count = openByCoordination.get(coordinationId) ?? 0
      openByCoordination.set(coordinationId, count + 1)
    }

    for (const coordination of coordinations) {
      const count = openByCoordination.get(coordination.id) ?? 0
      if (count === 0) continue
      map.set(coordination.id, {
        coordinationId: coordination.id,
        coordinationCode: coordination.code,
        coordinationName: coordination.name,
        impactLevel: 'MEDIUM',
        situationCount: count,
        intensity: Math.min(100, count * 20),
        intensityTotal: count * 20,
      })
    }
  }

  return [...map.values()]
    .map(({ intensityTotal: _intensityTotal, ...entry }) => entry)
    .sort(
      (left, right) =>
        right.intensity - left.intensity ||
        right.situationCount - left.situationCount,
    )
}

function buildRecentActivity(
  enrichments: SituationEnrichment[],
): RecentActivityEntry[] {
  return enrichments
    .flatMap((item) => item.timelineItems)
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    )
    .slice(0, 12)
}

function buildAiIndicators(enrichments: SituationEnrichment[]): AiIndicators {
  const sessions = enrichments.flatMap((item) => item.analysisSessions)
  const confidences = sessions.map((session) => session.confidence)
  const executionTimes = sessions.map((session) => session.executionTimeMs)
  const reanalysisCount = enrichments.reduce((total, item) => {
    const versions = item.analysisSessions.length
    return total + Math.max(0, versions - 1)
  }, 0)

  const timelineReanalysis = enrichments
    .flatMap((item) => item.timelineItems)
    .filter(
      (entry) =>
        entry.eventType === 'AI_REANALYZED' ||
        entry.eventType === 'AI_ANALYSIS_VERSION_CREATED',
    ).length

  const lastAnalysisAt =
    sessions
      .map((session) => session.createdAt)
      .sort(
        (left, right) => new Date(right).getTime() - new Date(left).getTime(),
      )[0] ?? null

  return {
    totalAnalyses: sessions.length,
    averageConfidence: average(confidences),
    averageExecutionMinutes:
      executionTimes.length > 0
        ? Math.round((average(executionTimes) ?? 0) / 60_000)
        : null,
    lastAnalysisAt,
    reanalysisCount: Math.max(reanalysisCount, timelineReanalysis),
  }
}

function buildKpis(enrichments: SituationEnrichment[]): ExecutiveDashboardKpis {
  const situations = enrichments.map((item) => item.situation)
  const openSituations = situations.filter((item) => isOpenStatus(item.status))
  const resolvedSituations = situations.filter((item) =>
    isClosedStatus(item.status),
  )

  const criticalSituations = openSituations.filter(
    (item) => item.severity === 'CRITICAL' || item.severity === 'HIGH',
  ).length

  const attentionDurations = resolvedSituations
    .map((item) => {
      const created = new Date(item.createdAt).getTime()
      const updated = new Date(item.updatedAt).getTime()
      if (Number.isNaN(created) || Number.isNaN(updated)) return null
      return Math.max(0, Math.round((updated - created) / 60_000))
    })
    .filter((value): value is number => value !== null)

  const allRecommendations = enrichments.flatMap((item) => item.recommendations)
  const pendingRecommendations = allRecommendations.filter(
    (item) => item.status === 'PENDING' || item.status === 'IN_PROGRESS',
  ).length
  const completedRecommendations = allRecommendations.filter(
    (item) => item.status === 'COMPLETED',
  ).length

  const affectedCoordinationIds = new Set(
    enrichments.flatMap((item) =>
      item.affectedCoordinations.map(
        (coordination) => coordination.coordinationId,
      ),
    ),
  )

  const confidences = enrichments
    .map((item) => item.analysisConfidence)
    .filter((value): value is number => value !== null)

  return {
    openSituations: openSituations.length,
    criticalSituations,
    resolvedSituations: resolvedSituations.length,
    averageAttentionMinutes: average(attentionDurations)
      ? Math.round(average(attentionDurations)!)
      : null,
    pendingRecommendations,
    completedRecommendations,
    affectedCoordinations: affectedCoordinationIds.size,
    averageAiConfidence: average(confidences),
  }
}

export async function loadExecutiveDashboardData(): Promise<ExecutiveDashboardData> {
  const [situationsResponse, coordinations] = await Promise.all([
    fetchSituations({ limit: 100, page: 1 }),
    fetchCoordinations(),
  ])

  const enrichments = await Promise.all(
    situationsResponse.items.map((situation) => enrichSituation(situation)),
  )

  const kpis = buildKpis(enrichments)
  const prioritySituations = buildPrioritySituations(enrichments)

  return {
    kpis,
    executiveNarrative: buildExecutiveNarrative(kpis, prioritySituations),
    environment: resolveEnvironment(kpis),
    prioritySituations,
    latestSituations: buildLatestSituations(enrichments),
    coordinationImpact: buildCoordinationImpact(enrichments, coordinations),
    recentActivity: buildRecentActivity(enrichments),
    aiIndicators: buildAiIndicators(enrichments),
    generatedAt: new Date().toISOString(),
  }
}
