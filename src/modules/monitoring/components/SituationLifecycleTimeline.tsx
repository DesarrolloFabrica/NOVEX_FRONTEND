import {
  lifecyclePhase,
  OPERATIONAL_STATUS_LABEL,
  OPERATIONAL_STATUS_ORDER,
  type SituationOperationalStatus,
} from '@/modules/monitoring/utils/situation-lifecycle'

interface SituationLifecycleTimelineProps {
  status: string
}

export function SituationLifecycleTimeline({
  status,
}: SituationLifecycleTimelineProps) {
  return (
    <ol
      className="novex-ops-lifecycle"
      aria-label="Ciclo de vida operacional"
    >
      {OPERATIONAL_STATUS_ORDER.map((step, index) => {
        const phase = lifecyclePhase(status, step)
        return (
          <li
            key={step}
            className={`novex-ops-lifecycle__step novex-ops-lifecycle__step--${phase}`}
            data-status={step.toLowerCase()}
            aria-current={phase === 'current' ? 'step' : undefined}
          >
            <span className="novex-ops-lifecycle__marker" aria-hidden="true" />
            <span className="novex-ops-lifecycle__label">
              {OPERATIONAL_STATUS_LABEL[step as SituationOperationalStatus]}
            </span>
            {index < OPERATIONAL_STATUS_ORDER.length - 1 ? (
              <span className="novex-ops-lifecycle__connector" aria-hidden="true" />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
