import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProblemRow } from '@/modules/operational-cards/components/ProblemRow'
import { MyReportsPanel } from '@/modules/operational-cards/components/MyReportsPanel'
import type { CoordinationProblem } from '@/modules/operational-cards/types/operational-cards.state'
import type { MyReport } from '@/modules/operational-cards/types/my-reports.types'

/**
 * Filas con marca lateral: el logo sustituye a la etiqueta de tipo, pero el
 * tipo y la coordinación siguen en una línea VISIBLE y en el nombre accesible.
 */

const LABELS = {
  'coord-saber-pro': 'Saber Pro',
  'coord-fabrica-contenidos': 'Fábrica de Contenidos',
}

function problem(patch: Partial<CoordinationProblem>): CoordinationProblem {
  return {
    id: 'p1',
    title: 'Guiones pendientes',
    severity: 'HIGH',
    status: 'OPEN',
    createdAt: '2026-09-01T10:00:00.000Z',
    reportKind: 'INTERNAL',
    coordinationCode: 'coord-saber-pro',
    affectedCoordinationCode: 'coord-saber-pro',
    ...patch,
  }
}

const noop = () => {}

describe('ProblemRow con marca lateral', () => {
  it('interno: logo propio, línea «Problema interno · …» y sin etiqueta antigua', () => {
    const html = renderToStaticMarkup(
      <ProblemRow
        problem={problem({})}
        selectedCoordinationCode="coord-saber-pro"
        labelByCode={LABELS}
      />,
    )
    expect(html).toContain('data-mark="logo"')
    expect(html).toContain('data-mark-code="coord-saber-pro"')
    expect(html).toContain('src="/iconos/display/IconoSaberPro.jpg"')
    // Visible: solo la coordinación; la relación completa queda en el tooltip.
    expect(html).toContain('title="Problema interno · Saber Pro">Saber Pro<')
    expect(html).not.toContain('problem-row-kind')
    expect(html).toContain('data-testid="problem-row-severity"')
    expect(html).toContain('data-testid="problem-row-status"')
  })

  it('dependencia vista desde la afectada: logo y nombre de la responsable', () => {
    const html = renderToStaticMarkup(
      <ProblemRow
        problem={problem({
          reportKind: 'INTER_COORDINATION',
          coordinationCode: 'coord-fabrica-contenidos',
          affectedCoordinationCode: 'coord-saber-pro',
        })}
        selectedCoordinationCode="coord-saber-pro"
        labelByCode={LABELS}
      />,
    )
    expect(html).toContain('data-mark-code="coord-fabrica-contenidos"')
    expect(html).toContain('Nos afecta desde Fábrica de Contenidos')
    expect(html).toContain(
      'aria-label="Guiones pendientes. Dependencia que nos afecta. Coordinación responsable: Fábrica de Contenidos. Severidad Alta. Abierto."',
    )
  })

  it('dependencia vista desde la responsable: logo y nombre de la afectada', () => {
    const html = renderToStaticMarkup(
      <ProblemRow
        problem={problem({
          reportKind: 'INTER_COORDINATION',
          coordinationCode: 'coord-fabrica-contenidos',
          affectedCoordinationCode: 'coord-saber-pro',
        })}
        selectedCoordinationCode="coord-fabrica-contenidos"
        labelByCode={LABELS}
      />,
    )
    expect(html).toContain('data-mark-code="coord-saber-pro"')
    expect(html).toContain('Debemos resolver para Saber Pro')
    expect(html).toContain('Coordinación afectada: Saber Pro')
  })

  it('code desconocido: marcador neutro, sin <img> ni logo de General', () => {
    const html = renderToStaticMarkup(
      <ProblemRow
        problem={problem({
          coordinationCode: 'coord-inexistente',
          affectedCoordinationCode: 'coord-inexistente',
        })}
        selectedCoordinationCode="coord-inexistente"
      />,
    )
    expect(html).toContain('data-mark="neutral"')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('IconoCoordGeneral')
    expect(html).toContain('Problema interno · coordinación no identificada')
  })

  it('la marca es decorativa: la fila entera sigue siendo el único botón', () => {
    const html = renderToStaticMarkup(
      <ProblemRow problem={problem({})} selectedCoordinationCode="coord-saber-pro" />,
    )
    expect(html.match(/<button/g)).toHaveLength(1)
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('alt=""')
  })

  it('ficha compacta: no muestra SLA aunque venga vencido o en riesgo', () => {
    for (const slaHealth of ['overdue', 'at_risk', 'on_track'] as const) {
      const html = renderToStaticMarkup(
        <ProblemRow
          problem={problem({ slaHealth })}
          selectedCoordinationCode="coord-saber-pro"
          labelByCode={LABELS}
        />,
      )
      expect(html).not.toContain('data-testid="problem-dossier-sla"')
      expect(html).not.toContain('SLA')
      expect(html).not.toContain('data-sla=')
    }
  })

  it('ficha dossier conserva severidad y estado separados', () => {
    const html = renderToStaticMarkup(
      <ProblemRow
        problem={problem({ severity: 'CRITICAL', status: 'IN_PROGRESS' })}
        selectedCoordinationCode="coord-saber-pro"
        labelByCode={LABELS}
      />,
    )
    expect(html).toContain(
      'class="problem-dossier problem-dossier--compact problem-row"',
    )
    expect(html).toContain('data-testid="problem-row-severity"')
    expect(html).toContain('Crítica')
    expect(html).toContain('data-testid="problem-row-status"')
    expect(html).toContain('En atención')
    expect(html).toContain('data-testid="problem-dossier-type"')
    expect(html).toContain('Interno')
    expect(html).toContain('data-stub-colored="true"')
  })

  it('talón compacto: logo de la coordinación, sin folio ni perforación', () => {
    const html = renderToStaticMarkup(
      <ProblemRow
        problem={problem({ id: 'abcd-1234' })}
        selectedCoordinationCode="coord-saber-pro"
        labelByCode={LABELS}
      />,
    )
    expect(html).not.toContain('problem-dossier__folio')
    expect(html).not.toContain('Nº')
    expect(html).not.toContain('problem-dossier__perforation')
    expect(html).toMatch(
      /data-testid="problem-dossier-stub"[^>]*><span class="problem-dossier__stub-mark problem-row__mark"/,
    )
  })

  it('un cerrado, si llega, se nombra y baja énfasis', () => {
    const html = renderToStaticMarkup(
      <ProblemRow
        problem={problem({
          status: 'CLOSED' as CoordinationProblem['status'],
        })}
        selectedCoordinationCode="coord-saber-pro"
        labelByCode={LABELS}
      />,
    )
    expect(html).toContain('data-closed="true"')
    expect(html).toContain('>Cerrado<')
    expect(html).toContain('Severidad Alta. Cerrado.')
  })

  it('dependencia muestra distintivo Dependencia y no Interno', () => {
    const html = renderToStaticMarkup(
      <ProblemRow
        problem={problem({
          reportKind: 'INTER_COORDINATION',
          coordinationCode: 'coord-fabrica-contenidos',
          affectedCoordinationCode: 'coord-saber-pro',
        })}
        selectedCoordinationCode="coord-saber-pro"
        labelByCode={LABELS}
      />,
    )
    expect(html).toContain('data-dossier-type="dependency"')
    expect(html).toContain('>Dependencia<')
    expect(html).not.toContain('>Interno<')
  })
})

