// Expediente operacional en la consola (Sprint 10).
// Deja de parecer fila de tabla: score · título · dónde · estado.

import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'
import {
  EVENT_STATUS_BADGE_CLASSES,
  EVENT_STATUS_LABEL,
  eventRef,
  formatEventDate,
} from '@/modules/operational-events/components/eventPresentation'

interface OperationalEventRowProps {
  event: OperationalEvent
  selected: boolean
  onSelect: (eventId: string) => void
}

export function OperationalEventRow({
  event,
  selected,
  onSelect,
}: OperationalEventRowProps) {
  const interpretation = event.interpretation
  const category = interpretation?.categoryName ?? 'Sin clasificar'
  const score = interpretation?.riskScore
  const where =
    interpretation?.affectedAreaNames[0] ?? event.sourceAreaName

  return (
    <button
      type="button"
      onClick={() => onSelect(event.id)}
      aria-pressed={selected}
      data-status={event.status}
      className={`omega-dossier group relative ${FOCUS_VISIBLE}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-2 left-0 w-0.5 transition-colors duration-200 ${
          selected ? 'bg-indigo-500/70' : 'bg-transparent'
        }`}
      />

      <div className="omega-dossier__grid">
        <p className="omega-dossier__score">{score ?? '—'}</p>

        <div className="min-w-0">
          <p className="omega-dossier__title" title={event.title}>
            {event.title}
          </p>
          <p className="omega-dossier__where">{where}</p>
          <p className="omega-dossier__meta">
            {eventRef(event.id)} · {category}
          </p>
        </div>

        <div className="omega-dossier__side">
          <span className={EVENT_STATUS_BADGE_CLASSES[event.status]}>
            {EVENT_STATUS_LABEL[event.status]}
          </span>
          <time dateTime={event.reportedAt} className="omega-dossier__date">
            {formatEventDate(event.reportedAt)}
          </time>
        </div>
      </div>
    </button>
  )
}
