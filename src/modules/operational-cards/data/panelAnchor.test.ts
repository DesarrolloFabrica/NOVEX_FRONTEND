import { describe, expect, it } from 'vitest'
import { resolvePanelAnchor } from '@/modules/operational-cards/data/panelAnchor'
import { buildTableLayout } from '@/modules/operational-cards/data/tableLayout'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'

/**
 * Anclaje del panel de LEVEL 1.
 *
 * Las dos exigencias que se vigilan aquí tiran en direcciones contrarias: el
 * panel tiene que leerse como CONECTADO a su carta, y no puede salirse de la
 * pantalla. Lo que se comprueba es que la solución no sacrifique ninguna de las
 * dos: el cuerpo se recorta contra el escenario y el pico se queda apuntando a
 * la carta.
 */

/** Mesa real de nueve nodos, para probar contra la geometría de producto. */
function productTable() {
  const rows: CoordinationOverview[] = Array.from({ length: 9 }, (_v, index) => ({
    id: `uuid-${index}`,
    code: `coord-${index}`,
    name: `Coordinación ${index}`,
    shortName: `C${index}`,
    color: '#28C8F4',
    displayOrder: index + 1,
    status: 'ESTABLE',
    activeProblemsCount: 0,
    criticalCount: 0,
    affectedCoordinationCount: 0,
  }))
  return buildTableLayout(rows, { sortByDisplayOrder: false })
}

const PANEL_WIDTH = 2.2

describe('resolvePanelAnchor · el panel sigue a su carta', () => {
  it('bajo una carta central cae exactamente centrado en ella', () => {
    const anchor = resolvePanelAnchor({
      slotX: 0,
      orientation: 'NEUTRAL',
      stageWidth: 7.215,
      panelWidth: PANEL_WIDTH,
    })

    expect(anchor.x).toBe(0)
    expect(anchor.notch).toBe(0.5)
    expect(anchor.clamped).toBe(false)
  })

  it('se desplaza con la carta mientras quepa', () => {
    const anchor = resolvePanelAnchor({
      slotX: 1.5,
      orientation: 'RIGHT',
      stageWidth: 7.215,
      panelWidth: PANEL_WIDTH,
    })

    // Sin recorte, el panel va justo debajo: el pico se queda en el centro.
    expect(anchor.x).toBe(1.5)
    expect(anchor.notch).toBe(0.5)
    expect(anchor.clamped).toBe(false)
  })

  it('hereda el lado del layout en vez de clasificar por su cuenta', () => {
    // Si el panel tuviera su propio criterio de LEFT/RIGHT, podría discrepar
    // del personaje sobre dónde está la coordinación que ambos describen.
    for (const orientation of ['LEFT', 'NEUTRAL', 'RIGHT'] as const) {
      expect(
        resolvePanelAnchor({
          slotX: 0,
          orientation,
          stageWidth: 7.215,
          panelWidth: PANEL_WIDTH,
        }).side,
      ).toBe(orientation)
    }
  })
})

describe('resolvePanelAnchor · nunca se sale del escenario', () => {
  const stageWidth = 7.215
  const room = (stageWidth - PANEL_WIDTH) / 2

  it('en el extremo izquierdo el cuerpo se frena en el borde', () => {
    const anchor = resolvePanelAnchor({
      slotX: -3.0,
      orientation: 'LEFT',
      stageWidth,
      panelWidth: PANEL_WIDTH,
    })

    expect(anchor.x).toBeGreaterThan(-3.0)
    expect(anchor.x).toBeCloseTo(-room, 4)
    expect(anchor.clamped).toBe(true)
  })

  it('y el pico se queda apuntando a la carta, no al centro del panel', () => {
    const anchor = resolvePanelAnchor({
      slotX: -3.0,
      orientation: 'LEFT',
      stageWidth,
      panelWidth: PANEL_WIDTH,
    })

    // A la izquierda del centro del panel: es donde quedó la carta.
    expect(anchor.notch).toBeLessThan(0.5)
  })

  it('lo mismo en el extremo derecho, en espejo', () => {
    const left = resolvePanelAnchor({
      slotX: -3.0,
      orientation: 'LEFT',
      stageWidth,
      panelWidth: PANEL_WIDTH,
    })
    const right = resolvePanelAnchor({
      slotX: 3.0,
      orientation: 'RIGHT',
      stageWidth,
      panelWidth: PANEL_WIDTH,
    })

    expect(right.x).toBeCloseTo(-left.x, 4)
    expect(right.notch).toBeCloseTo(1 - left.notch, 4)
  })

  it('el pico nunca se sube al radio de la esquina', () => {
    // Un pico pegado a la esquina redondeada deja de leerse como pico y parece
    // un defecto de dibujo. Se comprueba con una carta absurdamente lejana.
    for (const slotX of [-40, -3, 0, 3, 40]) {
      const anchor = resolvePanelAnchor({
        slotX,
        orientation: 'NEUTRAL',
        stageWidth,
        panelWidth: PANEL_WIDTH,
      })
      expect(anchor.notch).toBeGreaterThanOrEqual(0.1)
      expect(anchor.notch).toBeLessThanOrEqual(0.9)
    }
  })

  it('un panel más ancho que el escenario se centra en vez de romperse', () => {
    const anchor = resolvePanelAnchor({
      slotX: 3,
      orientation: 'RIGHT',
      stageWidth: 2,
      panelWidth: 4,
    })

    expect(anchor.x).toBe(0)
  })
})

describe('resolvePanelAnchor · contra la mesa real de nueve nodos', () => {
  const layout = productTable()

  it('las nueve coordinaciones caben dentro del escenario', () => {
    // La comprobación que importa para el viewport: ningún borde del panel
    // sale del ancho que la mesa reserva, y ese ancho es el que el CSS traduce
    // a píxeles. Si esto se cumple, no hay scroll horizontal a ninguna
    // resolución, porque toda la geometría está en anchos de carta.
    const half = layout.stageWidth / 2

    for (const slot of layout.slots) {
      const anchor = resolvePanelAnchor({
        slotX: slot.x,
        orientation: slot.orientation,
        stageWidth: layout.stageWidth,
        panelWidth: PANEL_WIDTH,
      })

      expect(anchor.x - PANEL_WIDTH / 2, slot.coordination.code).toBeGreaterThanOrEqual(
        -half - 0.0001,
      )
      expect(anchor.x + PANEL_WIDTH / 2, slot.coordination.code).toBeLessThanOrEqual(
        half + 0.0001,
      )
    }
  })

  it('solo los extremos necesitan recorte', () => {
    const clamped = layout.slots
      .map((slot) =>
        resolvePanelAnchor({
          slotX: slot.x,
          orientation: slot.orientation,
          stageWidth: layout.stageWidth,
          panelWidth: PANEL_WIDTH,
        }),
      )
      .map((anchor) => anchor.clamped)

    // Primera y última. Las siete de en medio caen centradas bajo su carta, que
    // es la lectura que mejor comunica de dónde salió el panel.
    expect(clamped[0]).toBe(true)
    expect(clamped.at(-1)).toBe(true)
    expect(clamped.slice(1, -1).some(Boolean)).toBe(false)
  })

  it('el anclaje es determinístico', () => {
    const twice = () =>
      layout.slots.map((slot) =>
        resolvePanelAnchor({
          slotX: slot.x,
          orientation: slot.orientation,
          stageWidth: layout.stageWidth,
          panelWidth: PANEL_WIDTH,
        }),
      )

    expect(twice()).toEqual(twice())
  })
})
