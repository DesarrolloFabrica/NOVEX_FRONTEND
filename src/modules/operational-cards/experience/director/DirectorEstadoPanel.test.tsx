import { resolutionFixture } from '@/modules/operational-cards/charts/resolucion.fixture'
import { agingFixture, snapshotFixture } from '@/modules/operational-cards/charts/antiguedad.fixture'
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
        from: '2026-09-28',
        to: '2026-10-01',
        calendarEnd: '2026-10-04',
        label: '2026-09-28 – 2026-10-04',
        isCurrent: true,
        isPartial: true,
        dataTo: '2026-10-01',
      },
      relations: { dependencies: 1, commitments: 1 },
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
        buckets: [
          {
            start: '2026-09-28',
            end: '2026-09-28',
            dataEnd: '2026-09-28',
            calendarStart: '2026-09-28',
            calendarEnd: '2026-09-28',
            label: 'Lun 28',
            current: false,
            future: false,
            created: 2,
            closed: 1,
            backlog: 3,
          },
          {
            start: '2026-10-02',
            end: '2026-10-02',
            dataEnd: null,
            calendarStart: '2026-10-02',
            calendarEnd: '2026-10-02',
            label: 'Vie 2',
            current: false,
            future: true,
            created: null,
            closed: null,
            backlog: null,
          },
        ],
      },
      activeAtPeriodEnd: { count: 7, at: '2026-10-01', isNow: true },
      aging: agingFixture({ at: '2026-10-01', isNow: true }),
      snapshot: snapshotFixture(agingFixture({ at: '2026-10-01', isNow: true })),
      resolution: resolutionFixture([
        { start: '2026-09-28', solved: { total: 1 } },
        { start: '2026-10-02', solved: null },
      ]),
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
        analysisPeriod={period}
        onAnalysisPeriodChange={() => undefined}
        onOpenDependencias={() => undefined}
      />,
    )
    // El picker vive en DirectorReadingPanel (periodo común a todos los tabs).
    expect(html).not.toContain('data-testid="director-analysis-period"')
    // La integridad (CRÍTICO/ALERTA/ESTABLE) vive en el personaje, no aquí.
    expect(html).not.toContain('data-testid="director-estado-operativo"')
    expect(html).not.toContain('data-integrity-source')
    expect(html).not.toContain('>Estado actual<')
    expect(html).toContain('Severidad')
    expect(html).toContain('Estado de atención')
    expect(html).toContain('Relaciones')
    // Semántica mutable explícita en la ayuda, no como foto histórica.
    expect(html).toContain('Severidad de la carga')
    expect(html).toContain('Severidad de los problemas activos hoy')
    expect(html).toContain('Estado (abierto / en atención) de los problemas activos hoy.')
    expect(html).toContain('Activos hoy')
    expect(html).not.toContain('registrados durante el periodo')
    // Corte de hoy: sin marca de «valor actual».
    expect(html).not.toContain('director-severity-reliability')
    expect(html).toContain('Problemas INTER creados durante el periodo')
    expect(html).toContain('Abiertos 4')
    expect(html).toContain('En atención 3')
    // FLUJO DE PROBLEMAS sustituye a «Evolución»: barras de eventos +
    // pendientes (stock) en el resumen, con ruta ciclo › mes › semana.
    expect(html).toContain('Carga de problemas')
    expect(html).toContain('data-testid="director-flujo-crumb"')
    expect(html).toContain('H2 2026')
    expect(html).toContain('OCTUBRE')
    expect(html).toContain('Internos')
    expect(html).toContain('Externos')
    // MOVIMIENTO al lado de la CARGA, mismo periodo.
    expect(html).toContain('Movimiento de problemas')
    expect(html).toContain('Reportados')
    expect(html).toContain('Solucionados')
    expect(html).toContain('Problemas que seguían pendientes al cierre de cada periodo.')
    expect(html).toContain('Problemas reportados y solucionados durante cada periodo.')
    expect(html).not.toContain('director-flujo-summary')
    expect(html).not.toContain('Nuevos vs cerrados')
    expect(html).not.toContain('>Evolución<')
    expect(html).not.toContain('data-testid="director-estado-period-week"')
    expect(html).not.toContain('data-testid="director-history-period-week"')
    // Página 3 · ANTIGÜEDAD: mismo payload /state, sin periodo propio.
    expect(html).toContain('data-pages="4"')
    expect(html).toContain('data-testid="director-estado-page-antiguedad"')
    expect(html).toContain('aria-label="Antigüedad (3 de 4)"')
    expect(html).toContain('data-testid="director-estado-carousel-dot-2"')
    expect(html).toContain('Problemas más antiguos')
    expect(html).toMatch(/data-testid="director-antiguedad-cut"[^>]*>HOY</)
  })

  it('conserva la página 3 controlada por la lectura', () => {
    const period = buildCurrentWeekPeriod(new Date('2026-10-01T12:00:00-05:00'))
    const html = renderToStaticMarkup(
      <DirectorEstadoPanel
        selected
        selectedCoordination={null}
        coordinationId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        directionStatus="success"
        direction={kpiDirectionSnapshotFixture()}
        directionError={null}
        onRetryDirection={() => undefined}
        coordinationStatus="success"
        coordination={kpiCoordinationFixture(1)}
        coordinationError={null}
        analysisPeriod={period}
        onAnalysisPeriodChange={() => undefined}
        carouselPage={2}
        onCarouselPageChange={() => undefined}
      />,
    )
    expect(html).toContain('data-page="2"')
    expect(html).toMatch(/data-testid="director-estado-page-antiguedad" data-active="true"/)
    // Antigüedad ya no es la última lámina: queda Resolución.
    expect(html).not.toContain('data-testid="director-estado-carousel-next" aria-label="Gráficas siguientes" disabled=""')
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
    expect(html).toContain('Severidad')
    expect(html).toContain('Estado de atención')
    expect(html).toContain('Relaciones')
    // Semántica mutable explícita en la ayuda, no como foto histórica.
    // Sin corte (sin datos del periodo vigente) no se afirma semántica temporal.
    expect(html).not.toContain('registrados durante el periodo')
    expect(html).toContain('Problemas INTER creados durante el periodo')
  })
})

