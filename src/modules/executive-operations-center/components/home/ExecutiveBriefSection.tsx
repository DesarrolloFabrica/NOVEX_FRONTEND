import type { EocExecutiveBrief } from '@/modules/executive-operations-center/types/executive-home.types'
import { ExecutiveHomeSection } from '@/modules/executive-operations-center/components/home/ExecutiveHomeSection'
import { severityClass } from '@/modules/executive-operations-center/utils/severityDisplay'

interface ExecutiveBriefSectionProps {
  brief: EocExecutiveBrief
  recommendation: string
}

export function ExecutiveBriefSection({
  brief,
  recommendation,
}: ExecutiveBriefSectionProps) {
  return (
    <ExecutiveHomeSection
      id="eoc-brief"
      variant="hero"
      eyebrow="Panorama institucional"
      title="Estado general"
      integrationNote="GET /intelligence/dashboard/executive-brief — narrativa consolidada, postura operacional y señales clave generadas por el motor de inteligencia."
    >
      <div className="eoc-brief">
        <div className="eoc-brief__lead">
          <div className="eoc-brief__status-row">
            <span
              className={`eoc-brief__posture ${severityClass(brief.posture)}`}
            >
              <i aria-hidden="true" />
              {brief.postureLabel}
            </span>
            <time className="eoc-brief__updated" dateTime={brief.lastUpdated}>
              Actualizado: {brief.lastUpdated}
            </time>
          </div>
          <h3 className="eoc-brief__headline">{brief.headline}</h3>
          <p className="eoc-brief__summary">{brief.summary}</p>
        </div>
        <aside className="eoc-brief__focus">
          <span className="eoc-brief__focus-label">Prioridad recomendada</span>
          <p>{recommendation}</p>
        </aside>
      </div>
    </ExecutiveHomeSection>
  )
}
