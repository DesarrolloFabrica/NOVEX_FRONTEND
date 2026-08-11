import {
  fetchAnalysisHistory,
  tryFetchSituationAnalysis,
} from '@/modules/api/analysis.api'
import { fetchCoordinations } from '@/modules/api/coordinations.api'
import { fetchSituationEvidences } from '@/modules/api/evidences.api'
import { fetchSituationAffectedCoordinations } from '@/modules/api/impact.api'
import { fetchSituationRecommendations } from '@/modules/api/recommendations.api'
import { fetchSituations } from '@/modules/api/situations.api'
import { fetchSituationTimeline } from '@/modules/api/timeline.api'
import type {
  OperationalAuditEvent,
  OperationalCenterData,
  OperationalCenterMetrics,
  OperationalCenterSituation,
  OperationalCoordinationRollup,
  OperationalHealth,
} from '@/modules/executive-operations-center/types/operational-center.types'
import type { CoordinationSummary, SituationResponse } from '@/modules/situations/types/situation.types'
import {
  situationOwnerCode,
  situationOwnerLabel,
} from '@/modules/situations/utils/situationOwner'
import { getSituationSlaHealth } from '@/modules/situations/utils/situation-sla'

const OPEN_STATUSES = new Set(['OPEN', 'IN_PROGRESS', 'RESOLVED'])
const PENDING_RECOMMENDATION_STATUSES = new Set(['PENDING', 'IN_PROGRESS'])

function situationCode(id: string): string {
  return `SIT-${id.slice(0, 8).toUpperCase()}`
}

function isAiEvent(eventType: string): boolean {
  return eventType.startsWith('AI_') || eventType.includes('ANALYSIS')
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(items[index])
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, Math.max(1, items.length)) },
      () => worker(),
    ),
  )
  return results
}

async function fetchAllSituations(): Promise<{
  items: SituationResponse[]
  total: number
}> {
  const first = await fetchSituations({ page: 1, limit: 100 })
  const pageCount = Math.ceil(first.total / first.limit)
  if (pageCount <= 1) return { items: first.items, total: first.total }

  const remaining = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) =>
      fetchSituations({ page: index + 2, limit: first.limit }),
    ),
  )

  return {
    items: [first, ...remaining].flatMap((page) => page.items),
    total: first.total,
  }
}

interface EnrichedSituationResult {
  situation: OperationalCenterSituation
  events: OperationalAuditEvent[]
  failures: number
}

async function enrichSituation(
  source: SituationResponse,
): Promise<EnrichedSituationResult> {
  const [analysisResult, historyResult, recommendationsResult, timelineResult, affectedResult, evidencesResult] =
    await Promise.allSettled([
      tryFetchSituationAnalysis(source.id),
      fetchAnalysisHistory(source.id),
      fetchSituationRecommendations(source.id),
      fetchSituationTimeline(source.id),
      fetchSituationAffectedCoordinations(source.id),
      fetchSituationEvidences(source.id),
    ])

  const analysis =
    analysisResult.status === 'fulfilled' ? analysisResult.value : null
  const history =
    historyResult.status === 'fulfilled' ? historyResult.value : null
  const recommendations =
    recommendationsResult.status === 'fulfilled'
      ? recommendationsResult.value.items
      : []
  const timeline =
    timelineResult.status === 'fulfilled' ? timelineResult.value.items : []
  const affected =
    affectedResult.status === 'fulfilled' ? affectedResult.value.items : []
  const evidences =
    evidencesResult.status === 'fulfilled' ? evidencesResult.value.items : []
  const failures = [
    analysisResult,
    historyResult,
    recommendationsResult,
    timelineResult,
    affectedResult,
    evidencesResult,
  ].filter((result) => result.status === 'rejected').length

  const code = situationCode(source.id)
  const events: OperationalAuditEvent[] = timeline.map((event) => ({
    id: event.id,
    situationId: source.id,
    situationCode: code,
    situationTitle: source.title,
    coordinationName: situationOwnerLabel(source),
    eventType: event.eventType,
    title: event.title,
    description: event.description,
    createdAt: event.createdAt,
    userName: event.userName,
    isAiEvent: isAiEvent(event.eventType),
  }))

  const pendingRecommendations = recommendations.filter((item) =>
    PENDING_RECOMMENDATION_STATUSES.has(item.status),
  ).length
  const completedRecommendations = recommendations.filter(
    (item) => item.status === 'COMPLETED',
  ).length
  const analysisDetails = analysis?.analysis

  return {
    situation: {
      id: source.id,
      code,
      title: source.title,
      description: source.description,
      coordinationId: source.coordinationId ?? 'analyst-registry',
      coordinationCode: situationOwnerCode(source),
      coordinationName: situationOwnerLabel(source),
      categoryId: source.categoryId,
      categoryCode: source.categoryCode,
      categoryName: source.categoryName,
      status: source.status,
      severity: source.severity,
      occurredAt: source.occurredAt,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
      resolvedAt: source.resolvedAt ?? null,
      closedAt: source.closedAt ?? null,
      dueAt: source.dueAt ?? null,
      slaBreachedAt: source.slaBreachedAt ?? null,
      slaHealth:
        source.slaHealth ??
        getSituationSlaHealth({
          dueAt: source.dueAt,
          status: source.status,
          severity: source.severity,
        }),
      closedOnTime: source.closedOnTime ?? null,
      createdByUserId: source.createdByUserId,
      createdByUserName: source.createdByUserName || 'Usuario no identificado',
      assignedUserName: source.assignedUserName ?? null,
      lastStatusComment: source.lastStatusComment ?? null,
      affectedCoordinations: affected.map((item) => ({
        id: item.coordinationId,
        code: item.coordinationCode,
        name: item.coordinationName,
        impactLevel: item.impactLevel,
      })),
      recommendationsTotal: recommendations.length,
      recommendationsPending: pendingRecommendations,
      recommendationsCompleted: completedRecommendations,
      evidencesCount: evidences.length,
      timelineEventsCount: timeline.length,
      lastTimelineEventAt: timeline
        .map((event) => event.createdAt)
        .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null,
      ai: {
        hasAnalysis: Boolean(analysis),
        version: analysis?.analysisVersion ?? history?.latestVersion ?? null,
        provider: analysis?.provider ?? null,
        model: history?.items.find((item) => item.isLatest)?.model ?? null,
        confidence: analysisDetails?.confidence.overall ?? null,
        analyzedAt: analysisDetails?.analyzedAt ?? analysis?.createdAt ?? null,
        classifiedSeverity:
          analysisDetails?.incidentClassification.operationalSeverity ?? null,
        headline: analysisDetails?.executiveSummary.headline ?? null,
        summary: analysisDetails?.executiveSummary.summary ?? null,
        recommendedNextStep:
          analysisDetails?.executiveConclusion.recommendedNextStep ?? null,
        decision: analysisDetails?.executiveDecision?.decision ?? null,
        urgency: analysisDetails?.executiveDecision?.urgencyLevel ?? null,
        riskScore: analysisDetails?.riskBreakdown?.totalScore ?? null,
        estimatedDurationMinutes:
          analysisDetails?.impactAssessment.estimatedDurationMinutes ?? null,
        missingInformationCount:
          analysisDetails?.missingInformation.length ?? 0,
        immediateRisksCount: analysisDetails?.immediateRisks.length ?? 0,
        versionsCount: history?.total ?? (analysis ? 1 : 0),
      },
    },
    events,
    failures,
  }
}

