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

/**
 * Resuelve el estado semáforo del entorno a partir de una salud ya calculada.
 *
 * Reglas (en orden de prioridad):
 * 1. Sin compromisos evaluados (ni cumplidos ni incumplidos) => 'pending'.
 * 2. Existe un incumplimiento de impacto crítico (5)          => 'critical'.
 * 3. Riesgo operativo >= umbral critical (60%)                => 'critical'.
 * 4. Riesgo operativo >= umbral attention (30%)               => 'attention'.
 * 5. En cualquier otro caso                                   => 'healthy'.
 */
export function resolveEnvironmentStatus(health: AreaHealth): EnvironmentStatus {
  const evaluatedCount = health.fulfilledCount + health.breachedCount

  if (evaluatedCount === 0) return 'pending'
  if (health.hasCriticalBreach) return 'critical'
  if (health.operationalRiskPercentage >= RISK_THRESHOLDS.critical) return 'critical'
  if (health.operationalRiskPercentage >= RISK_THRESHOLDS.attention) return 'attention'
  return 'healthy'
}

/**
 * Calcula la salud operativa de un conjunto de compromisos.
 *
 * El riesgo operativo se mide sobre los compromisos EVALUADOS
 * (cumplidos + incumplidos): porcentaje del impacto evaluado que terminó
 * en incumplimiento. Los pendientes de validación no inflan ni diluyen el
 * riesgo, pero sí cuentan en los totales informativos.
 */
export function calculateAreaHealth(commitments: Commitment[]): AreaHealth {
  const pendingCount = commitments.filter(
    (c) => c.status === 'Pendiente de validación',
  ).length
  const fulfilledCount = commitments.filter((c) => c.status === 'Cumplido').length
  const breached = commitments.filter((c) => c.status === 'Incumplido')
  const breachedCount = breached.length

  const evaluated = commitments.filter(
    (c) => c.status === 'Cumplido' || c.status === 'Incumplido',
  )

  const totalPossibleImpact = evaluated.reduce(
    (acc, c) => acc + c.operationalImpact,
    0,
  )
  const breachedImpact = breached.reduce((acc, c) => acc + c.operationalImpact, 0)

  const operationalRiskPercentage =
    totalPossibleImpact > 0
      ? Math.round((breachedImpact / totalPossibleImpact) * 100)
      : 0

  const hasCriticalBreach = breached.some(
    (c) => c.operationalImpact === CRITICAL_IMPACT,
  )

  // Se construye primero la salud "sin entorno" para que resolveEnvironmentStatus
  // trabaje exactamente sobre los mismos valores expuestos al resto de la app.
  const baseHealth: AreaHealth = {
    totalCommitments: commitments.length,
    pendingCount,
    fulfilledCount,
    breachedCount,
    totalPossibleImpact,
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
