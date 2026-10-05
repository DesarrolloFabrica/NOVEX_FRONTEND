import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'
import type { OperationalKpiCoordinationSnapshot } from '@/modules/operational-cards/types/operational-kpi.types'

export type DirectionTableSortKey =
  | 'executive'
  | 'active'
  | 'critical'
  | 'incoming'
  | 'outgoing'
  | 'lives'

export type DirectionTableSortDir = 'asc' | 'desc'

const STATUS_RANK: Record<OperationalIntegrityStatus, number> = {
  CRITICO: 0,
  ALERTA: 1,
  ESTABLE: 2,
  DESCONOCIDO: 3,
}

function compareNumber(a: number, b: number, dir: DirectionTableSortDir): number {
  return dir === 'asc' ? a - b : b - a
}

function compareLives(
  a: number | null,
  b: number | null,
  dir: DirectionTableSortDir,
): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return compareNumber(a, b, dir)
}

function compareName(
  a: OperationalKpiCoordinationSnapshot,
  b: OperationalKpiCoordinationSnapshot,
): number {
  return a.coordination.shortName.localeCompare(
    b.coordination.shortName,
    'es',
  )
}

/**
 * Orden ejecutivo: CRÍTICO → ALERTA → ESTABLE → DESCONOCIDO,
 * luego críticos DESC, activos DESC, nombre.
 */
export function compareExecutive(
  a: OperationalKpiCoordinationSnapshot,
  b: OperationalKpiCoordinationSnapshot,
): number {
  const byStatus =
    STATUS_RANK[a.integrityStatus] - STATUS_RANK[b.integrityStatus]
  if (byStatus !== 0) return byStatus
  const byCritical =
    b.problems.severity.critical - a.problems.severity.critical
  if (byCritical !== 0) return byCritical
  const byActive = b.problems.activeCount - a.problems.activeCount
  if (byActive !== 0) return byActive
  return compareName(a, b)
}

export function sortDirectionCoordinations(
  rows: readonly OperationalKpiCoordinationSnapshot[],
  key: DirectionTableSortKey,
  dir: DirectionTableSortDir,
): OperationalKpiCoordinationSnapshot[] {
  const copy = [...rows]
  copy.sort((a, b) => {
    if (key === 'executive') return compareExecutive(a, b)
    let delta = 0
    if (key === 'active') {
      delta = compareNumber(a.problems.activeCount, b.problems.activeCount, dir)
    } else if (key === 'critical') {
      delta = compareNumber(
        a.problems.severity.critical,
        b.problems.severity.critical,
        dir,
      )
    } else if (key === 'incoming') {
      delta = compareNumber(
        a.dependencies.incoming,
        b.dependencies.incoming,
        dir,
      )
    } else if (key === 'outgoing') {
      delta = compareNumber(
        a.dependencies.outgoing,
        b.dependencies.outgoing,
        dir,
      )
    } else {
      delta = compareLives(a.lifePoints, b.lifePoints, dir)
    }
    if (delta !== 0) return delta
    return compareName(a, b)
  })
  return copy
}

export function columnMax(
  rows: readonly OperationalKpiCoordinationSnapshot[],
  read: (row: OperationalKpiCoordinationSnapshot) => number,
): number {
  return rows.reduce((max, row) => Math.max(max, read(row)), 0)
}

/**
 * Intensidad 0..1 por columna. Cada columna usa su propio máximo.
 */
export function heatRatio(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0
  return value / max
}
