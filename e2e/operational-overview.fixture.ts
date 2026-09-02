/**
 * Respuesta de LEVEL 0 para E2E: `GET /api/v1/operational-overview`.
 * Refleja la forma real del endpoint validado en la fase 3.1, con las 15
 * coordinaciones activas y `display_order` 1-15 continuo.
 */

interface OverviewCoordinationFixture {
  id: string
  code: string
  name: string
  shortName: string
  color: string
  displayOrder: number
  status: 'ESTABLE' | 'ALERTA' | 'CRITICO' | 'DESCONOCIDO'
  activeProblemsCount: number
  criticalCount: number
  affectedCoordinationCount: number
}

const CATALOG: readonly [string, string, string, string][] = [
  ['coord-general', 'Coordinación General', 'General', '#28C8F4'],
  ['coord-b2b', 'Coordinación Supervisor B2B', 'B2B', '#FF5F66'],
  ['coord-bellas-artes', 'Coordinador Bellas Artes', 'Bellas Artes', '#6F7CFF'],
  [
    'coord-desarrollo-profesional',
    'Coordinador Desarrollo Profesional',
    'Desarrollo Prof.',
    '#B267FF',
  ],
  ['coord-empresarial', 'Coordinador Empresarial', 'Empresarial', '#A95CFF'],
  [
    'coord-especializaciones',
    'Coordinador Especializaciones',
    'Especializaciones',
    '#FF626A',
  ],
  ['coord-ingenierias', 'Coordinador Ingenierías', 'Ingenierías', '#FF8A2A'],
  [
    'coord-operaciones-academicas',
    'Coordinador Operaciones Académicas',
    'Op. Académicas',
    '#8FA7C8',
  ],
  [
    'coord-proyeccion-social',
    'Coordinador Proyección Social',
    'Proyección Social',
    '#88AD5A',
  ],
  ['coord-saber-pro', 'Coordinador Saber Pro', 'Saber Pro', '#9ACD50'],
  ['coord-transversales', 'Coordinador Transversales', 'Transversales', '#FF9A28'],
  ['coord-homologaciones', 'Homologaciones', 'Homologaciones', '#FF6978'],
  ['coord-negocios', 'Negocios', 'Negocios', '#FF7B20'],
  ['coord-fabrica-contenidos', 'Fabrica de contenidos', 'Fábrica', '#22D3E5'],
  ['coord-servicios', 'Servicios', 'Servicios', '#C050FF'],
]

/** Una crítica, una en alerta y trece estables: totals 1 / 1 / 13. */
const STATUS_BY_CODE: Readonly<Record<string, OverviewCoordinationFixture['status']>> =
  {
    'coord-operaciones-academicas': 'CRITICO',
    'coord-bellas-artes': 'ALERTA',
  }

function coordinationFixture(
  [code, name, shortName, color]: readonly [string, string, string, string],
  index: number,
): OverviewCoordinationFixture {
  const status = STATUS_BY_CODE[code] ?? 'ESTABLE'
  return {
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    code,
    name,
    shortName,
    color,
    displayOrder: index + 1,
    status,
    activeProblemsCount: status === 'CRITICO' ? 6 : status === 'ALERTA' ? 2 : 0,
    criticalCount: status === 'CRITICO' ? 1 : 0,
    affectedCoordinationCount: status === 'CRITICO' ? 2 : 0,
  }
}

export function operationalOverviewFixture(
  overrides: {
    directionStatus?: OverviewCoordinationFixture['status']
    analystRegistryActiveProblems?: number
  } = {},
) {
  const coordinations = CATALOG.map(coordinationFixture)
  const activeProblems = overrides.analystRegistryActiveProblems ?? 0

  return {
    directionStatus: overrides.directionStatus ?? 'ALERTA',
    generatedAt: '2026-09-02T14:50:27.703Z',
    totals: {
      critical: coordinations.filter((item) => item.status === 'CRITICO').length,
      alert: coordinations.filter((item) => item.status === 'ALERTA').length,
      stable: coordinations.filter((item) => item.status === 'ESTABLE').length,
    },
    coordinations,
    analystRegistry: {
      status: activeProblems > 0 ? 'ALERTA' : 'ESTABLE',
      activeProblemsCount: activeProblems,
      criticalCount: 0,
      affectedCoordinationCount: 0,
    },
  }
}
