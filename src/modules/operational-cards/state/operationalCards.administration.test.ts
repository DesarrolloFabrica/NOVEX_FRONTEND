import { describe, expect, it } from 'vitest'
import type { ProblemDetail } from '@/modules/operational-cards/types/problem-detail.types'
import {
  initialOperationalCardsState,
  operationalCardsReducer,
} from '@/modules/operational-cards/state/operationalCards.reducer'

function reduce(
  ...actions: Parameters<typeof operationalCardsReducer>[1][]
) {
  return actions.reduce(
    (state, action) => operationalCardsReducer(state, action),
    initialOperationalCardsState,
  )
}

const DETAIL: ProblemDetail = {
  id: 'p1',
  title: 'Problema',
  severity: 'HIGH',
  reportedSeverity: 'HIGH',
  severityHistory: [],
  consequences: [],
  canAddConsequence: false,
  status: 'OPEN',
  slaHealth: null,
  dueAt: null,
  description: 'Desc',
  createdAt: '2026-09-01T10:00:00.000Z',
  coordinationCode: 'coord-b2b',
  coordinationName: 'B2B',
  affectedCoordinationCode: null,
  affectedCoordinationName: null,
  reportKind: 'INTERNAL',
  affectedProcess: null,
  pendingDelivery: null,
  createdByUserName: 'Autor',
  coordinationId: 'origin-id',
  affectedCoordinationId: 'origin-id',
  canResolve: false,
  canAdvanceToInProgress: false,
  canUpdate: false,
  canCancel: true,
  canTransfer: true,
  resolution: null,
  cancellation: null,
}

describe('administración · anulación y traslado', () => {
  it('bloquea un segundo envío mientras hay uno en curso', () => {
    const sending = reduce({ type: 'SUBMIT_CANCELLATION', problemId: 'p1' })
    expect(sending.submission.status).toBe('sending')
    expect(sending.submission.kind).toBe('cancellation')

    const ignored = operationalCardsReducer(sending, {
      type: 'SUBMIT_COORDINATION_TRANSFER',
      problemId: 'p1',
    })
    expect(ignored.submission.kind).toBe('cancellation')
    expect(ignored.submission.status).toBe('sending')
  })

  it('tras anular actualiza el detalle, invalida listas y sube dataGeneration', () => {
    const cancelled: ProblemDetail = {
      ...DETAIL,
      status: 'CANCELLED',
      canCancel: false,
      canTransfer: false,
      cancellation: {
        reason: 'Duplicado confirmado por soporte',
        previousStatus: 'OPEN',
        cancelledByUserName: 'Admin',
        cancelledAt: '2026-11-10T12:00:00.000Z',
      },
    }

    const base = reduce(
      { type: 'SELECT_COORDINATION', code: 'coord-b2b' },
      {
        type: 'LOAD_PROBLEMS_SUCCESS',
        code: 'coord-b2b',
        generation: 0,
        scope: 'complete',
        problems: [
          {
            id: 'p1',
            title: 'Problema',
            severity: 'HIGH',
            status: 'OPEN',
            createdAt: '2026-09-01T10:00:00.000Z',
          },
        ],
      },
      { type: 'SELECT_PROBLEM', problemId: 'p1' },
      {
        type: 'LOAD_DETAIL_SUCCESS',
        problemId: 'p1',
        generation: 0,
        detail: DETAIL,
      },
      { type: 'SUBMIT_CANCELLATION', problemId: 'p1' },
    )

    const ok = operationalCardsReducer(base, {
      type: 'SUBMIT_CANCELLATION_SUCCESS',
      problemId: 'p1',
      detail: cancelled,
    })

    expect(ok.level2.detail?.status).toBe('CANCELLED')
    expect(ok.level2.detail?.cancellation?.reason).toContain('Duplicado')
    expect(ok.level1.status).toBe('idle')
    expect(ok.problemsByCoordination['coord-b2b']).toBeUndefined()
    expect(ok.dataGeneration).toBe(1)
    expect(ok.submission.status).toBe('idle')
  })

  it('tras trasladar invalida origen y destino y refresca el detalle', () => {
    const transferred: ProblemDetail = {
      ...DETAIL,
      coordinationId: 'dest-id',
      coordinationCode: 'coord-negocios',
      coordinationName: 'Negocios',
      status: 'OPEN',
    }

    const base = reduce(
      { type: 'SELECT_COORDINATION', code: 'coord-b2b' },
      {
        type: 'LOAD_PROBLEMS_SUCCESS',
        code: 'coord-b2b',
        generation: 0,
        scope: 'complete',
        problems: [
          {
            id: 'p1',
            title: 'Problema',
            severity: 'HIGH',
            status: 'OPEN',
            createdAt: '2026-09-01T10:00:00.000Z',
          },
        ],
      },
      { type: 'SELECT_PROBLEM', problemId: 'p1' },
      {
        type: 'LOAD_DETAIL_SUCCESS',
        problemId: 'p1',
        generation: 0,
        detail: DETAIL,
      },
      { type: 'SUBMIT_COORDINATION_TRANSFER', problemId: 'p1' },
    )

    const ok = operationalCardsReducer(base, {
      type: 'SUBMIT_COORDINATION_TRANSFER_SUCCESS',
      problemId: 'p1',
      detail: transferred,
      invalidateCoordinationCodes: ['coord-b2b', 'coord-negocios'],
    })

    expect(ok.level2.detail?.coordinationCode).toBe('coord-negocios')
    expect(ok.level1.status).toBe('idle')
    expect(ok.problemsByCoordination['coord-b2b']).toBeUndefined()
    expect(ok.dataGeneration).toBe(1)
  })

  it('conserva el error de traslado en submission', () => {
    const base = reduce({
      type: 'SUBMIT_COORDINATION_TRANSFER',
      problemId: 'p1',
    })
    const fail = operationalCardsReducer(base, {
      type: 'SUBMIT_COORDINATION_TRANSFER_ERROR',
      message: 'La coordinación responsable cambió desde que consultó el caso. Vuelva a intentarlo.',
    })
    expect(fail.submission.kind).toBe('coordination-transfer')
    expect(fail.submission.status).toBe('error')
    expect(fail.submission.errorMessage).toMatch(/cambió/)
  })
})
