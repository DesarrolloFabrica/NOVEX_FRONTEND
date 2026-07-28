import { motion, useReducedMotion } from 'motion/react'

export type LiveTimelineStepType =
  | 'detected'
  | 'area_impacted'
  | 'communication'
  | 'mitigation'
  | 'recovery'

export type LiveTimelineStep = {
  id: string
  time?: string
  at?: string
  label?: string
  title?: string
  detail?: string
  areaName?: string
  type: LiveTimelineStepType
}

export type ReplayControlState =
  | 'idle'
  | 'camera'
  | 'playing'
  | 'paused'
  | 'completed'
  | 'complete'

export interface LiveTimelineOverlayProps {
  steps: readonly LiveTimelineStep[]
  activeStepIndex: number
  replayState?: ReplayControlState
  onReplayToggle?: () => void
  onSkipAnimation?: () => void
  disabled?: boolean
  className?: string
}

const REPLAY_LABELS: Record<ReplayControlState, string> = {
  idle: 'Reproducir',
  camera: 'Pausar',
  playing: 'Pausar',
  paused: 'Continuar',
  completed: 'Repetir',
  complete: 'Repetir',
}

function getStepLabel(step: LiveTimelineStep): string {
  return step.label ?? step.title ?? 'Actualización operacional'
}

export function LiveTimelineOverlay({
  steps,
  activeStepIndex,
  replayState = 'idle',
  onReplayToggle,
  onSkipAnimation,
  disabled = false,
  className = '',
}: LiveTimelineOverlayProps) {
  const reduceMotion = useReducedMotion()
  const safeActiveIndex =
    steps.length === 0
      ? -1
      : Math.min(steps.length - 1, Math.max(-1, activeStepIndex))
  const activeStep =
    safeActiveIndex >= 0 ? steps[safeActiveIndex] : undefined
  const classes = ['impact-timeline', className].filter(Boolean).join(' ')

  return (
    <motion.section
      className={classes}
      aria-labelledby="impact-timeline-title"
      initial={reduceMotion ? false : { opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      data-replay-state={replayState}
    >
      <header className="impact-timeline__header">
        <span className="impact-timeline__signal" aria-hidden="true" />
        <h2 id="impact-timeline-title">Timeline vivo</h2>
        <span className="impact-timeline__progress">
          {steps.length === 0
            ? 'Sin secuencia'
            : `${Math.max(0, safeActiveIndex + 1)} / ${steps.length}`}
        </span>
      </header>

      <p className="impact-timeline__announcement" aria-live="polite">
        {activeStep
          ? `${activeStep.time ?? activeStep.at ?? ''} ${getStepLabel(activeStep)}`
          : 'Replay listo'}
      </p>

      <ol className="impact-timeline__steps">
        {steps.map((step, index) => {
          const state =
            index < safeActiveIndex
              ? 'complete'
              : index === safeActiveIndex
                ? 'current'
                : 'pending'

          return (
            <motion.li
              key={step.id}
              className={`impact-timeline__step impact-timeline__step--${state}`}
              data-step-state={state}
              data-step-type={step.type}
              aria-current={state === 'current' ? 'step' : undefined}
              animate={
                reduceMotion
                  ? undefined
                  : {
                      opacity:
                        state === 'current' ? 1 : state === 'complete' ? 0.8 : 0.4,
                      scale: state === 'current' ? 1 : 0.98,
                    }
              }
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <span className="impact-timeline__rail" aria-hidden="true">
                <span className="impact-timeline__dot" />
              </span>
              <time className="impact-timeline__time">
                {step.time ?? step.at ?? '—'}
              </time>
              <span className="impact-timeline__copy">
                <strong>{getStepLabel(step)}</strong>
                {step.areaName ? <span>{step.areaName}</span> : null}
                {step.detail ? <small>{step.detail}</small> : null}
              </span>
            </motion.li>
          )
        })}
      </ol>

      {onReplayToggle || onSkipAnimation ? (
        <div className="impact-timeline__controls">
          {onReplayToggle ? (
            <button
              type="button"
              className="impact-timeline__control impact-timeline__control--primary"
              onClick={onReplayToggle}
              disabled={disabled || steps.length === 0}
            >
              {REPLAY_LABELS[replayState]}
            </button>
          ) : null}
          {onSkipAnimation && replayState === 'playing' ? (
            <button
              type="button"
              className="impact-timeline__control impact-timeline__control--skip"
              onClick={onSkipAnimation}
            >
              Omitir animación
            </button>
          ) : null}
        </div>
      ) : null}
    </motion.section>
  )
}
