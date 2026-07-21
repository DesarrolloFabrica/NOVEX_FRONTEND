// Capa: motor (engine) del módulo "monitoring".
// Responsabilidad: lógica de negocio PURA para calcular la salud operativa.
//
// Principios de esta capa:
// - Funciones puras: mismas entradas => mismas salidas, sin efectos secundarios.
// - No conoce React, ni el origen de datos, ni el estado global.
// - Es el único lugar donde viven las reglas de salud/riesgo del precomité.

import type { Commitment } from '@/modules/commitments/types/commitment.types'
import type {
  AreaHealth,
  EnvironmentStatus,
} from '@/modules/monitoring/types/monitoring.types'
import {
  CRITICAL_IMPACT,
  RISK_THRESHOLDS,
} from '@/modules/monitoring/constants/thresholds'

/** Suma el peso operativo (1..5) de todos los compromisos del ámbito. */
export function sumCommitmentImpact(commitments: Commitment[]): number {
  return commitments.reduce((acc, commitment) => acc + commitment.operationalImpact, 0)
}

/**
 * Resuelve el estado semáforo del entorno a partir de una salud ya calculada.
 *
 * Reglas (en orden de prioridad):
 * 1. Quedan pendientes o sin evaluar => 'pending'.
 * 2. Existe un incumplimiento de impacto crítico (5) => 'critical'.
 * 3. Riesgo operativo >= umbral critical (60%) => 'critical'.
 * 4. Riesgo operativo >= umbral attention (30%) => 'attention'.
 * 5. En cualquier otro caso => 'healthy'.
 */
export function resolveEnvironmentStatus(health: AreaHealth): EnvironmentStatus {
  const evaluatedCount = health.fulfilledCount + health.breachedCount

  if (health.pendingCount > 0 || evaluatedCount === 0) return 'pending'
  if (health.hasCriticalBreach) return 'critical'
  if (health.operationalRiskPercentage >= RISK_THRESHOLDS.critical) return 'critical'
  if (health.operationalRiskPercentage >= RISK_THRESHOLDS.attention) return 'attention'
  return 'healthy'
}

/**
 * Calcula la salud operativa de un conjunto de compromisos.
 *
 * Regla de riesgo:
 * 1. Primero se obtiene el peso total del área (suma de impactos 1..5).
 * 2. Tras validar todos los compromisos, el riesgo es:
 *    incumplido / total × 100.
 *
 * Ejemplo: impactos 1 + 2 + 5 = 8. Si se cumplen 1 y 2 pero falla el 5,
 * el riesgo es 5/8 ≈ 63% (estado crítico).
 */
export function calculateAreaHealth(commitments: Commitment[]): AreaHealth {
  const pendingCount = commitments.filter(
    (commitment) => commitment.status === 'Pendiente de validación',
  ).length
  const fulfilled = commitments.filter(
    (commitment) => commitment.status === 'Cumplido',
  )
  const breached = commitments.filter(
    (commitment) => commitment.status === 'Incumplido',
  )
  const fulfilledCount = fulfilled.length
  const breachedCount = breached.length

  const totalPossibleImpact = sumCommitmentImpact(commitments)
  const fulfilledImpact = sumCommitmentImpact(fulfilled)
  const breachedImpact = sumCommitmentImpact(breached)

  const evaluatedCount = fulfilledCount + breachedCount
  const canMeasureRisk =
    totalPossibleImpact > 0 && evaluatedCount > 0 && pendingCount === 0

  const operationalRiskPercentage = canMeasureRisk
    ? Math.round((breachedImpact / totalPossibleImpact) * 100)
    : 0

  const hasCriticalBreach = breached.some(
    (commitment) => commitment.operationalImpact === CRITICAL_IMPACT,
  )

  const baseHealth: AreaHealth = {
    totalCommitments: commitments.length,
    pendingCount,
    fulfilledCount,
    breachedCount,
    totalPossibleImpact,
    fulfilledImpact,
    breachedImpact,
    operationalRiskPercentage,
    hasCriticalBreach,
    environment: 'pending',
  }

  return {
    ...baseHealth,
    environment: resolveEnvironmentStatus(baseHealth),
  }
}

/**
 * Calcula la salud GLOBAL agregando todos los compromisos recibidos.
 * Se usa para el área global ("Visión General Operaciones"), que no tiene
 * compromisos propios y consolida los de todas las áreas operativas.
 */
export function calculateGlobalHealth(commitments: Commitment[]): AreaHealth {
  return calculateAreaHealth(commitments)
}
