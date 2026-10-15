import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { OperationalCardExperience } from '@/modules/operational-cards/experience/OperationalCardExperience'
import type { OperationalCardsController } from '@/modules/operational-cards/hooks/useOperationalOverview'
import type {
  CoordinationOverview,
  OperationalOverview,
} from '@/modules/operational-cards/types/operational-overview.contract'

/**
 * UN SOLO CAMINO DE REGRESO.
 *
 * La escena tenía dos controles que hacían lo mismo —la miga de arriba y el
 * botón «Volver a la mesa» bajo las cartas—. Quedó solo la flecha de la miga.
 * Se comprueba en los tres modos de composición, porque el botón aparecía solo
 * en uno de ellos y una regresión podría reintroducirlo en cualquiera.
 *
 * `react-dom/server`, como el resto del módulo: aquí basta el marcado; que la
 * flecha devuelva la mesa global lo recorren los e2e de la baraja.
 */

const CATALOG: readonly [string, string][] = [
  ['coord-general', 'Coordinación General'],
  ['coord-b2b', 'Coordinación Supervisor B2B'],
  ['coord-desarrollo-profesional', 'Coordinador Desarrollo Profesional'],
  ['coord-especializaciones', 'Coordinador Especializaciones'],
  ['coord-operaciones-academicas', 'Coordinador Operaciones Académicas'],
  ['coord-bellas-artes', 'Coordinador Bellas Artes'],
  ['coord-empresarial', 'Coordinador Empresarial'],
  ['coord-ingenierias', 'Coordinador Ingenierías'],
  ['coord-transversales', 'Coordinador Transversales'],
  ['coord-negocios', 'Negocios'],
  ['coord-proyeccion-social', 'Coordinador Proyección Social'],
  ['coord-saber-pro', 'Coordinador Saber Pro'],
  ['coord-homologaciones', 'Homologaciones'],
  ['coord-fabrica-contenidos', 'Fabrica de contenidos'],
]

function overview(): OperationalOverview {
  const coordinations: CoordinationOverview[] = CATALOG.map(
    ([code, name], index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      code,
      name,
      // Como el DTO real: el nombre corto no lleva el cargo.
      shortName: name.replace(/^Coordinador /, ''),
      color: '#28C8F4',
      displayOrder: index + 1,
      status: 'ESTABLE' as const,
      activeProblemsCount: 0,
      criticalCount: 0,
      affectedCoordinationCount: 0,
      lifePoints: 10,
    }),
  )
  return {
    directionStatus: 'ESTABLE',
    generatedAt: '2026-10-15T10:00:00.000Z',
    totals: {} as OperationalOverview['totals'],
    coordinations,
    analystRegistry: { activeProblemsCount: 0 } as OperationalOverview['analystRegistry'],
  }
}

function render(selectedCoordinationCode: string | null): string {
  // Solo lo que la escena de cartas lee del controlador.
  const controller = {
    level0: 'ready',
    overview: overview(),
    errorMessage: null,
    selectedCoordinationCode,
    hoveredCoordinationCode: null,
    selectCoordination: () => undefined,
    clearCoordination: () => undefined,
    hoverCoordination: () => undefined,
  } as unknown as OperationalCardsController

  return renderToStaticMarkup(<OperationalCardExperience controller={controller} />)
}

describe('OperationalCardExperience · regreso a la mesa', () => {
  it.each([
    ['coordinación simple', 'coord-b2b', 'SIMPLE_SELECTED', 'B2B'],
    ['mazo abierto', 'coord-operaciones-academicas', 'DECK_SELECTED', 'Operación Académica'],
    ['subcarta observada', 'coord-ingenierias', 'DECK_SELECTED', 'Ingenierías'],
  ])('%s: una flecha, la coordinación al lado y ningún botón inferior', (_label, code, mode, name) => {
    const html = render(code)

    expect(html).toContain(`data-composition-mode="${mode}"`)
    expect(html.match(/data-testid="breadcrumb-direction"/g)).toHaveLength(1)
    expect(html).toContain('aria-label="Volver a Dirección de Operaciones"')
    expect(html.match(/aria-current="page">([^<]*)</)?.[1]).toBe(name)
    expect(html).not.toContain('data-testid="return-to-table"')
    expect(html).not.toContain('Volver a la mesa')
  })

  it('en la mesa global no hay control de regreso', () => {
    const html = render(null)

    expect(html).toContain('data-composition-mode="GLOBAL"')
    expect(html).not.toContain('data-testid="operational-breadcrumb"')
    expect(html).not.toContain('data-testid="return-to-table"')
  })
})
