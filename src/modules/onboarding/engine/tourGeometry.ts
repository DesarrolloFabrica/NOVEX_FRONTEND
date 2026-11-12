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

/** Contenedores que recortan a sus hijos (scroll u overflow oculto). */
function clipsContent(style: CSSStyleDeclaration): boolean {
  return /(auto|scroll|hidden|clip)/.test(`${style.overflowX} ${style.overflowY}`)
}

/**
 * Rectángulo de la parte VISIBLE del elemento: su caja recortada por cada
 * ancestro que recorta su contenido y por la ventana. Un expediente largo
 * dentro de un panel con scroll mide solo lo que asoma en el panel; antes se
 * medía entero y el foco se salía del panel tapando la cabecera.
 */
export function visibleBox(element: Element): TourRect | null {
  const box = element.getBoundingClientRect()
  let top = box.top
  let left = box.left
  let bottom = box.bottom
  let right = box.right
  let container = element.parentElement
  while (container && container !== document.body && container !== document.documentElement) {
    if (clipsContent(window.getComputedStyle(container))) {
      const frame = container.getBoundingClientRect()
      top = Math.max(top, frame.top)
      left = Math.max(left, frame.left)
      bottom = Math.min(bottom, frame.bottom)
      right = Math.min(right, frame.right)
    }
    container = container.parentElement
  }
  top = Math.max(top, 0)
  left = Math.max(left, 0)
  bottom = Math.min(bottom, window.innerHeight)
  right = Math.min(right, window.innerWidth)
  if (bottom - top < 1 || right - left < 1) return null
  return { top, left, width: right - left, height: bottom - top }
}

/** Altura mínima de lo visible para que el foco siga en el elemento y no en su panel. */
const MIN_VISIBLE_SLICE = 48

/**
 * Qué iluminar para un elemento. Normalmente su parte visible. Pero si es
 * contenido de un panel con scroll y el usuario lo desplaza (o es más alto que
 * el panel), su parte visible se vuelve una franja que corre bajo barras fijas:
 * entonces se ilumina el panel, que no se mueve mientras el usuario lee.
 */
export function highlightBox(element: Element): TourRect | null {
  const visible = visibleBox(element)
  const scroller = nearestScrollContainer(element)
  if (!scroller) return visible
  const box = element.getBoundingClientRect()
  const frame = scroller.getBoundingClientRect()
  const tallerThanFrame = box.height > frame.height + REVEAL_TOLERANCE
  const sliver = !visible || (visible.height < MIN_VISIBLE_SLICE && box.height > visible.height + 1)
  if (tallerThanFrame || sliver) return visibleBox(scroller) ?? visible
  return visible
}

/** Ancestro más cercano con scroll vertical propio y contenido que lo desborda. */
export function nearestScrollContainer(element: Element): HTMLElement | null {
  let container = element.parentElement
  while (container && container !== document.body && container !== document.documentElement) {
    const style = window.getComputedStyle(container)
    if (/(auto|scroll)/.test(style.overflowY) && container.scrollHeight > container.clientHeight) {
      return container
    }
    container = container.parentElement
  }
  return null
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

/** Margen que se deja entre el objetivo y el borde de su contenedor al revelarlo. */
const REVEAL_MARGIN = 16

/**
 * Desplazamiento MÍNIMO para que el objetivo se vea dentro de un contenedor:
 * si cabe, lo justo para que entre entero (no se centra: centrar movía todo el
 * Centro Operacional y parecía que la página se recargaba); si no cabe, se
 * alinea su inicio con el borde superior, salvo que ese inicio ya se vea con
 * una porción útil debajo, en cuyo caso no se toca.
 */
export function minimalRevealDelta(
  box: { top: number; bottom: number },
  frame: { top: number; bottom: number },
): number {
  const frameHeight = frame.bottom - frame.top
  const height = box.bottom - box.top
  const top = frame.top + REVEAL_MARGIN
  const bottom = frame.bottom - REVEAL_MARGIN
  if (height <= bottom - top) {
    if (box.top < top) return box.top - top
    if (box.bottom > bottom) return box.bottom - bottom
    return 0
  }
  // Su inicio (título) ya se ve y deja debajo una porción útil: no se toca.
  const startVisible =
    box.top >= frame.top - REVEAL_TOLERANCE &&
    box.top <= frame.bottom - Math.min(frameHeight * 0.5, 240)
  return startVisible ? 0 : box.top - top
}

/**
 * Desplaza solo los contenedores con scroll propio que ocultan el elemento, de
 * dentro hacia fuera y lo mínimo posible. No desplaza el documento.
 *
 * Con `band` (hoja en pantallas pequeñas) el objetivo se lleva a la franja
 * libre de la hoja en lugar de revelarse en su contenedor.
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
  // Se calculan las posiciones finales escribiendo de forma directa (cada
  // contenedor exterior debe medir el elemento ya movido por el interior) y,
  // con movimiento permitido, se reproducen después de forma suave.
  const moves: Array<{ container: HTMLElement; from: number; to: number }> = []
  let container = element.parentElement
  while (container) {
    const style = window.getComputedStyle(container)
    if (/(auto|scroll)/.test(style.overflowY) && container.scrollHeight > container.clientHeight) {
      const delta = minimalRevealDelta(
        element.getBoundingClientRect(),
        container.getBoundingClientRect(),
      )
      if (Math.abs(delta) >= REVEAL_TOLERANCE) {
        const from = container.scrollTop
        const maximum = container.scrollHeight - container.clientHeight
        const to = clamp(from + delta, 0, maximum)
        if (to !== from) {
          container.scrollTop = to
          moves.push({ container, from, to })
        }
      }
    }
    container = container.parentElement
  }
  if (reduceMotion) return
  for (const move of moves) {
    move.container.scrollTop = move.from
    move.container.scrollTo({ top: move.to, behavior: 'smooth' })
  }
}
