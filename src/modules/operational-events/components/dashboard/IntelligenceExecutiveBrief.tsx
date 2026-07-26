import type { DashboardMetrics } from '@/modules/operational-events/types/operational-event.types'
import { OmegaIcon } from '@/shared/components/OmegaIcon'

interface IntelligenceExecutiveBriefProps {
  metrics: DashboardMetrics
}

export function IntelligenceExecutiveBrief({
  metrics,
}: IntelligenceExecutiveBriefProps) {
  return (
    <section
      className="omega-intel-brief"
      aria-labelledby="intel-brief-heading"
    >
      <span className="omega-intel-brief__icon" aria-hidden="true">
        <OmegaIcon name="sparkles" size={18} strokeWidth={1.45} />
      </span>
      <div className="omega-intel-brief__content">
        <div className="omega-intel-brief__heading">
          <p className="omega-intel-brief__label" id="intel-brief-heading">
            Recomendación IA
          </p>
        </div>
        <p className="omega-intel-brief__lead">{metrics.executiveNarrative}</p>
      </div>
    </section>
  )
}
