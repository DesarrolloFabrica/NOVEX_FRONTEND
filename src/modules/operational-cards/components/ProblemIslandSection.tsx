import type { ReactNode } from 'react'
import type { ProblemSectionId } from '@/modules/operational-cards/types/problem-detail.types'

/**
 * Acordeón propio de la isla.
 *
 * Nativo a base de `aria-expanded` + `aria-controls` sobre un `button`, sin
 * animación de altura: con o sin motion reducido la información aparece igual
 * y de inmediato.
 *
 * Todas las secciones nacen cerradas: el clic 2 deja al usuario en el
 * resumen, y el clic 3 abre profundidad.
 */

export interface ProblemIslandSectionProps {
  id: ProblemSectionId
  title: string
  /** Pista breve a la derecha del título: conteo o estado, nunca una acción. */
  hint?: string | null
  expanded: boolean
  onToggle: (section: ProblemSectionId) => void
  children: ReactNode
}

export function ProblemIslandSection({
  id,
  title,
  hint,
  expanded,
  onToggle,
  children,
}: ProblemIslandSectionProps) {
  const panelId = `problem-section-panel-${id}`
  const buttonId = `problem-section-toggle-${id}`

  return (
    <section className="island-section" data-section={id} data-expanded={expanded}>
      <h3 className="island-section__heading">
        <button
          type="button"
          id={buttonId}
          className="island-section__toggle"
          data-testid="island-section-toggle"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => onToggle(id)}
        >
          <span className="island-section__chevron" aria-hidden="true" />
          <span className="island-section__title">{title}</span>
          {hint ? <span className="island-section__hint">{hint}</span> : null}
        </button>
      </h3>

      {expanded && (
        <div
          id={panelId}
          className="island-section__panel"
          data-testid="island-section-panel"
          role="region"
          aria-labelledby={buttonId}
        >
          {children}
        </div>
      )}
    </section>
  )
}
