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
export const SHEET_MAX_HEIGHT_RATIO = 0.5
/** Franja vertical del viewport libre de la hoja, en coordenadas de ventana. */
export interface TourBand {
  top: number
  bottom: number
}
const ARROW_EDGE_MARGIN = 24
/** Tolerancia para no mover un contenedor por diferencias de subpíxel. */
const REVEAL_TOLERANCE = 4
/** Lo mínimo que debe quedar visible del objetivo alto al alinearlo arriba. */
const REVEAL_MIN_VISIBLE = 48

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

/** Borde de la hoja que menos tapa el ancla, sin considerar dónde puede mostrarse. */
function sheetEdgeByOverlap(rect: TourRect, viewport: TourViewport): 'top' | 'bottom' {
  const sheetHeight = viewport.height * SHEET_MAX_HEIGHT_RATIO
  const targetTop = rect.top
  const targetBottom = rect.top + rect.height
  const overlapAtTop = Math.max(0, Math.min(sheetHeight, targetBottom) - Math.max(0, targetTop))
  const overlapAtBottom = Math.max(
    0,
    Math.min(viewport.height, targetBottom) - Math.max(viewport.height - sheetHeight, targetTop),
  )
  return overlapAtBottom <= overlapAtTop ? 'bottom' : 'top'
}

/**
 * Coloca el globo junto al ancla. Prueba izquierda, derecha, debajo y encima.
 * Si ninguna cabe, lo centra sin flecha. En pantallas pequeñas usa hoja, en el
 * borde `sheetEdge` si se indica; si no, en el que menos tapa el ancla.
 *
 * `pointAt`: cuando el globo se coloca respecto a un contexto mayor que lo
 * resaltado (una carta entera para explicar su etiqueta), la flecha apunta a
 * este rectángulo en lugar de al centro de `rect`.
 */
