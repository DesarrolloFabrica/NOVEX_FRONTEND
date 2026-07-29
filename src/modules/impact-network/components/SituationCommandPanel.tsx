import { Link } from 'react-router-dom'
import {
  getCoordination,
  getCoordinationIslandAsset,
  type CoordinationId,
} from '@/modules/impact-network/data/coordination-islands.config'
import type { ImpactIncident } from '@/modules/impact-network/types/impact-network.types'
import type { RiskLevel } from '@/modules/operational-events/types/operational-event.types'
import type { LiveTimelineStep, ReplayControlState } from './LiveTimelineOverlay'

export type SimulationControlState = 'idle' | 'loading' | 'showing' | 'visible'

export interface SituationCommandPanelProps {
  incidents: readonly ImpactIncident[]
  /** Muestra aviso cuando la vista usa datos mock temporales. */
  mockDataActive?: boolean
  selectedEventId: string | null
  coordinationName?: string | null
  originCoordinationId?: CoordinationId | null
  originName?: string | null
  affectedNames?: readonly string[]
  riskLevel?: RiskLevel | null
  riskScore?: number
  propagationDurationLabel?: string
  executiveSummary?: string | null
  propagationSteps?: readonly LiveTimelineStep[]
  replayAvailable?: boolean
  predictionAvailable?: boolean
  replayState?: ReplayControlState
  simulationState?: SimulationControlState
  replayUnavailableReason?: string
  simulationUnavailableReason?: string
  onSelectIncident: (eventId: string) => void
  onReplay?: () => void
  onSimulate?: () => void
  onClearSelection?: () => void
}

const STATUS_LABEL = {
  open: 'Abierta',
  monitoring: 'En seguimiento',
  resolved: 'Resuelta',
  archived: 'Archivada',
} as const

const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'Bajo',
  moderate: 'Medio',
  high: 'Alto',
  critical: 'Crítico',
}

const REPLAY_ACTION_LABELS: Record<ReplayControlState, string> = {
  idle: 'Reproducir propagación',
  camera: 'Pausar',
  playing: 'Pausar',
  paused: 'Continuar',
  completed: 'Repetir',
  complete: 'Repetir',
}

