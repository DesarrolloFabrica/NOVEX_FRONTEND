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

const baseDraft = () => ({
  ...emptyReportDraft('2026-10-07T08:30'),
  title: 'Internet intermitente',
  description: 'Hay conexión pero el servicio se corta.',
  categoryId: 'cat-internet',
  severity: 'MEDIUM' as const,
})

describe('submitProblemReport INTERNAL (única puerta de creación)', () => {
  beforeEach(() => {
    createSituationWithAnalysis.mockReset()
    createSituationWithAnalysis.mockResolvedValue({
      situation: { id: 'sit-1' },
      analysis: null,
    })
  })

  it('envía reportKind explícito y la coordinación de la carta como responsable y afectada', async () => {
    await submitProblemReport({
      draft: baseDraft(),
      reportKind: 'INTERNAL',
      selectedCoordinationId: 'uuid-fabrica',
      selectedCoordinationCode: 'coord-fabrica-contenidos',
    })

    const payload = createSituationWithAnalysis.mock.calls[0][0]
    expect(payload).toEqual(
      expect.objectContaining({
        reportKind: 'INTERNAL',
        coordinationId: 'uuid-fabrica',
        affectedCoordinationId: 'uuid-fabrica',
        categoryId: 'cat-internet',
        severity: 'MEDIUM',
      }),
    )
    // Sin afectación inicial: el campo no viaja.
    expect(payload).not.toHaveProperty('initialConsequence')
  })

  it('la severidad es la que eligió el usuario, nunca un valor fijo', async () => {
    await submitProblemReport({
      draft: { ...baseDraft(), severity: 'CRITICAL' },
      reportKind: 'INTERNAL',
      selectedCoordinationId: 'uuid-fabrica',
      selectedCoordinationCode: 'coord-fabrica-contenidos',
    })
    expect(createSituationWithAnalysis.mock.calls[0][0].severity).toBe('CRITICAL')
  })

  it('con afectación inicial la envía recortada y sin fecha propia', async () => {
    await submitProblemReport({
      draft: {
        ...baseDraft(),
        initialConsequence: '  Se retrasó la entrega de dos contenidos.  ',
      },
      reportKind: 'INTERNAL',
      selectedCoordinationId: 'uuid-fabrica',
      selectedCoordinationCode: 'coord-fabrica-contenidos',
    })
    expect(createSituationWithAnalysis.mock.calls[0][0].initialConsequence).toEqual({
      description: 'Se retrasó la entrega de dos contenidos.',
    })
  })

  it('una afectación de solo espacios no se envía (el problema nace sin afectaciones)', async () => {
    await submitProblemReport({
      draft: { ...baseDraft(), initialConsequence: '    ' },
      reportKind: 'INTERNAL',
      selectedCoordinationId: 'uuid-fabrica',
      selectedCoordinationCode: 'coord-fabrica-contenidos',
    })
    expect(createSituationWithAnalysis.mock.calls[0][0]).not.toHaveProperty(
      'initialConsequence',
    )
  })

  it('sin carta seleccionada no hay alta: ya no existe el INTERNAL sin coordinación', async () => {
    await expect(
      submitProblemReport({
        draft: baseDraft(),
        reportKind: 'INTERNAL',
        selectedCoordinationId: null,
        selectedCoordinationCode: null,
      }),
    ).rejects.toThrow(/Seleccione una coordinación/)
    expect(createSituationWithAnalysis).not.toHaveBeenCalled()
  })

  it('valida el largo de la afectación inicial', () => {
    const result = validateReportDraft(
      { ...baseDraft(), initialConsequence: 'x'.repeat(2001) },
      'INTERNAL',
      new Date('2026-10-07T12:00:00'),
    )
    expect(result.valid).toBe(false)
    expect(result.problemas.join(' ')).toMatch(/afectación inicial/)
  })
})