export function planCardPlacement(
  rect: TourRect | null,
  viewport: TourViewport,
  card: TourCardSize,
  preference: 'auto' | 'center' | 'left' = 'auto',
  pointAt?: TourRect,
  sheetEdge?: 'top' | 'bottom',
): TourPlacement {
  if (!rect || preference === 'center') return { mode: 'center' }
  if (isSmallViewport(viewport)) {
    return { mode: 'sheet', edge: sheetEdge ?? sheetEdgeByOverlap(rect, viewport) }
  }

  const maxTop = Math.max(
    TOUR_VIEWPORT_MARGIN,
    viewport.height - card.height - TOUR_VIEWPORT_MARGIN,
  )
  const targetRight = rect.left + rect.width
  const targetBottom = rect.top + rect.height
  const pointed = pointAt ?? rect
  const targetCenterY = pointed.top + pointed.height / 2
  const targetCenterX = pointed.left + pointed.width / 2
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
 * Franja del viewport que la hoja deja libre. Con la hoja arriba, empieza bajo
 * ella; con la hoja abajo, termina sobre ella. Usa la altura real del globo.
 */
export function sheetFreeBand(
  viewport: TourViewport,
  sheetHeight: number,
  edge: 'top' | 'bottom',
): TourBand {
  if (edge === 'top') {
    return {
      top: TOUR_VIEWPORT_MARGIN + sheetHeight + TOUR_CARD_GAP,
      bottom: viewport.height - TOUR_VIEWPORT_MARGIN,
    }
  }
  return {
    top: TOUR_VIEWPORT_MARGIN,
    bottom: viewport.height - TOUR_VIEWPORT_MARGIN - sheetHeight - TOUR_CARD_GAP,
  }
}

/**
 * Contenedor con scroll más cercano al elemento, en coordenadas de ventana.
 * El objetivo solo puede llevarse a una franja si esa franja cae dentro de él.
 */
export function nearestScrollFrame(element: HTMLElement): TourRect | null {
  let container = element.parentElement
  while (container) {
    const style = window.getComputedStyle(container)
    if (/(auto|scroll)/.test(style.overflowY) && container.scrollHeight > container.clientHeight) {
      const box = container.getBoundingClientRect()
      return { top: box.top, left: box.left, width: box.width, height: box.height }
    }
    container = container.parentElement
  }
  return null
}

/**
 * Borde de la hoja desde el que el objetivo puede verse entero o, al menos, su
 * inicio. Prefiere el borde cuya franja libre cae dentro del contenedor con
 * scroll del objetivo; si ninguno es viable, usa el que menos tapa el ancla.
 */
export function pickSheetEdge(
  rect: TourRect,
  viewport: TourViewport,
  cardHeight: number,
  frame: TourRect | null,
): 'top' | 'bottom' {
  const visibleHeight = (edge: 'top' | 'bottom') => {
    if (!frame) return 0
    const band = sheetFreeBand(viewport, cardHeight, edge)
    return Math.max(0, Math.min(frame.top + frame.height, band.bottom) - Math.max(frame.top, band.top))
  }
  const top = visibleHeight('top')
  const bottom = visibleHeight('bottom')
  const topViable = top >= REVEAL_MIN_VISIBLE
  const bottomViable = bottom >= REVEAL_MIN_VISIBLE
  if (topViable && bottomViable) return top >= bottom ? 'top' : 'bottom'
  if (topViable) return 'top'
  if (bottomViable) return 'bottom'
  return sheetEdgeByOverlap(rect, viewport)
}

/**
 * Lleva el INICIO del elemento a la franja libre de la hoja. Si cabe entero,
 * lo centra en ella; si no, alinea su parte superior, que es la que el
 * usuario necesita leer primero (título, bloque de avance). Escribe la posición
 * de forma directa: encadenar desplazamientos suaves haría que cada contenedor
 * midiera un elemento que aún no se ha movido.
 */
function revealWithinBand(element: HTMLElement, band: TourBand): void {
  const bandHeight = band.bottom - band.top
  const box = element.getBoundingClientRect()
  const fits = box.height <= bandHeight
  const acceptable = fits
    ? box.top >= band.top - REVEAL_TOLERANCE && box.bottom <= band.bottom + REVEAL_TOLERANCE
    : box.top >= band.top - REVEAL_TOLERANCE && box.top <= band.bottom - REVEAL_MIN_VISIBLE
  if (acceptable) return

  const desiredTop = fits ? band.top + (bandHeight - box.height) / 2 : band.top
  const containers: HTMLElement[] = []
  let container = element.parentElement
  while (container) {
    const style = window.getComputedStyle(container)
    if (/(auto|scroll)/.test(style.overflowY) && container.scrollHeight > container.clientHeight) {
      containers.unshift(container)
    }
    container = container.parentElement
  }

  // De fuera hacia dentro: el contenedor exterior puede mover al interior.
  for (const scrollable of containers) {
    const current = element.getBoundingClientRect()
    const delta = current.top - desiredTop
    if (Math.abs(delta) < REVEAL_TOLERANCE) break
    const frame = scrollable.getBoundingClientRect()
    if (frame.bottom <= band.top || frame.top >= band.bottom) continue
    const maximum = scrollable.scrollHeight - scrollable.clientHeight
    scrollable.scrollTop = clamp(scrollable.scrollTop + delta, 0, maximum)
  }
}

/**
 * Desplaza solo los contenedores con scroll propio que ocultan el elemento.
 * No desplaza el documento ni toca contenedores donde el elemento ya se ve,
 * para no mover el escenario sin necesidad.
 *
 * Con `band` (hoja en pantallas pequeñas) el objetivo se lleva a la franja
 * libre de la hoja en lugar de centrarse en su contenedor.
 */
export function revealInScrollContainers(
  element: HTMLElement,
  reduceMotion: boolean,
  band?: TourBand | null,
): void {
  if (band) {
    revealWithinBand(element, band)
    return
  }
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
