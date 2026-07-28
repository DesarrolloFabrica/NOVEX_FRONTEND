import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import { resolveConstellationIds } from '@/modules/impact-network/engine/constellation.config'

export interface RadialLayoutSize {
  width: number
  height: number
}

export interface RadialNodeLayout {
  coordinationId: CoordinationId
  role: 'origin' | 'affected' | 'ambient'
  x: number
  y: number
  scale: number
  slotIndex: number | null
  angleDeg: number | null
}

export interface RadialSceneLayout {
  center: { x: number; y: number }
  nodes: readonly RadialNodeLayout[]
  nodeSize: number
}

export interface RectBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface EdgeAnchor {
  x: number
  y: number
}

const ORIGIN_SCALE = 1.22
const AFFECTED_SCALE = 0.9
const AMBIENT_SCALE = 0.76
const ISLAND_BODY_CENTER_Y_RATIO = 0.59
const ISLAND_BODY_RADIUS_X_RATIO = 0.43
const ISLAND_BODY_RADIUS_Y_RATIO = 0.28
const LABEL_PADDING = 32
const SCENE_PADDING = 20

interface LayoutMetrics {
  nodeSize: number
  originScale: number
  ringRadii: number[]
}

export function nodeVisualSize(
  node: Pick<RadialNodeLayout, 'scale'>,
  nodeSize: number,
): number {
  return nodeSize * node.scale
}

export function nodeBounds(
  node: RadialNodeLayout,
  nodeSize: number,
): RectBounds {
  const visual = nodeVisualSize(node, nodeSize)
  return {
    x: node.x - visual / 2,
    y: node.y - visual / 2,
    width: visual,
    height: visual,
  }
}

function computeNodeSizeRatio(satelliteCount: number): number {
  if (satelliteCount <= 1) return 0.18
  if (satelliteCount <= 4) return 0.15
  if (satelliteCount <= 8) return 0.13
  if (satelliteCount <= 12) return 0.11
  return 0.095
}

function computeFitRadius(
  size: RadialLayoutSize,
  nodeSize: number,
  maxScale: number,
): number {
  const halfNode = (nodeSize * maxScale) / 2 + LABEL_PADDING
  const maxRadiusX = size.width / 2 - halfNode - SCENE_PADDING
  const maxRadiusY = size.height / 2 - halfNode - SCENE_PADDING
  return Math.max(72, Math.min(maxRadiusX, maxRadiusY))
}

function computeLayoutMetrics(
  satelliteCount: number,
  size: RadialLayoutSize,
): LayoutMetrics {
  const minSide = Math.min(size.width, size.height)
  const nodeSize = minSide * computeNodeSizeRatio(satelliteCount)
  const fitRadius = computeFitRadius(size, nodeSize, ORIGIN_SCALE)

  if (satelliteCount === 0) {
    return {
      nodeSize,
      originScale: ORIGIN_SCALE,
      ringRadii: [],
    }
  }

  // A focused propagation normally has one to four affected areas. Its
  // radius is derived from the rendered PNG sizes, leaving a real visual gap
  // between the central island and every satellite.
  if (satelliteCount <= 4) {
    const visualGap = Math.max(20, nodeSize * 0.2)
    const minimumClearance =
      (nodeSize * (ORIGIN_SCALE + AFFECTED_SCALE)) / 2 + visualGap
    const preferredRadius = nodeSize * 1.58

    return {
      nodeSize,
      originScale: ORIGIN_SCALE,
      ringRadii: [
        Math.min(
          fitRadius,
          Math.max(minimumClearance, preferredRadius),
        ),
      ],
    }
  }

  if (satelliteCount <= 14) {
    return {
      nodeSize,
      originScale: ORIGIN_SCALE,
      ringRadii: [fitRadius * 0.38, fitRadius * 0.66],
    }
  }

  return {
    nodeSize,
    originScale: ORIGIN_SCALE,
    ringRadii: [fitRadius * 0.3, fitRadius * 0.5, fitRadius * 0.72],
  }
}

function distributeSatellites(
  count: number,
  ringRadii: number[],
): Array<{ ring: number; angleDeg: number }> {
  if (count === 0) return []

  if (ringRadii.length === 1) {
    const focusedAngles: Record<number, readonly number[]> = {
      1: [-35],
      2: [-150, -30],
      3: [-150, -30, 90],
      4: [-135, -45, 45, 135],
    }
    const angles = focusedAngles[count]

    if (angles) {
      return angles.map((angleDeg) => ({ ring: 0, angleDeg }))
    }

    return Array.from({ length: count }, (_, index) => ({
      ring: 0,
      angleDeg: -90 + (360 / count) * index,
    }))
  }

  const slots: Array<{ ring: number; angleDeg: number }> = []
  const ringCount = ringRadii.length
  const basePerRing = Math.floor(count / ringCount)
  const remainder = count % ringCount
  let placed = 0

  for (let ring = 0; ring < ringCount; ring += 1) {
    const nodesInRing = basePerRing + (ring < remainder ? 1 : 0)
    const angleOffset = ring % 2 === 1 && nodesInRing > 0 ? 180 / nodesInRing : 0

    for (let index = 0; index < nodesInRing; index += 1) {
      slots.push({
        ring,
        angleDeg: -90 + angleOffset + (360 / nodesInRing) * index,
      })
      placed += 1
    }
  }

  return slots.slice(0, count)
}

