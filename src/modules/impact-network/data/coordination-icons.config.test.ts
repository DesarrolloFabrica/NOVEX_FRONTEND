import { describe, expect, it } from 'vitest'
import {
  getCanonicalCoordinationIconAssets,
  getCoordinationIconAsset,
} from '@/modules/impact-network/data/coordination-icons.config'

describe('coordination icon catalog', () => {
  it('asigna el icono institucional correcto a cada coordinación', () => {
    expect(getCoordinationIconAsset('coord-b2b')).toBe(
      '/iconos/display/IconoB2B.png',
    )
    expect(getCoordinationIconAsset('coord-fabrica-contenidos')).toBe(
      '/iconos/display/IconoFabrica.png',
    )
    expect(getCoordinationIconAsset('coord-empresarial')).toBe(
      '/iconos/display/IconoDirectorOp.jpg',
    )
    expect(getCoordinationIconAsset('coord-operaciones-academicas')).toBe(
      '/iconos/display/IconoOPacademica.png',
    )
  })

  it('nunca vuelve a una isla cuando el catálogo recibe un id nuevo', () => {
    expect(getCoordinationIconAsset('coord-nueva')).toBe(
      '/iconos/display/IconoCoordGeneral.jpg',
    )
    expect(getCanonicalCoordinationIconAssets()).toHaveLength(15)
    expect(
      getCanonicalCoordinationIconAssets().every((asset) =>
        asset.startsWith('/iconos/display/'),
      ),
    ).toBe(true)
  })
})
