import { useCallback, useEffect, useState } from 'react'
import { fetchSituation } from '@/modules/api/situations.api'
import { SituationDetailModal } from '@/modules/operational-events/components/SituationDetailModal'
import { AnalysisErrorState } from '@/modules/operational-events/components/analysis/AnalysisErrorState'
import { AnalysisLoadingState } from '@/modules/operational-events/components/analysis/AnalysisLoadingState'
import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import {
  mapAnalysisToInterpretation,
  mapSituationToOperationalEvent,
} from '@/modules/services/mappers/analysisPresentation.mapper'
import { loadAnalysis } from '@/modules/services/situationAnalysis.service'
import { getErrorMessage } from '@/shared/utils/error'
import { isValidUuid } from '@/shared/utils/uuid'

interface ConnectedSituationDetailModalProps {
  situationId: string
  onClose: () => void
}

export function ConnectedSituationDetailModal({
  situationId,
  onClose,
}: ConnectedSituationDetailModalProps) {
  const [event, setEvent] = useState<OperationalEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!isValidUuid(situationId)) {
      setEvent(null)
      setError('El identificador del expediente no es válido.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const situation = await fetchSituation(situationId)
      const analysis = await loadAnalysis(situationId)
      const interpretation = analysis
        ? mapAnalysisToInterpretation(analysis, situationId)
        : null

      if (!interpretation) {
        setEvent(null)
        setError(
          'El expediente existe, pero aún no tiene un análisis ejecutivo disponible.',
        )
        return
      }

      setEvent(mapSituationToOperationalEvent(situation, interpretation))
    } catch (loadError) {
      setEvent(null)
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [situationId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="novex-situation-modal" role="presentation">
        <button
          type="button"
          className="novex-situation-modal__backdrop"
          aria-label="Cerrar"
          onClick={onClose}
        />
        <div
          className="novex-situation-modal__dialog novex-situation-modal__dialog--state"
          role="dialog"
          aria-modal="true"
          aria-label="Cargando análisis"
        >
          <AnalysisLoadingState />
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="novex-situation-modal" role="presentation">
        <button
          type="button"
          className="novex-situation-modal__backdrop"
          aria-label="Cerrar"
          onClick={onClose}
        />
        <div
          className="novex-situation-modal__dialog novex-situation-modal__dialog--state"
          role="dialog"
          aria-modal="true"
          aria-label="Error de análisis"
        >
          <AnalysisErrorState
            message={error ?? 'Análisis no disponible.'}
            onRetry={() => {
              void loadData()
            }}
          />
        </div>
      </div>
    )
  }

  return <SituationDetailModal event={event} onClose={onClose} />
}
