import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildCurrentWeekPeriod } from '@/modules/operational-cards/domain/analysis-period'
import { DirectorEstadoPanel } from '@/modules/operational-cards/experience/director/DirectorEstadoPanel'
import { DirectorEstadoComposicion } from '@/modules/operational-cards/experience/director/DirectorEstadoComposicion'
import { DirectorEstadoOperativo } from '@/modules/operational-cards/experience/director/DirectorEstadoOperativo'
import {
  kpiCoordinationFixture,
  kpiDirectionSnapshotFixture,
} from '@/modules/operational-cards/experience/director/director-kpi.fixture'

vi.mock('@/modules/operational-cards/hooks/useDirectorEstadoState', () => ({
  useDirectorEstadoState: () => ({
    status: 'success',
    data: {
      scope: {
        type: 'coordination',
        coordinationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      },
      timezone: 'America/Bogota',
      period: {
        kind: 'week',
        from: '2026-09-29',
        to: '2026-10-05',
        calendarEnd: '2026-10-05',
        label: '2026-09-29 – 2026-10-05',
        isCurrent: true,
        isPartial: true,
        dataTo: '2026-10-05',
      },
      severity: { critical: 0, high: 1, medium: 8, low: 1 },
      attention: { open: 6, inProgress: 4 },
      relations: { dependencies: 1, commitments: 1 },
      registeredCount: 10,
      severitySemantics: 'current-severity-of-period-registrations',
      evolution: {
        bucket: 'day',
        backlog: [
          {
            start: '2026-09-29',
            end: '2026-09-29',
            label: 'Lun 29',
            value: 3,
          },
        ],
        created: [],
        closed: [],
      },
    },
    error: null,
  }),
}))

describe('DirectorEstadoPanel periodo jerárquico', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra picker de fechas y composición del periodo', () => {
    const period = buildCurrentWeekPeriod(
      new Date('2026-10-01T12:00:00-05:00'),
    )
    const html = renderToStaticMarkup(
      <DirectorEstadoPanel
        selected
        selectedCoordination={{
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          code: 'coord-b2b',
          name: 'B2B',
          shortName: 'B2B',
          color: '#FF5F66',
          displayOrder: 2,
          status: 'CRITICO',
          activeProblemsCount: 10,
          criticalCount: 0,
          affectedCoordinationCount: 0,
          lifePoints: 3,
        }}
        coordinationId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        directionStatus="success"
        direction={kpiDirectionSnapshotFixture()}
        directionError={null}
        onRetryDirection={() => undefined}
        coordinationStatus="success"
        coordination={kpiCoordinationFixture(1, {
          integrityStatus: 'CRITICO',
          problems: {
            activeCount: 10,
            status: { open: 6, inProgress: 4 },
            severity: { critical: 0, high: 1, medium: 8, low: 1 },
          },
          dependencies: { incoming: 1, outgoing: 1 },
        })}
        coordinationError={null}
        evolutionView="pendientes"
        analysisPeriod={period}
        onEvolutionViewChange={() => undefined}
        onAnalysisPeriodChange={() => undefined}
        onOpenDependencias={() => undefined}
      />,
    )
    expect(html).toContain('Periodo analizado')
    expect(html).toContain('data-testid="director-analysis-period"')
    expect(html).toContain('Estado actual')
    expect(html).toContain('data-integrity-source="live"')
    expect(html).toContain('Severidad de los problemas del periodo')
    expect(html).toContain('Estado actual de los casos del periodo')
    expect(html).toContain('Relaciones registradas en el periodo')
    expect(html).toContain('Abiertos 6')
    expect(html).toContain('Pendientes')
    expect(html).toContain('Nuevos vs cerrados')
    expect(html).not.toContain('data-testid="director-estado-period-week"')
    expect(html).not.toContain('data-testid="director-history-period-week"')
  })
})

describe('DirectorEstadoOperativo', () => {
  it('mantiene badge live', () => {
    const html = renderToStaticMarkup(
      <DirectorEstadoOperativo
        integrityStatus="CRITICO"
        explainInput={{
          activeCount: 10,
          criticalCount: 0,
          highCount: 1,
          mediumCount: 8,
          lowCount: 1,
        }}
      />,
    )
    expect(html).toContain('Estado actual')
    expect(html).toContain('data-integrity-source="live"')
  })
})

describe('DirectorEstadoComposicion', () => {
  it('títulos del periodo', () => {
    const html = renderToStaticMarkup(
      <DirectorEstadoComposicion
        severity={{ critical: 0, high: 1, medium: 8, low: 1 }}
        status={{ open: 6, inProgress: 4 }}
        incoming={1}
        outgoing={0}
      />,
    )
    expect(html).toContain('Severidad de los problemas del periodo')
    expect(html).toContain('Estado actual de los casos del periodo')
    expect(html).toContain('Relaciones registradas en el periodo')
  })
})
