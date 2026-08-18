import { beforeEach, describe, expect, it } from 'vitest'
import {
  getCanonicalIslandPreviewAssets,
  getCoordinationIslandAsset,
  getCoordinationIslandPreviewAsset,
  getIslandPreviewAssetPath,
  resolveCoordinationId,
  resolveIslandAssetPath,
  resolveIslandColor,
  setCoordinationCatalog,
  starEdgeId,
  type CoordinationDefinition,
} from '@/modules/impact-network/data/coordination-islands.config'

const SAMPLE_CATALOG: CoordinationDefinition[] = [
  {
    id: 'coord-b2b',
    uuid: '11111111-1111-1111-1111-111111111111',
    name: 'Coordinación Supervisor B2B',
    shortName: 'B2B',
    islandAsset: '/islas/CoordB2B.webp',
    color: '#7C5CFF',
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'coord-ingenierias',
    uuid: '22222222-2222-2222-2222-222222222222',
    name: 'Coordinador Ingenierías',
    shortName: 'Ingenierías',
    islandAsset: '/islas/CoordGeneral.webp',
    color: '#00B8D9',
    displayOrder: 8,
    isActive: true,
  },
  {
    id: 'coord-operaciones-academicas',
    uuid: '33333333-3333-3333-3333-333333333333',
    name: 'Coordinador Operaciones Académicas',
    shortName: 'Op. Académicas',
    islandAsset: '/islas/CoordDesarrolloprof.webp',
    color: '#6554C0',
    displayOrder: 9,
    isActive: true,
  },
]

describe('coordination catalog (backend-driven)', () => {
  beforeEach(() => {
    setCoordinationCatalog(SAMPLE_CATALOG)
  })

  it('resuelve por code, uuid y nombre del catálogo cargado', () => {
    expect(resolveCoordinationId('coord-b2b')).toBe('coord-b2b')
    expect(resolveCoordinationId('11111111-1111-1111-1111-111111111111')).toBe(
      'coord-b2b',
    )
    expect(resolveCoordinationId('Coordinador Ingenierías')).toBe(
      'coord-ingenierias',
    )
    expect(resolveCoordinationId('alias-inventado')).toBeNull()
  })

  it('resuelve assets desde imageAsset del backend', () => {
    expect(resolveIslandAssetPath('CoordGeneral.png')).toBe(
      '/islas/CoordGeneral.webp',
    )
    expect(getCoordinationIslandAsset('coord-ingenierias')).toBe(
      '/islas/CoordGeneral.webp',
    )
    expect(getCoordinationIslandAsset('coord-operaciones-academicas')).toBe(
      '/islas/CoordDesarrolloprof.webp',
    )
    expect(getIslandPreviewAssetPath('/islas/CoordB2B.webp')).toBe(
      '/islas/CoordB2B.preview.webp',
    )
    expect(getCoordinationIslandPreviewAsset('coord-ingenierias')).toBe(
      '/islas/CoordGeneral.preview.webp',
    )
  })

  it('prioriza el arte canónico de la coordinación sobre assets legados', () => {
    expect(
      resolveIslandAssetPath('CoordBellasartes.png', 'coord-bellas-artes'),
    ).toBe('/islas/CoordBellasArtes.webp')
    expect(
      resolveIslandAssetPath('CoordGeneral.png', 'coord-ingenierias'),
    ).toBe('/islas/CoordIngenierias.webp')
    expect(resolveIslandAssetPath('CoordB2B.png', 'coord-empresarial')).toBe(
      '/islas/CoordTransformacionEmpresarial.webp',
    )
    expect(
      resolveIslandAssetPath('CoordSociallab.png', 'coord-proyeccion-social'),
    ).toBe('/islas/CoordProyeccionAcademica.webp')
    expect(resolveIslandColor('coord-b2b', '#000000')).toBe('#FF5F66')
    expect(resolveIslandColor('coord-desconocida', '#123456')).toBe('#123456')
  })

  it('genera ids de arista estables', () => {
    expect(starEdgeId('coord-ingenierias', 'coord-b2b')).toBe(
      'coord-ingenierias-->coord-b2b',
    )
  })

  it('lista previews canónicos para precargar la vista ejecutiva', () => {
    expect(getCanonicalIslandPreviewAssets(3)).toEqual([
      '/islas/CoordGeneral.preview.webp',
      '/islas/CoordB2B.preview.webp',
      '/islas/CoordBellasArtes.preview.webp',
    ])
  })
})
