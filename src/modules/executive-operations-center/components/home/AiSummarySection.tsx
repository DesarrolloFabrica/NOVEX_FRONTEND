import type { EocAiSummary } from '@/modules/executive-operations-center/types/executive-home.types'
import { ExecutiveHomeSection } from '@/modules/executive-operations-center/components/home/ExecutiveHomeSection'
import { NovexIcon } from '@/shared/components/NovexIcon'

interface AiSummarySectionProps {
  summary: EocAiSummary
}

export function AiSummarySection({ summary }: AiSummarySectionProps) {
  return (
    <ExecutiveHomeSection
      id="eoc-ai"
      eyebrow="Inteligencia asistida"
      title="Resumen ejecutivo IA"
      integrationNote="GET /ai-analysis/executive-summary — narrativa generada por Gemini a partir de situaciones activas, propagación y contexto institucional."
    >
      <div className="eoc-ai">
        <div className="eoc-ai__meta">
          <span className="eoc-ai__badge">
            <NovexIcon name="sparkles" size={13} />
            Generado por IA
          </span>
          <span className="eoc-ai__confidence">
            Confianza: <strong>{summary.confidence}%</strong>
          </span>
          <time dateTime={summary.generatedAt}>{summary.generatedAt}</time>
        </div>
        <div className="eoc-ai__conclusion">
          <span>Conclusión ejecutiva</span>
          <p className="eoc-ai__narrative">{summary.narrative}</p>
        </div>
        <div className="eoc-ai__findings">
          <span className="eoc-ai__findings-label">Hallazgos clave</span>
          <ul className="eoc-ai__highlights" aria-label="Hallazgos clave">
            {summary.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </div>
        <div className="eoc-ai__focus">
          <span className="eoc-ai__focus-icon" aria-hidden="true">
            <NovexIcon name="arrow-up-right" size={16} />
          </span>
          <div>
            <span className="eoc-ai__focus-label">Foco recomendado</span>
            <p>{summary.recommendedFocus}</p>
          </div>
        </div>
      </div>
    </ExecutiveHomeSection>
  )
}
