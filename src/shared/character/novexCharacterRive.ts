/**
 * Contrato del arte exportado del personaje NOVEX. Fuente única para todo
 * componente que monte el `.riv` (Centro Operacional y login).
 *
 * Los tres nombres se verificaron contra `novex-character-v1.riv`: cambiarlos
 * aquí sin reexportar deja el canvas en blanco, porque Rive no encuentra el
 * artboard o la máquina.
 */
export const RIVE_SRC = '/rive/novex-character-v1.riv'
export const RIVE_ARTBOARD = 'character_main'
export const RIVE_STATE_MACHINE = 'CharacterSM'

/** Ruta del enum `mood` dentro de `CharacterVM`. */
export const RIVE_MOOD_PATH = 'mood'

/**
 * Mirada y parpadeo en `CharacterVM`, verificados en runtime contra el `.riv`:
 *
 *   lookX  number  +derecha / -izquierda   neutral 0
 *   lookY  number  +abajo   / -arriba      neutral 0
 *   blink  trigger un parpadeo de ~100–200 ms; el `.riv` NO parpadea solo
 *
 * El `.riv` no limita lookX/lookY: a ±20 la pupila toca el borde del ojo, a ±40
 * casi sale y desde ~60 desaparece. Tampoco interpola: el valor se aplica de golpe.
 */
export const RIVE_LOOK_X_PATH = 'lookX'
export const RIVE_LOOK_Y_PATH = 'lookY'
export const RIVE_BLINK_PATH = 'blink'

/**
 * Reacciones momentáneas, verificadas con los eventos de estado de `CharacterSM`:
 *
 *   approve     → estado `reaction_happy_1` (guiño con estrellas)   ~816 ms
 *   disapprove  → estado `reaction_sad_1`                            ~1017 ms
 *
 * Disparar el mismo trigger mientras su reacción corre NO la reinicia ni la
 * encola: Rive lo ignora. La duración se usa para bloquear clicks repetidos y
 * para pausar el parpadeo, que choca visualmente con el guiño.
 */
export const NOVEX_CHARACTER_REACTIONS = {
  happy_1: { trigger: 'approve', durationMs: 850 },
  sad_1: { trigger: 'disapprove', durationMs: 1050 },
} as const

export type NovexCharacterReaction = keyof typeof NOVEX_CHARACTER_REACTIONS

/** Proporción del artboard `character_main` (800 × 900). */
export const NOVEX_ARTBOARD_ASPECT = 800 / 900

/**
 * Silueta del personaje (pluma, cabello, cara y busto) en % del artboard, para
 * que el área clickeable sea el personaje y no la caja transparente del canvas.
 * Extraída del canal alfa del arte renderizado (unión de varias tomas del idle),
 * en franjas del 4 % de alto con ~0,75 % de margen.
 */
export const NOVEX_CHARACTER_SILHOUETTE = [
  [71, 0], [75.5, 0], [79.5, 6], [79.8, 10], [79.3, 14], [75.5, 18],
  [74.8, 22], [74.3, 26], [76.5, 30], [77, 34], [80, 38], [83.5, 42],
  [84.3, 46], [84.3, 50], [82.3, 54], [79.5, 58], [79.5, 62], [77.8, 66],
  [67.8, 70], [72.8, 74], [73.5, 78], [73.3, 82], [72.3, 86], [71, 90],
  [64.8, 94], [64.8, 96], [33, 96], [33, 94], [26.8, 90], [25.8, 86],
  [25.5, 82], [25.5, 78], [26.8, 74], [25.3, 70], [20.5, 66], [20, 62],
  [17.8, 58], [15.5, 54], [15.3, 50], [15.8, 46], [18.8, 42], [20, 38],
  [20, 34], [21.8, 30], [26.8, 26], [28.2, 22], [29.8, 18], [36.3, 14],
  [49.8, 10], [62.7, 6], [71, 2],
] as const

/** Límite de mirada por eje. Nunca se escribe un valor fuera de ±LOOK_LIMIT. */
export const NOVEX_LOOK_LIMIT = 18

/**
 * Centro visual de los ojos dentro del canvas, en fracciones de su caja
 * (Fit.Contain + BottomCenter). Medido sobre el arte: los ojos quedan algo por
 * encima del centro vertical del canvas.
 */
export const NOVEX_EYE_CENTER = { x: 0.5, y: 0.46 } as const
