import type { CharacterOrientation } from '@/modules/operational-cards/types/character.types'

/**
 * Anclaje del panel de problemas a la carta seleccionada.
 *
 * Función pura y en UNIDADES DE CARTA, como el resto de la geometría de la
 * mesa: el panel se coloca respecto al mismo eje que las cartas, así que no
 * puede desalinearse de la que lo abre por mucho que cambie `--card-width`.
 *
 * El problema que resuelve tiene dos mitades que tiran en direcciones
 * contrarias. El panel debe leerse como CONECTADO a su carta, lo que pide
 * centrarlo justo debajo de ella; y no puede salirse del escenario, lo que
 * obliga a empujarlo hacia dentro cuando la carta está en un extremo. Se
 * resuelve separando las dos cosas: el CUERPO del panel se recorta contra el
 * escenario, y el PICO —la marca que apunta a la carta— se queda donde está la
 * carta. Así el panel entra siempre en pantalla sin dejar de señalar su origen.
 *
 * No decide alto, ni contenido, ni si el panel existe. Solo dónde cae.
 */

/**
 * Margen entre el pico y la esquina del panel, como fracción de su ancho.
 *
 * Sin él, seleccionar la primera o la última coordinación pone el pico justo
 * encima del radio de la esquina, donde deja de leerse como un pico y parece
 * un defecto de dibujo.
 */
const NOTCH_MARGIN = 0.1

export interface PanelAnchor {
  /**
   * Centro del panel, en anchos de carta desde el centro del escenario.
   *
   * Coincide con el de la carta salvo que hubiera que recortarlo contra el
   * borde del escenario.
   */
  x: number
  /**
   * Posición del pico dentro del panel, de 0 (borde izquierdo) a 1 (derecho).
   *
   * Es 0.5 mientras el panel cae centrado bajo su carta, y se desplaza hacia el
   * extremo cuando el recorte separa al panel de ella.
   */
  notch: number
  /**
   * Lado del escenario en el que vive la carta. Es la MISMA orientación que
   * usa el personaje, no una segunda clasificación: si el panel se apoyara en
   * su propio criterio, panel y personaje podrían discrepar sobre dónde está
   * la coordinación que ambos describen.
   */
  side: CharacterOrientation
  /** `true` cuando el borde del escenario ha movido el panel. */
  clamped: boolean
}

export interface PanelAnchorInput {
  /** Centro de la carta seleccionada, en anchos de carta. */
  slotX: number
  /** Lado de esa carta, tal y como lo publica el layout de la mesa. */
  orientation: CharacterOrientation
  /** Ancho del escenario de la mesa, en anchos de carta. */
  stageWidth: number
  /** Ancho del panel, en anchos de carta. */
  panelWidth: number
}

function round(value: number): number {
  return Number(value.toFixed(4))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function resolvePanelAnchor({
  slotX,
  orientation,
  stageWidth,
  panelWidth,
}: PanelAnchorInput): PanelAnchor {
  // Cuánto puede alejarse el centro del panel del centro del escenario sin que
  // ninguno de sus bordes se salga. Negativo significa que el panel es más
  // ancho que el escenario: entonces no hay recorte posible y se centra.
  const room = (stageWidth - panelWidth) / 2
  const x = room <= 0 ? 0 : clamp(slotX, -room, room)

  // El pico sigue a la CARTA aunque el cuerpo se haya movido.
  const notch = clamp(
    panelWidth > 0 ? 0.5 + (slotX - x) / panelWidth : 0.5,
    NOTCH_MARGIN,
    1 - NOTCH_MARGIN,
  )

  return {
    x: round(x),
    notch: round(notch),
    side: orientation,
    clamped: round(x) !== round(slotX),
  }
}
