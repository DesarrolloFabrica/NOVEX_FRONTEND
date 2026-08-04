import { useState } from 'react'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import { SituationLifecycleTimeline } from '@/modules/monitoring/components/SituationLifecycleTimeline'
import { UpdateSituationStatusModal } from '@/modules/monitoring/components/UpdateSituationStatusModal'
import {
  getNextOperationalStatus,
  type UpdateSituationStatusInput,
} from '@/modules/monitoring/utils/situation-lifecycle'
import { getErrorMessage } from '@/shared/utils/error'

interface OperationalStatusPanelProps {
  situation: SituationResponse
  canUpdate: boolean
  isUpdating: boolean
  onUpdate: (input: UpdateSituationStatusInput) => Promise<void>
}

export function OperationalStatusPanel({
  situation,
  canUpdate,
  isUpdating,
  onUpdate,
}: OperationalStatusPanelProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const canAdvance = Boolean(
    canUpdate && getNextOperationalStatus(situation.status),
  )

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
    <section
      className="novex-ops-state novex-ops-dashboard-section"
      data-tour="status-management"
    >
      <div className="novex-ops-section-heading">
        <h2>Estado operacional</h2>
      </div>
      <div className="novex-ops-state__body">
        <SituationLifecycleTimeline status={situation.status} />
        <div className="novex-ops-state__actions">
          {canAdvance ? (
            <button
              data-tour="status-update-trigger"
              type="button"
              className="novex-ops-state__cta"
              disabled={isUpdating}
              onClick={() => {
                setUpdateError(null)
                setMessage('')
                setModalOpen(true)
              }}
            >
              Actualizar estado
            </button>
          ) : (
            <p className="novex-ops-state__locked">
              {situation.status === 'CLOSED'
                ? 'Caso cerrado'
                : 'Sin permisos de actualización'}
            </p>
          )}
          {message ? <span role="status">{message}</span> : null}
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
    </section>
  )
}
