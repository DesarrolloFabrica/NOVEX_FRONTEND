import { useState } from 'react'
import { SituationLifecycleTimeline } from '@/modules/monitoring/components/SituationLifecycleTimeline'
import { UpdateSituationStatusModal } from '@/modules/monitoring/components/UpdateSituationStatusModal'
import {
  getNextOperationalStatus,
  type UpdateSituationStatusInput,
} from '@/modules/monitoring/utils/situation-lifecycle'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import { getErrorMessage } from '@/shared/utils/error'

interface ImpactSituationCommandProps {
  situation: SituationResponse
  canUpdate: boolean
  isUpdating: boolean
  isExportingPdf?: boolean
  onUpdateStatus: (input: UpdateSituationStatusInput) => Promise<void>
  onOpenAnalysis: () => void
  onDownloadPdf: () => void
}

export function ImpactSituationCommand({
  situation,
  canUpdate,
  isUpdating,
  isExportingPdf = false,
  onUpdateStatus,
  onOpenAnalysis,
  onDownloadPdf,
}: ImpactSituationCommandProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const canAdvance = Boolean(
    canUpdate && getNextOperationalStatus(situation.status),
  )

  const handleSubmit = async (input: UpdateSituationStatusInput) => {
    setUpdateError(null)
    try {
      await onUpdateStatus(input)
      setModalOpen(false)
      setMessage('Estado actualizado correctamente.')
    } catch (error) {
      setUpdateError(getErrorMessage(error))
    }
  }

  return (
    <section
      className="impact-situation-command"
      aria-label="Comando operacional"
    >
      <header className="impact-situation-command__header">
        <span>Comando operacional</span>
        <h3>Estado y análisis</h3>
      </header>

      <div className="impact-situation-command__timeline">
        <SituationLifecycleTimeline status={situation.status} />
      </div>

      <div className="impact-situation-command__actions">
        {canAdvance ? (
          <button
            type="button"
            className="impact-situation-command__primary"
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
          <p className="impact-situation-command__locked">
            {situation.status === 'CLOSED'
              ? 'Caso cerrado'
              : 'Sin permisos de actualización'}
          </p>
        )}

        <button
          type="button"
          className="impact-situation-command__secondary"
          onClick={onOpenAnalysis}
        >
          Ver análisis IA
        </button>

        <button
          type="button"
          className="impact-situation-command__secondary"
          onClick={onDownloadPdf}
          disabled={isExportingPdf}
          aria-busy={isExportingPdf}
        >
          {isExportingPdf ? 'Generando PDF…' : 'Descargar PDF'}
        </button>
      </div>

      {message ? (
        <span className="impact-situation-command__status" role="status">
          {message}
        </span>
      ) : null}

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
