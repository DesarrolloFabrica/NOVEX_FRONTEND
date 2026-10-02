import { NOVEX_CHARACTER_REACTIONS } from '@/shared/character/novexCharacterRive'
import type { NovexCharacterReaction } from '@/shared/character/novexCharacterRive'

/**
 * Transición teatral post-login, sin React: la secuencia se prueba sola.
 *
 *   idle ──start──▶ reacting ──reaction-done──▶ closing ──curtains-closed──▶ covered
 *     ▲                                                                        │
 *     └──────curtains-opened────── opening ◀──────destination-mounted─────────┘
 *
 * `abort` (logout o fin externo de la transición) vuelve a `idle` desde cualquier fase.
 * Cualquier otro evento fuera de orden se ignora: así un evento repetido no
 * puede provocar una segunda navegación ni saltarse una fase.
 */
export type PostLoginTransitionPhase = 'idle' | 'reacting' | 'closing' | 'covered' | 'opening'

export type PostLoginTransitionEvent =
  | 'start'
  | 'reaction-done'
  | 'curtains-closed'
  | 'destination-mounted'
  | 'curtains-opened'
  | 'abort'

const NEXT_PHASE: Record<
  PostLoginTransitionPhase,
  Partial<Record<PostLoginTransitionEvent, PostLoginTransitionPhase>>
> = {
  idle: { start: 'reacting' },
  reacting: { 'reaction-done': 'closing' },
  closing: { 'curtains-closed': 'covered' },
  covered: { 'destination-mounted': 'opening' },
  opening: { 'curtains-opened': 'idle' },
}

export function postLoginTransitionReducer(
  phase: PostLoginTransitionPhase,
  event: PostLoginTransitionEvent,
): PostLoginTransitionPhase {
  if (event === 'abort') return 'idle'
  return NEXT_PHASE[phase][event] ?? phase
}

/** Reacción del personaje al autenticarse, y cuánto se espera antes de cerrar. */
export const POST_LOGIN_REACTION: NovexCharacterReaction = 'happy_1'
export const POST_LOGIN_REACTION_MS = NOVEX_CHARACTER_REACTIONS[POST_LOGIN_REACTION].durationMs

/**
 * Cuánto esperar antes de cerrar: la duración de la reacción solo si el
 * personaje la aceptó. Si aún no estaba listo (Rive sin cargar), no se espera
 * una reacción invisible: el cierre empieza de inmediato.
 */
export function reactionHoldMs(reactionAccepted: boolean): number {
  return reactionAccepted ? POST_LOGIN_REACTION_MS : 0
}

/**
 * Red de seguridad si el navegador no emite `transitionend` (pestaña oculta,
 * estilos no cargados): la secuencia avanza igualmente. No marca el ritmo normal.
 */
export const CURTAIN_SETTLE_FALLBACK_MS = 2500
export const DESTINATION_MOUNT_FALLBACK_MS = 6000

export type LoginCurtainsState = 'open' | 'closed' | 'retracted'

/**
 * Qué muestran las cortinas en cada fase.
 * - En /login sin transición: abiertas, enmarcando la escena.
 * - Fuera de /login sin transición: no se renderizan.
 * - En destino se retiran del todo (no al marco), para no desaparecer de golpe.
 */
export function curtainStateForPhase(
  phase: PostLoginTransitionPhase,
  onLoginRoute: boolean,
): LoginCurtainsState | null {
  switch (phase) {
    case 'idle':
      return onLoginRoute ? 'open' : null
    case 'reacting':
      return 'open'
    case 'closing':
    case 'covered':
      return 'closed'
    case 'opening':
      return 'retracted'
  }
}
