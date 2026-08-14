import {
  problemCategories,
  type ProblemCategoryItem,
} from '@/modules/impact-network/data/executive-operational-overview.mock'
import { ProblemCategoryGlyph } from '@/modules/impact-network/components/executive/ProblemCategoryGlyph'
import { NovexIcon } from '@/shared/components/NovexIcon'

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
  return (
    <section
      className="impact-executive__panel"
      aria-label="Problemas activos"
    >
      <header className="impact-executive__panel-header">
        <span>Vista complementaria</span>
        <h3>Problemas por categoría</h3>
      </header>
      <ul className="impact-executive__category-list">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="impact-executive__category-row"
              data-category-id={item.id}
              data-selected={selectedId === item.id}
              onClick={() => onSelect?.(item.id)}
            >
              <span className="impact-executive__category-icon" data-id={item.id}>
                <ProblemCategoryGlyph categoryId={item.id} size={15} />
              </span>
              <span className="impact-executive__category-copy">
                <strong>{item.name}</strong>
                <small>{item.shortDescription}</small>
              </span>
              <span className="impact-executive__category-count">{item.count}</span>
              <NovexIcon
                name="chevron-right"
                size={13}
                className="impact-executive__category-chevron"
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
