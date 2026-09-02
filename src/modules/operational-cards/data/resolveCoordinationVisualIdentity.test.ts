import { beforeEach, describe, expect, it } from 'vitest'
import {
  getCoordinationCatalog,
  setCoordinationCatalog,
} from '@/modules/impact-network/data/coordination-islands.config'
import {
  getCoordinationVisualIdentity,
  resolveCoordinationVisualIdentity,
  type CoordinationVisualIdentitySource,
} from '@/modules/operational-cards/data/coordinationVisualIdentity'

/**
 * Filas tal como las emite `GET /api/v1/operational-overview`: `id` es el UUID
 * y `code` el código institucional. Es el mismo catálogo verificado en la BD
 * (15 activas, display_order 1-15), pero como FIXTURE de test: el código de
 * producción no declara ninguna coordinación.
 *
 * El color de todas las filas es negro a propósito, para comprobar que el
 * color canónico del frontend se impone sobre el que llegue por la API.
 */
const BACKEND_COLOR_PLACEHOLDER = '#000000'

const OVERVIEW_ROWS: readonly CoordinationVisualIdentitySource[] = (
  [
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
  ] as const
).map(([code, name, shortName, displayOrder]) => ({
  id: `00000000-0000-4000-8000-${String(displayOrder).padStart(12, '0')}`,
  code,
  name,
  shortName,
  color: BACKEND_COLOR_PLACEHOLDER,
  displayOrder,
}))

function rowFor(code: string): CoordinationVisualIdentitySource {
  const row = OVERVIEW_ROWS.find((item) => item.code === code)
  if (!row) throw new Error(`Fila ausente en el fixture: ${code}`)
  return row
}

