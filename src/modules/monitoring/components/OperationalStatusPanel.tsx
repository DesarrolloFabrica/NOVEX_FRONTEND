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
  updateError?: string | null
  onUpdate: (input: UpdateSituationStatusInput) => Promise<void>
}

export function OperationalStatusPanel({
  situation,
  canUpdate,
  isUpdating,
  updateError: externalUpdateError = null,
  onUpdate,
}: OperationalStatusPanelProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [localUpdateError, setLocalUpdateError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const updateError = localUpdateError ?? externalUpdateError
  const canAdvance = Boolean(
    canUpdate && getNextOperationalStatus(situation.status),
  )

  const handleSubmit = async (input: UpdateSituationStatusInput) => {
    setLocalUpdateError(null)
    try {
      await onUpdate(input)
      setModalOpen(false)
      setMessage('Estado actualizado correctamente.')
    } catch (error) {
      setLocalUpdateError(getErrorMessage(error))
    }
  }

  return (
    <section
      className="novex-ops-state novex-ops-dashboard-section"
      data-tour="status-management"
      data-can-update={canAdvance ? 'true' : 'false'}
    >
      <div className="novex-ops-section-heading">
        <h2>Estado operacional</h2>
        <p className="novex-ops-state__hint">
          Situación seleccionada. Revise el expediente y actualice el estado cuando
          avance la atención.
        </p>
      </div>
      <div className="novex-ops-state__body">
        <SituationLifecycleTimeline status={situation.status} />
        <div className="novex-ops-state__actions">
          {canAdvance ? (
            <button
              data-tour="status-update-trigger"
              type="button"
              className="novex-ops-state__cta novex-ops-state__cta--ready"
              disabled={isUpdating}
              onClick={() => {
                setLocalUpdateError(null)
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
                : 'Vista informativa: el seguimiento lo gestiona quien registró la situación.'}
            </p>
          )}
          {message ? <span role="status">{message}</span> : null}
          {updateError && !modalOpen ? (
            <span role="alert" className="novex-ops-state__error">
              {updateError}
            </span>
          ) : null}
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
