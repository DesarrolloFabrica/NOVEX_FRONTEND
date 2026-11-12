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
import { fetchCoordinations } from '@/modules/api/coordinations.api'
import { useReasonDraft } from '@/modules/operational-cards/hooks/useReasonDraft'

export interface AdministrationCoordinationOption {
  id: string
  label: string
  code?: string
}

export interface TransferCoordinationModalProps {
  isOpen: boolean
  situationTitle: string
  situationId: string
  /** Ámbito de borrador (id de usuario). */
  draftScope?: string | null
  currentCoordinationName: string
  currentCoordinationId?: string | null
  currentCoordinationCode?: string | null
  affectedCoordinationId?: string | null
  affectedCoordinationCode?: string | null
  reportKind?: string | null
  currentStatus?: string | null
  coordinationOptions: readonly AdministrationCoordinationOption[]
  isSubmitting: boolean
  error: string | null
  onClose: () => void
  onConfirm: (destinationId: string, reason: string) => void
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

export function TransferCoordinationModal({
  isOpen,
  situationTitle,
  situationId,
  draftScope = null,
  currentCoordinationName,
  currentCoordinationId,
  currentCoordinationCode,
  affectedCoordinationId,
  affectedCoordinationCode,
  reportKind,
  currentStatus,
  coordinationOptions,
  isSubmitting,
  error,
  onClose,
  onConfirm,
  onRetryDetail,
}: TransferCoordinationModalProps) {
  const titleId = useId()
  const selectId = useId()
  const reasonId = useId()
  const descId = useId()
  const selectRef = useRef<HTMLSelectElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  const [destinationId, setDestinationId] = useState('')
  const { reason, setReason, clearDraft } = useReasonDraft({
    scope: draftScope,
    kind: 'transfer',
    targetId: situationId,
    isOpen,
  })
  const [localError, setLocalError] = useState<string | null>(null)
  const confirmedRef = useRef(false)
  const [fetchedOptions, setFetchedOptions] = useState<
    readonly AdministrationCoordinationOption[]
  >([])

  // Carga de contingencia si no se pasaron opciones desde overview
  useEffect(() => {
    let active = true
    if (isOpen && coordinationOptions.length === 0) {
      void fetchCoordinations()
        .then((items) => {
          if (!active) return
          setFetchedOptions(
            items.map((item) => ({
              id: item.id,
              label: item.name,
              code: item.code,
            })),
          )
        })
        .catch(() => {})
    }
    return () => {
      active = false
    }
  }, [isOpen, coordinationOptions.length])

  const allOptions =
    coordinationOptions.length > 0 ? coordinationOptions : fetchedOptions

  // Filtrado de coordinaciones no elegibles
  const availableOptions = allOptions.filter((opt) => {
    // 1. Excluir la coordinación responsable actual
    if (currentCoordinationId && opt.id === currentCoordinationId) return false
    if (currentCoordinationCode && opt.code === currentCoordinationCode)
      return false

    // 2. En reporte INTER, el destino no puede ser la coordinación afectada
    if (reportKind === 'INTER_COORDINATION') {
      if (affectedCoordinationId && opt.id === affectedCoordinationId) return false
      if (affectedCoordinationCode && opt.code === affectedCoordinationCode)
        return false
    }

    return true
  })

  // Guardar elemento activo al abrir y restaurar foco al cerrar
  useEffect(() => {
    if (!isOpen) return
    triggerRef.current = document.activeElement as HTMLElement | null

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const timer = window.setTimeout(() => {
      selectRef.current?.focus()
    }, 50)

    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = previousOverflow
      triggerRef.current?.focus()
    }
  }, [isOpen])

