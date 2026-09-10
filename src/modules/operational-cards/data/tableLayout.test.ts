import { describe, expect, it } from 'vitest'
import {
  buildTableLayout,
  resolveTableYield,
  RESTING_OVERLAP,
} from '@/modules/operational-cards/data/tableLayout'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'

/**
 * Geometría de la mesa en reposo.
 *
 * Se comprueba la FORMA, no cada píxel: reparto en arcos, orden institucional,
 * determinismo, independencia respecto al estado y que nada se salga del
 * escenario. Las posiciones van en unidades de carta, así que estas pruebas no
 * necesitan DOM ni conocer el tamaño real de la carta.
 */

function coordinations(
  count: number,
  statusOf: (index: number) => OperationalIntegrityStatus = () => 'ESTABLE',
): CoordinationOverview[] {
  return Array.from({ length: count }, (_unused, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    code: `coord-${index + 1}`,
    name: `Coordinación ${index + 1}`,
    shortName: `C${index + 1}`,
    color: '#28C8F4',
    displayOrder: index + 1,
    status: statusOf(index),
    activeProblemsCount: 0,
    criticalCount: 0,
    affectedCoordinationCount: 0,
  }))
}

function arcOf(layout: ReturnType<typeof buildTableLayout>, arc: number) {
  return layout.slots.filter((slot) => slot.arc === arc)
}

describe('buildTableLayout · reparto en doble abanico', () => {
  it('reparte 15 coordinaciones en 8 arriba y 7 abajo', () => {
    const layout = buildTableLayout(coordinations(15))

    expect(layout.slots).toHaveLength(15)
    expect(arcOf(layout, 0)).toHaveLength(8)
    expect(arcOf(layout, 1)).toHaveLength(7)
  })

  it('los NUEVE nodos de producto caben en un solo arco', () => {
    const layout = buildTableLayout(coordinations(9))

    expect(layout.slots).toHaveLength(9)
    expect(arcOf(layout, 0)).toHaveLength(9)
    expect(arcOf(layout, 1)).toHaveLength(0)
    // Un arco necesita poco más de un alto de carta, no dos.
    expect(layout.stageHeight).toBeLessThan(1.5)
  })

  it('nueve al 25 % caben a lo ancho con margen', () => {
    // 1386 px útiles a 1440 y una carta de ~189 px dan ~7,3 anchos de carta.
    const layout = buildTableLayout(coordinations(9), { overlap: 0.25 })
    expect(layout.stageWidth).toBeLessThan(7.3)
  })

  it('no fabrica una carta 16 ni deja huecos', () => {
    expect(buildTableLayout(coordinations(9)).slots).toHaveLength(9)
    expect(buildTableLayout(coordinations(1)).slots).toHaveLength(1)
    expect(buildTableLayout([]).slots).toHaveLength(0)
  })

  it('sin coordinaciones no reserva escenario', () => {
    const layout = buildTableLayout([])
    expect(layout.stageHeight).toBe(0)
    expect(Object.keys(layout.orientationByCode)).toHaveLength(0)
  })

  it('la mesa NO depende de qué coordinación esté seleccionada', () => {
    // Hubo una opción para excluir la carta activa, porque esa carta se iba a
    // un área focal aparte. Con la selección in-place ya no se va: la mesa
    // dibuja siempre las mismas coordinaciones en los mismos sitios, y la
    // selección es presentación. Se fija aquí porque es la forma estructural
    // de la memoria espacial: sin una segunda geometría no puede haber dos
    // mesas que discrepen.
    const rows = coordinations(9)
    expect(buildTableLayout(rows, { sortByDisplayOrder: false })).toEqual(
      buildTableLayout(rows, { sortByDisplayOrder: false }),
    )
    expect(buildTableLayout(rows)).toHaveLength
    expect(buildTableLayout(rows).slots).toHaveLength(9)
  })
})

