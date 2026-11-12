import { useEffect, useId, useRef, type ReactNode } from 'react'
import { IconPen } from '@/modules/operational-cards/components/OperationalIcons'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * MODAL «REGISTRAR SITUACIÓN» (COORDINADOR).
 *
 * Envuelve el formulario unificado (`OperationalActionPanel` en modo
 * `report`) sin duplicar su lógica: borrador, validación, envío idempotente y
 * la apertura del detalle al confirmar siguen en el controlador. El modal se
 * monta DENTRO del shell para heredar la piel del formulario.
 *
 * Accesibilidad: diálogo modal con título, foco inicial en el primer campo,
 * foco atrapado, Esc cierra y el foco vuelve al botón que lo abrió. El fondo
 * no se desplaza mientras está abierto. Un clic fuera NO cierra: un formulario
 * a medio llenar no debe perderse por un clic accidental (el borrador, además,
 * se conserva al cerrar).
 */
export function ReportSituationModal({
  destination,
  onClose,
  children,
}: {
  /** Coordinación de destino; `null` si aún no se eligió carta. */
  destination: string | null
  onClose: () => void
  children: ReactNode
}) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const previous = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    // Primer campo del formulario; si aún no está, el propio diálogo.
    const first =
      dialog.querySelector<HTMLElement>('.report-form input:not([type="radio"]), .report-form textarea') ??
      dialog.querySelector<HTMLElement>('.report-form input') ??
      dialog
    first.focus({ preventScroll: true })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null,
      )
      if (items.length === 0) return
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      previous?.focus?.({ preventScroll: true })
    }
  }, [])

  return (
    <div className="report-modal" data-testid="report-modal">
      <div className="report-modal__backdrop" aria-hidden="true" />
      <div
        ref={dialogRef}
        className="report-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="report-modal__header">
          <span className="report-modal__medallion" aria-hidden="true">
            <IconPen size={24} />
          </span>
          <div className="report-modal__heading">
            <span className="report-modal__eyebrow">Nueva situación</span>
            <h2 className="report-modal__title" id={titleId}>
              Registrar situación
            </h2>
            <p className="report-modal__destination" data-missing={destination ? undefined : 'true'}>
              {destination ? (
                <>
                  Se registrará en <strong>{destination}</strong>
                </>
              ) : (
                'Elija primero en la mesa la coordinación afectada.'
              )}
            </p>
          </div>
          <button
            type="button"
            className="report-modal__close"
            onClick={onClose}
            aria-label="Cerrar sin registrar"
            data-testid="report-modal-close"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div className="report-modal__body">{children}</div>
      </div>
    </div>
  )
}
