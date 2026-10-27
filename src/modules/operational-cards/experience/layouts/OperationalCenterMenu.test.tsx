// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import type { User } from '@/modules/auth/types/user.types'
import { useOnboarding } from '@/modules/onboarding/OnboardingContext'
import { OperationalCenterMenu } from './OperationalCenterMenu'

vi.mock('@/modules/auth/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/modules/onboarding/OnboardingContext', () => ({
  useOnboarding: vi.fn(),
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const mockedUseAuth = vi.mocked(useAuth)
const mockedUseOnboarding = vi.mocked(useOnboarding)
const logout = vi.fn<() => Promise<void>>()
const restart = vi.fn()
const resume = vi.fn()

let container: HTMLDivElement
let root: Root

function user(
  roleCode: 'ADMIN' | 'DIRECTOR' | 'ANALISTA' | 'COORDINADOR',
  options: { create?: boolean; coordinationId?: string } = {},
): User {
  return {
    id: `user-${roleCode.toLowerCase()}`,
    name: `${roleCode} Prueba`,
    role: roleCode === 'COORDINADOR' ? 'ejecutor' : 'supervisor',
    roleCode,
    roleName: roleCode,
    permissions: [
      'SITUATIONS_VIEW',
      ...(options.create ? ['SITUATIONS_CREATE'] : []),
    ],
    coordinationId: options.coordinationId,
    onboardingCompleted: true,
    onboardingStep: 100,
    onboardingSeenAt: null,
  }
}

function renderMenu(currentUser: User, tutorialAvailable = false) {
  mockedUseAuth.mockReturnValue({ user: currentUser, logout } as never)
  mockedUseOnboarding.mockReturnValue({
    steps: tutorialAvailable ? [{ id: 'paso' }] : [],
    restart,
    resume,
  } as never)

  act(() => {
    root.render(
      <MemoryRouter initialEntries={['/centro-operacional']}>
        <OperationalCenterMenu />
      </MemoryRouter>,
    )
  })
}

function byTestId(testId: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(
    `[data-testid="${testId}"]`,
  )
  if (!element) throw new Error(`No existe [data-testid="${testId}"]`)
  return element
}

function query(testId: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(`[data-testid="${testId}"]`)
}

function click(testId: string) {
  act(() => byTestId(testId).click())
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  logout.mockReset().mockResolvedValue(undefined)
  restart.mockReset()
  resume.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('OperationalCenterMenu', () => {
  it('permanece cerrado y expone un botón disclosure de al menos 44 px por CSS', () => {
    renderMenu(user('DIRECTOR'))

    const trigger = byTestId('shell-menu-trigger')
    expect(trigger.tagName).toBe('BUTTON')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.getAttribute('aria-controls')).toMatch(
      /^operational-center-menu-/,
    )
    expect(query('shell-menu-panel')).toBeNull()
    expect(byTestId('shell-menu-anchor').textContent?.trim()).toBe('')
    expect(trigger.getAttribute('aria-label')).toBe('Abrir el menú')
  })

  it('ADMIN ve Centro y Administración, pero no obtiene registro por un permiso residual', () => {
    renderMenu(user('ADMIN', { create: true }))
    click('shell-menu-trigger')

    expect(byTestId('shell-menu-option-center').getAttribute('href')).toBe(
      '/centro-operacional',
    )
    expect(byTestId('shell-menu-option-admin').getAttribute('href')).toBe(
      '/admin',
    )
    expect(query('shell-menu-register')).toBeNull()
    expect(byTestId('shell-menu-panel').textContent).toContain('ADMIN Prueba')
    expect(document.activeElement).toBe(byTestId('shell-menu-option-admin'))
  })

  it.each([
    ['DIRECTOR', false, undefined, false],
    ['ANALISTA', true, undefined, true],
    ['COORDINADOR', true, 'coord-1', true],
    ['COORDINADOR', true, undefined, false],
  ] as const)(
    '%s conserva sus destinos y regla vigente de registro',
    (roleCode, create, coordinationId, canRegister) => {
      renderMenu(user(roleCode, { create, coordinationId }))
      click('shell-menu-trigger')

      expect(byTestId('shell-menu-option-center')).toBeTruthy()
      expect(query('shell-menu-option-admin')).toBeNull()
      expect(Boolean(query('shell-menu-register'))).toBe(canRegister)
    },
  )

  it('mueve el foco al panel y Escape lo cierra restaurando el foco en MENÚ', () => {
    renderMenu(user('DIRECTOR'))
    click('shell-menu-trigger')

    expect(document.activeElement).toBe(byTestId('shell-menu-option-center'))
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })

    expect(query('shell-menu-panel')).toBeNull()
    expect(byTestId('shell-menu-trigger').getAttribute('aria-expanded')).toBe(
      'false',
    )
    expect(document.activeElement).toBe(byTestId('shell-menu-trigger'))
  })

  it('un pointerdown exterior cierra y devuelve el foco al botón', async () => {
    renderMenu(user('DIRECTOR'))
    click('shell-menu-trigger')

    await act(async () => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })

    expect(query('shell-menu-panel')).toBeNull()
    expect(document.activeElement).toBe(byTestId('shell-menu-trigger'))
  })

  it('reutiliza la ayuda contextual dentro del panel', () => {
    renderMenu(user('DIRECTOR'))
    click('shell-menu-trigger')

    const help = container.querySelector<HTMLButtonElement>(
      '.novex-help-menu__trigger',
    )
    expect(help).not.toBeNull()
    act(() => help?.click())

    expect(container.querySelector('.novex-help-menu__popover')?.textContent).toContain(
      'Cada carta representa una coordinación',
    )
  })

  it('ofrece el tutorial solo cuando hay pasos y cierra antes de reiniciarlo', () => {
    renderMenu(user('DIRECTOR'), true)
    click('shell-menu-trigger')
    click('shell-menu-tutorial')

    expect(restart).toHaveBeenCalledOnce()
    expect(query('shell-menu-panel')).toBeNull()
  })

  it('cierra el panel antes de reutilizar logout', async () => {
    renderMenu(user('DIRECTOR'))
    click('shell-menu-trigger')

    await act(async () => {
      byTestId('shell-menu-logout').click()
      await Promise.resolve()
    })

    expect(logout).toHaveBeenCalledOnce()
    expect(query('shell-menu-panel')).toBeNull()
  })
})
