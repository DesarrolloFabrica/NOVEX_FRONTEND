import { useEffect } from 'react'
import {
  DirectorHistorySeriesChart,
  isHistorySeriesEmpty,
} from '@/modules/operational-cards/experience/director/DirectorHistorySeriesChart'
import { useDirectorCoordinationHistory } from '@/modules/operational-cards/hooks/useDirectorCoordinationHistory'
import {
  useDirectorInternosBreakdown,
  type InternosBreakdownItem,
} from '@/modules/operational-cards/hooks/useDirectorInternosBreakdown'
import type {
  OperationalKpiHistoryGranularity,
  OperationalKpiHistoryMetric,
} from '@/modules/operational-cards/types/operational-kpi.types'
import { formatCaseDelta } from '@/modules/operational-cards/utils/kpi-period-compare'
import '@/styles/director-kpi-panel.css'

const METRICS: ReadonlyArray<{
  id: OperationalKpiHistoryMetric
  label: string
}> = [
  { id: 'created', label: 'Presentados' },
  { id: 'closed', label: 'Cerrados' },
  { id: 'backlog', label: 'Backlog' },
]

const PERIODS: ReadonlyArray<{
  id: OperationalKpiHistoryGranularity
  label: string
}> = [
  { id: 'week', label: 'Semanal' },
  { id: 'month', label: 'Mensual' },
  { id: 'cycle', label: 'Ciclo' },
]

function periodCaption(granularity: OperationalKpiHistoryGranularity): string {
  if (granularity === 'week') return 'Últimas semanas'
  if (granularity === 'month') return 'Últimos meses'
  return 'Últimos ciclos'
}

