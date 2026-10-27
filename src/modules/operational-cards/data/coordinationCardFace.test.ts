import { describe, expect, it } from 'vitest'
import {
  getCoordinationCardFaceCodes,
  getCoordinationsWithoutFace,
  resolveCoordinationCardFace,
} from '@/modules/operational-cards/data/coordinationCardFace'

/**
 * El mapeo es una tabla escrita a mano, así que el riesgo real no es que
 * falle: es que una carta muestre la identidad de otra coordinación.
 *
 * El catálogo runtime (`getCoordinationCatalog`) se hidrata desde el backend y
 * está vacío en unitarios, así que el conjunto esperado se declara aquí de
 * forma explícita. Es a propósito: si alguien añade, quita o renombra un code,
 * este test lo detiene en vez de dejarlo pasar contra un catálogo vacío.
 */
const ILLUSTRATED_CODES = [
  'coord-general',
  'coord-b2b',
  'coord-bellas-artes',
  'coord-desarrollo-profesional',
  'coord-empresarial',
  'coord-especializaciones',
  'coord-fabrica-contenidos',
  'coord-homologaciones',
  'coord-ingenierias',
  'coord-negocios',
  'coord-operaciones-academicas',
  'coord-proyeccion-social',
  'coord-saber-pro',
  'coord-servicios',
  'coord-transversales',
] as const

describe('coordinationCardFace · cobertura', () => {
  it('15 coordinaciones tienen cara ilustrada', () => {
    expect(ILLUSTRATED_CODES).toHaveLength(15)
    for (const code of ILLUSTRATED_CODES) {
      expect(resolveCoordinationCardFace(code)).not.toBeNull()
    }
  })

  it('declara exactamente esos 15 codes, ni uno más', () => {
    expect([...getCoordinationCardFaceCodes()].sort()).toEqual(
      [...ILLUSTRATED_CODES].sort(),
    )
  })

  it('las 15 caras son distintas: ninguna se reutiliza', () => {
    const faces = ILLUSTRATED_CODES.map((code) =>
      resolveCoordinationCardFace(code),
    )
    expect(new Set(faces).size).toBe(15)
  })

  it('todas las rutas apuntan a /CoordCards', () => {
    for (const code of getCoordinationCardFaceCodes()) {
      expect(resolveCoordinationCardFace(code)).toMatch(
        /^\/CoordCards\/[\w-]+\.png$/,
      )
    }
  })

  it('un code desconocido no hereda la cara de otra coordinación', () => {
    expect(resolveCoordinationCardFace('coord-inexistente')).toBeNull()
    expect(resolveCoordinationCardFace('')).toBeNull()
  })
})

describe('coordinationCardFace · Servicio', () => {
  it('coord-servicios tiene cara propia', () => {
    expect(resolveCoordinationCardFace('coord-servicios')).toBe(
      '/CoordCards/servicio.png',
    )
    expect(getCoordinationsWithoutFace()).not.toContain('coord-servicios')
  })

  it('coord-servicios NO usa el arte de Homologaciones', () => {
    expect(resolveCoordinationCardFace('coord-servicios')).not.toBe(
      '/CoordCards/Homologaciones.png',
    )
  })

  it('Homologaciones conserva su arte, que es suyo', () => {
    expect(resolveCoordinationCardFace('coord-homologaciones')).toBe(
      '/CoordCards/Homologaciones.png',
    )
  })

  it('ninguna coordinación queda sin cara', () => {
    expect(getCoordinationsWithoutFace()).toHaveLength(0)
    expect(getCoordinationCardFaceCodes()).toHaveLength(15)
  })
})
