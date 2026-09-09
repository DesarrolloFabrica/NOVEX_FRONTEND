import { useEffect, useRef, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

/**
 * Contenedor de la isla flotante.
 *
 * Es una capa de inspección dentro de la escena, no un modal: el velo detrás
 * es muy ligero a propósito, así que el personaje, la carta activa y el resto
 * de la baraja siguen reconocibles. No se reutiliza `SituationModalShell`
 * —pantalla completa y compartido por seis vistas— ni se modifica.
 *
 * Semánticamente sí es un diálogo (`role="dialog"`, `aria-modal`), porque el
 * contenido pasa a ser el foco de la interacción: se cierra con Escape, con el
 * botón y pulsando el velo, y al cerrarse el foco vuelve al elemento que la
 * abrió.
 *
 * El tamaño lo decide el contenido: alto máximo acotado y scroll interno, de
 * modo que la página que hay detrás nunca desplaza.
 */

export interface ProblemIslandShellProps {
  /** Id del encabezado, para `aria-labelledby`. */
  labelledBy: string
  onClose: () => void
  children: ReactNode
}

export function ProblemIslandShell({
  labelledBy,
  onClose,
  children,
}: ProblemIslandShellProps) {
  const reducedMotion = useReducedMotion()
  const islandRef = useRef<HTMLDivElement | null>(null)
  const openerRef = useRef<Element | null>(null)

  // Escape cierra, y el foco vuelve a la fila que abrió la isla.
  useEffect(() => {
    openerRef.current = document.activeElement

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    islandRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const opener = openerRef.current
      if (opener instanceof HTMLElement && document.contains(opener)) {
        opener.focus()
      }
    }
  }, [onClose])

  return (
    <div className="problem-island__layer" data-testid="problem-island-layer">
      {/* Velo contenido: aumenta el foco sin borrar el contexto. */}
      <button
        type="button"
        className="problem-island__veil"
        data-testid="problem-island-veil"
        aria-label="Cerrar el detalle del problema"
        onClick={onClose}
      />

      <motion.div
        ref={islandRef}
        className="problem-island"
        data-testid="problem-island"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 10 }}
        animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 6 }}
        transition={{ duration: reducedMotion ? 0 : 0.26, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </div>
  )
}
