import { useId, type FormEvent } from 'react'
import type { ProblemDetail } from '@/modules/operational-cards/types/problem-detail.types'
import type { OperationalSubmissionState } from '@/modules/operational-cards/types/operational-cards.state'
import { DOSSIER_HISTORY_STATUS_LABEL } from '@/modules/operational-cards/data/problemDossier'
import { resolveResolutionCopy } from '@/modules/situations/data/resolutionCopy'
import { ProblemResolutionRecord } from '@/modules/operational-cards/components/ProblemResolutionRecord'

/**
 * ACCIONES sobre el problema, bajo su detalle y en el mismo panel.
 *
 * Dos bloques de presentación (misma lógica de permisos que antes):
 *   Seguimiento   Estado actual + «Pasar a En atención» si OPEN y
 *                 canAdvanceToInProgress.
 *   Cierre        Aprendizaje obligatorio si canResolve (OPEN o IN_PROGRESS).
 *
 * El endpoint de cierre solo acepta `learning`. No hay campo «solución» aparte.
 * Las vías de CREACIÓN de reportes viven en el modo idle del panel, no aquí.
 */

const CERRADO = new Set(['CLOSED'])

function statusLabel(status: string): string {
  return DOSSIER_HISTORY_STATUS_LABEL[status] ?? status
}

export interface ProblemActionsProps {
  detail: ProblemDetail
  learningDraft: string
  submission: OperationalSubmissionState
  onLearningChange: (value: string) => void
  onResolve: () => void
  /** OPEN → IN_PROGRESS. Solo se llama si la UI ya filtró permiso y estado. */
  onAdvanceToInProgress: () => void
  /**
   * False: no muestra avance ni cierre aunque el DTO traiga flags.
   * Shells de consulta (DIRECTOR / ADMIN).
   */
  allowLifecycleActions?: boolean
}

export function ProblemActions({
  detail,
  learningDraft,
  submission,
  onLearningChange,
  onResolve,
  onAdvanceToInProgress,
  allowLifecycleActions = true,
}: ProblemActionsProps) {
  const idPrefijo = useId()
  const copy = resolveResolutionCopy(detail.reportKind)
  const enviandoResolucion =
    submission.status === 'sending' &&
    submission.kind === 'resolution' &&
    submission.targetKey === detail.id
  const errorResolucion =
    submission.status === 'error' &&
    submission.kind === 'resolution' &&
    submission.targetKey === detail.id
      ? submission.errorMessage
      : null

  const enviandoAvance =
    submission.status === 'sending' &&
    submission.kind === 'status-advance' &&
    submission.targetKey === detail.id
  const errorAvance =
    submission.status === 'error' &&
    submission.kind === 'status-advance' &&
    submission.targetKey === detail.id
      ? submission.errorMessage
      : null

  const ocupado = enviandoResolucion || enviandoAvance
  const yaCerrado = CERRADO.has(detail.status)
  const puedeAvanzar =
    allowLifecycleActions &&
    !yaCerrado &&
    detail.status === 'OPEN' &&
    detail.canAdvanceToInProgress === true
  const muestraSeguimiento = !yaCerrado
  const sinTexto = learningDraft.trim().length === 0

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (ocupado || sinTexto) return
    onResolve()
  }

  return (
    <section
      className="problem-actions"
      data-testid="problem-actions"
      data-surface="problem-actions"
      data-can-resolve={detail.canResolve ? 'true' : 'false'}
      data-can-advance={detail.canAdvanceToInProgress ? 'true' : 'false'}
      data-can-update={detail.canUpdate ? 'true' : 'false'}
      data-allow-lifecycle={allowLifecycleActions ? 'true' : 'false'}
      data-resolved={yaCerrado ? 'true' : undefined}
      data-report-kind={detail.reportKind ?? 'INTERNAL'}
      data-status={detail.status}
      aria-label="Acciones sobre el problema"
    >
      {yaCerrado && (
        <ProblemResolutionRecord
          resolution={detail.resolution}
          reportKind={detail.reportKind}
        />
      )}

      {muestraSeguimiento && (
        <div
          className="problem-actions__block problem-actions__block--tracking"
          data-testid="status-advance-block"
          data-surface="problem-tracking"
        >
          <div className="problem-actions__block-head">
            <h3 className="problem-actions__block-title">
              Seguimiento del problema
            </h3>
            <span
              className="problem-actions__status"
              data-testid="actions-status"
              data-status={detail.status}
            >
              {statusLabel(detail.status)}
            </span>
          </div>

          {puedeAvanzar && (
            <div className="problem-actions__advance">
              {enviandoAvance && (
                <p
                  className="problem-actions__note"
                  data-testid="status-advance-sending"
                  role="status"
                >
                  Actualizando el estado…
                </p>
              )}

              {errorAvance && (
                <p
                  className="problem-actions__note problem-actions__note--error"
                  data-testid="status-advance-error"
                  role="alert"
                >
                  {errorAvance}
                </p>
              )}

              <button
                type="button"
                className="problem-actions__advance-button"
                data-testid="status-advance-button"
                aria-label="Pasar a En atención"
                disabled={ocupado}
                onClick={() => {
                  if (ocupado) return
                  onAdvanceToInProgress()
                }}
              >
                {enviandoAvance ? 'Actualizando…' : 'Pasar a En atención'}
              </button>
            </div>
          )}
        </div>
      )}

      {!yaCerrado && allowLifecycleActions && detail.canResolve && (
        <div
          className="problem-actions__block problem-actions__block--resolution"
          data-surface="problem-resolution"
        >
          <h3 className="problem-actions__block-title">{copy.blockTitle}</h3>
          <p className="problem-actions__block-hint">{copy.blockHint}</p>
          <form
            className="problem-actions__form"
            data-testid="resolve-form"
            data-report-kind={detail.reportKind ?? 'INTERNAL'}
            onSubmit={handleSubmit}
          >
            <label
              className="problem-actions__label"
              htmlFor={`${idPrefijo}-learning`}
            >
              {copy.fieldLabel}
            </label>
            <p className="problem-actions__field-help">{copy.fieldHelp}</p>
            <textarea
              id={`${idPrefijo}-learning`}
              data-testid="resolve-learning"
              rows={3}
              maxLength={4000}
              required
              value={learningDraft}
              disabled={ocupado}
              placeholder={copy.placeholder}
              onChange={(e) => onLearningChange(e.target.value)}
            />

            {enviandoResolucion && (
              <p
                className="problem-actions__note"
                data-testid="resolve-sending"
                role="status"
              >
                {copy.submittingLabel}
              </p>
            )}

            {errorResolucion && (
              <p
                className="problem-actions__note problem-actions__note--error"
                data-testid="resolve-error"
                role="alert"
              >
                {errorResolucion}
              </p>
            )}

            <button
              type="submit"
              className="problem-actions__submit"
              data-testid="resolve-submit"
              disabled={ocupado || sinTexto}
            >
              {enviandoResolucion ? copy.submittingLabel : copy.submitLabel}
            </button>
          </form>
        </div>
      )}

      {!yaCerrado && allowLifecycleActions && !detail.canResolve && (
        <p
          className="problem-actions__note problem-actions__note--readonly"
          data-testid="resolve-not-allowed"
        >
          El cierre corresponde al coordinador de la coordinación responsable.
          Un analista solo puede cerrar cuando Coordinación General es la
          responsable del problema.
        </p>
      )}
    </section>
  )
}
