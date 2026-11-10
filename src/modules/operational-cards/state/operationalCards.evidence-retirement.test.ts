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
  coordinationId: 'c1',
  affectedCoordinationId: 'c1',
  canResolve: true,
  canAdvanceToInProgress: true,
  canUpdate: true,
  canCancel: false,
  canTransfer: false,
  resolution: null,
  cancellation: null,
}

describe('evidencias · retiro en reducer', () => {
  it('bloquea un segundo envío mientras hay uno en curso', () => {
    const sending = reduce({
      type: 'SUBMIT_EVIDENCE_RETIREMENT',
      problemId: 'p1',
      evidenceId: 'e1',
    })
    expect(sending.submission).toMatchObject({
      kind: 'evidence-retirement',
      status: 'sending',
      targetKey: 'p1:e1',
    })

    const ignored = operationalCardsReducer(sending, {
      type: 'SUBMIT_EVIDENCE_RETIREMENT',
      problemId: 'p1',
      evidenceId: 'e2',
    })
    expect(ignored.submission.targetKey).toBe('p1:e1')
  })

  it('tras retiro exitoso invalida evidencias y cronología del detalle', () => {
    const base = reduce(
      { type: 'SELECT_PROBLEM', problemId: 'p1' },
      {
        type: 'LOAD_DETAIL_SUCCESS',
        problemId: 'p1',
        generation: 0,
        detail: DETAIL,
      },
      {
        type: 'LOAD_SECTION_SUCCESS',
        problemId: 'p1',
        section: 'evidences',
        items: [
          {
            id: 'e1',
            situationId: 'p1',
            uploadedByUserId: 'u1',
            uploadedByUserName: 'Autor',
            type: 'NOTE',
            title: 'Nota',
            description: 'texto',
            fileName: null,
            storagePath: null,
            mimeType: null,
            fileSize: null,
            createdAt: '2026-09-01T10:00:00.000Z',
            status: 'ACTIVE',
          },
        ],
      },
      {
        type: 'SUBMIT_EVIDENCE_RETIREMENT',
        problemId: 'p1',
        evidenceId: 'e1',
      },
    )

    const ok = operationalCardsReducer(base, {
      type: 'SUBMIT_EVIDENCE_RETIREMENT_SUCCESS',
      problemId: 'p1',
      evidenceId: 'e1',
    })

    expect(ok.level2.sections.evidences.status).toBe('idle')
    expect(ok.level2.sections.evidences.items).toEqual([])
    expect(ok.level2.sections.timeline.status).toBe('idle')
    expect(ok.submission.status).toBe('idle')
  })

  it('conserva el error de retiro en submission', () => {
    const base = reduce({
      type: 'SUBMIT_EVIDENCE_RETIREMENT',
      problemId: 'p1',
      evidenceId: 'e1',
    })
    const fail = operationalCardsReducer(base, {
      type: 'SUBMIT_EVIDENCE_RETIREMENT_ERROR',
      message: 'La evidencia ya fue retirada.',
    })
    expect(fail.submission.status).toBe('error')
    expect(fail.submission.errorMessage).toMatch(/ya fue retirada/)
  })
})
