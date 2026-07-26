// Componente: atención inmediata — zona dominante del tablero.

import { Link } from 'react-router-dom'
import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'
import {
  EVENT_STATUS_LABEL,
  eventRef,
} from '@/modules/operational-events/components/eventPresentation'
import { OmegaIcon } from '@/shared/components/OmegaIcon'

interface PriorityEventsListProps {
  events: OperationalEvent[]
}

function formatRelativeTime(event: OperationalEvent): string {
  const stamp = event.lastUpdateAt ?? event.createdAt
  const time = new Date(stamp).getTime()
  if (Number.isNaN(time)) return 'Sin fecha'

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - time) / 60_000))
  if (elapsedMinutes < 1) return 'Ahora'
  if (elapsedMinutes < 60) return `Hace ${elapsedMinutes} min`

  const hours = Math.floor(elapsedMinutes / 60)
  if (hours < 24) return `Hace ${hours} h`

  const days = Math.floor(hours / 24)
  return `Hace ${days} d`
}

export function PriorityEventsList({ events }: PriorityEventsListProps) {
  return (
    <section
      className="omega-intel-priority"
      aria-labelledby="intel-priority-heading"
    >
      <div className="omega-intel-priority__heading">
        <div className="omega-intel-priority__heading-copy">
          <div className="omega-intel-priority__title-row">
            <h3 id="intel-priority-heading">Cola de atención</h3>
          </div>
          <p>
            Situaciones priorizadas por la IA según su impacto y urgencia.
          </p>
        </div>
        <Link
          to="/operational-events"
          viewTransition
          className={`omega-intel-priority__view-all ${FOCUS_VISIBLE}`}
        >
          Ver todas
          <OmegaIcon name="arrow-up-right" size={12} />
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="omega-empty-signal py-3 text-sm leading-relaxed text-slate-400">
          Todavía no hay nada que priorizar.{' '}
          <Link
            to="/operational-events/register"
            viewTransition
            className={`font-semibold text-indigo-300 hover:text-indigo-200 ${FOCUS_VISIBLE}`}
          >
            Registre la primera situación
          </Link>
        </p>
      ) : (
        <div className="omega-intel-priority__table-wrap">
          <table className="omega-intel-priority__table">
            <thead>
              <tr>
                <th scope="col">Prioridad</th>
                <th scope="col">Situación</th>
                <th scope="col">Área / Proceso</th>
                <th scope="col">Estado</th>
                <th scope="col">Actualizado</th>
                <th scope="col">Acción</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const score = event.interpretation?.riskScore
                const where =
                  event.interpretation?.affectedAreaNames[0] ??
                  event.sourceAreaName
                const category = event.interpretation?.categoryName
                return (
                  <tr key={event.id}>
                    <td data-label="Prioridad">
                      <span
                        className="omega-intel-priority__score"
                        data-risk={event.interpretation?.riskLevel ?? 'moderate'}
                      >
                        {score ?? '—'}
                      </span>
                    </td>
                    <td data-label="Situación">
                      <strong className="omega-intel-priority__event-title">
                        {event.title}
                      </strong>
                    </td>
                    <td data-label="Área / Proceso">
                      <span className="omega-intel-priority__area">
                        {where}
                        {category ? ` · ${category}` : ''}
                        {' · '}
                        {eventRef(event.id)}
                      </span>
                    </td>
                    <td data-label="Estado">
                      <span
                        className="omega-intel-priority__status"
                        data-status={event.status}
                      >
                        {EVENT_STATUS_LABEL[event.status]}
                      </span>
                    </td>
                    <td data-label="Actualizado">
                      <time dateTime={event.lastUpdateAt ?? event.createdAt}>
                        {formatRelativeTime(event)}
                      </time>
                    </td>
                    <td data-label="Acción">
                      <Link
                        to={`/operational-events?event=${encodeURIComponent(event.id)}`}
                        viewTransition
                        className={`omega-intel-priority__detail ${FOCUS_VISIBLE}`}
                      >
                        Ver detalle
                        <OmegaIcon name="arrow-up-right" size={11} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
