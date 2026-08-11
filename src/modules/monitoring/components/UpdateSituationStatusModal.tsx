import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  asOperationalStatus,
  getNextOperationalStatus,
  OPERATIONAL_STATUS_LABEL,
  requiresStatusComment,
  statusCommentLabel,
  type SituationOperationalStatus,
  type UpdateSituationStatusInput,
} from '@/modules/monitoring/utils/situation-lifecycle'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'
import {
  CLOSURE_COMMENT_TEMPLATES,
  formatSlaDeadlineLabel,
  getSituationSlaHealth,
  getSlaActionRecommendation,
} from '@/modules/situations/utils/situation-sla'
import { formatManagementDate } from '@/modules/monitoring/utils/situation-management.presentation'

interface UpdateSituationStatusModalProps {
  currentStatus: string
  dueAt?: string | null
  severity?: SituationSeverity | string | null
  isSubmitting: boolean
  error: string | null
  onClose: () => void
  onSubmit: (input: UpdateSituationStatusInput) => Promise<void>
}

export function UpdateSituationStatusModal({
  currentStatus,
  dueAt = null,
  severity = null,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: UpdateSituationStatusModalProps) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const nextStatus = getNextOperationalStatus(currentStatus)
  const [selectedStatus, setSelectedStatus] =
    useState<SituationOperationalStatus | null>(nextStatus)
  const [comment, setComment] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  /** Estructura preparada para evidencias futuras. */
  const [evidenceIds] = useState<string[]>([])

  const slaHealth = getSituationSlaHealth({
    dueAt,
    status: currentStatus,
    severity,
  })
  const slaRecommendation = getSlaActionRecommendation({
    status: currentStatus,
    health: slaHealth,
  })

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

  if (!nextStatus || !selectedStatus) {
    return createPortal(
      <div className="novex-ops-modal" role="presentation">
        <button
          type="button"
          className="novex-ops-modal__backdrop"
          aria-label="Cerrar"
          onClick={onClose}
        />
        <div
          className="novex-ops-modal__dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <header>
            <h2 id={titleId}>Actualizar estado</h2>
            <button
              ref={closeRef}
              type="button"
              className="novex-ops-modal__close"
              onClick={onClose}
            >
              Cerrar
            </button>
          </header>
          <p className="novex-ops-modal__hint">
            Esta situación está cerrada y no admite nuevas modificaciones.
          </p>
        </div>
      </div>,
      document.body,
    )
  }

  const needsComment = requiresStatusComment(selectedStatus)
  const currentLabel =
    OPERATIONAL_STATUS_LABEL[asOperationalStatus(currentStatus)]

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLocalError(null)

    if (needsComment && comment.trim().length === 0) {
      setLocalError(`${statusCommentLabel(selectedStatus)} es obligatorio.`)
      return
    }

    await onSubmit({
      status: selectedStatus,
      statusComment: comment.trim() || undefined,
      evidenceIds: evidenceIds.length > 0 ? evidenceIds : undefined,
    })
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
      >
        <header>
          <div>
            <p>Gestión operacional</p>
            <h2 id={titleId}>Actualizar estado</h2>
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
          Estado actual: <strong>{currentLabel}</strong>. Solo se permite avanzar
          al siguiente estado del ciclo.
        </p>

        {dueAt ? (
          <div className="novex-ops-modal__sla" data-sla={slaHealth}>
            <strong>{formatSlaDeadlineLabel(dueAt, slaHealth)}</strong>
            <span>Límite: {formatManagementDate(dueAt)}</span>
            {slaRecommendation ? <p>{slaRecommendation}</p> : null}
          </div>
        ) : null}

        {nextStatus === 'CLOSED' ? (
          <p className="novex-ops-modal__hint novex-ops-modal__hint--warning">
            Al cerrar, la situación sale de la Red de impacto y de la cola de
            gestión. Seguirá disponible en Situaciones registradas.
          </p>
        ) : null}

        <form className="novex-ops-modal__form" onSubmit={(e) => void handleSubmit(e)}>
          <fieldset disabled={isSubmitting}>
            <legend>Nuevo estado</legend>
            <label className="novex-ops-modal__radio">
              <input
                type="radio"
                name="next-status"
                value={nextStatus}
                checked={selectedStatus === nextStatus}
                onChange={() => {
                  setSelectedStatus(nextStatus)
                  setLocalError(null)
                }}
              />
              <span>{OPERATIONAL_STATUS_LABEL[nextStatus]}</span>
            </label>
          </fieldset>

          {needsComment ? (
            <>
              <div className="novex-ops-modal__templates" role="group" aria-label="Plantillas de cierre">
                {CLOSURE_COMMENT_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className="novex-ops-modal__template"
                    disabled={isSubmitting}
                    onClick={() => {
                      setComment(template.text)
                      setLocalError(null)
                    }}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
              <label className="novex-ops-modal__comment">
                <span>{statusCommentLabel(selectedStatus)}</span>
                <textarea
                  value={comment}
                  required
                  rows={4}
                  maxLength={4000}
                  placeholder="Describa el motivo o comentario de forma clara…"
                  onChange={(event) => {
                    setComment(event.target.value)
                    setLocalError(null)
                  }}
                />
              </label>
            </>
          ) : null}

          {/* Estructura preparada para adjuntar evidencias en una iteración posterior. */}
          <div className="novex-ops-modal__evidences" data-ready="false" hidden>
            <span>Evidencias</span>
            <input type="file" multiple disabled aria-hidden="true" />
          </div>

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
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Actualizando…' : 'Confirmar actualización'}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  )
}
