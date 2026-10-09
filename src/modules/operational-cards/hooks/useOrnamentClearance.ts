import { useLayoutEffect, type RefObject } from 'react'

/** Margen de cortesía entre el texto y el adorno. */
const GAP_PX = 6

function scrollParent(element: HTMLElement): HTMLElement | null {
  let node = element.parentElement
  while (node) {
    const overflowY = getComputedStyle(node).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') return node
    node = node.parentElement
  }
  return null
}

/**
 * HUELLA DEL ADORNO SUPERIOR DERECHO DEL TICKET.
 *
 * Cada tema dibuja en esa esquina un adorno de tamaño distinto (de unos 70 a
 * más de 200 px de ancho, y en varios el ancho sale de la proporción del PNG),
 * así que el CSS no puede saber cuánto ocupa. Este hook lo mide y publica en el
 * elemento `--ornament-clear-w` y `--ornament-clear-h`: un flotante vacío de
 * ese tamaño hace que el título rodee el adorno en vez de pasar por debajo.
 *
 * La huella se calcula con el contenido en reposo (scroll arriba), que es como
 * se lee el encabezado. Sin ticket o sin adorno en esa esquina, la huella es
 * cero y no cambia nada. Solo presentación: no lee ni escribe datos.
 */
export function useOrnamentClearance(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const region = element.closest('.operational-shell__region')
    const ornament = region?.querySelector<HTMLElement>(
      '.ticket-panel__ornament--tr',
    )

    const clear = () => {
      element.style.removeProperty('--ornament-clear-w')
      element.style.removeProperty('--ornament-clear-h')
    }

    if (!ornament) {
      clear()
      return
    }

    const scroller = scrollParent(element)

    const update = () => {
      const box = element.getBoundingClientRect()
      const art = ornament.getBoundingClientRect()
      if (art.width === 0 || art.height === 0) {
        clear()
        return
      }
      // Posición del encabezado como si el panel estuviera sin desplazar.
      const restingTop = box.top + (scroller?.scrollTop ?? 0)
      const width = Math.ceil(box.right - art.left + GAP_PX)
      const height = Math.ceil(art.bottom - restingTop + GAP_PX)
      if (width <= 0 || height <= 0 || width >= box.width) {
        clear()
        return
      }
      element.style.setProperty('--ornament-clear-w', `${width}px`)
      element.style.setProperty('--ornament-clear-h', `${height}px`)
    }

    update()
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(element)
    observer?.observe(ornament)
    ornament.addEventListener('load', update)

    return () => {
      observer?.disconnect()
      ornament.removeEventListener('load', update)
    }
  }, [ref])
}
