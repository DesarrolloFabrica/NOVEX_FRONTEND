import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface SituationModalShellProps {
  label: string
  onClose: () => void
  /** Ocupa el marco completo del expediente en lugar de una tarjeta compacta. */
  fullSize?: boolean
  children: ReactNode
}

/**
 * Marco compartido por los estados previos al expediente. Va en un portal sobre
 * el body porque cualquier ancestro con `transform` o `filter` convertiría el
 * `position: fixed` del overlay en una caja anclada al panel y el diálogo
 * aparecería recortado dentro de la vista en lugar de sobre ella.
 */
export function SituationModalShell({
  label,
  onClose,
  fullSize = false,
  children,
}: SituationModalShellProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return createPortal(
    <div className="novex-situation-modal" role="presentation">
      <button
        type="button"
        className="novex-situation-modal__backdrop"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        className={
          fullSize
            ? 'novex-situation-modal__dialog'
            : 'novex-situation-modal__dialog novex-situation-modal__dialog--state'
        }
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
