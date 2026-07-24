// Capa: selectores del módulo "operational-events" (compatibilidad).
// Reexporta el conjunto canónico de selectores del Motor de Inteligencia.
// Los consumidores nuevos deben preferir operationalIntelligence.selectors.

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
  type AreaDashboardEntry,
} from '@/modules/operational-events/selectors/operationalIntelligence.selectors'
