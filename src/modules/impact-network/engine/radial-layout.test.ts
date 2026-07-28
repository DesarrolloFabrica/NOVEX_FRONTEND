import { describe, expect, it } from 'vitest'
import {
  buildCubicEdgePath,
  buildQuadraticEdgePath,
  computeEdgeAnchors,
  computeRadialLayout,
  nodeVisualSize,
} from '@/modules/impact-network/engine/radial-layout'
import { NETWORK_CONSTELLATION_IDS } from '@/modules/impact-network/engine/constellation.config'

describe('radial-layout', () => {
  it('coloca el origen en el centro y distribuye satélites en constelación', () => {
    const layout = computeRadialLayout(
      'coord-ingenierias',
      ['coord-saber-pro', 'coord-operaciones-academicas'],
      { width: 1000, height: 800 },
    )

    const origin = layout.nodes.find((node) => node.role === 'origin')
    const affected = layout.nodes.filter((node) => node.role === 'affected')
    const ambient = layout.nodes.filter((node) => node.role === 'ambient')

    expect(origin).toMatchObject({ x: 500, y: 400, scale: 1.22 })
    expect(affected).toHaveLength(2)
    expect(ambient.length).toBeGreaterThan(0)
    expect(layout.nodes.length).toBe(NETWORK_CONSTELLATION_IDS.length)

    const distancesFromOrigin = layout.nodes
      .filter((node) => node.role !== 'origin')
      .map((node) => Math.hypot(node.x - origin!.x, node.y - origin!.y))

    // Ambient nodes belong to the same focused cluster; they must not be
    // distributed around the full canvas.
    expect(Math.max(...distancesFromOrigin)).toBeLessThan(260)
  })

  it('escala automáticamente según la cantidad de nodos', () => {
    const small = computeRadialLayout(
      'coord-general',
      ['coord-empresarial'],
      { width: 1000, height: 800 },
      { includeConstellation: false },
    )
    const large = computeRadialLayout(
      'coord-general',
      NETWORK_CONSTELLATION_IDS.filter((id) => id !== 'coord-general'),
      { width: 1000, height: 800 },
      { includeConstellation: false },
    )

    expect(small.nodeSize).toBeGreaterThan(large.nodeSize)
  })

  it('mantiene la propagación focalizada centrada, deduplicada y sin solapes', () => {
    const layout = computeRadialLayout(
      'coord-operaciones-academicas',
      [
        'coord-proyeccion-social',
        'coord-empresarial',
        'coord-proyeccion-social',
      ],
      { width: 1072, height: 900 },
      { includeConstellation: false },
    )

    const origin = layout.nodes.find((node) => node.role === 'origin')!
    const affected = layout.nodes.filter((node) => node.role === 'affected')

    expect(layout.nodes).toHaveLength(3)
    expect(layout.nodes.some((node) => node.role === 'ambient')).toBe(false)
    expect(origin).toMatchObject({ x: 536, y: 450 })
    expect(affected).toHaveLength(2)

    for (const node of affected) {
      const centerDistance = Math.hypot(node.x - origin.x, node.y - origin.y)
      const requiredClearance =
        (nodeVisualSize(origin, layout.nodeSize) +
          nodeVisualSize(node, layout.nodeSize)) /
          2 +
        19
      expect(centerDistance).toBeGreaterThanOrEqual(requiredClearance)
    }

    const affectedDistance = Math.hypot(
      affected[0].x - affected[1].x,
      affected[0].y - affected[1].y,
    )
    expect(affectedDistance).toBeGreaterThan(
      nodeVisualSize(affected[0], layout.nodeSize),
    )
  })

  it('calcula anclas en el borde de las islas con curva cúbica', () => {
    const anchors = computeEdgeAnchors(
      { x: 400, y: 300, width: 120, height: 120 },
      { x: 700, y: 300, width: 100, height: 100 },
    )

    expect(anchors.source.x).toBeGreaterThan(400)
    expect(anchors.target.x).toBeLessThan(anchors.source.x + 300)
    expect(anchors.target.x).toBeGreaterThan(650)
    expect(buildQuadraticEdgePath(anchors.source, anchors.target)).toContain('Q')
    expect(buildCubicEdgePath(anchors.source, anchors.target)).toContain('C')
  })
})
