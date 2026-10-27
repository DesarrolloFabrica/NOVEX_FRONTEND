// Capa: foco central del login escénico.
// Responsabilidad: marquesina de luces (CSS) + personaje NOVEX (Rive) en tres planos.

import { lazy, Suspense } from 'react'
import type { CSSProperties, Ref } from 'react'
import type { NovexCharacterHandle } from '@/shared/character/NovexCharacterFigure'

/** Diferido: el runtime de Rive (WebGL2) no entra en la carga inicial del login. */
const NovexCharacterFigure = lazy(() =>
  import('@/shared/character/NovexCharacterFigure').then((module) => ({
    default: module.NovexCharacterFigure,
  })),
)

/** Bombillos alrededor del aro. La geometría se reparte en CSS con `--bulb-index`. */
const MARQUEE_BULB_COUNT = 24

/** Reposo: el mismo mood que usa el Centro Operacional sin coordinación observada. */
const LOGIN_CHARACTER_MOOD = 'neutral'

/** Click/tap sobre el personaje: guiño momentáneo; el mood sigue en neutral. */
const LOGIN_CLICK_REACTION = 'happy_1'

function MarqueeRing({ plane }: { plane: 'back' | 'front' }) {
  return (
    <div
      className={`novex-login-stage__marquee novex-login-stage__marquee--${plane}`}
      aria-hidden="true"
      style={{ '--bulb-count': MARQUEE_BULB_COUNT } as CSSProperties}
    >
      {Array.from({ length: MARQUEE_BULB_COUNT }, (_, index) => (
        <span
          key={index}
          className="novex-login-stage__bulb"
          style={{ '--bulb-index': index } as CSSProperties}
        />
      ))}
    </div>
  )
}

/**
 * Planos (de atrás hacia delante):
 *   1. aro trasero completo          → plano medio
 *   2. personaje                     → primer plano, la cabeza cruza el filete
 *   3. arco inferior del aro (copia) → tapa el corte del busto
 */
export function LoginStageSpotlight({
  characterRef,
}: {
  /** Control del personaje (reaccionar al autenticarse). */
  characterRef?: Ref<NovexCharacterHandle>
}) {
  return (
    <div className="novex-login-stage__spotlight">
      <MarqueeRing plane="back" />
      <div className="novex-login-stage__character">
        <Suspense fallback={null}>
          <NovexCharacterFigure
            ref={characterRef}
            className="novex-login-stage__character-canvas"
            mood={LOGIN_CHARACTER_MOOD}
            eyeTracking
            autoBlink
            clickReaction={LOGIN_CLICK_REACTION}
          />
        </Suspense>
      </div>
      <MarqueeRing plane="front" />
    </div>
  )
}
