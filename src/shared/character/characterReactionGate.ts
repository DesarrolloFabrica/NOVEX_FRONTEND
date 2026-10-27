import { NOVEX_CHARACTER_REACTIONS } from '@/shared/character/novexCharacterRive'
import type { NovexCharacterReaction } from '@/shared/character/novexCharacterRive'

/**
 * Reacciones momentáneas del personaje, sin React: se prueban con un View Model
 * falso. El bloqueo vive en un ref compartido con el parpadeo.
 */

/** Lo mínimo del runtime que hace falta para disparar una reacción. */
export interface ReactionViewModel {
  trigger(path: string): { trigger(): void } | null
}

export interface ReactionLock {
  /** Instante (performance.now) hasta el que dura la reacción en curso. */
  current: number
}

/**
 * Dispara la reacción si no hay otra en curso. Devuelve si se disparó.
 * Durante la reacción, los clicks se ignoran; al terminar vuelve a estar disponible.
 */
export function playCharacterReaction(
  viewModel: ReactionViewModel | null | undefined,
  reaction: NovexCharacterReaction | undefined,
  lock: ReactionLock,
  now: number,
): boolean {
  if (!viewModel || !reaction) return false
  if (now < lock.current) return false

  const spec = NOVEX_CHARACTER_REACTIONS[reaction]
  const trigger = viewModel.trigger(spec.trigger)
  if (!trigger) return false

  lock.current = now + spec.durationMs
  trigger.trigger()
  return true
}

/** Margen tras una reacción antes de permitir un parpadeo (ms). */
export const BLINK_AFTER_REACTION_MS = 400

/**
 * Cuánto debe esperar un parpadeo que toca durante una reacción. 0 = puede parpadear ya.
 */
export function blinkPauseRemaining(lock: ReactionLock, now: number): number {
  const remaining = lock.current - now
  return remaining > 0 ? remaining + BLINK_AFTER_REACTION_MS : 0
}
