// Capa: obturador de entrada (máscara de la transición post-login).
// Responsabilidad: pintar las dos hojas y el sello NOVEX en un estado.
// Decorativo; el movimiento es CSS (entry-cover.css).

import { useLayoutEffect, useRef } from 'react'
import type { CSSProperties, TransitionEvent } from 'react'
import type { EntryCoverState } from '@/shared/transition/postLoginTransition'

export interface EntryCoverProps {
  /**
   * - `open`: hojas fuera de pantalla (arriba y abajo).
   * - `closed`: se encuentran en el centro y cubren el viewport; aparece el sello.
   * - `retracted`: el sello se disuelve y las hojas se separan sobre el destino.
   */
  state: EntryCoverState
  /** Captura el puntero aunque esté abierto (durante la transición). */
  blockInput?: boolean
  /** Se llama una vez cuando las hojas terminan de moverse hacia `state`. */
  onSettled?: (state: EntryCoverState) => void
}

/** Piezas cuyo `transform` marca el final de cada movimiento. */
const MOVING_PIECES = 2
const WORDMARK = 'NOVEX'

export function EntryCover({ state, blockInput = false, onSettled }: EntryCoverProps) {
  const settledPieces = useRef(new Set<EventTarget>())
  const onSettledRef = useRef(onSettled)
  onSettledRef.current = onSettled

  // Cada cambio de estado empieza a contar de cero (antes de pintar).
  useLayoutEffect(() => {
    settledPieces.current = new Set()
  }, [state])

  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.propertyName !== 'transform') return
    const target = event.target as Element
    if (!target.matches('.novex-entry-cover__leaf')) return

    const pieces = settledPieces.current
    if (pieces.has(target)) return
    pieces.add(target)
    if (pieces.size === MOVING_PIECES) onSettledRef.current?.(state)
  }

  return (
    <div
      className="novex-entry-cover"
      data-state={state}
      data-blocking={blockInput ? 'true' : undefined}
      aria-hidden="true"
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="novex-entry-cover__leaf novex-entry-cover__leaf--top" />
      <div className="novex-entry-cover__leaf novex-entry-cover__leaf--bottom" />

      <div className="novex-entry-cover__seal">
        <p className="novex-entry-cover__kicker">Centro operacional</p>
        <p className="novex-entry-cover__wordmark">
          {WORDMARK.split('').map((letter, index) => (
            <span key={index} className="novex-entry-cover__letter">
              <span style={{ '--i': index } as CSSProperties}>{letter}</span>
            </span>
          ))}
        </p>
        <div className="novex-entry-cover__progress">
          <span />
        </div>
        <p className="novex-entry-cover__status">Preparando tu espacio de trabajo</p>
      </div>
    </div>
  )
}
