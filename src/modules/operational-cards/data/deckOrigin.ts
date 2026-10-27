/**
 * Posición del MAZO ORIGEN: dónde se planta la coordinación padre cuando su
 * mazo queda escogido y las demás abandonan la mesa.
 *
 * Función pura y en UNIDADES DE CARTA, el mismo sistema que usa el arco, porque
 * alimenta exactamente el mismo sitio: las variables `--x`, `--y` y `--rot` del
 * slot. Esa es la razón de que exista en lugar de resolverse con un transform
 * añadido sobre el nodo: el slot ya es la autoridad de posición de la mesa y lo
 * que cambia en modo mazo es SU GEOMETRÍA, no cuántas capas la empujan.
 *
 * El padre no viaja al centro ni se convierte en carta focal. Se coloca a la
 * izquierda de su columna, dejando libre todo lo que queda a su derecha: ese
 * hueco es la mano que aún no se ha repartido, y es lo que hace que la carta se
 * lea como origen de algo en vez de como una carta suelta en un espacio vacío.
 */

/**
 * Distancia del padre al centro de su columna, en anchos de carta.
 *
 * Negativo es hacia la izquierda. El valor sale de dos límites: pegado al borde
 * la carta pierde su condición de objeto sobre una mesa, y más al centro se come
 * el sitio del abanico. A 1,8 anchos quedan unos 70 px de margen a su izquierda
 * y cerca de cuatro anchos de carta libres a su derecha, que es donde se
 * desplegarán las cinco hijas.
 */
const ORIGIN_X = -1.8

/**
 * Inclinación del mazo, en grados.
 *
 * Pequeña y a la izquierda: mantiene la sensación de carta dejada sobre una
 * mesa y no de figura centrada. La carta observada endereza a la mitad su
 * rotación, así que el giro que se ve es la mitad de este.
 */
const ORIGIN_ROTATION = -4

export interface DeckOrigin {
  /** Centro de la carta, en anchos de carta desde el centro del escenario. */
  x: number
  /** Borde superior de la carta, en altos de carta desde el techo. */
  y: number
  /** Inclinación, en grados. */
  rotation: number
}

export interface DeckOriginInput {
  /**
   * Alto del escenario de la mesa, en altos de carta. El padre se centra
   * verticalmente en él, de modo que el mazo no se descuelga ni se pega al
   * techo cuando el escenario cambia de alto.
   */
  stageHeight: number
}

function round(value: number): number {
  return Number(value.toFixed(4))
}

export function resolveDeckOrigin({ stageHeight }: DeckOriginInput): DeckOrigin {
  // El escenario mide `stageHeight` altos de carta y la carta ocupa uno: lo que
  // sobra se reparte arriba y abajo. Si no sobra nada, se apoya en el techo.
  const slack = Math.max(stageHeight - 1, 0)

  return {
    x: ORIGIN_X,
    y: round(slack / 2),
    rotation: ORIGIN_ROTATION,
  }
}
