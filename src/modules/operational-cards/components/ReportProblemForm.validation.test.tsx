// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReportProblemForm } from '@/modules/operational-cards/components/ReportProblemForm'
import { emptyReportDraft } from '@/modules/operational-cards/state/operationalCards.reducer'
import type {
  OperationalSubmissionState,
  ReportDraft,
  ReportFormKind,
} from '@/modules/operational-cards/types/operational-cards.state'

const IDLE: OperationalSubmissionState = {
  kind: null,
  status: 'idle',
  targetKey: null,
  errorMessage: null,
  confirmedButStale: false,
}

const CATEGORIES = [
  { id: 'cat-zoho', code: 'ZOHO', name: 'Zoho', description: null, isSelectable: true, icon: 'apps' },
]
const RESPONSIBLE = [{ id: 'uuid-neg', label: 'Negocios', code: 'coord-negocios' }]

describe('ReportProblemForm · validación propia y quién reporta', () => {
  let container: HTMLDivElement
  let root: Root
  const onSubmit = vi.fn()

  function Harness({
    kind = 'INTERNAL',
    ownCoordination,
    initial = {},
  }: {
    kind?: ReportFormKind
    ownCoordination?: boolean
    initial?: Partial<ReportDraft>
  }) {
    const [draft, setDraft] = useState<ReportDraft>({
      ...emptyReportDraft('2026-10-07T08:30'),
      ...initial,
    })
    return (
      <ReportProblemForm
        reportKind={kind}
        affectedLabel="Coordinación General"
        categories={CATEGORIES}
        categoriesError={null}
        responsibleOptions={RESPONSIBLE}
        draft={draft}
        submission={IDLE}
        onDraftChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        onReportKindChange={() => {}}
        onSubmit={onSubmit}
        maxOccurredAt="2026-10-07T23:59"
        ownCoordination={ownCoordination}
      />
    )
  }

  const render = (node: React.ReactNode) => act(() => root.render(node))
  const submit = () =>
    act(() => {
      container
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

  beforeEach(() => {
    onSubmit.mockReset()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('no usa el globo nativo del navegador', () => {
    render(<Harness />)
    expect(container.querySelector('form')?.noValidate).toBe(true)
  })

  it('sin datos no envía: muestra un mensaje por campo y enfoca el primero', () => {
    render(<Harness />)
    submit()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(container.querySelector('[data-testid="report-title-error"]')?.textContent).toBe(
      'Escriba un título.',
    )
    expect(container.querySelector('[data-testid="report-description-error"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="report-category-error"]')).not.toBeNull()
    const title = container.querySelector<HTMLInputElement>('[data-testid="report-title"]')!
    expect(title.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(title)
  })

  it('los mensajes no aparecen antes del primer intento de envío', () => {
    render(<Harness />)
    expect(container.querySelector('[data-testid="report-title-error"]')).toBeNull()
  })

  it('INTER sin responsable explica por qué no envía', () => {
    render(
      <Harness
        kind="INTER_COORDINATION"
        initial={{ title: 'T', description: 'D', affectedProcess: 'P', pendingDelivery: 'E' }}
      />,
    )
    submit()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Elija la coordinación que debe atender la dependencia.')
  })

  it('con todo completo envía', () => {
    render(<Harness initial={{ title: 'T', description: 'D', categoryId: 'cat-zoho' }} />)
    submit()
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('al ANALISTA no le habla de «mi coordinación»', () => {
    render(<Harness ownCoordination={false} />)
    expect(container.textContent).toContain('En la coordinación seleccionada')
    expect(container.textContent).toContain('Situación interna de Coordinación General')
    expect(container.textContent).not.toContain('En mi coordinación')
  })

  it('al COORDINADOR sí', () => {
    render(<Harness ownCoordination />)
    expect(container.textContent).toContain('En mi coordinación')
  })
})
