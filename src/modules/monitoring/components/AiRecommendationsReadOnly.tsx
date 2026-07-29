import type { SituationRecommendation } from '@/modules/api/recommendations.api'
import { groupRecommendationsByPriority } from '@/modules/monitoring/utils/situation-management.presentation'

interface AiRecommendationsReadOnlyProps {
  recommendations: SituationRecommendation[]
}

export function AiRecommendationsReadOnly({
  recommendations,
}: AiRecommendationsReadOnlyProps) {
  const groups = groupRecommendationsByPriority(recommendations)

  if (groups.length === 0) {
    return (
      <section className="novex-ops-recommendations novex-ops-dashboard-section">
        <div className="novex-ops-section-heading">
          <h2>Recomendaciones IA</h2>
        </div>
        <p className="novex-empty-signal">Sin recomendaciones registradas.</p>
      </section>
    )
  }

  return (
    <section className="novex-ops-recommendations novex-ops-dashboard-section">
      <div className="novex-ops-section-heading">
        <h2>Recomendaciones IA</h2>
      </div>
      <div className="novex-ops-recommendations__groups">
        {groups.map((group) => (
          <div
            key={group.priority}
            className="novex-ops-recommendations__group"
            data-priority={group.priority.toLowerCase()}
          >
            <ul>
              {group.items.map((item) => (
                <li key={item.id}>
                  <span className="novex-ops-recommendations__priority">
                    {group.label}
                  </span>
                  <strong>{item.title}</strong>
                  {item.description ? <span>{item.description}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
