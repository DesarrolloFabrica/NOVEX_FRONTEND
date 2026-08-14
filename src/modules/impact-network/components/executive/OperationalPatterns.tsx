import {
  detectedPatterns,
  type DetectedPattern,
  type ProblemCategoryId,
} from '@/modules/impact-network/data/executive-operational-overview.mock'
import { ProblemCategoryGlyph } from '@/modules/impact-network/components/executive/ProblemCategoryGlyph'
import { NovexIcon } from '@/shared/components/NovexIcon'

interface OperationalPatternsProps {
  items?: readonly DetectedPattern[]
}

export function OperationalPatterns({
  items = detectedPatterns,
}: OperationalPatternsProps) {
  const categoryByPattern: Record<string, ProblemCategoryId> = {
    'pattern-connectivity-fabrica': 'connectivity',
    'pattern-staff-servicios': 'staff',
    'pattern-platforms': 'platforms',
  }

  return (
    <section
      className="impact-executive__patterns"
      aria-label="Patrones detectados"
    >
      <header className="impact-executive__patterns-header">
        <h3>Patrones detectados</h3>
      </header>
      <ul className="impact-executive__patterns-grid">
        {items.map((item) => (
          <li
            key={item.id}
            className="impact-executive__pattern"
            data-tone={item.tone}
          >
            <span className="impact-executive__pattern-icon">
              <ProblemCategoryGlyph
                categoryId={categoryByPattern[item.id] ?? 'processes'}
                size={14}
              />
            </span>
            <span className="impact-executive__pattern-copy">
              <strong>{item.title}</strong>
              <small>{item.primary}</small>
            </span>
            <em>{item.secondary}</em>
          </li>
        ))}
      </ul>
      <button type="button" className="impact-executive__patterns-action">
        Ver análisis de tendencias
        <NovexIcon name="chevron-right" size={12} />
      </button>
    </section>
  )
}
