import { Link } from 'react-router-dom'
import type { PrioritySituationCard } from '@/modules/api/types/dashboard.types'
import { FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'
import { NovexIcon } from '@/shared/components/NovexIcon'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { canCreateSituations } from '@/modules/auth/utils/permissions'

interface PrioritySituationsListProps {
  situations: PrioritySituationCard[]
  title?: string
  description?: string
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Registrada',
  IN_PROGRESS: 'En atención',
  RESOLVED: 'Resuelta',
  CLOSED: 'Cerrada',
}

function formatRelativeTime(value: string): string {
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return 'Sin fecha'

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - time) / 60_000))
  if (elapsedMinutes < 1) return 'Ahora'
  if (elapsedMinutes < 60) return `Hace ${elapsedMinutes} min`

  const hours = Math.floor(elapsedMinutes / 60)
  if (hours < 24) return `Hace ${hours} h`

  const days = Math.floor(hours / 24)
  return `Hace ${days} d`
}

function situationRef(id: string): string {
  return `SIT-${id.slice(0, 8).toUpperCase()}`
}

export function PrioritySituationsList({
  situations,
  title = 'Situaciones recientes',
  description,
}: PrioritySituationsListProps) {
  const { user } = useAuth()
  return (
    <section
      className="novex-intel-priority"
      aria-labelledby="intel-priority-heading"
    >
      <div className="novex-intel-priority__heading">
        <div className="novex-intel-priority__heading-copy">
          <div className="novex-intel-priority__title-row">
            <h3 id="intel-priority-heading">{title}</h3>
          </div>
          <p hidden={Boolean(description)}>
            Últimos registros capturados y su estado actual de seguimiento.
          </p>
          {description ? <p>{description}</p> : null}
        </div>
        <Link
          to="/situaciones"
          viewTransition
          className={`novex-intel-priority__view-all ${FOCUS_VISIBLE}`}
        >
          Ver todas
          <NovexIcon name="arrow-up-right" size={12} />
        </Link>
      </div>

      {situations.length === 0 ? (
        <p className="novex-empty-signal py-3 text-sm leading-relaxed text-slate-400">
          No hay situaciones registradas todavía.{' '}
          {canCreateSituations(user) ? (
            <Link
              to="/situaciones/nueva"
              viewTransition
              className={`font-semibold text-emerald-300 hover:text-emerald-200 ${FOCUS_VISIBLE}`}
            >
              Registre una nueva situación
            </Link>
          ) : null}
        </p>
      ) : (
        <div className="novex-intel-priority__table-wrap">
          <table className="novex-intel-priority__table">
            <thead>
              <tr>
                <th scope="col">Situación</th>
                <th scope="col">Área / Proceso</th>
                <th scope="col">Estado</th>
                <th scope="col">Actualizado</th>
                <th scope="col">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {situations.map((situation) => (
                <tr key={situation.id}>
                  <td data-label="Situación">
                    <strong className="novex-intel-priority__event-title">
                      {situation.title}
                    </strong>
                  </td>
                  <td data-label="Área / Proceso">
                    <span className="novex-intel-priority__area">
                      {situation.coordinationName}
                      {situation.categoryName
                        ? ` · ${situation.categoryName}`
                        : ''}
                      {' · '}
                      {situationRef(situation.id)}
                    </span>
                  </td>
                  <td data-label="Estado">
                    <span
                      className="novex-intel-priority__status"
                      data-status={situation.status.toLowerCase()}
                    >
                      {STATUS_LABEL[situation.status] ?? situation.status}
                    </span>
                  </td>
                  <td data-label="Actualizado">
                    <time dateTime={situation.updatedAt}>
                      {formatRelativeTime(situation.updatedAt)}
                    </time>
                  </td>
                  <td data-label="Detalle">
                    <Link
                      to={`/situaciones?situation=${situation.id}`}
                      viewTransition
                      className={`novex-intel-priority__detail ${FOCUS_VISIBLE}`}
                    >
                      Ver detalle
                      <NovexIcon name="arrow-up-right" size={11} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
