import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import type { IslandLabelPlacement } from '@/modules/impact-network/components/IslandNode'

export interface StructureNode {
  coordinationId: CoordinationId
  x: number
  y: number
  size: number
  selected: boolean
  labelPlacement: IslandLabelPlacement
  depth: number
}

export interface StructureLayout {
  center: { x: number; y: number }
  nodes: readonly StructureNode[]
}

export interface StructureBounds {
  left: number
  right: number
  top: number
  bottom: number
}

/**
 * Estas métricas replican el tamaño real de `.propagation-island__label`
 * en la escena institucional (impact-network.css), incluido el breakpoint
 * de 720px. Si el CSS cambia el ancho, alto o separación de la etiqueta,
 * hay que actualizarlas aquí para que el layout siga reservando el espacio
 * correcto.
 */
const COMPACT_BREAKPOINT = 720
const LABEL_BOX_WIDTH = 142
const LABEL_BOX_HEIGHT = 42
const LABEL_GAP = 12
const COMPACT_LABEL_BOX_WIDTH = 96
const COMPACT_LABEL_BOX_HEIGHT = 32
const COMPACT_LABEL_GAP = 8

interface LabelMetrics {
  width: number
  reach: number
}

function labelMetrics(stageWidth: number): LabelMetrics {
  return stageWidth <= COMPACT_BREAKPOINT
    ? {
        width: COMPACT_LABEL_BOX_WIDTH,
        reach: COMPACT_LABEL_GAP + COMPACT_LABEL_BOX_HEIGHT,
      }
    : { width: LABEL_BOX_WIDTH, reach: LABEL_GAP + LABEL_BOX_HEIGHT }
}

const STAGE_PADDING = 8
const NODE_CLEARANCE = 14
const RELAX_PASSES = 24
const MAX_RADIAL_SHIFT = 104
/** La capa holográfica se extiende 14% por cada lado del nodo. */
const NODE_VISUAL_SCALE = 1.28

const INSTITUTIONAL_SLOT_ORDER: readonly CoordinationId[] = [
  'coord-transversales',
  'coord-saber-pro',
  'coord-b2b',
  'coord-operaciones-academicas',
  'coord-desarrollo-profesional',
  'coord-general',
  'coord-proyeccion-social',
  'coord-bellas-artes',
  'coord-social-lab',
  'coord-empresarial',
  'coord-especializaciones',
  'coord-ingenierias',
]

const INSET_COORDINATION_IDS = new Set<CoordinationId>([
  'coord-operaciones-academicas',
  'coord-general',
  'coord-empresarial',
  'coord-ingenierias',
])

const INSTITUTIONAL_SLOT_RANK = new Map(
  INSTITUTIONAL_SLOT_ORDER.map((coordinationId, index) => [
    coordinationId,
    index,
  ]),
)

/** Caja del nodo institucional central, incluida su etiqueta inferior. */
const HUB_HALF_SIZE = 106
const COMPACT_HUB_HALF_SIZE = 62
const HUB_LABEL_HALF_WIDTH = 88
const COMPACT_HUB_LABEL_HALF_WIDTH = 62
const HUB_LABEL_REACH = 58
const COMPACT_HUB_LABEL_REACH = 44

function ellipsePoint(
  center: { x: number; y: number },
  radiusX: number,
  radiusY: number,
  angleDeg: number,
): { x: number; y: number } {
  const radians = (angleDeg * Math.PI) / 180
  return {
    x: center.x + Math.cos(radians) * radiusX,
    y: center.y + Math.sin(radians) * radiusY,
  }
}

export function structureNodeBounds(
  node: StructureNode,
  stageWidth: number,
): StructureBounds {
  const metrics = labelMetrics(stageWidth)
  const visualSize = node.size * NODE_VISUAL_SCALE
  const visualHalfSize = visualSize / 2
  const halfWidth = Math.max(visualSize, metrics.width) / 2
  const labelTopReach =
    node.labelPlacement === 'top' ? node.size / 2 + metrics.reach : 0
  const labelBottomReach =
    node.labelPlacement === 'bottom' ? node.size / 2 + metrics.reach : 0
  return {
    left: node.x - halfWidth,
    right: node.x + halfWidth,
    top: node.y - Math.max(visualHalfSize, labelTopReach),
    bottom: node.y + Math.max(visualHalfSize, labelBottomReach),
  }
}

