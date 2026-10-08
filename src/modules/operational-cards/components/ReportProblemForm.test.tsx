import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ReportProblemForm } from '@/modules/operational-cards/components/ReportProblemForm'
import { emptyReportDraft } from '@/modules/operational-cards/state/operationalCards.reducer'
import type { OperationalSubmissionState } from '@/modules/operational-cards/types/operational-cards.state'

const IDLE: OperationalSubmissionState = {
  kind: null,
  status: 'idle',
  targetKey: null,
  errorMessage: null,
  confirmedButStale: false,
}

function render(reportKind: 'INTERNAL' | 'INTER_COORDINATION') {
  return renderToStaticMarkup(
    <ReportProblemForm
      reportKind={reportKind}
      affectedLabel="Fábrica de Contenidos"
      categories={[
        {
          id: 'cat-1',
          code: 'INTERNET',
          name: 'Internet',
          description: null,
          isSelectable: true,
          icon: 'internet',
        },
      ]}
      categoriesError={null}
      responsibleOptions={[{ id: 'c2', label: 'Ingenierías', code: 'coord-ingenierias' }]}
      draft={emptyReportDraft('2026-10-07T08:30')}
      submission={IDLE}
      onDraftChange={() => undefined}
      onSubmit={() => undefined}
      maxOccurredAt="2026-10-07T12:00"
    />,
  )
}

describe('ReportProblemForm INTERNAL', () => {
  it('ya no ofrece «Destino»: se registra en la carta', () => {
    const html = render('INTERNAL')
    expect(html).not.toContain('report-internal-destination')
    expect(html).toContain('Se registrará en <strong>Fábrica de Contenidos</strong>')
  })

  it('pide los campos en orden y la afectación inicial es opcional', () => {
    const html = render('INTERNAL')
    const order = [
      'report-title',
      'report-description',
      'report-category',
      'report-severity-',
      'report-occurred-at',
      'report-initial-consequence',
    ].map((id) => html.indexOf(`data-testid="${id}`))
    expect(order.every((index) => index >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)

    const tag = html.match(
      /<textarea[^>]*data-testid="report-initial-consequence"[^>]*>/,
    )?.[0]
    expect(tag).toBeDefined()
    expect(tag).not.toContain('required')
    expect(html).toContain('Afectación inicial (opcional)')
    expect(html).toContain(
      '¿Qué se retrasó, bloqueó o no se pudo hacer como consecuencia de',
    )
  })

  it('usa el copy de severidad actual y distingue descripción de afectación', () => {
    const html = render('INTERNAL')
    expect(html).toContain('¿Qué tan grave es ahora?')
    expect(html).toContain('Qué está fallando.')
    expect(html).not.toContain('generando su análisis')
  })
})

describe('ReportProblemForm INTER', () => {
  it('no pide afectación inicial (solo aplica a INTERNAL)', () => {
    const html = render('INTER_COORDINATION')
    expect(html).not.toContain('report-initial-consequence')
  })
})
