import { NovexIcon } from '@/shared/components/NovexIcon'

interface IntelligenceExecutiveBriefProps {
  narrative: string
}

export function IntelligenceExecutiveBrief({
  narrative,
}: IntelligenceExecutiveBriefProps) {
  return (
    <section
      className="novex-intel-brief"
      aria-labelledby="intel-brief-heading"
    >
      <span className="novex-intel-brief__icon" aria-hidden="true">
        <NovexIcon name="sparkles" size={18} strokeWidth={1.45} />
      </span>
      <div className="novex-intel-brief__content">
        <div className="novex-intel-brief__heading">
          <p className="novex-intel-brief__label" id="intel-brief-heading">
            Panorama actual
          </p>
        </div>
        <p className="novex-intel-brief__lead">{narrative}</p>
      </div>
    </section>
  )
}
