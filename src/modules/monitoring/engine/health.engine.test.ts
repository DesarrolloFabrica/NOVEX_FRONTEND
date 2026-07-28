// Tests del motor operativo (funciones puras). Verifican las reglas centrales
// de salud/riesgo que no deben romperse al seguir desarrollando Cunmark

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
  it('expone la suma total de impacto aunque sigan pendientes', () => {
    const health = calculateAreaHealth([
      makeCommitment('Pendiente de validación', 4),
      makeCommitment('Pendiente de validación', 2),
    ])

    expect(health.totalPossibleImpact).toBe(6)
    expect(health.fulfilledImpact).toBe(0)
    expect(health.breachedImpact).toBe(0)
    expect(health.environment).toBe('pending')
    expect(health.operationalRiskPercentage).toBe(0)
  })

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
    // Total del área: 4 + 4 + 2 = 10; incumplido = 2 => 20%.
    const health = calculateAreaHealth([
      makeCommitment('Cumplido', 4),
      makeCommitment('Cumplido', 4),
      makeCommitment('Incumplido', 2),
    ])
    expect(health.totalPossibleImpact).toBe(10)
    expect(health.operationalRiskPercentage).toBe(20)
    expect(health.environment).toBe('healthy')
  })

  it('riesgo entre 30% y 59% => attention', () => {
    // Total del área: 3 + 3 = 6; incumplido = 3 => 50%.
    const health = calculateAreaHealth([
      makeCommitment('Cumplido', 3),
      makeCommitment('Incumplido', 3),
    ])
    expect(health.totalPossibleImpact).toBe(6)
    expect(health.operationalRiskPercentage).toBe(50)
    expect(health.environment).toBe('attention')
  })

  it('riesgo de 60% o más => critical', () => {
    // Total del área: 2 + 4 = 6; incumplido = 4 => 67%.
    const health = calculateAreaHealth([
      makeCommitment('Cumplido', 2),
      makeCommitment('Incumplido', 4),
    ])
    expect(health.totalPossibleImpact).toBe(6)
    expect(health.operationalRiskPercentage).toBe(67)
    expect(health.environment).toBe('critical')
  })

  it('impactos 1+2+5 con fallo en el nivel 5 => riesgo 63% y estado crítico', () => {
    const health = calculateAreaHealth([
      makeCommitment('Cumplido', 1),
      makeCommitment('Cumplido', 2),
      makeCommitment('Incumplido', 5),
    ])

    expect(health.totalPossibleImpact).toBe(8)
    expect(health.fulfilledImpact).toBe(3)
    expect(health.breachedImpact).toBe(5)
    expect(health.operationalRiskPercentage).toBe(63)
    expect(health.hasCriticalBreach).toBe(true)
    expect(health.environment).toBe('critical')
  })

  it('con pendientes en el área no se mide riesgo aunque haya evaluados', () => {
    const health = calculateAreaHealth([
      makeCommitment('Cumplido', 1),
      makeCommitment('Incumplido', 2),
      makeCommitment('Pendiente de validación', 5),
    ])

    expect(health.totalPossibleImpact).toBe(8)
    expect(health.environment).toBe('pending')
    expect(health.operationalRiskPercentage).toBe(0)
  })

  it('incumplido con operationalImpact 5 => critical (aunque el riesgo sea bajo)', () => {
    // Total del área: 5*4 + 5 = 25; incumplido = 5 => 20% (sería healthy),
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
