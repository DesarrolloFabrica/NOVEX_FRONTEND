import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ImpactSituationCommand } from '@/modules/impact-network/components/ImpactSituationCommand'
import type { SituationResponse } from '@/modules/situations/types/situation.types'

function situation(over: Partial<SituationResponse> = {}): SituationResponse {
  return {
    id: 's1',
    title: 'Caso',
    description: 'Desc',
    severity: 'HIGH',
    status: 'OPEN',
    coordinationId: 'c1',
    coordinationCode: 'coord-b2b',
    coordinationName: 'B2B',
    createdByUserId: 'u1',
    createdByUserName: 'Autor',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    occurredAt: '2026-09-01T09:00:00.000Z',
    categoryId: null,
    categoryCode: null,
    categoryName: null,
    canResolve: true,
    canAdvanceToInProgress: true,
    canUpdate: true,
    reportKind: 'INTERNAL',
    ...over,
  } as SituationResponse
}

function markup(input: {
  situation: SituationResponse
  canUpdate?: boolean
}) {
  return renderToStaticMarkup(
    <ImpactSituationCommand
      situation={input.situation}
      canUpdate={input.canUpdate ?? true}
      isUpdating={false}
      onUpdateStatus={vi.fn()}
      onResolve={vi.fn()}
      onOpenAnalysis={vi.fn()}
      onDownloadPdf={vi.fn()}
    />,
  )
}

describe('ImpactSituationCommand · cierre', () => {
  it('en OPEN con permisos muestra avance y resolver', () => {
    const html = markup({ situation: situation() })
    expect(html).toContain('data-testid="impact-advance-status"')
    expect(html).toContain('data-testid="impact-resolve-problem"')
  })

  it('en IN_PROGRESS no ofrece avance y sí resolver si canResolve', () => {
    const html = markup({
      situation: situation({ status: 'IN_PROGRESS', canResolve: true }),
    })
    expect(html).not.toContain('data-testid="impact-advance-status"')
    expect(html).toContain('data-testid="impact-resolve-problem"')
  })

  it('sin canResolve no muestra cerrar aunque pueda avanzar', () => {
    const html = markup({
      situation: situation({ canResolve: false, canAdvanceToInProgress: true }),
      canUpdate: true,
    })
    expect(html).toContain('data-testid="impact-advance-status"')
    expect(html).not.toContain('data-testid="impact-resolve-problem"')
  })

  it('sin canAdvanceToInProgress no muestra En atención aunque canUpdate legacy sea true', () => {
    const html = markup({
      situation: situation({
        canAdvanceToInProgress: false,
        canResolve: false,
      }),
      canUpdate: true,
    })
    expect(html).not.toContain('data-testid="impact-advance-status"')
    expect(html).toContain('data-can-advance="false"')
  })

  it('ANALISTA con canResolve false (General solo afectada) no ve Resolver', () => {
    const html = markup({
      situation: situation({
        reportKind: 'INTER_COORDINATION',
        canResolve: false,
        canUpdate: true,
        coordinationCode: 'coord-especializaciones',
        affectedCoordinationCode: 'coord-general',
      }),
    })
    expect(html).toContain('data-can-resolve="false"')
    expect(html).not.toContain('data-testid="impact-resolve-problem"')
  })

  it('ANALISTA con canResolve true (General responsable) ve Resolver', () => {
    const html = markup({
      situation: situation({
        canResolve: true,
        coordinationCode: 'coord-general',
        coordinationName: 'Coordinación General',
      }),
    })
    expect(html).toContain('data-can-resolve="true"')
    expect(html).toContain('data-testid="impact-resolve-problem"')
  })

  it('solo lectura no muestra controles de escritura', () => {
    const html = markup({
      situation: situation({
        canResolve: false,
        canAdvanceToInProgress: false,
      }),
      canUpdate: false,
    })
    expect(html).not.toContain('data-testid="impact-advance-status"')
    expect(html).not.toContain('data-testid="impact-resolve-problem"')
  })
})
