import { beforeEach, describe, expect, it, vi } from 'vitest'

const { updateSituation, loadAnalysis } = vi.hoisted(() => ({
  updateSituation: vi.fn(),
  loadAnalysis: vi.fn(),
}))

vi.mock('@/modules/api/situations.api', () => ({
  updateSituation,
}))

vi.mock('@/modules/services/situationAnalysis.service', () => ({
  loadAnalysis,
}))

const { submitProblemStatusAdvance } = await import(
  '@/modules/operational-cards/services/problem-status-advance.service'
)

describe('submitProblemStatusAdvance', () => {
  beforeEach(() => {
    updateSituation.mockReset()
    loadAnalysis.mockReset()
    loadAnalysis.mockResolvedValue(null)
  })

  it('envía PATCH con IN_PROGRESS y no usa resolution', async () => {
    updateSituation.mockResolvedValue({
      id: 'p1',
      title: 'Caso',
      description: 'Desc',
      severity: 'HIGH',
      status: 'IN_PROGRESS',
      coordinationCode: 'coord-b2b',
      coordinationName: 'B2B',
      affectedCoordinationCode: 'coord-negocios',
      affectedCoordinationName: 'Negocios',
      reportKind: 'INTER_COORDINATION',
      createdByUserName: 'Autor',
      createdAt: '2026-09-01T10:00:00.000Z',
      canResolve: true,
      canAdvanceToInProgress: true,
  canUpdate: true,
    })

    const detail = await submitProblemStatusAdvance('p1', 'OPEN')

    expect(updateSituation).toHaveBeenCalledWith('p1', {
      status: 'IN_PROGRESS',
    })
    expect(detail.status).toBe('IN_PROGRESS')
    expect(detail.reportKind).toBe('INTER_COORDINATION')
    expect(detail.coordinationCode).toBe('coord-b2b')
    expect(detail.affectedCoordinationCode).toBe('coord-negocios')
  })

  it('rechaza avance si el estado local no es OPEN', async () => {
    await expect(
      submitProblemStatusAdvance('p1', 'IN_PROGRESS'),
    ).rejects.toThrow(/Abierto/)
    expect(updateSituation).not.toHaveBeenCalled()
  })

  it('propaga el fallo de API sin inventar estado', async () => {
    updateSituation.mockRejectedValue(new Error('Forbidden'))
    await expect(submitProblemStatusAdvance('p1', 'OPEN')).rejects.toThrow(
      'Forbidden',
    )
  })
})
