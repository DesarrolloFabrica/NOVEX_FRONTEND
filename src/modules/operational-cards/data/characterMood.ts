import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'

/**
 * Traducción del estado operacional al `mood` del personaje de Rive.
 *
 * QUÉ EXPRESA EL PERSONAJE. Su cara responde a la coordinación OBSERVADA, no al
 * estado institucional de la Dirección. Son dos lecturas distintas y deliberadamente
 * separadas: el carril y el rótulo siguen hablando de la Dirección entera, mientras
 * la expresión acompaña a lo que el usuario está mirando en ese momento. Por eso
 * este mapeo NO parte de `directionStatus` ni del atributo `data-status`.
 *
 * Vive fuera del renderer, como `characterReaction`: el componente recibe un mood
 * ya resuelto y no sabe de coordinaciones. Así el mapeo se prueba sin navegador,
 * sin canvas y sin WebGL.
 */

/**
 * Valores REALES del enum `CharacterMood` del artboard, leídos del `.riv`
 * exportado en runtime (`useViewModelInstanceEnum('mood').values`):
 *
 *   ['unknown', 'sad_2', 'sad_1', 'happy_2', 'happy_1', 'neutral']
 *
 * Los literales se escriben aquí tal cual: si una reexportación los cambiara,
 * la escritura al View Model fallaría en silencio y este tipo es el único sitio
 * donde corregirlo.
 */
export type CharacterMood =
  | 'unknown'
  | 'sad_2'
  | 'sad_1'
  | 'happy_2'
  | 'happy_1'
  | 'neutral'

/** Reposo: sin coordinación observada el personaje no expresa gravedad. */
export const DEFAULT_CHARACTER_MOOD: CharacterMood = 'neutral'

/**
 * Estado de una coordinación → expresión.
 *
 * Se usan las intensidades ALTAS (`happy_2` / `sad_2`) porque `happy_1` y
 * `sad_1` quedan reservados para las reacciones momentáneas de una fase
 * posterior: si el estado persistente ocupara esos valores, una reacción no
 * tendría forma de distinguirse de la expresión de fondo.
 *
 * DESCONOCIDO cae en `neutral` a propósito. El enum tiene un valor `unknown`,
 * pero esta fase no lo usa: conectarlo exige decidir antes qué expresa la
 * ausencia de datos, y esa decisión es de producto. `neutral` es aquí la opción
 * conservadora —no afirma calma ni avería—, y queda anotada como deuda visible.
 */
export function mapCoordinationStatusToCharacterMood(
  status: OperationalIntegrityStatus,
): CharacterMood {
  switch (status) {
    case 'ESTABLE':
      return 'happy_2'
    case 'ALERTA':
      return 'neutral'
    case 'CRITICO':
      return 'sad_2'
    case 'DESCONOCIDO':
      return 'neutral'
  }
}

export interface CharacterMoodInput {
  /**
   * La coordinación observada, o `null` si no hay ninguna. Se pide solo el
   * `status` para que el mapeo no dependa del resto del DTO.
   */
  selectedCoordination: Pick<CoordinationOverview, 'status'> | null
}

/** Sin selección, reposo. Con selección, la expresión de esa coordinación. */
export function resolveCharacterMood({
  selectedCoordination,
}: CharacterMoodInput): CharacterMood {
  if (!selectedCoordination) return DEFAULT_CHARACTER_MOOD
  return mapCoordinationStatusToCharacterMood(selectedCoordination.status)
}
