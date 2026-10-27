import type { SituationSeverity } from '@/modules/situations/types/situation.types'
import type {
  ActiveSituationStatus,
  CoordinationProblem,
} from '@/modules/operational-cards/types/operational-cards.state'
import type { SituationsListScope } from '@/modules/api/situations.api'

/**
 * Filtros del panel «Problemas de la coordinación».
 *
 * Son de PRESENTACIÓN: no tocan LEVEL 1, el snapshot operacional ni sus
 * conteos. Los activos (abiertos y en revisión) se filtran sobre la lista de
 * LEVEL 1 que el panel ya tenía; los cerrados se piden aparte, paginados, con
 * la severidad aplicada en el servidor.
 */

export type SeverityFilter = 'ALL' | SituationSeverity

/**
 * `ACTIVE` = OPEN + IN_PROGRESS. `ALL` = activos + cerrados. RESOLVED es un
 * valor legado que ningún flujo produce y no forma parte de ninguna opción.
 */
export type StatusFilter = 'ACTIVE' | 'ALL' | ActiveSituationStatus | 'CLOSED'

export interface ProblemListFilters {
  severity: SeverityFilter
  status: StatusFilter
}

export const DEFAULT_PROBLEM_LIST_FILTERS: ProblemListFilters = {
  severity: 'ALL',
  status: 'ACTIVE',
}

export const SEVERITY_FILTER_OPTIONS: readonly {
  value: SeverityFilter
  label: string
}[] = [
  { value: 'ALL', label: 'Todas las severidades' },
  { value: 'CRITICAL', label: 'Crítica' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'LOW', label: 'Baja' },
]

export const STATUS_FILTER_OPTIONS: readonly {
  value: StatusFilter
  label: string
}[] = [
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'ALL', label: 'Todos' },
  { value: 'OPEN', label: 'Abiertos' },
  { value: 'IN_PROGRESS', label: 'En revisión' },
  { value: 'CLOSED', label: 'Cerrados' },
]

/**
 * Etiquetas de estado de ESTE panel. `IN_PROGRESS` se presenta como «En
 * revisión»; el valor interno y el resto de vistas no cambian.
 */
export const PANEL_STATUS_LABEL: Readonly<Record<string, string>> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En revisión',
  RESOLVED: 'En revisión',
  CLOSED: 'Cerrado',
}

/** Fila del panel: un activo de LEVEL 1 o un cerrado del filtro. */
export interface CoordinationPanelProblem
  extends Omit<CoordinationProblem, 'status'> {
  status: ActiveSituationStatus | 'CLOSED'
}

export function needsActiveProblems(status: StatusFilter): boolean {
  return status !== 'CLOSED'
}

export function needsClosedProblems(status: StatusFilter): boolean {
  return status === 'CLOSED' || status === 'ALL'
}

export function isDefaultProblemListFilters(filters: ProblemListFilters): boolean {
  return (
    filters.severity === DEFAULT_PROBLEM_LIST_FILTERS.severity &&
    filters.status === DEFAULT_PROBLEM_LIST_FILTERS.status
  )
}

/** Activos de LEVEL 1 que pasan los dos filtros (AND). Conserva el orden. */
export function filterActiveProblems(
  problems: readonly CoordinationProblem[],
  filters: ProblemListFilters,
): CoordinationProblem[] {
  if (!needsActiveProblems(filters.status)) return []
  return problems.filter(
    (problem) =>
      (filters.severity === 'ALL' || problem.severity === filters.severity) &&
      (filters.status === 'ACTIVE' ||
        filters.status === 'ALL' ||
        problem.status === filters.status),
  )
}

const SEVERITY_PHRASE: Record<SituationSeverity, string> = {
  CRITICAL: 'críticos',
  HIGH: 'de severidad alta',
  MEDIUM: 'de severidad media',
  LOW: 'de severidad baja',
}

const STATUS_PHRASE: Record<StatusFilter, string | null> = {
  ACTIVE: 'activos',
  ALL: null,
  OPEN: 'abiertos',
  IN_PROGRESS: 'en revisión',
  CLOSED: 'cerrados',
}

/**
 * Vacío con filtros: dice QUÉ combinación no tiene resultados, p. ej. «No hay
 * problemas críticos en revisión». Con lectura parcial aclara que se habla de
 * lo visible para el usuario, no del área.
 */
export function buildFilteredEmptyMessage(
  filters: ProblemListFilters,
  scope: SituationsListScope,
): string {
  const status = STATUS_PHRASE[filters.status]
  const parts = ['No hay problemas']
  if (filters.severity === 'CRITICAL') {
    parts.push(SEVERITY_PHRASE.CRITICAL)
    if (status) parts.push(status)
  } else {
    if (status) parts.push(status)
    if (filters.severity !== 'ALL') parts.push(SEVERITY_PHRASE[filters.severity])
  }
  if (!status && filters.severity === 'ALL') parts.push('registrados')
  if (scope === 'own-only') parts.push('visibles para tu usuario')
  return parts.join(' ')
}
