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

/** Clave de idempotencia del intento: el servicio la reenvía tal cual. */
const KEY = '11111111-2222-4333-8444-555555555555'

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
    }, KEY)

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
    }, KEY)
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
    }, KEY)
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
    }, KEY)
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
      }, KEY),
    ).rejects.toThrow(/Seleccione una coordinación/)
    expect(createSituationWithAnalysis).not.toHaveBeenCalled()
  })

  it('con «Otra» envía la categoría escrita recortada', async () => {
    await submitProblemReport({
      draft: { ...baseDraft(), categoryId: 'cat-otra', categoryOtherText: '  Biblioteca ' },
      reportKind: 'INTERNAL',
      selectedCoordinationId: 'uuid-fabrica',
      selectedCoordinationCode: 'coord-fabrica-contenidos',
      categoryRequiresOtherText: true,
    }, KEY)
    expect(createSituationWithAnalysis.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        categoryId: 'cat-otra',
        categoryOtherText: 'Biblioteca',
      }),
    )
  })

  it('con otra categoría, un texto guardado de «Otra» no viaja', async () => {
    await submitProblemReport({
      draft: { ...baseDraft(), categoryOtherText: 'Biblioteca' },
      reportKind: 'INTERNAL',
      selectedCoordinationId: 'uuid-fabrica',
      selectedCoordinationCode: 'coord-fabrica-contenidos',
      categoryRequiresOtherText: false,
    }, KEY)
    expect(createSituationWithAnalysis.mock.calls[0][0]).not.toHaveProperty(
      'categoryOtherText',
    )
  })

  it('«Otra» sin texto válido no llega al servidor', async () => {
    for (const text of ['', '   ', 'ab']) {
      await expect(
        submitProblemReport({
          draft: { ...baseDraft(), categoryId: 'cat-otra', categoryOtherText: text },
          reportKind: 'INTERNAL',
          selectedCoordinationId: 'uuid-fabrica',
          selectedCoordinationCode: 'coord-fabrica-contenidos',
          categoryRequiresOtherText: true,
        }, KEY),
      ).rejects.toThrow(/Categoría «Otra»/)
    }
    expect(createSituationWithAnalysis).not.toHaveBeenCalled()
  })

  it('envía varias coordinaciones relacionadas, sin la propia ni duplicados', async () => {
    await submitProblemReport({
      draft: {
        ...baseDraft(),
        relatedCoordinationIds: ['uuid-neg', 'uuid-fabrica', 'uuid-ing', 'uuid-neg'],
      },
      reportKind: 'INTERNAL',
      selectedCoordinationId: 'uuid-fabrica',
      selectedCoordinationCode: 'coord-fabrica-contenidos',
    }, KEY)
    expect(
      createSituationWithAnalysis.mock.calls[0][0].relatedCoordinationIds,
    ).toEqual(['uuid-neg', 'uuid-ing'])
  })

  it('sin relacionadas el campo no viaja (misma huella que antes)', async () => {
    await submitProblemReport({
      draft: baseDraft(),
      reportKind: 'INTERNAL',
      selectedCoordinationId: 'uuid-fabrica',
      selectedCoordinationCode: 'coord-fabrica-contenidos',
    }, KEY)
    const payload = createSituationWithAnalysis.mock.calls[0][0]
    expect(payload).not.toHaveProperty('relatedCoordinationIds')
    expect(payload).not.toHaveProperty('categoryOtherText')
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