export function SituationCommandPanel({
  incidents,
  mockDataActive = false,
  selectedEventId,
  coordinationName = null,
  originCoordinationId = null,
  originName = null,
  affectedNames = [],
  riskLevel = null,
  riskScore = 0,
  propagationDurationLabel = '—',
  executiveSummary = null,
  propagationSteps = [],
  replayAvailable = true,
  predictionAvailable = true,
  replayState = 'idle',
  simulationState = 'idle',
  replayUnavailableReason,
  simulationUnavailableReason,
  onSelectIncident,
  onReplay,
  onSimulate,
  onClearSelection,
}: SituationCommandPanelProps) {
  const selectedIncident = selectedEventId
    ? incidents.find((incident) => incident.eventId === selectedEventId) ?? null
    : null

  return (
    <aside
      className={[
        'situation-command-panel',
        selectedIncident ? 'situation-command-panel--detail' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Centro de comando de situaciones"
    >
      <header className="situation-command-panel__header">
        <div>
          <span className="situation-command-panel__eyebrow">
            {selectedIncident
              ? 'Coordinación seleccionada'
              : 'Monitor de situaciones'}
          </span>
          <h2>
            {selectedIncident
              ? coordinationName ?? originName ?? 'Coordinación operacional'
              : 'Impactos activos'}
          </h2>
        </div>
        {selectedIncident && onClearSelection ? (
          <button
            type="button"
            className="situation-command-panel__back"
            onClick={onClearSelection}
          >
            <span aria-hidden="true">←</span>
            Volver a situaciones
          </button>
        ) : (
          <strong className="situation-command-panel__count">
            {incidents.length}
          </strong>
        )}
      </header>

      <p className="situation-command-panel__intro">
        {selectedIncident
          ? 'Situación activa. Propagación, impacto y cronología operacional.'
          : 'Selecciona una situación para observar su propagación focalizada.'}
      </p>

      {mockDataActive ? (
        <p
          className="situation-command-panel__mock-notice"
          role="status"
          aria-label="Vista con datos mock"
        >
          <span>Mock</span>
          Datos de demostración — sin conexión al backend
        </p>
      ) : null}

      <div className="situation-command-panel__content">
        <div className="situation-command-panel__list" aria-label="Lista de situaciones">
          {incidents.length > 0 ? (
            incidents.map((incident) => (
              <button
                type="button"
                key={incident.eventId}
                className="situation-command-panel__item"
                data-selected={selectedEventId === incident.eventId}
                data-risk={incident.riskLevel ?? 'moderate'}
                onClick={() => onSelectIncident(incident.eventId)}
              >
                <span className="situation-command-panel__item-topline">
                  <span className="situation-command-panel__signal" aria-hidden="true" />
                  <span className="situation-command-panel__item-origin">
                    {incident.sourceAreaName ?? 'Origen por confirmar'}
                  </span>
                  <b>{Math.round(incident.riskScore ?? 0)}</b>
                </span>
                <strong
                  className="situation-command-panel__item-title"
                  title={incident.title}
                >
                  {incident.title}
                </strong>
                <span className="situation-command-panel__item-meta">
                  {incident.affectedAreaIds.length} áreas · {STATUS_LABEL[incident.status]}
                </span>
              </button>
            ))
          ) : (
            <div className="situation-command-panel__empty">
              <span aria-hidden="true">✓</span>
              No hay situaciones activas
            </div>
          )}
        </div>

        {selectedIncident ? (
          <section className="situation-command-panel__detail">
            <header className="situation-command-panel__detail-header">
              <div>
                <span className="situation-command-panel__eyebrow">Situación seleccionada</span>
                <h3 title={selectedIncident.title}>{selectedIncident.title}</h3>
              </div>
              <span
                className="situation-command-panel__detail-risk"
                data-risk={riskLevel ?? 'moderate'}
              >
                {Math.round(riskScore)}
              </span>
            </header>

            <section className="situation-command-panel__impact">
              <h4>Resumen ejecutivo</h4>
              <p>
                {executiveSummary ??
                  'La interpretación operacional aún no incluye un resumen ejecutivo.'}
              </p>
            </section>

            <dl className="situation-command-panel__facts">
              <div>
                <dt>Origen</dt>
                <dd>
                  {originCoordinationId ? (
                    <span className="situation-command-panel__origin">
                      <img
                        src={getCoordinationIslandAsset(originCoordinationId)}
                        alt=""
                        aria-hidden="true"
                      />
                      <span
                        className="situation-command-panel__origin-name"
                        title={
                          originName ?? getCoordination(originCoordinationId).name
                        }
                      >
                        {originName ?? getCoordination(originCoordinationId).name}
                      </span>
                    </span>
                  ) : (
                    originName ?? selectedIncident.sourceAreaName ?? 'Por confirmar'
                  )}
                </dd>
              </div>
              <div>
                <dt>Áreas impactadas</dt>
                <dd>{affectedNames.length}</dd>
              </div>
              <div>
                <dt>Tiempo de propagación</dt>
                <dd>{propagationDurationLabel}</dd>
              </div>
              <div>
                <dt>Nivel de riesgo</dt>
                <dd data-risk={riskLevel ?? 'moderate'}>
                  {riskLevel ? RISK_LABELS[riskLevel] : 'Por confirmar'} ·{' '}
                  {Math.round(riskScore)} / 100
                </dd>
              </div>
            </dl>

            {affectedNames.length > 0 ? (
              <section className="situation-command-panel__affected">
                <h4>Áreas impactadas</h4>
                <ul>
                  {affectedNames.map((name) => (
                    <li key={name}>
                      <span className="situation-command-panel__affected-name" title={name}>
                        {name}
                      </span>
                      {riskLevel ? (
                        <span className="situation-command-panel__chip" data-risk={riskLevel}>
                          {RISK_LABELS[riskLevel]}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="situation-command-panel__timeline">
              <h4>Cronología</h4>
              {propagationSteps.length > 0 ? (
                <ol>
                  {propagationSteps.map((step) => (
                    <li key={step.id}>
                      <time>{step.time ?? step.at ?? '—'}</time>
                      <span>{step.label ?? step.title ?? 'Actualización operacional'}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="situation-command-panel__muted">
                  Sin cronología enriquecida para esta situación.
                </p>
              )}
            </section>

            <footer className="situation-command-panel__actions">
              <button
                type="button"
                onClick={onReplay}
                disabled={
                  !onReplay || replayAvailable === false || simulationState === 'loading'
                }
                title={replayAvailable === false ? replayUnavailableReason : undefined}
              >
                {REPLAY_ACTION_LABELS[replayState]}
              </button>
              <button
                type="button"
                onClick={onSimulate}
                disabled={
                  !onSimulate ||
                  predictionAvailable === false ||
                  replayState === 'playing' ||
                  simulationState === 'loading'
                }
                title={
                  predictionAvailable === false ? simulationUnavailableReason : undefined
                }
              >
                {simulationState === 'loading'
                  ? 'Simulando…'
                  : simulationState === 'showing' || simulationState === 'visible'
                    ? 'Ocultar simulación'
                    : 'Simular impacto'}
              </button>
              <Link
                to={`/situaciones?event=${encodeURIComponent(selectedIncident.eventId)}`}
                className="situation-command-panel__record-link"
              >
                Ver expediente ejecutivo
              </Link>
            </footer>
          </section>
        ) : null}
      </div>
    </aside>
  )
}
