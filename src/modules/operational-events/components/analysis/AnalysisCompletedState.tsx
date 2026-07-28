import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { SituationAIAnalysisResponse } from '@/modules/api/types/analysis.types'
import { RISK_LEVEL_LABEL } from '@/modules/operational-events/components/eventPresentation'
import type {
  AIInterpretation,
  OperationalEvent,
} from '@/modules/operational-events/types/operational-event.types'
import { CunmarkIcon } from '@/shared/components/CunmarkIcon'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'

interface AnalysisCompletedStateProps {
  situationTitle: string
  situationId: string
  interpretation: AIInterpretation
  analysisResponse: SituationAIAnalysisResponse
  elapsedMs: number
  operationalEvent: OperationalEvent
  onViewExecutiveReport: () => void
}

function formatElapsed(ms: number): string {
  const seconds = Math.max(1, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds} segundos`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder > 0 ? `${minutes} min ${remainder} s` : `${minutes} min`
}

export function AnalysisCompletedState({
  situationTitle,
  situationId,
  interpretation,
  analysisResponse,
  elapsedMs,
  operationalEvent,
  onViewExecutiveReport,
}: AnalysisCompletedStateProps) {
  const [exportState, setExportState] = useState<'idle' | 'generating' | 'error'>(
    'idle',
  )

  const confidencePct =
    interpretation.confidence !== undefined
      ? `${Math.round(interpretation.confidence * 100)}%`
      : '—'

  const recommendationsCount =
    analysisResponse.analysis.recommendations.length ||
    interpretation.executiveReport?.recommendedActions.length ||
    0

  const coordinationsCount =
    analysisResponse.analysis.impactAssessment.affectedCoordinations.length ||
    interpretation.affectedAreaNames.length

  async function handleDownloadPdf() {
    if (exportState === 'generating') return
    setExportState('generating')
    try {
      const { exportSituationReportPdf } = await import(
        '@/modules/operational-events/utils/exportSituationReportPdf'
      )
      await exportSituationReportPdf(operationalEvent)
      setExportState('idle')
    } catch {
      setExportState('error')
    }
  }

  return (
    <section
      className="cunmark-intel-complete"
      aria-labelledby="analysis-complete-title"
    >
      <header className="cunmark-intel-complete__hero">
        <div className="cunmark-intel-complete__icon" aria-hidden="true">
          <CunmarkIcon name="check" size={30} />
        </div>
        <div>
          <h2 id="analysis-complete-title">Análisis Ejecutivo completado</h2>
          <p>
            El expediente ya fue enriquecido con la interpretación de
            Inteligencia Operacional.
          </p>
        </div>
      </header>

      <article className="cunmark-intel-complete__summary">
        <dl className="cunmark-intel-complete__metrics">
          <div>
            <dt>Situación</dt>
            <dd>{situationTitle}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>Analizado</dd>
          </div>
          <div>
            <dt>Nivel de riesgo</dt>
            <dd>
              {RISK_LEVEL_LABEL[interpretation.riskLevel]} ·{' '}
              {interpretation.riskScore}
            </dd>
          </div>
          <div>
            <dt>Confianza IA</dt>
            <dd>{confidencePct}</dd>
          </div>
          <div>
            <dt>Recomendaciones</dt>
            <dd>{recommendationsCount}</dd>
          </div>
          <div>
            <dt>Coordinaciones involucradas</dt>
            <dd>{coordinationsCount}</dd>
          </div>
          <div>
            <dt>Versión del análisis</dt>
            <dd>v{analysisResponse.analysisVersion}</dd>
          </div>
          <div>
            <dt>Tiempo empleado</dt>
            <dd>{formatElapsed(elapsedMs)}</dd>
          </div>
        </dl>
      </article>

      <div className="cunmark-intel-complete__actions">
        <button
          type="button"
          className={`cunmark-intel-complete__primary ${FOCUS_VISIBLE}`}
          onClick={onViewExecutiveReport}
        >
          <span>Ver informe ejecutivo</span>
          <CunmarkIcon name="chevron-right" size={18} />
        </button>

        <button
          type="button"
          className={`cunmark-intel-complete__secondary ${FOCUS_VISIBLE}`}
          onClick={() => void handleDownloadPdf()}
          disabled={exportState === 'generating'}
          aria-busy={exportState === 'generating'}
        >
          <CunmarkIcon name="download" size={16} />
          <span>
            {exportState === 'generating'
              ? 'Generando PDF…'
              : exportState === 'error'
                ? 'Reintentar descarga'
                : 'Descargar reporte PDF'}
          </span>
        </button>

        <Link
          to={`/situaciones?situation=${situationId}`}
          viewTransition
          className={`cunmark-intel-complete__tertiary ${FOCUS_VISIBLE}`}
        >
          Volver al historial
        </Link>
      </div>
    </section>
  )
}
