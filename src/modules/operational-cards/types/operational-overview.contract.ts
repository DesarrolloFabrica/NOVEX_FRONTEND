import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'

/**
 * Contrato proyectado de LEVEL 0: `GET /operational-overview`.
 *
 * Todavía no se consume. Es la forma mínima que la experiencia necesita para
 * pintar la baraja y el estado global con UNA sola petición.
 *
 * Deliberadamente FUERA de este contrato:
 * - `overdueCount` y cualquier dato de SLA: el SLA no determina la integridad
 *   de una coordinación, y LEVEL 0 no ordena problemas. Entrará, si acaso, en
 *   el contrato de LEVEL 1, donde sí se usa para el ranking.
 * - `triggeredCriticalRules`, `violations`, el conteo de desconocidas y el
 *   desglose `highCount` / `mediumCount` / `lowCount`: pueden existir en el
 *   dominio backend, pero no pertenecen a este contrato.
 * - Cualquier ruta de arte: el arte lo resuelve el frontend
 *   (`coordinationVisualIdentity`).
 */

/**
 * Ojo con la nomenclatura de identificadores en este sistema:
 * en los DTO HTTP `id` es el UUID y `code` es el identificador legible
 * (`coord-general`); en el catálogo runtime del frontend ocurre lo contrario.
 * Este contrato sigue la convención HTTP, igual que `CoordinationSummary`.
 * La clave con la que se resuelve la identidad visual y la URL es `code`.
 */
export interface CoordinationOverview {
  /** UUID de la coordinación. */
  id: string
  /** Identificador legible, p. ej. `coord-general`. Clave de la URL. */
  code: string
  name: string
  shortName: string
  /** Color de identidad. NO comunica estado operacional. */
  color: string
  displayOrder: number
  status: OperationalIntegrityStatus
  activeProblemsCount: number
  criticalCount: number
  affectedCoordinationCount: number
}

/**
 * Reparto de COORDINACIONES por estado. Describe exclusivamente
 * `coordinations[]`: el Registro de analista nunca suma aquí.
 *
 * No suma necesariamente el total: una coordinación en DESCONOCIDO no entra en
 * ninguno de los tres. El número de cartas se toma de `coordinations.length`,
 * nunca de aquí.
 */
export interface OperationalOverviewTotals {
  critical: number
  alert: number
  stable: number
}

/**
 * Registro de analista: situaciones registradas por un ANALISTA, que no
 * representa a ninguna coordinación y por tanto nacen sin área dueña
 * (`coordinationId = null`). Es un estado legítimo del dominio, no un dato
 * incompleto.
 *
 * Es una FUENTE OPERACIONAL ADICIONAL, no una coordinación:
 * - vive fuera de `coordinations[]`;
 * - no suma en `totals`;
 * - no cuenta como carta ni entra en `totalCoordinations`;
 * - no se asigna a Coordinación General ni a ninguna otra.
 *
 * Su `status` lo calcula el backend con el mismo criterio operacional que una
 * coordinación (severidad, acumulación, propagación). El frontend solo lo
 * consume.
 */
export interface AnalystRegistryOverview {
  status: OperationalIntegrityStatus
  activeProblemsCount: number
  criticalCount: number
  affectedCoordinationCount: number
}

/**
 * `directionStatus` combina las coordinaciones y el Registro de analista. La
 * fórmula es autoridad del BACKEND y no se replica aquí; queda documentada
 * como contrato esperado:
 *
 *   criticalSignals = criticalCoordinationsCount + (analystRegistry CRITICO ? 1 : 0)
 *   alertSignals    = alertCoordinationsCount    + (analystRegistry ALERTA  ? 1 : 0)
 *   alertThreshold  = ceil(totalCoordinations / 3)   // sin Registro de analista
 *
 *   1. criticalSignals >= 2            -> CRITICO
 *   2. algún estado DESCONOCIDO        -> DESCONOCIDO
 *   3. criticalSignals === 1           -> ALERTA
 *   4. alertSignals >= alertThreshold  -> ALERTA
 *   5. resto                           -> ESTABLE
 */
export interface OperationalOverview {
  /** Estado de la Dirección de Operaciones, ya calculado por el backend. */
  directionStatus: OperationalIntegrityStatus
  /** ISO 8601. Alimenta el «Actualizado hace X». */
  generatedAt: string
  totals: OperationalOverviewTotals
  coordinations: readonly CoordinationOverview[]
  analystRegistry: AnalystRegistryOverview
}
