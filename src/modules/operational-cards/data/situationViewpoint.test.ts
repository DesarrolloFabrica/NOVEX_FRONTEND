import { describe, expect, it } from 'vitest'
import {
  reportDraftKey,
  resolveSituationViewpointLabel,
} from '@/modules/operational-cards/data/situationViewpoint'
import { validateReportDraft } from '@/modules/operational-cards/services/report-submission.service'
import { emptyReportDraft } from '@/modules/operational-cards/state/operationalCards.reducer'

describe('situationViewpoint', () => {
  it('etiqueta INTERNAL siempre como problema interno', () => {
    expect(
      resolveSituationViewpointLabel({
        reportKind: 'INTERNAL',
        selectedCoordinationCode: 'coord-saber-pro',
        responsibleCode: 'coord-saber-pro',
        affectedCode: 'coord-saber-pro',
      }),
    ).toBe('Problema interno')
  })

  it('distingue impacto recibido y responsabilidad pendiente', () => {
    expect(
      resolveSituationViewpointLabel({
        reportKind: 'INTER_COORDINATION',
        selectedCoordinationCode: 'coord-saber-pro',
        responsibleCode: 'coord-fabrica-contenidos',
        affectedCode: 'coord-saber-pro',
      }),
    ).toBe('Dependencia que nos afecta')

    expect(
      resolveSituationViewpointLabel({
        reportKind: 'INTER_COORDINATION',
        selectedCoordinationCode: 'coord-fabrica-contenidos',
        responsibleCode: 'coord-fabrica-contenidos',
        affectedCode: 'coord-saber-pro',
      }),
    ).toBe('Problema que debemos resolver para otra coordinación')
  })

  it('separa borradores por kind', () => {
    expect(reportDraftKey('coord-saber-pro', 'INTERNAL')).not.toBe(
      reportDraftKey('coord-saber-pro', 'INTER_COORDINATION'),
    )
  })
})

describe('validateReportDraft INTER', () => {
  it('exige responsable, proceso y entrega distinta de la afectada', () => {
    const draft = {
      ...emptyReportDraft('2026-09-16T10:00'),
      title: 'Retraso',
      description: 'Falta entrega',
    }
    const empty = validateReportDraft(draft, 'INTER_COORDINATION')
    expect(empty.valid).toBe(false)

    const ok = validateReportDraft(
      {
        ...draft,
        responsibleCoordinationId: 'uuid-b',
        affectedProcess: 'Certificación',
        pendingDelivery: 'Guiones',
      },
      'INTER_COORDINATION',
    )
    expect(ok.valid).toBe(true)
  })
})
