import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OperationalCenterHome } from '@/modules/operational-cards/experience/OperationalCenterHome'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import type { User } from '@/modules/auth/types/user.types'

vi.mock('@/modules/auth/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock(
  '@/modules/operational-cards/experience/shells/DirectorOperationalShell',
  () => ({
    DirectorOperationalShell: () => (
      <div data-testid="director-operational-shell" />
    ),
  }),
)

vi.mock(
  '@/modules/operational-cards/experience/shells/AnalystOperationalShell',
  () => ({
    AnalystOperationalShell: () => (
      <div data-testid="analyst-operational-shell" />
    ),
  }),
)

vi.mock(
  '@/modules/operational-cards/experience/shells/CoordinatorOperationalShell',
  () => ({
    CoordinatorOperationalShell: () => (
      <div data-testid="coordinator-operational-shell" />
    ),
  }),
)

vi.mock(
  '@/modules/operational-cards/experience/shells/AdminOperationalShell',
  () => ({
    AdminOperationalShell: () => <div data-testid="admin-operational-shell" />,
  }),
)

const mockedUseAuth = vi.mocked(useAuth)

function user(roleCode: User['roleCode']): User {
  return {
    id: 'u1',
    name: 'Prueba',
    role: 'supervisor',
    roleCode,
    roleName: roleCode,
    permissions: ['SITUATIONS_VIEW'],
    onboardingCompleted: true,
    onboardingStep: 100,
    onboardingSeenAt: null,
  }
}

describe('OperationalCenterHome · aislamiento de shells', () => {
  beforeEach(() => {
    mockedUseAuth.mockReset()
  })

  it('DIRECTOR monta DirectorOperationalShell', () => {
    mockedUseAuth.mockReturnValue({
      user: user('DIRECTOR'),
      loading: false,
      loginWithGoogle: vi.fn(),
      loginWithEmail: vi.fn(),
      logout: vi.fn(),
      completeOnboarding: vi.fn(),
    } as never)
    const html = renderToStaticMarkup(<OperationalCenterHome />)
    expect(html).toContain('data-testid="director-operational-shell"')
    expect(html).not.toContain('data-testid="analyst-operational-shell"')
    expect(html).not.toContain('data-testid="coordinator-operational-shell"')
    expect(html).not.toContain('data-testid="admin-operational-shell"')
  })

  it('ANALISTA monta AnalystOperationalShell', () => {
    mockedUseAuth.mockReturnValue({
      user: user('ANALISTA'),
      loading: false,
    } as never)
    const html = renderToStaticMarkup(<OperationalCenterHome />)
    expect(html).toContain('data-testid="analyst-operational-shell"')
    expect(html).not.toContain('data-testid="director-operational-shell"')
  })

  it('COORDINADOR monta CoordinatorOperationalShell', () => {
    mockedUseAuth.mockReturnValue({
      user: user('COORDINADOR'),
      loading: false,
    } as never)
    const html = renderToStaticMarkup(<OperationalCenterHome />)
    expect(html).toContain('data-testid="coordinator-operational-shell"')
    expect(html).not.toContain('data-testid="analyst-operational-shell"')
  })

  it('ADMIN monta AdminOperationalShell', () => {
    mockedUseAuth.mockReturnValue({
      user: user('ADMIN'),
      loading: false,
    } as never)
    const html = renderToStaticMarkup(<OperationalCenterHome />)
    expect(html).toContain('data-testid="admin-operational-shell"')
    expect(html).not.toContain('data-testid="director-operational-shell"')
  })
})
