// Tests de los selectores de salud. Verifican el alcance de los datos que
// entran al motor: filtrado por área, agregación global y el mapeo de todas
// las áreas (global + operativas).

import { describe, expect, it } from 'vitest'
import type { Area } from '@/modules/areas/types/area.types'
import type {
  Commitment,
  CommitmentStatus,
  OperationalImpact,
} from '@/modules/commitments/types/commitment.types'
import {
  selectAllAreasHealth,
  selectAreaHealth,
  selectFocusedAreaCommitments,
  selectGlobalAreaHealth,
} from '@/modules/monitoring/selectors/areaHealth.selectors'

let seq = 0

function makeCommitment(
  areaId: string,
  status: CommitmentStatus,
  operationalImpact: OperationalImpact,
): Commitment {
  seq += 1
  return {
    id: `c-${seq}`,
    title: `Compromiso ${seq}`,
    description: 'desc',
    areaId,
    areaName: areaId,
    responsibleName: 'Responsable',
    dueDate: '2026-07-01',
    status,
    operationalImpact,
    createdAt: '2026-06-01T00:00:00.000Z',
    history: [],
  }
}

const areas: Area[] = [
  { id: 'g', code: 'G', name: 'Global', isGlobal: true },
  { id: 'a', code: 'A', name: 'Área A' },
  { id: 'b', code: 'B', name: 'Área B' },
]

const commitments: Commitment[] = [
  makeCommitment('a', 'Cumplido', 3),
  makeCommitment('a', 'Incumplido', 3),
  makeCommitment('b', 'Pendiente de validación', 2),
]

describe('selectAreaHealth', () => {
  it('un área normal filtra por areaId', () => {
    const healthA = selectAreaHealth(commitments, 'a')
    expect(healthA.totalCommitments).toBe(2)
    expect(healthA.fulfilledCount).toBe(1)
    expect(healthA.breachedCount).toBe(1)

    const healthB = selectAreaHealth(commitments, 'b')
    expect(healthB.totalCommitments).toBe(1)
    expect(healthB.pendingCount).toBe(1)
  })
})

describe('selectGlobalAreaHealth', () => {
  it('agrega todos los compromisos operativos', () => {
    const health = selectGlobalAreaHealth(commitments)
    expect(health.totalCommitments).toBe(3)
  })
})

describe('selectFocusedAreaCommitments', () => {
  it('vista global devuelve compromisos de todas las áreas operativas', () => {
    const globalArea = areas.find((a) => a.isGlobal)!
    const result = selectFocusedAreaCommitments(commitments, globalArea)
    expect(result).toHaveLength(3)
  })

  it('área operativa filtra por areaId', () => {
    const areaA = areas.find((a) => a.id === 'a')!
    const result = selectFocusedAreaCommitments(commitments, areaA)
    expect(result).toHaveLength(2)
    expect(result.every((c) => c.areaId === 'a')).toBe(true)
  })
})

describe('selectAllAreasHealth', () => {
  it('incluye la global (agregada) y las operativas (filtradas)', () => {
    const entries = selectAllAreasHealth(commitments, areas)
    expect(entries).toHaveLength(3)

    const global = entries.find((entry) => entry.area.id === 'g')
    const areaA = entries.find((entry) => entry.area.id === 'a')
    const areaB = entries.find((entry) => entry.area.id === 'b')

    expect(global?.health.totalCommitments).toBe(3)
    expect(areaA?.health.totalCommitments).toBe(2)
    expect(areaB?.health.totalCommitments).toBe(1)
  })
})
