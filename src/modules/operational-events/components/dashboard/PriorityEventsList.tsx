// Componente: atención inmediata — zona dominante del tablero.
// Sprint 10: score · título · dónde (antes que metadatos).

import { Link } from 'react-router-dom'
import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'
import {
  EVENT_STATUS_LABEL,
  RISK_LEVEL_LABEL,
  eventRef,
} from '@/modules/operational-events/components/eventPresentation'

interface PriorityEventsListProps {
  events: OperationalEvent[]
}

export function PriorityEventsList({ events }: PriorityEventsListProps) {
  return (
    <section
      className="omega-intel-priority"
      aria-labelledby="intel-priority-heading"
    >
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 id="intel-priority-heading" className="omega-section-eyebrow mb-0">
          Atender primero
        </h3>
        <Link
          to="/operational-events"
          viewTransition
          className={`text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-slate-500 hover:text-indigo-700 ${FOCUS_VISIBLE}`}
        >
          Expedientes
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="omega-empty-signal py-3 text-xs text-slate-500">
          Sin prioridades activas.
        </p>
      ) : (
        <ul className="omega-intel-priority__list">
          {events.map((event) => {
            const risk = event.interpretation?.riskLevel
            const score = event.interpretation?.riskScore
            const where =
              event.interpretation?.affectedAreaNames[0] ??
              event.sourceAreaName
            return (
              <li key={event.id}>
                <Link
                  to={`/operational-events?event=${encodeURIComponent(event.id)}`}
                  viewTransition
                  className={`omega-intel-priority__row ${FOCUS_VISIBLE}`}
                >
                  <p className="omega-intel-priority__score">
                    {score ?? '—'}
                  </p>
                  <div className="min-w-0">
                    <p className="omega-intel-priority__title">{event.title}</p>
                    <p className="omega-intel-priority__meta">
                      <span className="omega-intel-priority__where">{where}</span>
                      {' · '}
                      {eventRef(event.id)} · {EVENT_STATUS_LABEL[event.status]}
                    </p>
                  </div>
                  {risk ? (
                    <span className="omega-exec-chip text-slate-600">
                      {RISK_LEVEL_LABEL[risk]}
                    </span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
