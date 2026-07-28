export type {
  AreaAggregationOptions,
  AreaImpactAggregate,
  DependencyTraffic,
  DependencyTrafficRole,
  FocusedPropagation,
  FocusedPropagationEdge,
  ImpactArea,
  ImpactAreaBinding,
  ImpactAreaId,
  ImpactAreaRole,
  ImpactBindingCatalog,
  ImpactCanvas,
  ImpactDependency,
  ImpactExpansionState,
  ImpactIncident,
  InstitutionalImpactAreaId,
  ImpactNetworkDataProvider,
  ImpactNetworkFilters,
  ImpactNetworkStatus,
  ImpactPoint,
  ImpactPrediction,
  ImpactPredictionStep,
  ImpactSimulationOptions,
  ImpactTopology,
  IncidentPropagationPath,
  IncidentReplay,
  IncidentReplayStep,
  IncidentReplayStepType,
  IncidentSlot,
  ReplayFrame,
  StarPropagationFrame,
  StarPropagationPhase,
} from '@/modules/impact-network/types/impact-network.types'

export {
  COORDINATION_CATALOG,
  getCoordination,
  getCoordinationIslandAsset,
  resolveCoordinationId,
  resolveCoordinationIdOrGeneral,
  starEdgeId,
} from '@/modules/impact-network/data/coordination-islands.config'
export type { CoordinationDefinition, CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'

export {
  IMPACT_AREAS,
  IMPACT_AREA_BINDINGS,
  IMPACT_CANVAS,
  IMPACT_DEPENDENCIES,
  IMPACT_TOPOLOGY,
  impactDependencyId,
} from '@/modules/impact-network/data/impact-topology.mock'
export {
  BACKEND_SEED_EVENT_IDS,
  FRONTEND_EVENT_IDS,
  IMPACT_PREDICTIONS,
  IMPACT_REPLAYS,
  IMPACT_SCENARIO_EVENT_IDS,
} from '@/modules/impact-network/data/impact-scenarios.mock'
export {
  buildImpactNetworkStressFixture,
  IMPACT_STRESS_EXPECTATIONS,
} from '@/modules/impact-network/data/impact-stress.fixture'
export type {
  ImpactNetworkStressFixture,
} from '@/modules/impact-network/data/impact-stress.fixture'

export {
  getImpactPrediction,
  getImpactReplay,
  getPrediction,
  getReplay,
  impactNetworkDataProvider,
  mockImpactNetworkDataProvider,
} from '@/modules/impact-network/services/impact-network.provider'

export {
  buildIncidentPropagationPaths,
  findShortestDependencyPath,
  normalizeAreaToken,
  resolveAreaId,
} from '@/modules/impact-network/engine/impact-paths'
export type { TopologyPath } from '@/modules/impact-network/engine/impact-paths'
export {
  buildQuadraticEdgePath,
  computeEdgeAnchors,
  computeRadialLayout,
} from '@/modules/impact-network/engine/radial-layout'
export type {
  EdgeAnchor,
  RadialNodeLayout,
  RadialSceneLayout,
  RectBounds,
} from '@/modules/impact-network/engine/radial-layout'

export {
  DEFAULT_IMPACT_FILTERS,
  EMPTY_IMPACT_FILTERS,
  aggregateAreaSignals,
  aggregateDependencyTraffic,
  buildReplayFrames,
  buildStarPropagationFrames,
  deriveNetworkStatus,
  filterImpactIncidents,
  mapOperationalEventToImpactIncident,
  mapOperationalEventsToImpactIncidents,
  placeIncidentSlots,
  prioritizeImpactIncidents,
  selectFocusedPropagation,
  selectImpactIncidents,
  selectOperationalFocus,
  selectReplayFrameAt,
  selectStarPropagationFrameAt,
} from '@/modules/impact-network/selectors/impact-network.selectors'
