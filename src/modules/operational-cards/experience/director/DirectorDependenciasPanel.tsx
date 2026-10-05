import { useEffect } from 'react'
import {
  DirectorHistorySeriesChart,
  isHistorySeriesEmpty,
} from '@/modules/operational-cards/experience/director/DirectorHistorySeriesChart'
import { useDirectorCoordinationHistory } from '@/modules/operational-cards/hooks/useDirectorCoordinationHistory'
import { useDirectorRelations } from '@/modules/operational-cards/hooks/useDirectorRelations'
import type {
  OperationalKpiDependencySide,
  OperationalKpiHistoryGranularity,
  OperationalKpiHistoryMetric,
  OperationalKpiRelationItem,
} from '@/modules/operational-cards/types/operational-kpi.types'
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

function RelationList({
  title,
  items,
  side,
  selectedPartnerId,
  selectedSide,
  onSelect,
  testId,
}: {
  title: string
  items: readonly OperationalKpiRelationItem[]
  side: OperationalKpiDependencySide
  selectedPartnerId: string | null
  selectedSide: OperationalKpiDependencySide | null
  onSelect: (partnerId: string, side: OperationalKpiDependencySide) => void
  testId: string
}) {
  const max = Math.max(0, ...items.map((item) => item.value))
  return (
    <section className="director-relations__group" data-testid={testId}>
      <p className="director-block__title">{title}</p>
      {items.length === 0 ? (
        <p className="director-internos__hint">Ninguna en este periodo.</p>
      ) : (
        <ul className="director-internos__bars">
          {items.map((item) => {
            const active =
              selectedPartnerId === item.coordination.id &&
              selectedSide === side
            return (
              <li key={`${side}-${item.coordination.id}`}>
                <button
                  type="button"
                  className="director-internos__category"
                  data-testid={`director-relations-${side}-${item.coordination.code}`}
                  data-active={active ? 'true' : 'false'}
                  aria-pressed={active}
                  onClick={() => onSelect(item.coordination.id, side)}
                >
                  <span className="director-internos__category-name">
                    {active ? (
                      <span className="director-internos__marker" aria-hidden="true">
                        ▶
                      </span>
                    ) : null}
                    {item.coordination.shortName}
                  </span>
                  <span className="director-internos__category-track">
                    <span
                      className="director-internos__category-fill"
                      style={{
                        width: `${max === 0 ? 0 : (item.value / max) * 100}%`,
                      }}
                    />
                  </span>
                  <strong className="director-internos__category-value">
                    {item.value}
                  </strong>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export function DirectorDependenciasPanelView({
  metric,
  granularity,
  onMetricChange,
  onGranularityChange,
  hasCoordination,
  status,
  commitments,
  dependencies,
  error,
  selectedPartnerId,
  selectedSide,
  onSelectPartner,
  selectedPartnerName,
  evolutionStatus,
  evolutionSeries,
  evolutionError,
}: {
  metric: OperationalKpiHistoryMetric
  granularity: OperationalKpiHistoryGranularity
  onMetricChange: (metric: OperationalKpiHistoryMetric) => void
  onGranularityChange: (granularity: OperationalKpiHistoryGranularity) => void
  hasCoordination: boolean
  status: 'idle' | 'loading' | 'error' | 'success'
  commitments: readonly OperationalKpiRelationItem[]
  dependencies: readonly OperationalKpiRelationItem[]
  error: string | null
  selectedPartnerId: string | null
  selectedSide: OperationalKpiDependencySide | null
  onSelectPartner: (
    partnerId: string,
    side: OperationalKpiDependencySide,
  ) => void
  selectedPartnerName: string | null
  evolutionStatus: 'idle' | 'loading' | 'error' | 'success'
  evolutionSeries: readonly {
    start: string
    end: string
    label: string
    value: number
  }[]
  evolutionError: string | null
}) {
  const empty =
    status === 'success' &&
    commitments.length === 0 &&
    dependencies.length === 0
  const evolutionEmpty =
    evolutionStatus === 'success' && isHistorySeriesEmpty(evolutionSeries)

  return (
    <div
      className="director-relations"
      data-testid="director-dependencias-panel"
      data-metric={metric}
      data-granularity={granularity}
    >
      <p className="director-block__title">Periodo</p>
      <div className="director-reading__chips" role="group" aria-label="Periodo">
        {PERIODS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="director-history__chip"
            data-testid={`director-relations-period-${item.id}`}
            data-active={granularity === item.id ? 'true' : 'false'}
            aria-pressed={granularity === item.id}
            onClick={() => onGranularityChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="director-block__title">Métrica</p>
      <div className="director-reading__chips" role="group" aria-label="Métrica">
        {METRICS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="director-history__chip"
            data-testid={`director-relations-metric-${item.id}`}
            data-active={metric === item.id ? 'true' : 'false'}
            aria-pressed={metric === item.id}
            onClick={() => onMetricChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {!hasCoordination ? (
        <p className="director-history__empty" data-testid="director-relations-empty">
          Selecciona una coordinación para ver sus relaciones INTER.
        </p>
      ) : null}

      {hasCoordination && status === 'loading' ? (
        <p className="director-kpi-panel__hint" data-testid="director-relations-loading">
          Leyendo relaciones…
        </p>
      ) : null}

      {hasCoordination && status === 'error' ? (
        <p
          className="director-kpi-panel__error"
          role="alert"
          data-testid="director-relations-error"
        >
          No se pudieron leer las relaciones.
          {error ? ` ${error}` : ''}
        </p>
      ) : null}

      {hasCoordination && empty ? (
        <p className="director-history__empty" data-testid="director-relations-empty">
          No hay dependencias INTER en este periodo.
        </p>
      ) : null}

      {hasCoordination && status === 'success' && !empty ? (
        <>
          <RelationList
            title="Compromisos con otras áreas"
            items={commitments}
            side="commitment"
            selectedPartnerId={selectedPartnerId}
            selectedSide={selectedSide}
            onSelect={onSelectPartner}
            testId="director-relations-commitments"
          />
          <RelationList
            title="Dependencias de otras áreas"
            items={dependencies}
            side="dependency"
            selectedPartnerId={selectedPartnerId}
            selectedSide={selectedSide}
            onSelect={onSelectPartner}
            testId="director-relations-dependencies"
          />
        </>
      ) : null}

      {hasCoordination &&
      selectedPartnerId &&
      selectedSide &&
      selectedPartnerName ? (
        <section
          className="director-internos__evolution"
          data-testid="director-relations-evolution"
        >
          <p className="director-block__title">
            Evolución con {selectedPartnerName}
          </p>
          {evolutionStatus === 'loading' ? (
            <p className="director-kpi-panel__hint">Leyendo evolución…</p>
          ) : null}
          {evolutionStatus === 'error' ? (
            <p className="director-kpi-panel__error" role="alert">
              No se pudo leer la evolución.
              {evolutionError ? ` ${evolutionError}` : ''}
            </p>
          ) : null}
          {evolutionStatus === 'success' && evolutionEmpty ? (
            <p className="director-history__empty">
              No hay suficientes datos en este periodo.
            </p>
          ) : null}
          {evolutionStatus === 'success' && !evolutionEmpty ? (
            <DirectorHistorySeriesChart
              metric={metric}
              granularity={granularity}
              series={evolutionSeries}
              testId="director-relations-evolution-chart"
            />
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

export function DirectorDependenciasPanel({
  coordinationId,
  metric,
  granularity,
  onMetricChange,
  onGranularityChange,
  selectedPartnerId,
  selectedSide,
  onSelectionChange,
}: {
  coordinationId: string | null
  metric: OperationalKpiHistoryMetric
  granularity: OperationalKpiHistoryGranularity
  onMetricChange: (metric: OperationalKpiHistoryMetric) => void
  onGranularityChange: (granularity: OperationalKpiHistoryGranularity) => void
  selectedPartnerId: string | null
  selectedSide: OperationalKpiDependencySide | null
  onSelectionChange: (
    partnerId: string | null,
    side: OperationalKpiDependencySide | null,
  ) => void
}) {
  const { status, commitments, dependencies, error } = useDirectorRelations(
    coordinationId,
    metric,
    granularity,
  )

  useEffect(() => {
    if (status !== 'success' || !selectedPartnerId || !selectedSide) return
    const pool =
      selectedSide === 'commitment' ? commitments : dependencies
    if (!pool.some((item) => item.coordination.id === selectedPartnerId)) {
      onSelectionChange(null, null)
    }
  }, [
    status,
    commitments,
    dependencies,
    selectedPartnerId,
    selectedSide,
    onSelectionChange,
  ])

  const selectedName =
    [...commitments, ...dependencies].find(
      (item) => item.coordination.id === selectedPartnerId,
    )?.coordination.shortName ?? null

  const {
    status: evolutionStatus,
    series: evolutionSeries,
    error: evolutionError,
  } = useDirectorCoordinationHistory(
    selectedPartnerId && selectedSide ? coordinationId : null,
    metric,
    granularity,
    null,
    selectedPartnerId,
    selectedSide,
  )

  return (
    <DirectorDependenciasPanelView
      metric={metric}
      granularity={granularity}
      onMetricChange={onMetricChange}
      onGranularityChange={onGranularityChange}
      hasCoordination={coordinationId !== null}
      status={status}
      commitments={commitments}
      dependencies={dependencies}
      error={error}
      selectedPartnerId={selectedPartnerId}
      selectedSide={selectedSide}
      onSelectPartner={(partnerId, side) =>
        onSelectionChange(partnerId, side)
      }
      selectedPartnerName={selectedName}
      evolutionStatus={evolutionStatus}
      evolutionSeries={evolutionSeries}
      evolutionError={evolutionError}
    />
  )
}
