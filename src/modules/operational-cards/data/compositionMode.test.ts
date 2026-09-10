import { describe, expect, it } from 'vitest'
import {
  resolveCompositionMode,
  type CompositionModeNode,
} from '@/modules/operational-cards/data/compositionMode'
import { PRODUCT_TOP_LEVEL } from '@/modules/operational-cards/data/productHierarchy'

/**
 * El modo se prueba contra la DECLARACIÓN REAL de producto, no contra un mapa
 * inventado para la prueba: si mañana Fábrica de Contenidos recibe hijas o
 * Operación Académica las pierde, estos tests cambian de resultado, que es
 * exactamente lo que debe pasar. Un fixture propio los dejaría verdes mientras
 * la mesa real dice otra cosa.
 */
const NODES: Readonly<Record<string, CompositionModeNode>> = Object.fromEntries(
  PRODUCT_TOP_LEVEL.map((declaration) => [
    declaration.code,
    { children: declaration.children },
  ]),
)

describe('resolveCompositionMode', () => {
  it('sin selección la composición es la mesa entera', () => {
    expect(
      resolveCompositionMode({ selectedCode: null, nodesByCode: NODES }),
    ).toBe('GLOBAL')
  })

  it('una coordinación sin hijas de producto compone una selección simple', () => {
    for (const code of [
      'coord-b2b',
      'coord-saber-pro',
      'coord-especializaciones',
    ]) {
      expect(
        resolveCompositionMode({ selectedCode: code, nodesByCode: NODES }),
      ).toBe('SIMPLE_SELECTED')
    }
  })

  it('Operación Académica compone un mazo', () => {
    expect(
      resolveCompositionMode({
        selectedCode: 'coord-operaciones-academicas',
        nodesByCode: NODES,
      }),
    ).toBe('DECK_SELECTED')
  })

  it('Servicio sale del modelo de producto, no de una excepción', () => {
    // El nodo «Servicio» se apoya en `coord-homologaciones`, que declara cero
    // hijas: cae en SIMPLE_SELECTED por el mismo camino que B2B. Su arte
    // prestado y su nombre de producto no intervienen en el modo.
    expect(
      resolveCompositionMode({
        selectedCode: 'coord-homologaciones',
        nodesByCode: NODES,
      }),
    ).toBe('SIMPLE_SELECTED')
  })

  it('Fábrica de Contenidos es mazo el día que declare hijas, sin tocar el resolver', () => {
    // Hoy declara cero.
    expect(
      resolveCompositionMode({
        selectedCode: 'coord-fabrica-contenidos',
        nodesByCode: NODES,
      }),
    ).toBe('SIMPLE_SELECTED')

    // El modo se decide por la estructura, no por una lista de codes: basta
    // que la declaración tenga hijas para que el mismo code sea mazo.
    expect(
      resolveCompositionMode({
        selectedCode: 'coord-fabrica-contenidos',
        nodesByCode: {
          ...NODES,
          'coord-fabrica-contenidos': { children: ['coord-futura'] },
        },
      }),
    ).toBe('DECK_SELECTED')
  })

  it('un code que no es nodo principal cae en el modo conservador', () => {
    // Las tres formas de llegar al fallback declarado. Ninguna es GLOBAL —hay
    // una selección viva— y ninguna es DECK_SELECTED —no se puede abrir un
    // abanico de hijas que no consta que existan—.
    for (const code of [
      'coord-ingenierias', // subordinación: todavía no seleccionable
      'coord-servicios', // fila legacy sin carta
      'coord-inexistente', // code que LEVEL 0 no trajo
    ]) {
      expect(
        resolveCompositionMode({ selectedCode: code, nodesByCode: NODES }),
      ).toBe('SIMPLE_SELECTED')
    }
  })

  it('un mapa vacío no convierte una selección en estado global', () => {
    // Un LEVEL 0 que no trajo ninguna fila deja la mesa sin nodos. Aun así,
    // «hay algo seleccionado» sigue siendo cierto.
    expect(
      resolveCompositionMode({ selectedCode: 'coord-b2b', nodesByCode: {} }),
    ).toBe('SIMPLE_SELECTED')
    expect(
      resolveCompositionMode({ selectedCode: null, nodesByCode: {} }),
    ).toBe('GLOBAL')
  })
})
