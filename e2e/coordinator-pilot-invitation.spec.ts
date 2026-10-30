import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from 'playwright/test'
import { installRoleExperience, type RoleCode } from './role-experience.fixture'

/*
 * Invitación local al piloto del COORDINADOR. Solo existe en desarrollo; estas
 * pruebas corren contra el servidor de Vite (DEV = true) con datos deterministas.
 */

const COORDINATION_CODES = [
  'coord-general',
  'coord-b2b',
  'coord-bellas-artes',
  'coord-desarrollo-profesional',
  'coord-empresarial',
  'coord-especializaciones',
  'coord-ingenierias',
  'coord-operaciones-academicas',
  'coord-proyeccion-social',
  'coord-saber-pro',
  'coord-transversales',
  'coord-homologaciones',
  'coord-negocios',
  'coord-fabrica-contenidos',
  'coord-servicios',
]

const SCREENSHOT_DIR = join(process.cwd(), 'test-results', 'pilot-invitation')

async function mockOperationalOverview(page: Page) {
  await page.route('**/api/v1/operational-overview*', (route) =>
    route.fulfill({
      json: {
        directionStatus: 'ESTABLE',
        generatedAt: '2026-08-04T12:00:00.000Z',
        totals: { critical: 0, alert: 0, stable: COORDINATION_CODES.length },
        coordinations: COORDINATION_CODES.map((code, index) => ({
          id: code,
          code,
          name: code,
          shortName: code,
          color: '#28C8F4',
          displayOrder: index + 1,
          status: 'ESTABLE',
          activeProblemsCount: 0,
          criticalCount: 0,
          affectedCoordinationCount: 0,
        })),
        analystRegistry: {
          status: 'ESTABLE',
          activeProblemsCount: 0,
          criticalCount: 0,
          affectedCoordinationCount: 0,
        },
      },
    }),
  )
}

async function startFromInvitation(page: Page) {
  await page.getByTestId('pilot-invitation-start').click()
  await expect(page.locator('.novex-tour__count')).toHaveText('Paso 1 de 10')
}

/** Fracción del área del ancla que la tarjeta del globo tapa. */
async function coveredFraction(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const target = document.querySelector(sel)?.getBoundingClientRect()
    const card = document.querySelector('.novex-tour__card')?.getBoundingClientRect()
    if (!target || !card || target.width * target.height === 0) return 1
    const width = Math.min(card.right, target.right) - Math.max(card.left, target.left)
    const height = Math.min(card.bottom, target.bottom) - Math.max(card.top, target.top)
    if (width <= 0 || height <= 0) return 0
    return (width * height) / (target.width * target.height)
  }, selector)
}

test.describe('invitación al piloto · escritorio', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('el coordinador ve la invitación al entrar, sin abrir ningún menú', async ({ page }) => {
    mkdirSync(SCREENSHOT_DIR, { recursive: true })
    await installRoleExperience(page, 'COORDINADOR')
    await mockOperationalOverview(page)
    await page.goto('/')

    await expect(page.getByTestId('pilot-invitation')).toBeVisible()
    await expect(page.locator('.novex-tour')).toHaveCount(0)
    await page.screenshot({ path: join(SCREENSHOT_DIR, 'invitacion-escritorio.png') })
  })

  test('«Ahora no» cierra la invitación, deja NOVEX utilizable y no reaparece al navegar', async ({
    page,
  }) => {
    await installRoleExperience(page, 'COORDINADOR')
    await mockOperationalOverview(page)
    await page.goto('/')

    await page.getByTestId('pilot-invitation-later').click()
    await expect(page.getByTestId('pilot-invitation')).toHaveCount(0)

    // El resto de la pantalla sigue respondiendo: el menú se abre con normalidad.
    await page.getByTestId('shell-menu-trigger').click()
    await expect(page.getByTestId('shell-menu-trigger')).toHaveAttribute('aria-expanded', 'true')
    await page.getByTestId('shell-menu-trigger').click()

    // Recargar o volver a entrar en la misma pestaña no la vuelve a mostrar.
    await page.reload()
    await expect(page.getByTestId('operational-shell')).toBeVisible()
    await expect(page.getByTestId('pilot-invitation')).toHaveCount(0)
  })

  test('«Iniciar tutorial» empieza en el paso 1, con globo visible; Escape pausa y el menú lo reinicia', async ({
    page,
  }) => {
    mkdirSync(SCREENSHOT_DIR, { recursive: true })
    await installRoleExperience(page, 'COORDINADOR')
    await mockOperationalOverview(page)
    await page.goto('/')

    await startFromInvitation(page)
    await expect(page.getByTestId('pilot-invitation')).toHaveCount(0)
    await expect(page.locator('.novex-tour__card')).toBeVisible()
    await page.screenshot({ path: join(SCREENSHOT_DIR, 'paso-1-escritorio.png') })

    await page.keyboard.press('Escape')
    await expect(page.locator('.novex-tour')).toHaveCount(0)

    await page.getByTestId('shell-menu-trigger').click()
    await page.getByTestId('shell-menu-pilot').click()
    await expect(page.locator('.novex-tour__count')).toHaveText('Paso 1 de 10')
  })
})

test.describe('invitación al piloto · móvil', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('la hoja del paso «Problemas» no tapa más del 10 % de la lista resaltada', async ({
    page,
  }) => {
    mkdirSync(SCREENSHOT_DIR, { recursive: true })
    await installRoleExperience(page, 'COORDINADOR')
    await mockOperationalOverview(page)
    await page.goto('/')

    await expect(page.getByTestId('pilot-invitation')).toBeVisible()
    await page.screenshot({ path: join(SCREENSHOT_DIR, 'invitacion-movil.png') })

    await startFromInvitation(page)
    for (let n = 1; n < 5; n++) {
      await page.getByRole('button', { name: 'Siguiente' }).click()
    }
    await expect(page.locator('.novex-tour__count')).toHaveText('Paso 5 de 10')
    await expect
      .poll(() => coveredFraction(page, '[data-tour="coordination-problems"]'), { timeout: 4_000 })
      .toBeLessThanOrEqual(0.1)
    await page.screenshot({ path: join(SCREENSHOT_DIR, 'paso-5-movil.png') })
  })
})

const NON_COORDINATOR_ROLES: RoleCode[] = ['ANALISTA', 'DIRECTOR', 'ADMIN']
for (const roleCode of NON_COORDINATOR_ROLES) {
  test(`${roleCode} no recibe la invitación al piloto`, async ({ page }) => {
    await installRoleExperience(page, roleCode)
    await mockOperationalOverview(page)
    await page.goto('/')
    await expect(page.getByTestId('operational-shell')).toBeVisible()

    await expect(page.getByTestId('pilot-invitation')).toHaveCount(0)
    await expect(page.locator('.novex-tour')).toHaveCount(0)
  })
}
