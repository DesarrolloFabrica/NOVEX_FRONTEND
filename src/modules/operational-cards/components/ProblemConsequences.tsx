import { useId, useState, type FormEvent } from 'react'
import { formatProblemDateTime } from '@/modules/operational-cards/data/problemDetailPresentation'
import {
  CONSEQUENCE_MAX,
  validateConsequenceDraft,
  type ConsequenceDraft,
} from '@/modules/operational-cards/services/problem-consequence.service'
import { nowAsLocalInput } from '@/modules/operational-cards/services/report-submission.service'
import type { OperationalSubmissionState } from '@/modules/operational-cards/types/operational-cards.state'
import type { ProblemConsequence } from '@/modules/operational-cards/types/problem-detail.types'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'

/**
 * AFECTACIONES de un problema INTERNAL: las consecuencias que fue produciendo
 * mientras seguía sin resolver. Append-only: se leen en orden de ocurrencia y
 * se añaden, nunca se editan ni se borran.
 *
 *   - Dos partes: el HISTORIAL y, debajo, el subbloque «Agregar afectación»
 *     (formulario siempre a la vista) cuando el servidor lo permite
 *     (`canAddConsequence`) y el caso sigue activo. Sin permiso no queda ni
 *     separador ni hueco.
 *   - Cerrado: la lista sigue visible, sin subbloque, con «Historia congelada
 *     al cierre».
 *   - Cada ítem: cuándo ocurrió, qué pasó, quién lo registró (y su rol) y la
 *     severidad que regía entonces. Si se registró bastante después de
 *     ocurrir, se dice discretamente («Registrada el …»).
 */

const SEVERITY_LABEL: Record<SituationSeverity, string> = {
  CRITICAL: 'Crítica',
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
}

/** A partir de cuánto se considera «registrada después» (6 h). */
const LATE_REGISTRATION_MS = 6 * 60 * 60 * 1000

function registeredLate(item: ProblemConsequence): boolean {
  const occurred = new Date(item.occurredAt).getTime()
  const created = new Date(item.createdAt).getTime()
  return Number.isFinite(occurred) && Number.isFinite(created)
    ? created - occurred > LATE_REGISTRATION_MS
    : false
}

export interface ProblemConsequencesProps {
  consequences: readonly ProblemConsequence[]
  /** Política del servidor ∧ shell con escritura. */
  canAdd: boolean
  closed: boolean
  submission: OperationalSubmissionState
  onSubmit: (draft: ConsequenceDraft) => Promise<boolean>
}