function polarToCartesian(
  center: { x: number; y: number },
  radius: number,
  angleDeg: number,
): { x: number; y: number } {
  const radians = (angleDeg * Math.PI) / 180
  return {
    x: center.x + Math.cos(radians) * radius,
    y: center.y + Math.sin(radians) * radius,
  }
}

export function computeRadialLayout(
  originId: CoordinationId,
  affectedIds: readonly CoordinationId[],
  size: RadialLayoutSize,
  options?: { includeConstellation?: boolean },
): RadialSceneLayout {
  const includeConstellation = options?.includeConstellation !== false
  const uniqueAffected = [
    ...new Set(affectedIds.filter((id) => id !== originId)),
  ]
  const affectedSet = new Set(uniqueAffected)

  const allIds = includeConstellation
    ? resolveConstellationIds(originId, uniqueAffected)
    : [originId, ...uniqueAffected]

  const satelliteIds = allIds.filter((id) => id !== originId)
  const center = { x: size.width / 2, y: size.height / 2 }
  const metrics = computeLayoutMetrics(satelliteIds.length, size)
  const slots = distributeSatellites(satelliteIds.length, metrics.ringRadii)

  const nodes: RadialNodeLayout[] = [
    {
      coordinationId: originId,
      role: 'origin',
      x: center.x,
      y: center.y,
      scale: metrics.originScale,
      slotIndex: null,
      angleDeg: null,
    },
  ]

  satelliteIds.forEach((coordinationId, index) => {
    const slot = slots[index]
    if (!slot) return

    const radius = metrics.ringRadii[slot.ring] ?? metrics.ringRadii[0] ?? 0
    const position = polarToCartesian(center, radius, slot.angleDeg)
    const role = affectedSet.has(coordinationId) ? 'affected' : 'ambient'

    nodes.push({
      coordinationId,
      role,
      x: position.x,
      y: position.y,
      scale: role === 'ambient' ? AMBIENT_SCALE : AFFECTED_SCALE,
      slotIndex: index,
      angleDeg: slot.angleDeg,
    })
  })

  return { center, nodes, nodeSize: metrics.nodeSize }
}

export function computeEdgeAnchors(
  originBounds: RectBounds,
  targetBounds: RectBounds,
): { source: EdgeAnchor; target: EdgeAnchor } {
  const originBodyCenter = {
    x: originBounds.x + originBounds.width / 2,
    y: originBounds.y + originBounds.height * ISLAND_BODY_CENTER_Y_RATIO,
  }
  const targetBodyCenter = {
    x: targetBounds.x + targetBounds.width / 2,
    y: targetBounds.y + targetBounds.height * ISLAND_BODY_CENTER_Y_RATIO,
  }

  const dx = targetBodyCenter.x - originBodyCenter.x
  const dy = targetBodyCenter.y - originBodyCenter.y
  const distance = Math.hypot(dx, dy) || 1
  const ux = dx / distance
  const uy = dy / distance
  const originRadiusX = originBounds.width * ISLAND_BODY_RADIUS_X_RATIO
  const originRadiusY = originBounds.height * ISLAND_BODY_RADIUS_Y_RATIO
  const targetRadiusX = targetBounds.width * ISLAND_BODY_RADIUS_X_RATIO
  const targetRadiusY = targetBounds.height * ISLAND_BODY_RADIUS_Y_RATIO
  const originIntersection =
    1 /
    Math.sqrt(
      (ux * ux) / (originRadiusX * originRadiusX) +
        (uy * uy) / (originRadiusY * originRadiusY),
    )
  const targetIntersection =
    1 /
    Math.sqrt(
      (ux * ux) / (targetRadiusX * targetRadiusX) +
        (uy * uy) / (targetRadiusY * targetRadiusY),
    )

  return {
    source: {
      x: originBodyCenter.x + ux * originIntersection,
      y: originBodyCenter.y + uy * originIntersection,
    },
    target: {
      x: targetBodyCenter.x - ux * targetIntersection,
      y: targetBodyCenter.y - uy * targetIntersection,
    },
  }
}

export function buildQuadraticEdgePath(
  source: EdgeAnchor,
  target: EdgeAnchor,
  curvature = 0.14,
): string {
  const midX = (source.x + target.x) / 2
  const midY = (source.y + target.y) / 2
  const dx = target.x - source.x
  const dy = target.y - source.y
  const length = Math.hypot(dx, dy) || 1
  const normalX = -dy / length
  const normalY = dx / length
  const controlX = midX + normalX * length * curvature
  const controlY = midY + normalY * length * curvature
  return `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`
}

export function buildCubicEdgePath(
  source: EdgeAnchor,
  target: EdgeAnchor,
  curvature = 0.22,
): string {
  const dx = target.x - source.x
  const dy = target.y - source.y
  const length = Math.hypot(dx, dy) || 1
  const normalX = -dy / length
  const normalY = dx / length
  const offset = length * curvature

  const cp1 = {
    x: source.x + dx * 0.28 + normalX * offset,
    y: source.y + dy * 0.28 + normalY * offset,
  }
  const cp2 = {
    x: source.x + dx * 0.72 + normalX * offset * 0.6,
    y: source.y + dy * 0.72 + normalY * offset * 0.6,
  }

  return `M ${source.x} ${source.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${target.x} ${target.y}`
}
