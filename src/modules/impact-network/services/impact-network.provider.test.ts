import { describe, expect, it } from 'vitest'
import {
  impactNetworkDataProvider,
  stubImpactPropagationAdapter,
} from '@/modules/impact-network/services/impact-network.provider'
import { mapCoordinationGraphToImpactNetwork } from '@/modules/impact-network/services/impact-network-graph.mapper'
import { getCoordinationCatalog } from '@/modules/impact-network/data/coordination-islands.config'

describe('impact network backend provider', () => {
  it('no carga topología mock desde el provider legado', async () => {
    await expect(impactNetworkDataProvider.loadTopology()).rejects.toThrow(
      /loadImpactNetworkGraph/,
    )
  })

  it('adapter de propagación no inventa replay ni simulación', async () => {
    await expect(stubImpactPropagationAdapter.loadReplay('evt-001')).resolves.toBeNull()
    await expect(
      stubImpactPropagationAdapter.simulateImpact('evt-001'),
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

    expect(model.coordinationIds).toEqual([
      'coord-general',
      'coord-ingenierias',
    ])
    expect(model.dependencies).toEqual([
      {
        id: 'dep-1',
        sourceAreaId: 'coord-general',
        targetAreaId: 'coord-ingenierias',
      },
    ])
    expect(getCoordinationCatalog()).toHaveLength(2)
    expect(model.topology.bindings[0]?.externalIds).toContain(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    )
  })
})
