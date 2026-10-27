import type { CSSProperties } from 'react'
import { hexToRgbChannels } from '@/modules/impact-network/data/coordination-islands.config'
import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import { CoordinationCard } from '@/modules/operational-cards/components/CoordinationCard'
import { buildDeckPeeks } from '@/modules/operational-cards/data/deckPeek'
import { resolveCoordinationCardFace } from '@/modules/operational-cards/data/coordinationCardFace'
import {
  resolveCoordinationVisualIdentity,
  withArtOf,
} from '@/modules/operational-cards/data/coordinationVisualIdentity'
import type { ProductTableChild } from '@/modules/operational-cards/data/productHierarchy'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'

/**
 * Un nodo de la mesa: carta principal más las subordinaciones asomando detrás.
 *
 * Es el ÚNICO componente de nodo. Una coordinación sin subordinaciones no usa
 * otro componente: usa este con la lista vacía y no pinta ningún peek. Así el
 * día que Fábrica de Contenidos tenga las suyas se enciende sola, sin tocar la
 * mesa ni introducir una segunda rama que mantener.
 *
 * Los peeks tienen DOS lecturas, y la elige el CSS:
 *
 * - EN REPOSO son siluetas: borde, radio y color de identidad, con el arte
 *   oculto. Solo asoma el canto, y una cara completa ahí no se reconocería.
 * - ABIERTOS son MINI CARTAS reales, con el arte de su coordinación. Cinco
 *   rectángulos de color no comunican «cinco cartas subordinadas»; el arte sí.
 *
 * En ninguna de las dos muestran estado, aura, nombre ni controles: son preview
 * visual, y el estado de una subordinación se leerá cuando sea seleccionable.
 *
 * ACCESIBILIDAD. Los peeks son decorativos: `aria-hidden`, sin foco, sin rol y
 * sin ser botones, porque todavía no hay ninguna interacción detrás. Quien
 * navega con teclado o lector de pantalla no debe tropezar con cinco paradas
 * que no llevan a ningún sitio. La existencia del mazo se comunica por TEXTO en
 * el nombre accesible de la carta principal.
 */

/** Peeks realmente dibujados. Con más subordinaciones el mazo engorda, no crece. */
const MAX_VISIBLE_PEEKS = 5

/**
 * Cara ilustrada de una subordinación, o `null` si no tiene arte propio.
 *
 * Se resuelve con el mismo mapa explícito que usa la carta grande, así que una
 * hija sin arte se queda en silueta en lugar de tomar prestada una cara ajena.
 */
function childFace(code: string): string | null {
  return resolveCoordinationCardFace(code)
}

export interface CoordinationDeckStackProps {
  coordination: CoordinationOverview
  /** Etiqueta de PRODUCTO. Puede diferir del nombre técnico de la fila. */
  label: string
  /** Code del que tomar el arte, si el propio contradice al nombre. */
  artCode?: string
  /** Subordinaciones declaradas, en orden institucional. */
  subordinations: readonly ProductTableChild[]
  /** La coordinación bajo observación. Viaja hasta `aria-pressed`. */
  selected?: boolean
  onSelect: (code: string) => void
  onHoverChange: (code: string | null) => void
}

export function CoordinationDeckStack({
  coordination,
  label,
  artCode,
  subordinations,
  selected = false,
  onSelect,
  onHoverChange,
}: CoordinationDeckStackProps) {
  const base = resolveCoordinationVisualIdentity(coordination)
  const identity = artCode ? withArtOf(base, artCode as CoordinationId) : base

  const peeks = buildDeckPeeks(
    Math.min(subordinations.length, MAX_VISIBLE_PEEKS),
  )

  return (
    <div
      className="coordination-deck-stack"
      data-testid="coordination-deck-stack"
      data-code={coordination.code}
      data-children={subordinations.length}
      data-selected={selected ? 'true' : 'false'}
    >
      {peeks.map((peek, index) => (
        <span
          key={subordinations[index].code}
          className="coordination-deck-stack__peek"
          data-testid="coordination-deck-peek"
          data-code={subordinations[index].code}
          data-depth={peek.depth}
          aria-hidden="true"
          style={
            {
              '--peek-x': peek.x,
              '--peek-y': peek.y,
              '--peek-rot': peek.rotation,
              '--peek-scale': peek.scale,
              // Geometría con la subbaraja ABIERTA. La elige el CSS en hover y
              // en foco: aquí no hay estado de React ni animación imperativa.
              '--peek-open-x': peek.preview.x,
              '--peek-open-y': peek.preview.y,
              '--peek-open-rot': peek.preview.rotation,
              '--peek-open-scale': peek.preview.scale,
              zIndex: peek.zIndex,
              '--coord-rgb': hexToRgbChannels(
                resolveCoordinationVisualIdentity(
                  subordinations[index].coordination,
                ).color,
              ),
            } as CSSProperties
          }
        >
          {/* Cara ilustrada de la hija. Oculta en reposo y revelada al abrirse:
              así el canto sigue siendo un canto y la mini carta es una carta.
              Decorativa: la silueta ya lleva el borde y el color. */}
          {childFace(subordinations[index].code) && (
            <img
              className="coordination-deck-stack__peek-face"
              src={childFace(subordinations[index].code)!}
              alt=""
              aria-hidden="true"
              draggable={false}
            />
          )}
        </span>
      ))}

      <CoordinationCard
        identity={identity}
        artCode={artCode}
        productLabel={label}
        status={coordination.status}
        subordinationCount={subordinations.length}
        selected={selected}
        onSelect={onSelect}
        onHoverChange={onHoverChange}
      />
    </div>
  )
}
