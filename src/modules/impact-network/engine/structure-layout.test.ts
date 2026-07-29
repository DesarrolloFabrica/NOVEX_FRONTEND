import { describe, expect, it } from 'vitest'
import {
  buildStructureLayout,
  hubObstacles,
  structureNodeBounds,
  type StructureBounds,
} from '@/modules/impact-network/engine/structure-layout'
import { OPERATIONAL_COORDINATION_IDS } from '@/modules/impact-network/data/operational-network.mock'

const VIEWPORTS = [
  { width: 1440, height: 720 },
  { width: 1180, height: 640 },
  { width: 1024, height: 617 },
  { width: 900, height: 560 },
  { width: 680, height: 520 },
] as const

function overlaps(a: StructureBounds, b: StructureBounds): boolean {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  )
}

describe('structure-layout', () => {
  it('coloca las 12 coordinaciones sin que sus etiquetas se solapen', () => {
    for (const viewport of VIEWPORTS) {
      const { nodes } = buildStructureLayout(
        OPERATIONAL_COORDINATION_IDS,
        null,
        viewport.width,
        viewport.height,
      )

      expect(nodes).toHaveLength(OPERATIONAL_COORDINATION_IDS.length)

      const boxes = nodes.map((node) =>
        structureNodeBounds(node, viewport.width),
      )
      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          expect(
            overlaps(boxes[i], boxes[j]),
            `${nodes[i].coordinationId} choca con ${nodes[j].coordinationId} en ${viewport.width}x${viewport.height}`,
          ).toBe(false)
        }
      }
    }
  })

  it('mantiene los bloques isla + etiqueta dentro del lienzo', () => {
    for (const viewport of VIEWPORTS) {
      const { nodes } = buildStructureLayout(
        OPERATIONAL_COORDINATION_IDS,
        null,
        viewport.width,
        viewport.height,
      )

      for (const node of nodes) {
        const box = structureNodeBounds(node, viewport.width)
        expect(box.left).toBeGreaterThanOrEqual(0)
        expect(box.top).toBeGreaterThanOrEqual(0)
        expect(box.right).toBeLessThanOrEqual(viewport.width)
        expect(box.bottom).toBeLessThanOrEqual(viewport.height)
      }
    }
  })

  it('no invade el nodo institucional central ni su etiqueta', () => {
    const viewport = { width: 1180, height: 640 }
    const { center, nodes } = buildStructureLayout(
      OPERATIONAL_COORDINATION_IDS,
      null,
      viewport.width,
      viewport.height,
    )

    for (const obstacle of hubObstacles(center, viewport.width)) {
      for (const node of nodes) {
        expect(
          overlaps(structureNodeBounds(node, viewport.width), obstacle),
          `${node.coordinationId} invade el hub central`,
        ).toBe(false)
      }
    }
  })

  it('orienta cada etiqueta hacia afuera del centro', () => {
    const { center, nodes } = buildStructureLayout(
      OPERATIONAL_COORDINATION_IDS,
      null,
      1180,
      640,
    )

    for (const node of nodes) {
      expect(node.labelPlacement).toBe(node.y < center.y ? 'top' : 'bottom')
    }
  })

  it('colapsa a una sola isla centrada cuando hay coordinación seleccionada', () => {
    const { center, nodes } = buildStructureLayout(
      OPERATIONAL_COORDINATION_IDS,
      'coord-b2b',
      1180,
      640,
    )

    expect(nodes).toHaveLength(OPERATIONAL_COORDINATION_IDS.length)
    expect(nodes.find((node) => node.coordinationId === 'coord-b2b')).toMatchObject({
      coordinationId: 'coord-b2b',
      x: center.x,
      y: center.y,
      selected: true,
      labelPlacement: 'bottom',
    })
    expect(
      nodes
        .filter((node) => node.coordinationId !== 'coord-b2b')
        .every((node) => !node.selected),
    ).toBe(true)
  })
})
