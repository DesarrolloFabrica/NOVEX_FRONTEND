import type { CSSProperties } from 'react'
import { CoordinationCard } from '@/modules/operational-cards/components/CoordinationCard'
import { buildDeckFanLayout } from '@/modules/operational-cards/data/deckFanLayout'
import { resolveCoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import type { ProductTableChild } from '@/modules/operational-cards/data/productHierarchy'

/**
 * La MANO del mazo abierto: las subordinaciones, ya repartidas.
 *
 * Son CARTAS DE VERDAD, no miniaturas ni fichas: el mismo componente, el mismo
 * arte y el mismo lenguaje de estado que las nueve de la mesa, solo que a menor
 * escala. Y son CONTROLES de verdad: cada una es un botón con su nombre
 * accesible y su `aria-pressed`, alcanzable con el tabulador.
 *
 * Eso las separa por completo de los cantos decorativos que asoman detrás del
 * padre en la mesa global. Aquellos dicen «esta carta contiene algo» y por eso
 * son `aria-hidden` sin foco; estos son las cinco coordinaciones, y confundir
 * las dos cosas —darle `tabIndex` a un adorno— es justo lo que no se hace.
 * Comparten los datos y el resolutor de caras; no comparten el DOM.
 *
 * No calcula geometría: la pide a `buildDeckFanLayout` y la traduce a variables
 * CSS, igual que la mesa con su arco. El slot de cada hija es la única
 * autoridad de su posición.
 */

export interface CoordinationDeckFanProps {
  /** Subordinaciones declaradas por el padre, en orden institucional. */
  subordinations: readonly ProductTableChild[]
  /** Alto del escenario, en altos de carta: la mano se centra en él. */
  stageHeight: number
  /** Code observado ahora mismo. Puede ser el padre o una de estas hijas. */
  selectedCode?: string | null
  /**
   * `true` mientras la observada es una hija.
   *
   * Cambia a quién se atenúa: con el PADRE observado la mano entera se mantiene
   * legible —son las opciones que se acaban de repartir, no ruido de fondo—, y
   * solo cuando una hija pasa a ser la lectura en curso las demás ceden
   * protagonismo.
   */
  childObserved: boolean
  onSelect: (code: string) => void
}

export function CoordinationDeckFan({
  subordinations,
  stageHeight,
  selectedCode,
  childObserved,
  onSelect,
}: CoordinationDeckFanProps) {
  if (subordinations.length === 0) return null

  const fan = buildDeckFanLayout({ count: subordinations.length, stageHeight })

  return (
    <div
      className="operational-deck-fan"
      data-testid="coordination-deck-fan"
      /* De dónde arranca el reparto: el sitio del mazo, en las mismas unidades
         de carta que los destinos. */
      style={
        {
          '--deck-origin-x': fan.origin.x,
          '--deck-origin-y': fan.origin.y,
          '--deck-origin-rot': fan.origin.rotation,
        } as CSSProperties
      }
    >
      {fan.slots.map((slot) => {
        const child = subordinations[slot.index]
        const identity = resolveCoordinationVisualIdentity(child.coordination)
        const selected = child.code === selectedCode

        return (
          <div
            key={child.code}
            className="operational-deck-fan__slot"
            data-testid="coordination-deck-fan-slot"
            data-code={child.code}
            data-index={slot.index}
            data-state={
              selected ? 'selected' : childObserved ? 'dimmed' : 'resting'
            }
            style={
              {
                '--x': slot.x,
                '--y': slot.y,
                '--rot': slot.rotation,
                '--fan-scale': slot.scale,
                '--z': slot.zIndex,
                '--fan-index': slot.index,
              } as CSSProperties
            }
          >
            {/*
              Nodo de ÉNFASIS. La elevación de hover y de observada vive aquí y
              no en el slot, que ya lleva la posición del abanico: una autoridad
              de transform por nodo, la misma regla que gobierna la mesa.
            */}
            <div className="operational-deck-fan__member">
              <CoordinationCard
                identity={identity}
                /*
                 * Nombre de PRODUCTO. El DTO lo trae en `shortName` —«Ingenierías»,
                 * «Bellas Artes»—, mientras que `name` es el cargo
                 * («Coordinador Ingenierías»), que no es como se llama la
                 * coordinación en la mesa.
                 */
                productLabel={child.label}
                status={child.coordination.status}
                subordinationCount={0}
                selected={selected}
                onSelect={onSelect}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
