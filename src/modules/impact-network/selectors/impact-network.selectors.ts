import {
  getCoordination,
  getCoordinationCatalog,
  resolveCoordinationId,
  resolveCoordinationIdOrGeneral,
  starEdgeId,
  type CoordinationId,
} from '@/modules/impact-network/data/coordination-islands.config'
import { IMPACT_TOPOLOGY } from '@/modules/impact-network/data/impact-topology.mock'
import {
  buildIncidentPropagationPaths,
  resolveAreaId,
} from '@/modules/impact-network/engine/impact-paths'
import type {
  AreaAggregationOptions,
  AreaImpactAggregate,
  DependencyTraffic,
  FocusedPropagation,
  ImpactAreaId,
  ImpactAreaRole,
  ImpactIncident,
  ImpactNetworkFilters,
  ImpactNetworkStatus,
  ImpactPrediction,
  ImpactTopology,
  IncidentReplay,
  IncidentSlot,
  ReplayFrame,
  StarPropagationFrame,
} from '@/modules/impact-network/types/impact-network.types'
import type {
  OperationalEvent,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'

export const EMPTY_IMPACT_FILTERS: ImpactNetworkFilters = {
  statuses: [],
  sourceAreaIds: [],
  riskLevels: [],
  reportedFrom: null,
  reportedTo: null,
}

export const DEFAULT_IMPACT_FILTERS = EMPTY_IMPACT_FILTERS

const RISK_RANK: Record<RiskLevel, number> = {
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)]
}

function isActiveStatus(status: OperationalEvent['status']): boolean {
  return status === 'open' || status === 'monitoring'
}

function toExpansionState(
  status: OperationalEvent['status'],
): ImpactIncident['expansionState'] {
  if (status === 'open') return 'active'
  if (status === 'monitoring') return 'contained'
  if (status === 'resolved') return 'recovering'
  return 'closed'
}

function canonicalAreaName(
  areaId: ImpactAreaId | null,
  fallback: string,
  topology: ImpactTopology,
): string {
  return (
    topology.areas.find((area) => area.id === areaId)?.name ??
    fallback
  )
}

/**
 * Adapta OperationalEvent sin duplicar hechos. Los nombres e ids del grafo
 * quedan canónicos; el eventId sigue apuntando al expediente original.
 */
export function mapOperationalEventToImpactIncident(
  event: OperationalEvent,
  topology: ImpactTopology = IMPACT_TOPOLOGY,
): ImpactIncident {
  const sourceAreaId =
    resolveAreaId(event.sourceAreaId, topology) ??
    resolveAreaId(event.sourceAreaName, topology)
  const interpretation = event.interpretation
  const affectedAreaIds: ImpactAreaId[] = []
  const affectedIds = interpretation?.affectedAreaIds ?? []
  const affectedNames = interpretation?.affectedAreaNames ?? []
  const affectedLength = Math.max(affectedIds.length, affectedNames.length)

  if (sourceAreaId) affectedAreaIds.push(sourceAreaId)
  for (let index = 0; index < affectedLength; index += 1) {
    const areaId =
      resolveAreaId(affectedIds[index], topology) ??
      resolveAreaId(affectedNames[index], topology)
    if (areaId) affectedAreaIds.push(areaId)
  }

  const canonicalAffectedIds = unique(affectedAreaIds)
  return {
    eventId: event.id,
    title: event.title,
    status: event.status,
    sourceAreaId,
    sourceAreaName: canonicalAreaName(
      sourceAreaId,
      event.sourceAreaName,
      topology,
    ),
    riskLevel: interpretation?.riskLevel ?? null,
    riskScore: clamp(interpretation?.riskScore ?? 0, 0, 100),
    impactSeverity: interpretation?.impactSeverity ?? null,
    affectedAreaIds: canonicalAffectedIds,
    affectedAreaNames: canonicalAffectedIds.map((areaId) =>
      canonicalAreaName(areaId, areaId, topology),
    ),
    reportedAt: event.reportedAt,
    lastUpdateAt: event.lastUpdateAt ?? event.createdAt ?? event.reportedAt,
    active: isActiveStatus(event.status),
    expansionState: toExpansionState(event.status),
    hasInterpretation: interpretation !== null,
  }
}

