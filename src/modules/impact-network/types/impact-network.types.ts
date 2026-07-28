import type {
  ImpactSeverity,
  OperationalEventStatus,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'

export type InstitutionalImpactAreaId =
  | 'technology'
  | 'registry'
  | 'operations'
  | 'lms'
  | 'wellbeing'
  | 'finance'
  | 'library'
  | 'planning'
  | 'people'
  | 'communications'
  | 'infrastructure'
  | 'academic-direction'

/**
 * Conserva autocompletado para el mapa institucional inicial y permite que un
 * proveedor futuro incorpore áreas nuevas con coordenadas persistidas.
 */
export type ImpactAreaId =
  | InstitutionalImpactAreaId
  | (string & Record<never, never>)

export interface ImpactPoint {
  x: number
  y: number
}

export interface ImpactCanvas {
  width: number
  height: number
  incidentCenter: ImpactPoint
}

export interface ImpactArea {
  id: ImpactAreaId
  code: string
  name: string
  position: ImpactPoint
}

export interface ImpactDependency {
  id: string
  sourceAreaId: ImpactAreaId
  targetAreaId: ImpactAreaId
}

export type ImpactBindingCatalog = 'backend' | 'frontend'

/**
 * Relaciona un registro externo con una única área estable del mapa.
 * Los ids del backend pueden variar entre entornos, por eso también se
 * resuelven códigos y nombres normalizados.
 */
export interface ImpactAreaBinding {
  catalog: ImpactBindingCatalog
  areaId: ImpactAreaId
  externalIds: readonly string[]
  externalCodes: readonly string[]
  externalNames: readonly string[]
}

export interface ImpactTopology {
  canvas: ImpactCanvas
  areas: readonly ImpactArea[]
  dependencies: readonly ImpactDependency[]
  bindings: readonly ImpactAreaBinding[]
}

export type IncidentReplayStepType =
  | 'detected'
  | 'area_impacted'
  | 'communication'
  | 'mitigation'
  | 'recovery'

export interface IncidentReplayStep {
  id: string
  type: IncidentReplayStepType
  label: string
  /** Momento institucional del hecho, en ISO 8601. */
  at: string
  /** Diferencia respecto a la detección. No controla la velocidad de UI. */
  offsetMs: number
  areaId?: ImpactAreaId
  dependencyId?: string
}

export interface IncidentReplay {
  eventId: string
  steps: readonly IncidentReplayStep[]
  traversalDurationMs: number
  settlementDurationMs: number
  recoveryDurationMs?: number
}

export interface ImpactPredictionStep {
  dependencyId: string
  areaId: ImpactAreaId
  etaMinutes: number
  probability: number
}

export interface ImpactPrediction {
  eventId: string
  generatedAt: string
  horizonMinutes: number
  potentialAreaIds: readonly ImpactAreaId[]
  steps: readonly ImpactPredictionStep[]
}

export interface ImpactSimulationOptions {
  horizonMinutes?: number
}

export interface ImpactNetworkDataProvider {
  loadTopology(): Promise<ImpactTopology>
  loadReplay(eventId: string): Promise<IncidentReplay | null>
  simulateImpact(
    eventId: string,
    options?: ImpactSimulationOptions,
  ): Promise<ImpactPrediction | null>
}

export interface ImpactNetworkFilters {
  statuses: readonly OperationalEventStatus[]
  sourceAreaIds: readonly ImpactAreaId[]
  riskLevels: readonly RiskLevel[]
  /** Límite inclusivo. Acepta YYYY-MM-DD o ISO 8601. */
  reportedFrom: string | null
  /** Límite inclusivo. Acepta YYYY-MM-DD o ISO 8601. */
  reportedTo: string | null
}

export type ImpactExpansionState =
  | 'active'
  | 'contained'
  | 'recovering'
  | 'closed'

/** Vista normalizada de OperationalEvent para el mapa. */
export interface ImpactIncident {
  eventId: string
  title: string
  status: OperationalEventStatus
  sourceAreaId: ImpactAreaId | null
  sourceAreaName: string
  riskLevel: RiskLevel | null
  riskScore: number
  impactSeverity: ImpactSeverity | null
  affectedAreaIds: readonly ImpactAreaId[]
  affectedAreaNames: readonly string[]
  reportedAt: string
  lastUpdateAt: string
  active: boolean
  expansionState: ImpactExpansionState
  hasInterpretation: boolean
}

export type ImpactNetworkStatus = 'stable' | 'attention' | 'critical'

export type ImpactAreaRole =
  | 'origin'
  | 'affected'
  | 'potential'
  | 'unrelated'

export interface AreaImpactAggregate {
  areaId: ImpactAreaId
  activeCount: number
  incidentCount: number
  maxRisk: RiskLevel | null
  maxRiskScore: number
  intensity: number
  role: ImpactAreaRole
  roles: readonly ImpactAreaRole[]
  incidentIds: readonly string[]
}

export type DependencyTrafficRole = 'base' | 'actual' | 'predicted'

export interface DependencyTraffic {
  dependencyId: string
  sourceAreaId: ImpactAreaId
  targetAreaId: ImpactAreaId
  path: readonly [ImpactAreaId, ImpactAreaId]
  role: DependencyTrafficRole
  incidentIds: readonly string[]
  incidentCount: number
  maxRiskScore: number
  intensity: number
  strokeWidth: number
  particleCount: number
  /** 1..5 únicamente para las conexiones reales más cargadas. */
  highTrafficRank: number | null
}

export interface IncidentPropagationPath {
  eventId: string
  areaIds: readonly ImpactAreaId[]
  dependencyIds: readonly string[]
}

export interface IncidentSlot {
  eventId: string
  slotIndex: number
  position: ImpactPoint
  focused: boolean
  scale: number
  opacity: number
}

export interface ReplayFrame {
  index: number
  playbackAtMs: number
  sourceOffsetMs: number
  currentStep: IncidentReplayStep
  completedStepIds: readonly string[]
  futureStepIds: readonly string[]
  activeAreaIds: readonly ImpactAreaId[]
  activeDependencyIds: readonly string[]
  complete: boolean
}

export type StarPropagationPhase =
  | 'idle'
  | 'origin_pulse'
  | 'edge_travel'
  | 'target_pulse'
  | 'illuminated'
  | 'complete'

export interface StarPropagationFrame {
  index: number
  playbackAtMs: number
  phase: StarPropagationPhase
  activeEdgeId: string | null
  propagatingCoordinationId: string | null
  illuminatedCoordinationIds: readonly string[]
  complete: boolean
}

export interface FocusedPropagationEdge {
  id: string
  targetCoordinationId: string
  order: number
}

export interface FocusedPropagation {
  originCoordinationId: string
  originName: string
  affectedCoordinationIds: readonly string[]
  affectedNames: readonly string[]
  edges: readonly FocusedPropagationEdge[]
  propagationOrder: readonly string[]
  riskLevel: RiskLevel | null
}

export interface AreaAggregationOptions {
  focusedEventId?: string | null
  prediction?: ImpactPrediction | null
}
