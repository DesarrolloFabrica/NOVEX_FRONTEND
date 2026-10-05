import { DirectorAnalysisPeriodPicker } from '@/modules/operational-cards/experience/director/DirectorAnalysisPeriodPicker'
import { DirectorEstadoComposicion } from '@/modules/operational-cards/experience/director/DirectorEstadoComposicion'
import {
  DirectorEstadoEvolucion,
  type EstadoEvolutionView,
} from '@/modules/operational-cards/experience/director/DirectorEstadoEvolucion'
import { DirectorEstadoOperativo } from '@/modules/operational-cards/experience/director/DirectorEstadoOperativo'
import type { AnalysisPeriod } from '@/modules/operational-cards/domain/analysis-period'
import { useDirectorEstadoState } from '@/modules/operational-cards/hooks/useDirectorEstadoState'
import type { DirectorKpiLoadStatus } from '@/modules/operational-cards/hooks/useDirectorKpi'
import type {
  OperationalKpiCoordinationSnapshot,
  OperationalKpiDirectionSnapshot,
} from '@/modules/operational-cards/types/operational-kpi.types'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import '@/styles/director-kpi-panel.css'

/**
 * Modo ESTADO: periodo global (fechas) → estado actual live → composición → evolución.
 */
export function DirectorEstadoPanel({
  selected,
  selectedCoordination,
  coordinationId,
  directionStatus,
  direction,
  directionError,
  onRetryDirection,
  coordinationStatus,
  coordination,
  coordinationError,
  evolutionView,
  analysisPeriod,
  onEvolutionViewChange,
  onAnalysisPeriodChange,
  onOpenDependencias,
}: {
  selected: boolean
  selectedCoordination: CoordinationOverview | null
  coordinationId: string | null
  directionStatus: DirectorKpiLoadStatus
  direction: OperationalKpiDirectionSnapshot | null
  directionError: string | null
  onRetryDirection: () => void
  coordinationStatus: DirectorKpiLoadStatus
  coordination: OperationalKpiCoordinationSnapshot | null
  coordinationError: string | null
  evolutionView: EstadoEvolutionView
  analysisPeriod: AnalysisPeriod
  onEvolutionViewChange: (view: EstadoEvolutionView) => void
  onAnalysisPeriodChange: (period: AnalysisPeriod) => void
  onOpenDependencias?: () => void
}) {
  const snapshotLoading = selected
    ? coordinationStatus === 'loading'
    : directionStatus === 'loading'
  const error = selected ? coordinationError : directionError
  const failed = selected
    ? coordinationStatus === 'error'
    : directionStatus === 'error'

  const state = useDirectorEstadoState(
    selected ? coordinationId : null,
    selected ? analysisPeriod : null,
  )

  const stateLoading = selected && state.status === 'loading'
  const stateFailed = selected && state.status === 'error'

  return (
    <div
      className="director-estado"
      data-testid="director-estado-panel"
      data-scope={selected ? 'coordination' : 'direction'}
      data-period-kind={analysisPeriod.kind}
      data-period-from={analysisPeriod.from}
      data-period-to={analysisPeriod.to}
    >
      <DirectorAnalysisPeriodPicker
        period={analysisPeriod}
        onChange={onAnalysisPeriodChange}
      />

      {failed ? (
        <p className="director-kpi-panel__error" role="alert">
          No se pudo leer el KPI.
          {error ? ` ${error}` : ''}
          {!selected ? (
            <button type="button" onClick={onRetryDirection}>
              Reintentar
            </button>
          ) : null}
        </p>
      ) : null}

      {snapshotLoading ? (
        <p className="director-kpi-panel__hint">Leyendo indicadores…</p>
      ) : null}

      {selected && coordination ? (
        <div className="director-estado__top">
          <DirectorEstadoOperativo
            integrityStatus={coordination.integrityStatus}
            integritySource="live"
            explainInput={{
              activeCount: coordination.problems.activeCount,
              criticalCount: coordination.problems.severity.critical,
              highCount: coordination.problems.severity.high,
              mediumCount: coordination.problems.severity.medium,
              lowCount: coordination.problems.severity.low,
              affectedCoordinationCount:
                selectedCoordination?.affectedCoordinationCount,
              incomingDependencyCount: coordination.dependencies.incoming,
            }}
          />
          {stateFailed ? (
            <p className="director-kpi-panel__error" role="alert">
              No se pudo leer el periodo.
              {state.error ? ` ${state.error}` : ''}
            </p>
          ) : null}
          <DirectorEstadoComposicion
            severity={
              state.data?.severity ?? {
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
              }
            }
            status={state.data?.attention ?? { open: 0, inProgress: 0 }}
            incoming={state.data?.relations.dependencies ?? 0}
            outgoing={state.data?.relations.commitments ?? 0}
            loading={stateLoading}
            hasCachedData={state.data !== null}
            scope="period"
            onOpenDependencias={onOpenDependencias}
          />
        </div>
      ) : null}

      {!selected && direction ? (
        <div className="director-estado__top">
          <DirectorEstadoOperativo
            integrityStatus={direction.directionStatus}
            integritySource="live"
            explainInput={{
              activeCount: direction.problems.activeCount,
              criticalCount: direction.problems.severity.critical,
              highCount: direction.problems.severity.high,
              mediumCount: direction.problems.severity.medium,
              lowCount: direction.problems.severity.low,
              incomingDependencyCount: direction.dependencies.incoming,
            }}
            testId="director-estado-operativo-direction"
          />
          <DirectorEstadoComposicion
            severity={direction.problems.severity}
            status={direction.problems.status}
            incoming={direction.dependencies.incoming}
            outgoing={direction.dependencies.outgoing}
            scope="live"
          />
          <p className="director-reading__phase-note director-reading__phase-note--compact">
            Selecciona una coordinación para analizar un periodo concreto.
          </p>
        </div>
      ) : null}

      <section
        className="director-estado__evolucion"
        data-testid="director-estado-evolucion"
      >
        <p className="director-estado__section-title">
          <span className="director-estado__section-mark" aria-hidden="true">
            ✦
          </span>
          <span>Evolución</span>
          <span className="director-estado__section-rule" aria-hidden="true" />
        </p>
        <DirectorEstadoEvolucion
          coordinationId={coordinationId}
          view={evolutionView}
          analysisPeriod={analysisPeriod}
          backlog={state.data?.evolution.backlog ?? []}
          created={state.data?.evolution.created ?? []}
          closed={state.data?.evolution.closed ?? []}
          loading={stateLoading && !state.data}
          error={stateFailed ? state.error : null}
          onViewChange={onEvolutionViewChange}
        />
      </section>
    </div>
  )
}
