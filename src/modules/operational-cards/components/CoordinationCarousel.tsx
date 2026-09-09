import { useCallback, useState, type KeyboardEvent } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { CoordinationCard } from '@/modules/operational-cards/components/CoordinationCard'
import {
  buildCarouselLayout,
  resolveInitialCenter,
  wrapIndex,
} from '@/modules/operational-cards/data/carouselLayout'
import { resolveCoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'

/**
 * Carrusel circular de coordinaciones alternativas.
 *
 * Se ven cinco cartas grandes en lugar de catorce diminutas; las 15 siguen
 * alcanzables recorriéndolo, y desde cualquiera se salta directamente a otra
 * coordinación sin volver a la Dirección.
 *
 * El componente se remonta con `key` cuando cambia la coordinación activa, de
 * modo que el centro se recalcula alrededor de la nueva posición institucional
 * sin arrastrar el desplazamiento anterior.
 */

export interface CoordinationCarouselProps {
  /** Alternativas ya filtradas y ordenadas: nunca incluye la activa. */
  alternatives: readonly CoordinationOverview[]
  /**
   * Nombre de producto por code, y si su arte rotula otro nombre. El carrusel
   * es una superficie de PRIMER NIVEL igual que la mesa: si rotulara el nombre
   * técnico, la carta que la mesa llama «Servicio» aparecería aquí como
   * «Homologaciones».
   */
  labelsByCode?: Readonly<Record<string, { label: string; artCode?: string }>>
  activeDisplayOrder: number
  onSelect: (code: string) => void
  onHoverChange: (code: string | null) => void
}

export function CoordinationCarousel({
  alternatives,
  labelsByCode,
  activeDisplayOrder,
  onSelect,
  onHoverChange,
}: CoordinationCarouselProps) {
  const reducedMotion = useReducedMotion()
  const [center, setCenter] = useState(() =>
    resolveInitialCenter(alternatives, activeDisplayOrder),
  )

  const layout = buildCarouselLayout(alternatives, center)

  const step = useCallback(
    (delta: number) => {
      setCenter((current) => wrapIndex(current + delta, alternatives.length))
    },
    [alternatives.length],
  )

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        step(-1)
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        step(1)
      }
    },
    [step],
  )

  if (layout.slots.length === 0) return null

  return (
    <section
      className="coordination-carousel"
      data-testid="coordination-carousel"
      data-visible={layout.slots.length}
      aria-label="Coordinaciones"
      aria-roledescription="carrusel"
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        className="coordination-carousel__arrow"
        data-testid="carousel-previous"
        aria-label="Coordinación anterior"
        onClick={() => step(-1)}
      >
        ‹
      </button>

      <div className="coordination-carousel__track">
        {layout.slots.map((slot) => (
          <motion.div
            key={slot.coordination.code}
            className="coordination-carousel__slot"
            data-testid="carousel-slot"
            data-slot={slot.slot}
            data-code={slot.coordination.code}
            style={{ zIndex: slot.zIndex }}
            initial={
              reducedMotion
                ? false
                : { opacity: 0, x: slot.x * 1.35, y: slot.y, rotate: slot.rotate }
            }
            animate={{
              opacity: 1,
              x: slot.x,
              y: slot.y,
              rotate: slot.rotate,
              scale: slot.scale,
            }}
            exit={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, x: slot.x * 1.35, transition: { duration: 0.18 } }
            }
            transition={
              reducedMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 260, damping: 30 }
            }
          >
            <CoordinationCard
              identity={resolveCoordinationVisualIdentity(slot.coordination)}
              productLabel={labelsByCode?.[slot.coordination.code]?.label}
              artCode={labelsByCode?.[slot.coordination.code]?.artCode}
              status={slot.coordination.status}
              selected={false}
              onSelect={onSelect}
              onHoverChange={onHoverChange}
            />
          </motion.div>
        ))}
      </div>

      <button
        type="button"
        className="coordination-carousel__arrow"
        data-testid="carousel-next"
        aria-label="Coordinación siguiente"
        onClick={() => step(1)}
      >
        ›
      </button>

      {/* Indicador compacto, no una fila de 15 puntos. */}
      <p
        className="coordination-carousel__position"
        data-testid="carousel-position"
        aria-live="polite"
      >
        {layout.position} / {layout.total}
      </p>
    </section>
  )
}
