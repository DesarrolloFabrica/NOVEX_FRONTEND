import { motion, useReducedMotion } from 'motion/react'
import type { ImpactNodeRisk } from './AreaMicrostructureNode'
import type { IncidentExpansionState } from './IncidentCoreNode'

export type OperationalFocus = {
  eventId: string
  title: string
  originAreaName?: string | null
  affectedAreaCount?: number
  expansionState?: IncidentExpansionState
  elapsedMinutes?: number
  elapsedLabel?: string
  riskLevel?: Exclude<ImpactNodeRisk, 'normal'> | null
  riskScore?: number
}

export interface OperationalFocusPlateProps {
  focus: OperationalFocus | null
  onActivate?: (eventId: string) => void
  busy?: boolean
  className?: string
}

const EXPANSION_LABELS: Record<IncidentExpansionState, string> = {
  active: 'Activa',
  contained: 'Contenida',
  recovering: 'En recuperación',
  resolved: 'Resuelta',
  closed: 'Resuelta',
}

function getElapsedLabel(focus: OperationalFocus): string {
  if (focus.elapsedLabel) return focus.elapsedLabel
  if (focus.elapsedMinutes === undefined) return 'Sin lectura'
  return `${Math.max(0, Math.round(focus.elapsedMinutes))} min`
}

export function OperationalFocusPlate({
  focus,
  onActivate,
  busy = false,
  className = '',
}: OperationalFocusPlateProps) {
  const reduceMotion = useReducedMotion()
  const expansionState = focus?.expansionState ?? 'active'
  const classes = [
    'impact-focus',
    focus ? `impact-focus--${focus.riskLevel ?? 'moderate'}` : '',
    busy ? 'impact-focus--busy' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <motion.section
      className={classes}
      aria-labelledby="impact-focus-title"
      aria-live="polite"
      initial={reduceMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 28 }}
      data-event-id={focus?.eventId}
    >
      <header className="impact-focus__header">
        <span className="impact-focus__signal" aria-hidden="true" />
        <h2 id="impact-focus-title">Foco operacional</h2>
        {busy ? (
          <span className="impact-focus__busy">Analizando propagación</span>
        ) : null}
      </header>

      {focus ? (
        <button
          type="button"
          className="impact-focus__action"
          onClick={() => onActivate?.(focus.eventId)}
          disabled={busy}
          aria-label={`Enfocar ${focus.title}`}
        >
          <strong className="impact-focus__situation">{focus.title}</strong>
          <dl className="impact-focus__metrics">
            <div>
              <dt>Origen</dt>
              <dd>{focus.originAreaName ?? 'Por confirmar'}</dd>
            </div>
            <div>
              <dt>Impacto</dt>
              <dd>
                {focus.affectedAreaCount ?? 0}{' '}
                {focus.affectedAreaCount === 1 ? 'área' : 'áreas'}
              </dd>
            </div>
            <div>
              <dt>Expansión</dt>
              <dd>{EXPANSION_LABELS[expansionState]}</dd>
            </div>
            <div>
              <dt>Tiempo</dt>
              <dd>{getElapsedLabel(focus)}</dd>
            </div>
          </dl>
          {focus.riskScore !== undefined ? (
            <span className="impact-focus__risk">
              Riesgo <b>{Math.round(focus.riskScore)}</b>
            </span>
          ) : null}
        </button>
      ) : (
        <div className="impact-focus__stable">
          <span className="impact-focus__stable-core" aria-hidden="true" />
          <strong>Operación estable</strong>
          <span>Sin situaciones activas que requieran atención inmediata.</span>
        </div>
      )}
    </motion.section>
  )
}
