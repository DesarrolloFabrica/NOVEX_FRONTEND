import {
  CHARACTER_HEART_COUNT,
  deriveCharacterHeartStates,
  isValidLifePoints,
  type CharacterHeartState,
} from '@/modules/operational-cards/data/characterLivesModel'

/**
 * TRANSICIÓN VISUAL de las vidas entre dos lecturas consecutivas.
 *
 * Única fuente: `previousLifePoints → nextLifePoints` del MISMO dueño. No se
 * deduce nada de la operación que la provocó (crear, resolver, editar
 * severidad…): manda el valor que devuelve el backend tras el refetch.
 *
 * Solo hay transición si:
 *   - el dueño (coordinación) es el mismo en las dos lecturas: cambiar de carta
 *     es cambiar de personaje, no ganar ni perder vidas;
 *   - los dos valores son válidos (0..10): null ↔ número es aparecer o pasar a
 *     «no disponible», nunca una ganancia ni una pérdida;
 *   - el valor cambia.
 *
 * Presentación pura: no se persiste ni entra en el estado global.
 */

export type CharacterLifeTransitionKind = 'gain' | 'loss' | 'none'

/**
 * Relleno de un corazón en MEDIOS (0 vacío, 1 mitad izquierda, 2 lleno). Es la
 * unidad con la que se describe qué parte aparece o desaparece.
 */
export type HeartFillUnits = 0 | 1 | 2

export interface CharacterHeartTransition {
  index: number
  from: CharacterHeartState
  to: CharacterHeartState
  /** Relleno que no cambia: el menor de los dos. */
  stableUnits: HeartFillUnits
  /** Tramo animado [stableUnits, changedUntil): lo que se pierde o se gana. */
  changedUntil: HeartFillUnits
  /** Retardo dentro de la secuencia escalonada. */
  delayMs: number
}

export interface CharacterLifeTransition {
  kind: CharacterLifeTransitionKind
  /** Una entrada por corazón (0..4); null si ese corazón no cambia. */
  hearts: readonly (CharacterHeartTransition | null)[]
}

/** Duraciones por corazón, dentro de los rangos de diseño (300–450 / 350–500). */
export const LIFE_LOSS_DURATION_MS = 420
export const LIFE_GAIN_DURATION_MS = 480
/** Escalón preferido entre corazones, y techo de la secuencia completa. */
export const LIFE_STAGGER_MS = 80
export const LIFE_SEQUENCE_MAX_MS = 700

export const NO_LIFE_TRANSITION: CharacterLifeTransition = {
  kind: 'none',
  hearts: Array.from({ length: CHARACTER_HEART_COUNT }, () => null),
}

const UNITS: Readonly<Record<CharacterHeartState, HeartFillUnits>> = {
  full: 2,
  half: 1,
  empty: 0,
  unknown: 0,
}

export function heartFillUnits(state: CharacterHeartState): HeartFillUnits {
  return UNITS[state]
}

/**
 * Escalón entre corazones: 80 ms salvo que la secuencia pasara del techo; con
 * muchos corazones el escalón se comprime para que el total no supere ~700 ms.
 */
export function lifeStaggerStep(
  changedHearts: number,
  durationMs: number,
): number {
  if (changedHearts <= 1) return 0
  const room = Math.max(0, LIFE_SEQUENCE_MAX_MS - durationMs)
  return Math.min(LIFE_STAGGER_MS, Math.floor(room / (changedHearts - 1)))
}

/** Duración total de la secuencia: último retardo + duración de un corazón. */
export function lifeTransitionTotalMs(transition: CharacterLifeTransition): number {
  if (transition.kind === 'none') return 0
  const duration =
    transition.kind === 'loss' ? LIFE_LOSS_DURATION_MS : LIFE_GAIN_DURATION_MS
  const lastDelay = Math.max(
    0,
    ...transition.hearts.map((heart) => heart?.delayMs ?? 0),
  )
  return lastDelay + duration
}

export function deriveCharacterLifeTransition(
  previousLifePoints: number | null,
  nextLifePoints: number | null,
): CharacterLifeTransition {
  if (
    !isValidLifePoints(previousLifePoints) ||
    !isValidLifePoints(nextLifePoints) ||
    previousLifePoints === nextLifePoints
  ) {
    return NO_LIFE_TRANSITION
  }

  const kind: CharacterLifeTransitionKind =
    nextLifePoints > previousLifePoints ? 'gain' : 'loss'
  const from = deriveCharacterHeartStates(previousLifePoints)
  const to = deriveCharacterHeartStates(nextLifePoints)

  const changed = from
    .map((state, index) => ({ index, from: state, to: to[index] }))
    .filter((heart) => heart.from !== heart.to)

  /*
   * Orden natural de la secuencia: la vida se vacía desde el final (de derecha
   * a izquierda) y se rellena desde el principio (de izquierda a derecha).
   */
  const ordered = kind === 'loss' ? [...changed].reverse() : changed
  const duration =
    kind === 'loss' ? LIFE_LOSS_DURATION_MS : LIFE_GAIN_DURATION_MS
  const step = lifeStaggerStep(ordered.length, duration)

  const hearts: (CharacterHeartTransition | null)[] = Array.from(
    { length: CHARACTER_HEART_COUNT },
    () => null,
  )
  ordered.forEach((heart, order) => {
    const fromUnits = heartFillUnits(heart.from)
    const toUnits = heartFillUnits(heart.to)
    hearts[heart.index] = {
      index: heart.index,
      from: heart.from,
      to: heart.to,
      stableUnits: Math.min(fromUnits, toUnits) as HeartFillUnits,
      changedUntil: Math.max(fromUnits, toUnits) as HeartFillUnits,
      delayMs: order * step,
    }
  })

  return { kind, hearts }
}

/** Instantánea de la última lectura vista, con su transición resultante. */
export interface CharacterLifeSnapshot {
  /** Dueño de las vidas (código de coordinación), o undefined si no se rastrea. */
  ownerKey: string | null | undefined
  lifePoints: number | null
  transition: CharacterLifeTransition
  /** Crece con cada lectura distinta: permite reiniciar la animación. */
  generation: number
}

export function initialCharacterLifeSnapshot(
  ownerKey: string | null | undefined,
  lifePoints: number | null,
): CharacterLifeSnapshot {
  return { ownerKey, lifePoints, transition: NO_LIFE_TRANSITION, generation: 0 }
}

/**
 * Avanza la instantánea con una lectura nueva. Devuelve la MISMA instancia si
 * nada cambió, para que el hook no provoque renders de más.
 *
 * Con un dueño distinto (o sin dueño rastreable) la lectura nueva reemplaza a
 * la anterior SIN transición.
 */
export function advanceCharacterLifeSnapshot(
  previous: CharacterLifeSnapshot,
  ownerKey: string | null | undefined,
  lifePoints: number | null,
): CharacterLifeSnapshot {
  if (previous.ownerKey === ownerKey && previous.lifePoints === lifePoints) {
    return previous
  }

  const sameOwner =
    typeof ownerKey === 'string' && previous.ownerKey === ownerKey

  return {
    ownerKey,
    lifePoints,
    transition: sameOwner
      ? deriveCharacterLifeTransition(previous.lifePoints, lifePoints)
      : NO_LIFE_TRANSITION,
    generation: previous.generation + 1,
  }
}