describe('resolveCoordinationVisualIdentity · sin catálogo runtime', () => {
  beforeEach(() => {
    // El catálogo global compartido con la Red de impacto queda VACÍO.
    setCoordinationCatalog([])
  })

  it('resuelve la identidad con el catálogo runtime global vacío', () => {
    expect(getCoordinationCatalog()).toHaveLength(0)
    // El selector legacy no puede resolver nada sin catálogo…
    expect(getCoordinationVisualIdentity('coord-bellas-artes')).toBeNull()

    // …y el compositor de la experiencia sí, porque la fila es la autoridad.
    expect(
      resolveCoordinationVisualIdentity(rowFor('coord-bellas-artes')),
    ).toEqual({
      code: 'coord-bellas-artes',
      uuid: '00000000-0000-4000-8000-000000000003',
      name: 'Coordinador Bellas Artes',
      shortName: 'Bellas Artes',
      displayOrder: 3,
      color: '#6F7CFF',
      iconAsset: '/iconos/display/IconoBellasArtes.jpg',
      islandAsset: '/islas/CoordBellasArtes.webp',
    })
  })

  it('resuelve las 15 coordinaciones del overview', () => {
    const identities = OVERVIEW_ROWS.map(resolveCoordinationVisualIdentity)
    expect(identities).toHaveLength(15)
    expect(new Set(identities.map((item) => item.code)).size).toBe(15)
  })

  it('code es la clave de unión y uuid preserva el id del overview', () => {
    for (const row of OVERVIEW_ROWS) {
      const identity = resolveCoordinationVisualIdentity(row)
      expect(identity.code).toBe(row.code)
      expect(identity.uuid).toBe(row.id)
      expect(identity.code).not.toBe(identity.uuid)
    }
  })

  it('ninguna identidad queda sin icono', () => {
    for (const row of OVERVIEW_ROWS) {
      expect(resolveCoordinationVisualIdentity(row).iconAsset).toMatch(
        /^\/iconos\/display\/.+\.(png|jpg)$/,
      )
    }
  })

  it('ninguna identidad queda sin isla', () => {
    for (const row of OVERVIEW_ROWS) {
      expect(resolveCoordinationVisualIdentity(row).islandAsset).toMatch(
        /^\/islas\/.+\.webp$/,
      )
    }
  })

  it('cada coordinación conserva isla e icono propios', () => {
    const identities = OVERVIEW_ROWS.map(resolveCoordinationVisualIdentity)
    expect(new Set(identities.map((item) => item.islandAsset)).size).toBe(15)
    expect(new Set(identities.map((item) => item.iconAsset)).size).toBe(15)
  })

  it('impone el color canónico del frontend sobre el del backend', () => {
    for (const row of OVERVIEW_ROWS) {
      const identity = resolveCoordinationVisualIdentity(row)
      expect(identity.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(identity.color).not.toBe(BACKEND_COLOR_PLACEHOLDER)
    }
  })

  it('preserva nombre, shortName y displayOrder de la fila', () => {
    const identity = resolveCoordinationVisualIdentity(
      rowFor('coord-fabrica-contenidos'),
    )
    expect(identity.name).toBe('Fabrica de contenidos')
    expect(identity.shortName).toBe('Fábrica')
    expect(identity.displayOrder).toBe(14)
  })

  it('Coordinación General se resuelve como una coordinación más', () => {
    const identity = resolveCoordinationVisualIdentity(rowFor('coord-general'))
    expect(identity.displayOrder).toBe(1)
    expect(identity.iconAsset).toBe('/iconos/display/IconoCoordGeneral.jpg')
    expect(identity.islandAsset).toBe('/islas/CoordGeneral.webp')
  })
})

describe('resolveCoordinationVisualIdentity · sin efectos globales', () => {
  it('no muta el catálogo runtime compartido con la Red de impacto', () => {
    const sentinel = [
      {
        id: 'coord-sentinela',
        uuid: 'sentinela-uuid',
        name: 'Sentinela',
        shortName: 'Sentinela',
        islandAsset: '/islas/CoordGeneral.webp',
        color: '#123456',
        displayOrder: 99,
        isActive: true,
      },
    ]
    setCoordinationCatalog(sentinel)

    OVERVIEW_ROWS.forEach(resolveCoordinationVisualIdentity)

    // Si la experiencia hidratara el catálogo, aquí habría 15 entradas.
    expect(getCoordinationCatalog()).toEqual(sentinel)
    expect(getCoordinationCatalog()).toHaveLength(1)
  })

  it('es pura: la misma fila produce siempre la misma identidad', () => {
    const row = rowFor('coord-negocios')
    expect(resolveCoordinationVisualIdentity(row)).toEqual(
      resolveCoordinationVisualIdentity(row),
    )
  })
})

describe('resolveCoordinationVisualIdentity · códigos desconocidos', () => {
  beforeEach(() => {
    setCoordinationCatalog([])
  })

  it('el selector por catálogo sigue devolviendo null, sin identidad sintética', () => {
    setCoordinationCatalog([
      {
        id: 'coord-general',
        uuid: '00000000-0000-4000-8000-000000000001',
        name: 'Coordinación General',
        shortName: 'General',
        islandAsset: '/islas/CoordGeneral.webp',
        color: '#28C8F4',
        displayOrder: 1,
        isActive: true,
      },
    ])

    expect(getCoordinationVisualIdentity('coord-inexistente')).toBeNull()
    expect(getCoordinationVisualIdentity('')).toBeNull()
    expect(getCoordinationVisualIdentity(null)).toBeNull()
  })

  it('una coordinación sin arte canónico cae en el fallback documentado, no en un asset vacío', () => {
    // La fila viene del backend, luego existe; lo que no existe es su arte.
    const identity = resolveCoordinationVisualIdentity({
      id: '00000000-0000-4000-8000-000000000016',
      code: 'coord-nueva',
      name: 'Coordinación Nueva',
      shortName: 'Nueva',
      color: '#123456',
      displayOrder: 16,
    })

    expect(identity.code).toBe('coord-nueva')
    expect(identity.iconAsset).toBe('/iconos/display/IconoCoordGeneral.jpg')
    // Sin arte canónico, la isla se deriva del propio code. El contrato de
    // LEVEL 0 no transporta `imageAsset` a propósito, así que el code es la
    // única entrada disponible: nunca una cadena vacía.
    expect(identity.islandAsset).toBe('/islas/coord-nueva.webp')
    // El color sí cae al del backend porque no hay canónico para ese code.
    expect(identity.color).toBe('#123456')
    expect(identity.iconAsset).not.toBe('')
    expect(identity.islandAsset).not.toBe('')
  })
})
