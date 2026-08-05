import { fetchAnalysisHistory, tryFetchSituationAnalysis } from '@/modules/api/analysis.api'
import { fetchSituationEvidences } from '@/modules/api/evidences.api'
import { fetchSituationAffectedCoordinations, fetchSituationImpact } from '@/modules/api/impact.api'
import { fetchSituationRecommendations } from '@/modules/api/recommendations.api'
import { fetchSituation, fetchSituations, updateSituation } from '@/modules/api/situations.api'
import { fetchSituationTimeline } from '@/modules/api/timeline.api'
import type {
  SituationDossier,
  SituationListItem,
  SituationManagementSummary,
} from '@/modules/api/types/situation-management.types'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import type { UpdateSituationStatusInput } from '@/modules/monitoring/utils/situation-lifecycle'

function mapSituationToListItem(situation: SituationResponse): SituationListItem {
  return {
    id: situation.id,
    title: situation.title,
    coordinationName: situation.coordinationName ?? 'Sin coordinación asignada',
    coordinationCode: situation.coordinationCode ?? 'SIN_COORDINACION',
    categoryName: situation.categoryName,
    severity: situation.severity,
    status: situation.status,
    createdAt: situation.createdAt,
    updatedAt: situation.updatedAt,
    occurredAt: situation.occurredAt,
    createdByUserName: situation.createdByUserName,
    assignedUserName: situation.assignedUserName ?? null,
  }
}

function buildSummary(situations: SituationListItem[]): SituationManagementSummary {
  return {
    total: situations.length,
    open: situations.filter((item) => item.status === 'OPEN').length,
    inProgress: situations.filter((item) => item.status === 'IN_PROGRESS').length,
    resolved: situations.filter((item) => item.status === 'RESOLVED').length,
    closed: situations.filter((item) => item.status === 'CLOSED').length,
    critical: situations.filter(
      (item) => item.severity === 'CRITICAL' || item.severity === 'HIGH',
    ).length,
  }
}

export async function loadSituationManagementList(): Promise<{
  situations: SituationListItem[]
  summary: SituationManagementSummary
}> {
  const response = await fetchSituations({ limit: 100, page: 1 })
  const situations = response.items.map(mapSituationToListItem)
  return {
    situations,
    summary: buildSummary(situations),
  }
}

export async function loadSituationDossier(
  situationId: string,
): Promise<SituationDossier> {
  const [
    situation,
    analysis,
    impact,
    affectedCoordinations,
    recommendations,
    timeline,
    evidences,
    analysisHistory,
  ] = await Promise.all([
    fetchSituation(situationId),
    tryFetchSituationAnalysis(situationId),
    fetchSituationImpact(situationId).catch(() => null),
    fetchSituationAffectedCoordinations(situationId).catch(() => null),
    fetchSituationRecommendations(situationId).then((response) => response.items),
    fetchSituationTimeline(situationId).then((response) => response.items),
    fetchSituationEvidences(situationId).then((response) => response.items),
    fetchAnalysisHistory(situationId).catch(() => ({
      situationId,
      items: [],
      total: 0,
      latestVersion: null,
    })),
  ])

  return {
    situation,
    analysis,
    impact,
    affectedCoordinations,
    recommendations,
    timeline,
    evidences,
    analysisHistory,
  }
}

export async function updateSituationStatus(
  situationId: string,
  input: UpdateSituationStatusInput,
): Promise<SituationResponse> {
  return updateSituation(situationId, {
    status: input.status,
    statusComment: input.statusComment,
    evidenceIds: input.evidenceIds,
  })
}
