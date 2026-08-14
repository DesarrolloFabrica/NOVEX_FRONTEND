import { describe, expect, it } from 'vitest'
import type { OperationalStatus } from '@/modules/impact-network/data/executive-operational-overview.mock'
import {
  COORDINATION_PLACEMENTS,
  OPERATIONAL_TERRITORIES,
  getOperationalTerritory,
  isPointInsideTerritory,
} from '@/modules/impact-network/data/operational-territories.config'
import {
  buildOperationalMapLayout,
  hasSafeSeparation,
} from './operational-map-layout'

const COORDINATIONS = [
  'coord-b2b',
  'coord-servicios',
  'coord-bellas-artes',
  'coord-fabrica-contenidos',
  'coord-negocios',
  'coord-desarrollo-profesional',
  'coord-homologaciones',
  'coord-empresarial',
  'coord-transversales',
  'coord-especializaciones',
  'coord-saber-pro',
  'coord-ingenierias',
  'coord-proyeccion-social',
  'coord-operaciones-academicas',
] as const

const VIEWPORTS = [
  [960, 500],
  [1180, 620],
  [1560, 845],
  [1920, 1000],
] as const

describe('territorios operacionales', () => {
  it('asigna cada coordinación a un territorio existente y sin duplicados', () => {
    const seen = new Set<string>()

    for (const placement of COORDINATION_PLACEMENTS) {
      expect(seen.has(placement.coordinationId)).toBe(false)
      seen.add(placement.coordinationId)
      expect(getOperationalTerritory(placement.territoryId)).not.toBeNull()
    }

    expect(seen.size).toBe(COORDINATIONS.length)
    expect(OPERATIONAL_TERRITORIES).toHaveLength(4)
  })

  it('describe un único terreno continuo, no cuatro plataformas', () => {
    const layout = buildOperationalMapLayout(COORDINATIONS, 1560, 845)
    const fabrica = layout.nodes.find(
      (node) => node.coordinationId === 'coord-fabrica-contenidos',
    )

    expect(layout.terrain.landPath.split('Z').length - 1).toBe(1)
    expect(fabrica).toBeDefined()
    if (!fabrica) return
    expect(fabrica.x / 1560).toBeGreaterThan(0.38)
    expect(fabrica.x / 1560).toBeLessThan(0.58)
    expect(fabrica.y / 845).toBeGreaterThan(0.42)
    expect(fabrica.y / 845).toBeLessThan(0.62)
  })

  it('ubica cada coordinación dentro del contorno de su territorio', () => {
    for (const placement of COORDINATION_PLACEMENTS) {
      const territory = getOperationalTerritory(placement.territoryId)
      expect(territory).not.toBeNull()
      if (!territory) continue

      expect(
        isPointInsideTerritory(territory.outline, placement.x, placement.y),
        `${placement.coordinationId} cae fuera de ${territory.id}`,
      ).toBe(true)
    }
  })

  it('mantiene las etiquetas de sector dentro de su propio territorio', () => {
    for (const territory of OPERATIONAL_TERRITORIES) {
      expect(
        isPointInsideTerritory(
          territory.outline,
          territory.labelAnchor.x,
          territory.labelAnchor.y,
        ),
        `la etiqueta de ${territory.id} no está dentro del territorio`,
      ).toBe(true)
    }
  })
})

