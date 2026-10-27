import { fetchSituations } from '@/modules/api/situations.api'
import type { SituationsListScope } from '@/modules/api/situations.api'
import type {
  SituationResponse,
  SituationSeverity,
} from '@/modules/situations/types/situation.types'
import type { CoordinationPanelProblem } from '@/modules/operational-cards/data/coordinationProblemFilters'
import { sortProblemsByPriority } from '@/modules/operational-cards/data/problemPriority'
import type {
  ActiveSituationStatus,
  CoordinationProblem,
} from '@/modules/operational-cards/types/operational-cards.state'

/**
 * LEVEL 1: problemas activos de una coordinación.
 *
 * El API de situaciones acepta UN solo `status` por petición (`@IsEnum`, no
 * array) y exige el UUID en `coordinationId`, así que son DOS peticiones en
 * paralelo y el identificador sale de `CoordinationOverview.id`, sin resolver
 * nada con una consulta extra.
 *
 * Nunca se pide la lista global para filtrar después, y no se traen CLOSED ni
 * RESOLVED: el filtro va en el servidor.
 */

const ACTIVE_STATUSES: readonly ActiveSituationStatus[] = ['OPEN', 'IN_PROGRESS']

/** Tope defensivo: una coordinación con más de esto es una anomalía, no una vista. */
const PAGE_LIMIT = 100

function isActiveStatus(status: string): status is ActiveSituationStatus {
  return (ACTIVE_STATUSES as readonly string[]).includes(status)
}

function toProblem(situation: SituationResponse): CoordinationProblem | null {
  // Cinturón de seguridad: si el servidor devolviera un estado no activo, no
  // entra en la lista. El filtro real ya ocurrió en SQL.
  if (!isActiveStatus(situation.status)) return null

  return {
    id: situation.id,
    title: situation.title,
    severity: situation.severity,
    status: situation.status,
    createdAt: situation.createdAt,
    slaHealth: situation.slaHealth,
    affectedCoordinationCount: situation.relatedCoordinations?.length,
    reportKind: situation.reportKind ?? 'INTERNAL',
    coordinationCode: situation.coordinationCode ?? null,
    affectedCoordinationCode: situation.affectedCoordinationCode ?? null,
  }
}

/**
 * Devuelve los problemas activos ya ordenados por prioridad NOVEX.
 * `coordinationUuid` es `CoordinationOverview.id`, no el code.
 *
 * No se aborta la petición: `fetchSituations` es un helper compartido por seis
 * vistas y no acepta `AbortSignal`. La protección equivalente vive en el
 * reducer, que descarta cualquier respuesta cuyo `code` ya no sea el
 * seleccionado, así que una respuesta tardía no puede pisar la selección.
 */
/**
 * Resultado de LEVEL 1: los problemas y CON QUÉ ALCANCE se leyeron.
 *
 * El alcance lo decide el servidor y llega en la respuesta. La interfaz no lo
 * deduce del rol: una lista vacía significa cosas distintas —«no hay
 * problemas» o «no hay ninguno que usted pueda ver»— y el mensaje depende de
 * esa diferencia, que no debe calcularse dos veces en dos sitios.
 */
export interface CoordinationProblemsResult {
  problems: CoordinationProblem[]
  scope: SituationsListScope
}

export async function fetchCoordinationProblems(
  coordinationUuid: string,
): Promise<CoordinationProblemsResult> {
  const pages = await Promise.all(
    ACTIVE_STATUSES.map((status) =>
      fetchSituations({
        coordinationId: coordinationUuid,
        status,
        limit: PAGE_LIMIT,
      }),
    ),
  )

  const problems = pages
    .flatMap((page) => page.items)
    .map(toProblem)
    .filter((problem): problem is CoordinationProblem => problem !== null)

  /*
   * Las dos peticiones (OPEN e IN_PROGRESS) comparten actor y coordinación, así
   * que el alcance es el mismo en ambas. Basta con que UNA lo declare
   * restringido para que la lista lo sea; un servidor antiguo que no lo envíe
   * se trata como completo, que es el comportamiento anterior.
   */
  const scope: SituationsListScope = pages.some(
    (page) => page.scope === 'own-only',
  )
    ? 'own-only'
    : 'complete'

  return { problems: sortProblemsByPriority(problems), scope }
}

/**
 * CERRADOS de una coordinación, para el filtro de estado del panel.
 *
 * Mismo endpoint que el historial y que LEVEL 1, con `status=CLOSED`: el
 * servidor aplica la visibilidad dual (responsable O afectada), el alcance
 * del actor (`own-only`) y la severidad, y ordena por cierre descendente. Se
 * pide PÁGINA A PÁGINA: `total` dice cuánto falta, de modo que la primera
 * página nunca se presenta como el universo. No pasa por el reducer: no
 * altera LEVEL 1, el snapshot, los KPI ni las vidas.
 */
export const CLOSED_PROBLEMS_PAGE_SIZE = 25

export interface ClosedCoordinationProblemsPage {
  problems: CoordinationPanelProblem[]
  total: number
  page: number
  limit: number
  scope: SituationsListScope
}

function toClosedProblem(situation: SituationResponse): CoordinationPanelProblem {
  return {
    id: situation.id,
    title: situation.title,
    severity: situation.severity,
    status: 'CLOSED',
    createdAt: situation.createdAt,
    affectedCoordinationCount: situation.relatedCoordinations?.length,
    reportKind: situation.reportKind ?? 'INTERNAL',
    coordinationCode: situation.coordinationCode ?? null,
    affectedCoordinationCode: situation.affectedCoordinationCode ?? null,
  }
}

export async function fetchClosedCoordinationProblems(input: {
  coordinationUuid: string
  severity: SituationSeverity | null
  page: number
}): Promise<ClosedCoordinationProblemsPage> {
  const response = await fetchSituations({
    coordinationId: input.coordinationUuid,
    status: 'CLOSED',
    severity: input.severity ?? undefined,
    page: input.page,
    limit: CLOSED_PROBLEMS_PAGE_SIZE,
  })

  return {
    problems: response.items
      .filter((situation) => situation.status === 'CLOSED')
      .map(toClosedProblem),
    total: response.total,
    page: response.page,
    limit: response.limit,
    scope: response.scope ?? 'complete',
  }
}

/**
 * Frase ejecutiva compacta de la carta activa. Determinística, sin IA.
 *
 * Devuelve null sin problemas activos: en ese caso la carta ya muestra «Todo
 * bajo control» en su cuerpo y repetirlo en la cabecera sobra.
 */
export function buildCoordinationSummary(input: {
  activeProblemsCount: number
  criticalCount: number
  affectedCoordinationCount: number
}): string | null {
  if (input.activeProblemsCount === 0) return null

  const parts = [
    input.activeProblemsCount === 1
      ? '1 problema activo'
      : `${input.activeProblemsCount} problemas activos`,
  ]

  if (input.criticalCount > 0) {
    parts.push(
      input.criticalCount === 1 ? '1 crítico' : `${input.criticalCount} críticos`,
    )
  }

  if (input.affectedCoordinationCount > 0) {
    parts.push(
      input.affectedCoordinationCount === 1
        ? 'afecta 1 área'
        : `afecta ${input.affectedCoordinationCount} áreas`,
    )
  }

  return parts.join(' · ')
}
