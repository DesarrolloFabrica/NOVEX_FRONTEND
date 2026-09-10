/**
 * MODO DE COMPOSICIÓN de la experiencia operacional.
 *
 * Responde a una sola pregunta —«¿qué está compuesto ahora mismo sobre la
 * mesa?»— y la responde con un valor explícito en lugar de dejar que cada capa
 * la deduzca por su cuenta:
 *
 *   GLOBAL           la mesa entera, sin nada bajo observación.
 *   SIMPLE_SELECTED  una coordinación observada que no es mazo.
 *   DECK_SELECTED    una coordinación observada que ES mazo de producto.
 *
 * NO ES ESTADO. Es una función de la selección que ya existe
 * (`selectedCoordinationCode`) y de la jerarquía de PRODUCTO que ya existe
 * (`productHierarchy`). Guardarlo en el reducer crearía una segunda fuente de
 * verdad que puede quedar desincronizada de la selección —el fallo clásico de
 * los modos: la selección dice una cosa y el modo otra—, así que se deriva en
 * cada render y no se persiste.
 *
 * La distinción simple/mazo sale ÚNICAMENTE de la estructura de producto. No
 * del número de problemas, no de LEVEL 1, no del DTO del backend —que sigue
 * siendo plano—, no del grafo de impactos y no de una lista de codes escrita
 * dentro de un componente visual. Por eso Fábrica de Contenidos, que hoy
 * declara cero hijas, resuelve a `SIMPLE_SELECTED` y pasará a `DECK_SELECTED`
 * sola el día que su declaración tenga hijas, sin tocar esta función.
 *
 * Servicio tampoco es una excepción aquí: el nodo se apoya en
 * `coord-homologaciones`, que declara cero hijas, así que cae en
 * `SIMPLE_SELECTED` por el mismo camino que B2B. `coord-servicios` no es nodo
 * de producto y por tanto no tiene modo propio.
 */

/**
 * Lo ÚNICO que el modo necesita saber de un nodo de producto: si tiene hijas.
 *
 * Se pide esta forma mínima, y no el `ProductTableNode` completo, porque el
 * modo no debe poder mirar el estado, los problemas ni la identidad visual de
 * la coordinación: si pudiera, mañana alguien haría depender el modo de la
 * gravedad. `ProductTableNode` la satisface estructuralmente, así que la
 * experiencia pasa el mapa que ya tiene sin construir nada nuevo.
 */
export interface CompositionModeNode {
  readonly children: readonly unknown[]
}

export type OperationalCompositionMode =
  | 'GLOBAL'
  | 'SIMPLE_SELECTED'
  | 'DECK_SELECTED'

export interface CompositionModeInput {
  /** `code` de la coordinación observada, o `null` en estado global. */
  selectedCode: string | null
  /**
   * Nodos PRINCIPALES de la mesa de producto, indexados por su `code`. Las
   * subordinaciones no están aquí: no son nodos principales.
   */
  nodesByCode: Readonly<Record<string, CompositionModeNode>>
}

export function resolveCompositionMode({
  selectedCode,
  nodesByCode,
}: CompositionModeInput): OperationalCompositionMode {
  if (!selectedCode) return 'GLOBAL'

  const node = nodesByCode[selectedCode]

  /*
   * FALLBACK DECLARADO: un code seleccionado que NO es nodo principal de la
   * mesa resuelve a `SIMPLE_SELECTED`, nunca a `GLOBAL` ni a `DECK_SELECTED`.
   *
   * Hay tres formas de llegar aquí: el code de una subordinación, el de una
   * fila legacy sin carta (`coord-servicios`) y un code que el backend no
   * trajo. En las tres hay una selección viva —hay panel, y la mesa ya se
   * declara `data-mode="selected"`—, así que devolver `GLOBAL` sería negar algo
   * que está ocurriendo y dejaría al layout componiendo la mesa global con un
   * panel abierto encima. Y `DECK_SELECTED` sería peor: abriría un abanico de
   * hijas que no sabemos que existan.
   *
   * `SIMPLE_SELECTED` es el modo conservador: es el que menos promete y el
   * único que no puede animar nada que no exista.
   *
   * Cuando las subordinaciones sean realmente seleccionables, este caso deja de
   * ser un fallback y pasa a ser una regla propia —una hija seleccionada
   * compone el mazo ABIERTO de su padre—, con su propio test. Hoy no se
   * implementa: ninguna hija es clickeable todavía.
   */
  if (!node) return 'SIMPLE_SELECTED'

  return node.children.length > 0 ? 'DECK_SELECTED' : 'SIMPLE_SELECTED'
}
