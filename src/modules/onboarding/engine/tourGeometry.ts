/**
 * Geometría del recorrido: medición del ancla, colocación del globo y
 * desplazamiento mínimo de contenedores. Funciones puras salvo las que reciben
 * un elemento del DOM explícitamente.
 */

export interface TourRect {
  top: number
  left: number
  width: number
  height: number
}

export interface TourViewport {
  width: number
  height: number
}

export interface TourCardSize {
  width: number
  height: number
}

export type TourArrowSide = 'left' | 'right' | 'top' | 'bottom'

export interface TourPlacement {
  /** `floating`: junto al ancla. `sheet`: hoja en un borde. `center`: sin ancla. */
  mode: 'floating' | 'sheet' | 'center'
  top?: number
  left?: number
  /** Solo en `sheet`: borde de la pantalla que ocupa la hoja, el opuesto al ancla. */
  edge?: 'top' | 'bottom'
  /** Lado del globo que mira hacia el ancla; ausente cuando no hay relación visual. */
  arrow?: { side: TourArrowSide; offset: number }
}

export const TOUR_PADDING = 10
export const TOUR_CARD_GAP = 16
export const TOUR_VIEWPORT_MARGIN = 16
/** Por debajo de este ancho el globo se muestra como hoja inferior. */
export const TOUR_SHEET_BREAKPOINT = 760
/** Altura máxima de la hoja como fracción del viewport; debe coincidir con `.novex-tour__card--sheet` en la CSS. */
export const SHEET_MAX_HEIGHT_RATIO = 0.46
const ARROW_EDGE_MARGIN = 24

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

/** Rectángulo del ancla con relleno, acotado al viewport. Null si no tiene área visible. */
export function toHighlightRect(
  box: { top: number; left: number; width: number; height: number },
  viewport: TourViewport,
  padding = TOUR_PADDING,
): TourRect | null {
  if (box.width <= 0 || box.height <= 0) return null
  const top = Math.max(8, box.top - padding)
  const left = Math.max(8, box.left - padding)
  return {
    top,
    left,
    width: Math.min(viewport.width - 16, box.width + padding * 2),
    height: Math.min(viewport.height - 16, box.height + padding * 2),
  }
}

/** Un elemento cuenta como visible si ocupa área y no está oculto por CSS. */
export function isElementVisible(element: Element): boolean {
  const box = element.getBoundingClientRect()
  if (box.width <= 0 || box.height <= 0) return false
  const style = window.getComputedStyle(element)
  return style.display !== 'none' && style.visibility !== 'hidden'
}

export function isSmallViewport(viewport: TourViewport): boolean {
  return viewport.width < TOUR_SHEET_BREAKPOINT
}

/**
 * Coloca el globo junto al ancla. Prueba izquierda, derecha, debajo y encima.
 * Si ninguna cabe, lo centra sin flecha. En pantallas pequeñas usa hoja inferior.
 */
export function planCardPlacement(
  rect: TourRect | null,
  viewport: TourViewport,
  card: TourCardSize,
  preference: 'auto' | 'center' | 'left' = 'auto',
): TourPlacement {
  if (!rect || preference === 'center') return { mode: 'center' }
  if (isSmallViewport(viewport)) {
    // La hoja ocupa el borde con menos solapamiento sobre el área resaltada.
    const sheetHeight = viewport.height * SHEET_MAX_HEIGHT_RATIO
    const targetTop = rect.top
    const targetBottom = rect.top + rect.height
    const overlapAtTop = Math.max(0, Math.min(sheetHeight, targetBottom) - Math.max(0, targetTop))
    const overlapAtBottom = Math.max(
      0,
      Math.min(viewport.height, targetBottom) - Math.max(viewport.height - sheetHeight, targetTop),
    )
    return { mode: 'sheet', edge: overlapAtBottom <= overlapAtTop ? 'bottom' : 'top' }
  }

  const maxTop = Math.max(
    TOUR_VIEWPORT_MARGIN,
    viewport.height - card.height - TOUR_VIEWPORT_MARGIN,
  )
  const targetRight = rect.left + rect.width
  const targetBottom = rect.top + rect.height
  const targetCenterY = rect.top + rect.height / 2
  const targetCenterX = rect.left + rect.width / 2
  const sideTop = clamp(rect.top, TOUR_VIEWPORT_MARGIN, maxTop)
  const arrowOffsetY = clamp(
    targetCenterY - sideTop,
    ARROW_EDGE_MARGIN,
    card.height - ARROW_EDGE_MARGIN,
  )

  if (preference === 'left') {
    return { mode: 'floating', top: sideTop, left: TOUR_VIEWPORT_MARGIN }
  }

  if (rect.left >= TOUR_VIEWPORT_MARGIN + card.width + TOUR_CARD_GAP) {
    return {
      mode: 'floating',
      top: sideTop,
      left: rect.left - card.width - TOUR_CARD_GAP,
      arrow: { side: 'right', offset: arrowOffsetY },
    }
  }

  if (
    viewport.width - targetRight >=
    TOUR_VIEWPORT_MARGIN + card.width + TOUR_CARD_GAP
  ) {
    return {
      mode: 'floating',
      top: sideTop,
      left: targetRight + TOUR_CARD_GAP,
      arrow: { side: 'left', offset: arrowOffsetY },
    }
  }

  const left = clamp(
    targetCenterX - card.width / 2,
    TOUR_VIEWPORT_MARGIN,
    Math.max(TOUR_VIEWPORT_MARGIN, viewport.width - card.width - TOUR_VIEWPORT_MARGIN),
  )
  const arrowOffsetX = clamp(
    targetCenterX - left,
    ARROW_EDGE_MARGIN,
    card.width - ARROW_EDGE_MARGIN,
  )

  const fitsBelow =
    viewport.height - targetBottom >=
    TOUR_VIEWPORT_MARGIN + card.height + TOUR_CARD_GAP
  if (fitsBelow) {
    return {
      mode: 'floating',
      top: targetBottom + TOUR_CARD_GAP,
      left,
      arrow: { side: 'top', offset: arrowOffsetX },
    }
  }

  const topAbove = clamp(
    rect.top - card.height - TOUR_CARD_GAP,
    TOUR_VIEWPORT_MARGIN,
    maxTop,
  )
  return {
    mode: 'floating',
    top: topAbove,
    left,
    arrow: { side: 'bottom', offset: arrowOffsetX },
  }
}

/**
 * Desplaza solo los contenedores con scroll propio que ocultan el elemento.
 * No desplaza el documento ni toca contenedores donde el elemento ya se ve,
 * para no mover el escenario sin necesidad.
 */
export function revealInScrollContainers(
  element: HTMLElement,
  reduceMotion: boolean,
): void {
  let container = element.parentElement
  while (container) {
    const style = window.getComputedStyle(container)
    const scrollable = /(auto|scroll)/.test(style.overflowY)
    if (scrollable && container.scrollHeight > container.clientHeight) {
      const frame = container.getBoundingClientRect()
      const box = element.getBoundingClientRect()
      const fullyVisible =
        box.top >= frame.top && box.bottom <= frame.bottom
      if (!fullyVisible) {
        const target =
          container.scrollTop +
          (box.top - frame.top) -
          frame.height / 2 +
          box.height / 2
        const maximum = container.scrollHeight - container.clientHeight
        const next = clamp(target, 0, maximum)
        if (reduceMotion) {
          container.scrollTop = next
        } else {
          container.scrollTo({ top: next, behavior: 'smooth' })
        }
      }
    }
    container = container.parentElement
  }
}
