import { beforeEach, describe, expect, it } from 'vitest'
import {
  buildStructureLayout,
  hubObstacles,
  structureNodeBounds,
  type StructureBounds,
} from '@/modules/impact-network/engine/structure-layout'
import {
  setCoordinationCatalog,
  type CoordinationDefinition,
} from '@/modules/impact-network/data/coordination-islands.config'

const LAYOUT_IDS = [
  'coord-ingenierias',
  'coord-operaciones-academicas',
  'coord-general',
  'coord-empresarial',
  'coord-saber-pro',
  'coord-b2b',
  'coord-desarrollo-profesional',
  'coord-proyeccion-social',
  'coord-bellas-artes',
  'coord-servicios',
  'coord-especializaciones',
  'coord-transversales',
] as const

const LAYOUT_CATALOG: CoordinationDefinition[] = LAYOUT_IDS.map(
  (id, index) => ({
    id,
    uuid: `00000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`,
    name: id,
    shortName: id,
    islandAsset: '/islas/CoordGeneral.webp',
    color: '#4F8EF7',
    displayOrder: index + 1,
    isActive: true,
  }),
)

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
  beforeEach(() => {
    setCoordinationCatalog(LAYOUT_CATALOG)
  })

  it('coloca las 12 coordinaciones sin que sus etiquetas se solapen', () => {
    for (const viewport of VIEWPORTS) {
      const { nodes } = buildStructureLayout(
        LAYOUT_IDS,
        null,
        viewport.width,
        viewport.height,
      )

      expect(nodes).toHaveLength(LAYOUT_IDS.length)

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
        LAYOUT_IDS,
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
      LAYOUT_IDS,
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
    const { nodes } = buildStructureLayout(LAYOUT_IDS, null, 1180, 640)

    for (const node of nodes) {
      expect(node.labelPlacement).toBe('top')
    }
  })

  it('reserva un corredor angular legible para cada conexión', () => {
    for (const viewport of VIEWPORTS) {
      const { center, nodes } = buildStructureLayout(
        LAYOUT_IDS,
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
      LAYOUT_IDS,
      'coord-b2b',
      1180,
      640,
    )

    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toMatchObject({
      coordinationId: 'coord-b2b',
      x: center.x,
      selected: true,
      labelPlacement: 'bottom',
    })
    expect(nodes[0].y).toBeLessThan(center.y)
    expect(nodes[0].size).toBeGreaterThan(270)
  })

  it('recupera el contexto de islas únicamente para la propagación', () => {
    const { center, nodes } = buildStructureLayout(
      LAYOUT_IDS,
      'coord-b2b',
      1180,
      640,
      true,
    )

    expect(nodes).toHaveLength(LAYOUT_IDS.length)
    expect(
      nodes.find((node) => node.coordinationId === 'coord-b2b'),
    ).toMatchObject({
      x: center.x,
      y: center.y,
      selected: true,
    })
    expect(
      nodes
        .filter((node) => node.coordinationId !== 'coord-b2b')
        .every((node) => !node.selected),
    ).toBe(true)
  })

  it('agrupa el contexto cerca del origen cuando hay pocas islas impactadas', () => {
    const width = 1180
    const height = 640
    const { center, nodes } = buildStructureLayout(
      ['coord-saber-pro', 'coord-b2b', 'coord-desarrollo-profesional'],
      'coord-saber-pro',
      width,
      height,
      true,
    )

    const origin = nodes.find(
      (node) => node.coordinationId === 'coord-saber-pro',
    )!
    const satellites = nodes.filter(
      (node) => node.coordinationId !== 'coord-saber-pro',
    )

    expect(satellites).toHaveLength(2)

    const institutionalRadius = Math.max(174, width * 0.415)
    for (const satellite of satellites) {
      const distance = Math.hypot(
        satellite.x - center.x,
        satellite.y - center.y,
      )
      // Fuera de la isla origen, pero sin irse al borde del escenario.
      expect(distance).toBeGreaterThan(origin.size / 2)
      expect(distance).toBeLessThan(institutionalRadius)
      // El arco superior deja libre la etiqueta del origen.
      expect(satellite.y).toBeLessThan(center.y)
    }
  })
})
