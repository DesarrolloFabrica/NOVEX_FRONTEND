// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  planCardPlacement,
  revealInScrollContainers,
  toHighlightRect,
  TOUR_PADDING,
} from './tourGeometry'

const CARD = { width: 370, height: 340 }
const DESKTOP = { width: 1440, height: 900 }

describe('toHighlightRect', () => {
  it('añade relleno alrededor del ancla', () => {
    expect(
      toHighlightRect({ top: 100, left: 200, width: 300, height: 80 }, DESKTOP),
    ).toEqual({
      top: 100 - TOUR_PADDING,
      left: 200 - TOUR_PADDING,
      width: 300 + TOUR_PADDING * 2,
      height: 80 + TOUR_PADDING * 2,
    })
  })

  it('devuelve null para un ancla sin área', () => {
    expect(
      toHighlightRect({ top: 0, left: 0, width: 0, height: 40 }, DESKTOP),
    ).toBeNull()
  })

  it('no supera el viewport', () => {
    const rect = toHighlightRect(
      { top: 0, left: 0, width: 5000, height: 5000 },
      DESKTOP,
    )
    expect(rect?.width).toBe(DESKTOP.width - 16)
    expect(rect?.height).toBe(DESKTOP.height - 16)
  })
})

describe('planCardPlacement', () => {
  it('sin ancla centra el globo y no dibuja flecha', () => {
    expect(planCardPlacement(null, DESKTOP, CARD)).toEqual({ mode: 'center' })
  })

  it('en pantallas pequeñas usa hoja en el borde opuesto al ancla', () => {
    const upper = { top: 200, left: 100, width: 200, height: 60 }
    expect(planCardPlacement(upper, { width: 390, height: 844 }, CARD)).toEqual({
      mode: 'sheet',
      edge: 'bottom',
    })
    const lower = { top: 640, left: 100, width: 200, height: 60 }
    expect(planCardPlacement(lower, { width: 390, height: 844 }, CARD)).toEqual({
      mode: 'sheet',
      edge: 'top',
    })
  })

  it('en móvil elige el borde que menos tapa un área alta, como una lista de problemas', () => {
    // Área de 450 px que casi llega al borde inferior: la hoja arriba solo tapa 8 px.
    const tall = { top: 380, left: 20, width: 350, height: 450 }
    expect(planCardPlacement(tall, { width: 390, height: 844 }, CARD)).toEqual({
      mode: 'sheet',
      edge: 'top',
    })
  })

  it('se ubica a la izquierda del ancla cuando hay espacio y apunta hacia él', () => {
    const rect = { top: 200, left: 900, width: 300, height: 80 }
    const placement = planCardPlacement(rect, DESKTOP, CARD)
    expect(placement.mode).toBe('floating')
    expect(placement.left).toBe(900 - CARD.width - 16)
    expect(placement.arrow?.side).toBe('right')
  })

  it('usa la derecha cuando el ancla está pegada a la izquierda', () => {
    const rect = { top: 200, left: 40, width: 200, height: 80 }
    const placement = planCardPlacement(rect, DESKTOP, CARD)
    expect(placement.arrow?.side).toBe('left')
    // Ancla con borde derecho en 240: la tarjeta empieza 16 px después.
    expect(placement.left).toBe(240 + 16)
  })

  it('debajo del ancla cuando no cabe a los lados', () => {
    const rect = { top: 100, left: 200, width: 400, height: 80 }
    const medium = { width: 800, height: 900 }
    // Ni izquierda (200 < 386) ni derecha (800 - 600 < 386) caben; debajo sí.
    const placement = planCardPlacement(rect, medium, CARD)
    expect(placement.arrow?.side).toBe('top')
    expect(placement.top).toBe(rect.top + rect.height + 16)
  })

  it('la flecha queda dentro de los bordes de la tarjeta', () => {
    const rect = { top: 2000, left: 900, width: 300, height: 80 }
    const placement = planCardPlacement(rect, DESKTOP, CARD)
    expect(placement.arrow?.offset).toBeGreaterThanOrEqual(24)
    expect(placement.arrow?.offset).toBeLessThanOrEqual(CARD.height - 24)
  })

  it('placement center fuerza el centrado aunque haya ancla', () => {
    const rect = { top: 200, left: 900, width: 300, height: 80 }
    expect(planCardPlacement(rect, DESKTOP, CARD, 'center')).toEqual({
      mode: 'center',
    })
  })
})

describe('revealInScrollContainers', () => {
  function layout(element: HTMLElement, box: Partial<DOMRect>) {
    element.getBoundingClientRect = () =>
      ({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: 100,
        height: 40,
        ...box,
      }) as DOMRect
  }

  function scrollableContainer() {
    const container = document.createElement('div')
    container.style.overflowY = 'auto'
    const child = document.createElement('button')
    container.appendChild(child)
    document.body.appendChild(container)
    Object.defineProperty(container, 'scrollHeight', { value: 2000, configurable: true })
    Object.defineProperty(container, 'clientHeight', { value: 500, configurable: true })
    container.scrollTop = 0
    layout(container, { top: 0, bottom: 500, height: 500 })
    return { container, child }
  }

  it('no mueve un contenedor donde el elemento ya se ve completo', () => {
    const { container, child } = scrollableContainer()
    layout(child, { top: 100, bottom: 140, height: 40 })

    revealInScrollContainers(child, true)
    expect(container.scrollTop).toBe(0)
    container.remove()
  })

  it('desplaza solo el contenedor que oculta el elemento', () => {
    const { container, child } = scrollableContainer()
    layout(child, { top: 900, bottom: 940, height: 40 })

    revealInScrollContainers(child, true)
    expect(container.scrollTop).toBeGreaterThan(0)
    container.remove()
  })
})
