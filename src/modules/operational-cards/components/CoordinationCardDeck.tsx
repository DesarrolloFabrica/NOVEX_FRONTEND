import type { CSSProperties } from 'react'
import { motion } from 'motion/react'
import { CoordinationCard } from '@/modules/operational-cards/components/CoordinationCard'
import { resolveCoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import type { DeckLayout } from '@/modules/operational-cards/data/deckLayout'

/**
 * Baraja: todas las coordinaciones visibles a la vez, en bandas escalonadas
 * que sugieren un arco suave.
 *
 * No es un grid. El orden es el `displayOrder` institucional, las cartas se
 * muerden lateralmente por el borde —nunca por el nombre— y cada banda se
 * curva levemente hacia los extremos.
 *
 * Con una coordinación seleccionada, esa carta sale de la baraja hacia el área
 * focal y las catorce restantes se reorganizan y comprimen, pero siguen
 * mostrando isla, nombre y estado, y siguen siendo clickeables. `layout` de
 * Motion se encarga de que el hueco se cierre con un movimiento continuo en
 * lugar de un salto.
 */

export interface CoordinationCardDeckProps {
  layout: DeckLayout
  selectedCode: string | null
  compressed: boolean
  onSelect: (code: string) => void
  onHoverChange: (code: string | null) => void
}

export function CoordinationCardDeck({
  layout,
  selectedCode,
  compressed,
  onSelect,
  onHoverChange,
}: CoordinationCardDeckProps) {
  const count = layout.bands.reduce((total, band) => total + band.length, 0)

  return (
    <div
      className="operational-deck__bands"
      data-testid="coordination-card-deck"
      data-count={count}
      data-compressed={compressed ? 'true' : 'false'}
    >
      {layout.bands.map((band, bandIndex) => (
        <div
          key={`band-${bandIndex}`}
          className="operational-deck__band"
          data-testid="coordination-card-band"
        >
          {band.map((slot) => (
            <motion.div
              key={slot.coordination.code}
              layout
              transition={{ type: 'spring', stiffness: 210, damping: 28 }}
              className="operational-deck__slot"
              style={
                {
                  '--lift': slot.lift,
                  '--tilt': slot.tilt,
                } as CSSProperties
              }
            >
              <CoordinationCard
                identity={resolveCoordinationVisualIdentity(slot.coordination)}
                status={slot.coordination.status}
                selected={slot.coordination.code === selectedCode}
                onSelect={onSelect}
                onHoverChange={onHoverChange}
              />
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  )
}
