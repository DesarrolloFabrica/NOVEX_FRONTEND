import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/http'
import { AdminReasonValidationError } from '@/modules/situations/data/assertAdminReason'

const { cancelSituation } = vi.hoisted(() => ({
  cancelSituation: vi.fn(),
}))

vi.mock('@/modules/api/situations.api', () => ({
  cancelSituation,
}))

const { submitProblemCancellation } = await import(
  '@/modules/operational-cards/services/problem-cancellation.service'
)
const { describeSituationAdministrationError } = await import(
  '@/modules/operational-cards/services/situation-administration-errors'
)

describe('submitProblemCancellation', () => {
  beforeEach(() => {
    cancelSituation.mockReset()
  })

  it('valida el motivo antes de llamar al API', async () => {
    await expect(submitProblemCancellation('p1', 'corto')).rejects.toBeInstanceOf(
      AdminReasonValidationError,
    )
    expect(cancelSituation).not.toHaveBeenCalled()
  })

  it('envía el motivo recortado y mapea el detalle CANCELLED', async () => {
    cancelSituation.mockResolvedValue({
      id: 'p1',
      title: 'Caso',
      description: 'Desc',
      severity: 'HIGH',
      status: 'CANCELLED',
      coordinationId: 'c1',
      coordinationCode: 'coord-b2b',
      coordinationName: 'B2B',
      createdByUserName: 'Autor',
      createdAt: '2026-09-01T10:00:00.000Z',
      occurredAt: '2026-09-01T09:00:00.000Z',
      createdByUserId: 'u1',
      categoryId: null,
      categoryCode: null,
      categoryName: null,
      canCancel: false,
      canTransfer: false,
      cancellation: {
        reason: 'Duplicado confirmado por soporte',
        previousStatus: 'OPEN',
        cancelledByUserId: 'admin-1',
        cancelledByUserName: 'Admin',
        cancelledAt: '2026-11-10T12:00:00.000Z',
      },
    })

    const detail = await submitProblemCancellation(
      'p1',
      '  Duplicado confirmado por soporte  ',
    )

    expect(cancelSituation).toHaveBeenCalledWith('p1', {
      reason: 'Duplicado confirmado por soporte',
    })
    expect(detail.status).toBe('CANCELLED')
    expect(detail.cancellation?.reason).toBe('Duplicado confirmado por soporte')
    expect(detail.canCancel).toBe(false)
  })

  it('propaga 409 SITUATION_CLOSED con mensaje claro', () => {
    const error = new ApiError('cerrada', 409, { code: 'SITUATION_CLOSED' })
    expect(describeSituationAdministrationError(error)).toMatch(/cerrada/i)
  })

  it('propaga 403 con mensaje de permiso', () => {
    const error = new ApiError('Forbidden', 403)
    expect(describeSituationAdministrationError(error)).toMatch(/permiso/i)
  })
})
