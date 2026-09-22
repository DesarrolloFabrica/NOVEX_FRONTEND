import type {
  CharacterInteraction,
  CharacterOrientation,
  CharacterPresentation,
} from '@/modules/operational-cards/types/character.types'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'

/**
 * Traducción de la interacción del usuario al contrato del personaje.
 *
 * Vive FUERA del renderer: el personaje nunca conoce coordinaciones ni
 * selección, solo recibe `status`, `orientation` e `interaction`. Así el SVG
 * provisional puede sustituirse por el arte definitivo (Illustrator → Rive)
 * sin tocar la lógica de selección.
 *
 * El `status` que se lee bajo el personaje acompaña a lo OBSERVADO: con una
 * coordinación seleccionada es el de esa área; sin selección (reposo o hover)
 * vuelve al estado institucional de la Dirección.
 */

/** Fracción del ancho de banda alrededor del centro que se considera frontal. */
const NEUTRAL_BAND = 0.25

/**
 * Orientación a partir de la posición REAL de la carta dentro de su banda, no
 * de su nombre ni de un mapa fijo. `indexInBand` 0 es el extremo izquierdo.
 */
export function deriveCharacterOrientation(
  indexInBand: number,
  bandSize: number,
): CharacterOrientation {
  if (bandSize <= 1) return 'NEUTRAL'

  // Posición normalizada a [-1, 1]: negativa a la izquierda del centro.
  const offset = (indexInBand - (bandSize - 1) / 2) / ((bandSize - 1) / 2)

  if (Math.abs(offset) <= NEUTRAL_BAND) return 'NEUTRAL'
  return offset < 0 ? 'LEFT' : 'RIGHT'
}

export interface CharacterReactionInput {
  /** Estado institucional. Fuente del `status` sin selección activa. */
  directionStatus: OperationalIntegrityStatus
  /**
   * Estado de la coordinación seleccionada. Solo se usa con `selecting`; el
   * hover no lo sustituye —mirar una carta no cambia el rótulo.
   */
  selectedStatus?: OperationalIntegrityStatus | null
  /** Orientación derivada de la carta activa o, si no hay, de la del hover. */
  orientation: CharacterOrientation
  hovering: boolean
  selecting: boolean
}

export function buildCharacterPresentation(
  input: CharacterReactionInput,
): CharacterPresentation {
  const interaction: CharacterInteraction = input.selecting
    ? 'SELECTED'
    : input.hovering
      ? 'HOVER'
      : 'IDLE'

  return {
    status:
      interaction === 'SELECTED' && input.selectedStatus
        ? input.selectedStatus
        : input.directionStatus,
    orientation: interaction === 'IDLE' ? 'NEUTRAL' : input.orientation,
    interaction,
  }
}
