import { expect, test, type Page } from 'playwright/test'
import { installImpactNetworkApiMocks } from './impact-network.fixtures'

const AUTH_SESSION_KEY = 'novex.auth.session.v1'
const AUTH_TOKEN_KEY = 'novex.auth.accessToken.v1'

type RoleCode = 'COORDINADOR' | 'ANALISTA' | 'DIRECTOR' | 'ADMIN'

const PERMISSIONS: Record<RoleCode, string[]> = {
  COORDINADOR: [
    'AUTH_VIEW_PROFILE',
    'COORDINATIONS_VIEW',
    'SITUATIONS_VIEW',
    'SITUATIONS_CREATE',
    'SITUATIONS_UPDATE',
    'AI_ANALYZE',
    'AI_VIEW_REPORTS',
  ],
  ANALISTA: [
    'AUTH_VIEW_PROFILE',
    'COORDINATIONS_VIEW',
    'SITUATIONS_VIEW',
    'SITUATIONS_CREATE',
    'SITUATIONS_UPDATE',
    'AI_ANALYZE',
    'AI_VIEW_REPORTS',
    'REPORTS_VIEW',
  ],
  DIRECTOR: [
    'AUTH_VIEW_PROFILE',
    'COORDINATIONS_VIEW',
    'SITUATIONS_VIEW',
    'AI_VIEW_REPORTS',
    'REPORTS_VIEW',
    'REPORTS_EXPORT',
  ],
  ADMIN: [
    'AUTH_VIEW_PROFILE',
    'COORDINATIONS_VIEW',
    'SITUATIONS_VIEW',
    'SITUATIONS_CREATE',
    'SITUATIONS_UPDATE',
    'AI_ANALYZE',
    'AI_VIEW_REPORTS',
    'REPORTS_VIEW',
    'REPORTS_EXPORT',
    'USERS_VIEW',
    'USERS_UPDATE',
    'SYSTEM_CONFIGURATION',
  ],
}

const ADMIN_USER = {
  id: '11111111-1111-4111-8111-111111111111',
  fullName: 'Usuario Operativo',
  email: 'operativo@novex.test',
  roleCode: 'ANALISTA',
  roleName: 'Analista',
  coordinationId: null,
  coordinationName: null,
  status: 'ACTIVE',
  lastLoginAt: '2026-08-04T12:00:00.000Z',
}

function accessToken(roleCode: RoleCode): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    sub: `e2e-${roleCode.toLowerCase()}`,
    email: `${roleCode.toLowerCase()}@novex.test`,
    roleId: `role-${roleCode.toLowerCase()}`,
    roleCode,
    coordinationId: roleCode === 'COORDINADOR' ? 'coord-ingenierias' : null,
    permissions: PERMISSIONS[roleCode],
    status: 'ACTIVE',
  })}.e2e`
}

async function installRoleExperience(page: Page, roleCode: RoleCode) {
  const coordinationCode =
    roleCode === 'COORDINADOR' ? 'coord-ingenierias' : null
  const roleName =
    roleCode === 'COORDINADOR'
      ? 'Coordinador'
      : roleCode.charAt(0) + roleCode.slice(1).toLowerCase()
  const session = {
    id: `e2e-${roleCode.toLowerCase()}`,
    name: `${roleName} E2E`,
    role: roleCode === 'COORDINADOR' ? 'ejecutor' : 'supervisor',
    roleCode,
    roleName,
    permissions: PERMISSIONS[roleCode],
    selectedAreaId: coordinationCode ?? undefined,
    coordinationId:
      roleCode === 'COORDINADOR' ? 'coord-ingenierias' : undefined,
    onboardingStep: 100,
    onboardingCompleted: true,
    onboardingSeenAt: '2026-08-04T00:00:00.000Z',
  }

  await page.addInitScript(
    ({ sessionKey, tokenKey, currentSession, token }) => {
      localStorage.setItem(sessionKey, JSON.stringify(currentSession))
      localStorage.setItem(tokenKey, token)
    },
    {
      sessionKey: AUTH_SESSION_KEY,
      tokenKey: AUTH_TOKEN_KEY,
      currentSession: session,
      token: accessToken(roleCode),
    },
  )

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname

    if (path.endsWith('/auth/me')) {
      await route.fulfill({
        json: {
          user: {
            id: session.id,
            fullName: session.name,
            roleCode,
            roleName,
            coordinationId: session.coordinationId ?? null,
            coordinationCode,
            onboardingStep: 100,
            onboardingCompleted: true,
            onboardingSeenAt: session.onboardingSeenAt,
          },
        },
      })
      return
    }

    if (path.endsWith('/situations') && request.method() === 'GET') {
      await route.fulfill({
        json: { items: [], total: 0, page: 1, limit: 100 },
      })
      return
    }

    if (path.endsWith('/coordinations') && request.method() === 'GET') {
      await route.fulfill({ json: [] })
      return
    }

    if (path.endsWith('/users') && request.method() === 'GET') {
      await route.fulfill({ json: [ADMIN_USER] })
      return
    }

    if (
      path.endsWith(`/users/${ADMIN_USER.id}`) &&
      request.method() === 'PATCH'
    ) {
      await route.fulfill({ json: { ...ADMIN_USER, status: 'INACTIVE' } })
      return
    }

    if (path.endsWith('/roles')) {
      await route.fulfill({
        json: [
          {
            id: 'role-admin',
            code: 'ADMIN',
            name: 'Administrador',
            description: 'Control total',
            isSystem: true,
            isActive: true,
          },
        ],
      })
      return
    }

    if (path.endsWith('/permissions')) {
      await route.fulfill({
        json: [
          {
            id: 'permission-system',
            code: 'SYSTEM_CONFIGURATION',
            name: 'Configurar sistema',
            module: 'SYSTEM',
            description: null,
          },
        ],
      })
      return
    }

    await route.fulfill({ status: 404, json: { message: 'E2E' } })
  })

  await installImpactNetworkApiMocks(page)
}

test('el coordinador aterriza en su coordinación sin mostrar Dirección', async ({
  page,
}) => {
  await installRoleExperience(page, 'COORDINADOR')
  await page.goto('/')

  await expect(page).toHaveURL(/\/red-impacto\?coordination=coord-ingenierias$/)
  await expect(
    page.locator('.operational-context-panel[data-level="coordination"]'),
  ).toBeVisible()
  await expect(
    page.locator('.organizational-scene__island--selected'),
  ).toHaveAttribute('data-coordination-id', 'coord-ingenierias')
})

test('el analista aterriza primero en Red de impacto', async ({
  page,
}) => {
  await installRoleExperience(page, 'ANALISTA')
  await page.goto('/')

  await expect(page).toHaveURL(/\/red-impacto$/)
  await expect(page.locator('.impact-executive__status-board')).toBeVisible()
})

test('el director aterriza primero en Red de impacto', async ({
  page,
}) => {
  await installRoleExperience(page, 'DIRECTOR')
  await page.goto('/')

  await expect(page).toHaveURL(/\/red-impacto$/)
  await expect(page.locator('.impact-executive__status-board')).toBeVisible()
})

test('el administrador aterriza primero en Red de impacto', async ({
  page,
}) => {
  await installRoleExperience(page, 'ADMIN')
  await page.goto('/')

  await expect(page).toHaveURL(/\/red-impacto$/)
  await expect(page.locator('.impact-executive__status-board')).toBeVisible()
})
