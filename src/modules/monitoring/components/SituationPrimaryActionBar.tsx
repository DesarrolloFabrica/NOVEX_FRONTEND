import { useState } from 'react'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import { UpdateSituationStatusModal } from '@/modules/monitoring/components/UpdateSituationStatusModal'
import {
  getNextOperationalStatus,
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
  onUpdate: (input: UpdateSituationStatusInput) => Promise<void>
}

export function SituationPrimaryActionBar({
  situation,
  canUpdate,
  isUpdating,
  onUpdate,
}: SituationPrimaryActionBarProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const nextStatus = getNextOperationalStatus(situation.status)
  const canAdvance = Boolean(canUpdate && nextStatus)
  const currentLabel =
    OPERATIONAL_STATUS_LABEL[asOperationalStatus(situation.status)] ??
    situation.status
  const nextLabel = nextStatus
    ? OPERATIONAL_STATUS_LABEL[nextStatus]
    : null

  const handleSubmit = async (input: UpdateSituationStatusInput) => {
    setUpdateError(null)
    try {
      await onUpdate(input)
      setModalOpen(false)
      setMessage('Estado actualizado correctamente.')
    } catch (error) {
      setUpdateError(getErrorMessage(error))
    }
  }

  return (
    <>
      <div className="novex-gestion-actionbar" data-tour="status-management">
        <div className="novex-gestion-actionbar__context">
          <p>Acción principal</p>
          <strong>
            Estado actual: <span>{currentLabel}</span>
          </strong>
          {canAdvance && nextLabel ? (
            <small>Siguiente paso disponible: {nextLabel}</small>
          ) : (
            <small>
              {situation.status === 'CLOSED'
                ? 'Esta situación ya está cerrada.'
                : 'Solo lectura: el seguimiento lo gestiona quien registró la situación.'}
            </small>
          )}
        </div>

        <div className="novex-gestion-actionbar__actions">
          {message ? (
            <span className="novex-gestion-actionbar__toast" role="status">
              {message}
            </span>
          ) : null}
          {canAdvance ? (
            <button
              data-tour="status-update-trigger"
              type="button"
              className="novex-gestion-actionbar__cta"
              disabled={isUpdating}
              onClick={() => {
                setUpdateError(null)
                setMessage('')
                setModalOpen(true)
              }}
            >
              Actualizar estado
              <NovexIcon name="chevron-right" size={15} />
            </button>
          ) : (
            <span className="novex-gestion-actionbar__locked">Sin acción</span>
          )}
        </div>
      </div>

      {modalOpen ? (
        <UpdateSituationStatusModal
          currentStatus={situation.status}
          isSubmitting={isUpdating}
          error={updateError}
          onClose={() => {
            if (!isUpdating) setModalOpen(false)
          }}
          onSubmit={handleSubmit}
        />
      ) : null}
    </>
  )
}
