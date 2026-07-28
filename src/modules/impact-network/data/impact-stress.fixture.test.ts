import { describe, expect, it } from 'vitest'
import {
  buildImpactNetworkStressFixture,
  IMPACT_STRESS_EXPECTATIONS,
} from '@/modules/impact-network/data/impact-stress.fixture'
import {
  aggregateAreaSignals,
  aggregateDependencyTraffic,
  placeIncidentSlots,
} from '@/modules/impact-network/selectors/impact-network.selectors'

describe('impact network stress fixture', () => {
  it('mantiene 100 posiciones, 250 dependencias y 20 incidentes deterministas', () => {
    const first = buildImpactNetworkStressFixture()
    const second = buildImpactNetworkStressFixture()

    expect(first.topology.areas).toHaveLength(IMPACT_STRESS_EXPECTATIONS.areas)
    expect(first.topology.dependencies).toHaveLength(
      IMPACT_STRESS_EXPECTATIONS.dependencies,
    )
    expect(first.incidents).toHaveLength(IMPACT_STRESS_EXPECTATIONS.incidents)
    expect(first).toEqual(second)
    expect(
      new Set(
        first.topology.areas.map(
          (area) => `${area.position.x}:${area.position.y}`,
        ),
      ).size,
    ).toBe(IMPACT_STRESS_EXPECTATIONS.areas)
  })

  it('agrega el escenario completo dentro del presupuesto de interacción', () => {
    const fixture = buildImpactNetworkStressFixture()
    const startedAt = performance.now()

    const areas = aggregateAreaSignals(
      fixture.incidents,
      fixture.topology,
    )
    const traffic = aggregateDependencyTraffic(
      fixture.incidents,
      fixture.topology,
    )
    const slots = placeIncidentSlots(
      fixture.incidents,
      fixture.topology,
    )
    const elapsed = performance.now() - startedAt

    expect(areas).toHaveLength(IMPACT_STRESS_EXPECTATIONS.areas)
    expect(traffic).toHaveLength(IMPACT_STRESS_EXPECTATIONS.dependencies)
    expect(slots).toHaveLength(IMPACT_STRESS_EXPECTATIONS.incidents)
    expect(traffic.filter((edge) => edge.highTrafficRank !== null).length)
      .toBeLessThanOrEqual(5)
    expect(elapsed).toBeLessThan(1_500)
  })
})
