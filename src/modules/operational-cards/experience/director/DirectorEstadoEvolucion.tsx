import {
  NuevosCerradosChart,
  PendientesChart,
} from '@/modules/operational-cards/charts/DirectorEstadoCharts'
import {
  NovexChartFrame,
  NovexChartHeader,
  NovexChartStat,
} from '@/modules/operational-cards/charts/NovexChartFrame'
import type { AnalysisPeriod } from '@/modules/operational-cards/domain/analysis-period'
import { evolutionBucketOf } from '@/modules/operational-cards/domain/analysis-period'
import type { OperationalKpiHistoryPoint } from '@/modules/operational-cards/types/operational-kpi.types'
import { summarizeSeries } from '@/modules/operational-cards/utils/kpi-period-compare'
import '@/styles/director-kpi-panel.css'

export type EstadoEvolutionView = 'pendientes' | 'flujo'

function bucketSubtitle(
  bucket: 'day' | 'week' | 'month',
): string {
  if (bucket === 'day') return 'Resolución diaria'
  if (bucket === 'week') return 'Resolución semanal'
  return 'Resolución mensual'
}

/** Vacío solo si no hay puntos o todos son cero (permite 1 día en semana parcial). */
function isEvolutionEmpty(series: OperationalKpiHistoryPoint[]): boolean {
  return series.length === 0 || series.every((point) => point.value === 0)
}

export function DirectorEstadoEvolucion({
  coordinationId,
  view,
  analysisPeriod,
  backlog,
  created,
  closed,
  loading,
  error,
  onViewChange,
}: {
  coordinationId: string | null
  view: EstadoEvolutionView
  analysisPeriod: AnalysisPeriod
  backlog: OperationalKpiHistoryPoint[]
  created: OperationalKpiHistoryPoint[]
  closed: OperationalKpiHistoryPoint[]
  loading: boolean
  error: string | null
  onViewChange: (view: EstadoEvolutionView) => void
}) {
  const bucket = evolutionBucketOf(analysisPeriod.kind)
  const emptyPendientes = !loading && isEvolutionEmpty(backlog)
  const emptyFlujo =
    !loading && isEvolutionEmpty(created) && isEvolutionEmpty(closed)

  const pendientesSummary =
    !loading && backlog.length > 0 ? summarizeSeries(backlog) : null
  const createdTotal = created.reduce((sum, point) => sum + point.value, 0)
  const closedTotal = closed.reduce((sum, point) => sum + point.value, 0)

  const chartTitle =
    view === 'pendientes' ? 'Pendientes de cierre' : 'Nuevos vs cerrados'

  return (
    <div
      className="director-history director-history--estado"
      data-testid="director-coordination-history"
      data-view={view}
      data-bucket={bucket}
      data-period-kind={analysisPeriod.kind}
      data-layout="embedded"
    >
      <div
        className="director-history__controls director-history__controls--filters director-history__controls--elevated"
        data-testid="director-history-controls"
      >
        <div
          className="director-history__chips"
          role="group"
          aria-label="Vista de evolución"
        >
          <button
            type="button"
            className="director-history__chip"
            data-testid="director-history-view-pendientes"
            data-active={view === 'pendientes' ? 'true' : 'false'}
            aria-pressed={view === 'pendientes'}
            onClick={() => onViewChange('pendientes')}
          >
            Pendientes
          </button>
          <button
            type="button"
            className="director-history__chip"
            data-testid="director-history-view-flujo"
            data-active={view === 'flujo' ? 'true' : 'false'}
            aria-pressed={view === 'flujo'}
            onClick={() => onViewChange('flujo')}
          >
            Nuevos vs cerrados
          </button>
        </div>
      </div>

      <NovexChartHeader
        title={chartTitle}
        subtitle={bucketSubtitle(bucket)}
      >
        {view === 'pendientes' && pendientesSummary ? (
          <div
            className="novex-chart-header__stats"
            data-testid="director-history-summary"
          >
            <NovexChartStat
              label="Actual"
              value={pendientesSummary.current}
              testId="director-history-bucket-delta"
            />
            <NovexChartStat label="Inicio" value={pendientesSummary.first} />
          </div>
        ) : null}
        {view === 'flujo' && !loading && !emptyFlujo ? (
          <div
            className="novex-chart-header__stats"
            data-testid="director-history-summary"
          >
            <NovexChartStat
              label="Nuevos"
              value={createdTotal}
              testId="director-history-bucket-delta"
            />
            <NovexChartStat label="Cerrados" value={closedTotal} />
          </div>
        ) : null}
      </NovexChartHeader>

      {!coordinationId ? (
        <p className="director-history__empty" data-testid="director-history-empty">
          Selecciona una coordinación en la baraja para ver su evolución.
        </p>
      ) : null}

      {coordinationId && loading ? (
        <p
          className="director-kpi-panel__hint"
          data-testid="director-history-loading"
        >
          Actualizando evolución…
        </p>
      ) : null}

      {coordinationId && error ? (
        <p
          className="director-kpi-panel__error"
          role="alert"
          data-testid="director-history-error"
        >
          No se pudo leer la evolución. {error}
        </p>
      ) : null}

      {coordinationId && view === 'pendientes' && !loading && !error ? (
        emptyPendientes ? (
          <p className="director-history__empty" data-testid="director-history-empty">
            No hay suficientes datos en este periodo.
          </p>
        ) : (
          <NovexChartFrame testId="director-evolution-chart-frame">
            <PendientesChart series={backlog} />
          </NovexChartFrame>
        )
      ) : null}

      {coordinationId && view === 'flujo' && !loading && !error ? (
        emptyFlujo ? (
          <p className="director-history__empty" data-testid="director-history-empty">
            No hay suficientes datos en este periodo.
          </p>
        ) : (
          <NovexChartFrame testId="director-evolution-chart-frame">
            <NuevosCerradosChart created={created} closed={closed} />
          </NovexChartFrame>
        )
      ) : null}
    </div>
  )
}
