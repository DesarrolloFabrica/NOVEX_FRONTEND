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

describe('coordination situation layout', () => {
  it('limita el mapa y distribuye seis situaciones en dos filas equilibradas', () => {
    const stageSize = { width: 850, height: 760 }
    const layouts = buildSituationLayouts(
      incidents(10),
      { x: 425, y: 288 },
      365,
      stageSize,
    )

    expect(layouts).toHaveLength(MAX_VISIBLE_SITUATION_NODES)
    expect(new Set(layouts.map((layout) => layout.y)).size).toBe(2)

    for (const layout of layouts) {
      expect(layout.x).toBeGreaterThanOrEqual(102)
      expect(layout.x).toBeLessThanOrEqual(stageSize.width - 102)
      expect(layout.y).toBeLessThanOrEqual(stageSize.height - 100)
    }

    for (let left = 0; left < layouts.length; left += 1) {
      for (let right = left + 1; right < layouts.length; right += 1) {
        const sameRow = layouts[left].y === layouts[right].y
        if (sameRow) {
          expect(Math.abs(layouts[left].x - layouts[right].x)).toBeGreaterThan(
            168,
          )
        }
      }
    }
  })

  it('mantiene una fila centrada cuando hay pocas situaciones', () => {
    const layouts = buildSituationLayouts(
      incidents(3),
      { x: 500, y: 250 },
      330,
      { width: 1000, height: 680 },
    )

    expect(layouts).toHaveLength(3)
    expect(new Set(layouts.map((layout) => layout.y)).size).toBe(1)
    expect(layouts[1].x).toBe(500)
  })
})