function overlapAmount(a: StructureBounds, b: StructureBounds) {
  return {
    x: Math.min(a.right, b.right) - Math.max(a.left, b.left) + NODE_CLEARANCE,
    y: Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) + NODE_CLEARANCE,
  }
}

function intersects(a: StructureBounds, b: StructureBounds): boolean {
  const overlap = overlapAmount(a, b)
  return overlap.x > 0 && overlap.y > 0
}

/** Obstáculos fijos del centro: cuerpo del hub y su etiqueta inferior. */
export function hubObstacles(
  center: { x: number; y: number },
  stageWidth: number,
): readonly StructureBounds[] {
  const compact = stageWidth <= COMPACT_BREAKPOINT
  const halfSize = compact ? COMPACT_HUB_HALF_SIZE : HUB_HALF_SIZE
  const labelHalfWidth = compact
    ? COMPACT_HUB_LABEL_HALF_WIDTH
    : HUB_LABEL_HALF_WIDTH
  const labelReach = compact ? COMPACT_HUB_LABEL_REACH : HUB_LABEL_REACH

  return [
    {
      left: center.x - halfSize,
      right: center.x + halfSize,
      top: center.y - halfSize,
      bottom: center.y + halfSize,
    },
    {
      left: center.x - labelHalfWidth,
      right: center.x + labelHalfWidth,
      top: center.y + halfSize,
      bottom: center.y + halfSize + labelReach,
    },
  ]
}

/** En compacto, las placas inferiores se proyectan fuera del núcleo. */
function radialPlacement(
  node: { y: number },
  center: { y: number },
  stageWidth = Number.POSITIVE_INFINITY,
  stageHeight = Number.POSITIVE_INFINITY,
): IslandLabelPlacement {
  return (stageWidth <= COMPACT_BREAKPOINT || stageHeight < 600) &&
    node.y > center.y
    ? 'bottom'
    : 'top'
}

function clampToStage(
  node: StructureNode,
  width: number,
  height: number,
): void {
  const bounds = structureNodeBounds(node, width)
  if (bounds.left < STAGE_PADDING) {
    node.x += STAGE_PADDING - bounds.left
  } else if (bounds.right > width - STAGE_PADDING) {
    node.x -= bounds.right - (width - STAGE_PADDING)
  }
  if (bounds.top < STAGE_PADDING) {
    node.y += STAGE_PADDING - bounds.top
  } else if (bounds.bottom > height - STAGE_PADDING) {
    node.y -= bounds.bottom - (height - STAGE_PADDING)
  }
}

/**
 * Red de seguridad para tamaños de contenedor donde la geometría de anillos
 * no basta: separa los bloques isla+etiqueta que aún se pisan empujándolos
 * en el eje de menor penetración, sin romper el orden radial.
 */
function relaxOverlaps(
  nodes: StructureNode[],
  center: { x: number; y: number },
  width: number,
  height: number,
): void {
  const origins = nodes.map((node) => ({ x: node.x, y: node.y }))
  const obstacles = hubObstacles(center, width)

  for (let pass = 0; pass < RELAX_PASSES; pass += 1) {
    let adjusted = false

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const first = nodes[i]
        const second = nodes[j]
        const overlap = overlapAmount(
          structureNodeBounds(first, width),
          structureNodeBounds(second, width),
        )
        if (overlap.x <= 0 || overlap.y <= 0) continue

        adjusted = true
        if (overlap.y <= overlap.x) {
          const push = overlap.y / 2
          const [upper, lower] = first.y <= second.y ? [first, second] : [second, first]
          upper.y -= push
          lower.y += push
        } else {
          const push = overlap.x / 2
          const [left, right] = first.x <= second.x ? [first, second] : [second, first]
          left.x -= push
          right.x += push
        }
      }
    }

    for (const node of nodes) {
      for (const obstacle of obstacles) {
        if (!intersects(structureNodeBounds(node, width), obstacle)) continue
        adjusted = true
        const dx = node.x - center.x
        const dy = node.y - center.y
        const distance = Math.hypot(dx, dy) || 1
        node.x += (dx / distance) * 12
        node.y += (dy / distance) * 12
      }
    }

    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index]
      const origin = origins[index]
      const dx = node.x - origin.x
      const dy = node.y - origin.y
      const drift = Math.hypot(dx, dy)
      if (drift > MAX_RADIAL_SHIFT) {
        const ratio = MAX_RADIAL_SHIFT / drift
        node.x = origin.x + dx * ratio
        node.y = origin.y + dy * ratio
      }
      node.labelPlacement = radialPlacement(node, center, width, height)
      clampToStage(node, width, height)
    }

    if (!adjusted) break
  }
}

