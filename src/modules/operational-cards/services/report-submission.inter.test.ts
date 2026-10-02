import { beforeEach, describe, expect, it, vi } from 'vitest'

const createSituationWithAnalysis = vi.fn()

vi.mock('@/modules/api/situations.api', () => ({
  createSituationWithAnalysis: (...args: unknown[]) =>
    createSituationWithAnalysis(...args),
}))

const { submitProblemReport, validateReportDraft } = await import(
  '@/modules/operational-cards/services/report-submission.service'
)
const { emptyReportDraft } = await import(
  '@/modules/operational-cards/state/operationalCards.reducer'
)

describe('submitProblemReport INTER con responsable elegida', () => {
  beforeEach(() => {
    createSituationWithAnalysis.mockReset()
  })

  it('envía coordinationId = responsable y affected = carta', async () => {
    createSituationWithAnalysis.mockResolvedValue({
      situation: { id: 'sit-1' },
      analysis: null,
    })

    const draft = {
      ...emptyReportDraft('2026-09-16T10:00'),
      title: 'Guiones',
      description: 'Retraso de entrega',
      responsibleCoordinationId: 'uuid-responsable',
      affectedProcess: 'Certificación',
      pendingDelivery: 'Guiones',
      severity: 'HIGH' as const,
    }

    expect(validateReportDraft(draft, 'INTER_COORDINATION').valid).toBe(true)

    await submitProblemReport({
      draft,
      reportKind: 'INTER_COORDINATION',
      selectedCoordinationId: 'uuid-afectada',
      selectedCoordinationCode: 'coord-saber-pro',
    })

    expect(createSituationWithAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        reportKind: 'INTER_COORDINATION',
        coordinationId: 'uuid-responsable',
        affectedCoordinationId: 'uuid-afectada',
        affectedProcess: 'Certificación',
        pendingDelivery: 'Guiones',
      }),
    )
    expect(createSituationWithAnalysis.mock.calls[0][0].categoryId).toBeUndefined()
  })
})
