import { resolveDeckOrigin } from '@/modules/operational-cards/data/deckOrigin'

/**
 * Geometría de la MANO: dónde cae cada hija cuando el mazo se abre.
 *
 * Función pura y en UNIDADES DE CARTA, como el arco y como el mazo origen, y
 * por la misma razón medida dos veces en fases anteriores: si las posiciones se
 * dedujeran del ancho del contenedor, la apertura llegaría a un destino
 * calculado con la columna ANTERIOR, porque la columna cambia en el mismo
 * fotograma en que el mazo se abre. Aquí no hay nada que leer del DOM.
 *
 * La mano sale del mazo y se abre hacia el centro: la primera hija arranca a la
 * derecha del padre y las demás se escalonan con solape, girando
 * progresivamente y describiendo una curva suave. Es la misma idea que el arco
 * de la mesa, pero al revés —aquí la carta central es la más alta, como en una
 * mano sostenida por debajo— para que las dos formas no se confundan.
 *
 * El orden es el DECLARADO por producto y nunca cambia: la hija número tres es
 * siempre la tercera de la mano, esté seleccionada o no. Seleccionar cambia
 * cómo se presenta una carta, jamás dónde está.
 */

/**
 * Tamaño de una hija respecto a la carta normal.
 *
 * El padre debe seguir dominando la escena —es el mazo del que salen— pero una
 * hija no puede convertirse en miniatura: tiene que dejar reconocer el arte,
 * leer el nombre y el estado, y ser cómoda de pulsar. A 0,86 la hija mide unos
 * 162 px de ancho a 1440, por encima de los 141 px que ya se aprobaron para las
 * nueve cartas de la mesa comprimida.
 */
const CHILD_SCALE = 0.86

/**
 * Solape entre hijas contiguas, como fracción del ancho de UNA HIJA.
 *
 * Bastante menos que el 25 % del arco, y el techo lo pone el ARTE igual que en
 * la mesa: el nombre va rotulado a lo ancho de la carta, así que cada punto de
 * solape se come letras. Medido a 1440 con cinco hijas: al 26 % se perdían los
 * finales de «TRANSFORMACIÓN EMPRESARIAL», «INGENIERÍAS» y «NEGOCIOS»; al 18 %
 * los cinco nombres se leen y la mano sigue cabiendo en la columna con holgura.
 */
const CHILD_OVERLAP = 0.18

/** Hueco entre el borde derecho del padre y la primera hija, en anchos de carta. */
const HAND_GAP = 0.2

/** Inclinación del extremo de la mano, en grados. */
const FAN_TILT = 9

/** Cuánto sube la carta central respecto a los extremos, en altos de carta. */
const FAN_RISE = 0.1

export interface DeckFanSlot {
  /** Índice declarado dentro de la mano. Es también el orden del DOM. */
  index: number
  /** Centro de la carta, en anchos de carta desde el centro del escenario. */
  x: number
  /** Borde superior de la carta, en altos de carta desde el techo. */
  y: number
  /** Inclinación, en grados. */
  rotation: number
  /** Tamaño respecto a la carta normal. */
  scale: number
  /**
   * Apilado dentro de la mano: cada hija pasa por delante de la anterior, como
   * una baraja que se abre de izquierda a derecha.
   */
  zIndex: number
}

export interface DeckFanLayout {
  slots: DeckFanSlot[]
  /**
   * De dónde salen las cartas: la posición del mazo.
   *
   * Se devuelve junto a la mano para que el reparto arranque EXACTAMENTE del
   * padre. Si la animación partiera de un punto propio, mover el mazo dejaría a
   * las hijas saliendo de un sitio donde ya no hay nada.
   */
  origin: { x: number; y: number; rotation: number }
  /** Tamaño de hija aplicado. Se expone para que las pruebas no lo repliquen. */
  scale: number
  /** Borde derecho de la mano, en anchos de carta: lo que ocupa en la columna. */
  rightEdge: number
}

export interface DeckFanLayoutInput {
  /** Cuántas hijas declara el padre. */
  count: number
  /** Alto del escenario, en altos de carta: la mano se centra en él. */
  stageHeight: number
}

/** Base de z de la mano. Por debajo de la carta observada y del hover. */
const Z_FAN_BASE = 40

function round(value: number): number {
  return Number(value.toFixed(4))
}

export function buildDeckFanLayout({
  count,
  stageHeight,
}: DeckFanLayoutInput): DeckFanLayout {
  const origin = resolveDeckOrigin({ stageHeight })

  if (count <= 0) {
    return { slots: [], origin, scale: CHILD_SCALE, rightEdge: 0 }
  }

  const childWidth = CHILD_SCALE
  const childHeight = CHILD_SCALE
  const pitch = childWidth * (1 - CHILD_OVERLAP)

  // La mano empieza pasado el borde derecho del padre, que ocupa un ancho de
  // carta completo centrado en su x.
  const firstCentre = origin.x + 0.5 + HAND_GAP + childWidth / 2

  /** La hija se centra verticalmente en el escenario, como el propio mazo. */
  const base = Math.max(stageHeight - childHeight, 0) / 2

  const slots: DeckFanSlot[] = []

  for (let index = 0; index < count; index += 1) {
    // Posición normalizada a [-1, 1]: negativa en la mitad izquierda.
    const t = count <= 1 ? 0 : (index - (count - 1) / 2) / ((count - 1) / 2)

    slots.push({
      index,
      x: round(firstCentre + index * pitch),
      // La central es la más alta: restar acerca la carta al techo.
      y: round(base + FAN_RISE * t * t - FAN_RISE),
      rotation: round(FAN_TILT * t),
      scale: CHILD_SCALE,
      zIndex: Z_FAN_BASE + index,
    })
  }

  return {
    slots,
    origin,
    scale: CHILD_SCALE,
    rightEdge: round(slots[slots.length - 1].x + childWidth / 2),
  }
}
