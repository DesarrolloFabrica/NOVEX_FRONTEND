import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnalysisCompletedState } from '@/modules/operational-events/components/analysis/AnalysisCompletedState'
import { AnalysisCompletingTransition } from '@/modules/operational-events/components/analysis/AnalysisCompletingTransition'
import { AnalysisEmptyState } from '@/modules/operational-events/components/analysis/AnalysisEmptyState'
import { AnalysisErrorState } from '@/modules/operational-events/components/analysis/AnalysisErrorState'
import { AnalysisIntelligenceCenter } from '@/modules/operational-events/components/analysis/AnalysisIntelligenceCenter'
import type { SituationAIAnalysisResponse } from '@/modules/api/types/analysis.types'
import type { AIInterpretation } from '@/modules/operational-events/types/operational-event.types'
import {
  mapAnalysisToInterpretation,
  mapSituationToOperationalEvent,
} from '@/modules/services/mappers/analysisPresentation.mapper'
import {
  loadAnalysis,
  runAnalysisFlow,
} from '@/modules/services/situationAnalysis.service'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import { getErrorMessage } from '@/shared/utils/error'
import { isValidUuid } from '@/shared/utils/uuid'

export type SituationAnalysisStatus =
  | 'idle'
  | 'analyzing'
  | 'loading'
  | 'completing'
  | 'ready'
  | 'error'

interface SituationAnalysisPanelProps {
  situationId: string
  situationTitle: string
  situation?: SituationResponse | null
  autoStart?: boolean
  onAnalysisReady?: (interpretation: AIInterpretation) => void
  onViewExecutiveReport: () => void
}

export function SituationAnalysisPanel({
  situationId,
  situationTitle,
  situation = null,
  autoStart = true,
  onAnalysisReady,
  onViewExecutiveReport,
}: SituationAnalysisPanelProps) {
  const hasValidSituationId = isValidUuid(situationId)
  const analysisStartedAt = useRef(Date.now())
  const [status, setStatus] = useState<SituationAnalysisStatus>(
    autoStart && hasValidSituationId ? 'loading' : 'idle',
  )
  const [interpretation, setInterpretation] = useState<AIInterpretation | null>(
    null,
  )
  const [analysisResponse, setAnalysisResponse] =
    useState<SituationAIAnalysisResponse | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  const applyAnalysis = useCallback(
    (response: SituationAIAnalysisResponse) => {
      const mapped = mapAnalysisToInterpretation(response, situationId)
      setInterpretation(mapped)
      setAnalysisResponse(response)
      setElapsedMs(Date.now() - analysisStartedAt.current)
      setStatus('completing')
      onAnalysisReady?.(mapped)
    },
    [onAnalysisReady, situationId],
  )

  const runFlow = useCallback(async () => {
    if (!hasValidSituationId) {
      setStatus('error')
      setError('No hay un expediente válido para analizar.')
      return
    }

    setError(null)
    analysisStartedAt.current = Date.now()
    setStatus('analyzing')

    const existing = await loadAnalysis(situationId)
    if (existing) {
      applyAnalysis(existing)
      return
    }

    const analysis = await runAnalysisFlow(situationId)
    applyAnalysis(analysis)
  }, [applyAnalysis, hasValidSituationId, situationId])

  useEffect(() => {
    if (!autoStart || !hasValidSituationId) {
      if (!hasValidSituationId) {
        setStatus('error')
        setError('No hay un expediente válido para analizar.')
      }
      return
    }

    let cancelled = false

    async function bootstrap() {
      analysisStartedAt.current = Date.now()
      setStatus('loading')
      setError(null)

      try {
        const existing = await loadAnalysis(situationId)
        if (cancelled) return

        if (existing) {
          applyAnalysis(existing)
          return
        }

        setStatus('analyzing')
        const analysis = await runAnalysisFlow(situationId)
        if (cancelled) return
        applyAnalysis(analysis)
      } catch (bootstrapError) {
        if (!cancelled) {
          setStatus('error')
          setError(getErrorMessage(bootstrapError))
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [applyAnalysis, autoStart, hasValidSituationId, situationId])

  const handleRetry = useCallback(async () => {
    setRetrying(true)
    setError(null)

    try {
      await runFlow()
    } catch (retryError) {
      setStatus('error')
      setError(getErrorMessage(retryError))
    } finally {
      setRetrying(false)
    }
  }, [runFlow])

  const operationalEvent = useMemo(() => {
    if (!interpretation || !situation) return null
    return mapSituationToOperationalEvent(situation, interpretation)
  }, [interpretation, situation])

  const content = useMemo(() => {
    if (status === 'idle' || status === 'loading' || status === 'analyzing') {
      return (
        <AnalysisIntelligenceCenter startedAt={analysisStartedAt.current} />
      )
    }

    if (status === 'completing') {
      return (
        <AnalysisCompletingTransition
          onComplete={() => setStatus('ready')}
          durationMs={800}
        />
      )
    }

    if (status === 'error') {
      return (
        <AnalysisErrorState
          message={error ?? 'Ocurrió un error inesperado.'}
          onRetry={hasValidSituationId ? handleRetry : undefined}
          retrying={retrying}
        />
      )
    }

    if (!interpretation || !analysisResponse || !operationalEvent) {
      return <AnalysisEmptyState />
    }

    return (
      <AnalysisCompletedState
        situationTitle={situationTitle}
        situationId={situationId}
        interpretation={interpretation}
        analysisResponse={analysisResponse}
        elapsedMs={elapsedMs}
        operationalEvent={operationalEvent}
        onViewExecutiveReport={onViewExecutiveReport}
      />
    )
  }, [
    analysisResponse,
    elapsedMs,
    error,
    handleRetry,
    hasValidSituationId,
    interpretation,
    onViewExecutiveReport,
    operationalEvent,
    retrying,
    situationId,
    situationTitle,
    status,
  ])

  return content
}
