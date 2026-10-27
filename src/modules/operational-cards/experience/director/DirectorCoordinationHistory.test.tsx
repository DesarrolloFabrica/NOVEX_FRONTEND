import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DirectorCoordinationHistoryView } from '@/modules/operational-cards/experience/director/DirectorCoordinationHistory'

const here = dirname(fileURLToPath(import.meta.url))

describe('DirectorCoordinationHistoryView', () => {
  it('muestra selectores de métrica y periodo', () => {
    const html = renderToStaticMarkup(
      <DirectorCoordinationHistoryView
        metric="backlog"
        granularity="week"
        onMetricChange={() => undefined}
        onGranularityChange={() => undefined}
        status="loading"
        series={[]}
        error={null}
        hasCoordination
      />,
    )
    expect(html).toContain('data-testid="director-coordination-history"')
    expect(html).toContain('data-metric="backlog"')
    expect(html).toContain('data-granularity="week"')
    expect(html).toContain('data-testid="director-history-metric-backlog"')
    expect(html).toContain('data-testid="director-history-metric-created"')
    expect(html).toContain('data-testid="director-history-metric-closed"')
    expect(html).toContain('data-testid="director-history-period-week"')
    expect(html).toContain('data-testid="director-history-period-month"')
    expect(html).toContain('data-testid="director-history-period-cycle"')
    expect(html).toContain('data-testid="director-history-loading"')
  })

  it('muestra error', () => {
    const html = renderToStaticMarkup(
      <DirectorCoordinationHistoryView
        metric="created"
        granularity="month"
        onMetricChange={() => undefined}
        onGranularityChange={() => undefined}
        status="error"
        series={[]}
        error="timeout"
        hasCoordination
      />,
    )
    expect(html).toContain('data-testid="director-history-error"')
    expect(html).toContain('timeout')
    expect(html).toContain('data-metric="created"')
    expect(html).toContain('data-granularity="month"')
  })

  it('muestra vacío honesto sin inventar tendencia', () => {
    const html = renderToStaticMarkup(
      <DirectorCoordinationHistoryView
        metric="backlog"
        granularity="cycle"
        onMetricChange={() => undefined}
        onGranularityChange={() => undefined}
        status="success"
        series={[
          {
            start: '2026-01-01',
            end: '2026-06-30',
            label: 'Ciclo 1',
            value: 0,
          },
          {
            start: '2026-07-01',
            end: '2026-12-31',
            label: 'Ciclo 2',
            value: 0,
          },
        ]}
        error={null}
        hasCoordination
      />,
    )
    expect(html).toContain('data-testid="director-history-empty"')
    expect(html).toContain('No hay suficientes datos en este periodo.')
    expect(html).not.toContain('%')
    expect(html).not.toContain('mejorando')
  })

  it('dibuja step-line para backlog y barras para creados', () => {
    const series = [
      {
        start: '2026-01-12',
        end: '2026-01-18',
        label: 'Semana 1',
        value: 3,
      },
      {
        start: '2026-01-19',
        end: '2026-01-25',
        label: 'Semana 2',
        value: 5,
      },
    ]
    const backlog = renderToStaticMarkup(
      <DirectorCoordinationHistoryView
        metric="backlog"
        granularity="week"
        onMetricChange={() => undefined}
        onGranularityChange={() => undefined}
        status="success"
        series={series}
        error={null}
        hasCoordination
      />,
    )
    expect(backlog).toContain('data-kind="step"')
    expect(backlog).toContain('director-history__line-svg')
    expect(backlog).toContain('director-history__step')
    expect(backlog).toContain('data-mark="current"')

    const created = renderToStaticMarkup(
      <DirectorCoordinationHistoryView
        metric="created"
        granularity="week"
        onMetricChange={() => undefined}
        onGranularityChange={() => undefined}
        status="success"
        series={series}
        error={null}
        hasCoordination
      />,
    )
    expect(created).toContain('data-kind="bars"')
    expect(created).toContain('director-history__bars')
  })

  it('sin coordinación no asume rol DIRECTOR en el componente', () => {
    const html = renderToStaticMarkup(
      <DirectorCoordinationHistoryView
        metric="closed"
        granularity="week"
        onMetricChange={() => undefined}
        onGranularityChange={() => undefined}
        status="idle"
        series={[]}
        error={null}
        hasCoordination={false}
      />,
    )
    expect(html).toContain('Selecciona una coordinación')
    const source = readFileSync(
      join(here, 'DirectorCoordinationHistory.tsx'),
      'utf8',
    )
    expect(source).not.toMatch(/\broleCode\b|\brole\s*===\s*/)
    expect(source).toContain('El shell decide quién lo monta')
  })
})
