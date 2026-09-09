import { deriveCharacterOrientation } from '@/modules/operational-cards/data/characterReaction'
import type { CharacterOrientation } from '@/modules/operational-cards/types/character.types'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'

/**
 * Geometría de la MESA OPERACIONAL en reposo, como función pura.
 *
 * Sustituye a la baraja de dos bandas rectas (`deckLayout`). El reparto lógico
 * se conserva —8 arriba, 7 abajo— pero cada banda deja de ser una fila y pasa
 * a ser un ARCO real: las cartas se solapan lateralmente, se elevan hacia los
 * extremos y se inclinan siguiendo la curva, como una baraja abierta sobre una
 * mesa.
 *
 * AUTORIDAD ÚNICA DE POSICIÓN. Esta función decide `x`, `y`, `rotation` y
 * `zIndex` de cada carta, y nadie más. `CoordinationCard` no sabe dónde está,
 * el contenedor no calcula nada y no hay animación de layout de Motion
 * disputándole el transform al CSS. Esa es la razón de que la mesa use
 * posicionamiento absoluto y no flex con márgenes negativos: en flujo, el
 * tamaño de una carta reordena a sus vecinas y el hover provocaría reflow.
 *
 * UNIDADES DE CARTA, NO PÍXELES. `x` se expresa en anchos de carta e `y` en
 * altos de carta, de modo que la geometría es independiente de la resolución:
 * el tamaño real vive en una sola variable CSS (`--card-width`) y el mismo
 * layout sirve a 1280, 1440 y 1920 sin recalcularse. También permite probar la
 * geometría sin DOM y sin medir nada.
 *
 * La usan a la vez la mesa —para renderizar— y la experiencia —para saber a
 * qué lado cae una carta y orientar al personaje—, así que posición visual y
 * reacción del personaje no pueden desincronizarse.
 *
 * El orden es siempre el `displayOrder` institucional. El estado operacional
 * NO influye en la posición: una coordinación crítica no se adelanta ni cambia
 * de arco. La memoria espacial está por encima de la urgencia visual.
 */

/**
 * Máximo de cartas por arco. Con los NUEVE nodos de producto da un solo arco.
 *
 * El 8 anterior existía para repartir quince coordinaciones iguales en dos
 * bandas. Esa premisa desapareció con la estructura organizacional: la mesa
 * muestra nueve mazos, no quince pares, y nueve caben en una sola curva. Un
 * arco además se lee como una mano de cartas, mientras que dos volvían a
 * leerse como dos filas.
 */
const MAX_PER_ARC = 9

/**
 * Solape lateral entre cartas contiguas, como fracción del ancho de carta.
 *
 * Es el parámetro que decide si la mesa se lee como baraja o como fila
 * separada. Se calibró mirando el arte real a 1440×900 con 25 %, 32 % y 40 %.
 *
 * Gana 25 % y el techo lo pone el arte, no el gusto: la cara ilustrada rotula
 * el nombre de la coordinación a lo ancho de toda la carta y centra la píldora
 * de estado en el pie, así que cada punto de solape se come literalmente letras
 * del nombre y milímetros del estado. A 32 % los nombres pierden la última
 * sílaba y las píldoras empiezan a recortarse; a 40 % ambas lecturas se rompen.
 * Si algún día el arte lleva la identidad al tercio izquierdo de la carta, 32 %
 * pasa a ser viable y devuelve unos 90 px de ancho.
 */
export const RESTING_OVERLAP = 0.25

/**
 * Solape vertical entre el arco superior y el inferior, como fracción del alto
 * de carta.
 *
 * El techo lo pone el ARTE, no el gusto. La cara ilustrada rotula el nombre en
 * su banda superior y la píldora de estado vive en el pie, así que el mordisco
 * entre arcos está atrapado entre dos límites: si el arco de abajo va delante
 * tapa la píldora del de arriba, y si va detrás pierde su propio nombre. Se
 * probó 0.42 y 0.28 y ambos sacrifican una de las dos lecturas; 0.10 deja las
 * quince píldoras y los quince nombres visibles a la vez.
 */
const VERTICAL_OVERLAP = 0.1

/**
 * Elevación de los extremos de cada arco, en altos de carta. El centro del
 * arco es el punto más bajo y los extremos suben: la curva se abre alrededor
 * del eje del personaje en lugar de taparlo.
 *
 * Con un solo arco la curva puede ser el DOBLE de profunda que con dos: el
 * alto que antes gastaba el segundo arco está libre, y una curva plana sobre
 * una sola fila se lee como una fila recta, que es justo lo que la mesa no
 * debe parecer.
 */
const ARC_RISE = 0.22

/** Inclinación de los extremos de cada arco, en grados. */
const ARC_TILT = 10

/**
 * Irregularidad de la mesa, en altos de carta y en grados.
 *
 * Una curva perfectamente matemática se lee como un gráfico, no como cartas
 * que alguien ha dejado sobre una mesa. Estos dos valores rompen la simetría
 * lo justo. NO son aleatorios: salen de un hash del índice, así que la mesa se
 * dibuja idéntica en cada render, en cada recarga y en cada máquina.
 */