describe('buildOperationalMapLayout', () => {
  it('compone territorios con foco operacional en Fábrica', () => {
    const layout = buildOperationalMapLayout(COORDINATIONS, 1560, 845)
    const fabrica = layout.nodes.find(
      (node) => node.coordinationId === 'coord-fabrica-contenidos',
    )
    const b2b = layout.nodes.find((node) => node.coordinationId === 'coord-b2b')

    expect(layout.nodes).toHaveLength(14)
    expect(layout.territories).toHaveLength(4)
    expect(layout.focalCoordinationId).toBe('coord-fabrica-contenidos')
    expect(layout.focalTerritoryId).toBe('territory-production')
    expect(fabrica?.focal).toBe(true)
    expect(fabrica?.territoryId).toBe('territory-production')
    expect(b2b?.territoryId).toBe('territory-development')
    expect(
      layout.territories.filter((territory) => territory.holdsFocus),
    ).toHaveLength(1)
    expect(layout.terrain.landPath.startsWith('M')).toBe(true)
    expect(layout.terrain.borderPaths).toHaveLength(2)
    expect(layout.terrain.contourPaths.length).toBeGreaterThan(0)
    expect(layout.terrain.markerPoints.length).toBeGreaterThan(0)
  })

  it('usa tres escalas: base, afectada y foco', () => {
    const layout = buildOperationalMapLayout(COORDINATIONS, 1560, 845)
    const sizes = new Set(layout.nodes.map((node) => Math.round(node.size)))
    const fabrica = layout.nodes.find(
      (node) => node.coordinationId === 'coord-fabrica-contenidos',
    )
    const b2b = layout.nodes.find((node) => node.coordinationId === 'coord-b2b')
    const servicios = layout.nodes.find(
      (node) => node.coordinationId === 'coord-servicios',
    )

    expect(sizes.size).toBe(3)
    expect(fabrica?.scaleTier).toBe('focal')
    expect(servicios?.scaleTier).toBe('affected')
    expect(b2b?.scaleTier).toBe('normal')
    expect((fabrica?.size ?? 0) / (b2b?.size ?? 1)).toBeCloseTo(1.26, 5)
    expect((servicios?.size ?? 0) / (b2b?.size ?? 1)).toBeCloseTo(1.1, 5)
  })

  it('no mueve las islas cuando cambia el estado operacional', () => {
    const positionsFor = (status: OperationalStatus) =>
      buildOperationalMapLayout(COORDINATIONS, 1560, 845, {
        resolveStatus: () => status,
      }).nodes.map(({ coordinationId, territoryId, x, y }) => ({
        coordinationId,
        territoryId,
        x,
        y,
      }))

    const normalPositions = positionsFor('normal')
    expect(positionsFor('attention')).toEqual(normalPositions)
    expect(positionsFor('high')).toEqual(normalPositions)
    expect(positionsFor('critical')).toEqual(normalPositions)
  })

  it.each([
    ['normal', 'uniform-normal'],
    ['attention', 'uniform-attention'],
    ['high', 'uniform-high'],
    ['critical', 'uniform-critical'],
  ] as const)(
    'conserva un único foco cuando todas están %s',
    (status, expectedScenario) => {
      const layout = buildOperationalMapLayout(COORDINATIONS, 1560, 845, {
        resolveStatus: () => status,
      })

      expect(layout.statusScenario).toBe(expectedScenario)
      expect(layout.focalCoordinationId).toBe('coord-fabrica-contenidos')
      expect(layout.nodes.filter((node) => node.focal)).toHaveLength(1)
    },
  )

  it.each(VIEWPORTS)(
    'respeta el área segura de cada nodo a %sx%s',
    (width, height) => {
      const { nodes } = buildOperationalMapLayout(
        [...COORDINATIONS].reverse(),
        width,
        height,
        { resolveStatus: () => 'critical' },
      )

      for (let left = 0; left < nodes.length; left += 1) {
        for (let right = left + 1; right < nodes.length; right += 1) {
          expect(
            hasSafeSeparation(nodes[left], nodes[right]),
            `${nodes[left].coordinationId} invade a ${nodes[right].coordinationId}`,
          ).toBe(true)
        }
      }
    },
  )

  it.each(VIEWPORTS)('mantiene el panorama completo a %sx%s', (width, height) => {
    const { nodes } = buildOperationalMapLayout(COORDINATIONS, width, height)

    for (const node of nodes) {
      expect(node.x - node.size / 2).toBeGreaterThanOrEqual(0)
      expect(node.x + node.size / 2).toBeLessThanOrEqual(width)
      expect(node.y - node.size / 2).toBeGreaterThan(0)
      expect(node.y + node.size / 2).toBeLessThanOrEqual(height)
    }
  })

  it('aprovecha el fullscreen separando territorios en lugar de escalar', () => {
    const standard = buildOperationalMapLayout(COORDINATIONS, 1560, 845)
    const expanded = buildOperationalMapLayout(COORDINATIONS, 1560, 845, {
      density: 'expanded',
    })

    const spanOf = (nodes: typeof standard.nodes) => {
      const xs = nodes.map((node) => node.x)
      return Math.max(...xs) - Math.min(...xs)
    }

    expect(spanOf(expanded.nodes)).toBeGreaterThan(spanOf(standard.nodes))
    expect(expanded.baseSize).toBe(standard.baseSize)
    expect(expanded.terrain.contourPaths.length).toBeGreaterThan(
      standard.terrain.contourPaths.length,
    )
    expect(expanded.terrain.landPath).toBe(standard.terrain.landPath)
  })

  it('sigue componiendo cuando el catálogo trae coordinaciones desconocidas', () => {
    const layout = buildOperationalMapLayout(
      [...COORDINATIONS, 'coord-nueva-uno', 'coord-nueva-dos'],
      1560,
      845,
    )

    expect(layout.nodes).toHaveLength(16)
    expect(
      layout.nodes.every((node) =>
        OPERATIONAL_TERRITORIES.some(
          (territory) => territory.id === node.territoryId,
        ),
      ),
    ).toBe(true)
  })
})
