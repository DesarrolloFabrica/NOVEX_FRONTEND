import { describe, expect, it } from 'vitest'
import type { SituationCaptureDraft } from '@/modules/situations/types/situation-capture.types'
import type {
  CoordinationSummary,
  IncidentCategorySummary,
} from '@/modules/situations/types/situation.types'
import { validateSituationCaptureDraft } from '@/modules/operational-events/utils/situationCaptureValidation'

const categories: IncidentCategorySummary[] = [
  {
    id: '4ce4e56e-1111-4111-8111-111111111111',
    code: 'INTERNET',
    name: 'Internet',
    description: null,
    isSelectable: true,
    icon: 'internet',
  },
]

const coordinations: CoordinationSummary[] = [
  {
    id: '5ce4e56e-1111-4111-8111-111111111111',
    code: 'coord-general',
    name: 'Coordinación General',
    shortName: 'General',
    description: null,
    color: '#fff',
    icon: 'grid',
    imageAsset: '',
    displayOrder: 1,
    isActive: true,
  },
]

function buildDraft(
  overrides: Partial<SituationCaptureDraft> = {},
): SituationCaptureDraft {
  return {
    title: 'Interrupción del servicio de matrículas',
    description:
      'Durante la ventana de mayor demanda se detectó una degradación sostenida que impide completar el proceso de matrícula.',
    coordinationId: coordinations[0]!.id,
    reportedAt: '2026-07-30',
    detectionMethod: 'SISTEMA',
    detectionMethodOther: '',
    affectedParties: ['ESTUDIANTES'],
    affectedPartyOther: '',
    relatedCoordinationIds: [],
    additionalNotes: '',
    categoryId: '4ce4e56e-1111-4111-8111-111111111111',
    ...overrides,
  }
}

describe('situationCaptureValidation', () => {
  it('acepta un borrador completo con coordinación real', () => {
    const result = validateSituationCaptureDraft(
      buildDraft(),
      coordinations,
      undefined,
      true,
      categories,
    )
    expect(result.valid).toBe(true)
  })

  it('rechaza coordinaciones inexistentes', () => {
    const result = validateSituationCaptureDraft(
      buildDraft({ coordinationId: '00000000-0000-4000-8000-000000000099' }),
      coordinations,
    )
    expect(result.valid).toBe(false)
    expect(result.missingRequirements).toContain('coordinación responsable válida')
  })

  it('rechaza fechas futuras', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const offset = tomorrow.getTimezoneOffset() * 60_000
    const futureDate = new Date(tomorrow.getTime() - offset)
      .toISOString()
      .slice(0, 10)

    const result = validateSituationCaptureDraft(
      buildDraft({ reportedAt: futureDate }),
      coordinations,
    )

    expect(result.valid).toBe(false)
    expect(result.missingRequirements).toContain(
      'una fecha de ocurrencia que no sea futura',
    )
  })

  it('exige una categoría seleccionable', () => {
    const result = validateSituationCaptureDraft(
      buildDraft({ categoryId: '' }),
      coordinations,
      undefined,
      true,
      categories,
    )

    expect(result.valid).toBe(false)
    expect(result.missingRequirements).toContain('la categoría del caso')
  })
})
