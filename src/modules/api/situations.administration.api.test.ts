import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiRequest } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
}))

vi.mock('@/shared/api/http', () => ({
  apiRequest,
  ApiError: class ApiError extends Error {
    status: number
    code?: string
    constructor(message: string, status: number, options?: { code?: string }) {
      super(message)
      this.name = 'ApiError'
      this.status = status
      this.code = options?.code
    }
  },
}))

const {
  cancelSituation,
  transferSituationCoordination,
} = await import('@/modules/api/situations.api')

describe('situations.api · administración', () => {
  beforeEach(() => {
    apiRequest.mockReset()
    apiRequest.mockResolvedValue({ id: 'p1', status: 'CANCELLED' })
  })

  it('POST cancellation con motivo', async () => {
    await cancelSituation('p1', { reason: 'Duplicado detectado en revisión' })
    expect(apiRequest).toHaveBeenCalledWith('/situations/p1/cancellation', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Duplicado detectado en revisión' }),
    })
  })

  it('POST coordination-transfer con destino y control optimista', async () => {
    apiRequest.mockResolvedValue({ id: 'p1', status: 'OPEN' })
    await transferSituationCoordination('p1', {
      toCoordinationId: 'dest-uuid',
      reason: 'Cambio de responsable del área',
      expectedCurrentCoordinationId: 'origin-uuid',
    })
    expect(apiRequest).toHaveBeenCalledWith(
      '/situations/p1/coordination-transfer',
      {
        method: 'POST',
        body: JSON.stringify({
          toCoordinationId: 'dest-uuid',
          reason: 'Cambio de responsable del área',
          expectedCurrentCoordinationId: 'origin-uuid',
        }),
      },
    )
  })
})
