import {
  GENERAL_COORDINATION_ID,
  getCoordination,
  type CoordinationId,
} from '@/modules/impact-network/data/coordination-islands.config'
import type { IslandLabelPlacement } from '@/modules/impact-network/components/IslandNode'
import {
  resolveCoordinationOperationalState,
  type OperationalStatus,
} from '@/modules/impact-network/data/executive-operational-overview.mock'
import {
  COORDINATION_PLACEMENTS,
  FALLBACK_PLACEMENTS,
  OPERATIONAL_INTERNAL_BORDERS,
  OPERATIONAL_MAP_VIEWBOX,
  OPERATIONAL_TERRAIN_OUTLINE,
  OPERATIONAL_TERRITORIES,
  territoryContourPaths,
  territoryMarkerPoints,
  territoryOutlinePath,
  territoryPolylinePath,
  type CoordinationMapPlacement,
  type OperationalTerritoryTone,
  type TerritoryPoint,
} from '@/modules/impact-network/data/operational-territories.config'

export type OperationalMapStatusScenario =
  | 'mixed'
  | `uniform-${OperationalStatus}`

/** Tres escalas, no catorce: la gravedad se comunica con luz, no con tamaño.
 *  El foco (hoy Fábrica) gana protagonismo geométrico sin duplicar la isla. */
export type OperationalMapScaleTier = 'normal' | 'affected' | 'focal'

export type OperationalMapDensity = 'standard' | 'expanded'

export interface OperationalMapNode {
  coordinationId: CoordinationId
  territoryId: string
  x: number
  y: number
  size: number
  scaleTier: OperationalMapScaleTier
  status: OperationalStatus
  focal: boolean
  labelPlacement: IslandLabelPlacement
}

export interface OperationalMapTerritory {
  id: string
  sectorCode: string
  label: string
  tone: OperationalTerritoryTone
  /** Fracción 0..1 del escenario, no del viewBox: la etiqueta vive en el DOM. */
  labelX: number
  labelY: number
  labelAlign: 'left' | 'right'
  holdsFocus: boolean
}

/** Superficie única detrás de todas las coordinaciones. */
export interface OperationalMapTerrain {
  landPath: string
  coastPath: string
  borderPaths: readonly string[]
  contourPaths: readonly string[]
  markerPoints: readonly TerritoryPoint[]
}

export interface OperationalMapLayout {
  nodes: readonly OperationalMapNode[]
  territories: readonly OperationalMapTerritory[]
  terrain: OperationalMapTerrain
  viewBox: { width: number; height: number }
  focalCoordinationId: CoordinationId | null
  focalTerritoryId: string | null
  statusScenario: OperationalMapStatusScenario
  baseSize: number
}

export interface OperationalMapLayoutOptions {
  focalCoordinationId?: CoordinationId | null
  resolveStatus?: (coordinationId: CoordinationId) => OperationalStatus
  /** `expanded` aprovecha el fullscreen con más respiración y más relieve. */
  density?: OperationalMapDensity
}

const STATUS_PRIORITY: Readonly<Record<OperationalStatus, number>> = {
  normal: 0,
  attention: 1,
  high: 2,
  critical: 3,
}

const SCALE_BY_TIER: Readonly<Record<OperationalMapScaleTier, number>> = {
  normal: 1,
  affected: 1.1,
  focal: 1.26,
}

const FOCAL_PRIORITY = [
  'coord-fabrica-contenidos',
  'coord-homologaciones',
  'coord-servicios',
] as const

const MIN_ISLAND_SIZE = 76
const MAX_ISLAND_SIZE = 146
const CONTOUR_LINES: Readonly<Record<OperationalMapDensity, number>> = {
  standard: 3,
  expanded: 5,
}
/** Fullscreen abre la respiración entre nodos; el terreno permanece continuo. */
const SPREAD_BY_DENSITY: Readonly<Record<OperationalMapDensity, number>> = {
  standard: 1,
  expanded: 1.045,
}

/** Aire reservado sobre la isla para la cápsula de label del nodo. */
const NODE_LABEL_GUTTER = 22
const NODE_HORIZONTAL_RATIO = 0.48
const NODE_VERTICAL_RATIO = 0.45

/**
 * Área segura de un CoordinationNode: ninguna isla puede tocar otra ni dejar su
 * etiqueta al lado de una coordinación vecina. Basta con separarse en un eje.
 */
export function hasSafeSeparation(
  left: Pick<OperationalMapNode, 'x' | 'y' | 'size'>,
  right: Pick<OperationalMapNode, 'x' | 'y' | 'size'>,
): boolean {
  const combined = left.size + right.size
  const horizontal = Math.abs(left.x - right.x)
  const vertical = Math.abs(left.y - right.y)

  return (
    horizontal >= combined * NODE_HORIZONTAL_RATIO ||
    vertical >= combined * NODE_VERTICAL_RATIO + NODE_LABEL_GUTTER
  )
}

function resolveStatusScenario(
  statuses: readonly OperationalStatus[],
): OperationalMapStatusScenario {
  const first = statuses[0]
  return first && statuses.every((status) => status === first)
    ? `uniform-${first}`
    : 'mixed'
}

function getFocalPriority(coordinationId: string): number {
  const index = FOCAL_PRIORITY.indexOf(
    coordinationId as (typeof FOCAL_PRIORITY)[number],
  )
  return index === -1 ? FOCAL_PRIORITY.length : index
}

