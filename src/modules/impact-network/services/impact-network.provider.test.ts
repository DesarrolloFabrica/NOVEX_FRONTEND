import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  backendImpactPropagationAdapter,
  impactNetworkDataProvider,
  stubImpactPropagationAdapter,
} from '@/modules/impact-network/services/impact-network.provider'
import { mapCoordinationGraphToImpactNetwork } from '@/modules/impact-network/services/impact-network-graph.mapper'
import {
  getCoordination,
  getCoordinationCatalog,
  resolveCoordinationId,
  setCoordinationCatalog,
} from '@/modules/impact-network/data/coordination-islands.config'
import { simulateSituationImpact } from '@/modules/api/impact.api'
import { ApiError } from '@/shared/api/http'

vi.mock('@/modules/api/impact.api', () => ({
  simulateSituationImpact: vi.fn(),
}))

describe('impact network backend provider', () => {
  beforeEach(() => {
    vi.mocked(simulateSituationImpact).mockReset()
    setCoordinationCatalog([
      {
        id: 'coord-a',
        uuid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name: 'Coordinación A',
        shortName: 'A',
        islandAsset: '/islas/a.webp',
        color: '#111111',
        displayOrder: 1,
        isActive: true,
      },
      {
        id: 'coord-b',
        uuid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        name: 'Coordinación B',
        shortName: 'B',
        islandAsset: '/islas/b.webp',
        color: '#222222',
        displayOrder: 2,
        isActive: true,
      },
      {
        id: 'coord-c',
        uuid: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        name: 'Coordinación C',
        shortName: 'C',
        islandAsset: '/islas/c.webp',
        color: '#333333',
        displayOrder: 3,
        isActive: true,
      },
    ])
  })

  it('no carga topología mock desde el provider legado', async () => {
    await expect(impactNetworkDataProvider.loadTopology()).rejects.toThrow(
      /loadImpactNetworkGraph/,
    )
  })

  it('adapter stub no inventa replay ni simulación', async () => {
    await expect(
      stubImpactPropagationAdapter.loadReplay('evt-001'),
    ).resolves.toBeNull()
    await expect(
      stubImpactPropagationAdapter.simulateImpact('evt-001'),
    ).resolves.toBeNull()
  })

  it('adapter real mapea hasta dos islas del análisis IA', async () => {
    vi.mocked(simulateSituationImpact).mockResolvedValue({
      situationId: 'sit-1',
      generatedAt: '2026-08-05T12:00:00.000Z',
      horizonMinutes: 30,
      source: 'ai_assessment',
      canSimulate: true,
      hasDeclaredRelated: false,
      potentialCoordinations: [
        {
          coordinationId: 'id-a',
          coordinationCode: 'coord-a',
          coordinationName: 'A',
          coordinationShortName: 'A',
          impactLevel: 'CRITICAL',
          description: 'crit',
          source: 'simulated',
        },
        {
          coordinationId: 'id-b',
          coordinationCode: 'coord-b',
          coordinationName: 'B',
          coordinationShortName: 'B',
          impactLevel: 'HIGH',
          description: 'high',
          source: 'simulated',
        },
        {
          coordinationId: 'id-c',
          coordinationCode: 'coord-c',
          coordinationName: 'C',
          coordinationShortName: 'C',
          impactLevel: 'LOW',
          description: 'low',
          source: 'simulated',
        },
      ],
      message: null,
    })

    const prediction = await backendImpactPropagationAdapter.simulateImpact(
      'sit-1',
      { horizonMinutes: 30 },
    )

    expect(prediction?.potentialAreaIds).toEqual(['coord-a', 'coord-b'])
  })

  it('adapter real no inventa datos si el endpoint no existe', async () => {
    vi.mocked(simulateSituationImpact).mockRejectedValue(
      new ApiError('Not Found', 404),
    )

    await expect(
      backendImpactPropagationAdapter.simulateImpact('sit-1'),
    ).resolves.toBeNull()
  })

  it('mapea el grafo del backend a topología e islas', () => {
    const model = mapCoordinationGraphToImpactNetwork({
      coordinations: [
        {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          code: 'coord-general',
          name: 'Coordinación General',
          shortName: 'General',
          description: null,
          color: '#4F8EF7',
          icon: 'coord-general',
          imageAsset: 'CoordGeneral.png',
          displayOrder: 1,
          isActive: true,
        },
        {
          id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          code: 'coord-ingenierias',
          name: 'Coordinador Ingenierías',
          shortName: 'Ingenierías',
          description: null,
          color: '#00B8D9',
          icon: 'coord-ingenierias',
          imageAsset: 'CoordGeneral.png',
          displayOrder: 2,
          isActive: true,
        },
      ],
      dependencies: [
        {
          id: 'dep-1',
          sourceCoordinationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          targetCoordinationId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          dependencyWeight: 3,
          dependencyType: 'technical',
          bidirectional: false,
        },
      ],
    })

    expect(model.coordinationIds).toEqual(['coord-ingenierias'])
    expect(model.dependencies).toEqual([])
    expect(getCoordinationCatalog()).toHaveLength(2)
    expect(getCoordination('coord-general').shortName).toBe('General')
    expect(model.topology.bindings[0]?.externalIds).toContain(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    )
  })

  it('resuelve islas fuera del alcance del actor con el catálogo institucional', () => {
    const scopedCoordination = {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      code: 'coord-saber-pro',
      name: 'Coordinador Saber Pro',
      shortName: 'Saber Pro',
      description: null,
      color: '#9ACD50',
      icon: 'coord-saber-pro',
      imageAsset: 'CoordSaberPro.png',
      displayOrder: 10,
      isActive: true,
    }
    const outOfScopeCoordination = {
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      code: 'coord-b2b',
      name: 'Coordinación Supervisor B2B',
      shortName: 'B2B',
      description: null,
      color: '#FF5F66',
      icon: 'coord-b2b',
      imageAsset: 'CoordB2B.png',
      displayOrder: 2,
      isActive: true,
    }

    const model = mapCoordinationGraphToImpactNetwork(
      { coordinations: [scopedCoordination], dependencies: [] },
      [outOfScopeCoordination, scopedCoordination],
    )

    expect(model.coordinationIds).toEqual(['coord-saber-pro'])
    expect(resolveCoordinationId('coord-b2b')).toBe('coord-b2b')
    expect(getCoordination('coord-b2b').shortName).toBe('B2B')
  })
})
