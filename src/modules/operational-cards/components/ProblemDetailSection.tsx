import type { ReactNode } from 'react'
import type { ProblemSectionId } from '@/modules/operational-cards/types/problem-detail.types'

/**
 * Acordeón del detalle del problema.
 *
 * Nativo a base de `aria-expanded` + `aria-controls` sobre un `button`, sin
 * animación de altura: con o sin motion reducido la información aparece igual
 * y de inmediato.
 *
 * Todas las secciones nacen cerradas: el clic 2 deja al usuario en el
 * resumen, y el clic 3 abre profundidad.
 */

export interface ProblemDetailSectionProps {
  id: ProblemSectionId
  title: string
  /** Pista breve a la derecha del título: conteo o estado, nunca una acción. */
  hint?: string | null
  expanded: boolean
  onToggle: (section: ProblemSectionId) => void
  children: ReactNode
}

export function ProblemDetailSection({
  id,
  title,
  hint,
  expanded,
  onToggle,
  children,
}: ProblemDetailSectionProps) {
  const panelId = `problem-section-panel-${id}`
  const buttonId = `problem-section-toggle-${id}`

  return (
    <section className="detail-section" data-section={id} data-expanded={expanded}>
      <h4 className="detail-section__heading">
        <button
          type="button"
          id={buttonId}
          className="detail-section__toggle"
          data-testid="detail-section-toggle"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => onToggle(id)}
        >
          <span className="detail-section__chevron" aria-hidden="true" />
          <span className="detail-section__title">{title}</span>
          {hint ? <span className="detail-section__hint">{hint}</span> : null}
        </button>
      </h4>

      {expanded && (
        <div
          id={panelId}
          className="detail-section__panel"
          data-testid="detail-section-panel"
          role="region"
          aria-labelledby={buttonId}
        >
          {children}
        </div>
      )}
    </section>
  )
}
