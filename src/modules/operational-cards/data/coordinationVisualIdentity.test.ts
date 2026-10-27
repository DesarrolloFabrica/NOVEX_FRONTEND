import { beforeEach, describe, expect, it } from 'vitest'
import {
  setCoordinationCatalog,
  type CoordinationDefinition,
} from '@/modules/impact-network/data/coordination-islands.config'
import {
  getCoordinationVisualIdentities,
  getCoordinationVisualIdentity,
} from '@/modules/operational-cards/data/coordinationVisualIdentity'

/**
 * Espejo de TEST del catálogo institucional verificado en `coordinations`
 * (15 activas, display_order 1-15 continuo). No es una fuente de verdad: el
 * código de producción lee el catálogo runtime hidratado desde el backend.
 *
 * El `color` de todas las entradas es negro y el `islandAsset` es el valor
 * legado del backend a propósito: así se comprueba que la identidad canónica
 * del frontend se impone sobre lo que llegue por la API.
 */
const BACKEND_COLOR_PLACEHOLDER = '#000000'

const INSTITUTIONAL_CATALOG_FIXTURE: readonly CoordinationDefinition[] = [
  ['coord-general', 'Coordinación General', 'General', 1],
  ['coord-b2b', 'Coordinación Supervisor B2B', 'B2B', 2],
  ['coord-bellas-artes', 'Coordinador Bellas Artes', 'Bellas Artes', 3],
  [
    'coord-desarrollo-profesional',
    'Coordinador Desarrollo Profesional',
    'Desarrollo Prof.',
    4,
  ],
  ['coord-empresarial', 'Coordinador Empresarial', 'Empresarial', 5],
  [
    'coord-especializaciones',
    'Coordinador Especializaciones',
    'Especializaciones',
    6,
  ],
  ['coord-ingenierias', 'Coordinador Ingenierías', 'Ingenierías', 7],
  [
    'coord-operaciones-academicas',
    'Coordinador Operaciones Académicas',
    'Op. Académicas',
    8,
  ],
  [
    'coord-proyeccion-social',
    'Coordinador Proyección Social',
    'Proyección Social',
    9,
  ],
  ['coord-saber-pro', 'Coordinador Saber Pro', 'Saber Pro', 10],
  ['coord-transversales', 'Coordinador Transversales', 'Transversales', 11],
  ['coord-homologaciones', 'Homologaciones', 'Homologaciones', 12],
  ['coord-negocios', 'Negocios', 'Negocios', 13],
  ['coord-fabrica-contenidos', 'Fabrica de contenidos', 'Fábrica', 14],
  ['coord-servicios', 'Servicios', 'Servicios', 15],
].map(([id, name, shortName, displayOrder]) => ({
  id: id as string,
  uuid: `00000000-0000-0000-0000-${String(displayOrder).padStart(12, '0')}`,
  name: name as string,
  shortName: shortName as string,
  islandAsset: 'CoordGeneral.png',
  color: BACKEND_COLOR_PLACEHOLDER,
  displayOrder: displayOrder as number,
  isActive: true,
}))

describe('coordinationVisualIdentity · coordinación conocida', () => {
  beforeEach(() => {
    setCoordinationCatalog(INSTITUTIONAL_CATALOG_FIXTURE)
  })

  it('compone las piezas de identidad de una coordinación', () => {
    expect(getCoordinationVisualIdentity('coord-bellas-artes')).toEqual({
      code: 'coord-bellas-artes',
      uuid: '00000000-0000-0000-0000-000000000003',
      name: 'Coordinador Bellas Artes',
      shortName: 'Bellas Artes',
      displayOrder: 3,
      color: '#6F7CFF',
      iconAsset: '/iconos/display/IconoBellasArtes.jpg',
      islandAsset: '/islas/CoordBellasArtes.webp',
    })
  })

  it('no expone la propiedad legacy `id`: la clave del módulo es `code`', () => {
    const identity = getCoordinationVisualIdentity('coord-general')
    expect(identity).not.toBeNull()
    expect(Object.keys(identity ?? {})).toEqual([
      'code',
      'uuid',
      'name',
      'shortName',
      'displayOrder',
      'color',
      'iconAsset',
      'islandAsset',
    ])
    expect(identity).not.toHaveProperty('id')
    for (const item of getCoordinationVisualIdentities()) {
      expect(item).not.toHaveProperty('id')
    }
  })

  it('la unión con el contrato HTTP se hace por code, no por uuid', () => {
    // Espejo de lo que hará la UI: overview.code === visualIdentity.code.
    const overviewRow = {
      id: '00000000-0000-0000-0000-000000000010',
      code: 'coord-saber-pro',
    }
    const identity = getCoordinationVisualIdentity(overviewRow.code)
    expect(identity?.code).toBe(overviewRow.code)
    expect(identity?.uuid).toBe(overviewRow.id)
  })

  it('resuelve también por uuid y por nombre del catálogo', () => {
    expect(
      getCoordinationVisualIdentity('00000000-0000-0000-0000-000000000002')
        ?.code,
    ).toBe('coord-b2b')
    expect(getCoordinationVisualIdentity('Coordinador Ingenierías')?.code).toBe(
      'coord-ingenierias',
    )
    expect(getCoordinationVisualIdentity('Saber Pro')?.code).toBe(
      'coord-saber-pro',
    )
  })

  it('Coordinación General es una coordinación más', () => {
    const general = getCoordinationVisualIdentity('coord-general')
    expect(general?.displayOrder).toBe(1)
    expect(general?.iconAsset).toBe('/iconos/display/IconoCoordGeneral.jpg')
    expect(general?.islandAsset).toBe('/islas/CoordGeneral.webp')
  })

  it('preserva nombre, shortName y displayOrder del catálogo', () => {
    const identity = getCoordinationVisualIdentity('coord-fabrica-contenidos')
    expect(identity?.name).toBe('Fabrica de contenidos')
    expect(identity?.shortName).toBe('Fábrica')
    expect(identity?.displayOrder).toBe(14)
  })

  it('impone el arte canónico del frontend sobre el asset legado del backend', () => {
    // Las 15 entradas del fixture llegan con islandAsset 'CoordGeneral.png'.
    expect(getCoordinationVisualIdentity('coord-empresarial')?.islandAsset).toBe(
      '/islas/CoordTransformacionEmpresarial.webp',
    )
    expect(
      getCoordinationVisualIdentity('coord-proyeccion-social')?.islandAsset,
    ).toBe('/islas/CoordProyeccionAcademica.webp')
  })
})

