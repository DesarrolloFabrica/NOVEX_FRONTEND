import { useEffect, useId, useRef } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ImpactNodeRisk } from './AreaMicrostructureNode'
import type { IncidentExpansionState } from './IncidentCoreNode'
import type {
  LiveTimelineStep,
  ReplayControlState,
} from './LiveTimelineOverlay'

export type ContextPanelEventSummary = {
  eventId: string
  title: string
  status?: string
  riskLevel?: Exclude<ImpactNodeRisk, 'normal'>
  timeLabel?: string
}

export type AreaContextPanelData = {
  kind: 'area'
  areaId: string
  name: string
  code?: string
  statusLabel?: string
  riskLevel?: ImpactNodeRisk | null
  activeIncidentCount?: number
  incomingDependencies?: readonly string[]
  outgoingDependencies?: readonly string[]
  relatedIncidents?: readonly ContextPanelEventSummary[]
  recentEvents?: readonly ContextPanelEventSummary[]
  lastUpdateLabel?: string
}

export type IncidentContextPanelData = {
  kind: 'incident'
  eventId: string
  title: string
  statusLabel?: string
  riskLevel?: Exclude<ImpactNodeRisk, 'normal'> | null
  riskScore?: number
  originAreaName?: string | null
  affectedAreas?: readonly string[]
  expansionState?: IncidentExpansionState
  propagationSteps?: readonly LiveTimelineStep[]
  replayAvailable?: boolean
  predictionAvailable?: boolean
  lastUpdateLabel?: string
}

export type ContextPanelData =
  | AreaContextPanelData
  | IncidentContextPanelData

export type SimulationControlState = 'idle' | 'loading' | 'showing' | 'visible'

export interface ContextPanelProps {
  open: boolean
  data: ContextPanelData | null
  onClose: () => void
  onReplay?: (eventId: string) => void
  onSimulate?: (eventId: string) => void
  onSelectIncident?: (eventId: string) => void
  replayState?: ReplayControlState
  simulationState?: SimulationControlState
  replayUnavailableReason?: string
  simulationUnavailableReason?: string
  className?: string
}

const EXPANSION_LABELS: Record<IncidentExpansionState, string> = {
  active: 'Expansión activa',
  contained: 'Expansión contenida',
  recovering: 'En recuperación',
  resolved: 'Resuelta',
  closed: 'Resuelta',
}

const REPLAY_ACTION_LABELS: Record<ReplayControlState, string> = {
  idle: 'Reproducir',
  camera: 'Pausar',
  playing: 'Pausar',
  paused: 'Continuar',
  completed: 'Repetir',
  complete: 'Repetir',
}

const RISK_LABELS: Record<ImpactNodeRisk, string> = {
  normal: 'Normal',
  low: 'Bajo',
  moderate: 'Moderado',
  high: 'Alto',
  critical: 'Crítico',
}

function DependencyList({
  title,
  items,
  modifier,
}: {
  title: string
  items: readonly string[]
  modifier: 'incoming' | 'outgoing'
}) {
  return (
    <section
      className={`impact-context-panel__dependency impact-context-panel__dependency--${modifier}`}
    >
      <h3>{title}</h3>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>Sin dependencias registradas.</p>
      )}
    </section>
  )
}

function EventSummaryList({
  title,
  items,
  onSelectIncident,
}: {
  title: string
  items: readonly ContextPanelEventSummary[]
  onSelectIncident?: (eventId: string) => void
}) {
  return (
    <section className="impact-context-panel__events">
      <h3>{title}</h3>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item.eventId}>
              {onSelectIncident ? (
                <button
                  type="button"
                  onClick={() => onSelectIncident(item.eventId)}
                  className="impact-context-panel__event-action"
                >
                  <strong>{item.title}</strong>
                  <span>
                    {item.status ?? 'En seguimiento'}
                    {item.timeLabel ? ` · ${item.timeLabel}` : ''}
                  </span>
                </button>
              ) : (
                <Link
                  to={`/situaciones?event=${encodeURIComponent(item.eventId)}`}
                  className="impact-context-panel__event-action"
                >
                  <strong>{item.title}</strong>
                  <span>
                    {item.status ?? 'En seguimiento'}
                    {item.timeLabel ? ` · ${item.timeLabel}` : ''}
                  </span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No hay situaciones asociadas.</p>
      )}
    </section>
  )
}

