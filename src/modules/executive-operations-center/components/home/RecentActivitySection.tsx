import type { EocRecentActivityItem } from '@/modules/executive-operations-center/types/executive-home.types'
import { ExecutiveHomeSection } from '@/modules/executive-operations-center/components/home/ExecutiveHomeSection'
import {
  getActivityTypeLabel,
  getSeverityLabel,
  severityClass,
} from '@/modules/executive-operations-center/utils/severityDisplay'

interface RecentActivitySectionProps {
  items: EocRecentActivityItem[]
  sessionGap: string
}

export function RecentActivitySection({
  items,
  sessionGap,
}: RecentActivitySectionProps) {
  return (
    <ExecutiveHomeSection
      id="eoc-activity"
      eyebrow="Desde su última sesión"
      title="Actividad reciente"
      integrationNote="GET /situations/activity-feed?since={lastSessionAt} — eventos operativos, cambios de estado y análisis IA desde el último acceso del usuario."
    >
      <p className="eoc-activity__gap">
        Cambios registrados en las últimas <strong>{sessionGap}</strong>
      </p>
      <ol className="eoc-activity__list">
        {items.map((item, index) => (
          <li
            key={item.id}
            className={`eoc-activity__item ${severityClass(item.severity)}`}
          >
            <div className="eoc-activity__rail" aria-hidden="true">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <i />
            </div>
            <article className="eoc-activity__event">
              <div className="eoc-activity__meta">
                <div>
                  <span className="eoc-activity__type">
                    {getActivityTypeLabel(item.type)}
                  </span>
                  <span className="eoc-activity__coord">
                    {item.coordination}
                  </span>
                </div>
                <time dateTime={item.timestamp}>{item.relativeTime}</time>
              </div>
              <h3 className="eoc-activity__title">{item.title}</h3>
              <span className="eoc-activity__impact">
                Impacto {getSeverityLabel(item.severity).toLowerCase()}
              </span>
            </article>
          </li>
        ))}
      </ol>
    </ExecutiveHomeSection>
  )
}
