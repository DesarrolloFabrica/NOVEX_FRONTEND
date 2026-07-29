import type { AiIndicators } from '@/modules/api/types/dashboard.types'
import { DashboardNoDataState } from '@/modules/operational-events/components/dashboard/DashboardStateViews'

interface AiIndicatorsPanelProps {
  indicators: AiIndicators
}

function formatConfidence(value: number | null): string {
  if (value === null) return '—'
  return `${Math.round(value * 100)}%`
}

function formatTimestamp(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function AiIndicatorsPanel({ indicators }: AiIndicatorsPanelProps) {
  const hasData = indicators.totalAnalyses > 0

  return (
    <section
      className="novex-intel-change novex-ai-indicators"
      aria-labelledby="ai-indicators-heading"
    >
      <h3 id="ai-indicators-heading" className="novex-section-eyebrow mb-0">
        Indicadores IA
      </h3>
      <p className="novex-section-hint mb-2">
        Desempeño del motor de análisis ejecutivo.
      </p>

      {!hasData ? (
        <DashboardNoDataState label="Aún no hay análisis IA registrados." />
      ) : (
        <ul className="novex-intel-change__facts">
          <li>
            <span>Análisis realizados</span>
            <strong>{indicators.totalAnalyses}</strong>
          </li>
          <li>
            <span>Confianza promedio</span>
            <strong>{formatConfidence(indicators.averageConfidence)}</strong>
          </li>
          <li>
            <span>Tiempo promedio</span>
            <strong>
              {indicators.averageExecutionMinutes !== null
                ? `${indicators.averageExecutionMinutes} min`
                : '—'}
            </strong>
          </li>
          <li>
            <span>Último análisis</span>
            <strong>{formatTimestamp(indicators.lastAnalysisAt)}</strong>
          </li>
          <li>
            <span>Reanálisis</span>
            <strong>{indicators.reanalysisCount}</strong>
          </li>
        </ul>
      )}
    </section>
  )
}
