import type { ExecutivePatternItem } from '@/modules/impact-network/data/executive-operational-overview.model'
import { ProblemCategoryGlyph } from '@/modules/impact-network/components/executive/ProblemCategoryGlyph'
import { NovexIcon } from '@/shared/components/NovexIcon'

interface OperationalPatternsProps {
  items: readonly ExecutivePatternItem[]
}

export function OperationalPatterns({ items }: OperationalPatternsProps) {
  return (
    <section className="impact-executive__patterns" aria-label="Patrones detectados">
      <header className="impact-executive__patterns-header">
        <h3>Patrones detectados</h3>
      </header>
      {items.length > 0 ? (
        <ul className="impact-executive__patterns-grid">
          {items.map((item) => (
            <li key={item.id} className="impact-executive__pattern" data-tone={item.tone}>
              <span className="impact-executive__pattern-icon" aria-hidden="true">
                <ProblemCategoryGlyph categoryId={item.categoryId} size={14} />
              </span>
              <span className="impact-executive__pattern-copy">
                <strong>{item.title}</strong>
                <small>{item.primary}</small>
              </span>
              <em>{item.secondary}</em>
            </li>
          ))}
        </ul>
      ) : (
        <p className="impact-executive__patterns-empty">
          Sin patrones de riesgo activos
        </p>
      )}
      <button type="button" className="impact-executive__patterns-action">
        Ver análisis de tendencias
        <NovexIcon name="chevron-right" size={12} />
      </button>
    </section>
  )
}
