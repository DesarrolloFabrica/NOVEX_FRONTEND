import type {
  OperationalKpiCoordinationSnapshot,
  OperationalKpiDirectionResponse,
  OperationalKpiDirectionSnapshot,
  OperationalKpiProblemCounts,
} from '@/modules/operational-cards/types/operational-kpi.types'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'

export const DIRECTOR_KPI_CATALOG_CODES = [
  'coord-general',
  'coord-b2b',
  'coord-bellas-artes',
  'coord-desarrollo-profesional',
  'coord-empresarial',
  'coord-especializaciones',
  'coord-ingenierias',
  'coord-operaciones-academicas',
  'coord-proyeccion-social',
  'coord-saber-pro',
  'coord-transversales',
  'coord-negocios',
  'coord-homologaciones',
  'coord-fabrica-contenidos',
  'coord-servicios',
] as const

function problems(overrides: Partial<OperationalKpiProblemCounts> = {}): OperationalKpiProblemCounts {
  return {
    activeCount: 0,
    ...overrides,
    status: { open: 0, inProgress: 0, ...overrides.status },
    severity: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      ...overrides.severity,
    },
  }
}

export function kpiCoordinationFixture(
  index: number,
  overrides: Partial<OperationalKpiCoordinationSnapshot> & {
    integrityStatus?: OperationalIntegrityStatus
  } = {},
): OperationalKpiCoordinationSnapshot {
  const code = DIRECTOR_KPI_CATALOG_CODES[index] ?? `coord-extra-${index}`
  return {
    problems: problems(),
    dependencies: { incoming: 0, outgoing: 0 },
    integrityStatus: 'ESTABLE',
    lifePoints: 10,
    ...overrides,
    coordination: {
      id: `00000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`,
      code,
      name: `Coordinación ${code}`,
      shortName: code.replace('coord-', ''),
      ...overrides.coordination,
    },
  }
}

export function kpiDirectionSnapshotFixture(
  overrides: Partial<OperationalKpiDirectionSnapshot> = {},
): OperationalKpiDirectionSnapshot {
  const coordinations = Array.from({ length: 15 }, (_unused, index) =>
    kpiCoordinationFixture(index),
  )
  return {
    directionStatus: 'ESTABLE',
    problems: problems(),
    dependencies: { incoming: 0, outgoing: 0 },
    coordinationStatusTotals: {
      critical: 0,
      alert: 0,
      stable: 15,
      unknown: 0,
    },
    analystRegistry: {
      integrityStatus: 'ESTABLE',
      problems: problems(),
    },
    coordinations,
    ...overrides,
  }
}

export function kpiDirectionResponseFixture(
  directionOverrides: Partial<OperationalKpiDirectionSnapshot> = {},
): OperationalKpiDirectionResponse {
  const direction = kpiDirectionSnapshotFixture(directionOverrides)
  return {
    scope: { type: 'direction' },
    generatedAt: '2026-10-05T14:00:00.000Z',
    universe: {
      type: 'active-catalog',
      coordinationCount: direction.coordinations.length,
    },
    metricVersions: {
      integrity: 'integrity-mvp-v1',
      lifePoints: 'life-points-v1',
    },
    direction,
  }
}

export function kpiCoordinationResponseFixture(
  overrides: Partial<OperationalKpiCoordinationSnapshot> = {},
) {
  const coordination = kpiCoordinationFixture(0, overrides)
  return {
    scope: {
      type: 'coordination' as const,
      coordinationId: coordination.coordination.id,
    },
    generatedAt: '2026-10-05T14:00:00.000Z',
    universe: {
      type: 'active-catalog' as const,
      coordinationCount: 15,
    },
    metricVersions: {
      integrity: 'integrity-mvp-v1',
      lifePoints: 'life-points-v1',
    },
    coordination,
  }
}