export function ContextPanel({
  open,
  data,
  onClose,
  onReplay,
  onSimulate,
  onSelectIncident,
  replayState = 'idle',
  simulationState = 'idle',
  replayUnavailableReason,
  simulationUnavailableReason,
  className = '',
}: ContextPanelProps) {
  const titleId = useId()
  const reduceMotion = useReducedMotion()
  const panelRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return undefined
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const focusTimer = window.requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>(
          '.impact-context-panel__close',
        )
        ?.focus()
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(focusTimer)
      window.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus({ preventScroll: true })
    }
  }, [onClose, open])

  const classes = ['impact-context-panel', className]
    .filter(Boolean)
    .join(' ')

  return (
    <AnimatePresence>
      {open && data ? (
        <motion.aside
          ref={panelRef}
          key={`${data.kind}-${data.kind === 'area' ? data.areaId : data.eventId}`}
          className={classes}
          aria-labelledby={titleId}
          data-context-kind={data.kind}
          initial={reduceMotion ? false : { opacity: 0, x: 36 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 28 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        >
          <header className="impact-context-panel__header">
            <span className="impact-context-panel__eyebrow">
              {data.kind === 'incident'
                ? 'Situación operacional'
                : 'Infraestructura operacional'}
            </span>
            <h2 id={titleId}>
              {data.kind === 'incident' ? data.title : data.name}
            </h2>
            <button
              type="button"
              className="impact-context-panel__close"
              onClick={onClose}
              aria-label="Cerrar panel contextual"
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>

          <div className="impact-context-panel__body">
            <section className="impact-context-panel__status">
              <div>
                <span className="impact-context-panel__status-signal" />
                <span>{data.statusLabel ?? 'En seguimiento'}</span>
              </div>
              <div>
                <span>Riesgo</span>
                <strong>{RISK_LABELS[data.riskLevel ?? 'normal']}</strong>
              </div>
              {data.lastUpdateLabel ? (
                <div>
                  <span>Última actualización</span>
                  <time>{data.lastUpdateLabel}</time>
                </div>
              ) : null}
            </section>

            {data.kind === 'area' ? (
              <>
                <section className="impact-context-panel__area-summary">
                  {data.code ? <span>{data.code}</span> : null}
                  <strong>{data.activeIncidentCount ?? 0}</strong>
                  <span>
                    {data.activeIncidentCount === 1
                      ? 'situación activa'
                      : 'situaciones activas'}
                  </span>
                </section>
                <EventSummaryList
                  title="Situaciones relacionadas"
                  items={data.relatedIncidents ?? []}
                  onSelectIncident={onSelectIncident}
                />
                <div className="impact-context-panel__dependencies">
                  <DependencyList
                    title="Dependencias entrantes"
                    items={data.incomingDependencies ?? []}
                    modifier="incoming"
                  />
                  <DependencyList
                    title="Dependencias salientes"
                    items={data.outgoingDependencies ?? []}
                    modifier="outgoing"
                  />
                </div>
                <EventSummaryList
                  title="Eventos recientes"
                  items={data.recentEvents ?? []}
                  onSelectIncident={onSelectIncident}
                />
              </>
            ) : (
              <>
                <dl className="impact-context-panel__incident-summary">
                  <div>
                    <dt>Origen</dt>
                    <dd>{data.originAreaName ?? 'Por confirmar'}</dd>
                  </div>
                  <div>
                    <dt>Impacto</dt>
                    <dd>
                      {data.affectedAreas?.length ?? 0}{' '}
                      {data.affectedAreas?.length === 1 ? 'área' : 'áreas'}
                    </dd>
                  </div>
                  <div>
                    <dt>Expansión</dt>
                    <dd>
                      {EXPANSION_LABELS[data.expansionState ?? 'active']}
                    </dd>
                  </div>
                  <div>
                    <dt>Puntaje</dt>
                    <dd>{Math.round(data.riskScore ?? 0)} / 100</dd>
                  </div>
                </dl>

                <section className="impact-context-panel__affected">
                  <h3>Áreas implicadas</h3>
                  {data.affectedAreas && data.affectedAreas.length > 0 ? (
                    <ul>
                      {data.affectedAreas.map((area) => (
                        <li key={area}>{area}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>El impacto aún no ha alcanzado otras áreas.</p>
                  )}
                </section>

                <section className="impact-context-panel__propagation">
                  <h3>Propagación</h3>
                  {data.propagationSteps &&
                  data.propagationSteps.length > 0 ? (
                    <ol>
                      {data.propagationSteps.map((step) => (
                        <li key={step.id}>
                          <time>{step.time ?? step.at ?? '—'}</time>
                          <span>
                            {step.label ??
                              step.title ??
                              'Actualización operacional'}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p>Sin replay enriquecido para esta situación.</p>
                  )}
                </section>
              </>
            )}
          </div>

          {data.kind === 'incident' ? (
            <footer className="impact-context-panel__footer">
              <div className="impact-context-panel__actions">
                <button
                  type="button"
                  onClick={() => onReplay?.(data.eventId)}
                  disabled={
                    !onReplay ||
                    data.replayAvailable === false ||
                    simulationState === 'loading'
                  }
                  title={
                    data.replayAvailable === false
                      ? replayUnavailableReason
                      : undefined
                  }
                >
                  {REPLAY_ACTION_LABELS[replayState]}
                </button>
                <button
                  type="button"
                  onClick={() => onSimulate?.(data.eventId)}
                  disabled={
                    !onSimulate ||
                    data.predictionAvailable === false ||
                    replayState === 'playing' ||
                    simulationState === 'loading'
                  }
                  title={
                    data.predictionAvailable === false
                      ? simulationUnavailableReason
                      : undefined
                  }
                >
                  {simulationState === 'loading'
                    ? 'Simulando…'
                    : simulationState === 'showing' ||
                        simulationState === 'visible'
                      ? 'Ocultar simulación'
                      : 'Simular impacto'}
                </button>
              </div>
              {data.replayAvailable === false && replayUnavailableReason ? (
                <p className="impact-context-panel__action-note">
                  {replayUnavailableReason}
                </p>
              ) : null}
              {data.predictionAvailable === false &&
              simulationUnavailableReason ? (
                <p className="impact-context-panel__action-note">
                  {simulationUnavailableReason}
                </p>
              ) : null}
              <Link
                to={`/situaciones?event=${encodeURIComponent(data.eventId)}`}
                className="impact-context-panel__record-link"
              >
                Ver expediente completo
              </Link>
            </footer>
          ) : null}
        </motion.aside>
      ) : null}
    </AnimatePresence>
  )
}
