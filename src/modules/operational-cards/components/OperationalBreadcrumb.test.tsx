// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OperationalBreadcrumb } from '@/modules/operational-cards/components/OperationalBreadcrumb'

/**
 * La miga es ahora UN control de regreso: flecha + nombre de la coordinación.
 *
 * Lo que se protege es la forma acordada —solo la flecha es botón, el nombre
 * es texto informativo— y que el regreso siga siendo `onBackToDirection`, que
 * la experiencia cablea a `clearCoordination`. El recorrido real (volver a la
 * mesa global, también desde un mazo) lo comprueban los e2e de la baraja.
 */

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function render(onBack: () => void = () => undefined) {
  act(() => {
    root.render(
      <OperationalBreadcrumb
        coordinationName="Coordinación General de Operaciones"
        onBackToDirection={onBack}
      />,
    )
  })
  const nav = container.querySelector('[data-testid="operational-breadcrumb"]')
  const back = container.querySelector<HTMLButtonElement>(
    '[data-testid="breadcrumb-direction"]',
  )
  return { nav: nav!, back: back! }
}

describe('OperationalBreadcrumb · flecha de regreso', () => {
  it('el regreso es un botón de verdad, no un enlace ni un div pulsable', () => {
    const { back } = render()

    expect(back.tagName).toBe('BUTTON')
    // `type="button"`: Enter y Espacio lo activan de forma nativa y nunca
    // envía un formulario que lo contenga.
    expect(back.getAttribute('type')).toBe('button')
    expect(back.disabled).toBe(false)
    expect(container.querySelector('a')).toBeNull()
  })

  it('el botón muestra solo la flecha, decorativa', () => {
    const { back } = render()

    expect(back.textContent?.trim()).toBe('')
    const icon = back.querySelector('svg')
    expect(icon).not.toBeNull()
    expect(icon!.getAttribute('aria-hidden')).toBe('true')
  })

  it('su nombre accesible es «Volver a Dirección de Operaciones»', () => {
    const { back } = render()

    expect(back.getAttribute('aria-label')).toBe(
      'Volver a Dirección de Operaciones',
    )
  })

  it('el nombre de la coordinación sigue visible y NO es un botón', () => {
    const { nav } = render()
    const current = nav.querySelector('[aria-current="page"]')

    expect(current?.textContent).toBe('Coordinación General de Operaciones')
    expect(current?.closest('button')).toBeNull()
    expect(nav.querySelectorAll('button')).toHaveLength(1)
  })

  it('pulsar la flecha invoca la acción de regreso una vez', () => {
    const onBack = vi.fn()
    const { back } = render(onBack)

    act(() => back.click())

    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
