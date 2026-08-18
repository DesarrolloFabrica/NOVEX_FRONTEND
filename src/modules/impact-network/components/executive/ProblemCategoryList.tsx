import type { CSSProperties } from 'react'
import {
  problemCategories,
  type ProblemCategoryItem,
} from '@/modules/impact-network/data/executive-operational-overview.mock'
import { ProblemCategoryGlyph } from '@/modules/impact-network/components/executive/ProblemCategoryGlyph'

interface ProblemCategoryListProps {
  items?: readonly ProblemCategoryItem[]
  selectedId?: string | null
  onSelect?: (id: string) => void
}

export function ProblemCategoryList({
  items = problemCategories,
  selectedId = null,
  onSelect,
}: ProblemCategoryListProps) {
  const maxCount = Math.max(1, ...items.map((item) => item.count))

  return (
    <section className="impact-executive__panel" aria-label="Problemas activos">
      <header className="impact-executive__panel-header">
        <span>Distribución de incidencias</span>
        <h3>Problemas por categoría</h3>
        <p>Filtra el tablero para ubicar dónde se concentra cada frente.</p>
      </header>
      {items.length > 0 ? (
        <ul className="impact-executive__category-list">
          {items.slice(0, 4).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="impact-executive__category-row"
                data-category-id={item.id}
                data-selected={selectedId === item.id}
                onClick={() => onSelect?.(item.id)}
                style={
                  {
                    '--category-ratio': `${Math.max(8, (item.count / maxCount) * 100)}%`,
                  } as CSSProperties
                }
              >
                <span
                  className="impact-executive__category-icon"
                  data-id={item.id}
                  aria-hidden="true"
                >
                  <ProblemCategoryGlyph categoryId={item.id} size={15} />
                </span>
                <span className="impact-executive__category-copy">
                  <strong>{item.name}</strong>
                </span>
                <span className="impact-executive__category-bar" aria-hidden="true">
                  <i />
                </span>
                <span className="impact-executive__category-count">{item.count}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="impact-executive__category-empty">
          Aún no hay incidencias activas para agrupar.
        </p>
      )}
    </section>
  )
}
