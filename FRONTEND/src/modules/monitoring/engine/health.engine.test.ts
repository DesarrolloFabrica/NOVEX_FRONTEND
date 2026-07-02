// Tests del motor operativo (funciones puras). Verifican las reglas centrales
// de salud/riesgo que no deben romperse al seguir desarrollando O.M.E.G.A.

import { describe, expect, it } from 'vitest'
import type {
  Commitment,
  CommitmentStatus,
  OperationalImpact,
} from '@/modules/commitments/types/commitment.types'
import {
  calculateAreaHealth,
  calculateGlobalHealth,
} from '@/modules/monitoring/engine/health.engine'

let seq = 0

/** Crea un compromiso de prueba con los campos relevantes para el motor. */
function makeCommitment(
  status: CommitmentStatus,
  operationalImpact: OperationalImpact,
  areaId = 'area-x',
): Commitment {
  seq += 1
  return {
    id: `c-${seq}`,
    title: `Compromiso ${seq}`,
    description: 'desc',
    areaId,
    areaName: 'Área X',
    responsibleName: 'Responsable',
    dueDate: '2026-07-01',
    status,
    operationalImpact,
    createdAt: '2026-06-01T00:00:00.000Z',
    history: [],
  }
}

describe('calculateAreaHealth / resolveEnvironmentStatus', () => {
  it('sin compromisos evaluados => environment pending', () => {
    // Solo pendientes (ninguno cumplido ni incumplido).
    const health = calculateAreaHealth([
      makeCommitment('Pendiente de validación', 4),
      makeCommitment('Pendiente de validación', 2),
    ])
    expect(health.environment).toBe('pending')
    expect(health.operationalRiskPercentage).toBe(0)
  })

  it('lista vacía => environment pending', () => {
    expect(calculateAreaHealth([]).environment).toBe('pending')
  })

  it('riesgo menor a 30% => healthy', () => {
    // Evaluado: 4 + 4 + 2 = 10; incumplido = 2 => 20%.
    const health = calculateAreaHealth([
      makeCommitment('Cumplido', 4),
      makeCommitment('Cumplido', 4),
      makeCommitment('Incumplido', 2),
    ])
    expect(health.operationalRiskPercentage).toBe(20)
    expect(health.environment).toBe('healthy')
  })

  it('riesgo entre 30% y 59% => attention', () => {
    // Evaluado: 3 + 3 = 6; incumplido = 3 => 50%.
    const health = calculateAreaHealth([
      makeCommitment('Cumplido', 3),
      makeCommitment('Incumplido', 3),
    ])
    expect(health.operationalRiskPercentage).toBe(50)
    expect(health.environment).toBe('attention')
  })

  it('riesgo de 60% o más => critical', () => {
    // Evaluado: 2 + 4 = 6; incumplido = 4 => 67%.
    const health = calculateAreaHealth([
      makeCommitment('Cumplido', 2),
      makeCommitment('Incumplido', 4),
    ])
    expect(health.operationalRiskPercentage).toBe(67)
    expect(health.environment).toBe('critical')
  })

  it('incumplido con operationalImpact 5 => critical (aunque el riesgo sea bajo)', () => {
    // Evaluado: 5*4 + 5 = 25; incumplido = 5 => 20% (sería healthy),
    // pero el incumplimiento crítico fuerza critical.
    const health = calculateAreaHealth([
      makeCommitment('Cumplido', 5),
      makeCommitment('Cumplido', 5),
      makeCommitment('Cumplido', 5),
      makeCommitment('Cumplido', 5),
      makeCommitment('Incumplido', 5),
    ])
    expect(health.operationalRiskPercentage).toBe(20)
    expect(health.hasCriticalBreach).toBe(true)
    expect(health.environment).toBe('critical')
  })
})

describe('calculateGlobalHealth', () => {
  it('usa todos los compromisos recibidos (de cualquier área)', () => {
    const commitments = [
      makeCommitment('Cumplido', 2, 'area-a'),
      makeCommitment('Incumplido', 3, 'area-b'),
      makeCommitment('Pendiente de validación', 1, 'area-c'),
    ]
    const health = calculateGlobalHealth(commitments)
    expect(health.totalCommitments).toBe(3)
    expect(health.breachedCount).toBe(1)
    expect(health.pendingCount).toBe(1)
    expect(health.fulfilledCount).toBe(1)
  })
})
