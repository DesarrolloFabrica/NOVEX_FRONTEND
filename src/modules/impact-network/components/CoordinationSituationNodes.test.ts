import { describe, expect, it } from 'vitest'
import {
  MAX_VISIBLE_SITUATION_NODES,
  buildSituationLayouts,
} from '@/modules/impact-network/components/coordination-situation-layout'
import type { ImpactIncident } from '@/modules/impact-network/types/impact-network.types'

function incidents(count: number): ImpactIncident[] {
  return Array.from(
    { length: count },
    (_, index) => ({ eventId: `situation-${index + 1}` }) as ImpactIncident,
  )
}

function assertNoOverlap(
  layouts: Array<{ x: number; y: number }>,
  minX = 160,
  minY = 100,
) {
  for (let left = 0; left < layouts.length; left += 1) {
    for (let right = left + 1; right < layouts.length; right += 1) {
      const dx = Math.abs(layouts[left].x - layouts[right].x)
      const dy = Math.abs(layouts[left].y - layouts[right].y)
      expect(dx >= minX || dy >= minY).toBe(true)
    }
  }
}

describe('coordination situation layout', () => {
  it('muestra hasta ocho situaciones alrededor de la isla sin cruzarlas', () => {
    const stageSize = { width: 1180, height: 780 }
    const layouts = buildSituationLayouts(
      incidents(12),
      { x: 590, y: 300 },
      280,
      stageSize,
    )

    expect(layouts).toHaveLength(MAX_VISIBLE_SITUATION_NODES)
    expect(layouts).toHaveLength(8)
    assertNoOverlap(layouts)

    for (const layout of layouts) {
      expect(layout.x).toBeGreaterThanOrEqual(102)
      expect(layout.x).toBeLessThanOrEqual(stageSize.width - 102)
      expect(layout.y).toBeLessThanOrEqual(stageSize.height - 50)
    }
  })

  it('mantiene una fila centrada cuando hay pocas situaciones', () => {
    const layouts = buildSituationLayouts(
      incidents(2),
      { x: 500, y: 250 },
      330,
      { width: 1000, height: 680 },
    )

    expect(layouts).toHaveLength(2)
    expect(new Set(layouts.map((layout) => layout.y)).size).toBe(1)
    expect((layouts[0].x + layouts[1].x) / 2).toBeCloseTo(500, 0)
  })

  it('no comprime tarjetas contra el borde hasta hacerlas solaparse', () => {
    const layouts = buildSituationLayouts(
      incidents(8),
      { x: 160, y: 220 },
      200,
      { width: 760, height: 720 },
    )

    expect(layouts.length).toBeGreaterThanOrEqual(6)
    assertNoOverlap(layouts)
  })
})
