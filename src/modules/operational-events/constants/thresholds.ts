// Capa: constantes — umbrales del Motor de Inteligencia Operacional.

/**
 * Umbrales de riesgo promedio (0..100) sobre eventos activos interpretados:
 * - riesgo < attention            -> healthy / low-moderate
 * - attention <= riesgo < critical -> attention
 * - riesgo >= critical            -> critical
 */
export const RISK_SCORE_THRESHOLDS = {
  attention: 30,
  critical: 60,
} as const

/**
 * Umbrales para mapear averageRiskScore → RiskLevel cualitativo.
 */
export const RISK_LEVEL_THRESHOLDS = {
  moderate: 30,
  high: 50,
  critical: 70,
} as const

/**
 * Delta mínimo de riesgo promedio entre mitades temporales
 * para declarar tendencia improving/deteriorating.
 */
export const TREND_RISK_DELTA = 10 as const

/**
 * Severidad considerada crítica. Un evento activo con esta severidad
 * fuerza criticalCount y puede forzar el entorno a "critical".
 */
export const CRITICAL_IMPACT_SEVERITY = 5 as const

/** Mínimo de eventos interpretados para estimar tendencia. */
export const TREND_MIN_EVENTS = 3 as const
