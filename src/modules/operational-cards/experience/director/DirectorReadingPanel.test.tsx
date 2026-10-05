import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DirectorReadingPanel } from '@/modules/operational-cards/experience/director/DirectorReadingPanel'
import { kpiDirectionSnapshotFixture } from '@/modules/operational-cards/experience/director/director-kpi.fixture'

const here = dirname(fileURLToPath(import.meta.url))

describe('DirectorReadingPanel', () => {
  it('abre ESTADO por defecto sin tab HISTÓRICO', () => {
    const html = renderToStaticMarkup(
      <DirectorReadingPanel
        selectedCoordination={null}
        directionStatus="success"
        direction={kpiDirectionSnapshotFixture({
          directionStatus: 'ALERTA',
          problems: {
            activeCount: 37,
            status: { open: 20, inProgress: 17 },
            severity: { critical: 4, high: 0, medium: 0, low: 0 },
          },
          coordinationStatusTotals: {
            critical: 2,
            alert: 3,
            stable: 9,
            unknown: 1,
          },
        })}
        directionError={null}
        onRetryDirection={() => undefined}
        coordinationStatus="success"
        coordination={null}
        coordinationError={null}
      />,
    )
    expect(html).toContain('data-testid="director-reading-body"')
    expect(html).toContain('data-testid="director-reading-context"')
    expect(html).toContain('data-mode="state"')
    expect(html).toContain('data-testid="director-reading-mode-state"')
    expect(html).toContain('data-testid="director-estado-panel"')
    expect(html).toContain('Periodo analizado')
    expect(html).toContain('Estado actual')
    expect(html).toContain('Severidad de los')
    expect(html).toContain('data-testid="director-estado-evolucion"')
    expect(html).toContain('data-testid="director-coordination-history"')
    expect(html).toContain('data-view="pendientes"')
    expect(html).toContain('data-testid="director-analysis-period"')
    expect(html).toContain('data-period-kind="week"')
    expect(html).not.toContain('data-testid="director-history-period-week"')
    expect(html).not.toContain('data-testid="director-estado-period-week"')
    expect(html).toContain('data-testid="director-reading-mode-internos"')
    expect(html).toContain('data-testid="director-reading-mode-dependencias"')
    expect(html).toContain('data-testid="director-reading-mode-aprendizajes"')
    expect(html).not.toContain('data-testid="director-reading-mode-historic"')
    expect(html).not.toContain('data-testid="director-reading-mode-actual"')
    expect(html).not.toContain('Composición actual')
    expect(html).not.toContain('¿Por qué?')
    expect(html).toContain('37')
    expect(html).toContain('activos')
  })

  it('expone body scrollable y reset de scroll en el módulo', () => {
    const source = readFileSync(
      join(here, 'DirectorReadingPanel.tsx'),
      'utf8',
    )
    expect(source).toContain('director-reading-body')
    expect(source).toContain('scrollTop = 0')
    expect(source).toContain('data-scroll-more')
  })

  it('conserva INTERNOS, DEPENDENCIAS y APRENDIZAJES', () => {
    const source = readFileSync(
      join(here, 'DirectorReadingPanel.tsx'),
      'utf8',
    )
    expect(source).toContain('DirectorEstadoPanel')
    expect(source).toContain('DirectorInternosPanel')
    expect(source).toContain('DirectorDependenciasPanel')
    expect(source).toContain('Últimos aprendizajes')
    expect(source).not.toContain("'historic'")
    expect(source).not.toContain("'actual'")
  })
})
