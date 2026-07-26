import { describe, expect, it } from 'vitest'
import type {
  Commitment,
  CommitmentStatus,
  OperationalImpact,
} from '@/modules/commitments/types/commitment.types'
import {
  canApplyAreaValidation,
  getCommitmentDisplayStatus,
  isAreaFullyDraftRated,
} from '@/modules/commitments/utils/commitmentValidation.utils'

function makeCommitment(
  id: string,
  status: CommitmentStatus,
  draftStatus?: CommitmentStatus,
): Commitment {
  return {
    id,
    title: `Compromiso ${id}`,
    description: 'desc',
    areaId: 'area-a',
    areaName: 'Área A',
    responsibleName: 'Responsable',
    dueDate: '2026-07-01',
    status,
    draftStatus,
    operationalImpact: 3 as OperationalImpact,
    createdAt: '2026-06-01T00:00:00.000Z',
    history: [],
  }
}

describe('commitmentValidation.utils', () => {
  it('prioriza el borrador sobre el estado aplicado al mostrar', () => {
    const commitment = makeCommitment(
      'c1',
      'Pendiente de validación',
      'Incumplido',
    )

    expect(getCommitmentDisplayStatus(commitment)).toBe('Incumplido')
  })

  it('detecta cuando todos los compromisos tienen borrador calificado', () => {
    const commitments = [
      makeCommitment('c1', 'Pendiente de validación', 'Cumplido'),
      makeCommitment('c2', 'Pendiente de validación', 'Incumplido'),
    ]

    expect(isAreaFullyDraftRated(commitments)).toBe(true)
  })

  it('muestra En proceso sin habilitar la consolidación del área', () => {
    const commitments = [
      makeCommitment(
        'c1',
        'Pendiente de validación',
        'Pendiente de validación',
      ),
    ]

    expect(getCommitmentDisplayStatus(commitments[0])).toBe(
      'Pendiente de validación',
    )
    expect(isAreaFullyDraftRated(commitments)).toBe(false)
    expect(canApplyAreaValidation(commitments)).toBe(false)
  })

  it('habilita aplicar solo si todos están calificados y siguen pendientes', () => {
    const ready = [
      makeCommitment('c1', 'Pendiente de validación', 'Cumplido'),
      makeCommitment('c2', 'Pendiente de validación', 'Incumplido'),
    ]
    const partial = [
      makeCommitment('c1', 'Pendiente de validación', 'Cumplido'),
      makeCommitment('c2', 'Pendiente de validación'),
    ]
    const alreadyApplied = [
      makeCommitment('c1', 'Cumplido', 'Cumplido'),
      makeCommitment('c2', 'Incumplido', 'Incumplido'),
    ]

    expect(canApplyAreaValidation(ready)).toBe(true)
    expect(canApplyAreaValidation(partial)).toBe(false)
    expect(canApplyAreaValidation(alreadyApplied)).toBe(false)
  })
})
