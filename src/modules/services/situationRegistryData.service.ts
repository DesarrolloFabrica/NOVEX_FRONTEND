import {
  fetchAnalysisHistory,
  tryFetchSituationAnalysis,
} from '@/modules/api/analysis.api'
import { fetchCoordinations } from '@/modules/api/coordinations.api'
import { fetchSituationRecommendations } from '@/modules/api/recommendations.api'
import { fetchSituations } from '@/modules/api/situations.api'
import type {
  SituationRegistryCategoryOption,
  SituationRegistryData,
  SituationRegistryIndicators,
  SituationRegistryRow,
  SituationRegistrySummary,
} from '@/modules/api/types/situation-registry.types'
import type { RiskLevel } from '@/modules/operational-events/types/operational-event.types'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'

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

function situationCode(id: string): string {
  return `SIT-${id.slice(0, 8).toUpperCase()}`
}

function isOpenStatus(status: string): boolean {
  return status === 'OPEN' || status === 'IN_PROGRESS'
}

function isClosedStatus(status: string): boolean {
  return status === 'CLOSED' || status === 'RESOLVED'
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((total, value) => total + value, 0) / values.length
}

async function enrichSituationRow(
  situation: SituationResponse,
): Promise<SituationRegistryRow> {
  const [analysis, recommendations, history] = await Promise.allSettled([
    tryFetchSituationAnalysis(situation.id),
    fetchSituationRecommendations(situation.id).catch(() => ({ items: [] })),
    fetchAnalysisHistory(situation.id).catch(() => null),
  ])

  const analysisValue =
    analysis.status === 'fulfilled' ? analysis.value : null
  const recommendationsValue =
    recommendations.status === 'fulfilled' ? recommendations.value.items : []
  const historyValue =
    history.status === 'fulfilled' ? history.value : null

  const analysisSeverity =
    analysisValue?.analysis.incidentClassification.operationalSeverity ??
    situation.severity
  const riskScore = SEVERITY_TO_SCORE[analysisSeverity]
  const pendingRecommendations = recommendationsValue.filter(
    (item) => item.status === 'PENDING' || item.status === 'IN_PROGRESS',
  ).length

  return {
    id: situation.id,
    code: situationCode(situation.id),
    title: situation.title,
    coordinationId: situation.coordinationId ?? 'sin-coordinacion',
    coordinationCode: situation.coordinationCode ?? 'SIN_COORDINACION',
    coordinationName: situation.coordinationName ?? 'Sin coordinación asignada',
    categoryId: situation.categoryId,
    categoryCode: situation.categoryCode,
    categoryName: situation.categoryName,
    status: situation.status,
    severity: situation.severity,
    riskScore,
    riskLevel: SEVERITY_TO_RISK[analysisSeverity],
    aiConfidence: analysisValue?.analysis.confidence.overall ?? null,
    occurredAt: situation.occurredAt,
    updatedAt: situation.updatedAt,
    createdAt: situation.createdAt,
    hasAnalysis: Boolean(analysisValue),
    isReanalyzed: (historyValue?.total ?? 0) > 1,
    pendingRecommendations,
    analysisVersion: analysisValue?.analysisVersion ?? null,
    analysisProvider: analysisValue?.provider ?? null,
  }
}

function buildSummary(rows: SituationRegistryRow[]): SituationRegistrySummary {
  const confidences = rows
    .map((row) => row.aiConfidence)
    .filter((value): value is number => value !== null)

  return {
    openSituations: rows.filter((row) => isOpenStatus(row.status)).length,
    criticalSituations: rows.filter(
      (row) => row.severity === 'CRITICAL' || row.severity === 'HIGH',
    ).length,
    closedSituations: rows.filter((row) => isClosedStatus(row.status)).length,
    pendingRecommendations: rows.reduce(
      (total, row) => total + row.pendingRecommendations,
      0,
    ),
    averageAiConfidence: average(confidences),
  }
}

function buildIndicators(rows: SituationRegistryRow[]): SituationRegistryIndicators {
  return {
    withAnalysis: rows.filter((row) => row.hasAnalysis).length,
    withoutAnalysis: rows.filter((row) => !row.hasAnalysis).length,
    reanalyzed: rows.filter((row) => row.isReanalyzed).length,
    withPendingRecommendations: rows.filter(
      (row) => row.pendingRecommendations > 0,
    ).length,
  }
}

function buildCategories(
  rows: SituationRegistryRow[],
): SituationRegistryCategoryOption[] {
  const map = new Map<string, SituationRegistryCategoryOption>()
  for (const row of rows) {
    if (!map.has(row.categoryId)) {
      map.set(row.categoryId, {
        id: row.categoryId,
        code: row.categoryCode,
        name: row.categoryName,
      })
    }
  }
  return [...map.values()].sort((left, right) =>
    left.name.localeCompare(right.name, 'es'),
  )
}

export async function loadSituationRegistryData(): Promise<SituationRegistryData> {
  const [situationsResponse, coordinations] = await Promise.all([
    fetchSituations({ limit: 100, page: 1 }),
    fetchCoordinations(),
  ])

  void coordinations

  const rows = await Promise.all(
    situationsResponse.items.map((situation) => enrichSituationRow(situation)),
  )

  return {
    rows,
    summary: buildSummary(rows),
    indicators: buildIndicators(rows),
    categories: buildCategories(rows),
  }
}
