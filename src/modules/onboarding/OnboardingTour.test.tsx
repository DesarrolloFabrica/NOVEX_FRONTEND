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

vi.mock('./useOnboarding', () => ({
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

  it('el velo deja pasar clics mientras falta el ancla, y vuelve a bloquear al buscar', () => {
    vi.useFakeTimers()
    ctx.stepIndex = 2
    mount()
    const fullShade = () => document.querySelector('.novex-tour__shade--full')

    expect(fullShade()?.classList.contains('novex-tour__shade--passthrough')).toBe(false)
    act(() => {
      vi.advanceTimersByTime(6100)
    })
    expect(fullShade()?.classList.contains('novex-tour__shade--passthrough')).toBe(true)

    act(() => buttonWithText('Reintentar')?.click())
    expect(fullShade()?.classList.contains('novex-tour__shade--passthrough')).toBe(false)
  })

  it('el aviso de ausencia se lee sin puntuación duplicada', () => {
    vi.useFakeTimers()
    ctx.stepIndex = 0
    ctx.steps = [{ ...OPTIONAL, missingNotice: 'El acceso no está visible en este momento.' }]
    mount()
    act(() => {
      vi.advanceTimersByTime(6100)
    })
    const notice = document.querySelector('.novex-tour__notice')?.textContent ?? ''
    expect(notice).toContain('El acceso no está visible en este momento. Si lo prefiere, continúe sin este paso.')
    expect(notice).not.toMatch(/\.\s*[,.]/)
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

describe('OnboardingTour · condición previa', () => {
  const GATED: OnboardingTourStep = {
    ...INFO,
    id: 'gated',
    gate: {
      when: { type: 'present', selector: '[data-mode="detail"]' },
      target: '[data-tour="anchor-back"]',
      eyebrow: 'Volver',
      title: 'Regrese a la vista',
      description: 'Cierre la vista abierta.',
      expectation: 'Luego seguimos.',
      waitingLabel: 'Esperando que cierre la vista',
    },
  }

  async function settle() {
    await act(async () => {
      await sleep(0)
    })
  }

  it('mientras se cumple, pide volver y no explica el paso ni ofrece Siguiente', () => {
    ctx.steps = [GATED]
    addAnchor({}, 'anchor-info')
    addAnchor({ 'data-mode': 'detail' }, 'anchor-back')
    mount()

    expect(document.body.textContent).toContain('Regrese a la vista')
    expect(document.body.textContent).toContain('Esperando que cierre la vista')
    expect(document.body.textContent).not.toContain('Paso informativo')
    expect(buttonWithText('Finalizar')).toBeUndefined()
    expect(buttonWithText('Siguiente')).toBeUndefined()
    expect(buttonWithText('Anterior')).toBeDefined()

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    })
    expect(ctx.next).not.toHaveBeenCalled()
  })

  it('cuando el usuario cierra la vista explica el paso, y vuelve a pedirlo si la reabre', async () => {
    ctx.steps = [GATED]
    addAnchor({}, 'anchor-info')
    const view = addAnchor({ 'data-mode': 'detail' }, 'anchor-back')
    mount()

    view.setAttribute('data-mode', 'idle')
    await settle()
    expect(document.body.textContent).toContain('Paso informativo')
    // Paso único: el botón de avance es «Finalizar».
    expect(buttonWithText('Finalizar')).toBeDefined()

    view.setAttribute('data-mode', 'detail')
    await settle()
    expect(document.body.textContent).toContain('Regrese a la vista')
    expect(ctx.next).not.toHaveBeenCalled()
  })

  it('sin la condición, el paso se explica directamente', () => {
    ctx.steps = [GATED]
    addAnchor({}, 'anchor-info')
    mount()
    expect(document.body.textContent).toContain('Paso informativo')
    expect(document.body.textContent).not.toContain('Regrese a la vista')
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

describe('OnboardingTour · pasos que no aplican', () => {
  const NOT_APPLICABLE: OnboardingTourStep = {
    ...INFO,
    id: 'not-applicable',
    title: 'Paso condicionado',
    showWhen: { type: 'present', selector: '[data-tour="open-detail"]' },
  }

  it('se saltan hacia delante si la condición sigue sin cumplirse tras el margen', () => {
    vi.useFakeTimers()
    addAnchor({}, 'anchor-info')
    ctx.steps = [INFO, NOT_APPLICABLE, INFO]
    mount()
    expect(ctx.next).not.toHaveBeenCalled()

    ctx.stepIndex = 1
    mount()
    // Durante el margen no salta ni muestra el globo: solo el velo.
    expect(ctx.next).not.toHaveBeenCalled()
    expect(document.querySelector('.novex-tour__card')).toBeNull()
    expect(document.querySelector('.novex-tour__shade--full')).not.toBeNull()

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(ctx.next).toHaveBeenCalledTimes(1)
    expect(document.body.textContent).not.toContain('Paso condicionado')
  })

  it('no salta si lo que espera aparece durante el margen (vista aún cargando)', async () => {
    addAnchor({}, 'anchor-info')
    ctx.steps = [INFO, NOT_APPLICABLE, INFO]
    ctx.stepIndex = 1
    mount()
    await act(async () => {
      await sleep(100)
      addAnchor({}, 'open-detail')
      await sleep(100)
    })
    expect(document.body.textContent).toContain('Paso condicionado')
    await act(async () => {
      await sleep(500)
    })
    expect(ctx.next).not.toHaveBeenCalled()
  })

  it('al retroceder se saltan hacia atrás, sin rebotar hacia delante', () => {
    vi.useFakeTimers()
    addAnchor({}, 'anchor-info')
    ctx.steps = [INFO, NOT_APPLICABLE, INFO]
    ctx.stepIndex = 2
    mount()

    ctx.stepIndex = 1
    mount()
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(ctx.previous).toHaveBeenCalledTimes(1)
    expect(ctx.next).not.toHaveBeenCalled()
  })

  it('un render ajeno durante el margen no salta dos veces', () => {
    vi.useFakeTimers()
    addAnchor({}, 'anchor-info')
    ctx.steps = [INFO, NOT_APPLICABLE, INFO]
    ctx.stepIndex = 1
    mount()
    mount()
    act(() => {
      vi.advanceTimersByTime(200)
    })
    mount()
    act(() => {
      vi.advanceTimersByTime(800)
    })
    expect(ctx.next).toHaveBeenCalledTimes(1)
  })

  it('se muestran con normalidad si la condición se cumple', () => {
    addAnchor({}, 'anchor-info')
    addAnchor({}, 'open-detail')
    ctx.steps = [NOT_APPLICABLE]
    mount()
    expect(document.body.textContent).toContain('Paso condicionado')
    expect(ctx.next).not.toHaveBeenCalled()
  })
})

describe('OnboardingTour · bienvenida sin resaltado', () => {
  it('oscurece toda la pantalla aunque el ancla exista y centra el globo', async () => {
    addAnchor({}, 'anchor-info')
    ctx.steps = [{ ...INFO, highlightTarget: false, placement: 'center' }]
    mount()
    await act(async () => {
      await sleep(50)
    })
    expect(document.querySelector('.novex-tour__shade--full')).not.toBeNull()
    expect(document.querySelector('.novex-tour__spotlight')).toBeNull()
    const card = document.querySelector<HTMLElement>('.novex-tour__card')
    expect(card?.classList.contains('novex-tour__card--center')).toBe(true)
    // El centrado va en CSS (`translate`): nada en línea que la animación pise.
    expect(card?.style.transform).toBe('')
  })
})

describe('OnboardingTour · paso de acción opcional', () => {
  it('mientras espera la acción ofrece saltar el paso', async () => {
    addAnchor({ 'data-scope': 'direction' }, 'anchor-action')
    ctx.steps = [{ ...ACTION, optional: true, skipLabel: 'Saltar este paso' }]
    mount()
    await act(async () => {
      await sleep(50)
    })
    expect(document.body.textContent).toContain('Elija una coordinación en la baraja')
    act(() => buttonWithText('Saltar este paso')?.click())
    expect(ctx.next).toHaveBeenCalledTimes(1)
  })

  it('sin `optional` no ofrece saltarlo', async () => {
    addAnchor({ 'data-scope': 'direction' }, 'anchor-action')
    ctx.steps = [ACTION]
    mount()
    await act(async () => {
      await sleep(50)
    })
    expect(buttonWithText('Saltar este paso')).toBeUndefined()
  })
})

describe('OnboardingTour · teclas de los controles de la página', () => {
  it('las flechas y Escape dentro de un campo o una pestaña no mueven el recorrido', () => {
    addAnchor({}, 'anchor-info')
    mount()
    const select = document.createElement('select')
    const textarea = document.createElement('textarea')
    const tab = document.createElement('button')
    tab.setAttribute('role', 'tab')
    document.body.append(select, textarea, tab)

    for (const element of [select, textarea, tab]) {
      act(() => {
        for (const key of ['ArrowRight', 'ArrowLeft', 'Escape']) {
          element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
        }
      })
    }
    expect(ctx.next).not.toHaveBeenCalled()
    expect(ctx.previous).not.toHaveBeenCalled()
    expect(ctx.pause).not.toHaveBeenCalled()
  })

  it('con modificadores (Alt+→ del navegador) tampoco', () => {
    addAnchor({}, 'anchor-info')
    mount()
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true }))
    })
    expect(ctx.next).not.toHaveBeenCalled()
  })
})
