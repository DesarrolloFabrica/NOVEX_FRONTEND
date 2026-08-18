import type { CoordinationGraphResponse } from '@/modules/api/coordinations.api'
import {
  GENERAL_COORDINATION_ID,
  resolveIslandColor,
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
import type { CoordinationSummary } from '@/modules/situations/types/situation.types'

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

function toDefinition(item: CoordinationSummary): CoordinationDefinition {
  return {
    id: item.code,
    uuid: item.id,
    name: item.name,
    shortName: item.shortName,
    islandAsset: resolveIslandAssetPath(item.imageAsset, item.code),
    color: resolveIslandColor(item.code, item.color),
    displayOrder: item.displayOrder,
    isActive: item.isActive,
  }
}

function sortActiveDefinitions(
  items: readonly CoordinationSummary[],
): CoordinationDefinition[] {
  return [...items]
    .filter((item) => item.isActive)
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map(toDefinition)
}

function toVisibleCoordinations(
  definitions: readonly CoordinationDefinition[],
): Coordination[] {
  return definitions.map((item) => ({
    id: item.id,
    name: item.name,
    shortName: item.shortName,
    islandAsset: item.islandAsset,
    operationalStatus: 'stable',
    responsiblePeople: [],
    situationIds: [],
    lastActivityAt: null,
  }))
}

/**
 * Hidrata el catálogo y las islas visibles sin esperar el grafo.
 * Sirve para pintar la vista ejecutiva mientras llega la topología.
 */
export function hydrateVisibleCoordinationsFromCatalog(
  institutionalCatalog: readonly CoordinationSummary[],
): Pick<ImpactNetworkGraphModel, 'coordinationIds' | 'coordinations'> {
  const definitions = sortActiveDefinitions(institutionalCatalog)
  setCoordinationCatalog(definitions)

  const visibleDefinitions = definitions.filter(
    (item) => item.id !== GENERAL_COORDINATION_ID,
  )

  return {
    coordinationIds: visibleDefinitions.map((item) => item.id),
    coordinations: toVisibleCoordinations(visibleDefinitions),
  }
}

/**
 * Adapta GET /coordinations/graph al modelo de la Red de impacto.
 * Identificador de isla = code del backend.
 *
 * El grafo llega recortado al alcance operativo del actor, pero una situación
 * puede impactar coordinaciones fuera de ese alcance. Por eso el catálogo de
 * resolución se alimenta del catálogo institucional completo, mientras que las
 * islas navegables siguen limitadas al grafo.
 */
export function mapCoordinationGraphToImpactNetwork(
  graph: CoordinationGraphResponse,
  institutionalCatalog: readonly CoordinationSummary[] = [],
): ImpactNetworkGraphModel {
  const active = [...graph.coordinations]
    .filter((item) => item.isActive)
    .sort((left, right) => left.displayOrder - right.displayOrder)

  const definitions = active.map(toDefinition)
  const catalogDefinitions = new Map<CoordinationId, CoordinationDefinition>()
  for (const definition of [
    ...sortActiveDefinitions(institutionalCatalog),
    ...definitions,
  ]) {
    catalogDefinitions.set(definition.id, definition)
  }
  setCoordinationCatalog(
    [...catalogDefinitions.values()].sort(
      (left, right) => left.displayOrder - right.displayOrder,
    ),
  )

  const visibleDefinitions = definitions.filter(
    (item) => item.id !== GENERAL_COORDINATION_ID,
  )
  const visibleCoordinationIds = new Set(
    visibleDefinitions.map((item) => item.id),
  )

  const uuidToCode = new Map<string, CoordinationId>()
  const codeToUuid = new Map<string, string>()
  for (const item of catalogDefinitions.values()) {
    uuidToCode.set(item.uuid, item.id)
    codeToUuid.set(item.id, item.uuid)
  }

  const visible = active.filter((item) => item.code !== GENERAL_COORDINATION_ID)

  const areas: ImpactArea[] = visible.map((item, index) => ({
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
      if (
        !visibleCoordinationIds.has(sourceAreaId) ||
        !visibleCoordinationIds.has(targetAreaId)
      ) {
        return null
      }
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
    bindings: visible.map((item) => ({
      catalog: 'backend' as const,
      areaId: item.code,
      externalIds: [item.id],
      externalCodes: [item.code],
      externalNames: [item.name, item.shortName],
    })),
  }

  const coordinations: Coordination[] = toVisibleCoordinations(visibleDefinitions)

  return {
    topology,
    coordinationIds: visibleDefinitions.map((item) => item.id),
    coordinations,
    uuidToCode,
    codeToUuid,
    dependencies,
  }
}