describe('buildTableLayout · orden institucional', () => {
  it('ordena por displayOrder aunque la entrada venga desordenada', () => {
    const shuffled = [...coordinations(15)].reverse()
    const layout = buildTableLayout(shuffled)

    expect(layout.slots.map((slot) => slot.coordination.displayOrder)).toEqual(
      Array.from({ length: 15 }, (_unused, index) => index + 1),
    )
  })

  it('con sortByDisplayOrder:false conserva el orden recibido', () => {
    // La mesa de producto llega en orden de organigrama, que no coincide con el
    // displayOrder de la base de datos. Reordenar aquí rompería la estructura.
    const reversed = [...coordinations(9)].reverse()
    const layout = buildTableLayout(reversed, { sortByDisplayOrder: false })

    expect(layout.slots.map((slot) => slot.coordination.code)).toEqual(
      reversed.map((row) => row.code),
    )
  })

  it('el orden de los slots es el del DOM y el del tabulador', () => {
    // El arco superior ocupa las 8 primeras posiciones y el inferior las 7
    // siguientes: recorrer `slots` es recorrer el displayOrder, aunque la
    // geometría sea curva.
    const arcs = buildTableLayout(coordinations(15)).slots.map((slot) => slot.arc)
    expect(arcs).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1])
  })
})

describe('buildTableLayout · determinismo', () => {
  it('dos llamadas con la misma entrada dan exactamente la misma mesa', () => {
    const first = buildTableLayout(coordinations(15))
    const second = buildTableLayout(coordinations(15))

    expect(second.slots.map((slot) => [slot.x, slot.y, slot.rotation])).toEqual(
      first.slots.map((slot) => [slot.x, slot.y, slot.rotation]),
    )
  })

  it('la irregularidad del arco no es aleatoria: es estable por posición', () => {
    // Dos catálogos distintos con el mismo tamaño producen la misma geometría:
    // la irregularidad depende de la POSICIÓN, no de la coordinación.
    const a = buildTableLayout(coordinations(15))
    const b = buildTableLayout(
      coordinations(15).map((row) => ({ ...row, code: `otro-${row.displayOrder}` })),
    )

    expect(b.slots.map((slot) => slot.y)).toEqual(a.slots.map((slot) => slot.y))
  })

  it('pero la mesa no es una recta: hay curva e irregularidad reales', () => {
    const upper = arcOf(buildTableLayout(coordinations(15)), 0)
    const ys = upper.map((slot) => slot.y)
    const rotations = upper.map((slot) => slot.rotation)

    // Ni todas las alturas ni todas las inclinaciones son iguales.
    expect(new Set(ys).size).toBeGreaterThan(4)
    expect(new Set(rotations).size).toBe(upper.length)
    // Los extremos suben respecto al centro (y menor = más arriba).
    const centre = ys[Math.floor(ys.length / 2)]
    expect(ys[0]).toBeLessThan(centre)
    expect(ys[ys.length - 1]).toBeLessThan(centre)
  })
})

describe('buildTableLayout · el estado no mueve las cartas', () => {
  it('cambiar el estado operacional no altera ninguna posición', () => {
    const stable = buildTableLayout(coordinations(15))
    const mixed = buildTableLayout(
      coordinations(15, (index) =>
        index % 3 === 0 ? 'CRITICO' : index % 3 === 1 ? 'ALERTA' : 'DESCONOCIDO',
      ),
    )

    expect(
      mixed.slots.map((slot) => [
        slot.coordination.code,
        slot.x,
        slot.y,
        slot.rotation,
        slot.zIndex,
        slot.arc,
      ]),
    ).toEqual(
      stable.slots.map((slot) => [
        slot.coordination.code,
        slot.x,
        slot.y,
        slot.rotation,
        slot.zIndex,
        slot.arc,
      ]),
    )
  })

  it('una coordinación crítica no se adelanta ni cambia de arco', () => {
    const critical = buildTableLayout(
      coordinations(15, (index) => (index === 14 ? 'CRITICO' : 'ESTABLE')),
    )
    const last = critical.slots.at(-1)

    expect(last?.coordination.code).toBe('coord-15')
    expect(last?.coordination.status).toBe('CRITICO')
    expect(last?.arc).toBe(1)
  })
})

