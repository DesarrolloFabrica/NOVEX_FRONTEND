import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import type { ProblemDetail } from '@/modules/operational-cards/types/problem-detail.types'
import type { OperationalSubmissionState } from '@/modules/operational-cards/types/operational-cards.state'
import { DOSSIER_HISTORY_STATUS_LABEL } from '@/modules/operational-cards/data/problemDossier'
import { resolveSituationAdminActionAvailability } from '@/modules/operational-cards/data/situationAdminActions'
import { resolveResolutionCopy } from '@/modules/situations/data/resolutionCopy'
import { ProblemResolutionRecord } from '@/modules/operational-cards/components/ProblemResolutionRecord'
import { CancelSituationModal } from '@/modules/operational-cards/components/CancelSituationModal'
import {
  TransferCoordinationModal,
  type AdministrationCoordinationOption,
} from '@/modules/operational-cards/components/TransferCoordinationModal'

/**
 * ACCIONES sobre el problema, bajo su detalle y en el mismo panel.
 *
 * Bloques de presentación:
 *   Seguimiento   Estado actual + «Pasar a En atención» si OPEN y
 *                 canAdvanceToInProgress.
 *   Cierre        Aprendizaje obligatorio si canResolve (OPEN o IN_PROGRESS).
 *   Administración  Host para anulación/traslado (botones + modales accesibles).
 *
 * El endpoint de cierre solo acepta `learning`. No hay campo «solución» aparte.
 * Las vías de CREACIÓN de reportes viven en el modo idle del panel, no aquí.
 */

const TERMINAL = new Set(['CLOSED', 'CANCELLED'])

function statusLabel(status: string): string {
  return DOSSIER_HISTORY_STATUS_LABEL[status] ?? status
}

/**
 * Cableado técnico de anulación/traslado.
 */
export interface SituationAdministrationHandlers {
  /**
   * True solo en shell ADMIN. Las pistas `canCancel`/`canTransfer` del detalle
   * siguen siendo la condición de oferta.
   */
  allow: boolean
  onCancel: (reason: string) => void
  onTransfer: (input: {
    toCoordinationId: string
    reason: string
  }) => void
  /** Opciones de coordinación para el selector de traslado. */
  coordinationOptions?: readonly AdministrationCoordinationOption[]
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
  /** Anulación / traslado. Independiente de `allowLifecycleActions`. */
  administration?: SituationAdministrationHandlers | null
  /** Reintento o refresco del detalle del problema ante concurrencia (409) */
  onRetryDetail?: () => void
}

