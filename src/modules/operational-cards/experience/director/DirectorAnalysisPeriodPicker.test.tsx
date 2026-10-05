import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { buildCurrentWeekPeriod } from '@/modules/operational-cards/domain/analysis-period'
import { DirectorAnalysisPeriodPicker } from '@/modules/operational-cards/experience/director/DirectorAnalysisPeriodPicker'

const here = dirname(fileURLToPath(import.meta.url))

describe('DirectorAnalysisPeriodPicker progressive disclosure', () => {
  it('cerrado solo muestra rango y status, sin panel ni tabs', () => {
    const period = buildCurrentWeekPeriod(
      new Date('2026-10-05T12:00:00-05:00'),
    )
    const html = renderToStaticMarkup(
      <DirectorAnalysisPeriodPicker
        period={period}
        onChange={() => undefined}
      />,
    )
    expect(html).toContain('Periodo analizado')
    expect(html).toContain('data-testid="director-analysis-period-range"')
    expect(html).toContain('Semana actual · En curso')
    expect(html).not.toContain('data-testid="director-analysis-period-panel"')
    expect(html).not.toContain('data-testid="director-analysis-period-tab-week"')
    expect(html).not.toContain('SEMANA | MES | CICLO')
  })

  it('implementa drill-down ciclo → mes → semana con usar/profundizar', () => {
    const source = readFileSync(
      join(here, 'DirectorAnalysisPeriodPicker.tsx'),
      'utf8',
    )
    expect(source).toContain("level: 'cycle'")
    expect(source).toContain("level: 'month'")
    expect(source).toContain("level: 'week'")
    expect(source).toContain('Usar ciclo')
    expect(source).toContain('Meses →')
    expect(source).toContain('Usar mes')
    expect(source).toContain('Semanas →')
    expect(source).toContain('Volver a semana actual')
    expect(source).toContain('director-analysis-period-crumb')
    expect(source).not.toContain('director-analysis-period-tab-')
    expect(source).toContain('isPeriodFullyFuture')
    expect(source).toContain('listWeeksInBrowseMonth')
  })
})