describe('DirectorEstadoComposicion · snapshot al corte', () => {
  it('corte histórico: «valor actual» / «estado actual» explícitos y «solucionados después» visibles', () => {
    const html = renderToStaticMarkup(
      <DirectorEstadoComposicion
        severity={{ critical: 2, high: 4, medium: 9, low: 6 }}
        status={{ open: 8, inProgress: 7, closedAfterCut: 6, unclassified: 0 }}
        incoming={1}
        outgoing={0}
        cut={{ at: '2026-09-30', isNow: false }}
        hasCachedData
      />,
    )
    expect(html).toContain('Activos al cierre del 30 sep 2026')
    expect(html).toContain('data-testid="director-severity-reliability">Valor actual<')
    expect(html).toContain('Estado actual · activos al 30 sep')
    expect(html).toContain('NOVEX no guarda la severidad que tenían entonces')
    expect(html).toContain('El estado de entonces no se reconstruye')
    expect(html).toContain('Solucionados después 6')
  })

  it('corte de hoy: exacto, sin marcas de fiabilidad ni «solucionados después»', () => {
    const html = renderToStaticMarkup(
      <DirectorEstadoComposicion
        severity={{ critical: 1, high: 3, medium: 7, low: 4 }}
        status={{ open: 9, inProgress: 6, closedAfterCut: 0, unclassified: 0 }}
        incoming={0}
        outgoing={0}
        cut={{ at: '2026-10-07', isNow: true }}
        hasCachedData
      />,
    )
    expect(html).toContain('Activos hoy')
    expect(html).not.toContain('Valor actual')
    expect(html).not.toContain('Solucionados después')
  })

  it('sin datos del periodo vigente: marco + «Actualizando…», nunca cifras de otro periodo', () => {
    const html = renderToStaticMarkup(
      <DirectorEstadoComposicion
        severity={{ critical: 0, high: 0, medium: 0, low: 0 }}
        status={{ open: 0, inProgress: 0 }}
        incoming={0}
        outgoing={0}
        loading
      />,
    )
    expect(html).toContain('Actualizando…')
    expect(html).not.toContain('director-estado-severity-chart')
  })

  it('error del periodo nuevo: aviso explícito y sin gráficas', () => {
    const html = renderToStaticMarkup(
      <DirectorEstadoComposicion
        severity={{ critical: 0, high: 0, medium: 0, low: 0 }}
        status={{ open: 0, inProgress: 0 }}
        incoming={0}
        outgoing={0}
        error="HTTP 500"
      />,
    )
    expect(html).toContain('No se pudo leer el periodo. HTTP 500')
    expect(html).not.toContain('director-estado-attention-chart')
  })
})
