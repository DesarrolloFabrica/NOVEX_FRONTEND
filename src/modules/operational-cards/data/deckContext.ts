import type { OperationalCompositionMode } from '@/modules/operational-cards/data/compositionMode'

/**
 * QUÉ SE ESTÁ OBSERVANDO, resuelto contra la estructura de producto.
 *
 * Responde de una sola vez a las tres preguntas que la escena necesita —qué
 * composición toca, qué mazo está abierto y si lo observado es el padre o una de
 * sus hijas— y lo hace DERIVANDO, no guardando: la única fuente es el
 * `selectedCoordinationCode` que ya existe más la jerarquía declarada.
 *
 * Esa es la razón de que no haya un `selectedChildCode` ni un `openedDeckCode`
 * en el reducer. Con dos fuentes, la selección y el mazo abierto pueden
 * contradecirse —seleccionar una hija de otro padre, cerrar un mazo dejando
 * dentro la selección—; con una sola, ese estado imposible no existe.
 *
 * Sustituye al fallback provisional que mandaba cualquier code no principal a
 * la composición simple. Ese fallback se aceptó mientras ninguna hija era
 * seleccionable; ahora una hija CONOCIDA abre el mazo de su padre, que es lo que
 * significa estar dentro de él. Lo que sigue cayendo en el modo conservador es
 * un code realmente desconocido, y eso no ha cambiado.
 */

/** Lo mínimo que hace falta saber de un nodo principal: quiénes son sus hijas. */
export interface DeckContextNode {
  readonly children: readonly { readonly code: string }[]
}

/** Papel del code observado dentro del mazo abierto. */
export type DeckMemberRole = 'PARENT' | 'CHILD'

export interface DeckSelectionContext {
  mode: OperationalCompositionMode
  /**
   * Code del nodo principal cuyo mazo está abierto, o `null` si no hay mazo.
   *
   * Con una hija observada NO es el code seleccionado: es el de su padre, que
   * es quien sigue siendo el origen de la mano.
   */
  deckParentCode: string | null
  /** `PARENT` o `CHILD` cuando hay mazo; `null` en las demás composiciones. */
  memberRole: DeckMemberRole | null
}

export interface DeckSelectionContextInput {
  selectedCode: string | null
  /** Nodos PRINCIPALES por code. Las hijas no están aquí: no son principales. */
  nodesByCode: Readonly<Record<string, DeckContextNode>>
}

export function resolveDeckSelectionContext({
  selectedCode,
  nodesByCode,
}: DeckSelectionContextInput): DeckSelectionContext {
  if (!selectedCode) {
    return { mode: 'GLOBAL', deckParentCode: null, memberRole: null }
  }

  const node = nodesByCode[selectedCode]

  if (node) {
    return node.children.length > 0
      ? {
          mode: 'DECK_SELECTED',
          deckParentCode: selectedCode,
          memberRole: 'PARENT',
        }
      : { mode: 'SIMPLE_SELECTED', deckParentCode: null, memberRole: null }
  }

  /*
   * No es nodo principal. Puede ser una HIJA declarada —y entonces lo observado
   * está dentro del mazo de su padre, que sigue abierto— o un code que la
   * estructura de producto no reconoce.
   *
   * La búsqueda es lineal sobre nueve nodos con cinco hijas como mucho: no
   * merece un índice invertido que habría que mantener sincronizado.
   */
  for (const [parentCode, parent] of Object.entries(nodesByCode)) {
    if (parent.children.some((child) => child.code === selectedCode)) {
      return {
        mode: 'DECK_SELECTED',
        deckParentCode: parentCode,
        memberRole: 'CHILD',
      }
    }
  }

  /*
   * Code desconocido: ni principal ni hija declarada. Sigue cayendo en la
   * composición simple, que es el modo que menos promete —no abre un abanico de
   * hijas que no consta que existan y no niega que haya algo seleccionado—.
   * Aquí entran `coord-servicios`, que no tiene carta, y cualquier code que
   * LEVEL 0 no haya traído.
   */
  return { mode: 'SIMPLE_SELECTED', deckParentCode: null, memberRole: null }
}