describe('buildTableLayout · orientación del personaje', () => {
  it('preserva orientationByCode para las 15', () => {
    const { orientationByCode } = buildTableLayout(coordinations(15))
    expect(Object.keys(orientationByCode)).toHaveLength(15)
  })

  it('produce los tres valores según la posición real en el arco', () => {
    const { orientationByCode } = buildTableLayout(coordinations(15))
    const values = Object.values(orientationByCode)

    expect(values).toContain('LEFT')
    expect(values).toContain('NEUTRAL')
    expect(values).toContain('RIGHT')
  })

  it('el lado coincide con el signo de x: no puede desincronizarse', () => {
    for (const slot of buildTableLayout(coordinations(15)).slots) {
      if (slot.orientation === 'LEFT') expect(slot.x).toBeLessThan(0)
      if (slot.orientation === 'RIGHT') expect(slot.x).toBeGreaterThan(0)
    }
  })
})

describe('buildTableLayout · apilado', () => {
  /**
   * El arco de arriba va DELANTE. Es contraintuitivo y por eso conviene
   * blindarlo: la píldora de estado vive en el pie de la carta, así que el arco
   * que quede detrás pierde su estado, y detrás debe quedar el inferior —cuyo
   * pie no tapa nadie— y no el superior.
   */
  it('el arco superior va siempre por delante del inferior', () => {
    const layout = buildTableLayout(coordinations(15))
    const upper = Math.min(...arcOf(layout, 0).map((slot) => slot.zIndex))
    const lower = Math.max(...arcOf(layout, 1).map((slot) => slot.zIndex))

    expect(upper).toBeGreaterThan(lower)
  })

  it('dentro de un arco cada carta se apoya sobre la anterior', () => {
    const upper = arcOf(buildTableLayout(coordinations(15)), 0)
    for (let index = 1; index < upper.length; index += 1) {
      expect(upper[index].zIndex).toBeGreaterThan(upper[index - 1].zIndex)
    }
  })

  it('ninguna carta comparte z con otra', () => {
    const zs = buildTableLayout(coordinations(15)).slots.map((slot) => slot.zIndex)
    expect(new Set(zs).size).toBe(zs.length)
  })
})

