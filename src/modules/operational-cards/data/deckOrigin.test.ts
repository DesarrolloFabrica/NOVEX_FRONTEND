import { describe, expect, it } from 'vitest'
import { resolveDeckOrigin } from '@/modules/operational-cards/data/deckOrigin'
import { buildTableLayout } from '@/modules/operational-cards/data/tableLayout'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'

function coordination(index: number): CoordinationOverview {
  return {
    id: `id-${index}`,
    code: `coord-${index}`,
    name: `Coordinación ${index}`,
    shortName: `C${index}`,
    color: '#4488ff',
    displayOrder: index,
    status: 'ESTABLE',
    activeProblemsCount: 0,
    criticalCount: 0,
    affectedCoordinationCount: 0,
  }
}

describe('resolveDeckOrigin', () => {
  it('planta el mazo a la IZQUIERDA de su columna', () => {
    expect(resolveDeckOrigin({ stageHeight: 1.334 }).x).toBeLessThan(0)
  })

  it('deja a su derecha mucho más sitio del que ocupa: ahí va la mano', () => {
    // El padre ocupa un ancho de carta centrado en `x`. Lo que queda libre a su
    // derecha hasta el borde del escenario tiene que dar para cinco hijas; si
    // alguien acercara el mazo al centro, esta comprobación lo diría.
    const { x } = resolveDeckOrigin({ stageHeight: 1.334 })
    const parentRightEdge = x + 0.5

    expect(parentRightEdge).toBeLessThan(-1)
  })

  it('centra el mazo verticalmente en el escenario', () => {
    // Un escenario de 1.5 altos de carta deja 0.5 de holgura: un cuarto arriba
    // y otro abajo.
    expect(resolveDeckOrigin({ stageHeight: 1.5 }).y).toBeCloseTo(0.25, 4)
    expect(resolveDeckOrigin({ stageHeight: 3 }).y).toBeCloseTo(1, 4)
  })

  it('un escenario sin holgura apoya la carta en el techo, nunca por encima', () => {
    expect(resolveDeckOrigin({ stageHeight: 1 }).y).toBe(0)
    // Un escenario más bajo que la propia carta no puede empujarla hacia fuera.
    expect(resolveDeckOrigin({ stageHeight: 0.4 }).y).toBe(0)
  })

  it('conserva inclinación de carta sobre una mesa, no de figura centrada', () => {
    const { rotation } = resolveDeckOrigin({ stageHeight: 1.334 })

    expect(rotation).not.toBe(0)
    expect(Math.abs(rotation)).toBeLessThan(10)
  })

  it('cabe dentro del escenario que publica el layout de la mesa', () => {
    // Se mide contra el escenario REAL de nueve nodos, no contra un número
    // inventado: el mazo vive en el mismo escenario que la mesa global.
    const layout = buildTableLayout(
      Array.from({ length: 9 }, (_unused, index) => coordination(index + 1)),
    )
    const origin = resolveDeckOrigin({ stageHeight: layout.stageHeight })

    expect(origin.y).toBeGreaterThanOrEqual(0)
    expect(origin.y + 1).toBeLessThanOrEqual(layout.stageHeight)
  })
})
