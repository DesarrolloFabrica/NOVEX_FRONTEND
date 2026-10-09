import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ProblemResolutionRecord } from '@/modules/operational-cards/components/ProblemResolutionRecord'
import { DirectorProblemPanel } from '@/modules/operational-cards/experience/director/DirectorProblemPanel'
import type { OperationalShellModel } from '@/modules/operational-cards/hooks/useOperationalShellModel'
import type { ProblemDetail } from '@/modules/operational-cards/types/problem-detail.types'

// El cuerpo del expediente tiene su propia suite; aquí importa lo que va DEBAJO.
vi.mock('@/modules/operational-cards/components/ProblemDetail', () => ({
  ProblemDetail: () => <div data-testid="problem-detail-stub" />,
}))

const LONG_LEARNING = `${'Se restableció el servicio de notas y se documentó el rollback. '.repeat(12)}Fin.`

const base: ProblemDetail = {
  id: 'p1',
  title: 'Caída de notas',
  description: 'desc',
  severity: 'HIGH',
  status: 'CLOSED',
  occurredAt: '2026-10-01T10:00:00.000Z',
  createdAt: '2026-10-01T10:00:00.000Z',
  coordinationName: 'Fábrica',
  coordinationCode: 'fabrica',
  createdByUserName: 'Ana',
  affectedCoordinationCode: null,
  affectedCoordinationName: null,
  reportKind: 'INTERNAL',
  affectedProcess: null,
  pendingDelivery: null,
  // El DTO trae indicadores de escritura: el Director igual no debe verlos.
  canResolve: true,
  canAdvanceToInProgress: true,
  canUpdate: true,
  resolution: {
    learning: LONG_LEARNING,
    resolvedByUserName: 'Coordinadora Fábrica',
    resolvedAt: '2026-09-30T15:00:00.000Z',
    closedAt: '2026-10-02T19:00:00.000Z',
    recordedAt: '2026-10-02T19:00:00.000Z',
  },
} as unknown as ProblemDetail

function panel(detail: ProblemDetail | null, status: 'ready' | 'loading' = 'ready') {
  const model = {
    controller: {
      level2: { problemId: 'p1', status, detail, errorMessage: null },
      closeProblem: vi.fn(),
      selectedCoordinationCode: 'fabrica',
      toggleSection: vi.fn(),
      retrySection: vi.fn(),
    },
    selectedCoordination: null,
    labelByCode: {},
    rowLabelByCode: {},
    colorByCode: {},
  } as unknown as OperationalShellModel
  return renderToStaticMarkup(<DirectorProblemPanel model={model} direction={null} />)
}

describe('Expediente del Director · aprendizaje en solo lectura', () => {
  it('muestra el aprendizaje COMPLETO, quién cerró y la fecha de cierre', () => {
    const html = panel(base)
    expect(html).toContain('data-testid="director-problem-resolution"')
    expect(html).toContain(LONG_LEARNING)
    expect(html).toContain('Coordinadora Fábrica')
    // Fecha de CIERRE (closedAt), no resolvedAt legado.
    expect(html).toContain('dateTime="2026-10-02T19:00:00.000Z"')
    expect(html).toContain('Cerrado el')
  })

  it('no monta controles: ni formulario de cierre, ni avance, ni edición', () => {
    const html = panel(base)
    expect(html).not.toContain('<textarea')
    expect(html).not.toContain('<form')
    expect(html).not.toContain('<button')
    expect(html).not.toContain('resolve-form')
    expect(html).not.toContain('Pasar a En atención')
  })

  it('histórico sin resolución: mensaje explícito, sin texto inventado', () => {
    const html = panel({ ...base, resolution: null })
    expect(html).toContain('data-testid="problem-without-learning"')
    expect(html).not.toContain('data-testid="problem-learning"')
  })

  it('problema activo o detalle cargando: no hay bloque de cierre', () => {
    expect(panel({ ...base, status: 'IN_PROGRESS', resolution: null })).not.toContain(
      'director-problem-resolution',
    )
    expect(panel(null, 'loading')).not.toContain('director-problem-resolution')
  })
})

describe('ProblemResolutionRecord', () => {
  it('sin closedAt usa resolvedAt como fecha visible', () => {
    const html = renderToStaticMarkup(
      <ProblemResolutionRecord
        resolution={{ learning: 'X', resolvedByUserName: 'Y', resolvedAt: '2026-09-30T15:00:00.000Z' }}
        reportKind="INTERNAL"
      />,
    )
    expect(html).toContain('dateTime="2026-09-30T15:00:00.000Z"')
  })
})
