import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  resolveIslandAssetPath,
  setCoordinationCatalog,
  type CoordinationDefinition,
} from '@/modules/impact-network/data/coordination-islands.config'
import {
  buildExecutiveOverviewModel,
  cleanExecutiveCopy,
  resolveProblemCategoryId,
  resolveSituationOperationalStatus,
} from '@/modules/impact-network/data/executive-operational-overview.model'
import type { SituationResponse } from '@/modules/situations/types/situation.types'

const COORDINATIONS: readonly CoordinationDefinition[] = [
  ['coord-uno', 'Coordinación Uno'],
  ['coord-dos', 'Coordinación Dos'],
  ['coord-tres', 'Coordinación Tres'],
  ['coord-cuatro', 'Coordinación Cuatro'],
  ['coord-cinco', 'Coordinación Cinco'],
].map(([id, name], index) => ({
  id,
  uuid: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  name,
  shortName: name.replace('Coordinación ', ''),
  islandAsset: resolveIslandAssetPath('CoordGeneral.png', id),
  color: '#5be76b',
  displayOrder: index + 1,
  isActive: true,
}))

function situation(
  id: string,
  coordinationCode: string,
  severity: SituationResponse['severity'],
  overrides: Partial<SituationResponse> = {},
): SituationResponse {
  return {
    id,
    title: `Situación ${id}`,
    description: 'Contexto operacional de prueba.',
    coordinationId: coordinationCode,
    coordinationCode,
    coordinationName: coordinationCode,
    createdByUserId: 'user-1',
    createdByUserName: 'Usuario',
    categoryId: 'category-1',
    categoryCode: 'APLICATIVOS',
    categoryName: 'Aplicativos',
    severity,
    status: 'OPEN',
    occurredAt: '2026-08-18T11:00:00.000Z',
    createdAt: '2026-08-18T11:00:00.000Z',
    updatedAt: '2026-08-18T11:00:00.000Z',
    ...overrides,
  }
}

