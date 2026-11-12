// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RelatedCoordinationsPicker } from '@/modules/operational-cards/components/RelatedCoordinationsPicker'
import {
  availableRelatedOptions,
  describeRelatedCount,
  sanitizeRelatedIds,
  type RelatedPickerOption,
} from '@/modules/operational-cards/data/relatedCoordinationsPicker'

const OPTIONS: RelatedPickerOption[] = [
  { id: 'uuid-fab', label: 'Fábrica de Contenidos', code: 'coord-fabrica-contenidos' },
  { id: 'uuid-neg', label: 'Negocios', code: 'coord-negocios' },
  { id: 'uuid-b2b', label: 'B2B', code: 'coord-b2b' },
  { id: 'uuid-ing', label: 'Ingenierías', code: 'coord-ingenierias' },
]

describe('relatedCoordinationsPicker helpers', () => {
  it('filtra sin tildes ni mayúsculas y por código', () => {
    const ids = (query: string) =>
      availableRelatedOptions(OPTIONS, [], [], query).map((option) => option.id)
    expect(ids('fabrica')).toEqual(['uuid-fab'])
    expect(ids('INGENIER')).toEqual(['uuid-ing'])
    expect(ids('coord-b2b')).toEqual(['uuid-b2b'])
    expect(ids('')).toHaveLength(4)
  })

  it('no ofrece las ya elegidas ni las excluidas (propia, responsable)', () => {
    const ids = availableRelatedOptions(OPTIONS, ['uuid-neg'], ['uuid-b2b'], '')
      .map((option) => option.id)
    expect(ids).toEqual(['uuid-fab', 'uuid-ing'])
  })

  it('sanea la selección conservando el orden de elección', () => {
    expect(
      sanitizeRelatedIds(
        ['uuid-neg', '', 'uuid-fab', 'uuid-neg', 'uuid-b2b', 'uuid-gone'],
        ['uuid-b2b', null],
        new Set(OPTIONS.map((option) => option.id)),
      ),
    ).toEqual(['uuid-neg', 'uuid-fab'])
  })

  it('anuncia el total en español', () => {
    expect(describeRelatedCount(0)).toBe('Sin coordinaciones relacionadas.')
    expect(describeRelatedCount(1)).toBe('1 coordinación relacionada seleccionada.')
    expect(describeRelatedCount(3)).toBe('3 coordinaciones relacionadas seleccionadas.')
  })
})

function setInputValue(element: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )
  descriptor?.set?.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

function key(element: Element, name: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: name,
    bubbles: true,
    cancelable: true,
  })
  act(() => {
    element.dispatchEvent(event)
  })
  return event
}

describe('RelatedCoordinationsPicker (interacción)', () => {
  let container: HTMLDivElement
  let root: Root
  const onChangeSpy = vi.fn()

  function Harness({
    initial = [],
    excludedIds = [],
  }: {
    initial?: string[]
    excludedIds?: string[]
  }) {
    const [value, setValue] = useState<string[]>(initial)
    return (
      <RelatedCoordinationsPicker
        options={OPTIONS}
        value={value}
        excludedIds={excludedIds}
        onChange={(next) => {
          onChangeSpy(next)
          setValue(next)
        }}
      />
    )
  }

  const $ = <T extends Element = HTMLElement>(testId: string) =>
    container.querySelector<T & Element>(`[data-testid="${testId}"]`)
  const $$ = (testId: string) =>
    [...container.querySelectorAll<HTMLElement>(`[data-testid="${testId}"]`)]
  const input = () => $<HTMLInputElement>('report-related-search')!
  const chipIds = () => $$('report-related-chip').map((chip) => chip.dataset.optionId)

  beforeEach(() => {
    onChangeSpy.mockReset()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('es un combobox accesible, con la lista cerrada al inicio', () => {
    act(() => root.render(<Harness />))
    const combo = input()
    expect(combo.getAttribute('role')).toBe('combobox')
    expect(combo.getAttribute('aria-expanded')).toBe('false')
    const list = $('report-related-list')!
    expect(combo.getAttribute('aria-controls')).toBe(list.id)
    expect(list.getAttribute('role')).toBe('listbox')
    expect(list.hidden).toBe(true)
    // El rótulo visible nombra el buscador.
    const label = container.querySelector(`label[for="${combo.id}"]`)
    expect(label?.textContent).toBe('Coordinaciones relacionadas')
  })

  it('busca, añade varias con Enter y no repite ni ofrece las excluidas', () => {
    act(() => root.render(<Harness excludedIds={['uuid-b2b']} />))

    act(() => setInputValue(input(), 'fabrica'))
    expect(input().getAttribute('aria-expanded')).toBe('true')
    expect($$('report-related-option').map((o) => o.dataset.optionId)).toEqual([
      'uuid-fab',
    ])
    const enter = key(input(), 'Enter')
    expect(enter.defaultPrevented).toBe(true) // nunca envía el formulario
    expect(chipIds()).toEqual(['uuid-fab'])
    expect(input().value).toBe('')

    // Segunda: con flechas sobre la lista completa (sin la elegida ni B2B).
    key(input(), 'ArrowDown')
    expect($$('report-related-option').map((o) => o.dataset.optionId)).toEqual([
      'uuid-neg',
      'uuid-ing',
    ])
    key(input(), 'ArrowDown')
    expect(input().getAttribute('aria-activedescendant')).toContain('uuid-ing')
    key(input(), 'Enter')

    expect(chipIds()).toEqual(['uuid-fab', 'uuid-ing'])
    expect(onChangeSpy).toHaveBeenLastCalledWith(['uuid-fab', 'uuid-ing'])
    expect($('report-related-status')?.textContent).toContain(
      '2 coordinaciones relacionadas seleccionadas.',
    )
  })

  it('añade con clic y quita con el botón del chip', () => {
    act(() => root.render(<Harness initial={['uuid-neg']} />))
    act(() => input().click())
    const option = $$('report-related-option').find(
      (o) => o.dataset.optionId === 'uuid-ing',
    )!
    act(() => option.click())
    expect(chipIds()).toEqual(['uuid-neg', 'uuid-ing'])

    const remove = $$('report-related-remove')[0]
    expect(remove.getAttribute('aria-label')).toBe('Quitar Negocios')
    act(() => remove.click())
    expect(chipIds()).toEqual(['uuid-ing'])
    expect(document.activeElement).toBe(input())
  })

  it('Retroceso con el buscador vacío quita la última elegida', () => {
    act(() => root.render(<Harness initial={['uuid-neg', 'uuid-fab']} />))
    key(input(), 'Backspace')
    expect(chipIds()).toEqual(['uuid-neg'])
  })

  it('Escape cierra la lista y marca el evento para que el modal no se cierre', () => {
    act(() => root.render(<Harness />))
    act(() => input().click())
    expect(input().getAttribute('aria-expanded')).toBe('true')
    const escape = key(input(), 'Escape')
    expect(escape.defaultPrevented).toBe(true)
    expect(input().getAttribute('aria-expanded')).toBe('false')
  })

  it('informa cuando no hay coincidencias', () => {
    act(() => root.render(<Harness />))
    act(() => setInputValue(input(), 'zzz'))
    expect($('report-related-empty')?.textContent).toBe(
      'Ninguna coordinación coincide con «zzz».',
    )
  })

  it('ignora en los chips una elegida que ya no es opción', () => {
    act(() => root.render(<Harness initial={['uuid-gone', 'uuid-neg']} />))
    expect(chipIds()).toEqual(['uuid-neg'])
  })
})
