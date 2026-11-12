// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OperationalRoleHeader } from '@/modules/operational-cards/components/OperationalRoleHeader'
import type { User } from '@/modules/auth/types/user.types'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

let container: HTMLDivElement
let root: Root

function mockUser(roleCode: string, name = 'Usuario Prueba'): User {
  return {
    id: 'u-1',
    name,
    role: roleCode === 'COORDINADOR' ? 'ejecutor' : 'supervisor',
    roleCode,
    roleName: roleCode,
    permissions: ['SITUATIONS_VIEW', 'SITUATIONS_CREATE'],
    onboardingCompleted: true,
    onboardingStep: 100,
    onboardingSeenAt: null,
  }
}

const mockCoordination: CoordinationOverview = {
  id: 'coord-1',
  code: 'fabrica',
  name: 'Fábrica de Contenidos',
  shortName: 'Fábrica',
  color: '#2a5a8a',
  displayOrder: 1,
  status: 'ALERTA',
  activeProblemsCount: 3,
  criticalCount: 1,
  affectedCoordinationCount: 1,
  lifePoints: 9,
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('OperationalRoleHeader', () => {
  it('renderiza cabecera para ADMIN con acceso directo a Consola de Administración', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <OperationalRoleHeader
            experience="admin"
            user={mockUser('ADMIN', 'Administrador Novex')}
            activeProblemsCount={5}
          />
        </MemoryRouter>,
      )
    })

    const header = container.querySelector('[data-testid="operational-role-header"]')
    expect(header).not.toBeNull()
    expect(header?.textContent).toContain('NOVEX')
    expect(header?.textContent).toContain('Centro Operacional')
    expect(header?.textContent).toContain('Administración del Sistema')

    const adminLink = container.querySelector('[data-testid="admin-tools-quicklink"]')
    expect(adminLink).not.toBeNull()
    expect(adminLink?.getAttribute('href')).toBe('/admin')

    const metric = container.querySelector('[data-testid="admin-overview-metric"]')
    expect(metric?.textContent).toContain('5 situaciones activas')

    const userEl = container.querySelector('[data-testid="role-header-user"]')
    expect(userEl?.textContent).toContain('Administrador Novex')
    expect(userEl?.textContent).toContain('A')
  })

  it('renderiza cabecera para DIRECTOR con salud global y resumen ejecutivo', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <OperationalRoleHeader
            experience="director"
            user={mockUser('DIRECTOR', 'Directora Operaciones')}
            directionStatus="ALERTA"
            activeProblemsCount={4}
            criticalProblemsCount={2}
          />
        </MemoryRouter>,
      )
    })

    expect(container.textContent).toContain('Dirección de Operaciones')
    const healthPill = container.querySelector('[data-testid="director-health-pill"]')
    expect(healthPill?.textContent).toContain('Salud global: Alerta')

    const chip = container.querySelector('[data-testid="director-attention-chip"]')
    expect(chip?.textContent).toContain('2 críticas')
  })

  it('renderiza cabecera para ANALISTA con ámbito activo y botón de registro rápido', () => {
    const handleReport = vi.fn()
    act(() => {
      root.render(
        <MemoryRouter>
          <OperationalRoleHeader
            experience="analyst"
            user={mockUser('ANALISTA', 'Analista 1')}
            selectedCoordination={mockCoordination}
            canCreate
            onReportSituation={handleReport}
          />
        </MemoryRouter>,
      )
    })

    expect(container.textContent).toContain('Analista de Operaciones')
    const scopeChip = container.querySelector('[data-testid="analyst-scope-chip"]')
    expect(scopeChip?.textContent).toContain('Área: Fábrica de Contenidos')

    const cta = container.querySelector<HTMLButtonElement>(
      '[data-testid="analyst-quick-report"]',
    )
    expect(cta).not.toBeNull()
    act(() => {
      cta?.click()
    })
    expect(handleReport).toHaveBeenCalledOnce()
  })

  it('renderiza cabecera para COORDINADOR con nombre de coordinación y botón de registro', () => {
    const handleReport = vi.fn()
    act(() => {
      root.render(
        <MemoryRouter>
          <OperationalRoleHeader
            experience="coordinator"
            user={mockUser('COORDINADOR', 'Coordinador Juan')}
            assignedCoordination={mockCoordination}
            canCreate
            onReportSituation={handleReport}
          />
        </MemoryRouter>,
      )
    })

    expect(container.textContent).toContain('Coordinación: Fábrica de Contenidos')
    const healthPill = container.querySelector('[data-testid="coordinator-health-pill"]')
    expect(healthPill?.textContent).toContain('Estado: Alerta')

    const cta = container.querySelector<HTMLButtonElement>(
      '[data-testid="coordinator-quick-report"]',
    )
    expect(cta).not.toBeNull()
    act(() => {
      cta?.click()
    })
    expect(handleReport).toHaveBeenCalledOnce()
  })
})
