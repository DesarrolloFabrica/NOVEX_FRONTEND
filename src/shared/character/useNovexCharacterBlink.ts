import { useEffect } from 'react'
import type { Rive } from '@rive-app/react-webgl2'
import { nextBlinkDelay } from '@/shared/character/characterGaze'
import { blinkPauseRemaining } from '@/shared/character/characterReactionGate'
import type { ReactionLock } from '@/shared/character/characterReactionGate'
import { RIVE_BLINK_PATH } from '@/shared/character/novexCharacterRive'

/** Espera entre parpadeos, aleatoria en este rango (ms). */
const BLINK_MIN_DELAY_MS = 3000
const BLINK_MAX_DELAY_MS = 6000

/**
 * Parpadeo automático: el `.riv` no parpadea solo, hay que disparar `blink`.
 *
 * Cadena de timeouts con espera aleatoria (no setInterval): cada parpadeo
 * programa el siguiente. Con la pestaña oculta no se dispara, pero la cadena
 * sigue. Si toca durante una reacción (`reactionLock`), se aplaza hasta que
 * termine: el parpadeo y el guiño de `reaction_happy_1` chocan visualmente.
 */
export function useNovexCharacterBlink(
  rive: Rive | null,
  enabled: boolean,
  reactionLock?: ReactionLock,
) {
  useEffect(() => {
    if (!enabled || !rive) return

    const blink = rive.viewModelInstance?.trigger(RIVE_BLINK_PATH) ?? null
    if (!blink) return

    let disposed = false
    let timer = 0

    const fire = () => {
      if (disposed) return
      const pause = reactionLock ? blinkPauseRemaining(reactionLock, performance.now()) : 0
      if (pause > 0) {
        timer = window.setTimeout(fire, pause)
        return
      }
      if (document.visibilityState === 'visible') blink.trigger()
      schedule()
    }

    const schedule = () => {
      timer = window.setTimeout(fire, nextBlinkDelay(BLINK_MIN_DELAY_MS, BLINK_MAX_DELAY_MS))
    }

    schedule()

    return () => {
      disposed = true
      window.clearTimeout(timer)
    }
  }, [rive, enabled, reactionLock])
}