export function ProblemConsequences({
  consequences,
  canAdd,
  closed,
  submission,
  onSubmit,
}: ProblemConsequencesProps) {
  const idPrefijo = useId()
  const [draft, setDraft] = useState<ConsequenceDraft>(() => ({
    description: '',
    occurredAt: nowAsLocalInput(),
  }))
  const [localError, setLocalError] = useState<string | null>(null)

  const enviando =
    submission.status === 'sending' && submission.kind === 'consequence'
  const ocupado = submission.status === 'sending'
  const errorServidor =
    submission.status === 'error' && submission.kind === 'consequence'
      ? submission.errorMessage
      : null

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (ocupado) return
    const problemas = validateConsequenceDraft(draft)
    if (problemas.length > 0) {
      setLocalError(problemas.join(' '))
      return
    }
    setLocalError(null)
    const ok = await onSubmit(draft)
    if (ok) {
      // Listo para la siguiente: texto vacío y la fecha vuelve a «ahora».
      setDraft({ description: '', occurredAt: nowAsLocalInput() })
    }
  }

  const count = consequences.length
  // El subbloque de registro solo existe con permiso y con el caso activo:
  // sin él no queda ningún separador ni hueco.
  const showComposer = canAdd && !closed

  return (
    <section
      className="problem-consequences"
      data-testid="detail-consequences"
      data-count={count}
      aria-labelledby={`${idPrefijo}-title`}
    >
      <div className="problem-consequences__head">
        <h4 id={`${idPrefijo}-title`} className="problem-detail__block-title">
          Afectaciones
          {count > 0 && (
            <span
              className="problem-consequences__count"
              data-testid="detail-consequences-count"
            >
              {count === 1 ? '1 afectación' : `${count} afectaciones`}
            </span>
          )}
        </h4>
      </div>

      {count === 0 ? (
        <p
          className="detail-section__note"
          data-testid="detail-consequences-empty"
        >
          Sin afectaciones registradas.
        </p>
      ) : (
        <ol className="detail-entries" data-testid="detail-consequences-list">
          {consequences.map((item) => {
            const occurred = formatProblemDateTime(item.occurredAt)
            const created = formatProblemDateTime(item.createdAt)
            const author = [item.authorName, item.authorRole]
              .filter(Boolean)
              .join(' / ')
            return (
              <li
                key={item.id}
                className="detail-entry problem-consequences__item"
                data-testid="detail-consequence"
              >
                <p className="detail-entry__title">
                  {occurred.iso ? (
                    <time dateTime={occurred.iso}>{occurred.label}</time>
                  ) : (
                    <span>{occurred.label}</span>
                  )}
                  {item.severityAtOccurrence && (
                    <span
                      className="problem-consequences__severity"
                      data-severity={item.severityAtOccurrence}
                      data-testid="detail-consequence-severity"
                    >
                      {SEVERITY_LABEL[item.severityAtOccurrence]}
                    </span>
                  )}
                </p>
                <p className="detail-entry__content">{item.description}</p>
                <p className="detail-entry__byline">
                  {author || 'Autor no registrado'}
                  {registeredLate(item) && (
                    <span data-testid="detail-consequence-late">
                      <span aria-hidden="true"> · </span>
                      Registrada el{' '}
                      {created.iso ? (
                        <time dateTime={created.iso}>{created.label}</time>
                      ) : (
                        created.label
                      )}
                    </span>
                  )}
                </p>
              </li>
            )
          })}
        </ol>
      )}

      {closed && (
        <p
          className="problem-consequences__frozen"
          data-testid="detail-consequences-frozen"
        >
          Historia congelada al cierre
        </p>
      )}

      {showComposer && (
        <div
          className="problem-consequences__composer"
          data-testid="consequence-composer"
          role="group"
          aria-labelledby={`${idPrefijo}-composer-title`}
        >
          <h5
            id={`${idPrefijo}-composer-title`}
            className="problem-consequences__composer-title"
          >
            Agregar afectación
          </h5>
          <p className="problem-consequences__composer-help">
            Registra una nueva consecuencia generada mientras el problema
            continúa activo.
          </p>
          <form
            className="problem-actions__form problem-consequences__form"
            data-testid="consequence-form"
            onSubmit={handleSubmit}
          >
            <label
              className="problem-consequences__sr-only"
              htmlFor={`${idPrefijo}-description`}
            >
              ¿Qué consecuencia produjo?
            </label>
            <textarea
              id={`${idPrefijo}-description`}
              data-testid="consequence-description"
              rows={2}
              maxLength={CONSEQUENCE_MAX}
              required
              value={draft.description}
              disabled={ocupado}
              placeholder="¿Qué se retrasó, bloqueó o no se pudo hacer?"
              onChange={(e) =>
                setDraft((current) => ({
                  ...current,
                  description: e.target.value,
                }))
              }
            />

            {(localError || errorServidor) && (
              <p
                className="problem-actions__note problem-actions__note--error"
                data-testid="consequence-error"
                role="alert"
              >
                {localError ?? errorServidor}
              </p>
            )}

            <div className="problem-consequences__form-row">
              <label
                className="problem-consequences__date-label"
                htmlFor={`${idPrefijo}-occurred`}
              >
                <span>¿Cuándo ocurrió?</span>
                <input
                  id={`${idPrefijo}-occurred`}
                  className="problem-consequences__datetime"
                  data-testid="consequence-occurred-at"
                  type="datetime-local"
                  max={nowAsLocalInput()}
                  value={draft.occurredAt}
                  disabled={ocupado}
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      occurredAt: e.target.value,
                    }))
                  }
                />
              </label>
              <button
                type="submit"
                className="problem-consequences__submit"
                data-testid="consequence-submit"
                disabled={ocupado || draft.description.trim().length === 0}
              >
                {enviando ? 'Registrando…' : 'Registrar afectación'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