describe('buildExecutiveOverviewModel', () => {
  beforeEach(() => setCoordinationCatalog(COORDINATIONS))
  afterEach(() => setCoordinationCatalog([]))

  it('agrupa dinámicamente por la mayor severidad activa', () => {
    const model = buildExecutiveOverviewModel(
      COORDINATIONS.map((item) => item.id),
      [
        situation('critical', 'coord-uno', 'CRITICAL'),
        situation('high', 'coord-dos', 'HIGH'),
        situation('attention', 'coord-tres', 'MEDIUM'),
        situation('closed', 'coord-cuatro', 'CRITICAL', { status: 'CLOSED' }),
      ],
    )

    expect(model.groups.critical.map((item) => item.id)).toEqual(['coord-uno'])
    expect(model.groups.high.map((item) => item.id)).toEqual(['coord-dos'])
    expect(model.groups.attention.map((item) => item.id)).toEqual([
      'coord-tres',
    ])
    expect(model.groups.normal.map((item) => item.id)).toEqual([
      'coord-cinco',
      'coord-cuatro',
    ])
    expect(model.metrics.affected).toBe(3)
    expect(model.metrics.openSituations).toBe(3)
  })

  it('incluye las coordinaciones relacionadas sin duplicar situaciones', () => {
    const model = buildExecutiveOverviewModel(
      COORDINATIONS.map((item) => item.id),
      [
        situation('shared', 'coord-uno', 'HIGH', {
          relatedCoordinations: [
            {
              id: 'related-1',
              coordinationId: 'coord-dos',
              coordinationCode: 'coord-dos',
              coordinationName: 'Coordinación Dos',
              coordinationShortName: 'Dos',
              displayOrder: 2,
            },
          ],
        }),
      ],
      { operationalRisk: 71 },
    )

    expect(model.groups.high.map((item) => item.id)).toEqual([
      'coord-dos',
      'coord-uno',
    ])
    expect(model.metrics.activeProblems).toBe(2)
    expect(model.metrics.openSituations).toBe(1)
    expect(model.metrics.operationalRisk).toBe(71)
    expect(model.priorities[0]?.affectedCoordinationCount).toBe(2)

    const relatedView = model.coordinations.find((item) => item.id === 'coord-dos')
    expect(relatedView?.situations[0]?.ownerCoordinationId).toBe('coord-uno')
    expect(relatedView?.situations[0]?.ownerShortName).toBe('Uno')
  })

  it('prioriza situaciones propias sobre las solo relacionadas', () => {
    const model = buildExecutiveOverviewModel(
      COORDINATIONS.map((item) => item.id),
      [
        situation('foreign-high', 'coord-uno', 'CRITICAL', {
          relatedCoordinations: [
            {
              id: 'related-1',
              coordinationId: 'coord-dos',
              coordinationCode: 'coord-dos',
              coordinationName: 'Coordinación Dos',
              coordinationShortName: 'Dos',
              displayOrder: 2,
            },
          ],
        }),
        situation('owned-medium', 'coord-dos', 'MEDIUM'),
      ],
    )

    const coordDos = model.coordinations.find((item) => item.id === 'coord-dos')
    expect(coordDos?.situations.map((item) => item.id)).toEqual([
      'owned-medium',
      'foreign-high',
    ])
    expect(coordDos?.situations[0]?.ownerCoordinationId).toBe('coord-dos')
  })

  it('incluye relaciones legacy declaradas dentro de la descripción', () => {
    const model = buildExecutiveOverviewModel(
      COORDINATIONS.map((item) => item.id),
      [
        situation('legacy-shared', 'coord-uno', 'HIGH', {
          description:
            'Contexto operacional.\n\nCoordinaciones relacionadas (percepción inicial): coord-dos · Coordinación Dos',
        }),
      ],
    )

    expect(model.groups.high.map((item) => item.id)).toEqual([
      'coord-dos',
      'coord-uno',
    ])
    expect(model.metrics.activeProblems).toBe(2)
    expect(model.metrics.openSituations).toBe(1)
    expect(model.priorities[0]?.affectedCoordinationCount).toBe(2)
  })

  it('mantiene todas las coordinaciones normales cuando no hay situaciones', () => {
    const model = buildExecutiveOverviewModel(
      COORDINATIONS.map((item) => item.id),
      [],
    )

    expect(model.groups.normal).toHaveLength(5)
    expect(model.groups.critical).toHaveLength(0)
    expect(model.groups.high).toHaveLength(0)
    expect(model.groups.attention).toHaveLength(0)
    expect(model.priorities).toHaveLength(0)
    expect(model.categories).toHaveLength(0)
  })

  it('clasifica categorías de backend con un fallback de procesos', () => {
    expect(resolveProblemCategoryId('INTERNET', 'Internet institucional')).toBe(
      'internet',
    )
    expect(resolveProblemCategoryId('EQUIPOS', 'Falla de equipos')).toBe(
      'devices',
    )
    expect(resolveProblemCategoryId('DIPLOMADOS', 'Diplomados')).toBe(
      'diplomas',
    )
    expect(resolveProblemCategoryId('OTHER', 'Caso operativo')).toBe('other')
  })

  it('no convierte una coordinación en crítica por acumular situaciones', () => {
    const manyMediumSituations = Array.from({ length: 8 }, (_, index) =>
      situation(`medium-${index}`, 'coord-uno', 'MEDIUM'),
    )
    const manyHighSituations = Array.from({ length: 6 }, (_, index) =>
      situation(`high-${index}`, 'coord-dos', 'HIGH'),
    )
    const model = buildExecutiveOverviewModel(
      COORDINATIONS.map((item) => item.id),
      [...manyMediumSituations, ...manyHighSituations],
    )

    expect(model.groups.attention.map((item) => item.id)).toContain('coord-uno')
    expect(model.groups.high.map((item) => item.id)).toContain('coord-dos')
    expect(model.groups.critical).toHaveLength(0)
  })

  it('usa severidad, ciclo de vida y SLA para determinar criticidad', () => {
    expect(
      resolveSituationOperationalStatus(
        situation('critical-open', 'coord-uno', 'CRITICAL'),
      ),
    ).toBe('critical')
    expect(
      resolveSituationOperationalStatus(
        situation('critical-resolved', 'coord-uno', 'CRITICAL', {
          status: 'RESOLVED',
        }),
      ),
    ).toBe('attention')
    expect(
      resolveSituationOperationalStatus(
        situation('high-overdue', 'coord-uno', 'HIGH', {
          slaHealth: 'overdue',
        }),
      ),
    ).toBe('critical')
    expect(
      resolveSituationOperationalStatus(
        situation('critical-closed', 'coord-uno', 'CRITICAL', {
          status: 'CLOSED',
        }),
      ),
    ).toBeNull()
  })

  it('ordena y numera prioridades sin exponer marcadores de seed', () => {
    const model = buildExecutiveOverviewModel(
      COORDINATIONS.map((item) => item.id),
      [
        situation('attention', 'coord-dos', 'MEDIUM'),
        situation('critical', 'coord-uno', 'CRITICAL', {
          title: '[MOCK-SEED] Caída del servicio',
          description:
            'Interrupción confirmada. Contexto reportado por el generador de pruebas.',
        }),
      ],
    )

    expect(model.priorities.map((item) => item.rank)).toEqual([1, 2])
    expect(model.priorities[0]?.summary).not.toMatch(/mock|seed/i)
    expect(cleanExecutiveCopy('MOCK-SEED · Alerta operativa')).toBe(
      'Alerta operativa',
    )
  })
})
