// Capa: cortinas escénicas (primer plano del login y máscara de la transición post-login).
// Responsabilidad: pintar las cortinas en un estado. Decorativas; el movimiento es CSS.

import { useLayoutEffect, useRef } from 'react'
import type { TransitionEvent } from 'react'
import type { LoginCurtainsState } from '@/shared/transition/postLoginTransition'

export interface LoginCurtainsProps {
  /**
   * - `open`: enmarcan la escena del login.
   * - `closed`: cubren todo el viewport.
   * - `retracted`: fuera de pantalla (salida en la pantalla destino).
   * El movimiento lo resuelve CSS con `transform` y `opacity`.
   */
  state: LoginCurtainsState
  /** Captura el puntero aunque estén abiertas (durante la transición). */
  blockInput?: boolean
  /** Se llama una vez cuando las piezas terminan de moverse hacia `state`. */
  onSettled?: (state: LoginCurtainsState) => void
}

/** Piezas que se mueven: dos telones y dos cortinas. */
const MOVING_PIECES = 4

/**
 * Cada lado tiene dos piezas que se mueven a la vez:
 *   - telón (`__drape`): terciopelo liso que entra desde fuera de pantalla y
 *     cubre su mitad con solape central. Abierto queda fuera de vista.
 *   - cortina (`__side`): el asset con borla, encima, como drapeado.
 *
 * El telón existe porque los assets caen en diagonal: cerca del suelo la tela
 * solo cubre el 9–14 % de su ancho y trasladarlos dejaría un triángulo abierto.
 */
export function LoginCurtains({ state, blockInput = false, onSettled }: LoginCurtainsProps) {
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
    if (!target.matches('.novex-login-curtains__drape, .novex-login-curtains__side')) return

    const pieces = settledPieces.current
    if (pieces.has(target)) return
    pieces.add(target)
    if (pieces.size === MOVING_PIECES) onSettledRef.current?.(state)
  }

  return (
    <div
      className="novex-login-curtains"
      data-state={state}
      data-blocking={blockInput ? 'true' : undefined}
      aria-hidden="true"
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="novex-login-curtains__drape novex-login-curtains__drape--left" />
      <div className="novex-login-curtains__drape novex-login-curtains__drape--right" />
      <div className="novex-login-curtains__side novex-login-curtains__side--left">
        <img
          className="novex-login-curtains__art"
          src="/assets/login/curtain-left.png"
          alt=""
          draggable={false}
          decoding="async"
        />
      </div>
      <div className="novex-login-curtains__side novex-login-curtains__side--right">
        <img
          className="novex-login-curtains__art"
          src="/assets/login/curtain-right.png"
          alt=""
          draggable={false}
          decoding="async"
        />
      </div>
    </div>
  )
}
