import { describe, expect, it } from 'vitest'
import {
  resolveDeckSelectionContext,
  type DeckContextNode,
} from '@/modules/operational-cards/data/deckContext'
import { PRODUCT_TOP_LEVEL } from '@/modules/operational-cards/data/productHierarchy'

/**
 * Se prueba contra la DECLARACIÓN REAL de producto: si mañana cambian las hijas
 * de Operación Académica o aparece otro mazo, estas pruebas cambian de resultado,
 * que es exactamente lo que debe pasar.
 */
const NODES: Readonly<Record<string, DeckContextNode>> = Object.fromEntries(
  PRODUCT_TOP_LEVEL.map((declaration) => [
    declaration.code,
    { children: declaration.children.map((child) => ({ code: child.code })) },
  ]),
)

const PARENT = 'coord-operaciones-academicas'

describe('resolveDeckSelectionContext', () => {
  it('sin selección no hay mazo abierto', () => {
    expect(
      resolveDeckSelectionContext({ selectedCode: null, nodesByCode: NODES }),
    ).toEqual({ mode: 'GLOBAL', deckParentCode: null, memberRole: null })
  })

  it('una coordinación simple no abre ningún mazo', () => {
    expect(
      resolveDeckSelectionContext({
        selectedCode: 'coord-b2b',
        nodesByCode: NODES,
      }),
    ).toEqual({
      mode: 'SIMPLE_SELECTED',
      deckParentCode: null,
      memberRole: null,
    })
  })

  it('el padre observado abre su propio mazo', () => {
    expect(
      resolveDeckSelectionContext({
        selectedCode: PARENT,
        nodesByCode: NODES,
      }),
    ).toEqual({
      mode: 'DECK_SELECTED',
      deckParentCode: PARENT,
      memberRole: 'PARENT',
    })
  })

  it('una HIJA observada mantiene abierto el mazo de su padre', () => {
    // Es el cambio que trae la mano interactiva: antes una hija caía en la
    // composición simple, que habría cerrado el abanico desde el que se acaba
    // de pulsar.
    for (const child of [
      'coord-bellas-artes',
      'coord-empresarial',
      'coord-ingenierias',
      'coord-transversales',
      'coord-negocios',
    ]) {
      expect(
        resolveDeckSelectionContext({
          selectedCode: child,
          nodesByCode: NODES,
        }),
        `${child} debe abrir el mazo de su padre`,
      ).toEqual({
        mode: 'DECK_SELECTED',
        deckParentCode: PARENT,
        memberRole: 'CHILD',
      })
    }
  })

  it('el padre del mazo sale de la DECLARACIÓN, no del code de la hija', () => {
    // Nada en `coord-negocios` dice quién es su padre: el parentesco solo
    // existe en la estructura de producto. Si alguien lo dedujera del nombre o
    // del prefijo del code, esta prueba seguiría verde y la mesa se rompería
    // con la primera hija que no siguiera el patrón.
    const moved: Readonly<Record<string, DeckContextNode>> = {
      ...NODES,
      [PARENT]: { children: [] },
      'coord-b2b': { children: [{ code: 'coord-negocios' }] },
    }

    expect(
      resolveDeckSelectionContext({
        selectedCode: 'coord-negocios',
        nodesByCode: moved,
      }),
    ).toEqual({
      mode: 'DECK_SELECTED',
      deckParentCode: 'coord-b2b',
      memberRole: 'CHILD',
    })
  })

  it('un code desconocido NO se convierte en hija de nadie', () => {
    // La política defensiva se mantiene: solo una hija DECLARADA abre un mazo.
    // Un code que la estructura no reconoce sigue cayendo en el modo que menos
    // promete, sin inventar un parentesco.
    for (const code of ['coord-servicios', 'coord-inexistente']) {
      expect(
        resolveDeckSelectionContext({ selectedCode: code, nodesByCode: NODES }),
      ).toEqual({
        mode: 'SIMPLE_SELECTED',
        deckParentCode: null,
        memberRole: null,
      })
    }
  })

  it('sin nodos, una selección viva no se convierte en estado global', () => {
    expect(
      resolveDeckSelectionContext({
        selectedCode: 'coord-ingenierias',
        nodesByCode: {},
      }).mode,
    ).toBe('SIMPLE_SELECTED')
  })
})
