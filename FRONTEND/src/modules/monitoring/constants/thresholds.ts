// Capa: constantes del módulo "monitoring".
// Responsabilidad: centralizar los umbrales de negocio del motor de salud.
// Mantener estos valores aquí evita "números mágicos" dispersos en la lógica.

/**
 * Umbrales de riesgo operativo (en porcentaje) que definen el estado del entorno:
 * - riesgo < attention            -> healthy
 * - attention <= riesgo < critical -> attention
 * - riesgo >= critical            -> critical
 */
export const RISK_THRESHOLDS = {
  attention: 30,
  critical: 60,
} as const

/**
 * Impacto operativo considerado crítico. Un compromiso incumplido con este
 * impacto fuerza el estado del entorno a "critical" sin importar el porcentaje.
 */
export const CRITICAL_IMPACT = 5 as const
