import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { SituationAIAnalysisResponse } from '@/modules/api/types/analysis.types'
import { RISK_LEVEL_LABEL } from '@/modules/operational-events/components/eventPresentation'
import type {
  AIInterpretation,
  OperationalEvent,
} from '@/modules/operational-events/types/operational-event.types'
import { NovexIcon } from '@/shared/components/NovexIcon'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'

interface AnalysisCompletedStateProps {
  situationTitle: string
  situationId: string
  interpretation: AIInterpretation
  analysisResponse: SituationAIAnalysisResponse
  elapsedMs: number
  operationalEvent: OperationalEvent
  returnTo?: string | null
  onViewExecutiveReport: () => void
}

function formatElapsed(ms: number): string {
  const seconds = Math.max(1, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds} segundos`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder > 0 ? `${minutes} min ${remainder} s` : `${minutes} min`
}

function buildReturnHref(returnTo: string | null | undefined, situationId: string) {
  if (!returnTo) return `/situaciones?situation=${situationId}`
  try {
    const url = new URL(returnTo, window.location.origin)
    url.searchParams.set('situation', situationId)
    return `${url.pathname}${url.search}`
  } catch {
    return returnTo
  }
}

export function AnalysisCompletedState({
  situationTitle,
  situationId,
  interpretation,
  analysisResponse,
  elapsedMs,
  operationalEvent,
  returnTo = null,
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
      className="novex-intel-complete"
      aria-labelledby="analysis-complete-title"
    >
      <header className="novex-intel-complete__hero">
        <div className="novex-intel-complete__icon" aria-hidden="true">
          <NovexIcon name="check" size={30} />
        </div>
        <div>
          <h2 id="analysis-complete-title">Análisis Ejecutivo completado</h2>
          <p>
            El expediente ya fue enriquecido con la interpretación de
            Inteligencia Operacional.
          </p>
        </div>
      </header>

      <article className="novex-intel-complete__summary">
        <dl className="novex-intel-complete__metrics">
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

      <div className="novex-intel-complete__actions">
        <button
          data-tour="download-report"
          type="button"
          className={`novex-intel-complete__primary ${FOCUS_VISIBLE}`}
          onClick={onViewExecutiveReport}
        >
          <span>Ver informe ejecutivo</span>
          <NovexIcon name="chevron-right" size={18} />
        </button>

        <button
          type="button"
          className={`novex-intel-complete__secondary ${FOCUS_VISIBLE}`}
          onClick={() => void handleDownloadPdf()}
          disabled={exportState === 'generating'}
          aria-busy={exportState === 'generating'}
        >
          <NovexIcon name="download" size={16} />
          <span>
            {exportState === 'generating'
              ? 'Generando PDF…'
              : exportState === 'error'
                ? 'Reintentar descarga'
                : 'Descargar reporte PDF'}
          </span>
        </button>

        <Link
          to={buildReturnHref(returnTo, situationId)}
          viewTransition
          className={`novex-intel-complete__tertiary ${FOCUS_VISIBLE}`}
        >
          {returnTo?.includes('/red-impacto')
            ? 'Volver a Red de impacto'
            : 'Volver al historial'}
        </Link>
      </div>
    </section>
  )
}
