import { describe, expect, it } from 'vitest'
import { buildSituationDescription } from './buildSituationSubmission'
import type { SituationCaptureDraft } from '@/modules/situations/types/situation-capture.types'

describe('buildSituationDescription', () => {
  it('incluye las notas adicionales en el contexto enviado al análisis IA', () => {
    const draft: SituationCaptureDraft = {
      title: 'Intermitencia Saber Pro',
      description: 'La plataforma presenta intermitencia.',
      coordinationId: 'coordination-id',
      reportedAt: '2026-08-05',
      detectionMethod: '',
      detectionMethodOther: '',
      affectedParties: [],
      affectedPartyOther: '',
      relatedCoordinationIds: [],
      additionalNotes: 'El corte inició después de las 14:00.',
      categoryId: '4ce4e56e-1111-4111-8111-111111111111',
    }

    expect(buildSituationDescription(draft, [])).toContain(
      'Notas adicionales: El corte inició después de las 14:00.',
    )
  })
})
