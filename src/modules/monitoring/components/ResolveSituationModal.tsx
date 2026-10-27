import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  resolveResolutionCopy,
  type ResolutionReportKind,
} from '@/modules/situations/data/resolutionCopy'
import { OPERATIONAL_STATUS_LABEL } from '@/modules/monitoring/utils/situation-lifecycle'
import { asOperationalStatus } from '@/modules/monitoring/utils/situation-lifecycle'

interface ResolveSituationModalProps {
  currentStatus: string
  reportKind?: ResolutionReportKind | null
  isSubmitting: boolean
  error: string | null
  onClose: () => void
  onSubmit: (learning: string) => Promise<void>
}

/**
 * Cierre con aprendizaje. Usa POST /situations/:id/resolution.
 * No usa PATCH ni admite aprendizaje vacío.
 */
export function ResolveSituationModal({
  currentStatus,
  reportKind = 'INTERNAL',
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: ResolveSituationModalProps) {
  const titleId = useId()
  const fieldId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [learning, setLearning] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const copy = resolveResolutionCopy(reportKind)
  const currentLabel =
    OPERATIONAL_STATUS_LABEL[asOperationalStatus(currentStatus)] ??
    currentStatus
  const sinTexto = learning.trim().length === 0

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSubmitting, onClose])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLocalError(null)
    const trimmed = learning.trim()
    if (trimmed.length === 0) {
      setLocalError(copy.emptyError)
      return
    }
    await onSubmit(trimmed)
  }

  return createPortal(
    <div className="novex-ops-modal" role="presentation">
      <button
        type="button"
        className="novex-ops-modal__backdrop"
        aria-label="Cerrar diálogo"
        disabled={isSubmitting}
        onClick={onClose}
      />
      <div
        className="novex-ops-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="resolve-situation-modal"
      >
        <header>
          <div>
            <p>Cierre operacional</p>
            <h2 id={titleId}>{copy.blockTitle}</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="novex-ops-modal__close"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cerrar
          </button>
        </header>

        <p className="novex-ops-modal__hint">
          Estado actual: <strong>{currentLabel}</strong>. {copy.blockHint}
        </p>

        <p className="novex-ops-modal__hint novex-ops-modal__hint--warning">
          Al cerrar, la situación sale de la Red de impacto y de la cola de
          gestión. Seguirá disponible en Situaciones registradas con su
          aprendizaje.
        </p>

        <form
          className="novex-ops-modal__form"
          data-testid="resolve-situation-form"
          onSubmit={(e) => void handleSubmit(e)}
        >
          <label className="novex-ops-modal__comment" htmlFor={fieldId}>
            <span>{copy.fieldLabel}</span>
            <textarea
              id={fieldId}
              data-testid="resolve-situation-learning"
              rows={5}
              maxLength={4000}
              required
              value={learning}
              disabled={isSubmitting}
              placeholder={copy.placeholder}
              onChange={(e) => {
                setLearning(e.target.value)
                setLocalError(null)
              }}
            />
          </label>
          <p className="novex-ops-modal__hint">{copy.fieldHelp}</p>

          {(localError || error) && (
            <p className="novex-ops-modal__error" role="alert">
              {localError ?? error}
            </p>
          )}

          <footer>
            <button
              type="button"
              className="novex-ops-modal__secondary"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="novex-ops-modal__primary"
              data-testid="resolve-situation-submit"
              disabled={isSubmitting || sinTexto}
            >
              {isSubmitting ? copy.submittingLabel : copy.submitLabel}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  )
}
