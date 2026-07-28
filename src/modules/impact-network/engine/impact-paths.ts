import { IMPACT_TOPOLOGY } from '@/modules/impact-network/data/impact-topology.mock'
import type {
  ImpactAreaId,
  ImpactTopology,
  IncidentPropagationPath,
  ImpactIncident,
} from '@/modules/impact-network/types/impact-network.types'

export interface TopologyPath {
  areaIds: readonly ImpactAreaId[]
  dependencyIds: readonly string[]
}

/** Normalización común para ids, códigos y nombres con/sin tildes. */
export function normalizeAreaToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Resuelve ids de mocks frontend, códigos/nombres del backend y los propios
 * ids/nombres canónicos del mapa.
 */
export function resolveAreaId(
  value: string | null | undefined,
  topology: ImpactTopology = IMPACT_TOPOLOGY,
): ImpactAreaId | null {
  if (!value) return null
  const token = normalizeAreaToken(value)
  if (!token) return null

  const canonical = topology.areas.find(
    (area) =>
      normalizeAreaToken(area.id) === token ||
      normalizeAreaToken(area.code) === token ||
      normalizeAreaToken(area.name) === token,
  )
  if (canonical) return canonical.id

  for (const binding of topology.bindings) {
    const candidates = [
      ...binding.externalIds,
      ...binding.externalCodes,
      ...binding.externalNames,
    ]
    if (candidates.some((candidate) => normalizeAreaToken(candidate) === token)) {
      return binding.areaId
    }
  }

  return null
}

export function findShortestDependencyPath(
  topology: ImpactTopology,
  sourceAreaId: ImpactAreaId,
  targetAreaId: ImpactAreaId,
): TopologyPath | null {
  if (sourceAreaId === targetAreaId) {
    return { areaIds: [sourceAreaId], dependencyIds: [] }
  }

  const queue: Array<{
    areaId: ImpactAreaId
    areaIds: ImpactAreaId[]
    dependencyIds: string[]
  }> = [{ areaId: sourceAreaId, areaIds: [sourceAreaId], dependencyIds: [] }]
  const visited = new Set<ImpactAreaId>([sourceAreaId])

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) break

    const outgoing = topology.dependencies.filter(
      (dependency) => dependency.sourceAreaId === current.areaId,
    )
    for (const dependency of outgoing) {
      if (visited.has(dependency.targetAreaId)) continue

      const areaIds = [...current.areaIds, dependency.targetAreaId]
      const dependencyIds = [...current.dependencyIds, dependency.id]
      if (dependency.targetAreaId === targetAreaId) {
        return { areaIds, dependencyIds }
      }

      visited.add(dependency.targetAreaId)
      queue.push({
        areaId: dependency.targetAreaId,
        areaIds,
        dependencyIds,
      })
    }
  }

  return null
}

/**
 * Construye una ruta válida por cada área afectada alcanzable. No inventa
 * conexiones inversas para catálogos cuya relación no existe en la topología.
 */
export function buildIncidentPropagationPaths(
  incident: ImpactIncident,
  topology: ImpactTopology = IMPACT_TOPOLOGY,
): IncidentPropagationPath[] {
  if (!incident.sourceAreaId) return []

  const paths: IncidentPropagationPath[] = []
  for (const targetAreaId of incident.affectedAreaIds) {
    if (targetAreaId === incident.sourceAreaId) continue
    const path = findShortestDependencyPath(
      topology,
      incident.sourceAreaId,
      targetAreaId,
    )
    if (!path || path.dependencyIds.length === 0) continue
    paths.push({
      eventId: incident.eventId,
      areaIds: path.areaIds,
      dependencyIds: path.dependencyIds,
    })
  }
  return paths
}

