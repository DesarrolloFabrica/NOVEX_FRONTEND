import { beforeEach, describe, expect, it } from 'vitest'
import {
  GENERAL_COORDINATION_ID,
  getCoordinationCatalog,
  setCoordinationCatalog,
} from '@/modules/impact-network/data/coordination-islands.config'
import { hydrateVisibleCoordinationsFromCatalog } from '@/modules/impact-network/services/impact-network-graph.mapper'
import type { CoordinationSummary } from '@/modules/situations/types/situation.types'

function summary(
  code: string,
  name: string,
  displayOrder: number,
  isActive = true,
): CoordinationSummary {
  return {
    id: `uuid-${code}`,
    code,
    name,
    shortName: name,
    description: null,
    color: '#4d7dff',
    icon: 'network',
    imageAsset: `${code}.png`,
    displayOrder,
    isActive,
  }
}

describe('hydrateVisibleCoordinationsFromCatalog', () => {
  beforeEach(() => {
    setCoordinationCatalog([])
  })

  it('expone islas navegables sin esperar el grafo y omite Coordinación General', () => {
    const primed = hydrateVisibleCoordinationsFromCatalog([
      summary(GENERAL_COORDINATION_ID, 'General', 1),
      summary('coord-fabrica-contenidos', 'Fábrica', 2),
      summary('coord-servicios', 'Servicios', 3),
      summary('coord-inactiva', 'Inactiva', 4, false),
    ])

    expect(primed.coordinationIds).toEqual([
      'coord-fabrica-contenidos',
      'coord-servicios',
    ])
    expect(primed.coordinations.map((item) => item.shortName)).toEqual([
      'Fábrica',
      'Servicios',
    ])
    expect(getCoordinationCatalog().map((item) => item.id)).toEqual([
      GENERAL_COORDINATION_ID,
      'coord-fabrica-contenidos',
      'coord-servicios',
    ])
  })
})
