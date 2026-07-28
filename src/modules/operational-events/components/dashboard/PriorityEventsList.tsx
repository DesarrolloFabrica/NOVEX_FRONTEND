// Componente: atención inmediata — zona dominante del tablero.

import { Link } from 'react-router-dom'
import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'
import {
  EVENT_STATUS_LABEL,
  eventRef,
} from '@/modules/operational-events/components/eventPresentation'
import { CunmarkIcon } from '@/shared/components/CunmarkIcon'

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
      className="cunmark-intel-priority"
      aria-labelledby="intel-priority-heading"
    >
      <div className="cunmark-intel-priority__heading">
        <div className="cunmark-intel-priority__heading-copy">
          <div className="cunmark-intel-priority__title-row">
            <h3 id="intel-priority-heading">Cola de atención</h3>
          </div>
          <p>
            Situaciones priorizadas por la IA según su impacto y urgencia.
          </p>
        </div>
        <Link
          to="/situaciones"
          viewTransition
          className={`cunmark-intel-priority__view-all ${FOCUS_VISIBLE}`}
        >
          Ver todas
          <CunmarkIcon name="arrow-up-right" size={12} />
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="cunmark-empty-signal py-3 text-sm leading-relaxed text-slate-400">
          Todavía no hay nada que priorizar.{' '}
          <Link
            to="/situaciones/nueva"
            viewTransition
            className={`font-semibold text-emerald-300 hover:text-emerald-200 ${FOCUS_VISIBLE}`}
          >
            Registre la primera situación
          </Link>
        </p>
      ) : (
        <div className="cunmark-intel-priority__table-wrap">
          <table className="cunmark-intel-priority__table">
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
                        className="cunmark-intel-priority__score"
                        data-risk={event.interpretation?.riskLevel ?? 'moderate'}
                      >
                        {score ?? '—'}
                      </span>
                    </td>
                    <td data-label="Situación">
                      <strong className="cunmark-intel-priority__event-title">
                        {event.title}
                      </strong>
                    </td>
                    <td data-label="Área / Proceso">
                      <span className="cunmark-intel-priority__area">
                        {where}
                        {category ? ` · ${category}` : ''}
                        {' · '}
                        {eventRef(event.id)}
                      </span>
                    </td>
                    <td data-label="Estado">
                      <span
                        className="cunmark-intel-priority__status"
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
                        to={`/situaciones?event=${encodeURIComponent(event.id)}`}
                        viewTransition
                        className={`cunmark-intel-priority__detail ${FOCUS_VISIBLE}`}
                      >
                        Ver detalle
                        <CunmarkIcon name="arrow-up-right" size={11} />
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