describe('coordinationVisualIdentity · las 15 coordinaciones activas', () => {
  beforeEach(() => {
    setCoordinationCatalog(INSTITUTIONAL_CATALOG_FIXTURE)
  })

  it('resuelve todas las coordinaciones del catálogo', () => {
    const identities = getCoordinationVisualIdentities()
    expect(identities).toHaveLength(INSTITUTIONAL_CATALOG_FIXTURE.length)
    expect(identities).toHaveLength(15)
  })

  it('ninguna queda sin icono', () => {
    for (const identity of getCoordinationVisualIdentities()) {
      expect(identity.iconAsset).toMatch(/^\/iconos\/display\/.+\.(png|jpg)$/)
    }
  })

  it('ninguna queda sin isla', () => {
    for (const identity of getCoordinationVisualIdentities()) {
      expect(identity.islandAsset).toMatch(/^\/islas\/.+\.webp$/)
    }
  })

  it('ninguna queda sin color, y ninguna hereda el color del backend', () => {
    for (const identity of getCoordinationVisualIdentities()) {
      expect(identity.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(identity.color).not.toBe(BACKEND_COLOR_PLACEHOLDER)
    }
  })

  it('cada coordinación tiene su propia isla y su propio icono', () => {
    const identities = getCoordinationVisualIdentities()
    expect(new Set(identities.map((item) => item.islandAsset)).size).toBe(15)
    expect(new Set(identities.map((item) => item.iconAsset)).size).toBe(15)
  })

  it('no emite ids duplicados', () => {
    const ids = getCoordinationVisualIdentities().map((item) => item.code)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('conserva displayOrder y lo usa como orden estable de la baraja', () => {
    const orders = getCoordinationVisualIdentities().map(
      (item) => item.displayOrder,
    )
    expect(orders).toEqual([...orders].sort((left, right) => left - right))
    expect(orders[0]).toBe(1)
    expect(orders.at(-1)).toBe(15)
  })

  it('ordena por displayOrder aunque el catálogo llegue desordenado', () => {
    setCoordinationCatalog([...INSTITUTIONAL_CATALOG_FIXTURE].reverse())
    expect(
      getCoordinationVisualIdentities().map((item) => item.displayOrder),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
  })

  it('excluye las coordinaciones inactivas del catálogo', () => {
    setCoordinationCatalog(
      INSTITUTIONAL_CATALOG_FIXTURE.map((item) =>
        item.id === 'coord-servicios' ? { ...item, isActive: false } : item,
      ),
    )
    const ids = getCoordinationVisualIdentities().map((item) => item.code)
    expect(ids).toHaveLength(14)
    expect(ids).not.toContain('coord-servicios')
  })
})

describe('coordinationVisualIdentity · casos no resolubles', () => {
  beforeEach(() => {
    setCoordinationCatalog(INSTITUTIONAL_CATALOG_FIXTURE)
  })

  it('una coordinación desconocida devuelve null en lugar de fabricar una carta', () => {
    expect(getCoordinationVisualIdentity('coord-inexistente')).toBeNull()
    expect(getCoordinationVisualIdentity('alias-inventado')).toBeNull()
  })

  it('valores vacíos devuelven null', () => {
    expect(getCoordinationVisualIdentity(null)).toBeNull()
    expect(getCoordinationVisualIdentity(undefined)).toBeNull()
    expect(getCoordinationVisualIdentity('')).toBeNull()
    expect(getCoordinationVisualIdentity('   ')).toBeNull()
  })

  it('sin catálogo hidratado no hay identidades', () => {
    setCoordinationCatalog([])
    expect(getCoordinationVisualIdentities()).toEqual([])
    expect(getCoordinationVisualIdentity('coord-general')).toBeNull()
  })

  it('una coordinación nueva del backend cae en el fallback canónico documentado', () => {
    // Está en el catálogo, luego se resuelve; pero no tiene arte canónico
    // asignado todavía. El icono cae en el general y la isla se deriva del
    // imageAsset que envía el backend. No se devuelven assets vacíos.
    setCoordinationCatalog([
      ...INSTITUTIONAL_CATALOG_FIXTURE,
      {
        id: 'coord-nueva',
        uuid: '00000000-0000-0000-0000-000000000016',
        name: 'Coordinación Nueva',
        shortName: 'Nueva',
        islandAsset: 'CoordNueva.png',
        color: '#123456',
        displayOrder: 16,
        isActive: true,
      },
    ])

    const identity = getCoordinationVisualIdentity('coord-nueva')
    expect(identity).not.toBeNull()
    expect(identity?.iconAsset).toBe('/iconos/display/IconoCoordGeneral.jpg')
    expect(identity?.islandAsset).toBe('/islas/CoordNueva.webp')
    expect(identity?.color).toBe('#123456')
    expect(getCoordinationVisualIdentities()).toHaveLength(16)
  })
})
