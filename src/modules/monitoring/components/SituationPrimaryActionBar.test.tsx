import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { SituationPrimaryActionBar } from '@/modules/monitoring/components/SituationPrimaryActionBar'
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
    <SituationPrimaryActionBar
      situation={input.situation}
      canUpdate={input.canUpdate ?? true}
      isUpdating={false}
      onUpdate={vi.fn()}
      onResolve={vi.fn()}
    />,
  )
}

describe('SituationPrimaryActionBar · canResolve ANALISTA', () => {
  it('muestra Resolver solo cuando canResolve es true', () => {
    const html = markup({
      situation: situation({
        canResolve: true,
        coordinationCode: 'coord-general',
      }),
    })
    expect(html).toContain('Resolver problema')
  })

  it('oculta Resolver cuando General es solo afectada (canResolve false)', () => {
    const html = markup({
      situation: situation({
        reportKind: 'INTER_COORDINATION',
        canResolve: false,
        canAdvanceToInProgress: true,
        canUpdate: true,
      }),
      canUpdate: true,
    })
    expect(html).not.toContain('Resolver problema')
    expect(html).toContain('Pasar a En atención')
  })

  it('oculta En atención cuando canAdvanceToInProgress es false', () => {
    const html = markup({
      situation: situation({
        canAdvanceToInProgress: false,
        canResolve: false,
        canUpdate: true,
      }),
      canUpdate: true,
    })
    expect(html).not.toContain('Pasar a En atención')
  })
})