export function ProblemActions({
  detail,
  learningDraft,
  submission,
  onLearningChange,
  onResolve,
  onAdvanceToInProgress,
  allowLifecycleActions = true,
  administration = null,
  onRetryDetail,
}: ProblemActionsProps) {
  const idPrefijo = useId()
  const copy = resolveResolutionCopy(detail.reportKind)
  const adminAvailability = resolveSituationAdminActionAvailability(detail)
  const [activeAdminModal, setActiveAdminModal] = useState<
    'cancel' | 'transfer' | null
  >(null)

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

  const enviandoAnulacion =
    submission.status === 'sending' &&
    submission.kind === 'cancellation' &&
    submission.targetKey === detail.id
  const errorAnulacion =
    submission.status === 'error' &&
    submission.kind === 'cancellation' &&
    submission.targetKey === detail.id
      ? submission.errorMessage
      : null

  const enviandoTraslado =
    submission.status === 'sending' &&
    submission.kind === 'coordination-transfer' &&
    submission.targetKey === detail.id
  const errorTraslado =
    submission.status === 'error' &&
    submission.kind === 'coordination-transfer' &&
    submission.targetKey === detail.id
      ? submission.errorMessage
      : null

  const ocupado =
    enviandoResolucion ||
    enviandoAvance ||
    enviandoAnulacion ||
    enviandoTraslado
  const terminal = TERMINAL.has(detail.status)
  const yaCerrado = detail.status === 'CLOSED'
  const anulada = detail.status === 'CANCELLED'
  const puedeAvanzar =
    allowLifecycleActions &&
    !terminal &&
    detail.status === 'OPEN' &&
    detail.canAdvanceToInProgress === true
  const muestraSeguimiento = !terminal
  const sinTexto = learningDraft.trim().length === 0
  const muestraAdminHost =
    Boolean(administration?.allow) &&
    (adminAvailability.canCancel || adminAvailability.canTransfer)

  // Cierre automático de modales tras confirmación exitosa
  const wasSendingCancellation = useRef(false)
  const wasSendingTransfer = useRef(false)

  useEffect(() => {
    if (enviandoAnulacion) {
      wasSendingCancellation.current = true
    } else if (wasSendingCancellation.current) {
      wasSendingCancellation.current = false
      if (!errorAnulacion) {
        setActiveAdminModal(null)
      }
    }
  }, [enviandoAnulacion, errorAnulacion])

  useEffect(() => {
    if (enviandoTraslado) {
      wasSendingTransfer.current = true
    } else if (wasSendingTransfer.current) {
      wasSendingTransfer.current = false
      if (!errorTraslado) {
        setActiveAdminModal(null)
      }
    }
  }, [enviandoTraslado, errorTraslado])

  useEffect(() => {
    if (terminal) {
      setActiveAdminModal(null)
    }
  }, [terminal, detail.id])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (ocupado || sinTexto) return
    onResolve()
  }

  return (
    <section
      className="problem-actions"
      data-testid="problem-actions"
      data-tour="problem-actions"
      data-surface="problem-actions"
      data-busy={ocupado ? 'true' : 'false'}
      data-can-advance={puedeAvanzar ? 'true' : 'false'}
      data-can-resolve={detail.canResolve ? 'true' : 'false'}
      data-can-update={detail.canUpdate ? 'true' : 'false'}
      data-can-cancel={adminAvailability.canCancel ? 'true' : 'false'}
      data-can-transfer={adminAvailability.canTransfer ? 'true' : 'false'}
      data-allow-lifecycle={allowLifecycleActions ? 'true' : 'false'}
      data-allow-administration={administration?.allow ? 'true' : 'false'}
      data-resolved={yaCerrado ? 'true' : undefined}
      data-cancelled={anulada ? 'true' : undefined}
      data-report-kind={detail.reportKind ?? 'INTERNAL'}
      data-status={detail.status}
      data-coordination-id={detail.coordinationId ?? undefined}
      data-affected-coordination-id={detail.affectedCoordinationId ?? undefined}
      aria-label="Acciones sobre el problema"
    >
      {yaCerrado && (
        <ProblemResolutionRecord
          resolution={detail.resolution}
          reportKind={detail.reportKind}
        />
      )}

      {anulada && (
        <div
          className="problem-actions__cancellation"
          data-testid="cancellation-record-block"
          data-surface="problem-cancellation"
        >
          <div className="problem-actions__cancellation-header">
            <span
              className="problem-actions__cancellation-pill"
              data-testid="cancellation-badge"
            >
              Situación anulada
            </span>
            <span className="problem-actions__cancellation-meta">
              Acción administrativa excepcional
            </span>
          </div>

          {detail.cancellation && (
            <p
              className="problem-actions__note problem-actions__cancellation-byline"
              data-testid="cancellation-record"
              data-surface="problem-cancellation"
            >
              Anulado por {detail.cancellation.cancelledByUserName}:{' '}
              {detail.cancellation.reason}
            </p>
          )}

          <p className="problem-actions__cancellation-hint">
            Esta situación fue anulada administrativamente. No admite nuevas
            acciones operativas ni registro de aprendizajes.
          </p>
        </div>
      )}

      {muestraSeguimiento && (
        <div
          className="problem-actions__block problem-actions__block--tracking"
          data-surface="problem-tracking"
        >
          <div className="problem-actions__block-head">
            <h3 className="problem-actions__block-title">
              Seguimiento del problema
            </h3>
            <span
              className="problem-actions__status"
              data-status={detail.status}
              data-testid="actions-status"
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
                  Actualizando el estado del caso…
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
                data-surface="status-advance"
                aria-label="Pasar a En atención"
                disabled={ocupado}
                onClick={(e) => {
                  e.stopPropagation()
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

      {!terminal && allowLifecycleActions && detail.canResolve && (
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

      {!terminal && allowLifecycleActions && !detail.canResolve && (
        <p
          className="problem-actions__note problem-actions__note--readonly"
          data-testid="resolve-not-allowed"
        >
          El cierre corresponde al coordinador de la coordinación responsable.
          Un analista solo puede cerrar cuando Coordinación General es la
          responsable del problema.
        </p>
      )}

      {muestraAdminHost && administration && (
        <div
          className="problem-actions__block problem-actions__block--administration"
          data-testid="situation-admin-actions"
          data-surface="situation-admin"
          data-busy={ocupado ? 'true' : 'false'}
          data-can-cancel={adminAvailability.canCancel ? 'true' : 'false'}
          data-can-transfer={adminAvailability.canTransfer ? 'true' : 'false'}
          data-coordination-id={detail.coordinationId ?? undefined}
          data-affected-coordination-id={
            detail.affectedCoordinationId ?? undefined
          }
          aria-label="Acciones administrativas"
        >
          <div className="problem-actions__block-head">
            <h3 className="problem-actions__block-title problem-actions__block-title--admin">
              Gestión administrativa
            </h3>
          </div>
          <p className="problem-actions__block-hint">
            Acciones operativas excepcionales para administradores sobre la
            asignación y vigencia del caso.
          </p>

          <div
            className="problem-actions__admin-group"
            role="group"
            aria-label="Acciones de gestión administrativa"
          >
            {adminAvailability.canCancel && (
              <button
                type="button"
                className="problem-actions__admin-btn problem-actions__admin-btn--cancel"
                data-testid="cancel-situation-button"
                disabled={ocupado}
                onClick={() => setActiveAdminModal('cancel')}
              >
                Anular situación
              </button>
            )}

            {adminAvailability.canTransfer && (
              <button
                type="button"
                className="problem-actions__admin-btn problem-actions__admin-btn--transfer"
                data-testid="transfer-coordination-button"
                disabled={ocupado}
                onClick={() => setActiveAdminModal('transfer')}
              >
                Trasladar coordinación
              </button>
            )}
          </div>

          {enviandoAnulacion && (
            <p
              className="problem-actions__note"
              data-testid="cancellation-sending"
              role="status"
            >
              Anulando la situación…
            </p>
          )}
          {errorAnulacion && (
            <div className="problem-actions__error-box">
              <p
                className="problem-actions__note problem-actions__note--error"
                data-testid="cancellation-error"
                role="alert"
              >
                {errorAnulacion}
              </p>
              {onRetryDetail && (
                <button
                  type="button"
                  className="problem-actions__retry-btn"
                  onClick={onRetryDetail}
                >
                  Refrescar situación
                </button>
              )}
            </div>
          )}
          {enviandoTraslado && (
            <p
              className="problem-actions__note"
              data-testid="coordination-transfer-sending"
              role="status"
            >
              Trasladando la coordinación…
            </p>
          )}
          {errorTraslado && (
            <div className="problem-actions__error-box">
              <p
                className="problem-actions__note problem-actions__note--error"
                data-testid="coordination-transfer-error"
                role="alert"
              >
                {errorTraslado}
              </p>
              {onRetryDetail && (
                <button
                  type="button"
                  className="problem-actions__retry-btn"
                  onClick={onRetryDetail}
                >
                  Refrescar situación
                </button>
              )}
            </div>
          )}

          <CancelSituationModal
            isOpen={activeAdminModal === 'cancel'}
            situationTitle={detail.title}
            isSubmitting={enviandoAnulacion}
            error={errorAnulacion}
            onClose={() => setActiveAdminModal(null)}
            onConfirm={(reason) => administration.onCancel(reason)}
            onRetryDetail={onRetryDetail}
          />

          <TransferCoordinationModal
            isOpen={activeAdminModal === 'transfer'}
            situationTitle={detail.title}
            currentCoordinationName={detail.coordinationName ?? ''}
            currentCoordinationId={detail.coordinationId}
            currentCoordinationCode={detail.coordinationCode}
            affectedCoordinationId={detail.affectedCoordinationId}
            affectedCoordinationCode={detail.affectedCoordinationCode}
            reportKind={detail.reportKind}
            currentStatus={detail.status}
            coordinationOptions={administration.coordinationOptions ?? []}
            isSubmitting={enviandoTraslado}
            error={errorTraslado}
            onClose={() => setActiveAdminModal(null)}
            onConfirm={(destinationId, reason) =>
              administration.onTransfer({
                toCoordinationId: destinationId,
                reason,
              })
            }
            onRetryDetail={onRetryDetail}
          />
        </div>
      )}
    </section>
  )
}
