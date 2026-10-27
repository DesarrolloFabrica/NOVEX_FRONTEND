import { fetchSituation } from '@/modules/api/situations.api'
import {
  fetchSituationEvidences,
  type SituationEvidenceItem,
} from '@/modules/api/evidences.api'
import {
  fetchSituationTimeline,
  type SituationTimelineEntry,
} from '@/modules/api/timeline.api'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import type { ProblemDetail } from '@/modules/operational-cards/types/problem-detail.types'

/**
 * LEVEL 2: detalle de un problema.
 *
 * Apertura = la situación. En cuanto está lista se piden sus evidencias, por
 * separado y sin bloquear el panel: de ellas sale «Notas del reporte». La
 * Cronología se pide solo al desplegarse. El detalle no consulta el análisis
 * IA ni sus recomendaciones.
 *
 * Las coordinaciones relacionadas (`relatedCoordinations`) no se leen aquí: no
 * representan un impacto medido ni intervienen en el Centro Operacional. Siguen
 * existiendo en el backend y en otras vistas.
 */

/** Prefijo de la historia mock del escenario QA (nunca una política real). */
const SIMULATED_POLICY_PREFIX = 'qa-'

export function toProblemDetail(situation: SituationResponse): ProblemDetail {
  return {
    id: situation.id,
    title: situation.title,
    severity: situation.severity,
    // Un backend anterior a esta fase no la envía: entonces nunca cambió.
    reportedSeverity: situation.reportedSeverity ?? situation.severity,
    severityHistory: (situation.severityHistory ?? []).map((step) => ({
      id: step.id,
      from: step.from,
      to: step.to,
      source: step.source,
      effectiveAt: step.effectiveAt,
      simulated: Boolean(step.policyCode?.startsWith(SIMULATED_POLICY_PREFIX)),
    })),
    consequences: (situation.consequences ?? []).map((item) => ({
      id: item.id,
      description: item.description,
      occurredAt: item.occurredAt,
      createdAt: item.createdAt,
      authorName: item.createdByUserName || null,
      authorRole: item.createdByRoleName,
      severityAtOccurrence: item.severityAtOccurrence,
    })),
    canAddConsequence: situation.canAddConsequence === true,
    status: situation.status,
    slaHealth: situation.slaHealth ?? null,
    dueAt: situation.dueAt ?? null,
    description: situation.description,
    coordinationName: situation.coordinationName ?? null,
    createdAt: situation.createdAt,
    coordinationCode: situation.coordinationCode ?? null,
    createdByUserName: situation.createdByUserName ?? null,
    affectedCoordinationCode: situation.affectedCoordinationCode ?? null,
    affectedCoordinationName: situation.affectedCoordinationName ?? null,
    reportKind: situation.reportKind ?? 'INTERNAL',
    affectedProcess: situation.affectedProcess ?? null,
    pendingDelivery: situation.pendingDelivery ?? null,
    /*
     * Capacidades de escritura: las decide el BACKEND. Se copian tal cual.
     * El botón «En atención» usa `canAdvanceToInProgress`, no `canUpdate`.
     */
    canResolve: situation.canResolve === true,
    canAdvanceToInProgress: situation.canAdvanceToInProgress === true,
    canUpdate: situation.canUpdate === true,
    resolution: situation.resolution
      ? {
          learning: situation.resolution.learning,
          resolvedByUserName: situation.resolution.resolvedByUserName,
          resolvedAt: situation.resolution.resolvedAt,
          closedAt: situation.closedAt ?? null,
          recordedAt: situation.resolution.recordedAt ?? null,
        }
      : null,
  }
}

export async function fetchProblemDetail(
  problemId: string,
): Promise<ProblemDetail> {
  return toProblemDetail(await fetchSituation(problemId))
}

/**
 * Eventos de la cronología que pertenecen al circuito de IA: ejecuciones del
 * análisis (`AI_*`) y el ciclo de recomendaciones (`RECOMMENDATION_*`), cuyos
 * textos citan contenido generado que este detalle ya no muestra. El resto
 * —creación, estado, severidad, comentarios, adjuntos, SLA, cierre— es
 * actividad operacional y se conserva.
 */
export function isAiTimelineEntry(entry: SituationTimelineEntry): boolean {
  return (
    entry.eventType.startsWith('AI_') ||
    entry.eventType.startsWith('RECOMMENDATION_')
  )
}

/**
 * Datos aparte de la situación, una petición cada uno: las evidencias al quedar
 * listo el detalle y la cronología al desplegarse.
 */
/**
 * Una respuesta sin la lista `items` del contrato se rechaza como error. Así
 * cae en el estado de error de la sección (con reintento) en vez de llegar a
 * la vista como algo no iterable y romper el panel entero: las evidencias se
 * piden al abrir el detalle, de modo que un fallo aquí no puede tumbarlo.
 */
function itemsOf<T>(response: { items?: unknown } | null | undefined): T[] {
  if (!response || !Array.isArray(response.items)) {
    throw new Error('La respuesta no tiene el formato esperado.')
  }
  return response.items as T[]
}

export async function fetchProblemEvidences(problemId: string) {
  return itemsOf<SituationEvidenceItem>(await fetchSituationEvidences(problemId))
}

export async function fetchProblemTimeline(problemId: string) {
  return itemsOf<SituationTimelineEntry>(
    await fetchSituationTimeline(problemId),
  ).filter((entry) => !isAiTimelineEntry(entry))
}
