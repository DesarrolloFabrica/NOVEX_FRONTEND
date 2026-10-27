import { apiRequest } from '@/shared/api/http'
import type {
  AnalystRegistryOverview,
  CoordinationOverview,
  OperationalOverview,
  OperationalOverviewTotals,
} from '@/modules/operational-cards/types/operational-overview.contract'
import { parseOperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'

/**
 * LEVEL 0: única petición de la experiencia de cartas.
 *
 * Transporte y parseo viven juntos a propósito: es un solo GET y el parseo es
 * lo que da valor. Se usa el helper canónico `apiRequest`, que ya resuelve
 * base URL `/api/v1`, token y errores HTTP, igual que `coordinations.api`.
 *
 * El JSON no se confía: los estados pasan por
 * `parseOperationalIntegrityStatus` (un vocabulario inesperado degrada a
 * DESCONOCIDO, nunca a ESTABLE) y la estructura se valida antes de usarse. La
 * fórmula de integridad NO se recalcula aquí: el backend es la autoridad.
 */

const OVERVIEW_PATH = '/operational-overview'

/** El contrato raíz no es utilizable: LEVEL 0 debe ir a ERROR, no inventar datos. */
export class OperationalOverviewContractError extends Error {
  constructor(detail: string) {
    super(`Respuesta de estado operacional no utilizable: ${detail}`)
    this.name = 'OperationalOverviewContractError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readText(
  source: Record<string, unknown>,
  field: string,
  path: string,
): string {
  const value = source[field]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new OperationalOverviewContractError(
      `${path}.${field} debe ser un texto no vacío`,
    )
  }
  return value
}

/** Conteos: enteros finitos no negativos. Rechaza null, NaN, decimales y strings. */
function readCount(
  source: Record<string, unknown>,
  field: string,
  path: string,
): number {
  const value = source[field]
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new OperationalOverviewContractError(
      `${path}.${field} debe ser un entero no negativo`,
    )
  }
  return value
}

function readIsoTimestamp(
  source: Record<string, unknown>,
  field: string,
  path: string,
): string {
  const value = source[field]
  if (
    typeof value !== 'string' ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new OperationalOverviewContractError(
      `${path}.${field} debe ser una fecha ISO 8601 válida`,
    )
  }
  return value
}

function readSection(
  source: Record<string, unknown>,
  field: string,
): Record<string, unknown> {
  const value = source[field]
  if (!isRecord(value)) {
    throw new OperationalOverviewContractError(`${field} ausente o no es objeto`)
  }
  return value
}

/** Máximo de puntos de vida: 5 corazones × 2 puntos. Espejo del backend. */
export const MAX_LIFE_POINTS = 10

/**
 * Vidas del personaje. Campo DERIVADO y no estructural: un valor inutilizable
 * se degrada a `null` (estado no disponible) en lugar de tumbar todo LEVEL 0,
 * porque la mesa sigue siendo legible sin vidas.
 *
 * Solo se acepta un entero en 0..MAX_LIFE_POINTS. Todo lo demás —campo ausente
 * (backend anterior), strings, booleanos, objetos, NaN, Infinity, decimales,
 * negativos o mayores que el máximo— es `null`. No se satura ni se redondea:
 * un 11 o un -1 indican un contrato roto, no un valor cercano al límite, y
 * convertirlos en 10 o 0 afirmaría algo que el backend no dijo.
 */
export function parseLifePoints(value: unknown): number | null {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > MAX_LIFE_POINTS
  ) {
    return null
  }
  return value
}

function parseTotals(payload: Record<string, unknown>): OperationalOverviewTotals {
  const totals = readSection(payload, 'totals')
  return {
    critical: readCount(totals, 'critical', 'totals'),
    alert: readCount(totals, 'alert', 'totals'),
    stable: readCount(totals, 'stable', 'totals'),
  }
}

function parseCoordination(
  value: unknown,
  index: number,
): CoordinationOverview {
  const path = `coordinations[${index}]`
  if (!isRecord(value)) {
    throw new OperationalOverviewContractError(`${path} no es objeto`)
  }

  return {
    id: readText(value, 'id', path),
    code: readText(value, 'code', path),
    name: readText(value, 'name', path),
    shortName: readText(value, 'shortName', path),
    color: readText(value, 'color', path),
    displayOrder: readCount(value, 'displayOrder', path),
    status: parseOperationalIntegrityStatus(value.status),
    activeProblemsCount: readCount(value, 'activeProblemsCount', path),
    criticalCount: readCount(value, 'criticalCount', path),
    affectedCoordinationCount: readCount(
      value,
      'affectedCoordinationCount',
      path,
    ),
    incomingDependencyCount:
      typeof value.incomingDependencyCount === 'number' &&
      Number.isInteger(value.incomingDependencyCount) &&
      value.incomingDependencyCount >= 0
        ? value.incomingDependencyCount
        : 0,
    lifePoints: parseLifePoints(value.lifePoints),
  }
}

function parseAnalystRegistry(
  payload: Record<string, unknown>,
): AnalystRegistryOverview {
  const registry = readSection(payload, 'analystRegistry')
  return {
    status: parseOperationalIntegrityStatus(registry.status),
    activeProblemsCount: readCount(
      registry,
      'activeProblemsCount',
      'analystRegistry',
    ),
    criticalCount: readCount(registry, 'criticalCount', 'analystRegistry'),
    affectedCoordinationCount: readCount(
      registry,
      'affectedCoordinationCount',
      'analystRegistry',
    ),
  }
}

export function parseOperationalOverview(payload: unknown): OperationalOverview {
  if (!isRecord(payload)) {
    throw new OperationalOverviewContractError('la respuesta no es un objeto')
  }

  const coordinations = payload.coordinations
  if (!Array.isArray(coordinations)) {
    throw new OperationalOverviewContractError(
      'coordinations ausente o no es una lista',
    )
  }

  return {
    directionStatus: parseOperationalIntegrityStatus(payload.directionStatus),
    generatedAt: readIsoTimestamp(payload, 'generatedAt', 'overview'),
    totals: parseTotals(payload),
    coordinations: coordinations.map(parseCoordination),
    analystRegistry: parseAnalystRegistry(payload),
  }
}

export async function fetchOperationalOverview(): Promise<OperationalOverview> {
  return parseOperationalOverview(await apiRequest<unknown>(OVERVIEW_PATH))
}
