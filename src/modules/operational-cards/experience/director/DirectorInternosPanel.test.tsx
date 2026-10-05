import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DirectorInternosPanelView } from '@/modules/operational-cards/experience/director/DirectorInternosPanel'

const here = dirname(fileURLToPath(import.meta.url))

const items = [
  {
    category: {
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      code: 'internet',
      name: 'Internet',
      selectable: true,
    },
    value: 12,
    previousValue: 10,
    delta: 2,
  },
  {
    category: {
      id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      code: 'legacy-apps',
      name: 'Apps legacy',
      selectable: false,
    },
    value: 3,
    previousValue: 4,
    delta: -1,
  },
]

describe('DirectorInternosPanelView', () => {
  it('muestra dominante, deltas y breakdown', () => {
    const html = renderToStaticMarkup(
      <DirectorInternosPanelView
        metric="created"
        granularity="week"
        onMetricChange={() => undefined}
        onGranularityChange={() => undefined}
        selectedCategoryId={null}
        onSelectCategory={() => undefined}
        hasCoordination
        breakdownStatus="success"
        breakdownItems={items}
        breakdownError={null}
        incompletePeriod={false}
        evolutionStatus="idle"
        evolutionSeries={[]}
        evolutionError={null}
        selectedCategoryName={null}
      />,
    )
    expect(html).toContain('data-testid="director-internos-dominant"')
    expect(html).toContain('Categoría más frecuente')
    expect(html).toContain('Internet')
    expect(html).toContain('+2')
    expect(html).toContain('-1')
    expect(html).toContain('Histórica')
    expect(html).not.toContain('Recurrencia de falla')
  })

  it('marca selección y evolución', () => {
    const html = renderToStaticMarkup(
      <DirectorInternosPanelView
        metric="created"
        granularity="week"
        onMetricChange={() => undefined}
        onGranularityChange={() => undefined}
        selectedCategoryId={items[0].category.id}
        onSelectCategory={() => undefined}
        hasCoordination
        breakdownStatus="success"
        breakdownItems={items}
        breakdownError={null}
        incompletePeriod
        evolutionStatus="success"
        evolutionSeries={[
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
            value: 7,
          },
        ]}
        evolutionError={null}
        selectedCategoryName="Internet"
      />,
    )
    expect(html).toContain('▶')
    expect(html).toContain('Evolución de Internet')
    expect(html).toContain('Periodo actual incompleto')
    expect(html).toContain('data-testid="director-internos-evolution-chart"')
  })

  it('empty honesto sin INTERNAL', () => {
    const html = renderToStaticMarkup(
      <DirectorInternosPanelView
        metric="closed"
        granularity="month"
        onMetricChange={() => undefined}
        onGranularityChange={() => undefined}
        selectedCategoryId={null}
        onSelectCategory={() => undefined}
        hasCoordination
        breakdownStatus="success"
        breakdownItems={[]}
        breakdownError={null}
        incompletePeriod={false}
        evolutionStatus="idle"
        evolutionSeries={[]}
        evolutionError={null}
        selectedCategoryName={null}
      />,
    )
    expect(html).toContain('No hay problemas internos en este periodo.')
  })

  it('no acopla rol', () => {
    const panelSource = readFileSync(
      join(here, 'DirectorInternosPanel.tsx'),
      'utf8',
    )
    expect(panelSource).not.toMatch(/\broleCode\b|\brole\s*===\s*/)
  })
})
