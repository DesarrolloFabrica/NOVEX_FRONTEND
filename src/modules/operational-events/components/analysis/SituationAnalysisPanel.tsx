import { useCallback, useEffect, useRef, useState } from 'react'
import { AnalysisCompletingTransition } from '@/modules/operational-events/components/analysis/AnalysisCompletingTransition'
import { AnalysisErrorState } from '@/modules/operational-events/components/analysis/AnalysisErrorState'
import { AnalysisIntelligenceCenter } from '@/modules/operational-events/components/analysis/AnalysisIntelligenceCenter'
import {
  loadAnalysis,
  runAnalysisFlow,
} from '@/modules/services/situationAnalysis.service'
import { getErrorMessage } from '@/shared/utils/error'
import { isValidUuid } from '@/shared/utils/uuid'

export type SituationAnalysisStatus =
  | 'idle'
  | 'analyzing'
  | 'loading'
  | 'completing'
  | 'error'

interface SituationAnalysisPanelProps {
  situationId: string
  situationTitle: string
  autoStart?: boolean
  onAnalysisComplete: (situationId: string) => void
}

export function SituationAnalysisPanel({
  situationId,
  situationTitle: _situationTitle,
  autoStart = true,
  onAnalysisComplete,
}: SituationAnalysisPanelProps) {
  const hasValidSituationId = isValidUuid(situationId)
  const analysisStartedAt = useRef(Date.now())
  const [status, setStatus] = useState<SituationAnalysisStatus>(
    autoStart && hasValidSituationId ? 'loading' : 'idle',
  )
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  const completeAnalysis = useCallback(() => {
    setStatus('completing')
  }, [])

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
      completeAnalysis()
      return
    }

    await runAnalysisFlow(situationId)
    completeAnalysis()
  }, [completeAnalysis, hasValidSituationId, situationId])

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
          completeAnalysis()
          return
        }

        setStatus('analyzing')
        await runAnalysisFlow(situationId)
        if (cancelled) return
        completeAnalysis()
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
  }, [autoStart, completeAnalysis, hasValidSituationId, situationId])

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

  if (status === 'idle' || status === 'loading' || status === 'analyzing') {
    return (
      <AnalysisIntelligenceCenter startedAt={analysisStartedAt.current} />
    )
  }

  if (status === 'completing') {
    return (
      <AnalysisCompletingTransition
        onComplete={() => onAnalysisComplete(situationId)}
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

  return null
}