const WOBBLE_Y = 0.018
const WOBBLE_TILT = 1.6

/**
 * Base de z por arco. El arco SUPERIOR va por delante del inferior.
 *
 * Es lo contrario de lo que pide la intuición —lo de abajo parece estar más
 * cerca— y se eligió por legibilidad, no por estética: la píldora de estado
 * vive en el pie de la carta, así que el arco que quede detrás pierde su
 * estado. Poniendo delante el de arriba, sus píldoras quedan libres y las del
 * inferior también, porque debajo de ellas no hay nada. Con el apilado natural
 * las OCHO cartas del arco superior comunicaban su integridad solo por el
 * aura, es decir solo por color, que es justo lo que la carta tiene prohibido.
 */
const Z_ARC_BASE = [30, 10] as const

/**
 * Proporción alto/ancho de la carta. Es la del arte original (196/148) y la
 * misma que fija `--card-height` en CSS; se repite aquí porque la sangría del
 * giro depende de ella y esta función no puede leer CSS.
 */
const CARD_ASPECT = 1.324

/**
 * Cuánto sobresale una carta girada `ARC_TILT` grados respecto a su caja sin
 * girar, por cada lado. Son DOS magnitudes distintas y en unidades distintas
 * —altos de carta arriba y abajo, anchos de carta a los lados—, así que no
 * pueden compartir constante:
 *
 *   alto girado  = ancho·senθ + alto·cosθ
 *   ancho girado = ancho·cosθ + alto·senθ
 */
const TILT_RADIANS = (ARC_TILT * Math.PI) / 180
const VERTICAL_BLEED =
  (Math.sin(TILT_RADIANS) / CARD_ASPECT + Math.cos(TILT_RADIANS) - 1) / 2
const HORIZONTAL_BLEED =
  (Math.cos(TILT_RADIANS) - 1 + CARD_ASPECT * Math.sin(TILT_RADIANS)) / 2

/**
 * Secuencia determinística en [-0.5, 0.5] a partir de un entero.
 *
 * Es un hash, no un generador aleatorio: la misma entrada da siempre la misma
 * salida, no depende del orden de render ni guarda estado. Se usa solo para
 * desordenar levemente la curva.
 */
function wobble(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value) - 0.5
}

export interface TableSlot {
  coordination: CoordinationOverview
  /** 0 = arco superior, 1 = arco inferior. */
  arc: number
  indexInArc: number
  arcSize: number
  /** Centro de la carta, en anchos de carta desde el centro del escenario. */
  x: number
  /** Borde superior de la carta, en altos de carta desde el techo. */
  y: number
  /** Inclinación, en grados. */
  rotation: number
  zIndex: number
  /** Lado del escenario en el que cae la carta. */
  orientation: CharacterOrientation
}

export interface TableLayout {
  /** En orden `displayOrder`: es también el orden del DOM y del tabulador. */
  slots: TableSlot[]
  /** Orientación por `code`, para no recorrer la mesa en cada render. */
  orientationByCode: Readonly<Record<string, CharacterOrientation>>
  /** Alto que necesita el escenario, en altos de carta. */
  stageHeight: number
  /** Ancho que ocupa el arco más ancho, en anchos de carta, con la sangría
   *  que añade la rotación de las cartas de los extremos. */
  stageWidth: number
  /** Solape aplicado. Se expone para que las pruebas no lo repliquen. */
  overlap: number
}

/** Reparte en arcos de como mucho `MAX_PER_ARC`; el de arriba se queda la extra. */
function splitIntoArcs<T>(items: readonly T[]): T[][] {
  if (items.length === 0) return []

  const arcCount = Math.ceil(items.length / MAX_PER_ARC)
  const arcs: T[][] = []
  let cursor = 0

  for (let arc = 0; arc < arcCount; arc += 1) {
    const size = Math.ceil((items.length - cursor) / (arcCount - arc))
    arcs.push(items.slice(cursor, cursor + size))
    cursor += size
  }

  return arcs
}

function round(value: number): number {
  return Number(value.toFixed(4))
}

/**
 * Cuánto cede la mesa bajo una coordinación abierta, en píxeles.
 *
 * Cuando un mazo con subordinaciones se abre hacia arriba, las demás cartas
 * bajan un poco para hacerle sitio. El desplazamiento decrece con la DISTANCIA
 * a la coordinación señalada: si todas bajaran igual, la mesa entera parecería
 * caerse, y lo que debe leerse es que cede localmente, justo alrededor del mazo
 * que se abre.
 *
 * Es lo ÚNICO que cambia en las demás cartas. Ni su x, ni su rotación, ni su
 * arco, ni su orden: la memoria espacial de la mesa es una regla congelada y
 * una coordinación nunca cambia de sitio, ni siquiera de forma temporal.
 */
