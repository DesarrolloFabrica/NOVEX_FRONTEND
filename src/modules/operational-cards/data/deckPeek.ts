/**
 * Geometría de las subordinaciones que asoman detrás de un mazo.
 *
 * Función pura, en unidades de carta como el resto de la mesa, para que el
 * mazo se vea igual a 1280, 1440 y 1920 y para poder probarla sin DOM.
 *
 * El objetivo es que las cinco subordinaciones se lean como CINCO CARTAS
 * DETRÁS DE UNA CARTA, no como franjas de color. La primera implementación las
 * desplazaba solo hacia abajo, en pasos iguales, y el resultado era
 * exactamente eso: una escalera de bandas. Lo que las convierte en cartas es la
 * desalineación —cada una cae un poco a un lado y girada un poco distinto—,
 * porque es lo que deja ver una esquina y un borde propios en lugar de un
 * canto continuo.
 *
 * En REPOSO sigue siendo una baraja cerrada: los desplazamientos son de pocos
 * píxeles y no forman abanico. La apertura vive en `preview`, que se calcula
 * aquí mismo para que los dos estados salgan de la misma función pura y el CSS
 * solo tenga que elegir entre dos juegos de variables.
 */

/** Avance hacia abajo por carta, en altos de carta (~7,5 px a 1440). */
const PEEK_STEP_Y = 0.03

/** Amplitud del desvío lateral, en anchos de carta (~3-6 px a 1440). */
const PEEK_SWAY_X = 0.03

/** Amplitud del giro, en grados. */
const PEEK_SWAY_ROTATION = 1.7

/**
 * Reducción de tamaño por carta. Muy leve: la baraja se estrecha hacia el
 * fondo y eso da profundidad sin que las de atrás parezcan de otro tamaño.
 * No puede ser mayor, o se comería el avance vertical y los cantos volverían
 * a juntarse.
 */
const PEEK_STEP_SCALE = 0.006

/* ---------- Apertura de preview (hover y foco) ---------- */

/**
 * Escala de las hijas cuando la subbaraja se abre.
 *
 * El padre sigue siendo el protagonista, y la jerarquía se comunica primero por
 * tamaño. A 1440 esto da hijas de ~102 px de ancho: mini cartas reconocibles
 * que no compiten con los 189 px del padre.
 */
const PREVIEW_SCALE = 0.54

/**
 * Avance entre hijas al abrirse, en anchos de carta.
 *
 * Decide dos cosas a la vez: la anchura del abanico y cuánta carta deja ver
 * cada hija. Con 0.24 el avance son ~45 px sobre hijas de ~102 px, de modo que
 * cada una tapa a la siguiente algo más de la mitad y queda perceptible en
 * torno al 44 %: suficiente para reconocer el arte y la paleta, sin que ninguna
 * se lea como una carta suelta.
 */
const PREVIEW_PITCH = 0.278

/**
 * Altura a la que sube el borde superior de las hijas, en altos de carta.
 *
 * NEGATIVO: la subbaraja se abre HACIA ARRIBA, hacia el aire que queda entre la
 * mesa y el personaje. Hasta R4.1 se abría hacia abajo, que era seguro para las
 * vecinas pero no era el gesto buscado: lo que tiene que leerse es «sacar un
 * mazo de la mesa y abrir sus cartas», y eso ocurre hacia el observador, no
 * hacia el mantel.
 *
 * La magnitud NO es una preferencia estética, es una cota medida. Encima de la
 * mesa está la lectura institucional —el estado de la Dirección y su recuento
 * de coordinaciones— y la subbaraja no puede taparla. Midiendo en navegador, el
 * pie de ese bloque queda a 337 px en 1440x900 y a 373 px en 1920x1080,
 * mientras que el borde alto del mazo señalado —ya elevado— queda en 393 y 451.
 * El aire real es de 56 y 78 px, así que este valor deja el abanico 12 y 19 px
 * por debajo del resumen. Subirlo más lo tapa; ese aire no se gana aquí sino
 * subiendo el escenario del personaje, que es deuda de shell.
 *
 * Las hijas conservan su borde inferior por detrás del cuerpo del padre, de
 * modo que se leen como cartas que salen del mazo y no como una fila flotando
 * encima. La fracción visible de cada una la produce el solape entre ellas.
 */
