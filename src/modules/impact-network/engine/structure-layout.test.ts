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
  { width: 1319, height: 811 },
  { width: 1180, height: 640 },
  { width: 1024, height: 617 },
  { width: 900, height: 560 },
  { width: 680, height: 520 },
  { width: 390, height: 640 },
] as const

function overlaps(a: StructureBounds, b: StructureBounds): boolean {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  )
}

function minimumBearingGap(
  nodes: readonly { x: number; y: number }[],
  center: { x: number; y: number },
): number {
  const bearings = nodes
    .map((node) => {
      const angle =
        (Math.atan2(node.y - center.y, node.x - center.x) * 180) / Math.PI
      return angle < 0 ? angle + 360 : angle
    })
    .sort((left, right) => left - right)

  return Math.min(
    ...bearings.map((angle, index) => {
      const next = bearings[(index + 1) % bearings.length]
      return (next - angle + 360) % 360
    }),
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

  it('mantiene las placas institucionales sobre cada isla', () => {
    const { nodes } = buildStructureLayout(
      OPERATIONAL_COORDINATION_IDS,
      null,
      1180,
      640,
    )

    for (const node of nodes) {
      expect(node.labelPlacement).toBe('top')
    }
  })

  it('reserva un corredor angular legible para cada conexión', () => {
    for (const viewport of VIEWPORTS) {
      const { center, nodes } = buildStructureLayout(
        OPERATIONAL_COORDINATION_IDS,
        null,
        viewport.width,
        viewport.height,
      )

      expect(
        minimumBearingGap(nodes, center),
        `los corredores se juntan en ${viewport.width}x${viewport.height}`,
      ).toBeGreaterThanOrEqual(viewport.width <= 720 ? 7 : 10)
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