export function resolveTableYield(distance: number): number {
  if (distance <= 0) return 0
  if (distance === 1) return 28
  if (distance === 2) return 22
  if (distance === 3) return 16
  return 10
}

export interface TableLayoutOptions {
  /** Carta que no se pinta porque vive en el área focal. */
  excludeCode?: string | null
  /** Solape lateral. Solo se pasa para comparar densidades. */
  overlap?: number
  /**
   * Ordenar por el `displayOrder` de la fila técnica. Es el comportamiento por
   * defecto, pero la mesa de PRODUCTO pasa `false`: llega ya en su propio orden
   * declarado, y el `displayOrder` de la base de datos no refleja el
   * organigrama —Bellas Artes es 3 y su padre Operación Académica es 8—, así
   * que reordenar aquí rompería la estructura.
   */
  sortByDisplayOrder?: boolean
}

export function buildTableLayout(
  coordinations: readonly CoordinationOverview[],
  options: TableLayoutOptions = {},
): TableLayout {
  const overlap = options.overlap ?? RESTING_OVERLAP

  const filtered = coordinations.filter(
    (coordination) => coordination.code !== options.excludeCode,
  )
  const ordered =
    options.sortByDisplayOrder === false
      ? [...filtered]
      : [...filtered].sort((left, right) => left.displayOrder - right.displayOrder)

  const orientationByCode: Record<string, CharacterOrientation> = {}
  const slots: TableSlot[] = []

  /** Avance entre cartas contiguas, en anchos de carta. */
  const pitch = 1 - overlap
  const arcs = splitIntoArcs(ordered)
  const spans = arcs.map((arcRows) => (arcRows.length - 1) * pitch + 1)
  const widest = spans.length > 0 ? Math.max(...spans) : 0

  /**
   * Media anchura del arco MÁS ANCHO. Es la referencia con la que se curvan
   * TODOS los arcos, y ahí está la diferencia entre dos abanicos concéntricos
   * y dos curvas independientes.
   *
   * Si cada arco se curvara con su propia media anchura, los dos subirían lo
   * mismo en sus extremos; pero como el inferior es más corto, su extremo cae
   * a la altura de una carta CENTRAL del superior y allí el solape vertical
   * real se dispara —medido: 21 %, con un nominal del 10 %—, tapando la
   * píldora de estado. Con una referencia común los dos arcos son porciones de
   * la misma parábola, el hueco entre ellos es constante y el solape real
   * coincide con el declarado.
   */
  const reference = widest / 2

  arcs.forEach((arcRows, arc) => {
    const arcSize = arcRows.length
    const span = spans[arc]

    // Base del arco: se sitúa de modo que la carta MÁS ALTA —la del extremo,
    // elevada `ARC_RISE` y girada— roce el techo del escenario sin salirse.
    // Por eso el margen superior es exactamente la sangría vertical del giro y
    // no un valor suelto.
    const arcBase = VERTICAL_BLEED + ARC_RISE + arc * (1 - VERTICAL_OVERLAP)

    arcRows.forEach((coordination, indexInArc) => {
      // Posición normalizada a [-1, 1]: negativa a la izquierda del centro.
      const t =
        arcSize <= 1 ? 0 : (indexInArc - (arcSize - 1) / 2) / ((arcSize - 1) / 2)

      const x = -span / 2 + 0.5 + indexInArc * pitch
      // Curvatura por posición ABSOLUTA, no por índice dentro del arco: es lo
      // que mantiene concéntricos los dos abanicos.
      const curve = reference > 0 ? x / reference : 0

      const seed = arc * 101 + indexInArc
      const orientation = deriveCharacterOrientation(indexInArc, arcSize)
      orientationByCode[coordination.code] = orientation

      slots.push({
        coordination,
        arc,
        indexInArc,
        arcSize,
        x: round(x),
        // Los extremos SUBEN: restar acerca la carta al techo.
        y: round(arcBase - ARC_RISE * curve * curve + wobble(seed) * WOBBLE_Y),
        rotation: round(ARC_TILT * t + wobble(seed + 977) * WOBBLE_TILT),
        zIndex: Z_ARC_BASE[Math.min(arc, Z_ARC_BASE.length - 1)] + indexInArc,
        orientation,
      })
    })
  })

  return {
    slots,
    orientationByCode,
    stageHeight: round(stageHeightOf(slots)),
    // Sangría horizontal de las cartas giradas de los extremos, a ambos lados.
    stageWidth: round(widest + 2 * HORIZONTAL_BLEED),
    overlap,
  }
}

/**
 * Alto del escenario: el borde inferior de la carta que más baja, más lo que
 * la rotación añade por debajo. Se calcula sobre los slots reales en vez de
 * con una fórmula cerrada, de modo que un reparto distinto de 8 + 7 —nueve
 * coordinaciones, o diecisiete— sigue reservando el alto correcto.
 */
function stageHeightOf(slots: readonly TableSlot[]): number {
  if (slots.length === 0) return 0
  const lowest = Math.max(...slots.map((slot) => slot.y))
  return lowest + 1 + VERTICAL_BLEED
}
