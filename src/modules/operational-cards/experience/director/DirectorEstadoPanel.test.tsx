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
            // Contrato /state: un tramo con datos trae su carga y sus cierres.
            active: {
              total: 7,
              internal: 5,
              external: 2,
              internalBreakdown: [],
              externalBreakdown: [],
            },
            solved: { total: 1 },
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
            active: null,
            solved: null,
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
    expect(html).toContain('Relaciones creadas en el periodo')
    // Lámina 2 por corte: población + fecha del corte (nunca «Activos hoy»).
    expect(html).toMatch(/director-corte-total"[^>]*>7</)
    expect(html).toContain('Corte 1 oct · en curso')
    expect(html).not.toContain('Activos hoy')
    // Corte de hoy: valores exactos, sin «Valores actuales».
    expect(html).not.toContain('director-corte-current-values')
    expect(html).toContain('Severidad vigente de los problemas activos en el corte')
    // Relaciones con su intervalo (flujo del periodo).
    expect(html).toContain('28 sep – 1 oct 2026')
    expect(html).toMatch(/director-attention-open"[^]*?Abiertos<[^]*?>4</)
    expect(html).toMatch(/director-attention-progress"[^]*?En atención<[^]*?>3</)
    // FLUJO DE PROBLEMAS sustituye a «Evolución»: barras de eventos +
    // pendientes (stock) en el resumen, con ruta ciclo › mes › semana.
    expect(html).toContain('Carga de problemas')
    expect(html).toContain('data-testid="director-flujo-crumb"')
    expect(html).toContain('H2 2026')
    expect(html).toContain('OCTUBRE')
    expect(html).toContain('Internos')
    expect(html).toContain('Externos')
    // MOVIMIENTO debajo de la CARGA, mismo periodo: Reportados vs Cerrados.
    expect(html).toContain('Movimiento de problemas')
    expect(html).toContain('Reportados')
    expect(html).toContain('Cerrados')
    expect(html).toContain('Problemas que seguían activos al corte de cada tramo')
    expect(html).toContain(
      'Problemas reportados (registrados) y cerrados (con fecha de cierre) dentro de cada tramo.',
    )
    // Resumen compacto de la lámina 1, de los mismos tramos (el futuro no cuenta).
    expect(html).toContain('data-testid="director-flujo-summary"')
    expect(html).toMatch(/director-flujo-stat-active[^]*?>7</)
    expect(html).toMatch(/director-flujo-stat-reported[^]*?>2</)
    expect(html).toMatch(/director-flujo-stat-closed[^]*?>1</)
    // El tramo futuro no tiene fila ni columna.
    expect(html).not.toContain('director-flujo-row-2026-10-02')
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

/** Lámina 2 (scope período) con datos válidos del corte. */
function corte(props: Partial<Parameters<typeof DirectorEstadoComposicion>[0]> = {}) {
  return renderToStaticMarkup(
    <DirectorEstadoComposicion
      severity={{ critical: 2, high: 4, medium: 9, low: 6 }}
      status={{ open: 8, inProgress: 7, closedAfterCut: 6, unclassified: 0 }}
      incoming={1}
      outgoing={3}
      cut={{ at: '2026-09-30', isNow: false }}
      relationsPeriod={{ from: '2026-09-01', to: '2026-09-30' }}
      hasCachedData
      onOpenDependencias={() => undefined}
      {...props}
    />,
  )
}

const text = (html: string) => html.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|')

describe('DirectorEstadoComposicion · lámina 2 por corte', () => {
  it('orden: cabecera → Severidad → Atención → Relaciones', () => {
    const html = corte()
    const at = (needle: string) => html.indexOf(needle)
    expect(at('director-estado-comp-cut')).toBeGreaterThan(-1)
    expect(at('director-estado-comp-cut')).toBeLessThan(at('director-kpi-severity'))
    expect(at('director-kpi-severity')).toBeLessThan(at('director-kpi-status-split'))
    expect(at('director-kpi-status-split')).toBeLessThan(at('director-estado-relations-line'))
  })

  it('corte histórico: población + fecha + «Valores actuales» (la explicación, en la ayuda)', () => {
    const html = corte()
    expect(html).toMatch(/director-corte-total"[^>]*>21</)
    expect(html).toContain('activos al corte')
    expect(html).toContain('Corte 30 sep 2026')
    // La cabecera nunca dice «Activos hoy» (la ayuda sí habla de «vigentes hoy»).
    expect(html).not.toContain('Activos hoy')
    expect(html).toContain('data-testid="director-corte-current-values"')
    expect(html).toContain(
      'La población es la de los problemas activos al cierre del 30 sep. Su severidad y su estado de atención son los vigentes hoy, no los de esa fecha.',
    )
    // Ayuda de Severidad corregida: NOVEX sí registra cambios; la vista no los aplica.
    expect(html).not.toContain('NOVEX no guarda')
    expect(html).toContain('NOVEX registra los cambios de severidad, pero esta vista aún no los aplica')
  })

  it('corte de hoy: «en curso», sin «Valores actuales» ni fila de cerrados después', () => {
    const html = corte({
      severity: { critical: 1, high: 3, medium: 7, low: 4 },
      status: { open: 9, inProgress: 6, closedAfterCut: 0, unclassified: 0 },
      cut: { at: '2026-10-07', isNow: true },
    })
    expect(html).toContain('Corte 7 oct · en curso')
    expect(html).not.toContain('director-corte-current-values')
    expect(html).not.toContain('director-attention-closed-after')
  })

  it('Severidad: filas Crítica → Baja con escala común; descripción accesible equivalente', () => {
    const html = corte()
    expect(html).toContain('novex-chart--severity-rows')
    expect(html).toContain('aria-label="Severidad de los 21 activos: crítica 2, alta 4, media 9, baja 6."')
  })

  it('Atención: todas las categorías del corte histórico, con nombre, cantidad y % (Σ = 100)', () => {
    const t = text(corte())
    expect(t).toContain('|Abiertos|8|38 %|')
    expect(t).toContain('|En atención|7|33 %|')
    expect(t).toContain('|Cerrados después del corte|6|29 %|')
    // «Sin clasificar» solo si existe.
    expect(t).not.toContain('Sin clasificar')
    const t2 = text(corte({ status: { open: 8, inProgress: 7, closedAfterCut: 0, unclassified: 6 } }))
    expect(t2).toContain('|Cerrados después del corte|0|0 %|')
    expect(t2).toContain('|Sin clasificar|6|29 %|')
  })

  it('una sola categoría: 100 % real (no un estado vacío)', () => {
    const t = text(
      corte({
        severity: { critical: 0, high: 2, medium: 0, low: 0 },
        status: { open: 2, inProgress: 0, closedAfterCut: 0, unclassified: 0 },
        cut: { at: '2026-10-07', isNow: true },
      }),
    )
    expect(t).toContain('|Abiertos|2|100 %|')
    expect(t).toContain('|En atención|0|0 %|')
    expect(t).not.toContain('Sin problemas activos')
  })

  it('Relaciones: flujo del periodo, separado, con etiquetas y acceso; no suma a los activos', () => {
    const html = corte()
    const t = text(html)
    expect(t).toContain('Relaciones creadas en el periodo')
    expect(t).toContain('1 sep – 30 sep 2026')
    expect(t).toContain('|1|Dependencia|otras coordinaciones afectan a esta|')
    expect(t).toContain('|3|Compromisos|esta coordinación afecta a otras|')
    expect(t).toContain('Ver dependencias →')
    // 21 activos: las relaciones no se suman ni entran en la dona.
    expect(html).toMatch(/director-corte-total"[^>]*>21</)
    expect(html).toContain('aria-label="Estado de atención de los 21 activos"')
  })

  it('datos válidos sin activos: estado vacío explícito (sin dona al 100 %); relaciones visibles', () => {
    const html = corte({
      severity: { critical: 0, high: 0, medium: 0, low: 0 },
      status: { open: 0, inProgress: 0, closedAfterCut: 0, unclassified: 0 },
      incoming: 0,
      outgoing: 2,
      cut: { at: '2026-10-07', isNow: true },
    })
    expect(html).toContain('data-state="ready"')
    expect(html).toContain('Sin problemas activos en este corte')
    expect(html).toMatch(/director-corte-total"[^>]*>0</)
    expect(html).not.toContain('director-estado-attention-chart')
    expect(html).not.toContain('director-estado-severity-chart')
    expect(text(html)).toContain('|2|Compromisos|')
  })

  it('cargando: «Actualizando…», sin ninguna cifra (ni visible ni para lector) ni corte', () => {
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
    expect(html).toContain('data-state="loading"')
    expect(html).not.toContain('director-corte-total')
    expect(html).not.toContain('data-testid="director-estado-comp-cut"')
    expect(html).not.toContain('director-estado-severity-chart')
    expect(html).not.toContain('director-attention-open')
    expect(html).not.toContain('director-relations-dependencies')
    expect(text(html)).not.toMatch(/\|0\|/)
  })

  it('error: solo el aviso; ni «Actualizando…» ni ceros (tampoco en Relaciones)', () => {
    const html = renderToStaticMarkup(
      <DirectorEstadoComposicion
        severity={{ critical: 0, high: 0, medium: 0, low: 0 }}
        status={{ open: 0, inProgress: 0 }}
        incoming={0}
        outgoing={0}
        loading={false}
        error="HTTP 500"
      />,
    )
    expect(html).toContain('No se pudo leer el periodo. HTTP 500')
    expect(html).toContain('data-state="error"')
    expect(html).not.toContain('Actualizando')
    expect(html).not.toContain('director-estado-attention-chart')
    expect(html).not.toContain('director-relations-dependencies')
    expect(text(html)).not.toMatch(/\|0\|/)
  })
})

describe('DirectorEstadoComposicion · lectura de Dirección (live) sin cambios', () => {
  it('conserva barras verticales, dona y su maquetación previa', () => {
    const html = renderToStaticMarkup(
      <DirectorEstadoComposicion
        severity={{ critical: 0, high: 1, medium: 8, low: 1 }}
        status={{ open: 6, inProgress: 4 }}
        incoming={1}
        outgoing={0}
        scope="live"
      />,
    )
    expect(html).toContain('Severidad de los problemas activos')
    expect(html).toContain('novex-chart--composition')
    expect(html).not.toContain('novex-chart--severity-rows')
    expect(html).toContain('Abiertos 6')
  })
})

