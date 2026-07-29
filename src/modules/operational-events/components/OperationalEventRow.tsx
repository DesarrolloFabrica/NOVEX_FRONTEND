// Fila de la tabla de situaciones registradas.

import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'
import {
  EVENT_STATUS_LABEL,
  eventRef,
  formatEventDate,
} from '@/modules/operational-events/components/eventPresentation'
import { NovexIcon } from '@/shared/components/NovexIcon'

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
  const where = interpretation?.affectedAreaNames[0] ?? event.sourceAreaName
  const risk = interpretation?.riskLevel ?? 'moderate'

  return (
    <tr
      className="novex-events-row"
      data-selected={selected || undefined}
      onClick={() => onSelect(event.id)}
    >
      <td data-label="Riesgo">
        <span className="novex-events-row__score" data-risk={risk}>
          {score ?? '—'}
        </span>
      </td>
      <td data-label="Situación">
        <button
          type="button"
          className={`novex-events-row__title ${FOCUS_VISIBLE}`}
          onClick={(clickEvent) => {
            clickEvent.stopPropagation()
            onSelect(event.id)
          }}
        >
          {event.title}
        </button>
        <span className="novex-events-row__ref">{eventRef(event.id)}</span>
      </td>
      <td data-label="Área">
        <span className="novex-events-row__text">{where}</span>
      </td>
      <td data-label="Categoría">
        <span className="novex-events-row__text">{category}</span>
      </td>
      <td data-label="Estado">
        <span className="novex-events-row__status" data-status={event.status}>
          {EVENT_STATUS_LABEL[event.status]}
        </span>
      </td>
      <td data-label="Reportada">
        <time dateTime={event.reportedAt} className="novex-events-row__date">
          {formatEventDate(event.reportedAt)}
        </time>
      </td>
      <td data-label="Acción">
        <span className="novex-events-row__action" aria-hidden="true">
          Ver detalle
          <NovexIcon name="arrow-up-right" size={11} />
        </span>
      </td>
    </tr>
  )
}
