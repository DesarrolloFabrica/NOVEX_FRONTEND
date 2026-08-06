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
import {
  situationOwnerCode,
  situationOwnerLabel,
} from '@/modules/situations/utils/situationOwner'
import type { UpdateSituationStatusInput } from '@/modules/monitoring/utils/situation-lifecycle'

function mapSituationToListItem(situation: SituationResponse): SituationListItem {
  return {
    id: situation.id,
    title: situation.title,
    coordinationName: situationOwnerLabel(situation),
    coordinationCode: situationOwnerCode(situation),
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
  const inProgress = situations.filter(
    (item) => item.status === 'IN_PROGRESS' || item.status === 'RESOLVED',
  ).length

  return {
    total: situations.length,
    open: situations.filter((item) => item.status === 'OPEN').length,
    inProgress,
    /** Campo legado: el ciclo de 3 estados pliega RESOLVED en inProgress. */
    resolved: 0,
    closed: situations.filter((item) => item.status === 'CLOSED').length,
    critical: situations.filter(
      (item) => item.severity === 'CRITICAL' || item.severity === 'HIGH',
    ).length,
  }
}

function mergeById(items: SituationResponse[]): SituationResponse[] {
  const map = new Map<string, SituationResponse>()
  for (const item of items) {
    map.set(item.id, item)
  }
  return [...map.values()]
}

/**
 * Carga sin cerrar primero (OPEN + IN_PROGRESS) y complementa con el resto del
 * universo reciente para que los chips de resumen no mientan.
 */
export async function loadSituationManagementList(): Promise<{
  situations: SituationListItem[]
  summary: SituationManagementSummary
  totalAvailable: number
}> {
  const [open, inProgress, all] = await Promise.all([
    fetchSituations({ status: 'OPEN', limit: 100, page: 1 }),
    fetchSituations({ status: 'IN_PROGRESS', limit: 100, page: 1 }),
    fetchSituations({ limit: 100, page: 1 }),
  ])

  const merged = mergeById([
    ...open.items,
    ...inProgress.items,
    ...all.items,
  ]).map(mapSituationToListItem)

  return {
    situations: merged,
    summary: buildSummary(merged),
    totalAvailable: Math.max(all.total, merged.length),
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
