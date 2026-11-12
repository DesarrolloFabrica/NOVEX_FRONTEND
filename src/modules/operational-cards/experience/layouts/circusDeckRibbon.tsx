import {
  IconChevronLeft,
  IconChevronRight,
  IconLayers,
} from '@/modules/operational-cards/components/OperationalIcons'
import type { DeckHeaderContext } from '@/modules/operational-cards/experience/OperationalCardExperience'

/**
 * Mesa de los roles con piel circense (ADMIN, ANALISTA, DIRECTOR): la baraja vive a todo el ancho bajo la cinta, así que se
 * abre más (solape del 12 %: el nombre de cada carta se lee entero), el arco
 * es más plano y el giro más suave. Las cartas siguen superpuestas.
 */
export const CIRCUS_TABLE_GEOMETRY = {
  overlap: 0.12,
  arcRise: 0.08,
  arcTilt: 4,
} as const

/**
 * Cinta «Coordinaciones» de la mesa. Con un mazo abierto (p. ej. Operación
 * Académica) ofrece el regreso a la mesa completa y dice dónde está el usuario;
 * las flechas recorren las coordinaciones de la mesa.
 */
export function renderCircusDeckRibbon(context: DeckHeaderContext) {
  const { deckOpen, deckLabel, selectedLabel, onBackToAll, onPrevious, onNext } =
    context
  // Con cualquier coordinación observada (mazo o carta suelta) la cinta ofrece
  // el regreso a la mesa completa: es la única salida a la vista general.
  const showBack = deckOpen || Boolean(selectedLabel)

  return (
    <div
      className="operational-deck__header-ribbon"
      data-testid="coordinations-deck-ribbon"
      data-deck-open={deckOpen ? 'true' : 'false'}
    >
      <div className="operational-deck__ribbon-pill">
        <span className="operational-deck__ribbon-icon" aria-hidden="true">
          <IconLayers size={22} />
        </span>
        <span className="operational-deck__ribbon-title">Coordinaciones</span>
      </div>

      {showBack ? (
        <nav
          className="operational-deck__ribbon-trail"
          aria-label="Ubicación en la baraja"
        >
          <button
            type="button"
            className="operational-deck__ribbon-back"
            data-testid="deck-ribbon-back"
            onClick={onBackToAll}
          >
            <IconChevronLeft size={16} />
            <span>Todas las coordinaciones</span>
          </button>
          <span className="operational-deck__ribbon-crumb">
            <span className="operational-deck__ribbon-crumb-sep" aria-hidden="true">
              <IconChevronRight size={14} />
            </span>
            <span className="operational-deck__ribbon-crumb-current">
              {deckOpen ? `Mazo ${deckLabel ?? selectedLabel ?? ''}` : selectedLabel}
            </span>
          </span>
        </nav>
      ) : (
        <span className="operational-deck__ribbon-desc">
          {selectedLabel
            ? `Observando ${selectedLabel} · use las flechas para recorrer la mesa`
            : 'Elija una carta para observar su coordinación'}
        </span>
      )}

      <div className="operational-deck__ribbon-nav">
        <button
          type="button"
          className="operational-deck__ribbon-btn"
          aria-label="Coordinación anterior"
          title="Coordinación anterior"
          onClick={onPrevious}
        >
          <IconChevronLeft size={16} />
        </button>
        <button
          type="button"
          className="operational-deck__ribbon-btn"
          aria-label="Coordinación siguiente"
          title="Coordinación siguiente"
          onClick={onNext}
        >
          <IconChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
