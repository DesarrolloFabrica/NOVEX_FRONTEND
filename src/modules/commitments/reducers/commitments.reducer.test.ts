// Tests del reducer de compromisos. Verifican la trazabilidad de validaciones
// y la inmutabilidad: actualizar un compromiso no debe afectar a los demás.

import { describe, expect, it } from 'vitest'
import type {
  Commitment,
  CommitmentStatus,
  OperationalImpact,
} from '@/modules/commitments/types/commitment.types'
import {
  commitmentsReducer,
  type CommitmentsState,
} from '@/modules/commitments/reducers/commitments.reducer'

function makeCommitment(
  id: string,
  status: CommitmentStatus,
  operationalImpact: OperationalImpact,
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
    operationalImpact,
    createdAt: '2026-06-01T00:00:00.000Z',
    history: [],
  }
}

describe('commitmentsReducer · COMMITMENT_STATUS_UPDATED', () => {
  const c1 = makeCommitment('c1', 'Pendiente de validación', 3)
  const c2 = makeCommitment('c2', 'Pendiente de validación', 2)
  const baseState: CommitmentsState = {
    items: [c1, c2],
    loading: false,
    error: null,
  }

  const result = commitmentsReducer(baseState, {
    type: 'COMMITMENT_STATUS_UPDATED',
    id: 'c1',
    status: 'Cumplido',
    lastUpdateAt: '2026-06-29T10:00:00.000Z',
    actorId: 'u1',
    actorName: 'Ana',
  })

  const updated = result.items[0]

  it('cambia el estado del compromiso', () => {
    expect(updated.status).toBe('Cumplido')
  })

  it('actualiza lastUpdateAt', () => {
    expect(updated.lastUpdateAt).toBe('2026-06-29T10:00:00.000Z')
  })

  it('agrega una entrada al history con los datos del cambio', () => {
    expect(updated.history).toHaveLength(1)
    const entry = updated.history[0]
    expect(entry.type).toBe('status_change')
    expect(entry.fromStatus).toBe('Pendiente de validación')
    expect(entry.toStatus).toBe('Cumplido')
    expect(entry.byUserId).toBe('u1')
    expect(entry.byUserName).toBe('Ana')
    expect(entry.at).toBe('2026-06-29T10:00:00.000Z')
    expect(entry.description).toContain('Ana')
  })

  it('conserva los demás compromisos sin mutarlos', () => {
    // El compromiso no afectado mantiene la MISMA referencia (no se recrea).
    expect(result.items[1]).toBe(c2)
    expect(result.items[1].status).toBe('Pendiente de validación')
    expect(result.items[1].history).toHaveLength(0)
  })

  it('no muta el estado original (inmutabilidad)', () => {
    expect(c1.status).toBe('Pendiente de validación')
    expect(c1.history).toHaveLength(0)
  })
})

describe('commitmentsReducer · COMMITMENT_DRAFT_STATUS_UPDATED', () => {
  const c1 = makeCommitment('c1', 'Pendiente de validación', 3)
  const baseState: CommitmentsState = {
    items: [c1],
    loading: false,
    error: null,
  }

  const result = commitmentsReducer(baseState, {
    type: 'COMMITMENT_DRAFT_STATUS_UPDATED',
    id: 'c1',
    draftStatus: 'Cumplido',
  })

  it('registra el borrador sin alterar el estado oficial', () => {
    expect(result.items[0].draftStatus).toBe('Cumplido')
    expect(result.items[0].status).toBe('Pendiente de validación')
    expect(result.items[0].history).toHaveLength(0)
  })

  it('permite devolver el compromiso a En proceso', () => {
    const pendingResult = commitmentsReducer(result, {
      type: 'COMMITMENT_DRAFT_STATUS_UPDATED',
      id: 'c1',
      draftStatus: 'Pendiente de validación',
    })

    expect(pendingResult.items[0].draftStatus).toBe(
      'Pendiente de validación',
    )
    expect(pendingResult.items[0].status).toBe('Pendiente de validación')
  })
})

describe('commitmentsReducer · AREA_VALIDATION_APPLIED', () => {
  const c1 = makeCommitment('c1', 'Pendiente de validación', 3)
  const c2 = makeCommitment('c2', 'Pendiente de validación', 2)
  c2.areaId = 'area-b'

  const baseState: CommitmentsState = {
    items: [
      { ...c1, draftStatus: 'Cumplido' },
      { ...c2, draftStatus: 'Incumplido' },
    ],
    loading: false,
    error: null,
  }

  const result = commitmentsReducer(baseState, {
    type: 'AREA_VALIDATION_APPLIED',
    areaId: 'area-a',
    lastUpdateAt: '2026-06-29T10:00:00.000Z',
    actorId: 'u1',
    actorName: 'Ana',
  })

  it('consolida los borradores del área en el estado oficial', () => {
    expect(result.items[0].status).toBe('Cumplido')
    expect(result.items[0].draftStatus).toBeUndefined()
    expect(result.items[0].history).toHaveLength(1)
  })

  it('no aplica validación en otras áreas', () => {
    expect(result.items[1].status).toBe('Pendiente de validación')
    expect(result.items[1].draftStatus).toBe('Incumplido')
    expect(result.items[1].history).toHaveLength(0)
  })
})
