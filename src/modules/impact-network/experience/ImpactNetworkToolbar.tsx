import { useEffect, useMemo, useState } from 'react'
import type {
  ImpactArea,
  ImpactAreaId,
  ImpactIncident,
  ImpactNetworkFilters,
  ImpactNetworkStatus,
} from '@/modules/impact-network/types/impact-network.types'
import type {
  OperationalEventStatus,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'

type ReplayControlState = 'idle' | 'camera' | 'playing' | 'paused' | 'complete'
type SimulationControlState = 'idle' | 'loading' | 'visible'

interface ImpactNetworkToolbarProps {
  areas: readonly ImpactArea[]
  status: ImpactNetworkStatus
  loading: boolean
  error: string | null
  lastReadAt: number | null
  filters: ImpactNetworkFilters
  focusedIncident: ImpactIncident | null
  activeCount: number
  areaCount: number
  replayState: ReplayControlState
  simulationState: SimulationControlState
  canReplay: boolean
  canSimulate: boolean
  onFiltersChange: (filters: ImpactNetworkFilters) => void
  onReplay: () => void
  onSimulate: () => void
  onResetView: () => void
}

const STATUS_LABEL: Record<ImpactNetworkStatus, string> = {
  stable: 'Estable',
  attention: 'Atención',
  critical: 'Crítico',
}

const EVENT_STATUS_LABEL: Record<OperationalEventStatus, string> = {
  open: 'Abierto',
  monitoring: 'Seguimiento',
  resolved: 'Resuelto',
  archived: 'Archivado',
}

const RISK_LABEL: Record<RiskLevel, string> = {
  low: 'Bajo',
  moderate: 'Moderado',
  high: 'Alto',
  critical: 'Crítico',
}

function formatElapsed(seconds: number): string {
  if (seconds < 5) return 'ahora'
  if (seconds < 60) return `hace ${seconds} s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} min`
  return `hace ${Math.floor(minutes / 60)} h`
}

function MonitoringReadout({
  active,
  lastReadAt,
}: {
  active: boolean
  lastReadAt: number | null
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  const elapsed = lastReadAt
    ? Math.max(0, Math.floor((now - lastReadAt) / 1_000))
    : null

  return (
    <div className="impact-toolbar__monitoring" data-active={active}>
      <span className="impact-toolbar__live-dot" aria-hidden="true" />
      <span>
        <strong>{active ? 'Monitoreo activo' : 'Monitoreo suspendido'}</strong>
        <small>
          {elapsed === null
            ? 'Esperando primera lectura'
            : `Última lectura ${formatElapsed(elapsed)}`}
        </small>
      </span>
    </div>
  )
}

function firstOrAll<T extends string>(values: readonly T[]): T | 'all' {
  return values[0] ?? 'all'
}

export function ImpactNetworkToolbar({
  areas,
  status,
  loading,
  error,
  lastReadAt,
  filters,
  focusedIncident,
  activeCount,
  areaCount,
  replayState,
  simulationState,
  canReplay,
  canSimulate,
  onFiltersChange,
  onReplay,
  onSimulate,
  onResetView,
}: ImpactNetworkToolbarProps) {
  const sortedAreas = useMemo(
    () => [...areas].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [areas],
  )

  const replayLabel =
    replayState === 'playing' || replayState === 'camera'
      ? 'Pausar'
      : replayState === 'paused'
        ? 'Continuar'
        : replayState === 'complete'
          ? 'Repetir'
          : 'Reproducir propagación'
  const simulationLabel =
    simulationState === 'loading'
      ? 'Simulando…'
      : simulationState === 'visible'
        ? 'Ocultar predicción'
        : 'Simular impacto'

  return (
    <header className="impact-toolbar">
      <div className="impact-toolbar__identity">
        <div className="impact-toolbar__title-row">
          <span className="impact-toolbar__section-kicker">Centro de mando / Operaciones</span>
          <span className="impact-toolbar__live-badge"><i aria-hidden="true" /> EN VIVO</span>
        </div>
        <p>Red de impacto operacional</p>
        <span className="impact-toolbar__subtitle">Dependencias, propagación y puntos de convergencia</span>
        <div className="impact-toolbar__identity-row">
          <MonitoringReadout active={!error && !loading} lastReadAt={lastReadAt} />
          <span className="impact-toolbar__global" data-status={status}>
            <i aria-hidden="true" />
            Estado general <strong>{error ? 'Sin datos' : STATUS_LABEL[status]}</strong>
          </span>
          <span className="impact-toolbar__quick-stat"><b>{activeCount}</b> situaciones activas</span>
          <span className="impact-toolbar__quick-stat"><b>{areaCount}</b> áreas conectadas</span>
        </div>
      </div>

      <div className="impact-toolbar__filters" aria-label="Filtros de la red">
        <label>
          <span>Estado</span>
          <select
            value={firstOrAll(filters.statuses)}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                statuses:
                  event.target.value === 'all'
                    ? []
                    : [event.target.value as OperationalEventStatus],
              })
            }
          >
            <option value="all">Todos</option>
            {(Object.keys(EVENT_STATUS_LABEL) as OperationalEventStatus[]).map(
              (eventStatus) => (
                <option key={eventStatus} value={eventStatus}>
                  {EVENT_STATUS_LABEL[eventStatus]}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          <span>Área origen</span>
          <select
            value={firstOrAll(filters.sourceAreaIds)}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                sourceAreaIds:
                  event.target.value === 'all'
                    ? []
                    : [event.target.value as ImpactAreaId],
              })
            }
          >
            <option value="all">Todas</option>
            {sortedAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Riesgo</span>
          <select
            value={firstOrAll(filters.riskLevels)}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                riskLevels:
                  event.target.value === 'all'
                    ? []
                    : [event.target.value as RiskLevel],
              })
            }
          >
            <option value="all">Todo nivel</option>
            {(Object.keys(RISK_LABEL) as RiskLevel[]).map((risk) => (
              <option key={risk} value={risk}>
                {RISK_LABEL[risk]}
              </option>
            ))}
          </select>
        </label>

        <label className="impact-toolbar__date-filter">
          <span>Fecha</span>
          <span className="impact-toolbar__date-inputs">
            <input
              type="date"
              aria-label="Fecha desde"
              value={filters.reportedFrom ?? ''}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  reportedFrom: event.target.value || null,
                })
              }
            />
            <b aria-hidden="true">–</b>
            <input
              type="date"
              aria-label="Fecha hasta"
              value={filters.reportedTo ?? ''}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  reportedTo: event.target.value || null,
                })
              }
            />
          </span>
        </label>
      </div>

      <div className="impact-toolbar__actions">
        <button type="button" onClick={onResetView} className="impact-action impact-action--quiet">
          Ajustar mapa
        </button>
        <button
          type="button"
          onClick={onReplay}
          disabled={!canReplay}
          className="impact-action"
          title={
            canReplay
              ? undefined
              : focusedIncident
                ? 'Esta situación no dispone de replay.'
                : 'Seleccione un núcleo de incidente.'
          }
        >
          {replayLabel}
        </button>
        <button
          type="button"
          onClick={onSimulate}
          disabled={!canSimulate || simulationState === 'loading'}
          className="impact-action impact-action--prediction"
          title={
            canSimulate
              ? undefined
              : focusedIncident
                ? 'Esta situación no dispone de predicción.'
                : 'Seleccione un núcleo de incidente.'
          }
        >
          {simulationLabel}
        </button>
      </div>
    </header>
  )
}

export type { ReplayControlState, SimulationControlState }