function report(patch: Partial<MyReport>): MyReport {
  return {
    id: 'r1',
    title: 'Guiones pendientes',
    severity: 'CRITICAL',
    status: 'CLOSED',
    coordinationCode: 'coord-fabrica-contenidos',
    coordinationName: 'Coordinador Fábrica',
    affectedCoordinationCode: 'coord-saber-pro',
    affectedCoordinationName: 'Coordinador Saber Pro',
    reportKind: 'INTER_COORDINATION',
    createdAt: '2026-09-01T10:00:00.000Z',
    canResolve: false,
    ...patch,
  }
}

function myReportsHtml(items: MyReport[]): string {
  return renderToStaticMarkup(
    <MyReportsPanel
      myReports={{
        status: 'ready',
        items,
        total: items.length,
        page: 1,
        loadingMore: false,
        errorMessage: null,
      }}
      selectedProblemId={null}
      onSelect={noop}
      onLoadMore={noop}
      labelByCode={LABELS}
    />,
  )
}

describe('«Mis reportes» con marca lateral', () => {
  it('dependencia: logo de la RESPONSABLE, identificada como tal', () => {
    const html = myReportsHtml([report({})])
    expect(html).toContain('data-mark-code="coord-fabrica-contenidos"')
    expect(html).toContain(
      'Afectada: Saber Pro · Responsable: Fábrica de Contenidos',
    )
    expect(html).toContain(
      'aria-label="Guiones pendientes. Dependencia entre coordinaciones. Coordinación responsable: Fábrica de Contenidos. Severidad Crítica. Cerrado."',
    )
    expect(html).not.toContain('my-report-kind')
  })

  it('histórico sin coordinación: marcador neutro y «Sin coordinación»', () => {
    const html = myReportsHtml([
      report({
        reportKind: 'INTERNAL',
        coordinationCode: null,
        coordinationName: null,
        affectedCoordinationCode: null,
        affectedCoordinationName: null,
      }),
    ])
    expect(html).toContain('data-mark="neutral"')
    expect(html).toContain('Problema interno · Sin coordinación')
    expect(html).not.toContain('IconoCoordGeneral')
  })

  it('histórico cerrado marca data-closed y baja énfasis semántico', () => {
    const html = myReportsHtml([
      report({ status: 'CLOSED', severity: 'CRITICAL' }),
    ])
    expect(html).toContain('data-closed="true"')
    // «Mis reportes» no hereda la variante compacta: conserva folio.
    expect(html).toContain('class="problem-dossier my-reports__row"')
    expect(html).toContain('problem-dossier__folio')
    expect(html).toContain('Cerrado')
    expect(html).toContain('Crítica')
    expect(html).not.toContain('data-testid="problem-dossier-sla"')
  })
})
