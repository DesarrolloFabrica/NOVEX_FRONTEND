import type { CoordinationGraphResponse } from '@/modules/api/coordinations.api'
import {
  resolveIslandAssetPath,
  setCoordinationCatalog,
  type CoordinationDefinition,
  type CoordinationId,
} from '@/modules/impact-network/data/coordination-islands.config'
import type {
  ImpactArea,
  ImpactDependency,
  ImpactTopology,
} from '@/modules/impact-network/types/impact-network.types'
import type { Coordination } from '@/modules/impact-network/types/operational-network.types'

const DEFAULT_CANVAS = {
  width: 1440,
  height: 900,
  incidentCenter: { x: 720, y: 450 },
}

export interface ImpactNetworkGraphModel {
  topology: ImpactTopology
  coordinationIds: readonly CoordinationId[]
  coordinations: readonly Coordination[]
  uuidToCode: ReadonlyMap<string, CoordinationId>
  codeToUuid: ReadonlyMap<string, string>
  dependencies: readonly ImpactDependency[]
}

function toDefinition(
  item: CoordinationGraphResponse['coordinations'][number],
): CoordinationDefinition {
  return {
    id: item.code,
    uuid: item.id,
    name: item.name,
    shortName: item.shortName,
    islandAsset: resolveIslandAssetPath(item.imageAsset),
    color: item.color,
    displayOrder: item.displayOrder,
    isActive: item.isActive,
  }
}

/**
 * Adapta GET /coordinations/graph al modelo de la Red de impacto.
 * Identificador de isla = code del backend.
 */
export function mapCoordinationGraphToImpactNetwork(
  graph: CoordinationGraphResponse,
): ImpactNetworkGraphModel {
  const active = [...graph.coordinations]
    .filter((item) => item.isActive)
    .sort((left, right) => left.displayOrder - right.displayOrder)

  const definitions = active.map(toDefinition)
  setCoordinationCatalog(definitions)

  const uuidToCode = new Map<string, CoordinationId>()
  const codeToUuid = new Map<string, string>()
  for (const item of active) {
    uuidToCode.set(item.id, item.code)
    codeToUuid.set(item.code, item.id)
  }

  const areas: ImpactArea[] = active.map((item, index) => ({
    id: item.code,
    code: item.code,
    name: item.name,
    position: {
      x: DEFAULT_CANVAS.incidentCenter.x,
      y: DEFAULT_CANVAS.incidentCenter.y + index,
    },
  }))

  const dependencies: ImpactDependency[] = graph.dependencies
    .map((dependency) => {
      const sourceAreaId = uuidToCode.get(dependency.sourceCoordinationId)
      const targetAreaId = uuidToCode.get(dependency.targetCoordinationId)
      if (!sourceAreaId || !targetAreaId) return null
      return {
        id: dependency.id,
        sourceAreaId,
        targetAreaId,
      }
    })
    .filter((item): item is ImpactDependency => item !== null)

  const topology: ImpactTopology = {
    canvas: DEFAULT_CANVAS,
    areas,
    dependencies,
    bindings: active.map((item) => ({
      catalog: 'backend' as const,
      areaId: item.code,
      externalIds: [item.id],
      externalCodes: [item.code],
      externalNames: [item.name, item.shortName],
    })),
  }

  const coordinations: Coordination[] = definitions.map((item) => ({
    id: item.id,
    name: item.name,
    shortName: item.shortName,
    islandAsset: item.islandAsset,
    operationalStatus: 'stable',
    responsiblePeople: [],
    situationIds: [],
    lastActivityAt: null,
  }))

  return {
    topology,
    coordinationIds: definitions.map((item) => item.id),
    coordinations,
    uuidToCode,
    codeToUuid,
    dependencies,
  }
}
