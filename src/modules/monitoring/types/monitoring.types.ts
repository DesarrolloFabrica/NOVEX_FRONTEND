// Capa: dominio (tipos) del módulo "monitoring".
// Responsabilidad: describir la salud operativa de un área y el estado del entorno.
// Sin lógica: el cálculo vive en el motor (engine) y se expone vía selectores.

/**
 * Estado semáforo del entorno operativo de un área (o global).
 * - pending: aún no hay compromisos evaluados (validados) que medir.
 * - healthy: riesgo operativo bajo.
 * - attention: riesgo operativo moderado.
 * - critical: riesgo operativo alto o existe un incumplimiento crítico.
 */
export type EnvironmentStatus = 'pending' | 'healthy' | 'attention' | 'critical'

/**
 * Fotografía de la salud operativa de un conjunto de compromisos
 * (de un área específica o del agregado global).
 */
export interface AreaHealth {
  /** Total de compromisos considerados. */
  totalCommitments: number
  /** Compromisos pendientes de validación. */
  pendingCount: number
  /** Compromisos cumplidos. */
  fulfilledCount: number
  /** Compromisos incumplidos. */
  breachedCount: number
  /**
   * Suma de impacto operativo de TODOS los compromisos del área (1..5 cada uno).
   * Es la base del cálculo antes de cualquier validación.
   */
  totalPossibleImpact: number
  /** Suma de impacto de los compromisos cumplidos. */
  fulfilledImpact: number
  /** Suma de impacto de los compromisos incumplidos. */
  breachedImpact: number
  /**
   * Riesgo operativo en porcentaje (breachedImpact / totalPossibleImpact).
   * Solo aplica cuando no quedan compromisos pendientes de validación.
   */
  operationalRiskPercentage: number
  /** Indica si existe un incumplimiento con impacto operativo máximo (5). */
  hasCriticalBreach: boolean
  /** Estado semáforo resultante del entorno. */
  environment: EnvironmentStatus
}
