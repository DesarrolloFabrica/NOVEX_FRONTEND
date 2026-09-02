import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'

/**
 * Contrato del personaje de la Dirección de Operaciones.
 *
 * Describe únicamente el ESTADO que el personaje debe expresar, nunca cómo se
 * dibuja. No hay rutas de assets, ni formato, ni runtime de animación: el
 * componente futuro traduce este estado a lo que corresponda (sprite WebP,
 * SVG, marcador geométrico) y puede sustituir el arte sin tocar el contrato.
 */

/** Estado global, o de la coordinación activa si hay selección. */
export type CharacterStatus = OperationalIntegrityStatus

/** Hacia dónde mira. NEUTRAL es el reposo sin selección ni hover. */
export type CharacterOrientation = 'NEUTRAL' | 'LEFT' | 'RIGHT'

/** Nivel de interacción del usuario con las cartas. */
export type CharacterInteraction = 'IDLE' | 'HOVER' | 'SELECTED'

export interface CharacterPresentation {
  status: CharacterStatus
  orientation: CharacterOrientation
  interaction: CharacterInteraction
}

export const DEFAULT_CHARACTER_PRESENTATION: CharacterPresentation = {
  status: 'DESCONOCIDO',
  orientation: 'NEUTRAL',
  interaction: 'IDLE',
}
