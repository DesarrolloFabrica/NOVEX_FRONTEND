// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  minimalRevealDelta,
  planCardPlacement,
  pickSheetEdge,
  revealInScrollContainers,
  sheetFreeBand,
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

  it('con un contexto mayor se coloca junto al contexto y la flecha apunta a lo resaltado', () => {
    // Una carta (contexto) con su etiqueta (resaltada) en la parte baja.
    const cardRect = { top: 300, left: 30, width: 200, height: 260 }
    const label = { top: 510, left: 80, width: 100, height: 30 }
    const placement = planCardPlacement(cardRect, DESKTOP, CARD, 'auto', label)
    expect(placement.arrow?.side).toBe('left')
    // Fuera de la carta entera, no solo de la etiqueta.
    expect(placement.left).toBe(30 + 200 + 16)
    // La flecha apunta al centro vertical de la etiqueta.
    expect((placement.top ?? 0) + (placement.arrow?.offset ?? 0)).toBe(label.top + label.height / 2)
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

describe('franja libre de la hoja', () => {
  const PHONE = { width: 360, height: 740 }

  it('con la hoja arriba, la franja empieza bajo ella y termina con el margen', () => {
    expect(sheetFreeBand(PHONE, 358, 'top')).toEqual({ top: 16 + 358 + 16, bottom: 724 })
  })

  it('con la hoja abajo, la franja termina sobre ella', () => {
    expect(sheetFreeBand(PHONE, 358, 'bottom')).toEqual({ top: 16, bottom: 740 - 16 - 358 - 16 })
  })

  it('elige el borde cuya franja cae dentro del contenedor con scroll del objetivo', () => {
    // Panel en la mitad inferior: solo la franja superior queda dentro de él.
    const frame = { top: 357, left: 0, width: 360, height: 383 }
    const tall = { top: 900, left: 202, width: 112, height: 560 }
    expect(pickSheetEdge(tall, PHONE, 358, frame)).toBe('top')
  })

  it('sin contenedor con scroll usa el borde que menos tapa el ancla', () => {
    const tall = { top: 248, left: 202, width: 112, height: 560 }
    expect(pickSheetEdge(tall, PHONE, 358, null)).toBe('top')
  })
})

describe('revealInScrollContainers con franja', () => {
  function layout(element: HTMLElement, box: Partial<DOMRect>) {
    element.getBoundingClientRect = () =>
      ({ top: 0, bottom: 0, left: 0, right: 0, width: 100, height: 40, ...box }) as DOMRect
  }

  function column() {
    const container = document.createElement('div')
    container.style.overflowY = 'auto'
    const child = document.createElement('section')
    container.appendChild(child)
    document.body.appendChild(container)
    Object.defineProperty(container, 'scrollHeight', { value: 2000, configurable: true })
    Object.defineProperty(container, 'clientHeight', { value: 700, configurable: true })
    container.scrollTop = 0
    layout(container, { top: 0, bottom: 700, height: 700 })
    return { container, child }
  }

  const BAND = { top: 386, bottom: 724 }

  it('no mueve el contenedor si el objetivo ya empieza dentro de la franja', () => {
    const { container, child } = column()
    layout(child, { top: 420, bottom: 900, height: 480 })
    revealInScrollContainers(child, true, BAND)
    expect(container.scrollTop).toBe(0)
    container.remove()
  })

  // Objetivos por debajo de la franja: el caso real en móvil, con el contenido
  // del panel bajo el globo. Solo se puede desplazar hacia abajo desde 0.
  it('alinea arriba el inicio de un objetivo más alto que la franja', () => {
    const { container, child } = column()
    layout(child, { top: 900, bottom: 1527, height: 627 })
    revealInScrollContainers(child, true, BAND)
    expect(container.scrollTop).toBe(900 - BAND.top)
    container.remove()
  })

  it('centra un objetivo que cabe en la franja', () => {
    const { container, child } = column()
    layout(child, { top: 900, bottom: 1040, height: 140 })
    revealInScrollContainers(child, true, BAND)
    const desiredTop = BAND.top + (BAND.bottom - BAND.top - 140) / 2
    expect(container.scrollTop).toBe(900 - desiredTop)
    container.remove()
  })
})

describe('minimalRevealDelta', () => {
  const frame = { top: 100, bottom: 700 }

  it('no mueve nada si el objetivo ya se ve entero', () => {
    expect(minimalRevealDelta({ top: 200, bottom: 400 }, frame)).toBe(0)
  })

  it('si cabe, desplaza solo lo justo para que entre (no lo centra)', () => {
    expect(minimalRevealDelta({ top: 600, bottom: 800 }, frame)).toBe(800 - (700 - 16))
    expect(minimalRevealDelta({ top: 20, bottom: 220 }, frame)).toBe(20 - (100 + 16))
  })

  it('si no cabe y ya llena buena parte del contenedor desde arriba, no lo toca', () => {
    expect(minimalRevealDelta({ top: 110, bottom: 2000 }, frame)).toBe(0)
  })

  it('si no cabe y su inicio está oculto, alinea su inicio arriba', () => {
    expect(minimalRevealDelta({ top: -400, bottom: 1500 }, frame)).toBe(-400 - (100 + 16))
    expect(minimalRevealDelta({ top: 650, bottom: 2400 }, frame)).toBe(650 - (100 + 16))
  })
})
