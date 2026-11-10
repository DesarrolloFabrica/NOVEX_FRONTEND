import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/http'
import { AdminReasonValidationError } from '@/modules/situations/data/assertAdminReason'

const { transferSituationCoordination } = vi.hoisted(() => ({
  transferSituationCoordination: vi.fn(),
}))

vi.mock('@/modules/api/situations.api', () => ({
  transferSituationCoordination,
}))

const { submitProblemCoordinationTransfer } = await import(
  '@/modules/operational-cards/services/problem-coordination-transfer.service'
)
const { describeSituationAdministrationError } = await import(
  '@/modules/operational-cards/services/situation-administration-errors'
)

describe('submitProblemCoordinationTransfer', () => {
  beforeEach(() => {
    transferSituationCoordination.mockReset()
  })

  it('exige destino y motivo válido', async () => {
    await expect(
      submitProblemCoordinationTransfer('p1', {
        toCoordinationId: '   ',
        reason: 'Motivo suficientemente largo',
      }),
    ).rejects.toThrow(/destino/)

    await expect(
      submitProblemCoordinationTransfer('p1', {
        toCoordinationId: 'dest',
        reason: 'corto',
      }),
    ).rejects.toBeInstanceOf(AdminReasonValidationError)

    expect(transferSituationCoordination).not.toHaveBeenCalled()
  })

  it('envía expectedCurrentCoordinationId cuando viene del detalle', async () => {
    transferSituationCoordination.mockResolvedValue({
      id: 'p1',
      title: 'Caso',
      description: 'Desc',
      severity: 'MEDIUM',
      status: 'OPEN',
      coordinationId: 'dest',
      coordinationCode: 'coord-negocios',
      coordinationName: 'Negocios',
      createdByUserName: 'Autor',
      createdAt: '2026-09-01T10:00:00.000Z',
      occurredAt: '2026-09-01T09:00:00.000Z',
      createdByUserId: 'u1',
      categoryId: null,
      categoryCode: null,
      categoryName: null,
      canCancel: true,
      canTransfer: true,
    })

    const detail = await submitProblemCoordinationTransfer('p1', {
      toCoordinationId: 'dest',
      reason: 'Reasignación por carga del área',
      expectedCurrentCoordinationId: 'origin',
    })

    expect(transferSituationCoordination).toHaveBeenCalledWith('p1', {
      toCoordinationId: 'dest',
      reason: 'Reasignación por carga del área',
      expectedCurrentCoordinationId: 'origin',
    })
    expect(detail.coordinationCode).toBe('coord-negocios')
  })

  it('mapea COORDINATION_CHANGED y destino INTER inválido', () => {
    expect(
      describeSituationAdministrationError(
        new ApiError('changed', 409, { code: 'COORDINATION_CHANGED' }),
      ),
    ).toMatch(/cambió/i)

    expect(
      describeSituationAdministrationError(
        new ApiError('affected', 400, {
          code: 'TRANSFER_DESTINATION_IS_AFFECTED',
        }),
      ),
    ).toMatch(/afectada/i)
  })
})
