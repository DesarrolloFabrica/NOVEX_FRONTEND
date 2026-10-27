import { resolveDeckSelectionContext } from '@/modules/operational-cards/data/deckContext'

/**
 * MODO DE COMPOSICIÓN de la experiencia operacional.
 *
 * Responde a una sola pregunta —«¿qué está compuesto ahora mismo sobre la
 * mesa?»— y la responde con un valor explícito en lugar de dejar que cada capa
 * la deduzca por su cuenta:
 *
 *   GLOBAL           la mesa entera, sin nada bajo observación.
 *   SIMPLE_SELECTED  una coordinación observada que no es mazo.
 *   DECK_SELECTED    un mazo abierto, con el padre o una de sus hijas
 *                    observada: las dos cosas ocurren DENTRO del mismo mazo.
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
 * Lo ÚNICO que el modo necesita saber de un nodo de producto: quiénes son sus
 * hijas.
 *
 * Se pide esta forma mínima, y no el `ProductTableNode` completo, porque el
 * modo no debe poder mirar el estado, los problemas ni la identidad visual de
 * la coordinación: si pudiera, mañana alguien haría depender el modo de la
 * gravedad. `ProductTableNode` la satisface estructuralmente, así que la
 * experiencia pasa el mapa que ya tiene sin construir nada nuevo.
 */
export interface CompositionModeNode {
  readonly children: readonly { readonly code: string }[]
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

export function resolveCompositionMode(
  input: CompositionModeInput,
): OperationalCompositionMode {
  /*
   * Una sola resolución. El modo es la primera respuesta de un contexto más
   * amplio —qué mazo está abierto y si lo observado es el padre o una hija—, y
   * calcularlo aquí por separado crearía dos lógicas capaces de discrepar el día
   * que aparezca un caso nuevo.
   */
  return resolveDeckSelectionContext(input).mode
}