/**
 * Las etiquetas se proyectan hacia afuera, así que un nodo interior siempre
 * debe pintarse por encima de sus vecinos exteriores.
 */
function assignDepths(
  nodes: StructureNode[],
  center: { x: number; y: number },
): void {
  const ranked = [...nodes].sort(
    (a, b) =>
      Math.hypot(b.x - center.x, b.y - center.y) -
      Math.hypot(a.x - center.x, a.y - center.y),
  )
  ranked.forEach((node, index) => {
    node.depth = 20 + index
  })
}

export function buildStructureLayout(
  coordinationIds: readonly CoordinationId[],
  selectedCoordinationId: CoordinationId | null,
  width: number,
  height: number,
): StructureLayout {
  const center = { x: width / 2, y: height / 2 }
  const minSide = Math.min(width, height)
  // Las coordinaciones deben conservar suficiente presencia visual alrededor
  // del hub, sin competir con su jerarquía de nodo institucional.
  const nodeSize = Math.max(64, Math.min(112, minSide * 0.125))
  const selectedSize = Math.max(200, Math.min(270, minSide * 0.3))

  if (selectedCoordinationId) {
    const institutionalLayout = buildStructureLayout(
      coordinationIds,
      null,
      width,
      height,
    )
    const contextNodes = institutionalLayout.nodes
      .filter((node) => node.coordinationId !== selectedCoordinationId)
      .map((node) => ({
        ...node,
        selected: false,
      }))

    return {
      center,
      nodes: [
        {
          coordinationId: selectedCoordinationId,
          x: center.x,
          y: center.y,
          size: selectedSize,
          selected: true,
          labelPlacement: 'bottom',
          depth: 100,
        },
        ...contextNodes,
      ],
    }
  }

  const satelliteIds = [...coordinationIds]
  if (satelliteIds.length === 0) return { center, nodes: [] }

  const arrangedIds = [...satelliteIds].sort(
    (left, right) =>
      (INSTITUTIONAL_SLOT_RANK.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (INSTITUTIONAL_SLOT_RANK.get(right) ?? Number.MAX_SAFE_INTEGER),
  )
  const radiusX = Math.max(174, width * 0.415)
  const radiusY = Math.max(168, height * 0.365)
  const angleStep = 360 / arrangedIds.length
  const useInsetSlots = arrangedIds.length >= 10 && width > COMPACT_BREAKPOINT
  const startAngle =
    arrangedIds.length >= 10 && useInsetSlots ? -105 : -90
  const nodes: StructureNode[] = []

  arrangedIds.forEach((coordinationId, index) => {
    const radiusScale =
      useInsetSlots && INSET_COORDINATION_IDS.has(coordinationId) ? 0.78 : 1
    const point = ellipsePoint(
      center,
      radiusX * radiusScale,
      radiusY * radiusScale,
      startAngle + angleStep * index,
    )
    nodes.push({
      coordinationId,
      ...point,
      size: nodeSize * (radiusScale < 1 ? 0.92 : 1),
      selected: false,
      labelPlacement: radialPlacement(point, center, width, height),
      depth: 20,
    })
  })

  for (const node of nodes) clampToStage(node, width, height)
  relaxOverlaps(nodes, center, width, height)
  assignDepths(nodes, center)

  return { center, nodes }
}
