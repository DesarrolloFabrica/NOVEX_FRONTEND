import type { SituationSeverity } from '@/modules/situations/types/situation.types'
import { OPERATIONAL_STATUS_LABEL } from '@/modules/operational-cards/data/operationalStatusLabel'
import type {
  CoordinationOverview,
  OperationalOverview,
} from '@/modules/operational-cards/types/operational-overview.contract'
import type {
  LoadState,
  OperationalCardsLevel1State,
} from '@/modules/operational-cards/types/operational-cards.state'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'

/**
 * Indicadores del carril ejecutivo, derivados de datos que YA están cargados.
 *
 * Función pura y determinista: no pide nada, no guarda nada y no inventa nada.
 * Es la regla que gobierna esta pieza —un indicador que necesitara una petición
 * propia convertiría el carril en la razón por la que la escena pesa más—, y
 * por eso cada cifra de aquí abajo se puede rastrear hasta un campo concreto:
 *
 *   DIRECCIÓN      LEVEL 0: `directionStatus`, `totals` y el Registro de
 *                  analista, todos agregados por el backend.
 *   COORDINACIÓN   La fila de LEVEL 0 de esa coordinación —que existe también
 *                  para las subordinaciones— y, cuando ya llegó, su LEVEL 1.
 *
 * NO hay score, índice ni porcentaje de salud. El estado operacional es una
 * etiqueta del dominio y se muestra como tal; convertirlo en número obligaría a
 * inventar una escala que nadie ha definido.
 *
 * Por qué NO se suman los problemas de todas las coordinaciones para dar un
 * total de la Dirección: `coordinations[]` trae las quince filas técnicas —las
 * cinco subordinaciones y `coord-servicios`, que no se pinta—, y no está
 * declarado si el conteo de un padre incluye ya el de sus hijas. Sumarlas sería
 * arriesgar un doble conteo presentado como dato. Ese agregado necesita
 * backend.
 */

/** Cómo se llama cada severidad cuando se cuenta en plural. */
const SEVERITY_LABEL: Record<SituationSeverity, string> = {
  CRITICAL: 'Críticos',
  HIGH: 'Altos',
  MEDIUM: 'Medios',
  LOW: 'Bajos',
}

/** Orden de lectura: de lo que urge a lo que puede esperar. */
const SEVERITY_ORDER: readonly SituationSeverity[] = [
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
]

export type OperationalKpiScope = 'DIRECTION' | 'COORDINATION'

export interface OperationalKpiCounter {
  id: string
  label: string
  /** `null` significa SIN DATO, y se dibuja como tal. Nunca como cero. */
  value: number | null
  /** Aclaración corta de qué cuenta la cifra. */
  hint?: string
}

export interface OperationalKpiSeveritySlice {
  severity: SituationSeverity
  label: string
  value: number
}

export interface OperationalKpis {
  scope: OperationalKpiScope
  /** Nombre de PRODUCTO de lo observado, o la Dirección entera. */
  contextLabel: string
  status: OperationalIntegrityStatus
  statusLabel: string
  counters: readonly OperationalKpiCounter[]
  /**
   * Reparto por severidad. Solo existe con LEVEL 1 resuelto, porque sale de la
   * lista real de problemas; sin ella no hay desglose que contar.
   */
  severity: readonly OperationalKpiSeveritySlice[] | null
  /** LEVEL 1 en vuelo: las cifras locales llegarán, todavía no están. */
  pending: boolean
}

export interface OperationalKpisInput {
  level0: LoadState
  overview: OperationalOverview | null
  /** Fila de LEVEL 0 de lo observado. `null` en estado global. */
  selectedCoordination: CoordinationOverview | null
  /** Nombre de producto de lo observado, si difiere del técnico. */
  productLabel?: string
  level1: OperationalCardsLevel1State
}

