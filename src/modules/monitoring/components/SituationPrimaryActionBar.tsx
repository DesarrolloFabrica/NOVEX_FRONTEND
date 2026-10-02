import { useState } from 'react'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import { UpdateSituationStatusModal } from '@/modules/monitoring/components/UpdateSituationStatusModal'
import { ResolveSituationModal } from '@/modules/monitoring/components/ResolveSituationModal'
import {
  OPERATIONAL_STATUS_LABEL,
  asOperationalStatus,
  type UpdateSituationStatusInput,
} from '@/modules/monitoring/utils/situation-lifecycle'
import { getErrorMessage } from '@/shared/utils/error'
import { NovexIcon } from '@/shared/components/NovexIcon'

interface SituationPrimaryActionBarProps {
  situation: SituationResponse
  canUpdate: boolean
  isUpdating: boolean
  isResolving?: boolean
  onUpdate: (input: UpdateSituationStatusInput) => Promise<void>
  onResolve: (learning: string) => Promise<void>
}

export function SituationPrimaryActionBar({
  situation,
  canUpdate,
  isUpdating,
  isResolving = false,
  onUpdate,
  onResolve,
}: SituationPrimaryActionBarProps) {
  const [advanceOpen, setAdvanceOpen] = useState(false)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const closed = situation.status === 'CLOSED'
  const canAdvanceToAttention =
    situation.canAdvanceToInProgress === true &&
    situation.status === 'OPEN' &&
    !closed
  const canResolveProblem = situation.canResolve === true && !closed
  const busy = isUpdating || isResolving

  const currentLabel =
    OPERATIONAL_STATUS_LABEL[asOperationalStatus(situation.status)] ??
    situation.status

  const handleAdvance = async (input: UpdateSituationStatusInput) => {
    if (input.status === 'CLOSED') {
      setUpdateError(
        'El cierre requiere registrar el aprendizaje con «Resolver problema».',
      )
      return
    }
    setUpdateError(null)
    try {
      await onUpdate(input)
      setAdvanceOpen(false)
      setMessage('Estado actualizado correctamente.')
    } catch (error) {
      setUpdateError(getErrorMessage(error))
    }
  }

  const handleResolve = async (learning: string) => {
    setResolveError(null)
    try {
      await onResolve(learning)
      setResolveOpen(false)
      setMessage('Problema cerrado con aprendizaje.')
    } catch (error) {
      setResolveError(getErrorMessage(error))
    }
  }

  return (
    <>
      <div className="novex-gestion-actionbar" data-surface="status-management">
        <div className="novex-gestion-actionbar__context">
          <p>Acción principal</p>
          <strong>
            Estado actual: <span>{currentLabel}</span>
          </strong>
          {canAdvanceToAttention || canResolveProblem ? (
            <small>
              {canAdvanceToAttention && canResolveProblem
                ? 'Puede pasar a En atención o cerrar con aprendizaje.'
                : canAdvanceToAttention
                  ? 'Siguiente paso disponible: En atención.'
                  : 'Puede cerrar el problema registrando el aprendizaje.'}
            </small>
          ) : (
            <small>
              {closed
                ? 'Esta situación ya está cerrada.'
                : 'Solo lectura: el seguimiento o el cierre requieren permisos del área responsable.'}
            </small>
          )}
        </div>

        <div className="novex-gestion-actionbar__actions">
          {message ? (
            <span className="novex-gestion-actionbar__toast" role="status">
              {message}
            </span>
          ) : null}
          {canAdvanceToAttention ? (
            <button
              data-surface="status-update-trigger"
              data-testid="gestion-advance-status"
              type="button"
              className="novex-gestion-actionbar__cta"
              disabled={busy}
              onClick={() => {
                setUpdateError(null)
                setMessage('')
                setAdvanceOpen(true)
              }}
            >
              Pasar a En atención
              <NovexIcon name="chevron-right" size={15} />
            </button>
          ) : null}
          {canResolveProblem ? (
            <button
              data-testid="gestion-resolve-problem"
              type="button"
              className="novex-gestion-actionbar__cta"
              disabled={busy}
              onClick={() => {
                setResolveError(null)
                setMessage('')
                setResolveOpen(true)
              }}
            >
              Resolver problema
              <NovexIcon name="chevron-right" size={15} />
            </button>
          ) : null}
          {!canAdvanceToAttention && !canResolveProblem ? (
            <span className="novex-gestion-actionbar__locked">Sin acción</span>
          ) : null}
        </div>
      </div>

      {advanceOpen ? (
        <UpdateSituationStatusModal
          currentStatus={situation.status}
          dueAt={situation.dueAt}
          severity={situation.severity}
          isSubmitting={isUpdating}
          error={updateError}
          onClose={() => {
            if (!isUpdating) setAdvanceOpen(false)
          }}
          onSubmit={handleAdvance}
        />
      ) : null}

      {resolveOpen ? (
        <ResolveSituationModal
          currentStatus={situation.status}
          reportKind={situation.reportKind}
          isSubmitting={isResolving}
          error={resolveError}
          onClose={() => {
            if (!isResolving) setResolveOpen(false)
          }}
          onSubmit={handleResolve}
        />
      ) : null}
    </>
  )
}
