// Punto de entrada del módulo `operational-events`.
// Expone contratos y piezas de arquitectura del nuevo dominio.
// El Provider global NO está cableado en app/providers; el wizard lo monta local.

export type {
  AIInterpretation,
  AreaMetricBreakdown,
  CategoryMetricBreakdown,
  ConsolidatedIndicator,
  DashboardMetrics,
  ImpactSeverity,
  IncidentCategory,
  OperationalActor,
  OperationalArea,
  OperationalEnvironmentStatus,
  OperationalEvent,
  OperationalEventDraft,
  OperationalEventStatus,
  OperationalIndicator,
  OperationalTimeline,
  OperationalTimelineEntry,
  OperationalTrend,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'

export {
  OperationalEventsProvider,
  OperationalEventsContext,
} from '@/modules/operational-events/context/OperationalEventsContext'
export { useOperationalEvents } from '@/modules/operational-events/hooks/useOperationalEvents'
export { OperationalEventWizard } from '@/modules/operational-events/components/OperationalEventWizard'
export { OperationalEventsCenter } from '@/modules/operational-events/components/OperationalEventsCenter'
export { OperationalIntelligenceDashboard } from '@/modules/operational-events/components/OperationalIntelligenceDashboard'

export {
  buildOperationalIntelligence,
  calculateOperationalDashboardMetrics,
  resolveRoomEnvironment,
} from '@/modules/operational-events/engine/operational-intelligence.engine'
export { buildExecutiveNarrative } from '@/modules/operational-events/engine/executiveNarrative'
export { resolveOperationalTrend } from '@/modules/operational-events/engine/operationalTrend'

export {
  selectAllAreasDashboardMetrics,
  selectAreaDistribution,
  selectCategoryDistribution,
  selectConsolidatedIndicators,
  selectDashboardHeadline,
  selectDashboardMetrics,
  selectEngineIndicators,
  selectEventById,
  selectExecutiveNarrative,
  selectFocusedAreaEvents,
  selectFocusedDashboardMetrics,
  selectGlobalDashboardMetrics,
  selectOperationalRiskLevel,
  selectOperationalSourceEvents,
  selectOperationalTrend,
  selectRoomEnvironment,
} from '@/modules/operational-events/selectors/operationalIntelligence.selectors'
