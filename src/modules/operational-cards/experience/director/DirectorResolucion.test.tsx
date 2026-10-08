import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { resolutionFixture } from '@/modules/operational-cards/charts/resolucion.fixture'
import { analysisPeriodFromCycle } from '@/modules/operational-cards/domain/analysis-period'
import { DirectorResolucion } from '@/modules/operational-cards/experience/director/DirectorResolucion'
import type { OperationalKpiFlowBucket } from '@/modules/operational-cards/types/operational-kpi.types'

const NOW = new Date('2026-10-07T12:00:00-05:00')
const H2 = analysisPeriodFromCycle(2026, 2, NOW)

function flow(start: string, solved: number | null): OperationalKpiFlowBucket {
  const future = solved === null
  return {
    start,
    end: start,
    dataEnd: future ? null : start,
    calendarStart: start,
    calendarEnd: start,
    label: start,
    current: start === '2026-10-01',
    future,
    created: future ? null : 1,
    closed: solved,
    backlog: future ? null : 1,
    active: future
      ? null
      : { total: 1, internal: 1, external: 0, internalBreakdown: [], externalBreakdown: [] },
    solved: future ? null : { total: solved },
  }
}

const FLOW = [
  flow('2026-07-01', 2),
  flow('2026-08-01', 0),
  flow('2026-09-01', 8),
  flow('2026-10-01', 7),
  flow('2026-11-01', null),
  flow('2026-12-01', null),
]

const render = (props: Partial<Parameters<typeof DirectorResolucion>[0]> = {}) =>
  renderToStaticMarkup(
    <DirectorResolucion
      period={H2}
      flowBuckets={FLOW}
      resolution={resolutionFixture(FLOW)}
      loading={false}
      error={null}
      {...props}
    />,
  )

describe('DirectorResolucion · lámina', () => {
  it('RESOLUCIÓN: tiempo de resolución | tiempo hasta solución, lado a lado', () => {
    const html = render()
    expect(html).toMatch(/<h3 class="director-antiguedad__eyebrow">Resolución<\/h3>/)
    const trend = html.indexOf('data-testid="director-resolucion-tendencia"')
    const dist = html.indexOf('data-testid="director-resolucion-distribucion"')
    expect(trend).toBeGreaterThan(-1)
    expect(dist).toBeGreaterThan(trend)
    expect(html).toContain('Tiempo de resolución')
    expect(html).toContain('Tiempo hasta solución')
    expect(html).toContain('data-testid="director-resolucion-trend-chart"')
    expect(html).toContain('data-testid="director-tiempo-solucion-chart"')
    expect(html).toContain('data-level="month"')
  })

  it('métrica de intervalo: sin chip de corte (HOY / AL CIERRE)', () => {
    const html = render()
    expect(html).not.toContain('director-antiguedad-cut')
    expect(html).not.toMatch(/AL CIERRE|>HOY</)
  })

  it('subtítulos: mediana del periodo y «N solucionados en el periodo»', () => {
    const text = (html: string) => html.replace(/<!-- -->/g, '')
    const html = text(render())
    expect(html).toContain('data-testid="director-resolucion-median"')
    expect(html).toMatch(/Mediana del periodo · [\d,]+ (días|h)/)
    expect(html).toMatch(/director-resolucion-count"[^>]*>17 solucionados en el periodo</)
    const one = [flow('2026-07-01', 1), flow('2026-08-01', 0)]
    expect(text(render({ flowBuckets: one, resolution: resolutionFixture(one) }))).toMatch(
      />1 solucionado en el periodo</,
    )
  })

  it('ayuda de la línea: mediana desde el registro hasta la solución', () => {
    const html = render()
    expect(html).toContain(
      'Mediana del tiempo transcurrido desde el registro hasta la solución de los problemas cerrados en cada periodo.',
    )
    expect(html).toContain('Son los mismos que Movimiento cuenta como Solucionados.')
    expect(html).not.toMatch(/SLA/)
  })

  it('tablas accesibles: buckets con dato y sin cierres; futuros fuera; seis rangos con %', () => {
    const html = render()
    expect(html).toContain('data-testid="director-resolucion-row-2026-08-01"')
    expect(html).toMatch(/director-resolucion-row-2026-08-01"><th scope="row">Agosto 2026<\/th><td>Sin cierres<\/td><td>0<\/td>/)
    expect(html).not.toContain('director-resolucion-row-2026-11-01')
    for (const key of ['lt-1d', '1-3d', '3-7d', '7-14d', '14-30d', '30d+']) {
      expect(html).toContain(`data-testid="director-tiempo-solucion-row-${key}"`)
    }
    expect(html).toMatch(/director-tiempo-solucion-row-lt-1d"><th scope="row">&lt; 1 día<\/th><td>\d+<\/td><td>\d+ %<\/td>/)
  })

  it('sin cierres en el periodo: UN mensaje para toda la lámina, sin línea ni barras', () => {
    const empty = FLOW.map((b) => (b.future ? b : flow(b.start, 0)))
    const html = render({ flowBuckets: empty, resolution: resolutionFixture(empty) })
    expect(html).toContain('data-empty="true"')
    expect(html).toMatch(/director-resolucion-empty"[^>]*>Sin problemas solucionados en este periodo</)
    expect(html).not.toContain('director-resolucion-trend-chart')
    expect(html).not.toContain('director-tiempo-solucion-chart')
  })

  it('cargando sin datos: aviso; error: mensaje visible', () => {
    expect(render({ resolution: null, flowBuckets: null, loading: true })).toContain(
      'data-testid="director-resolucion-loading"',
    )
    expect(render({ resolution: null, flowBuckets: null, error: 'HTTP 500' })).toContain(
      'No se pudo leer la resolución. HTTP 500',
    )
  })
})
