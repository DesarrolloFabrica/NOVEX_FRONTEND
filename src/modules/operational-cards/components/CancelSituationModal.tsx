import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  assertAdminReason,
  AdminReasonValidationError,
  SITUATION_ADMIN_REASON_MIN_LENGTH,
  SITUATION_ADMIN_REASON_MAX_LENGTH,
} from '@/modules/situations/data/assertAdminReason'

export interface CancelSituationModalProps {
  isOpen: boolean
  situationTitle: string
  isSubmitting: boolean
  error: string | null
  onClose: () => void
  onConfirm: (reason: string) => void
  onRetryDetail?: () => void
}

function isConcurrencyOrStaleError(errorMessage: string | null): boolean {
  if (!errorMessage) return false
  const lower = errorMessage.toLowerCase()
  return (
    lower.includes('cambió') ||
    lower.includes('ya no admite') ||
    lower.includes('ya estaba anulada') ||
    lower.includes('no se anula ni se traslada') ||
    lower.includes('concurrencia') ||
    lower.includes('409')
  )
}

export function CancelSituationModal({
  isOpen,
  situationTitle,
  isSubmitting,
  error,
  onClose,
  onConfirm,
  onRetryDetail,
}: CancelSituationModalProps) {
  const titleId = useId()
  const fieldId = useId()
  const descId = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  const [reason, setReason] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  // Guardar elemento activo al abrir y restaurar foco al cerrar
  useEffect(() => {
    if (!isOpen) return
    triggerRef.current = document.activeElement as HTMLElement | null

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Foco inicial en el textarea tras montar
    const timer = window.setTimeout(() => {
      textareaRef.current?.focus()
    }, 50)

    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = previousOverflow
      triggerRef.current?.focus()
    }
  }, [isOpen])

  // Limpiar campos locales al abrir
  useEffect(() => {
    if (isOpen) {
      setReason('')
      setLocalError(null)
    }
  }, [isOpen])

  // Cierre con Escape
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isSubmitting, onClose])

  // Trampa de foco accesible
  const handleKeyDownInDialog = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !dialogRef.current) return

    const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not(:disabled), textarea:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
    )
    if (focusables.length === 0) return

    const first = focusables[0]
    const last = focusables[focusables.length - 1]

    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
  }

  if (!isOpen) return null

  const trimmedLength = reason.trim().length
  const isTooShort = trimmedLength < SITUATION_ADMIN_REASON_MIN_LENGTH
  const isTooLong = trimmedLength > SITUATION_ADMIN_REASON_MAX_LENGTH
  const canSubmit = !isSubmitting && !isTooShort && !isTooLong

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return

    setLocalError(null)
    try {
      const validated = assertAdminReason(reason)
      onConfirm(validated)
    } catch (err) {
      if (err instanceof AdminReasonValidationError) {
        setLocalError(err.message)
      } else {
        setLocalError('El motivo ingresado no es válido.')
      }
    }
  }

  const activeError = localError ?? error
  const showConcurrencyRetry = isConcurrencyOrStaleError(activeError) && onRetryDetail

  return createPortal(
    <div className="novex-ops-modal" role="presentation">
      <button
        type="button"
        className="novex-ops-modal__backdrop"
        aria-label="Cerrar diálogo de anulación"
        disabled={isSubmitting}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className="novex-ops-modal__dialog novex-ops-modal__dialog--admin-action"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        data-testid="cancel-situation-modal"
        onKeyDown={handleKeyDownInDialog}
      >
        <header>
          <div>
            <p className="novex-ops-modal__eyebrow">Gestión administrativa</p>
            <h2 id={titleId}>Anular situación</h2>
          </div>
          <button
            type="button"
            className="novex-ops-modal__close"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label="Cerrar"
          >
            Cerrar
          </button>
        </header>

        <div className="novex-ops-modal__context">
          <p className="novex-ops-modal__situation-title" title={situationTitle}>
            Caso: <strong>{situationTitle}</strong>
          </p>
          <p id={descId} className="novex-ops-modal__hint novex-ops-modal__hint--warning">
            La anulación es una medida administrativa excepcional. A diferencia
            del cierre o resolución, anular invalida la situación por completo sin
            resolverla operativamente ni registrar aprendizaje.
          </p>
        </div>

        <form
          className="novex-ops-modal__form"
          data-testid="cancel-situation-form"
          onSubmit={handleSubmit}
        >
          <label className="novex-ops-modal__comment" htmlFor={fieldId}>
            <span>Motivo de anulación (obligatorio)</span>
            <textarea
              ref={textareaRef}
              id={fieldId}
              data-testid="cancel-situation-reason"
              rows={4}
              minLength={SITUATION_ADMIN_REASON_MIN_LENGTH}
              maxLength={SITUATION_ADMIN_REASON_MAX_LENGTH}
              required
              value={reason}
              disabled={isSubmitting}
              placeholder="Explique el motivo institucional o técnico por el cual se anula la situación…"
              onChange={(e) => {
                setReason(e.target.value)
                setLocalError(null)
              }}
            />
          </label>

          <div className="novex-ops-modal__field-meta">
            <span
              className={`novex-ops-modal__counter ${isTooShort || isTooLong ? 'novex-ops-modal__counter--warn' : ''}`}
              data-testid="cancel-reason-counter"
            >
              {trimmedLength} / {SITUATION_ADMIN_REASON_MAX_LENGTH} caracteres
              {trimmedLength > 0 && isTooShort && (
                <span> (mínimo {SITUATION_ADMIN_REASON_MIN_LENGTH})</span>
              )}
            </span>
          </div>

          {activeError && (
            <div className="novex-ops-modal__error-box">
              <p
                className="novex-ops-modal__error"
                data-testid="cancel-situation-error"
                role="alert"
              >
                {activeError}
              </p>
              {showConcurrencyRetry && (
                <button
                  type="button"
                  className="novex-ops-modal__retry-btn"
                  onClick={() => {
                    onRetryDetail()
                  }}
                >
                  Refrescar situación
                </button>
              )}
            </div>
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
              className="novex-ops-modal__primary novex-ops-modal__primary--destructive"
              data-testid="confirm-cancel-situation-submit"
              disabled={!canSubmit}
            >
              {isSubmitting ? 'Anulando…' : 'Confirmar anulación'}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  )
}
