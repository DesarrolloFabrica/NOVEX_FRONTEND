import { CunmarkIcon } from '@/shared/components/CunmarkIcon'

interface IntelligenceExecutiveBriefProps {
  narrative: string
}

export function IntelligenceExecutiveBrief({
  narrative,
}: IntelligenceExecutiveBriefProps) {
  return (
    <section
      className="cunmark-intel-brief"
      aria-labelledby="intel-brief-heading"
    >
      <span className="cunmark-intel-brief__icon" aria-hidden="true">
        <CunmarkIcon name="sparkles" size={18} strokeWidth={1.45} />
      </span>
      <div className="cunmark-intel-brief__content">
        <div className="cunmark-intel-brief__heading">
          <p className="cunmark-intel-brief__label" id="intel-brief-heading">
            Panorama actual
          </p>
        </div>
        <p className="cunmark-intel-brief__lead">{narrative}</p>
      </div>
    </section>
  )
}
