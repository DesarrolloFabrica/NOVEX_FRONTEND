import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiRequest } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
}))

vi.mock('@/shared/api/http', () => ({
  apiRequest,
}))

const {
  fetchSituationEvidences,
  retireSituationEvidence,
  fetchSituationEvidence,
} = await import('@/modules/api/evidences.api')

describe('evidences.api', () => {
  beforeEach(() => {
    apiRequest.mockReset()
    apiRequest.mockResolvedValue({ situationId: 's1', items: [], total: 0 })
  })

  it('lista activas sin query', async () => {
    await fetchSituationEvidences('s1')
    expect(apiRequest).toHaveBeenCalledWith('/situations/s1/evidences')
  })

  it('historial con includeRetired=true', async () => {
    await fetchSituationEvidences('s1', { includeRetired: true })
    expect(apiRequest).toHaveBeenCalledWith(
      '/situations/s1/evidences?includeRetired=true',
    )
  })

  it('POST retirement con motivo', async () => {
    apiRequest.mockResolvedValue({
      id: 'e1',
      status: 'RETIRED',
      retirement: {
        retiredAt: '2026-11-10T12:00:00.000Z',
        retiredByUserId: 'u1',
        reason: 'Duplicado en el expediente',
      },
    })
    await retireSituationEvidence('s1', 'e1', {
      reason: 'Duplicado en el expediente',
    })
    expect(apiRequest).toHaveBeenCalledWith(
      '/situations/s1/evidences/e1/retirement',
      {
        method: 'POST',
        body: JSON.stringify({ reason: 'Duplicado en el expediente' }),
      },
    )
  })

  it('consulta individual por id', async () => {
    apiRequest.mockResolvedValue({ id: 'e1', status: 'ACTIVE' })
    await fetchSituationEvidence('s1', 'e1')
    expect(apiRequest).toHaveBeenCalledWith('/situations/s1/evidences/e1')
  })
})
