import { useEffect } from 'react'
import type { AnalysisPeriod } from '@/modules/operational-cards/domain/analysis-period'
import {
  DirectorHistorySeriesChart,
  historyAxisForBucket,
  isHistorySeriesEmpty,
} from '@/modules/operational-cards/experience/director/DirectorHistorySeriesChart'
import { useDirectorPeriodHistory } from '@/modules/operational-cards/hooks/useDirectorPeriodHistory'
import { useDirectorRelations } from '@/modules/operational-cards/hooks/useDirectorRelations'
import type {
  OperationalKpiDependencySide,
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

function evolutionCaption(bucket: 'day' | 'week' | 'month' | null): string {
  if (bucket === 'day') return 'Por día'
  if (bucket === 'week') return 'Por semana'
  if (bucket === 'month') return 'Por mes'
  return ''
}

function RelationList({
  title,
  help,
  items,
  side,
  selectedPartnerId,
  selectedSide,
  onSelect,
  testId,
}: {
  title: string
  help: string
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
      <p className="director-block__title">
        {title}
        <span
          className="director-status-badge__help"
          title={help}
          aria-label={help}
        >
          ?
        </span>
      </p>
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
  onMetricChange,
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
  evolutionBucket,
  evolutionError,
}: {
  metric: OperationalKpiHistoryMetric
  onMetricChange: (metric: OperationalKpiHistoryMetric) => void
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
  evolutionBucket: 'day' | 'week' | 'month' | null
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
    >
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
            help="Problemas INTER cuya responsable es esta coordinación y que afectan a otra área."
            items={commitments}
            side="commitment"
            selectedPartnerId={selectedPartnerId}
            selectedSide={selectedSide}
            onSelect={onSelectPartner}
            testId="director-relations-commitments"
          />
          <RelationList
            title="Dependencias de otras áreas"
            help="Problemas INTER registrados por otra área responsable que afectan a esta coordinación."
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
          data-bucket={evolutionBucket ?? ''}
        >
          <p className="director-block__title">
            Evolución con {selectedPartnerName}
          </p>
          {evolutionBucket ? (
            <p className="director-internos__hint">
              {evolutionCaption(evolutionBucket)}
            </p>
          ) : null}
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
              granularity={historyAxisForBucket(evolutionBucket)}
              series={evolutionSeries}
              testId="director-relations-evolution-chart"
            />
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

/**
 * DEPENDENCIAS: ¿qué relaciones INTER se registraron durante ESTE periodo?
 * Mismo AnalysisPeriod que ESTADO e INTERNOS; sin selector temporal propio.
 */
export function DirectorDependenciasPanel({
  coordinationId,
  analysisPeriod,
  metric,
  onMetricChange,
  selectedPartnerId,
  selectedSide,
  onSelectionChange,
}: {
  coordinationId: string | null
  analysisPeriod: AnalysisPeriod
  metric: OperationalKpiHistoryMetric
  onMetricChange: (metric: OperationalKpiHistoryMetric) => void
  selectedPartnerId: string | null
  selectedSide: OperationalKpiDependencySide | null
  onSelectionChange: (
    partnerId: string | null,
    side: OperationalKpiDependencySide | null,
  ) => void
}) {
  const { status, commitments, dependencies, error, fresh } = useDirectorRelations(
    coordinationId,
    metric,
    analysisPeriod,
  )

  // La pareja se conserva al cambiar de periodo solo si sigue en su lado.
  useEffect(() => {
    if (!fresh || !selectedPartnerId || !selectedSide) return
    const pool =
      selectedSide === 'commitment' ? commitments : dependencies
    if (!pool.some((item) => item.coordination.id === selectedPartnerId)) {
      onSelectionChange(null, null)
    }
  }, [
    fresh,
    commitments,
    dependencies,
    selectedPartnerId,
    selectedSide,
    onSelectionChange,
  ])

  // Solo con datos del periodo vigente (ver useDirectorRelations.fresh).
  const pool = !fresh
    ? []
    : selectedSide === 'commitment'
      ? commitments
      : selectedSide === 'dependency'
        ? dependencies
        : []
  const selectedPartner =
    pool.find((item) => item.coordination.id === selectedPartnerId) ?? null

  const {
    status: evolutionStatus,
    series: evolutionSeries,
    bucket: evolutionBucket,
    error: evolutionError,
  } = useDirectorPeriodHistory(
    coordinationId,
    metric,
    analysisPeriod,
    selectedPartner && selectedSide
      ? {
          partnerCoordinationId: selectedPartner.coordination.id,
          dependencySide: selectedSide,
        }
      : null,
  )

  return (
    <DirectorDependenciasPanelView
      metric={metric}
      onMetricChange={onMetricChange}
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
      selectedPartnerName={selectedPartner?.coordination.shortName ?? null}
      evolutionStatus={evolutionStatus}
      evolutionSeries={evolutionSeries}
      evolutionBucket={evolutionBucket}
      evolutionError={evolutionError}
    />
  )
}
