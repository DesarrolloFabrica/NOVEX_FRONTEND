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
import { useReasonDraft } from '@/modules/operational-cards/hooks/useReasonDraft'

export interface RetireEvidenceModalProps {
  isOpen: boolean
  evidenceTitle: string
  evidenceId: string
  /** Ámbito de borrador (id de usuario). */
  draftScope?: string | null
  isSubmitting: boolean
  error: string | null
  onClose: () => void
  onConfirm: (reason: string) => void
}

export function RetireEvidenceModal({
  isOpen,
  evidenceTitle,
  evidenceId,
  draftScope = null,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: RetireEvidenceModalProps) {
  const titleId = useId()
  const fieldId = useId()
  const descId = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  const { reason, setReason, clearDraft } = useReasonDraft({
    scope: draftScope,
    kind: 'retire',
    targetId: evidenceId,
    isOpen,
  })
  const [localError, setLocalError] = useState<string | null>(null)
  const confirmedRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return
    triggerRef.current = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 50)
    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = previousOverflow
      triggerRef.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      confirmedRef.current = false
      setLocalError(null)
      return
    }
    if (confirmedRef.current) {
      clearDraft()
      confirmedRef.current = false
    }
  }, [isOpen, clearDraft])

  useEffect(() => {
    if (error) confirmedRef.current = false
  }, [error])

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, onClose])

  const handleKeyDownInDialog = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !dialogRef.current) return
    const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
    )
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      }
    } else if (document.activeElement === last) {
      event.preventDefault()
      first?.focus()
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
      confirmedRef.current = true
      onConfirm(validated)
    } catch (err) {
      setLocalError(
        err instanceof AdminReasonValidationError
          ? err.message
          : 'El motivo ingresado no es válido.',
      )
    }
  }

  const activeError = localError ?? error

  return createPortal(
    <div className="novex-ops-modal" role="presentation">
      <button
        type="button"
        className="novex-ops-modal__backdrop"
        aria-label="Cerrar diálogo de retiro de evidencia"
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
        data-testid="retire-evidence-modal"
        onKeyDown={handleKeyDownInDialog}
      >
        <header>
          <div>
            <p className="novex-ops-modal__eyebrow">Evidencias</p>
            <h2 id={titleId}>Retirar evidencia</h2>
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
          <p className="novex-ops-modal__situation-title" title={evidenceTitle}>
            Evidencia: <strong>{evidenceTitle}</strong>
          </p>
          <p
            id={descId}
            className="novex-ops-modal__hint novex-ops-modal__hint--warning"
          >
            Retirar no elimina el registro de forma definitiva. La evidencia
            deja de figurar como activa y queda en el historial, con motivo y
            fecha, cuando usted tenga autorización para consultarlo.
          </p>
        </div>

        <form
          className="novex-ops-modal__form"
          data-testid="retire-evidence-form"
          onSubmit={handleSubmit}
        >
          <label className="novex-ops-modal__comment" htmlFor={fieldId}>
            <span>Motivo del retiro (obligatorio)</span>
            <textarea
              ref={textareaRef}
              id={fieldId}
              data-testid="retire-evidence-reason"
              rows={4}
              minLength={SITUATION_ADMIN_REASON_MIN_LENGTH}
              maxLength={SITUATION_ADMIN_REASON_MAX_LENGTH}
              required
              value={reason}
              disabled={isSubmitting}
              placeholder="Indique por qué se retira esta evidencia del expediente activo…"
              onChange={(e) => {
                setReason(e.target.value)
                setLocalError(null)
              }}
            />
          </label>

          <div className="novex-ops-modal__field-meta">
            <span
              className={`novex-ops-modal__counter ${isTooShort || isTooLong ? 'novex-ops-modal__counter--warn' : ''}`}
              data-testid="retire-reason-counter"
            >
              {trimmedLength} / {SITUATION_ADMIN_REASON_MAX_LENGTH} caracteres
              {trimmedLength > 0 && isTooShort && (
                <span> (mínimo {SITUATION_ADMIN_REASON_MIN_LENGTH})</span>
              )}
            </span>
          </div>

          {activeError && (
            <p
              className="novex-ops-modal__error"
              data-testid="retire-evidence-error"
              role="alert"
            >
              {activeError}
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
              data-testid="confirm-retire-evidence-submit"
              disabled={!canSubmit}
            >
              {isSubmitting ? 'Retirando…' : 'Confirmar retiro'}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  )
}
