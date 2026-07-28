import { describe, expect, it } from 'vitest'
import {
  COORDINATION_CATALOG,
  getCoordinationIslandAsset,
  resolveCoordinationId,
  starEdgeId,
  type CoordinationId,
} from '@/modules/impact-network/data/coordination-islands.config'

describe('coordination-islands.config', () => {
  it('resuelve ids de coordinaciones operativas y áreas institucionales', () => {
    expect(resolveCoordinationId('area-b2b')).toBe('coord-b2b')
    expect(resolveCoordinationId('TEC')).toBe('coord-ingenierias')
    expect(resolveCoordinationId('Coordinador de Operación Académica')).toBe(
      'coord-operaciones-academicas',
    )
    expect(resolveCoordinationId('Coordinador de Desarrollo Profesional')).toBe(
      'coord-desarrollo-profesional',
    )
  })

  it('asigna islas semánticas y variadas a las coordinaciones operativas', () => {
    expect(getCoordinationIslandAsset('coord-empresarial')).toBe(
      '/islas/CoordB2B.png',
    )
    expect(getCoordinationIslandAsset('coord-proyeccion-social')).toBe(
      '/islas/CoordSociallab.png',
    )
    expect(getCoordinationIslandAsset('coord-operaciones-academicas')).toBe(
      '/islas/CoordDesarrolloprof.png',
    )
    expect(getCoordinationIslandAsset('coord-ingenierias')).toBe(
      '/islas/CoordGeneral.png',
    )
  })

  it('evita islas repetidas en la propagación típica del SGP', () => {
    const sgpCoordinationIds: CoordinationId[] = [
      'coord-ingenierias',
      'coord-operaciones-academicas',
      'coord-empresarial',
    ]
    const sgpIslandAssets = sgpCoordinationIds.map(getCoordinationIslandAsset)

    expect(new Set(sgpIslandAssets).size).toBe(sgpIslandAssets.length)
  })

  it('limita el catálogo a los cinco PNG de islas disponibles', () => {
    const availableIslandAssets = new Set([
      '/islas/CoordGeneral.png',
      '/islas/CoordB2B.png',
      '/islas/CoordBellasartes.png',
      '/islas/CoordDesarrolloprof.png',
      '/islas/CoordSociallab.png',
    ])

    expect(
      COORDINATION_CATALOG.every(({ islandAsset }) =>
        availableIslandAssets.has(islandAsset),
      ),
    ).toBe(true)
    expect(
      new Set(COORDINATION_CATALOG.map(({ islandAsset }) => islandAsset)),
    ).toEqual(availableIslandAssets)
  })

  it('genera ids de aristas estrella estables', () => {
    expect(starEdgeId('coord-ingenierias', 'coord-saber-pro')).toBe(
      'coord-ingenierias-->coord-saber-pro',
    )
  })
})
