/**
 * Modelo de las VIDAS del personaje operacional: traduce `lifePoints` (0..10,
 * o null) a cinco corazones.
 *
 * Vive fuera del componente, como `characterMood`, para que la regla se pruebe
 * sin render. No conoce coordinaciones, roles, mood ni reacciones: recibe un
 * número ya entregado por el backend y nunca lo recalcula.
 *
 * Es exclusivo del personaje del Centro Operacional. NO va en
 * `shared/character`: el personaje del login no tiene vidas.
 */

export type CharacterHeartState = 'full' | 'half' | 'empty' | 'unknown'

export const CHARACTER_HEART_COUNT = 5
export const LIFE_POINTS_PER_HEART = 2
export const MAX_CHARACTER_LIFE_POINTS =
  CHARACTER_HEART_COUNT * LIFE_POINTS_PER_HEART

/** Entero en 0..MAX. Cualquier otra cosa es «no disponible», nunca un valor cercano. */
export function isValidLifePoints(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_CHARACTER_LIFE_POINTS
  )
}

/**
 * Cada corazón vale dos puntos y se llena de izquierda a derecha:
 *
 *   restante = lifePoints − índice·2
 *   restante ≥ 2 → full · restante = 1 → half · restante ≤ 0 → empty
 *
 * null o inválido → cinco `unknown`. No se satura ni se redondea: un 11 o un
 * 7.5 son un contrato roto, no «casi lleno».
 *
 * El orden es estable (índice 0 = primer corazón), de modo que una animación
 * futura pueda comparar corazón a corazón dos lecturas consecutivas.
 */
export function deriveCharacterHeartStates(
  lifePoints: number | null,
): readonly CharacterHeartState[] {
  const valid = isValidLifePoints(lifePoints)

  return Array.from({ length: CHARACTER_HEART_COUNT }, (_unused, index) => {
    if (!valid) return 'unknown'
    const remaining = lifePoints - index * LIFE_POINTS_PER_HEART
    if (remaining >= LIFE_POINTS_PER_HEART) return 'full'
    if (remaining === 1) return 'half'
    return 'empty'
  })
}

/** Lectura visible y discreta: `7 / 10`, o `— / 10` si no hay dato. */
export function formatCharacterLivesValue(lifePoints: number | null): string {
  const shown = isValidLifePoints(lifePoints) ? String(lifePoints) : '—'
  return `${shown} / ${MAX_CHARACTER_LIFE_POINTS}`
}

/** Nombre accesible del conjunto de corazones. */
export function describeCharacterLives(lifePoints: number | null): string {
  return isValidLifePoints(lifePoints)
    ? `Vidas del personaje: ${lifePoints} de ${MAX_CHARACTER_LIFE_POINTS} puntos`
    : 'Vidas del personaje: estado no disponible'
}
