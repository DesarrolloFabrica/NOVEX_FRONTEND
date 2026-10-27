import { describe, expect, it } from 'vitest'
import { buildDeckFanLayout } from '@/modules/operational-cards/data/deckFanLayout'
import { resolveDeckOrigin } from '@/modules/operational-cards/data/deckOrigin'

/** El escenario real de la mesa de nueve nodos, medido en altos de carta. */
const STAGE = 1.334

describe('buildDeckFanLayout', () => {
  it('reparte una carta por hija, en el orden declarado', () => {
    const fan = buildDeckFanLayout({ count: 5, stageHeight: STAGE })

    expect(fan.slots).toHaveLength(5)
    expect(fan.slots.map((slot) => slot.index)).toEqual([0, 1, 2, 3, 4])
  })

  it('ninguna hija comparte sitio con otra', () => {
    const xs = buildDeckFanLayout({ count: 5, stageHeight: STAGE }).slots.map(
      (slot) => slot.x,
    )

    expect(new Set(xs).size).toBe(5)
    // Y van de izquierda a derecha, sin saltos hacia atrás.
    expect([...xs].sort((left, right) => left - right)).toEqual(xs)
  })

  it('toda la mano sale a la DERECHA del mazo, sin taparlo', () => {
    const origin = resolveDeckOrigin({ stageHeight: STAGE })
    const fan = buildDeckFanLayout({ count: 5, stageHeight: STAGE })
    const parentRightEdge = origin.x + 0.5

    for (const slot of fan.slots) {
      expect(slot.x - fan.scale / 2).toBeGreaterThan(parentRightEdge)
    }
  })

  it('cabe en la columna que la composición de mazo deja libre', () => {
    // La mesa de nueve nodos declara un escenario de unos 7.3 anchos de carta,
    // del que la mano ocupa su mitad derecha. Medido en navegador, la columna
    // da 2.79 anchos a cada lado del centro a 1440.
    const fan = buildDeckFanLayout({ count: 5, stageHeight: STAGE })

    expect(fan.rightEdge).toBeLessThan(2.79)
  })

  it('la mano se abre: gira hacia fuera y curva hacia arriba en el centro', () => {
    const fan = buildDeckFanLayout({ count: 5, stageHeight: STAGE })
    const rotations = fan.slots.map((slot) => slot.rotation)

    // Simétrica respecto al centro, con la central recta.
    expect(rotations[0]).toBeLessThan(0)
    expect(rotations[2]).toBe(0)
    expect(rotations[4]).toBeGreaterThan(0)
    expect(rotations[0]).toBeCloseTo(-rotations[4], 4)

    // La central es la más alta de la mano: `y` crece hacia abajo.
    const ys = fan.slots.map((slot) => slot.y)
    expect(ys[2]).toBeLessThan(ys[0])
    expect(ys[2]).toBeLessThan(ys[4])
    expect(ys[0]).toBeCloseTo(ys[4], 4)
  })

  it('cada hija pasa por delante de la anterior', () => {
    const zs = buildDeckFanLayout({ count: 5, stageHeight: STAGE }).slots.map(
      (slot) => slot.zIndex,
    )

    expect([...zs].sort((left, right) => left - right)).toEqual(zs)
    expect(new Set(zs).size).toBe(5)
  })

  it('la hija es menor que el padre, pero no una miniatura', () => {
    const fan = buildDeckFanLayout({ count: 5, stageHeight: STAGE })

    expect(fan.scale).toBeLessThan(1)
    expect(fan.scale).toBeGreaterThan(0.75)
    expect(fan.slots.every((slot) => slot.scale === fan.scale)).toBe(true)
  })

  it('la geometría es estable: mismas entradas, mismas salidas', () => {
    expect(buildDeckFanLayout({ count: 5, stageHeight: STAGE })).toEqual(
      buildDeckFanLayout({ count: 5, stageHeight: STAGE }),
    )
  })

  it('un mazo sin hijas no reparte nada, y sigue sabiendo de dónde salían', () => {
    const fan = buildDeckFanLayout({ count: 0, stageHeight: STAGE })

    expect(fan.slots).toEqual([])
    expect(fan.origin).toEqual(resolveDeckOrigin({ stageHeight: STAGE }))
  })

  it('el reparto arranca EXACTAMENTE del mazo', () => {
    // Si el origen de la animación se desacoplara del mazo, las cartas saldrían
    // de un sitio donde no hay ninguna carta.
    const fan = buildDeckFanLayout({ count: 5, stageHeight: STAGE })

    expect(fan.origin).toEqual(resolveDeckOrigin({ stageHeight: STAGE }))
  })
})