function healthForRollup(
  active: number,
  critical: number,
  overdue: number,
): OperationalHealth {
  if (critical > 0 || overdue > 0) return 'critical'
  if (active > 0) return 'attention'
  return 'stable'
}

function buildCoordinationRollups(
  situations: OperationalCenterSituation[],
  catalog: CoordinationSummary[],
): OperationalCoordinationRollup[] {
  const rollups = new Map<string, OperationalCoordinationRollup>()

  for (const coordination of catalog) {
    rollups.set(coordination.id, {
      id: coordination.id,
      code: coordination.code,
      name: coordination.name,
      color: coordination.color,
      totalSituations: 0,
      activeSituations: 0,
      criticalSituations: 0,
      overdueSituations: 0,
      affectedBySituations: 0,
      pendingRecommendations: 0,
      analyzedSituations: 0,
      lastActivityAt: null,
      health: 'stable',
    })
  }

  for (const situation of situations) {
    const existing = rollups.get(situation.coordinationId) ?? {
      id: situation.coordinationId,
      code: situation.coordinationCode,
      name: situation.coordinationName,
      color: '#38d9ff',
      totalSituations: 0,
      activeSituations: 0,
      criticalSituations: 0,
      overdueSituations: 0,
      affectedBySituations: 0,
      pendingRecommendations: 0,
      analyzedSituations: 0,
      lastActivityAt: null,
      health: 'stable' as OperationalHealth,
    }
    existing.totalSituations += 1
    if (OPEN_STATUSES.has(situation.status)) existing.activeSituations += 1
    if (
      OPEN_STATUSES.has(situation.status) &&
      (situation.severity === 'CRITICAL' || situation.severity === 'HIGH')
    ) {
      existing.criticalSituations += 1
    }
    if (
      OPEN_STATUSES.has(situation.status) &&
      situation.slaHealth === 'overdue'
    ) {
      existing.overdueSituations += 1
    }
    existing.pendingRecommendations += situation.recommendationsPending
    if (situation.ai.hasAnalysis) existing.analyzedSituations += 1
    if (
      !existing.lastActivityAt ||
      new Date(situation.updatedAt).getTime() >
        new Date(existing.lastActivityAt).getTime()
    ) {
      existing.lastActivityAt = situation.updatedAt
    }
    existing.health = healthForRollup(
      existing.activeSituations,
      existing.criticalSituations,
      existing.overdueSituations,
    )
    rollups.set(existing.id, existing)

    for (const affected of situation.affectedCoordinations) {
      const target = rollups.get(affected.id)
      if (target) target.affectedBySituations += 1
    }
  }

  return [...rollups.values()].sort(
    (left, right) =>
      right.overdueSituations - left.overdueSituations ||
      right.criticalSituations - left.criticalSituations ||
      right.activeSituations - left.activeSituations ||
      right.totalSituations - left.totalSituations ||
      left.name.localeCompare(right.name, 'es'),
  )
}