export function mapOperationalEventsToImpactIncidents(
  events: readonly OperationalEvent[],
  topology: ImpactTopology = IMPACT_TOPOLOGY,
): ImpactIncident[] {
  return events.map((event) =>
    mapOperationalEventToImpactIncident(event, topology),
  )
}

function parseBoundary(
  value: string | null,
  endOfDay: boolean,
): number | null {
  if (!value) return null
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const parsed = Date.parse(
    dateOnly
      ? `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
      : value,
  )
  return Number.isFinite(parsed) ? parsed : null
}

export function filterImpactIncidents(
  incidents: readonly ImpactIncident[],
  filters: ImpactNetworkFilters = EMPTY_IMPACT_FILTERS,
): ImpactIncident[] {
  const from = parseBoundary(filters.reportedFrom, false)
  const to = parseBoundary(filters.reportedTo, true)

  return incidents.filter((incident) => {
    if (
      filters.statuses.length > 0 &&
      !filters.statuses.includes(incident.status)
    ) {
      return false
    }
    if (
      filters.sourceAreaIds.length > 0 &&
      (!incident.sourceAreaId ||
        !filters.sourceAreaIds.includes(incident.sourceAreaId))
    ) {
      return false
    }
    if (
      filters.riskLevels.length > 0 &&
      (!incident.riskLevel ||
        !filters.riskLevels.includes(incident.riskLevel))
    ) {
      return false
    }

    if (from === null && to === null) return true
    const reportedAt = Date.parse(incident.reportedAt)
    if (!Number.isFinite(reportedAt)) return false
    if (from !== null && reportedAt < from) return false
    if (to !== null && reportedAt > to) return false
    return true
  })
}

export function selectImpactIncidents(
  events: readonly OperationalEvent[],
  filters: ImpactNetworkFilters = EMPTY_IMPACT_FILTERS,
  topology: ImpactTopology = IMPACT_TOPOLOGY,
): ImpactIncident[] {
  return filterImpactIncidents(
    mapOperationalEventsToImpactIncidents(events, topology),
    filters,
  )
}

function comparePriority(a: ImpactIncident, b: ImpactIncident): number {
  if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore

  const severityA = a.impactSeverity ?? 0
  const severityB = b.impactSeverity ?? 0
  if (severityB !== severityA) return severityB - severityA

  if (b.affectedAreaIds.length !== a.affectedAreaIds.length) {
    return b.affectedAreaIds.length - a.affectedAreaIds.length
  }

  const reportedComparison = a.reportedAt.localeCompare(b.reportedAt)
  if (reportedComparison !== 0) return reportedComparison
  return a.eventId.localeCompare(b.eventId)
}

/** Solo las situaciones activas pueden convertirse en Foco Operacional. */
export function prioritizeImpactIncidents(
  incidents: readonly ImpactIncident[],
): ImpactIncident[] {
  return incidents.filter((incident) => incident.active).sort(comparePriority)
}

export function selectOperationalFocus(
  incidents: readonly ImpactIncident[],
): ImpactIncident | null {
  return prioritizeImpactIncidents(incidents)[0] ?? null
}

export function deriveNetworkStatus(
  incidents: readonly ImpactIncident[],
): ImpactNetworkStatus {
  const active = incidents.filter((incident) => incident.active)
  if (active.some((incident) => incident.riskLevel === 'critical')) {
    return 'critical'
  }
  if (
    active.some(
      (incident) =>
        incident.riskLevel === 'moderate' || incident.riskLevel === 'high',
    )
  ) {
    return 'attention'
  }
  return 'stable'
}

function strongestRisk(incidents: readonly ImpactIncident[]): RiskLevel | null {
  let strongest: RiskLevel | null = null
  for (const incident of incidents) {
    if (
      incident.riskLevel &&
      (!strongest || RISK_RANK[incident.riskLevel] > RISK_RANK[strongest])
    ) {
      strongest = incident.riskLevel
    }
  }
  return strongest
}

function orderedRoles(roles: ReadonlySet<ImpactAreaRole>): ImpactAreaRole[] {
  const order: readonly ImpactAreaRole[] = [
    'origin',
    'affected',
    'potential',
  ]
  const result = order.filter((role) => roles.has(role))
  return result.length > 0 ? result : ['unrelated']
}

function primaryRole(
  areaId: ImpactAreaId,
  roles: readonly ImpactAreaRole[],
  focused: ImpactIncident | undefined,
  prediction: ImpactPrediction | null | undefined,
): ImpactAreaRole {
  if (focused) {
    if (focused.sourceAreaId === areaId) return 'origin'
    if (focused.affectedAreaIds.includes(areaId)) return 'affected'
    if (prediction?.potentialAreaIds.includes(areaId)) return 'potential'
    return 'unrelated'
  }
  if (roles.includes('origin')) return 'origin'
  if (roles.includes('affected')) return 'affected'
  if (roles.includes('potential')) return 'potential'
  return 'unrelated'
}

export function aggregateAreaSignals(
  incidents: readonly ImpactIncident[],
  topology: ImpactTopology = IMPACT_TOPOLOGY,
  options: AreaAggregationOptions = {},
): AreaImpactAggregate[] {
  const focused = options.focusedEventId
    ? incidents.find((incident) => incident.eventId === options.focusedEventId)
    : undefined

  return topology.areas.map((area) => {
    const related = incidents.filter(
      (incident) =>
        incident.sourceAreaId === area.id ||
        incident.affectedAreaIds.includes(area.id),
    )
    const incidentIds = unique(related.map((incident) => incident.eventId))
    const roles = new Set<ImpactAreaRole>()
    if (related.some((incident) => incident.sourceAreaId === area.id)) {
      roles.add('origin')
    }
    if (
      related.some(
        (incident) =>
          incident.sourceAreaId !== area.id &&
          incident.affectedAreaIds.includes(area.id),
      )
    ) {
      roles.add('affected')
    }
    if (options.prediction?.potentialAreaIds.includes(area.id)) {
      roles.add('potential')
    }

    const maxRiskScore = related.reduce(
      (maximum, incident) => Math.max(maximum, incident.riskScore),
      0,
    )
    const overlapBoost = Math.min(Math.max(incidentIds.length - 1, 0) * 0.16, 0.32)
    const intensity =
      incidentIds.length === 0
        ? 0
        : clamp(Math.max(0.12, maxRiskScore / 100 * 0.78 + overlapBoost), 0, 1)
    const roleList = orderedRoles(roles)

    return {
      areaId: area.id,
      activeCount: related.filter((incident) => incident.active).length,
      incidentCount: incidentIds.length,
      maxRisk: strongestRisk(related),
      maxRiskScore,
      intensity,
      role: primaryRole(area.id, roleList, focused, options.prediction),
      roles: roleList,
      incidentIds,
    }
  })
}

interface TrafficDraft extends DependencyTraffic {
  qualifiesForHighTraffic: boolean
}

export function aggregateDependencyTraffic(
  incidents: readonly ImpactIncident[],
  topology: ImpactTopology = IMPACT_TOPOLOGY,
  prediction: ImpactPrediction | null = null,
): DependencyTraffic[] {
  const incidentIdsByDependency = new Map<string, Set<string>>()
  const riskByDependency = new Map<string, number>()

  for (const incident of incidents) {
    const dependencyIds = unique(
      buildIncidentPropagationPaths(incident, topology).flatMap(
        (path) => path.dependencyIds,
      ),
    )
    for (const dependencyId of dependencyIds) {
      const eventIds =
        incidentIdsByDependency.get(dependencyId) ?? new Set<string>()
      eventIds.add(incident.eventId)
      incidentIdsByDependency.set(dependencyId, eventIds)
      riskByDependency.set(
        dependencyId,
        Math.max(riskByDependency.get(dependencyId) ?? 0, incident.riskScore),
      )
    }
  }

  const predictionByDependency = new Map(
    (prediction?.steps ?? []).map((step) => [
      step.dependencyId,
      step.probability,
    ]),
  )

  const drafts: TrafficDraft[] = topology.dependencies.map((dependency) => {
    const incidentIds = [
      ...(incidentIdsByDependency.get(dependency.id) ?? new Set<string>()),
    ]
    const incidentCount = incidentIds.length
    const maxRiskScore = riskByDependency.get(dependency.id) ?? 0
    const predictedProbability =
      predictionByDependency.get(dependency.id) ?? 0
    const role =
      incidentCount > 0
        ? 'actual'
        : predictedProbability > 0
          ? 'predicted'
          : 'base'
    const intensity =
      role === 'actual'
        ? clamp(
            maxRiskScore / 100 * 0.72 +
              Math.min(Math.max(incidentCount - 1, 0) * 0.18, 0.28),
            0,
            1,
          )
        : role === 'predicted'
          ? predictedProbability
          : 0

    return {
      dependencyId: dependency.id,
      sourceAreaId: dependency.sourceAreaId,
      targetAreaId: dependency.targetAreaId,
      path: [dependency.sourceAreaId, dependency.targetAreaId],
      role,
      incidentIds,
      incidentCount,
      maxRiskScore,
      intensity,
      strokeWidth:
        role === 'actual'
          ? 1.8 + intensity * 2.7
          : role === 'predicted'
            ? 1.8
            : 1.4,
      particleCount: role === 'actual' ? Math.min(3, incidentCount) : 0,
      highTrafficRank: null,
      qualifiesForHighTraffic:
        role === 'actual' && (incidentCount > 1 || intensity >= 0.7),
    }
  })

  const rankedIds = [...drafts]
    .filter((traffic) => traffic.qualifiesForHighTraffic)
    .sort(
      (a, b) =>
        b.incidentCount - a.incidentCount ||
        b.intensity - a.intensity ||
        a.dependencyId.localeCompare(b.dependencyId),
    )
    .slice(0, 5)
    .map((traffic) => traffic.dependencyId)

  return drafts.map(({ qualifiesForHighTraffic: _qualifies, ...traffic }) => ({
    ...traffic,
    highTrafficRank: rankedIds.includes(traffic.dependencyId)
      ? rankedIds.indexOf(traffic.dependencyId) + 1
      : null,
  }))
}

function compareForDisplay(a: ImpactIncident, b: ImpactIncident): number {
  if (a.active !== b.active) return a.active ? -1 : 1
  return comparePriority(a, b)
}

function roundedCoordinate(value: number): number {
  return Math.round(value * 1_000) / 1_000
}

function polarPosition(
  center: { x: number; y: number },
  index: number,
  capacities: readonly number[],
  radii: readonly number[],
): { x: number; y: number } {
  let remaining = index
  for (let ring = 0; ring < capacities.length; ring += 1) {
    const capacity = capacities[ring] ?? 1
    if (remaining < capacity) {
      const angle = -Math.PI / 2 + remaining * (Math.PI * 2 / capacity)
      const radius = radii[ring] ?? radii.at(-1) ?? 0
      return {
        x: roundedCoordinate(center.x + Math.cos(angle) * radius),
        y: roundedCoordinate(center.y + Math.sin(angle) * radius),
      }
    }
    remaining -= capacity
  }
  return { ...center }
}

/**
 * Hasta veinte núcleos en ranuras deterministas. En foco, solo el seleccionado
 * ocupa el centro; los demás conservan un orden espacial predecible.
 */
export function placeIncidentSlots(
  incidents: readonly ImpactIncident[],
  topology: ImpactTopology = IMPACT_TOPOLOGY,
  focusedEventId: string | null = null,
): IncidentSlot[] {
  const ordered = [...incidents].sort(compareForDisplay).slice(0, 20)
  const focused = focusedEventId
    ? ordered.find((incident) => incident.eventId === focusedEventId)
    : undefined
  const others = focused
    ? ordered.filter((incident) => incident.eventId !== focused.eventId)
    : ordered

  const slots: IncidentSlot[] = []
  if (focused) {
    slots.push({
      eventId: focused.eventId,
      slotIndex: 0,
      position: { ...topology.canvas.incidentCenter },
      focused: true,
      scale: 1,
      opacity: 1,
    })
  }

  const capacities = focused ? [8, 12] : [6, 8, 6]
  const radii = focused ? [230, 340] : [175, 285, 380]
  for (let index = 0; index < others.length; index += 1) {
    const incident = others[index]
    if (!incident) continue
    slots.push({
      eventId: incident.eventId,
      slotIndex: focused ? index + 1 : index,
      position: polarPosition(
        topology.canvas.incidentCenter,
        index,
        capacities,
        radii,
      ),
      focused: false,
      scale: focused ? 0.64 : index < 6 ? 0.82 : 0.7,
      opacity: focused ? 0.32 : 1,
    })
  }
  return slots
}

export function buildReplayFrames(replay: IncidentReplay): ReplayFrame[] {
  const steps = replay.steps
    .map((step, originalIndex) => ({ step, originalIndex }))
    .sort(
      (a, b) =>
        a.step.offsetMs - b.step.offsetMs ||
        a.originalIndex - b.originalIndex,
    )
    .map(({ step }) => step)
  const activeAreaIds = new Set<ImpactAreaId>()
  const activeDependencyIds = new Set<string>()

  return steps.map((step, index) => {
    if (step.areaId) activeAreaIds.add(step.areaId)
    if (step.dependencyId) activeDependencyIds.add(step.dependencyId)

    return {
      index,
      playbackAtMs:
        index * (replay.traversalDurationMs + replay.settlementDurationMs),
      sourceOffsetMs: step.offsetMs,
      currentStep: { ...step },
      completedStepIds: steps.slice(0, index).map((item) => item.id),
      futureStepIds: steps.slice(index + 1).map((item) => item.id),
      activeAreaIds: [...activeAreaIds],
      activeDependencyIds: [...activeDependencyIds],
      complete: index === steps.length - 1,
    }
  })
}

export function selectReplayFrameAt(
  replay: IncidentReplay,
  elapsedMs: number,
): ReplayFrame | null {
  const frames = buildReplayFrames(replay)
  if (frames.length === 0) return null
  const safeElapsed = Math.max(0, elapsedMs)
  return (
    [...frames]
      .reverse()
      .find((frame) => frame.playbackAtMs <= safeElapsed) ?? frames[0] ?? null
  )
}

function uniqueCoordinationIds(values: readonly CoordinationId[]): CoordinationId[] {
  return [...new Set(values)]
}

function resolveIncidentCoordinationIds(
  incident: ImpactIncident,
  topology: ImpactTopology,
  affectedCoordinationIdsOverride?: readonly CoordinationId[] | null,
): {
  originCoordinationId: CoordinationId
  affectedCoordinationIds: CoordinationId[]
} {
  const sourceCandidates = [
    incident.sourceAreaId,
    incident.sourceAreaName,
    incident.sourceAreaId
      ? resolveAreaId(incident.sourceAreaId, topology)
      : null,
  ]
  const originCoordinationId =
    sourceCandidates
      .map((candidate) => resolveCoordinationId(candidate ?? undefined))
      .find(Boolean) ??
    getCoordinationCatalog()[0]?.id ??
    'unknown'

  // `null` = sin override (usar áreas del incidente/IA). `[]` = confirmado vacío.
  if (affectedCoordinationIdsOverride != null) {
    return {
      originCoordinationId,
      affectedCoordinationIds: uniqueCoordinationIds(
        affectedCoordinationIdsOverride.filter(
          (id) => id !== originCoordinationId,
        ),
      ),
    }
  }

  const affectedCoordinationIds = uniqueCoordinationIds(
    incident.affectedAreaIds
      .map((areaId) => {
        const areaName =
          incident.affectedAreaNames[
            incident.affectedAreaIds.indexOf(areaId)
          ] ?? areaId
        return (
          resolveCoordinationId(areaId) ??
          resolveCoordinationId(areaName) ??
          resolveCoordinationId(resolveAreaId(areaId, topology) ?? undefined)
        )
      })
      .filter((id): id is CoordinationId => Boolean(id))
      .filter((id) => id !== originCoordinationId),
  )

  return { originCoordinationId, affectedCoordinationIds }
}

export function selectFocusedPropagation(
  incident: ImpactIncident | null,
  replay: IncidentReplay | null = null,
  topology: ImpactTopology = { canvas: { width: 0, height: 0, incidentCenter: { x: 0, y: 0 } }, areas: [], dependencies: [], bindings: [] },
  affectedCoordinationIdsOverride: readonly CoordinationId[] | null = null,
): FocusedPropagation | null {
  if (!incident) return null

  const { originCoordinationId, affectedCoordinationIds } =
    resolveIncidentCoordinationIds(
      incident,
      topology,
      affectedCoordinationIdsOverride,
    )

  let propagationOrder = [...affectedCoordinationIds]
  if (replay) {
    const replayOrder = replay.steps
      .filter((step) => step.type === 'area_impacted' && step.areaId)
      .map(
        (step) =>
          resolveCoordinationId(step.areaId!) ??
          resolveCoordinationId(
            resolveAreaId(step.areaId!, topology) ?? undefined,
          ),
      )
      .filter((id): id is CoordinationId => Boolean(id))
      .filter((id) => id !== originCoordinationId)

    if (replayOrder.length > 0) {
      propagationOrder = uniqueCoordinationIds([
        ...replayOrder,
        ...affectedCoordinationIds,
      ])
    }
  }

  const edges = propagationOrder.map((targetCoordinationId, order) => ({
    id: starEdgeId(originCoordinationId, targetCoordinationId),
    targetCoordinationId,
    order,
  }))

  return {
    originCoordinationId,
    originName: getCoordination(originCoordinationId).name,
    affectedCoordinationIds: propagationOrder,
    affectedNames: propagationOrder.map(
      (id) => getCoordination(id).name,
    ),
    edges,
    propagationOrder,
    riskLevel: incident.riskLevel,
  }
}

export function buildStarPropagationFrames(
  replay: IncidentReplay,
  originCoordinationId: CoordinationId,
  affectedCoordinationIds: readonly CoordinationId[],
  options?: {
    traversalDurationMs?: number
    settlementDurationMs?: number
  },
): StarPropagationFrame[] {
  const traversalDurationMs =
    options?.traversalDurationMs ?? replay.traversalDurationMs
  const settlementDurationMs =
    options?.settlementDurationMs ?? replay.settlementDurationMs
  const stepDuration = traversalDurationMs + settlementDurationMs

  const impactedSteps = replay.steps
    .filter((step) => step.type === 'area_impacted' && step.areaId)
    .map((step) => ({
      step,
      coordinationId:
        resolveCoordinationId(step.areaId!) ??
        resolveCoordinationIdOrGeneral(step.areaId!),
    }))
    .filter(
      (item) =>
        item.coordinationId !== originCoordinationId &&
        affectedCoordinationIds.includes(item.coordinationId),
    )

  const orderedTargets =
    impactedSteps.length > 0
      ? uniqueCoordinationIds(impactedSteps.map((item) => item.coordinationId))
      : [...affectedCoordinationIds]

  const frames: StarPropagationFrame[] = [
    {
      index: 0,
      playbackAtMs: 0,
      phase: 'origin_pulse',
      activeEdgeId: null,
      propagatingCoordinationId: null,
      illuminatedCoordinationIds: [originCoordinationId],
      complete: orderedTargets.length === 0,
    },
  ]

  let frameIndex = 1
  const illuminated = new Set<CoordinationId>([originCoordinationId])

  for (const targetId of orderedTargets) {
    const edgeId = starEdgeId(originCoordinationId, targetId)

    frames.push({
      index: frameIndex,
      playbackAtMs: frameIndex * stepDuration,
      phase: 'edge_travel',
      activeEdgeId: edgeId,
      propagatingCoordinationId: targetId,
      illuminatedCoordinationIds: [...illuminated],
      complete: false,
    })
    frameIndex += 1

    illuminated.add(targetId)
    frames.push({
      index: frameIndex,
      playbackAtMs: frameIndex * stepDuration,
      phase: 'target_pulse',
      activeEdgeId: edgeId,
      propagatingCoordinationId: targetId,
      illuminatedCoordinationIds: [...illuminated],
      complete: false,
    })
    frameIndex += 1

    frames.push({
      index: frameIndex,
      playbackAtMs: frameIndex * stepDuration,
      phase: 'illuminated',
      activeEdgeId: edgeId,
      propagatingCoordinationId: null,
      illuminatedCoordinationIds: [...illuminated],
      complete: false,
    })
    frameIndex += 1
  }

  if (frames.length > 0) {
    const last = frames.at(-1)!
    frames[frames.length - 1] = {
      ...last,
      phase: 'complete',
      complete: true,
    }
  }

  return frames
}

export function selectStarPropagationFrameAt(
  frames: readonly StarPropagationFrame[],
  elapsedMs: number,
): StarPropagationFrame | null {
  if (frames.length === 0) return null
  const safeElapsed = Math.max(0, elapsedMs)
  return (
    [...frames]
      .reverse()
      .find((frame) => frame.playbackAtMs <= safeElapsed) ?? frames[0] ?? null
  )
}

