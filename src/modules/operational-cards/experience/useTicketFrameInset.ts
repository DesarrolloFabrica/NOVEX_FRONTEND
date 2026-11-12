import { useLayoutEffect, type RefObject } from 'react'

/**
 * Posición de la línea interior del marco de ticket (`.ticket-panel__frame-
 * fillet`), en tanto por uno del panel. El marco es un SVG con viewBox 0–100 y
 * `preserveAspectRatio="none"`: su línea interior está al 2,85 % del ancho a
 * los lados y al 2,85 % del ALTO arriba y abajo, así que su distancia al borde
 * crece con el panel. Un relleno fijo encaja en paneles pequeños pero no en uno
 * grande (35 px a 1221 px de ancho) ni en uno alto que crece con su contenido.
 */
export const TICKET_FRAME_FILLET_RATIO = 0.0285

/**
 * Publica `--frame-x` / `--frame-y` (px): la distancia real del borde a la
 * línea interior del marco. El CSS la usa para que el contenido y su caja de
 * scroll queden SIEMPRE dentro del marco, a cualquier tamaño.
 *
 * `target: 'parent'` mide el elemento (el propio marco, `inset: 0`) y publica
 * en su padre (la región que lo contiene): así lo usa `TicketPanelFrame` para
 * todos los paneles a la vez.
 */
export function useTicketFrameInset(
  ref: RefObject<HTMLElement | null>,
  target: 'self' | 'parent' = 'self',
): void {
  useLayoutEffect(() => {
    const measured = ref.current
    const element = target === 'parent' ? measured?.parentElement : measured
    if (!measured || !element) return

    const apply = (width: number, height: number) => {
      element.style.setProperty('--frame-x', `${Math.ceil(width * TICKET_FRAME_FILLET_RATIO)}px`)
      element.style.setProperty('--frame-y', `${Math.ceil(height * TICKET_FRAME_FILLET_RATIO)}px`)
    }

    const box = measured.getBoundingClientRect()
    apply(box.width, box.height)

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      const size = entry.borderBoxSize?.[0]
      if (size) apply(size.inlineSize, size.blockSize)
      else apply(entry.contentRect.width, entry.contentRect.height)
    })
    observer.observe(measured)
    return () => observer.disconnect()
  }, [ref, target])
}