function buildMetrics(
  situations: OperationalCenterSituation[],
  events: OperationalAuditEvent[],
): OperationalCenterMetrics {
  const openSituations = situations.filter((item) => item.status === 'OPEN').length
  const inProgressSituations = situations.filter(
    (item) => item.status === 'IN_PROGRESS',
  ).length
  const analyzed = situations.filter((item) => item.ai.hasAnalysis)
  const confidenceValues = analyzed
    .map((item) => item.ai.confidence)
    .filter((value): value is number => value !== null)
  const delays = situations
    .map((item) => {
      const occurred = new Date(item.occurredAt).getTime()
      const created = new Date(item.createdAt).getTime()
      if (Number.isNaN(occurred) || Number.isNaN(created)) return null
      return Math.max(0, Math.round((created - occurred) / 60_000))
    })
    .filter((value): value is number => value !== null)

  const closedWithDue = situations.filter(
    (item) => item.status === 'CLOSED' && item.dueAt && item.closedAt,
  )
  const closedOnTimeCount = closedWithDue.filter(
    (item) => item.closedOnTime === true,
  ).length
  const closureDelays = closedWithDue
    .map((item) => {
      const due = Date.parse(item.dueAt!)
      const closed = Date.parse(item.closedAt!)
      if (!Number.isFinite(due) || !Number.isFinite(closed) || closed <= due) {
        return null
      }
      return Math.round((closed - due) / 60_000)
    })
    .filter((value): value is number => value !== null)

  const overdueActiveSituations = situations.filter(
    (item) =>
      OPEN_STATUSES.has(item.status) && item.slaHealth === 'overdue',
  ).length
  const atRiskActiveSituations = situations.filter(
    (item) =>
      OPEN_STATUSES.has(item.status) && item.slaHealth === 'at_risk',
  ).length

  return {
    totalSituations: situations.length,
    openSituations,
    inProgressSituations,
    resolvedSituations: situations.filter((item) => item.status === 'RESOLVED').length,
    closedSituations: situations.filter((item) => item.status === 'CLOSED').length,
    criticalOpenSituations: situations.filter(
      (item) =>
        OPEN_STATUSES.has(item.status) &&
        (item.severity === 'CRITICAL' || item.severity === 'HIGH'),
    ).length,
    overdueActiveSituations,
    atRiskActiveSituations,
    closedOnTimeRate:
      closedWithDue.length > 0
        ? Math.round((closedOnTimeCount / closedWithDue.length) * 100)
        : null,
    averageClosureDelayMinutes:
      closureDelays.length > 0 ? Math.round(average(closureDelays) ?? 0) : null,
    situationsWithAnalysis: analyzed.length,
    situationsWithoutAnalysis: situations.length - analyzed.length,
    analysisCoverage:
      situations.length > 0 ? Math.round((analyzed.length / situations.length) * 100) : 0,
    averageAiConfidence: average(confidenceValues),
    totalAiVersions: situations.reduce(
      (total, item) => total + item.ai.versionsCount,
      0,
    ),
    reanalyzedSituations: situations.filter((item) => item.ai.versionsCount > 1).length,
    pendingRecommendations: situations.reduce(
      (total, item) => total + item.recommendationsPending,
      0,
    ),
    completedRecommendations: situations.reduce(
      (total, item) => total + item.recommendationsCompleted,
      0,
    ),
    affectedCoordinations: new Set(
      situations.flatMap((item) =>
        item.affectedCoordinations.map((coordination) => coordination.id),
      ),
    ).size,
    evidenceCount: situations.reduce((total, item) => total + item.evidencesCount, 0),
    auditEventCount: events.length,
    averageRegistrationDelayMinutes:
      delays.length > 0 ? Math.round(average(delays) ?? 0) : null,
  }
}

export async function loadOperationalCenterData(): Promise<OperationalCenterData> {
  const [situationsResponse, coordinations] = await Promise.all([
    fetchAllSituations(),
    fetchCoordinations(true),
  ])
  const enrichments = await mapWithConcurrency(
    situationsResponse.items,
    8,
    enrichSituation,
  )
  const situations = enrichments
    .map((item) => item.situation)
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
  const auditEvents = enrichments
    .flatMap((item) => item.events)
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )

  return {
    situations,
    auditEvents,
    coordinations: buildCoordinationRollups(situations, coordinations),
    metrics: buildMetrics(situations, auditEvents),
    generatedAt: new Date().toISOString(),
    totalReportedByApi: situationsResponse.total,
    partialFailures: enrichments.reduce((total, item) => total + item.failures, 0),
  }
}
