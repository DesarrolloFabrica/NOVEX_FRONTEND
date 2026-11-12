// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReportProblemForm } from '@/modules/operational-cards/components/ReportProblemForm'
import { orderReportCategories } from '@/modules/operational-cards/data/reportCategories'
import { emptyReportDraft } from '@/modules/operational-cards/state/operationalCards.reducer'
import type {
  OperationalSubmissionState,
  ReportDraft,
  ReportFormKind,
} from '@/modules/operational-cards/types/operational-cards.state'
import type { IncidentCategorySummary } from '@/modules/situations/types/situation.types'

const IDLE: OperationalSubmissionState = {
  kind: null,
  status: 'idle',
  targetKey: null,
  errorMessage: null,
  confirmedButStale: false,
}

const category = (id: string, code: string, name: string): IncidentCategorySummary => ({
  id,
  code,
  name,
  description: null,
  isSelectable: true,
  icon: 'apps',
})

// El servidor anterior ordena por nombre: «Otra» llegaría entre las demás.
const CATEGORIES = orderReportCategories([
  category('cat-internet', 'INTERNET', 'Internet'),
  category('cat-otra', 'OTRA', 'Otra'),
  category('cat-zoho', 'ZOHO', 'Zoho'),
])

const RESPONSIBLE = [
  { id: 'uuid-neg', label: 'Negocios', code: 'coord-negocios' },
  { id: 'uuid-ing', label: 'Ingenierías', code: 'coord-ingenierias' },
]
const RELATED = [
  ...RESPONSIBLE,
  { id: 'uuid-b2b', label: 'B2B', code: 'coord-b2b' },
]

function setValue(element: HTMLInputElement | HTMLSelectElement, value: string) {
  const prototype = Object.getPrototypeOf(element)
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('ReportProblemForm · relacionadas y categoría «Otra»', () => {
  let container: HTMLDivElement
  let root: Root
  const onSubmit = vi.fn()
  let latestDraft: ReportDraft

  function Harness({
    kind = 'INTERNAL',
    initial = {},
  }: {
    kind?: ReportFormKind
    initial?: Partial<ReportDraft>
  }) {
    const [draft, setDraft] = useState<ReportDraft>({
      ...emptyReportDraft('2026-10-07T08:30'),
      title: 'Préstamo de libros caído',
      description: 'No se puede registrar préstamos.',
      ...initial,
    })
    latestDraft = draft
    return (
      <ReportProblemForm
        reportKind={kind}
        affectedLabel="Fábrica de Contenidos"
        categories={CATEGORIES}
        categoriesError={null}
        responsibleOptions={RESPONSIBLE}
        relatedOptions={RELATED}
        draft={draft}
        submission={IDLE}
        onDraftChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
        onSubmit={onSubmit}
        maxOccurredAt="2026-10-07T12:00"
      />
    )
  }

  const $ = <T extends Element = HTMLElement>(testId: string) =>
    container.querySelector<T & Element>(`[data-testid="${testId}"]`)
  const submit = () =>
    act(() => {
      $('report-form')!.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
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

  it('«Otra» va al final de las categorías', () => {
    act(() => root.render(<Harness />))
    const options = [
      ...$<HTMLSelectElement>('report-category')!.options,
    ].map((option) => option.textContent)
    expect(options).toEqual(['Seleccione…', 'Internet', 'Zoho', 'Otra'])
  })

  it('el campo de categoría escrita aparece solo con «Otra» y recibe el foco', () => {
    act(() => root.render(<Harness />))
    expect($('report-category-other')).toBeNull()

    act(() => setValue($<HTMLSelectElement>('report-category')!, 'cat-otra'))
    const other = $<HTMLInputElement>('report-category-other')!
    expect(other).not.toBeNull()
    expect(other.getAttribute('aria-required')).toBe('true')
    expect(other.maxLength).toBe(120)
    expect(document.activeElement).toBe(other)

    act(() => setValue($<HTMLSelectElement>('report-category')!, 'cat-zoho'))
    expect($('report-category-other')).toBeNull()
  })

  it('no envía «Otra» vacía: error inline, aria-invalid y foco en el campo', () => {
    act(() => root.render(<Harness initial={{ categoryId: 'cat-otra' }} />))
    expect($('report-category-other-error')).toBeNull()

    submit()

    expect(onSubmit).not.toHaveBeenCalled()
    const error = $('report-category-other-error')!
    expect(error.getAttribute('role')).toBe('alert')
    expect(error.textContent).toBe('Escriba la categoría de la situación.')
    const other = $<HTMLInputElement>('report-category-other')!
    expect(other.getAttribute('aria-invalid')).toBe('true')
    expect(other.getAttribute('aria-describedby')).toContain(error.id)
    expect(document.activeElement).toBe(other)
  })

  it('exige al menos 3 caracteres reales y luego permite enviar', () => {
    act(() => root.render(<Harness initial={{ categoryId: 'cat-otra' }} />))
    const other = $<HTMLInputElement>('report-category-other')!

    act(() => setValue(other, '  ab  '))
    act(() => {
      other.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect($('report-category-other-error')?.textContent).toBe(
      'Use al menos 3 caracteres.',
    )
    submit()
    expect(onSubmit).not.toHaveBeenCalled()

    act(() => setValue(other, 'Biblioteca'))
    expect($('report-category-other-error')).toBeNull()
    expect($('report-category-other-count')?.textContent).toBe('10/120')
    submit()
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(latestDraft.categoryOtherText).toBe('Biblioteca')
  })

  it('una categoría del catálogo se envía sin pedir texto propio', () => {
    act(() => root.render(<Harness initial={{ categoryId: 'cat-internet' }} />))
    submit()
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('INTERNAL: relaciona varias coordinaciones en el paso «¿Dónde ocurre?»', () => {
    act(() => root.render(<Harness />))
    const picker = $('report-related')!
    expect(picker.closest('[data-step="1"]')).not.toBeNull()

    const search = $<HTMLInputElement>('report-related-search')!
    act(() => search.click())
    const offered = [
      ...container.querySelectorAll<HTMLElement>('[data-testid="report-related-option"]'),
    ].map((option) => option.dataset.optionId)
    expect(offered).toEqual(['uuid-neg', 'uuid-ing', 'uuid-b2b'])
  })

  it('INTER: la responsable no se ofrece y, si ya estaba relacionada, se retira', () => {
    act(() =>
      root.render(
        <Harness
          kind="INTER_COORDINATION"
          initial={{
            responsibleCoordinationId: 'uuid-neg',
            relatedCoordinationIds: ['uuid-neg', 'uuid-b2b'],
          }}
        />,
      ),
    )
    // La depuración deja fuera a la responsable.
    expect(latestDraft.relatedCoordinationIds).toEqual(['uuid-b2b'])
    act(() => $<HTMLInputElement>('report-related-search')!.click())
    const offered = [
      ...container.querySelectorAll<HTMLElement>('[data-testid="report-related-option"]'),
    ].map((option) => option.dataset.optionId)
    expect(offered).toEqual(['uuid-ing'])
    // INTER no tiene categoría.
    expect($('report-category')).toBeNull()
  })

  it('descarta relacionadas que ya no son opción (cambio de carta)', () => {
    act(() =>
      root.render(
        <Harness initial={{ relatedCoordinationIds: ['uuid-gone', 'uuid-ing'] }} />,
      ),
    )
    expect(latestDraft.relatedCoordinationIds).toEqual(['uuid-ing'])
  })
})
