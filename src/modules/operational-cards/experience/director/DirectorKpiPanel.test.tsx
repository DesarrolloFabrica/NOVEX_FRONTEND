import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DirectorKpiPanel } from '@/modules/operational-cards/experience/director/DirectorKpiPanel'
import {
  kpiCoordinationFixture,
  kpiDirectionSnapshotFixture,
} from '@/modules/operational-cards/experience/director/director-kpi.fixture'

describe('DirectorKpiPanel', () => {
  it('sin selección muestra bloques de Dirección sin repetir vidas', () => {
    const html = renderToStaticMarkup(
      <DirectorKpiPanel
        selected={false}
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
    expect(html).toContain('data-scope="direction"')
    expect(html).toContain('>37<')
    expect(html).toContain('data-testid="director-kpi-critical-coordinations"')
    expect(html).toContain('data-testid="director-status-distribution"')
    expect(html).not.toContain('data-testid="director-kpi-lives"')
  })

  it('con coordinación muestra severidad segmentada, ciclo y relaciones', () => {
    const html = renderToStaticMarkup(
      <DirectorKpiPanel
        selected
        directionStatus="success"
        direction={kpiDirectionSnapshotFixture()}
        directionError={null}
        onRetryDirection={() => undefined}
        coordinationStatus="success"
        coordination={kpiCoordinationFixture(0, {
          integrityStatus: 'CRITICO',
          lifePoints: 7,
          problems: {
            activeCount: 12,
            status: { open: 8, inProgress: 4 },
            severity: { critical: 2, high: 3, medium: 4, low: 3 },
          },
          dependencies: { incoming: 3, outgoing: 1 },
        })}
        coordinationError={null}
      />,
    )
    expect(html).toContain('data-scope="coordination"')
    expect(html).toContain('data-testid="director-kpi-severity"')
    expect(html).toContain('director-kpi-severity__segment')
    expect(html).toContain('L 3')
    expect(html).toContain('C 2')
    expect(html).toContain('data-severity="critical"')
    expect(html).toContain('>Ciclo<')
    expect(html).toContain('Abierto')
    expect(html).toContain('En atención')
    expect(html).toContain('Depende de')
    expect(html).toContain('Compromisos')
    expect(html).toContain('director-kpi-severity__rail')
    expect(html).toContain('data-testid="director-kpi-status-split"')
    expect(html).toContain('data-testid="director-kpi-io"')
    expect(html).not.toContain('data-testid="director-kpi-lives"')
    expect(html).not.toContain('OPEN 8')
  })

  it('en section=ahora no repite el bloque de problemas activos', () => {
    const html = renderToStaticMarkup(
      <DirectorKpiPanel
        selected
        section="ahora"
        directionStatus="success"
        direction={kpiDirectionSnapshotFixture()}
        directionError={null}
        onRetryDirection={() => undefined}
        coordinationStatus="success"
        coordination={kpiCoordinationFixture(0, {
          problems: {
            activeCount: 6,
            status: { open: 3, inProgress: 3 },
            severity: { critical: 0, high: 5, medium: 0, low: 1 },
          },
        })}
        coordinationError={null}
      />,
    )
    expect(html).toContain('data-section="ahora"')
    expect(html).toContain('data-testid="director-kpi-severity"')
    expect(html).not.toContain('data-testid="director-kpi-problems"')
  })
})