const PREVIEW_RISE = -0.106

/**
 * Curvatura del abanico, en altos de carta. Abriéndose hacia arriba, el CENTRO
 * queda más alto y los extremos caen, como una mano de cartas sostenida.
 */
const PREVIEW_ARC = 0.062

/** Giro de los extremos del abanico, en grados. */
const PREVIEW_TILT = 13

/**
 * Secuencia determinística en [-0.5, 0.5]. Es un hash del índice, no un
 * generador aleatorio: el mazo se dibuja idéntico en cada render y en cada
 * máquina. Misma técnica que la irregularidad del arco.
 */
function wobble(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value) - 0.5
}

function round(value: number): number {
  return Number(value.toFixed(4))
}

export interface DeckPeek {
  /** 1 es la carta inmediatamente detrás del padre. */
  depth: number
  /** Desvío lateral, en anchos de carta. */
  x: number
  /** Desvío hacia abajo, en altos de carta. */
  y: number
  /** Giro, en grados. */
  rotation: number
  scale: number
  /** Siempre por debajo del padre, y en orden: la más profunda, más al fondo. */
  zIndex: number
  /**
   * Geometría con la subbaraja ABIERTA: es la que se aplica en hover y en foco.
   *
   * Se calcula aquí, junto a la de reposo, para que las dos salgan de la misma
   * función determinística y el CSS solo tenga que elegir entre dos juegos de
   * variables. Así la apertura no depende de estado de React ni de animación:
   * con `prefers-reduced-motion` se llega a la misma geometría final, solo sin
   * transición.
   */
  preview: {
    x: number
    y: number
    rotation: number
    scale: number
  }
}

/**
 * Las `count` subordinaciones, de la más cercana al padre a la más profunda.
 *
 * El eje Y avanza de forma monótona —la baraja engorda hacia abajo— mientras
 * que el lateral y el giro se desordenan con el hash. Un desvío lateral que
 * creciera también de forma monótona produciría una escalera diagonal, que es
 * igual de artificial que la vertical.
 */
export function buildDeckPeeks(count: number): DeckPeek[] {
  const centre = (count - 1) / 2

  return Array.from({ length: count }, (_unused, index) => {
    const depth = index + 1

    // Posición normalizada dentro del abanico abierto, en [-1, 1]. La usa solo
    // la geometría de preview: en reposo el orden que manda es la profundidad.
    const spread = count > 1 ? (index - centre) / centre : 0

    // El SIGNO alterna y la MAGNITUD la desordena el hash. Dejar también el
    // signo al hash salía mal en la práctica: con cinco cartas caía casi
    // siempre del mismo lado y la baraja volvía a leerse como un canto
    // continuo, sin esquinas propias. Alternando, cada carta enseña una
    // esquina distinta y se cuentan las cinco de un vistazo.
    const side = depth % 2 === 1 ? 1 : -1
    const sway = (0.55 + Math.abs(wobble(depth))) * PEEK_SWAY_X

    return {
      depth,
      x: round(side * sway),
      // El giro va en contrafase con el desvío: una carta corrida a la derecha
      // e inclinada a la izquierda es lo que se ve en una baraja mal cuadrada.
      y: round(depth * PEEK_STEP_Y),
      rotation: round(
        -side * (0.7 + Math.abs(wobble(depth + 57))) * PEEK_SWAY_ROTATION,
      ),
      scale: round(1 - depth * PEEK_STEP_SCALE),
      // Negativo: el padre está en 1 dentro del mazo y estas quedan detrás.
      zIndex: -depth,
      preview: {
        x: round((index - centre) * PREVIEW_PITCH),
        // Restar acerca la carta al techo: el centro del abanico es lo más alto.
        y: round(PREVIEW_RISE - PREVIEW_ARC * (1 - spread * spread)),
        rotation: round(PREVIEW_TILT * spread),
        scale: PREVIEW_SCALE,
      },
    }
  })
}
