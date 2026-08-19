import type {
  ImpactArea,
  ImpactAreaBinding,
  ImpactAreaId,
  ImpactDependency,
  ImpactIncident,
  ImpactTopology,
} from '@/modules/impact-network/types/impact-network.types'

export interface ImpactNetworkStressFixture {
  topology: ImpactTopology
  incidents: readonly ImpactIncident[]
}

const STRESS_AREA_COUNT = 100
const STRESS_DEPENDENCY_COUNT = 250
const STRESS_INCIDENT_COUNT = 20

function areaId(index: number): ImpactAreaId {
  return `stress-area-${String(index + 1).padStart(3, '0')}`
}

function buildAreas(): ImpactArea[] {
  return Array.from({ length: STRESS_AREA_COUNT }, (_, index) => {
    const column = index % 10
    const row = Math.floor(index / 10)
    return {
      id: areaId(index),
      code: `S${String(index + 1).padStart(3, '0')}`,
      name: `Área de estrés ${index + 1}`,
      position: {
        x: 120 + column * 170,
        y: 90 + row * 110,
      },
    }
  })
}

function buildDependencies(): ImpactDependency[] {
  const pairs: Array<readonly [number, number]> = []

  for (let index = 0; index < STRESS_AREA_COUNT; index += 1) {
    pairs.push([index, (index + 1) % STRESS_AREA_COUNT])
    pairs.push([index, (index + 10) % STRESS_AREA_COUNT])
    if (index < 50) pairs.push([index, (index + 25) % STRESS_AREA_COUNT])
  }

  return pairs.map(([source, target], index) => ({
    id: `stress-dependency-${String(index + 1).padStart(3, '0')}`,
    sourceAreaId: areaId(source),
    targetAreaId: areaId(target),
  }))
}

function buildBindings(): ImpactAreaBinding[] {
  return Array.from({ length: STRESS_AREA_COUNT }, (_, index) => {
    const id = areaId(index)
    return {
      catalog: 'frontend',
      areaId: id,
      externalIds: [id],
      externalCodes: [`S${String(index + 1).padStart(3, '0')}`],
      externalNames: [`Área de estrés ${index + 1}`],
    }
  })
}

function buildIncidents(): ImpactIncident[] {
  const riskLevels = ['low', 'moderate', 'high', 'critical'] as const

  return Array.from({ length: STRESS_INCIDENT_COUNT }, (_, index) => {
    const sourceIndex = index * 5
    const sourceAreaId = areaId(sourceIndex)
    const affectedAreaIds = [
      sourceAreaId,
      areaId((sourceIndex + 1) % STRESS_AREA_COUNT),
      areaId((sourceIndex + 10) % STRESS_AREA_COUNT),
      areaId((sourceIndex + 20) % STRESS_AREA_COUNT),
    ]
    const riskLevel = riskLevels[index % riskLevels.length] ?? 'moderate'

    return {
      eventId: `stress-event-${String(index + 1).padStart(2, '0')}`,
      title: `Situación de carga ${index + 1}`,
      status: index % 3 === 0 ? 'monitoring' : 'open',
      sourceAreaId,
      sourceAreaName: `Área de estrés ${sourceIndex + 1}`,
      riskLevel,
      riskScore: 48 + (index % 10) * 5,
      impactSeverity: ((index % 5) + 1) as 1 | 2 | 3 | 4 | 5,
      affectedAreaIds,
      affectedAreaNames: affectedAreaIds.map(
        (id) => `Área de estrés ${Number(id.slice(-3))}`,
      ),
      reportedAt: new Date(
        Date.UTC(2026, 6, 27, 8, index),
      ).toISOString(),
      lastUpdateAt: new Date(
        Date.UTC(2026, 6, 27, 9, index),
      ).toISOString(),
      active: true,
      expansionState: index % 3 === 0 ? 'contained' : 'active',
      hasInterpretation: true,
      categoryCode: 'APLICATIVOS',
      categoryName: 'Aplicativos',
      categoryIcon: 'apps',
    }
  })
}

export function buildImpactNetworkStressFixture(): ImpactNetworkStressFixture {
  const areas = buildAreas()
  const dependencies = buildDependencies()

  return {
    topology: {
      canvas: {
        width: 1800,
        height: 1200,
        incidentCenter: { x: 900, y: 570 },
      },
      areas,
      dependencies,
      bindings: buildBindings(),
    },
    incidents: buildIncidents(),
  }
}

export const IMPACT_STRESS_EXPECTATIONS = {
  areas: STRESS_AREA_COUNT,
  dependencies: STRESS_DEPENDENCY_COUNT,
  incidents: STRESS_INCIDENT_COUNT,
} as const
