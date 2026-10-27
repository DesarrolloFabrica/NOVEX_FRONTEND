import { fetchSituations } from '@/modules/api/situations.api'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import type {
  ProblemHistoryEntry,
  ProblemHistoryPage,
  ProblemHistoryPeriod,
} from '@/modules/operational-cards/types/problem-history.types'
import {
  isValidHistoryPeriod,
  colombiaDayEndIso,
  colombiaDayStartIso,
  PROBLEM_HISTORY_PAGE_SIZE,
} from '@/modules/operational-cards/data/problemHistoryPeriod'

/**
 * Historial de problemas CERRADOS. El servidor filtra por `status=CLOSED` y
 * `closedFrom`/`closedTo`; no se descarga el histórico completo al navegador.
 */

function toHistoryEntry(situation: SituationResponse): ProblemHistoryEntry {
  const learning = situation.resolution?.learning?.trim() || null
  return {
    id: situation.id,
    title: situation.title,
    severity: situation.severity,
    status: 'CLOSED',
    reportKind: situation.reportKind ?? 'INTERNAL',
    coordinationCode: situation.coordinationCode ?? null,
    coordinationName: situation.coordinationName ?? null,
    affectedCoordinationCode: situation.affectedCoordinationCode ?? null,
    affectedCoordinationName: situation.affectedCoordinationName ?? null,
    closedAt: situation.closedAt ?? situation.resolvedAt ?? null,
    resolvedByUserName: situation.resolution?.resolvedByUserName ?? null,
    learningPreview: learning
      ? learning.length > 140
        ? `${learning.slice(0, 137)}…`
        : learning
      : null,
  }
}

export async function fetchClosedProblemHistory(input: {
  period: ProblemHistoryPeriod
  coordinationId?: string | null
  page?: number
}): Promise<ProblemHistoryPage> {
  if (!isValidHistoryPeriod(input.period)) {
    throw new Error('El intervalo de fechas de cierre no es válido.')
  }

  const page = input.page ?? 1
  const response = await fetchSituations({
    status: 'CLOSED',
    closedFrom: colombiaDayStartIso(input.period.from),
    closedTo: colombiaDayEndIso(input.period.to),
    coordinationId: input.coordinationId?.trim() || undefined,
    page,
    limit: PROBLEM_HISTORY_PAGE_SIZE,
  })

  return {
    items: response.items.map(toHistoryEntry),
    total: response.total,
    page: response.page,
    limit: response.limit,
    scope: response.scope ?? 'complete',
  }
}