  // Limpiar destino local al abrir; el motivo se hidrata desde el borrador.
  useEffect(() => {
    if (isOpen) {
      confirmedRef.current = false
      setDestinationId('')
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
  const hasDestination = destinationId.trim().length > 0
  const canSubmit = !isSubmitting && hasDestination && !isTooShort && !isTooLong

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return

    setLocalError(null)

    if (!destinationId) {
      setLocalError('Debe seleccionar una nueva coordinación de destino.')
      return
    }

    if (currentCoordinationId && destinationId === currentCoordinationId) {
      setLocalError('El destino es la coordinación responsable actual.')
      return
    }

    if (
      reportKind === 'INTER_COORDINATION' &&
      affectedCoordinationId &&
      destinationId === affectedCoordinationId
    ) {
      setLocalError(
        'En un reporte de intercoordinación, el destino no puede ser la coordinación afectada.',
      )
      return
    }

    try {
      const validated = assertAdminReason(reason)
      confirmedRef.current = true
      onConfirm(destinationId, validated)
    } catch (err) {
      if (err instanceof AdminReasonValidationError) {
        setLocalError(err.message)
      } else {
        setLocalError('El motivo ingresado no es válido.')
      }
    }
  }

  const activeError = localError ?? error
  const showConcurrencyRetry =
    isConcurrencyOrStaleError(activeError) && onRetryDetail
  const isInProgress = currentStatus === 'IN_PROGRESS'

  return createPortal(
    <div className="novex-ops-modal" role="presentation">
      <button
        type="button"
        className="novex-ops-modal__backdrop"
        aria-label="Cerrar diálogo de traslado"
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
        data-testid="transfer-coordination-modal"
        onKeyDown={handleKeyDownInDialog}
      >
        <header>
          <div>
            <p className="novex-ops-modal__eyebrow">Gestión administrativa</p>
            <h2 id={titleId}>Trasladar coordinación responsable</h2>
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
            Situación: <strong>{situationTitle}</strong>
          </p>
          <div className="novex-ops-modal__coordination-info">
            <span className="novex-ops-modal__coord-label">
              Coordinación responsable actual:
            </span>
            <strong
              className="novex-ops-modal__coord-current"
              data-testid="current-coordination-name"
            >
              {currentCoordinationName || currentCoordinationCode || 'Sin asignar'}
            </strong>
          </div>

          <p id={descId} className="novex-ops-modal__hint">
            Al trasladar la situación, la nueva coordinación asignada se hará cargo
            de su atención y resolución.{' '}
            {isInProgress && (
              <span
                className="novex-ops-modal__hint--reopen-warning"
                data-testid="transfer-reopen-warning"
              >
                Como la situación se encuentra actualmente «En atención», volverá al
                estado «Abierta» para que el nuevo equipo la asuma.
              </span>
            )}
          </p>
        </div>

        <form
          className="novex-ops-modal__form"
          data-testid="transfer-coordination-form"
          onSubmit={handleSubmit}
        >
          <label className="novex-ops-modal__comment" htmlFor={selectId}>
            <span>Nueva coordinación responsable (obligatorio)</span>
            <select
              ref={selectRef}
              id={selectId}
              data-testid="transfer-destination-select"
              required
              disabled={isSubmitting}
              value={destinationId}
              onChange={(e) => {
                setDestinationId(e.target.value)
                setLocalError(null)
              }}
            >
              <option value="">Seleccione la coordinación de destino…</option>
              {availableOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="novex-ops-modal__comment" htmlFor={reasonId}>
            <span>Motivo del traslado (obligatorio)</span>
            <textarea
              id={reasonId}
              data-testid="transfer-coordination-reason"
              rows={4}
              minLength={SITUATION_ADMIN_REASON_MIN_LENGTH}
              maxLength={SITUATION_ADMIN_REASON_MAX_LENGTH}
              required
              value={reason}
              disabled={isSubmitting}
              placeholder="Explique las razones técnicas u operacionales que justifican reasignar esta situación…"
              onChange={(e) => {
                setReason(e.target.value)
                setLocalError(null)
              }}
            />
          </label>

          <div className="novex-ops-modal__field-meta">
            <span
              className={`novex-ops-modal__counter ${isTooShort || isTooLong ? 'novex-ops-modal__counter--warn' : ''}`}
              data-testid="transfer-reason-counter"
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
                data-testid="transfer-coordination-error"
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
              className="novex-ops-modal__primary"
              data-testid="confirm-transfer-coordination-submit"
              disabled={!canSubmit}
            >
              {isSubmitting ? 'Trasladando…' : 'Confirmar traslado'}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  )
}
