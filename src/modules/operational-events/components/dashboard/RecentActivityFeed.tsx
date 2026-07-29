import type { RecentActivityEntry } from '@/modules/api/types/dashboard.types'
import { DashboardNoDataState } from '@/modules/operational-events/components/dashboard/DashboardStateViews'

interface RecentActivityFeedProps {
  activity: RecentActivityEntry[]
}

const EVENT_LABEL: Record<string, string> = {
  SITUATION_CREATED: 'Creación',
  STATUS_CHANGED: 'Cambio de estado',
  SEVERITY_CHANGED: 'Cambio de severidad',
  UPDATED: 'Actualización',
  COMMENT_ADDED: 'Comentario',
  ATTACHMENT_ADDED: 'Evidencia',
  AI_ANALYZED: 'Análisis IA',
  AI_ANALYSIS_STARTED: 'Análisis iniciado',
  AI_ANALYSIS_FAILED: 'Análisis fallido',
  AI_ANALYSIS_VERSION_CREATED: 'Nueva versión IA',
  AI_REANALYZED: 'Reanálisis IA',
  RECOMMENDATION_GENERATED: 'Recomendación',
  RECOMMENDATION_UPDATED: 'Recomendación actualizada',
  RECOMMENDATION_COMPLETED: 'Recomendación completada',
  CLOSED: 'Cierre',
  REOPENED: 'Reapertura',
}

function formatTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function RecentActivityFeed({ activity }: RecentActivityFeedProps) {
  return (
    <section
      className="novex-intel-change novex-activity-feed"
      aria-labelledby="activity-feed-heading"
    >
      <h3 id="activity-feed-heading" className="novex-section-eyebrow mb-0">
        Actividad reciente
      </h3>
      <p className="novex-section-hint mb-2">
        Línea de tiempo consolidada de situaciones.
      </p>

      {activity.length === 0 ? (
        <DashboardNoDataState label="Sin actividad registrada en el periodo." />
      ) : (
        <ol className="novex-activity-feed__list">
          {activity.map((entry) => (
            <li key={entry.id} className="novex-activity-feed__item">
              <div className="novex-activity-feed__meta">
                <span className="novex-activity-feed__type">
                  {EVENT_LABEL[entry.eventType] ?? entry.eventType}
                </span>
                <time dateTime={entry.createdAt}>
                  {formatTimestamp(entry.createdAt)}
                </time>
              </div>
              <p className="novex-activity-feed__title">{entry.title}</p>
              <p className="novex-activity-feed__copy">
                {entry.situationTitle}
                {entry.userName ? ` · ${entry.userName}` : ''}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
