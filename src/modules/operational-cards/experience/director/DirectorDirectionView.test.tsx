import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DirectorDirectionView } from '@/modules/operational-cards/experience/director/DirectorDirectionView'
import { DirectorDirectionLayout } from '@/modules/operational-cards/experience/layouts/DirectorDirectionLayout'
import {
  kpiCoordinationFixture,
  kpiDirectionSnapshotFixture,
} from '@/modules/operational-cards/experience/director/director-kpi.fixture'

const here = dirname(fileURLToPath(import.meta.url))

function layoutSource(file: string): string {
  return readFileSync(resolve(here, '../layouts', file), 'utf8')
}

function shellSource(file: string): string {
  return readFileSync(resolve(here, '../shells', file), 'utf8')
}

describe('DirectorDirectionView · render', () => {
  it('muestra estado, activos, críticos, totales y 15 filas', () => {
    const rows = Array.from({ length: 15 }, (_unused, index) => {
      if (index === 0) {
        return kpiCoordinationFixture(0, {
          integrityStatus: 'CRITICO',
          lifePoints: 7,
          problems: {
            activeCount: 12,
            status: { open: 8, inProgress: 4 },
            severity: { critical: 2, high: 3, medium: 4, low: 3 },
          },
          dependencies: { incoming: 3, outgoing: 1 },
        })
      }
      if (index === 1) {
        return kpiCoordinationFixture(1, {
          integrityStatus: 'DESCONOCIDO',
          lifePoints: null,
        })
      }
      return kpiCoordinationFixture(index)
    })
    const snapshot = kpiDirectionSnapshotFixture({
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
      coordinations: rows,
    })
    const html = renderToStaticMarkup(
      <DirectorDirectionView
        status="success"
        snapshot={snapshot}
        error={null}
        selectedCode={null}
        onSelect={() => undefined}
        onRetry={() => undefined}
      />,
    )
    expect(html).toContain('data-testid="director-direction-status"')
    expect(html).toContain('data-status="ALERTA"')
    expect(html).toContain('data-testid="director-metric-active"')
    expect(html).toContain('>37<')
    expect(html).toContain('data-testid="director-metric-critical"')
    expect(html).toContain('>4<')
    expect(html).toContain('data-testid="director-metric-critical-coordinations"')
    expect(html).toContain('data-testid="director-status-distribution"')
    expect(html).toContain('data-testid="director-total-unknown"')
    expect(html).toContain('data-testid="director-row-coord-general"')
    expect(html.match(/data-testid="director-row-coord-/g)?.length).toBe(15)
    expect(html).toContain('data-testid="director-lives-coord-general"')
    expect(html).toContain('7 / 10')
    expect(html).toContain('data-testid="director-incoming-coord-general"')
    expect(html).toContain('data-testid="director-outgoing-coord-general"')
    expect(html).toContain('data-testid="director-row-status-coord-b2b"')
    expect(html).toContain('data-status="DESCONOCIDO"')
    expect(html).not.toContain('Peor coordinación')
    expect(html).not.toContain('operational-deck')
  })

  it('una coordinación sin problemas se muestra ESTABLE 0/0, no como error', () => {
    const snapshot = kpiDirectionSnapshotFixture({
      coordinations: [kpiCoordinationFixture(0)],
    })
    const html = renderToStaticMarkup(
      <DirectorDirectionView
        status="success"
        snapshot={snapshot}
        error={null}
        selectedCode={null}
        onSelect={() => undefined}
        onRetry={() => undefined}
      />,
    )
    expect(html).not.toContain('data-testid="director-kpi-error"')
    expect(html).toContain('data-testid="director-row-coord-general"')
    expect(html).toContain('data-status="ESTABLE"')
    expect(html).toContain('10 / 10')
  })

  it('loading conserva estructura con skeleton', () => {
    const html = renderToStaticMarkup(
      <DirectorDirectionView
        status="loading"
        snapshot={null}
        error={null}
        selectedCode={null}
        onSelect={() => undefined}
        onRetry={() => undefined}
      />,
    )
    expect(html).toContain('data-load-status="loading"')
    expect(html).toContain('data-testid="director-table-skeleton"')
    expect(html).toContain('Dirección de Operaciones')
    expect(html).not.toContain('data-testid="director-kpi-error"')
  })

  it('error muestra alerta y reintento', () => {
    const html = renderToStaticMarkup(
      <DirectorDirectionView
        status="error"
        snapshot={null}
        error="falló el contrato"
        selectedCode={null}
        onSelect={() => undefined}
        onRetry={() => undefined}
      />,
    )
    expect(html).toContain('data-testid="director-kpi-error"')
    expect(html).toContain('Reintentar')
  })

  it('el click preparado selecciona coordinación en el layout', () => {
    const html = renderToStaticMarkup(
      <DirectorDirectionLayout
        status="success"
        snapshot={kpiDirectionSnapshotFixture({
          coordinations: [kpiCoordinationFixture(0)],
        })}
        error={null}
        selectedCode="coord-general"
        onSelect={() => undefined}
        onRetry={() => undefined}
      />,
    )
    expect(html).toContain('data-shell-layout="director-direction"')
    expect(html).toContain('data-selected-coordination="coord-general"')
    expect(html).toContain('data-testid="director-coordination-preview"')
    expect(html).toContain('data-testid="director-preview-open"')
    expect(html).not.toContain('data-surface="operational-deck"')
    expect(html).not.toContain('direction-character')
  })
})

describe('aislamiento de shells de otros roles', () => {
  it('ANALISTA sigue montando DeckOperationalLayout', () => {
    const source = shellSource('AnalystOperationalShell.tsx')
    expect(source).toContain('DeckOperationalLayout')
    expect(source).toContain("experience=\"analyst\"")
    expect(source).not.toContain('DirectorDirectionLayout')
    expect(source).not.toContain('DirectorOperationalLayout')
    expect(source).not.toContain('useDirectorDirectionKpi')
  })

  it('ADMIN sigue montando DeckOperationalLayout', () => {
    const source = shellSource('AdminOperationalShell.tsx')
    expect(source).toContain('DeckOperationalLayout')
    expect(source).toContain("experience=\"admin\"")
    expect(source).not.toContain('DirectorDirectionLayout')
  })

  it('COORDINADOR sigue montando CoordinatorOperationalLayout', () => {
    const source = shellSource('CoordinatorOperationalShell.tsx')
    expect(source).toContain('CoordinatorOperationalLayout')
    expect(source).not.toContain('DirectorDirectionLayout')
    expect(source).not.toContain('DeckOperationalLayout')
  })

  it('DIRECTOR monta DirectorOperationalLayout con baraja y KPI, no la tabla home', () => {
    const source = shellSource('DirectorOperationalShell.tsx')
    expect(source).toContain('DirectorOperationalLayout')
    expect(source).toContain('useOperationalShellModel')
    expect(source).toContain('useDirectorKpi')
    expect(source).not.toContain('DirectorDirectionLayout')
    expect(source).not.toContain('DeckOperationalLayout')
  })

  it('DirectorOperationalLayout reutiliza baraja y problemas; no monta action panel', () => {
    const source = layoutSource('DirectorOperationalLayout.tsx')
    expect(source).toContain('OperationalCardExperience')
    expect(source).toContain('DirectorProblemPanel')
    expect(source).toContain('DirectorReadingPanel')
    expect(source).not.toContain(
      "from '@/modules/operational-cards/components/OperationalActionPanel'",
    )
    expect(source).not.toContain('MyReportsPanel')
    expect(source).not.toContain('DirectorDirectionView')
  })
})
