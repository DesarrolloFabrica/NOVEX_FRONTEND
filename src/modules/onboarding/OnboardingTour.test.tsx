// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OnboardingTourStep } from './onboardingTourSteps'

const ctx = vi.hoisted(() => ({
  active: true,
  stepIndex: 0,
  steps: [] as unknown[],
  next: vi.fn(),
  previous: vi.fn(),
  pause: vi.fn(),
  skip: vi.fn(),
  restart: vi.fn(),
  resume: vi.fn(),
}))

vi.mock('./OnboardingContext', () => ({
  useOnboarding: () => ctx,
}))

import { OnboardingTour } from './OnboardingTour'

const BASE = {
  route: '/centro-operacional',
  eyebrow: 'Centro operacional',
  expectation: 'Qué esperar de este paso.',
}

const INFO: OnboardingTourStep = {
  ...BASE,
  id: 'info',
  target: '[data-tour="anchor-info"]',
  title: 'Paso informativo',
  description: 'Descripción del paso informativo.',
}

const ACTION: OnboardingTourStep = {
  ...BASE,
  id: 'action',
  target: '[data-tour="anchor-action"]',
  title: 'Paso de acción',
  description: 'Seleccione una coordinación.',
  kind: 'action',
  advanceWhen: {
    type: 'attribute',
    selector: '[data-tour="anchor-action"]',
    name: 'data-scope',
    value: 'coordination',
  },
  waitingLabel: 'Elija una coordinación en la baraja',
}

const OPTIONAL: OnboardingTourStep = {
  ...BASE,
  id: 'optional',
  target: '[data-tour="anchor-missing"]',
  title: 'Paso opcional',
  description: 'Puede continuar sin este elemento.',
  optional: true,
}

const LOCKED: OnboardingTourStep = {
  ...INFO,
  id: 'locked',
  lockNavigation: true,
}

let container: HTMLDivElement
let root: Root

function mount() {
  act(() => {
    root.render(
      <MemoryRouter>
        <OnboardingTour />
      </MemoryRouter>,
    )
  })
}

function addAnchor(attributes: Record<string, string>, tour: string) {
  const element = document.createElement('div')
  element.setAttribute('data-tour', tour)
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value)
  }
  document.body.appendChild(element)
  return element
}

function buttonWithText(text: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll('button')).find((button) =>
    button.textContent?.includes(text),
  )
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

beforeEach(() => {
  vi.clearAllMocks()
  ctx.active = true
  ctx.stepIndex = 0
  ctx.steps = [INFO, ACTION, OPTIONAL, LOCKED]
  // jsdom no siempre expone rAF; el motor depende de él para agrupar mediciones.
  if (typeof window.requestAnimationFrame !== 'function') {
    window.requestAnimationFrame = (callback) =>
      window.setTimeout(() => callback(Date.now()), 0)
    window.cancelAnimationFrame = (id) => window.clearTimeout(id)
  }
  document.body.innerHTML = ''
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('OnboardingTour · pasos informativos', () => {
  it('muestra el contador y avanza con Siguiente', () => {
    addAnchor({}, 'anchor-info')
    mount()

    expect(document.querySelector('.novex-tour__count')?.textContent).toBe(
      'Paso 1 de 4',
    )
    act(() => buttonWithText('Siguiente')?.click())
    expect(ctx.next).toHaveBeenCalledTimes(1)
  })

  it('Escape pausa y las flechas navegan', () => {
    addAnchor({}, 'anchor-info')
    mount()

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(ctx.pause).toHaveBeenCalledTimes(1)

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    })
    expect(ctx.next).toHaveBeenCalledTimes(1)
  })

  it('un paso con navegación bloqueada ignora Escape', () => {
    ctx.stepIndex = 3
    addAnchor({}, 'anchor-info')
    mount()

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(ctx.pause).not.toHaveBeenCalled()
  })
})

describe('OnboardingTour · paso que depende de un estado', () => {
  it('no avanza porque el ancla exista: espera el atributo que confirma el estado', async () => {
    ctx.stepIndex = 1
    addAnchor({ 'data-scope': 'direction' }, 'anchor-action')
    mount()

    await act(async () => {
      await sleep(400)
    })
    expect(ctx.next).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Elija una coordinación en la baraja')

    // Mismo ancla, ahora con el estado cumplido: avanza una sola vez.
    const anchor = document.querySelector<HTMLElement>('[data-tour="anchor-action"]')!
    await act(async () => {
      anchor.setAttribute('data-scope', 'coordination')
      await sleep(500)
    })
    expect(ctx.next).toHaveBeenCalledTimes(1)
  })
})

describe('OnboardingTour · elemento ausente', () => {
  it('tras el plazo ofrece Reintentar y nunca avanza solo', () => {
    vi.useFakeTimers()
    ctx.stepIndex = 2
    mount()

    act(() => {
      vi.advanceTimersByTime(6100)
    })
    expect(buttonWithText('Reintentar')).toBeDefined()
    expect(buttonWithText('Continuar sin este paso')).toBeDefined()
    expect(ctx.next).not.toHaveBeenCalled()
  })

  it('Reintentar vuelve a buscar y muestra el paso cuando el ancla aparece', () => {
    vi.useFakeTimers()
    ctx.stepIndex = 2
    mount()
    act(() => {
      vi.advanceTimersByTime(6100)
    })

    addAnchor({}, 'anchor-missing')
    act(() => buttonWithText('Reintentar')?.click())

    expect(buttonWithText('Reintentar')).toBeUndefined()
    expect(buttonWithText('Continuar sin este paso')).toBeUndefined()
  })

  it('un paso no opcional no ofrece continuar sin él', () => {
    vi.useFakeTimers()
    ctx.stepIndex = 0
    ctx.steps = [{ ...INFO, id: 'required', target: '[data-tour="anchor-missing"]' }]
    mount()
    act(() => {
      vi.advanceTimersByTime(6100)
    })

    expect(buttonWithText('Reintentar')).toBeDefined()
    expect(buttonWithText('Continuar sin este paso')).toBeUndefined()
  })
})

describe('OnboardingTour · foco y seguridad', () => {
  it('devuelve el foco al elemento previo al cerrar el recorrido', async () => {
    const returnTo = document.createElement('button')
    returnTo.textContent = 'Menú'
    document.body.appendChild(returnTo)
    returnTo.focus()

    addAnchor({}, 'anchor-info')
    mount()
    await act(async () => {
      await sleep(80)
    })
    // Al abrir, el foco entra al globo.
    expect(document.activeElement?.getAttribute('role')).toBe('dialog')

    ctx.active = false
    mount()
    expect(document.activeElement).toBe(returnTo)
  })

  it('no realiza ninguna petición HTTP durante la navegación del recorrido', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    addAnchor({}, 'anchor-info')
    mount()

    act(() => buttonWithText('Siguiente')?.click())
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
