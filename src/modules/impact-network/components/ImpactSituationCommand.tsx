import { useState } from 'react'
import { SituationLifecycleTimeline } from '@/modules/monitoring/components/SituationLifecycleTimeline'
import { UpdateSituationStatusModal } from '@/modules/monitoring/components/UpdateSituationStatusModal'
import { ResolveSituationModal } from '@/modules/monitoring/components/ResolveSituationModal'
import type { UpdateSituationStatusInput } from '@/modules/monitoring/utils/situation-lifecycle'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import { getErrorMessage } from '@/shared/utils/error'

interface ImpactSituationCommandProps {
  situation: SituationResponse
  canUpdate: boolean
  isUpdating: boolean
  isResolving?: boolean
  isExportingPdf?: boolean
  exportError?: string | null
  executiveMode?: boolean
  onUpdateStatus: (input: UpdateSituationStatusInput) => Promise<void>
  onResolve: (learning: string) => Promise<void>
  onOpenAnalysis: () => void
  onDownloadPdf: () => void
}

export function ImpactSituationCommand({
  situation,
  canUpdate,
  isUpdating,
  isResolving = false,
  isExportingPdf = false,
  exportError = null,
  executiveMode = false,
  onUpdateStatus,
  onResolve,
  onOpenAnalysis,
  onDownloadPdf,
}: ImpactSituationCommandProps) {
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
  const canResolveProblem =
    situation.canResolve === true && !closed

  const busy = isUpdating || isResolving

  const handleAdvance = async (input: UpdateSituationStatusInput) => {
    if (input.status === 'CLOSED') {
      setUpdateError(
        'El cierre requiere registrar el aprendizaje con «Resolver problema».',
      )
      return
    }
    setUpdateError(null)
    try {
      await onUpdateStatus(input)
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
    <section
      className={[
        'impact-situation-command',
        executiveMode ? 'impact-situation-command--executive' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Comando operacional"
      data-can-resolve={canResolveProblem ? 'true' : 'false'}
      data-can-advance={canAdvanceToAttention ? 'true' : 'false'}
      data-can-update={canUpdate ? 'true' : 'false'}
    >
      <header className="impact-situation-command__header">
        <span>{executiveMode ? 'Seguimiento' : 'Comando operacional'}</span>
        <h3>{executiveMode ? 'Estado del caso' : 'Estado y análisis'}</h3>
      </header>

      <div className="impact-situation-command__actions">
        {canAdvanceToAttention ? (
          <button
            type="button"
            className="impact-situation-command__primary"
            data-testid="impact-advance-status"
            disabled={busy}
            onClick={() => {
              setUpdateError(null)
              setMessage('')
              setAdvanceOpen(true)
            }}
          >
            Pasar a En atención
          </button>
        ) : null}

        {canResolveProblem ? (
          <button
            type="button"
            className="impact-situation-command__primary"
            data-testid="impact-resolve-problem"
            disabled={busy}
            onClick={() => {
              setResolveError(null)
              setMessage('')
              setResolveOpen(true)
            }}
          >
            Resolver problema
          </button>
        ) : null}

        {!canAdvanceToAttention && !canResolveProblem ? (
          <p className="impact-situation-command__locked">
            {closed
              ? 'Caso cerrado'
              : executiveMode
                ? 'El seguimiento lo gestiona quien tiene permiso sobre el caso.'
                : 'Vista informativa: el seguimiento y el cierre requieren permisos del área responsable.'}
          </p>
        ) : null}

        {executiveMode ? null : (
          <button
            type="button"
            className="impact-situation-command__secondary"
            onClick={onOpenAnalysis}
          >
            Ver análisis IA
          </button>
        )}

        <button
          type="button"
          className="impact-situation-command__secondary"
          onClick={onDownloadPdf}
          disabled={isExportingPdf}
          aria-busy={isExportingPdf}
        >
          {isExportingPdf
            ? 'Generando PDF…'
            : exportError
              ? 'Reintentar PDF'
              : 'Descargar PDF'}
        </button>
      </div>

      <div className="impact-situation-command__timeline">
        <SituationLifecycleTimeline status={situation.status} />
      </div>

      {exportError ? (
        <span className="impact-situation-command__status" role="alert">
          {exportError}
        </span>
      ) : null}

      {message ? (
        <span className="impact-situation-command__status" role="status">
          {message}
        </span>
      ) : null}

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
    </section>
  )
}
