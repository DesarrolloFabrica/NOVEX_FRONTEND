import { NOVEX_CHARACTER_REACTIONS } from '@/shared/character/novexCharacterRive'
import type { NovexCharacterReaction } from '@/shared/character/novexCharacterRive'

/**
 * Transición de entrada post-login (obturador con sello NOVEX), sin React:
 * la secuencia se prueba sola.
 *
 *   idle ──start──▶ reacting ──reaction-done──▶ closing ──cover-closed──▶ covered
 *     ▲                                                                    │
 *     └──────cover-opened────── opening ◀──────destination-mounted─────────┘
 *
 * `abort` (logout o fin externo de la transición) vuelve a `idle` desde cualquier fase.
 * Cualquier otro evento fuera de orden se ignora: así un evento repetido no
 * puede provocar una segunda navegación ni saltarse una fase.
 */
export type PostLoginTransitionPhase = 'idle' | 'reacting' | 'closing' | 'covered' | 'opening'

export type PostLoginTransitionEvent =
  | 'start'
  | 'reaction-done'
  | 'cover-closed'
  | 'destination-mounted'
  | 'cover-opened'
  | 'abort'

const NEXT_PHASE: Record<
  PostLoginTransitionPhase,
  Partial<Record<PostLoginTransitionEvent, PostLoginTransitionPhase>>
> = {
  idle: { start: 'reacting' },
  reacting: { 'reaction-done': 'closing' },
  closing: { 'cover-closed': 'covered' },
  covered: { 'destination-mounted': 'opening' },
  opening: { 'cover-opened': 'idle' },
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
export const COVER_SETTLE_FALLBACK_MS = 2500
export const DESTINATION_MOUNT_FALLBACK_MS = 6000

/**
 * Tiempo mínimo con la pantalla cubierta antes de abrir: el sello NOVEX y la
 * barra de carga terminan su entrada y la ruta destino tiene margen para pintar.
 */
export const COVER_MIN_HOLD_MS = 900

/**
 * Cuánto falta para abrir, medido desde que la pantalla quedó cubierta.
 * Nunca negativo: si el destino tardó más que el mínimo, se abre ya.
 */
export function remainingCoverHoldMs(coveredAt: number, now: number): number {
  return Math.max(0, COVER_MIN_HOLD_MS - (now - coveredAt))
}

export type EntryCoverState = 'open' | 'closed' | 'retracted'

/**
 * Estado del obturador en cada fase.
 * - `open`: hojas fuera de pantalla (en /login, listas para cerrar).
 * - `closed`: las dos hojas se encuentran en el centro y cubren el viewport.
 * - `retracted`: se separan (arriba y abajo) y descubren el destino.
 * Fuera de /login y sin transición no se renderiza.
 */
export function coverStateForPhase(
  phase: PostLoginTransitionPhase,
  onLoginRoute: boolean,
): EntryCoverState | null {
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
