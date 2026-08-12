import { expect, test, type Page } from 'playwright/test'

type TutorialRole = 'DIRECTOR' | 'ADMIN'

const AUTH_SESSION_KEY = 'novex.auth.session.v1'
const AUTH_TOKEN_KEY = 'novex.auth.accessToken.v1'

const ROLE_PERMISSIONS: Record<TutorialRole, string[]> = {
  DIRECTOR: [
    'AUTH_VIEW_PROFILE',
    'COORDINATIONS_VIEW',
    'SITUATIONS_VIEW',
    'AI_VIEW_REPORTS',
    'REPORTS_VIEW',
  ],
  ADMIN: [
    'AUTH_VIEW_PROFILE',
    'COORDINATIONS_VIEW',
    'SITUATIONS_VIEW',
    'AI_VIEW_REPORTS',
    'REPORTS_VIEW',
    'SYSTEM_CONFIGURATION',
  ],
}

interface OnboardingUpdate {
  step: number
  completed?: boolean
}

function accessToken(roleCode: TutorialRole): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    sub: `e2e-onboarding-${roleCode.toLowerCase()}`,
    email: `${roleCode.toLowerCase()}@novex.test`,
    roleId: `role-${roleCode.toLowerCase()}`,
    roleCode,
    coordinationId: null,
    permissions: ROLE_PERMISSIONS[roleCode],
    status: 'ACTIVE',
  })}.e2e`
}

async function installRoleOnboarding(
  page: Page,
  roleCode: TutorialRole,
  options: { delayStep?: number; initialCompleted?: boolean } = {},
) {
  const roleName =
    roleCode === 'DIRECTOR' ? 'Director' : 'Administrador'
  const session = {
    id: `e2e-onboarding-${roleCode.toLowerCase()}`,
    name: `${roleName} Tutorial`,
    role: 'supervisor',
    roleCode,
    roleName,
    permissions: ROLE_PERMISSIONS[roleCode],
    onboardingStep: 0,
    onboardingCompleted: options.initialCompleted ?? false,
    onboardingSeenAt: options.initialCompleted
      ? '2026-08-11T13:00:00.000Z'
      : null,
  }
  const updates: OnboardingUpdate[] = []
  const mutationEvents: string[] = []
  let serverStep = 0
  let serverCompleted = options.initialCompleted ?? false

  await page.addInitScript(
    ({ sessionKey, tokenKey, sessionValue, token }) => {
      localStorage.setItem(sessionKey, JSON.stringify(sessionValue))
      localStorage.setItem(tokenKey, token)
    },
    {
      sessionKey: AUTH_SESSION_KEY,
      tokenKey: AUTH_TOKEN_KEY,
      sessionValue: session,
      token: accessToken(roleCode),
    },
  )

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const method = request.method()

    if (path.endsWith('/auth/me')) {
      await route.fulfill({
        json: {
          user: {
            id: session.id,
            fullName: session.name,
            roleCode,
            roleName,
            coordinationId: null,
            coordinationCode: null,
            onboardingStep: serverStep,
            onboardingCompleted: serverCompleted,
            onboardingSeenAt: null,
          },
        },
      })
      return
    }

    if (path.endsWith('/users/me/onboarding') && method === 'PATCH') {
      const body = request.postDataJSON() as OnboardingUpdate
      updates.push(body)
      mutationEvents.push(`start:${body.step}`)
      if (options.delayStep === body.step) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
      serverStep = body.step
      if (body.completed !== undefined) serverCompleted = body.completed
      mutationEvents.push(`finish:${body.step}`)
      await route.fulfill({
        json: {
          id: session.id,
          fullName: session.name,
          roleCode,
          roleName,
          coordinationId: null,
          coordinationCode: null,
          onboardingStep: serverStep,
          onboardingCompleted: serverCompleted,
          onboardingSeenAt: serverCompleted
            ? '2026-08-12T13:00:00.000Z'
            : null,
        },
      })
      return
    }

    if (path.endsWith('/situations') && method === 'GET') {
      await route.fulfill({
        json: { items: [], total: 0, page: 1, limit: 100 },
      })
      return
    }

    if (path.endsWith('/coordinations') && method === 'GET') {
      await route.fulfill({ json: [] })
      return
    }

    await route.fulfill({ status: 404, json: { message: 'E2E' } })
  })

  return {
    updates,
    mutationEvents,
    serverState: () => ({ step: serverStep, completed: serverCompleted }),
  }
}

test('presenta al director un recorrido ejecutivo completo y finalizable', async ({
  page,
}) => {
  const onboarding = await installRoleOnboarding(page, 'DIRECTOR')
  await page.goto('/')

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(
    page.getByRole('heading', { name: 'Su espacio de trabajo está listo' }),
  ).toBeVisible()

  for (const expectedTitle of [
    'Una lectura ejecutiva, sin ruido de captura',
    'La operación resumida en señales',
    'Lo prioritario aparece primero',
    'Detecte concentraciones entre coordinaciones',
    'Compare la composición del estado actual',
  ]) {
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: expectedTitle }),
    ).toBeVisible()
  }

  await page.getByRole('button', { name: 'Finalizar' }).click()
  await expect(page.locator('.novex-tour')).toHaveCount(0)
  await expect
    .poll(() => onboarding.serverState())
    .toEqual({ step: 100, completed: true })
})

test('el administrador cierra el gate sin mostrar un tutorial operativo', async ({
  page,
}) => {
  const onboarding = await installRoleOnboarding(page, 'ADMIN')
  await page.goto('/')

  await expect(page).toHaveURL(/\/centro-operacional$/)
  await expect(page.locator('.novex-tour')).toHaveCount(0)
  await expect
    .poll(() => onboarding.serverState())
    .toEqual({ step: 100, completed: true })
  expect(onboarding.updates).toEqual([{ step: 100, completed: true }])
})

test('serializa reinicio y omisión para no reabrir un tutorial completado', async ({
  page,
}) => {
  const onboarding = await installRoleOnboarding(page, 'DIRECTOR', {
    delayStep: 0,
    initialCompleted: true,
  })
  await page.goto('/')

  await expect(page).toHaveURL(/\/centro-operacional$/)
  await page.locator('[data-tour="user-menu"] > button').click()
  await page.getByRole('menuitem', { name: 'Ver tutorial nuevamente' }).click()
  await expect(
    page.getByRole('heading', { name: 'Su espacio de trabajo está listo' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Omitir recorrido' }).click()

  await expect
    .poll(() => onboarding.serverState())
    .toEqual({ step: 100, completed: true })
  expect(onboarding.updates[0]).toEqual({ step: 0, completed: false })
  expect(onboarding.updates.at(-1)).toEqual({ step: 100, completed: true })
  expect(onboarding.mutationEvents).toEqual([
    'start:0',
    'finish:0',
    'start:100',
    'finish:100',
  ])
})
