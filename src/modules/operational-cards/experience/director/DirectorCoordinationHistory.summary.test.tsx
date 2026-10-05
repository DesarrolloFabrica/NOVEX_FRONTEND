import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DirectorCoordinationHistoryView } from '@/modules/operational-cards/experience/director/DirectorCoordinationHistory'

describe('DirectorCoordinationHistoryView resumen compacto', () => {
  it('resume backlog con jerarquía showcard y delta', () => {
    const html = renderToStaticMarkup(
      <DirectorCoordinationHistoryView
        metric="backlog"
        granularity="week"
        onMetricChange={() => undefined}
        onGranularityChange={() => undefined}
        status="success"
        series={[
          {
            start: '2026-01-05',
            end: '2026-01-11',
            label: 'Semana A',
            value: 0,
          },
          {
            start: '2026-01-12',
            end: '2026-01-18',
            label: 'Semana B',
            value: 5,
          },
          {
            start: '2026-01-19',
            end: '2026-01-25',
            label: 'Semana C',
            value: 6,
          },
        ]}
        error={null}
        hasCoordination
        layout="embedded"
      />,
    )
    expect(html).toContain('data-testid="director-history-summary"')
    expect(html).toContain('>Backlog<')
    expect(html).toContain('6 ahora')
    expect(html).toContain('0 al inicio')
    expect(html).toContain('+1 vs periodo anterior')
    expect(html).toContain('data-kind="step"')
    expect(html).not.toContain('>Mínimo<')
    expect(html).not.toContain('>Máximo<')
  })

  it('resume presentados sin lenguaje de desempeño', () => {
    const html = renderToStaticMarkup(
      <DirectorCoordinationHistoryView
        metric="created"
        granularity="week"
        onMetricChange={() => undefined}
        onGranularityChange={() => undefined}
        status="success"
        series={[
          {
            start: '2026-01-12',
            end: '2026-01-18',
            label: 'Semana 1',
            value: 2,
          },
          {
            start: '2026-01-19',
            end: '2026-01-25',
            label: 'Semana 2',
            value: 4,
          },
        ]}
        error={null}
        hasCoordination
        layout="embedded"
      />,
    )
    expect(html).toContain('6 en el periodo')
    expect(html).toContain('+2 vs periodo anterior')
    expect(html).not.toContain('mejoró')
    expect(html).not.toContain('empeoró')
  })

  it('usa sin cambio cuando el delta es 0', () => {
    const html = renderToStaticMarkup(
      <DirectorCoordinationHistoryView
        metric="closed"
        granularity="week"
        onMetricChange={() => undefined}
        onGranularityChange={() => undefined}
        status="success"
        series={[
          {
            start: '2026-01-12',
            end: '2026-01-18',
            label: 'Semana 1',
            value: 4,
          },
          {
            start: '2026-01-19',
            end: '2026-01-25',
            label: 'Semana 2',
            value: 4,
          },
        ]}
        error={null}
        hasCoordination
        layout="embedded"
      />,
    )
    expect(html).toContain('8 en el periodo')
    expect(html).toContain('sin cambio vs anterior')
    expect(html).not.toContain('+0')
  })

  it('suaviza la nota de periodo incompleto', () => {
    const html = renderToStaticMarkup(
      <DirectorCoordinationHistoryView
        metric="backlog"
        granularity="week"
        onMetricChange={() => undefined}
        onGranularityChange={() => undefined}
        status="success"
        series={[
          {
            start: '2026-01-05',
            end: '2026-01-11',
            label: 'Semana A',
            value: 1,
          },
          {
            start: '2026-01-12',
            end: '2026-01-18',
            label: 'Semana B',
            value: 2,
          },
        ]}
        error={null}
        hasCoordination
        layout="embedded"
      />,
    )
    expect(html).toContain('periodo actual aún en curso')
    expect(html).not.toContain('PERIODO ACTUAL INCOMPLETO')
  })
})
