import { DirectorHistorySeriesChart, isHistorySeriesEmpty } from '@/modules/operational-cards/experience/director/DirectorHistorySeriesChart'
import { useDirectorCoordinationHistory } from '@/modules/operational-cards/hooks/useDirectorCoordinationHistory'
import type {
  OperationalKpiHistoryGranularity,
  OperationalKpiHistoryMetric,
  OperationalKpiHistoryPoint,
} from '@/modules/operational-cards/types/operational-kpi.types'
import type { DirectorHistoryLoadStatus } from '@/modules/operational-cards/hooks/useDirectorCoordinationHistory'
import {
  formatCaseDelta,
  isIncompleteCurrentPeriod,
  summarizeSeries,
} from '@/modules/operational-cards/utils/kpi-period-compare'
import { buildDefaultHistoryRange } from '@/modules/operational-cards/utils/kpi-history-range'
import '@/styles/director-kpi-panel.css'

const METRICS: ReadonlyArray<{
  id: OperationalKpiHistoryMetric
  label: string
}> = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'created', label: 'Presentados' },
  { id: 'closed', label: 'Cerrados' },
]

const PERIODS: ReadonlyArray<{
  id: OperationalKpiHistoryGranularity
  label: string
}> = [
  { id: 'week', label: 'Sem' },
  { id: 'month', label: 'Mes' },
  { id: 'cycle', label: 'Ciclo' },
]

function metricTitle(metric: OperationalKpiHistoryMetric): string {
  if (metric === 'created') return 'Presentados'
  if (metric === 'closed') return 'Cerrados'
  return 'Backlog'
}

function deltaPhrase(lastDelta: number | null): string | null {
  if (lastDelta === null) return null
  if (lastDelta === 0) return 'sin cambio vs anterior'
  return `${formatCaseDelta(lastDelta)} vs periodo anterior`
}

function CompactSummary({
  metric,
  series,
  summary,
  lastDelta,
  incomplete,
}: {
  metric: OperationalKpiHistoryMetric
  series: readonly OperationalKpiHistoryPoint[]
  summary: { current: number; min: number; max: number; first: number }
  lastDelta: number | null
  incomplete: boolean
}) {
  const periodTotal = series.reduce((sum, point) => sum + point.value, 0)
  const delta = deltaPhrase(lastDelta)

  return (
    <section
      className="director-history__summary director-history__summary--showcard"
      data-testid="director-history-summary"
    >
      <p className="director-history__summary-metric">{metricTitle(metric)}</p>
      {metric === 'backlog' ? (
        <>
          <p
            className="director-history__summary-lead"
            data-testid="director-history-bucket-delta"
          >
            {summary.current} ahora
          </p>
          <p className="director-history__summary-aside">
            {summary.first} al inicio
            {delta ? ` · ${delta}` : ''}
          </p>
        </>
      ) : (
        <>
          <p
            className="director-history__summary-lead"
            data-testid="director-history-bucket-delta"
          >
            {periodTotal} en el periodo
          </p>
          {delta ? (
            <p className="director-history__summary-aside">{delta}</p>
          ) : null}
        </>
      )}
      {incomplete ? (
        <p className="director-reading__phase-note">
          * periodo actual aún en curso
        </p>
      ) : null}
    </section>
  )
}

export function DirectorCoordinationHistoryView({
  metric,
  granularity,
  onMetricChange,
  onGranularityChange,
  status,
  series,
  error,
  hasCoordination,
  layout = 'standalone',
}: {
  metric: OperationalKpiHistoryMetric
  granularity: OperationalKpiHistoryGranularity
  onMetricChange: (metric: OperationalKpiHistoryMetric) => void
  onGranularityChange: (granularity: OperationalKpiHistoryGranularity) => void
  status: DirectorHistoryLoadStatus
  series: readonly OperationalKpiHistoryPoint[]
  error: string | null
  hasCoordination: boolean
  layout?: 'standalone' | 'embedded'
}) {
  const empty =
    !hasCoordination ||
    status === 'idle' ||
    (status === 'success' && isHistorySeriesEmpty(series))
  const summary = summarizeSeries(series)
  const lastDelta =
    series.length >= 2
      ? series[series.length - 1].value - series[series.length - 2].value
      : null
  const range = buildDefaultHistoryRange(granularity)
  const incomplete = isIncompleteCurrentPeriod(range.to, granularity)

  return (
    <div
      className="director-history"
      data-testid="director-coordination-history"
      data-metric={metric}
      data-granularity={granularity}
      data-status={status}
      data-layout={layout}
    >
      <div className="director-history__controls" data-testid="director-history-controls">
        <div
          className="director-history__chips director-history__chips--metric"
          role="group"
          aria-label="Métrica histórica"
        >
          {METRICS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="director-history__chip"
              data-testid={`director-history-metric-${item.id}`}
              data-active={metric === item.id ? 'true' : 'false'}
              aria-pressed={metric === item.id}
              onClick={() => onMetricChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div
          className="director-history__chips director-history__chips--period"
          role="group"
          aria-label="Granularidad histórica"
        >
          {PERIODS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="director-history__chip"
              data-testid={`director-history-period-${item.id}`}
              data-active={granularity === item.id ? 'true' : 'false'}
              aria-pressed={granularity === item.id}
              onClick={() => onGranularityChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {!hasCoordination ? (
        <p
          className="director-history__empty"
          data-testid="director-history-empty"
        >
          Selecciona una coordinación en la baraja para ver su evolución.
        </p>
      ) : null}

      {hasCoordination && status === 'loading' ? (
        <p className="director-kpi-panel__hint" data-testid="director-history-loading">
          Leyendo evolución…
        </p>
      ) : null}

      {hasCoordination && status === 'error' ? (
        <p
          className="director-kpi-panel__error"
          role="alert"
          data-testid="director-history-error"
        >
          No se pudo leer la evolución.
          {error ? ` ${error}` : ''}
        </p>
      ) : null}

      {hasCoordination && status === 'success' && empty ? (
        <p
          className="director-history__empty"
          data-testid="director-history-empty"
        >
          No hay suficientes datos en este periodo.
        </p>
      ) : null}

      {hasCoordination && status === 'success' && !empty && summary ? (
        <>
          <CompactSummary
            metric={metric}
            series={series}
            summary={summary}
            lastDelta={lastDelta}
            incomplete={incomplete}
          />
          <DirectorHistorySeriesChart
            metric={metric}
            granularity={granularity}
            series={series}
          />
        </>
      ) : null}
    </div>
  )
}

/**
 * Serie temporal reutilizable (modo ESTADO o standalone).
 * El shell decide quién lo monta.
 */
export function DirectorCoordinationHistory({
  coordinationId,
  metric,
  granularity,
  onMetricChange,
  onGranularityChange,
  layout = 'standalone',
}: {
  coordinationId: string | null
  metric: OperationalKpiHistoryMetric
  granularity: OperationalKpiHistoryGranularity
  onMetricChange: (metric: OperationalKpiHistoryMetric) => void
  onGranularityChange: (granularity: OperationalKpiHistoryGranularity) => void
  layout?: 'standalone' | 'embedded'
}) {
  const { status, series, error } = useDirectorCoordinationHistory(
    coordinationId,
    metric,
    granularity,
  )

  return (
    <DirectorCoordinationHistoryView
      metric={metric}
      granularity={granularity}
      onMetricChange={onMetricChange}
      onGranularityChange={onGranularityChange}
      status={status}
      series={series}
      error={error}
      hasCoordination={coordinationId !== null}
      layout={layout}
    />
  )
}