function spreadFromCenter(value: number, spread: number): number {
  return 0.5 + (value - 0.5) * spread
}

/**
 * Compone territorios operacionales: cada coordinación ocupa una posición base
 * dentro de una región cartográfica. El estado modifica escala y luz, nunca la
 * ubicación, para que el usuario construya memoria espacial del mapa.
 */
export function buildOperationalMapLayout(
  coordinationIds: readonly CoordinationId[],
  width: number,
  height: number,
  options: OperationalMapLayoutOptions = {},
): OperationalMapLayout {
  const density = options.density ?? 'standard'
  const ids = coordinationIds.filter((id) => id !== GENERAL_COORDINATION_ID)
  const territories = buildTerritories(density, null)
  const terrain = buildTerrain(density)

  if (ids.length === 0 || width <= 0 || height <= 0) {
    return {
      nodes: [],
      territories,
      terrain,
      viewBox: OPERATIONAL_MAP_VIEWBOX,
      focalCoordinationId: null,
      focalTerritoryId: null,
      statusScenario: 'mixed',
      baseSize: MIN_ISLAND_SIZE,
    }
  }

  const resolveStatus =
    options.resolveStatus ??
    ((coordinationId: CoordinationId) =>
      resolveCoordinationOperationalState(coordinationId).status)
  const placementByCanonicalId = new Map(
    COORDINATION_PLACEMENTS.map((placement) => [
      placement.coordinationId,
      placement,
    ]),
  )
  let fallbackIndex = 0

  const entries = ids.map((coordinationId) => {
    const canonicalId = getCoordination(coordinationId).id
    const placement: CoordinationMapPlacement = placementByCanonicalId.get(
      canonicalId,
    ) ?? {
      coordinationId: canonicalId,
      ...FALLBACK_PLACEMENTS[fallbackIndex++ % FALLBACK_PLACEMENTS.length],
    }

    return {
      coordinationId,
      canonicalId,
      placement,
      status: resolveStatus(canonicalId),
    }
  })

  const requestedFocalId = options.focalCoordinationId
    ? getCoordination(options.focalCoordinationId).id
    : null
  const focalEntry =
    entries.find(({ canonicalId }) => canonicalId === requestedFocalId) ??
    [...entries].sort((left, right) => {
      const structuralDifference =
        getFocalPriority(left.canonicalId) -
        getFocalPriority(right.canonicalId)
      if (structuralDifference !== 0) return structuralDifference

      return STATUS_PRIORITY[right.status] - STATUS_PRIORITY[left.status]
    })[0]
  const focalCoordinationId = focalEntry?.coordinationId ?? null
  const focalTerritoryId = focalEntry?.placement.territoryId ?? null
  const statusScenario = resolveStatusScenario(
    entries.map(({ status }) => status),
  )

  const baseSize = Math.max(
    MIN_ISLAND_SIZE,
    Math.min(MAX_ISLAND_SIZE, Math.min(width * 0.104, height * 0.165)),
  )
  const spread = SPREAD_BY_DENSITY[density]

  const nodes: OperationalMapNode[] = entries.map((entry) => {
    const { coordinationId, placement, status } = entry
    const isFocal = coordinationId === focalCoordinationId
    const scaleTier: OperationalMapScaleTier = isFocal
      ? 'focal'
      : status === 'normal'
        ? 'normal'
        : 'affected'
    const size = baseSize * SCALE_BY_TIER[scaleTier]
    const halfSize = size / 2
    const x = spreadFromCenter(placement.x, spread) * width
    const y = spreadFromCenter(placement.y, spread) * height

    return {
      coordinationId,
      territoryId: placement.territoryId,
      x: clamp(x, halfSize + 6, width - halfSize - 6),
      y: clamp(
        y,
        halfSize + NODE_LABEL_GUTTER + 8,
        height - halfSize * 0.9 - 12,
      ),
      size,
      scaleTier,
      status,
      focal: isFocal,
      labelPlacement: 'top' as IslandLabelPlacement,
    }
  })

  return {
    nodes,
    territories: buildTerritories(density, focalTerritoryId),
    terrain,
    viewBox: OPERATIONAL_MAP_VIEWBOX,
    focalCoordinationId,
    focalTerritoryId,
    statusScenario,
    baseSize,
  }
}

function buildTerritories(
  density: OperationalMapDensity,
  focalTerritoryId: string | null,
): readonly OperationalMapTerritory[] {
  const spread = SPREAD_BY_DENSITY[density]

  return OPERATIONAL_TERRITORIES.map((territory) => ({
    id: territory.id,
    sectorCode: territory.sectorCode,
    label: territory.label,
    tone: territory.tone,
    labelX: spreadFromCenter(territory.labelAnchor.x, spread),
    labelY: spreadFromCenter(territory.labelAnchor.y, spread),
    labelAlign: territory.labelAnchor.align,
    holdsFocus: territory.id === focalTerritoryId,
  }))
}

function buildTerrain(density: OperationalMapDensity): OperationalMapTerrain {
  const landPath = territoryOutlinePath(OPERATIONAL_TERRAIN_OUTLINE)

  return {
    landPath,
    coastPath: landPath,
    borderPaths: OPERATIONAL_INTERNAL_BORDERS.map(territoryPolylinePath),
    contourPaths: territoryContourPaths(
      OPERATIONAL_TERRAIN_OUTLINE,
      CONTOUR_LINES[density],
    ),
    markerPoints: territoryMarkerPoints(OPERATIONAL_TERRAIN_OUTLINE),
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}
