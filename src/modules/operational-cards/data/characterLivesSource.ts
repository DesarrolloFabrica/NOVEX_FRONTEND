import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'

/**
 * DE DÓNDE salen las vidas que muestra el personaje del Centro Operacional.
 *
 * Vive fuera del shell, como `characterMood`, para que la regla se pruebe sin
 * render. No calcula vidas: elige QUÉ coordinación representa el personaje y
 * entrega su `lifePoints` tal como lo dio el backend.
 */

/**
 * Coordinación que representa el personaje.
 *
 *   COORDINADOR     siempre su coordinación ASIGNADA, aunque la selección
 *                   apunte a otra (p. ej. al abrir un reporte propio en otra
 *                   área desde «Mis reportes»).
 *   resto de roles  la coordinación SELECCIONADA en la mesa, o ninguna.
 */
export function resolveCharacterCoordination<
  T extends Pick<CoordinationOverview, 'code'>,
>(input: {
  isCoordinator: boolean
  assignedCoordination: T | null
  selectedCoordination: T | null
}): T | null {
  return input.isCoordinator
    ? input.assignedCoordination
    : input.selectedCoordination
}

export interface CharacterLivesSource {
  /** Hay una coordinación representada: las vidas se muestran. */
  showLives: boolean
  /** Sus puntos, o null. Con `showLives` y null se muestran como UNKNOWN. */
  lifePoints: number | null
  /**
   * Dueño de las vidas: el código de la coordinación representada. Solo se
   * anima un cambio de puntos del MISMO dueño; cambiar de carta no es ganar ni
   * perder vidas.
   */
  ownerKey: string | null
}

/**
 * Sin coordinación representada → vidas OCULTAS (no hay de quién hablar).
 * Con coordinación pero `lifePoints` null → vidas VISIBLES en UNKNOWN: el
 * backend no pudo calcularlas, y ocultarlas lo confundiría con «sin selección».
 */
export function resolveCharacterLives(
  characterCoordination: Pick<CoordinationOverview, 'code' | 'lifePoints'> | null,
): CharacterLivesSource {
  return {
    showLives: characterCoordination !== null,
    lifePoints: characterCoordination?.lifePoints ?? null,
    ownerKey: characterCoordination?.code ?? null,
  }
}