describe('buildTableLayout · solape y escenario', () => {
  it('el solape aplicado es el pedido, y por defecto el de reposo', () => {
    expect(buildTableLayout(coordinations(15)).overlap).toBe(RESTING_OVERLAP)
    expect(buildTableLayout(coordinations(15), { overlap: 0.25 }).overlap).toBe(
      0.25,
    )
  })

  it('más solape junta las cartas y estrecha la mesa', () => {
    const widths = [0.25, 0.32, 0.4].map(
      (overlap) => buildTableLayout(coordinations(15), { overlap }).stageWidth,
    )

    expect(widths[0]).toBeGreaterThan(widths[1])
    expect(widths[1]).toBeGreaterThan(widths[2])
  })

  it('el avance entre cartas contiguas es exactamente 1 - solape', () => {
    for (const overlap of [0.25, 0.32, 0.4]) {
      const upper = arcOf(buildTableLayout(coordinations(15), { overlap }), 0)
      const pitch = upper[1].x - upper[0].x
      expect(pitch).toBeCloseTo(1 - overlap, 4)
    }
  })

  it('ninguna carta se sale por arriba del escenario', () => {
    for (const overlap of [0.25, 0.32, 0.4]) {
      for (const slot of buildTableLayout(coordinations(15), { overlap }).slots) {
        // `y` es el borde superior sin girar; la sangría del giro ya está
        // reservada en la base del arco, así que `y >= 0` basta.
        expect(slot.y).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('ninguna carta se sale por abajo del escenario', () => {
    for (const overlap of [0.25, 0.32, 0.4]) {
      const layout = buildTableLayout(coordinations(15), { overlap })
      for (const slot of layout.slots) {
        expect(slot.y + 1).toBeLessThanOrEqual(layout.stageHeight)
      }
    }
  })

  it('la mesa cabe a lo ancho con presupuesto de sobra', () => {
    // En anchos de carta. A 1440 el área útil son 1386 px y la carta 200 px,
    // es decir ~6.9 anchos de carta disponibles. El píxel real se comprueba en
    // e2e; aquí se fija el presupuesto para que un cambio de constantes no lo
    // reviente en silencio.
    for (const overlap of [0.25, 0.32, 0.4]) {
      const layout = buildTableLayout(coordinations(15), { overlap })
      expect(layout.stageWidth).toBeLessThan(6.9)
    }
  })

  it('el escenario reserva alto para los dos arcos, no para uno', () => {
    const layout = buildTableLayout(coordinations(15))
    // Dos arcos con un mordisco pequeño: casi dos altos de carta, nunca uno.
    expect(layout.stageHeight).toBeGreaterThan(1.5)
    expect(layout.stageHeight).toBeLessThan(2.3)
  })

  it('los dos arcos son concéntricos: el hueco entre ellos es constante', () => {
    // Si cada arco se curvara con su propia anchura, el extremo del inferior
    // subiría hasta una carta central del superior y el solape vertical real
    // se dispararía muy por encima del declarado, tapando la píldora.
    const layout = buildTableLayout(coordinations(15))
    const upper = arcOf(layout, 0)
    const lower = arcOf(layout, 1)

    const gaps = lower.map((low) => {
      const nearest = upper.reduce((best, candidate) =>
        Math.abs(candidate.x - low.x) < Math.abs(best.x - low.x) ? candidate : best,
      )
      // Cuánto muerde la carta de arriba a la de abajo, en altos de carta.
      return nearest.y + 1 - low.y
    })

    for (const gap of gaps) {
      expect(gap).toBeGreaterThan(0)
      // Nunca más de lo que tarda el arte en empezar a rotular el nombre.
      expect(gap).toBeLessThan(0.2)
    }
  })
})

describe('resolveTableYield · la mesa cede alrededor del mazo abierto', () => {
  it('la coordinación señalada no cede: es la que abre', () => {
    expect(resolveTableYield(0)).toBe(0)
  })

  it('cede más cerca y menos lejos, sin empates', () => {
    // El gradiente es lo que hace legible el gesto: si todas bajaran igual, la
    // mesa parecería caerse entera en lugar de abrirse en un punto.
    const steps = [1, 2, 3, 4].map(resolveTableYield)
    for (let index = 1; index < steps.length; index += 1) {
      expect(steps[index]).toBeLessThan(steps[index - 1])
    }
  })

  it('ninguna carta se descuelga: la cesión se aplana en los extremos', () => {
    // Con nueve coordinaciones la distancia máxima es 8. Más allá de la
    // tercera vecina el valor se estabiliza, así que un extremo nunca queda
    // fuera de la mesa por muy lejos que esté del mazo abierto.
    for (const distance of [4, 5, 6, 7, 8]) {
      expect(resolveTableYield(distance)).toBe(10)
    }
  })

  it('la cesión es contenida: nunca abre un hueco en la mesa', () => {
    // A 1440 la carta mide 250 px de alto y las vecinas se solapan un 10 % en
    // vertical. Una cesión mayor que ese solape rompería el arco en dos filas.
    for (const distance of [1, 2, 3, 4, 8]) {
      expect(resolveTableYield(distance)).toBeLessThanOrEqual(30)
    }
  })

  it('una distancia negativa no existe, pero no rompe la mesa', () => {
    expect(resolveTableYield(-1)).toBe(0)
  })
})
