import { memo, useEffect, useState } from 'react'
import type {
  ImpactIncident,
  ImpactNetworkStatus,
} from '@/modules/impact-network/types/impact-network.types'

export type ImpactNavigationLevel =
  | 'institutional'
  | 'coordination'
  | 'situation'

type ReplayControlState = 'idle' | 'camera' | 'playing' | 'paused' | 'complete'
type SimulationControlState = 'idle' | 'loading' | 'visible'

interface ImpactNetworkToolbarProps {
  status: ImpactNetworkStatus
  loading: boolean
  error: string | null
  lastReadAt: number | null
  navigationLevel: ImpactNavigationLevel
  selectedCoordinationName: string | null
  focusedIncident: ImpactIncident | null
  activeCount: number
  areaCount: number
  coordinatorMode?: boolean
  replayState: ReplayControlState
  simulationState: SimulationControlState
  canReplay: boolean
  canSimulate: boolean
  onNavigateDirection: () => void
  onNavigateCoordination: () => void
  onReplay: () => void
  onSimulate: () => void
  onResetView: () => void
}

const STATUS_LABEL: Record<ImpactNetworkStatus, string> = {
  stable: 'Estable',
  attention: 'Atención',
  critical: 'Crítico',
}

const LEVEL_META: Record<
  ImpactNavigationLevel,
  { number: string; label: string; detail: string }
> = {
  institutional: {
    number: '01',
    label: 'Vista institucional',
    detail: 'Estructura completa de la Dirección',
  },
  coordination: {
    number: '02',
    label: 'Coordinación focalizada',
    detail: 'Estado operacional y situaciones activas',
  },
  situation: {
    number: '03',
    label: 'Situación activa',
    detail: 'Propagación y coordinaciones relacionadas',
  },
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
            ? 'Preparando lectura'
            : `Última lectura ${formatElapsed(elapsed)}`}
        </small>
      </span>
    </div>
  )
}

function ImpactNetworkToolbarView({
  status,
  loading,
  error,
  lastReadAt,
  navigationLevel,
  selectedCoordinationName,
  focusedIncident,
  activeCount,
  areaCount,
  coordinatorMode = false,
  replayState,
  simulationState,
  canReplay,
  canSimulate,
  onNavigateDirection,
  onNavigateCoordination,
  onReplay,
  onSimulate,
  onResetView,
}: ImpactNetworkToolbarProps) {
  const levelMeta = LEVEL_META[navigationLevel]
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
    <header className="impact-toolbar" data-level={navigationLevel}>
      <div className="impact-toolbar__identity">
        <div className="impact-toolbar__title-row">
          <span className="impact-toolbar__section-kicker">
            Centro de Inteligencia Operacional
          </span>
          <span className="impact-toolbar__live-badge">
            <i aria-hidden="true" /> En vivo
          </span>
        </div>
        <p>Red de impacto</p>
        <div className="impact-toolbar__identity-row">
          <MonitoringReadout
            active={!error && !loading}
            lastReadAt={lastReadAt}
          />
          <span className="impact-toolbar__global" data-status={status}>
            <i aria-hidden="true" />
            Estado <strong>{error ? 'Sin datos' : STATUS_LABEL[status]}</strong>
          </span>
          <span className="impact-toolbar__role">
            {coordinatorMode ? 'Coordinador' : 'Director de Operaciones'}
          </span>
        </div>
      </div>

      <div className="impact-toolbar__navigation">
        <nav className="impact-breadcrumb" aria-label="Ruta operacional">
          <button
            type="button"
            onClick={onNavigateDirection}
            aria-current={
              navigationLevel === 'institutional' ? 'page' : undefined
            }
            disabled={coordinatorMode}
          >
            Dirección Operaciones
          </button>
          {selectedCoordinationName ? (
            <>
              <span aria-hidden="true">›</span>
              <button
                type="button"
                onClick={onNavigateCoordination}
                aria-current={
                  navigationLevel === 'coordination' ? 'page' : undefined
                }
              >
                {selectedCoordinationName}
              </button>
            </>
          ) : null}
          {focusedIncident ? (
            <>
              <span aria-hidden="true">›</span>
              <strong aria-current="page">{focusedIncident.title}</strong>
            </>
          ) : null}
        </nav>

        <div className="impact-toolbar__depth">
          <strong>{levelMeta.number}</strong>
          <span>
            <b>{levelMeta.label}</b>
            <small>{levelMeta.detail}</small>
          </span>
          <span className="impact-toolbar__depth-metrics">
            <b>{activeCount}</b> situaciones
            {navigationLevel === 'situation' ? (
              <>
                <i aria-hidden="true" />
                <b>{areaCount}</b> áreas
              </>
            ) : null}
          </span>
        </div>
      </div>

      <div className="impact-toolbar__actions">
        <button
          type="button"
          onClick={onResetView}
          className="impact-action impact-action--quiet"
        >
          Ajustar mapa
        </button>
        {navigationLevel === 'situation' ? (
          <>
            <button
              type="button"
              onClick={onReplay}
              disabled={!canReplay}
              className="impact-action"
            >
              {replayLabel}
            </button>
            <button
              type="button"
              onClick={onSimulate}
              disabled={!canSimulate || simulationState === 'loading'}
              className="impact-action impact-action--prediction"
            >
              {simulationLabel}
            </button>
          </>
        ) : null}
      </div>
    </header>
  )
}

export const ImpactNetworkToolbar = memo(ImpactNetworkToolbarView)

export type { ReplayControlState, SimulationControlState }