function directionKpis(overview: OperationalOverview): OperationalKpis {
  const registry = overview.analystRegistry

  return {
    scope: 'DIRECTION',
    contextLabel: 'Dirección de Operaciones',
    status: overview.directionStatus,
    statusLabel: OPERATIONAL_STATUS_LABEL[overview.directionStatus],
    counters: [
      {
        id: 'critical-coordinations',
        label: 'Coordinaciones críticas',
        value: overview.totals.critical,
      },
      {
        id: 'alert-coordinations',
        label: 'En alerta',
        value: overview.totals.alert,
      },
      {
        id: 'stable-coordinations',
        label: 'Estables',
        value: overview.totals.stable,
      },
      {
        id: 'analyst-registry',
        label: 'Registro de analista',
        value: registry.activeProblemsCount,
        /*
         * Es una fuente operacional aparte, no una coordinación: no tiene carta
         * en la mesa ni suma en los totales. Se declara para que su estado no
         * quede invisible por no tener dónde vivir.
         */
        hint: `Problemas activos · ${OPERATIONAL_STATUS_LABEL[registry.status]}`,
      },
    ],
    severity: null,
    pending: false,
  }
}

function coordinationKpis(
  coordination: CoordinationOverview,
  productLabel: string | undefined,
  level1: OperationalKpisInput['level1'],
): OperationalKpis {
  /*
   * LEVEL 1 manda en cuanto llega, y LEVEL 0 sostiene mientras tanto. Es la
   * misma regla que ya usa la cabecera de la lista de problemas: el conteo que
   * se enseña describe la lista que el usuario tiene delante, y no puede
   * contradecirla.
   */
  const ready =
    level1.status === 'ready' && level1.coordinationCode === coordination.code
  const problems = ready ? level1.problems : null

  const activeProblems = problems
    ? problems.length
    : coordination.activeProblemsCount

  const critical = problems
    ? problems.filter((problem) => problem.severity === 'CRITICAL').length
    : coordination.criticalCount

  /*
   * SLA: se cuenta el estado EXPLÍCITO que trae el DTO, nunca se deduce de
   * fechas. Y el campo es opcional: si ningún problema lo trae, el indicador
   * dice que no hay dato en lugar de afirmar que no hay vencidos, que es una
   * afirmación distinta y más fuerte.
   */
  const slaKnown = problems?.some((problem) => problem.slaHealth !== undefined)
  const overdue =
    problems && slaKnown
      ? problems.filter((problem) => problem.slaHealth === 'overdue').length
      : null

  const severity = problems
    ? SEVERITY_ORDER.map((level) => ({
        severity: level,
        label: SEVERITY_LABEL[level],
        value: problems.filter((problem) => problem.severity === level).length,
      }))
    : null

  return {
    scope: 'COORDINATION',
    contextLabel: productLabel ?? coordination.shortName,
    status: coordination.status,
    statusLabel: OPERATIONAL_STATUS_LABEL[coordination.status],
    counters: [
      {
        id: 'active-problems',
        label: 'Problemas activos',
        value: activeProblems,
      },
      { id: 'critical-problems', label: 'Críticos', value: critical },
      {
        id: 'affected-areas',
        label: 'Áreas afectadas',
        value: coordination.affectedCoordinationCount,
      },
      {
        id: 'sla-overdue',
        label: 'SLA vencidos',
        value: overdue,
        hint: overdue === null ? 'Sin dato de SLA' : undefined,
      },
    ],
    severity,
    pending: !ready && level1.status !== 'error',
  }
}

/**
 * Indicadores de lo que se esté observando. Sin overview todavía no hay nada
 * que decir, y decir cero sería mentir: se devuelve `null` y el carril muestra
 * su propia espera.
 */
export function resolveOperationalKpis(
  input: OperationalKpisInput,
): OperationalKpis | null {
  if (input.level0 !== 'ready' || !input.overview) return null

  return input.selectedCoordination
    ? coordinationKpis(input.selectedCoordination, input.productLabel, input.level1)
    : directionKpis(input.overview)
}