export function DirectorInternosPanelView({
  metric,
  granularity,
  onMetricChange,
  onGranularityChange,
  selectedCategoryId,
  onSelectCategory,
  hasCoordination,
  breakdownStatus,
  breakdownItems,
  breakdownError,
  incompletePeriod,
  evolutionStatus,
  evolutionSeries,
  evolutionError,
  selectedCategoryName,
}: {
  metric: OperationalKpiHistoryMetric
  granularity: OperationalKpiHistoryGranularity
  onMetricChange: (metric: OperationalKpiHistoryMetric) => void
  onGranularityChange: (granularity: OperationalKpiHistoryGranularity) => void
  selectedCategoryId: string | null
  onSelectCategory: (categoryId: string) => void
  hasCoordination: boolean
  breakdownStatus: 'idle' | 'loading' | 'error' | 'success'
  breakdownItems: readonly InternosBreakdownItem[]
  breakdownError: string | null
  incompletePeriod: boolean
  evolutionStatus: 'idle' | 'loading' | 'error' | 'success'
  evolutionSeries: readonly {
    start: string
    end: string
    label: string
    value: number
  }[]
  evolutionError: string | null
  selectedCategoryName: string | null
}) {
  const maxValue = Math.max(0, ...breakdownItems.map((item) => item.value))
  const total = breakdownItems.reduce((sum, item) => sum + item.value, 0)
  const dominant = breakdownItems[0] ?? null
  const dominantShare =
    dominant && total > 0
      ? Math.round((dominant.value / total) * 100)
      : null
  const emptyBreakdown =
    breakdownStatus === 'success' && breakdownItems.length === 0
  const evolutionEmpty =
    evolutionStatus === 'success' && isHistorySeriesEmpty(evolutionSeries)

  return (
    <div
      className="director-internos"
      data-testid="director-internos-panel"
      data-metric={metric}
      data-granularity={granularity}
      data-selected-category={selectedCategoryId ?? ''}
    >
      <p className="director-block__title">Periodo</p>
      <div
        className="director-reading__chips"
        role="group"
        aria-label="Periodo de internos"
      >
        {PERIODS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="director-history__chip"
            data-testid={`director-internos-period-${item.id}`}
            data-active={granularity === item.id ? 'true' : 'false'}
            aria-pressed={granularity === item.id}
            onClick={() => onGranularityChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="director-block__title">Métrica</p>
      <div
        className="director-reading__chips"
        role="group"
        aria-label="Métrica de internos"
      >
        {METRICS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="director-history__chip"
            data-testid={`director-internos-metric-${item.id}`}
            data-active={metric === item.id ? 'true' : 'false'}
            aria-pressed={metric === item.id}
            onClick={() => onMetricChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {incompletePeriod ? (
        <p
          className="director-reading__phase-note"
          data-testid="director-internos-incomplete"
        >
          Periodo actual incompleto · comparación con el anterior equivalente
        </p>
      ) : null}

      {!hasCoordination ? (
        <p className="director-history__empty" data-testid="director-internos-empty">
          Selecciona una coordinación en la baraja para ver sus problemas
          internos.
        </p>
      ) : null}

      {hasCoordination && breakdownStatus === 'loading' ? (
        <p
          className="director-kpi-panel__hint"
          data-testid="director-internos-loading"
        >
          Leyendo distribución interna…
        </p>
      ) : null}

      {hasCoordination && breakdownStatus === 'error' ? (
        <p
          className="director-kpi-panel__error"
          role="alert"
          data-testid="director-internos-error"
        >
          No se pudo leer la distribución interna.
          {breakdownError ? ` ${breakdownError}` : ''}
        </p>
      ) : null}

      {hasCoordination && emptyBreakdown ? (
        <p className="director-history__empty" data-testid="director-internos-empty">
          No hay problemas internos en este periodo.
        </p>
      ) : null}

      {hasCoordination &&
      breakdownStatus === 'success' &&
      dominant &&
      dominantShare !== null ? (
        <section
          className="director-internos__dominant"
          data-testid="director-internos-dominant"
        >
          <p className="director-block__title">Categoría más frecuente</p>
          <p className="director-internos__dominant-name">{dominant.category.name}</p>
          <p className="director-internos__dominant-meta">
            {dominant.value} casos en el periodo
            <span aria-hidden="true"> · </span>
            {dominantShare}% de los internos
          </p>
        </section>
      ) : null}

      {hasCoordination &&
      breakdownStatus === 'success' &&
      breakdownItems.length > 0 ? (
        <section
          className="director-internos__distribution"
          data-testid="director-internos-distribution"
          aria-label="Categorías principales"
        >
          <p className="director-block__title">Categorías principales</p>
          <ul className="director-internos__bars">
            {breakdownItems.map((item) => {
              const active = selectedCategoryId === item.category.id
              return (
                <li key={item.category.id}>
                  <button
                    type="button"
                    className="director-internos__category"
                    data-testid={`director-internos-category-${item.category.code}`}
                    data-active={active ? 'true' : 'false'}
                    aria-pressed={active}
                    onClick={() => onSelectCategory(item.category.id)}
                  >
                    <span className="director-internos__category-name">
                      {active ? (
                        <span className="director-internos__marker" aria-hidden="true">
                          ▶
                        </span>
                      ) : null}
                      {item.category.name}
                      {!item.category.selectable ? (
                        <em className="director-internos__legacy">Histórica</em>
                      ) : null}
                    </span>
                    <span className="director-internos__category-track">
                      <span
                        className="director-internos__category-fill"
                        style={{
                          width: `${maxValue === 0 ? 0 : (item.value / maxValue) * 100}%`,
                        }}
                      />
                    </span>
                    <strong className="director-internos__category-value">
                      {item.value}
                    </strong>
                    <span
                      className="director-internos__delta"
                      data-delta={
                        item.delta > 0
                          ? 'up'
                          : item.delta < 0
                            ? 'down'
                            : 'flat'
                      }
                      data-testid={`director-internos-delta-${item.category.code}`}
                    >
                      {formatCaseDelta(item.delta)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {hasCoordination && selectedCategoryId && selectedCategoryName ? (
        <section
          className="director-internos__evolution"
          data-testid="director-internos-evolution"
        >
          <p className="director-block__title">
            Evolución de {selectedCategoryName}
          </p>
          <p className="director-internos__hint">{periodCaption(granularity)}</p>

          {evolutionStatus === 'loading' ? (
            <p
              className="director-kpi-panel__hint"
              data-testid="director-internos-evolution-loading"
            >
              Leyendo evolución…
            </p>
          ) : null}

          {evolutionStatus === 'error' ? (
            <p
              className="director-kpi-panel__error"
              role="alert"
              data-testid="director-internos-evolution-error"
            >
              No se pudo leer la evolución.
              {evolutionError ? ` ${evolutionError}` : ''}
            </p>
          ) : null}

          {evolutionStatus === 'success' && evolutionEmpty ? (
            <p
              className="director-history__empty"
              data-testid="director-internos-evolution-empty"
            >
              No hay suficientes datos en este periodo.
            </p>
          ) : null}

          {evolutionStatus === 'success' && !evolutionEmpty ? (
            <DirectorHistorySeriesChart
              metric={metric}
              granularity={granularity}
              series={evolutionSeries}
              testId="director-internos-evolution-chart"
            />
          ) : null}
        </section>
      ) : null}

      {hasCoordination &&
      breakdownStatus === 'success' &&
      breakdownItems.length > 0 &&
      !selectedCategoryId ? (
        <p
          className="director-internos__pick"
          data-testid="director-internos-pick"
        >
          Selecciona una categoría para ver su evolución.
        </p>
      ) : null}
    </div>
  )
}

export function DirectorInternosPanel({
  coordinationId,
  metric,
  granularity,
  onMetricChange,
  onGranularityChange,
  selectedCategoryId,
  onSelectedCategoryChange,
}: {
  coordinationId: string | null
  metric: OperationalKpiHistoryMetric
  granularity: OperationalKpiHistoryGranularity
  onMetricChange: (metric: OperationalKpiHistoryMetric) => void
  onGranularityChange: (granularity: OperationalKpiHistoryGranularity) => void
  selectedCategoryId: string | null
  onSelectedCategoryChange: (categoryId: string | null) => void
}) {
  const {
    status: breakdownStatus,
    items,
    error: breakdownError,
    incompletePeriod,
  } = useDirectorInternosBreakdown(coordinationId, metric, granularity)

  useEffect(() => {
    if (breakdownStatus !== 'success') return
    if (!selectedCategoryId) return
    const stillPresent = items.some(
      (item) => item.category.id === selectedCategoryId,
    )
    if (!stillPresent) {
      onSelectedCategoryChange(null)
    }
  }, [
    breakdownStatus,
    items,
    selectedCategoryId,
    onSelectedCategoryChange,
  ])

  const selected = items.find(
    (item) => item.category.id === selectedCategoryId,
  )

  const {
    status: evolutionStatus,
    series: evolutionSeries,
    error: evolutionError,
  } = useDirectorCoordinationHistory(
    selectedCategoryId ? coordinationId : null,
    metric,
    granularity,
    selectedCategoryId,
  )

  return (
    <DirectorInternosPanelView
      metric={metric}
      granularity={granularity}
      onMetricChange={onMetricChange}
      onGranularityChange={onGranularityChange}
      selectedCategoryId={selectedCategoryId}
      onSelectCategory={onSelectedCategoryChange}
      hasCoordination={coordinationId !== null}
      breakdownStatus={breakdownStatus}
      breakdownItems={items}
      breakdownError={breakdownError}
      incompletePeriod={incompletePeriod}
      evolutionStatus={evolutionStatus}
      evolutionSeries={evolutionSeries}
      evolutionError={evolutionError}
      selectedCategoryName={selected?.category.name ?? null}
    />
  )
}
