import { describe, expect, it } from 'vitest'
import { IMPACT_TOPOLOGY } from '@/modules/impact-network/data/impact-topology.mock'
import {
  getPrediction,
  getReplay,
  mockImpactNetworkDataProvider,
} from '@/modules/impact-network/services/impact-network.provider'

describe('mockImpactNetworkDataProvider', () => {
  it('entrega copias de topología que no permiten contaminar el fixture', async () => {
    const first = await mockImpactNetworkDataProvider.loadTopology()
    const second = await mockImpactNetworkDataProvider.loadTopology()

    expect(first).toEqual(IMPACT_TOPOLOGY)
    expect(first).not.toBe(second)
    expect(first.areas).not.toBe(second.areas)
    expect(first.areas[0]).not.toBe(second.areas[0])
    expect(first.areas[0]?.position).not.toBe(second.areas[0]?.position)
    expect(first.bindings[0]?.externalNames).not.toBe(
      second.bindings[0]?.externalNames,
    )
  })

  it('devuelve null para expedientes nuevos sin enriquecimiento explícito', async () => {
    await expect(
      mockImpactNetworkDataProvider.loadReplay('event-without-fixture'),
    ).resolves.toBeNull()
    await expect(
      mockImpactNetworkDataProvider.simulateImpact('event-without-fixture'),
    ).resolves.toBeNull()
    expect(getReplay('event-without-fixture')).toBeNull()
    expect(getPrediction('event-without-fixture')).toBeNull()
  })

  it('clona replays para que el consumidor no altere llamadas posteriores', () => {
    const first = getReplay('evt-001')
    const second = getReplay('evt-001')

    expect(first).toEqual(second)
    expect(first).not.toBe(second)
    expect(first?.steps).not.toBe(second?.steps)
    expect(first?.steps[0]).not.toBe(second?.steps[0])
  })

  it('recorta una simulación por horizonte sin mutar la predicción base', async () => {
    const short = await mockImpactNetworkDataProvider.simulateImpact(
      'evt-001',
      { horizonMinutes: 10 },
    )
    const full = await mockImpactNetworkDataProvider.simulateImpact('evt-001')

    expect(short).toMatchObject({
      eventId: 'evt-001',
      horizonMinutes: 10,
      potentialAreaIds: ['communications'],
    })
    expect(short?.steps).toHaveLength(1)
    expect(full).toMatchObject({
      horizonMinutes: 30,
      potentialAreaIds: ['communications', 'wellbeing'],
    })
    expect(full?.steps).toHaveLength(2)
  })
})

