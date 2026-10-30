import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from 'playwright/test'
import { installRoleExperience, type RoleCode } from './role-experience.fixture'

/*
 * Piloto manual del recorrido del COORDINADOR.
 *
 * Datos deterministas: overview con quince coordinaciones reales y sin
 * situaciones. El piloto solo lee el DOM; estas pruebas comprueban además que
 * ninguna petición de escritura sale hacia el backend.
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

function overviewPayload() {
  return {
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
  }
}

const PILOT_STATUS_KEY = 'novex.onboarding.pilot.coordinador-piloto.v1.e2e-coordinador'
const SCREENSHOT_DIR = join(process.cwd(), 'test-results', 'pilot-screens')

const VIEWPORTS = [
  { name: 'escritorio-1440', width: 1440, height: 900 },
  { name: 'tableta-1024', width: 1024, height: 768 },
  { name: 'tableta-820', width: 820, height: 1180 },
  { name: 'movil-390', width: 390, height: 844 },
] as const

/** Paso a paso del recorrido. `missing` indica que el paso depende de datos y no hay problemas. */
const WALK: Array<{
  n: number
  target: string | null
  missing?: string
  capture?: boolean
}> = [
  { n: 1, target: null, capture: true },
  { n: 2, target: '[data-tour="own-coordination"] [data-testid="coordination-card"]', capture: true },
  { n: 3, target: '[data-tour="own-coordination"] [data-testid="coordination-card-status"]' },
  {
    n: 4,
    target: '[data-tour="operational-shell"] [data-testid="direction-character"]',
    capture: true,
  },
  { n: 5, target: '[data-tour="my-reports"] [data-testid="my-reports"]' },
  { n: 6, target: '[data-tour="coordination-problems"]', capture: true },
  {
    n: 7,
    target: '[data-tour="problem-detail"]',
    missing: 'Todavía no hay un problema seleccionado',
  },
  {
    n: 8,
    target: '[data-tour="problem-actions"]',
    missing: 'Estas acciones aparecen al abrir un problema',
  },
  { n: 9, target: '[data-tour="action-panel"]', capture: true },
  { n: 10, target: '[data-tour="history-open"]' },
  { n: 11, target: '[data-tour="center-menu"]', capture: true },
]

async function mockOperationalOverview(page: Page) {
  await page.route('**/api/v1/operational-overview*', (route) =>
    route.fulfill({ json: overviewPayload() }),
  )
}

function trackWrites(page: Page): string[] {
  const writes: string[] = []
  page.on('request', (request) => {
    if (request.method() !== 'GET' && request.url().includes('/api/v1/')) {
      writes.push(`${request.method()} ${new URL(request.url()).pathname}`)
    }
  })
  return writes
}

async function openPilot(page: Page) {
  await page.getByTestId('shell-menu-trigger').click()
  await page.getByTestId('shell-menu-pilot').click()
  await expect(page.locator('.novex-tour__count')).toHaveText('Paso 1 de 11')
}

/** Diferencia máxima entre el resaltado y el ancla, con las mismas reglas de recorte del motor. */
async function highlightError(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const target = document.querySelector(sel)?.getBoundingClientRect()
    const spot = document.querySelector('.novex-tour__spotlight')?.getBoundingClientRect()
    if (!target || !spot) return Number.POSITIVE_INFINITY
    const expectedLeft = Math.max(8, target.left - 10)
    const expectedTop = Math.max(8, target.top - 10)
    const expectedWidth = Math.min(window.innerWidth - 16, target.width + 20)
    const expectedHeight = Math.min(window.innerHeight - 16, target.height + 20)
    return Math.max(
      Math.abs(spot.left - expectedLeft),
      Math.abs(spot.top - expectedTop),
      Math.abs(spot.width - expectedWidth),
      Math.abs(spot.height - expectedHeight),
    )
  }, selector)
}

/** Área de solapamiento entre la tarjeta del globo y el ancla explicado. */
async function cardOverlapArea(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const card = document.querySelector('.novex-tour__card')?.getBoundingClientRect()
    const target = document.querySelector(sel)?.getBoundingClientRect()
    if (!card || !target) return 0
    const width = Math.min(card.right, target.right) - Math.max(card.left, target.left)
    const height = Math.min(card.bottom, target.bottom) - Math.max(card.top, target.top)
    return width > 0 && height > 0 ? width * height : 0
  }, selector)
}

async function cardFitsViewport(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const card = document.querySelector('.novex-tour__card')?.getBoundingClientRect()
    if (!card) return false
    return (
      card.left >= -1 &&
      card.top >= -1 &&
      card.right <= window.innerWidth + 1 &&
      card.bottom <= window.innerHeight + 1
    )
  })
}

async function isSheet(page: Page): Promise<boolean> {
  return page.locator('.novex-tour__card--sheet').count().then((count) => count > 0)
}

for (const viewport of VIEWPORTS) {
  test.describe(`piloto del COORDINADOR · ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test('recorre los once pasos con resaltado alineado, globos visibles y sin escrituras', async ({
      page,
    }) => {
      mkdirSync(SCREENSHOT_DIR, { recursive: true })
      await installRoleExperience(page, 'COORDINADOR')
      await mockOperationalOverview(page)
      const writes = trackWrites(page)
      await page.goto('/')
      await expect(page.getByTestId('operational-shell')).toBeVisible()
      await openPilot(page)

      for (const item of WALK) {
        await expect(page.locator('.novex-tour__count')).toHaveText(`Paso ${item.n} de 11`)

        if (item.missing) {
          // Sin problemas no hay detalle: el paso explica el estado vacío y espera al usuario.
          await expect(page.locator('.novex-tour__notice')).toContainText(item.missing, {
            timeout: 12_000,
          })
          await expect(page.locator('.novex-tour__count')).toHaveText(`Paso ${item.n} de 11`)
          await page.getByRole('button', { name: 'Continuar sin este paso' }).click()
          continue
        }

        if (item.target) {
          await expect
            .poll(() => highlightError(page, item.target as string), { timeout: 4_000 })
            .toBeLessThanOrEqual(3)
          if (!(await isSheet(page))) {
            expect(
              await cardOverlapArea(page, item.target),
              `paso ${item.n}: el globo tapa el ancla`,
            ).toBe(0)
          }
        }
        expect(await cardFitsViewport(page), `paso ${item.n}: el globo sale de la pantalla`).toBe(true)

        if (item.capture) {
          await page.screenshot({
            path: join(SCREENSHOT_DIR, `${viewport.name}-paso-${item.n}.png`),
          })
        }

        if (item.n < 11) {
          await page.getByRole('button', { name: 'Siguiente' }).click()
        } else {
          await page.getByRole('button', { name: 'Finalizar' }).click()
        }
      }

      await expect(page.locator('.novex-tour')).toHaveCount(0)
      const stored = await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
        PILOT_STATUS_KEY,
      )
      expect(stored).toMatchObject({ status: 'completed', stepIndex: 10 })
      expect(writes, 'el piloto no debe escribir en el backend').toEqual([])
    })
  })
}

test.describe('piloto del COORDINADOR · controles', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('Anterior vuelve un paso y Escape pausa sin perder el lugar', async ({ page }) => {
    await installRoleExperience(page, 'COORDINADOR')
    await mockOperationalOverview(page)
    await page.goto('/')
    await openPilot(page)

    await page.getByRole('button', { name: 'Siguiente' }).click()
    await page.getByRole('button', { name: 'Siguiente' }).click()
    await expect(page.locator('.novex-tour__count')).toHaveText('Paso 3 de 11')
    await page.getByRole('button', { name: 'Anterior' }).click()
    await expect(page.locator('.novex-tour__count')).toHaveText('Paso 2 de 11')

    await page.keyboard.press('Escape')
    await expect(page.locator('.novex-tour')).toHaveCount(0)
    await expect
      .poll(() =>
        page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key) ?? 'null')?.status,
          PILOT_STATUS_KEY,
        ),
      )
      .toBe('in-progress')
  })

  test('Omitir cierra el piloto y reiniciarlo vuelve al paso 1', async ({ page }) => {
    await installRoleExperience(page, 'COORDINADOR')
    await mockOperationalOverview(page)
    const writes = trackWrites(page)
    await page.goto('/')
    await openPilot(page)

    await page.getByRole('button', { name: 'Omitir recorrido' }).click()
    await expect(page.locator('.novex-tour')).toHaveCount(0)

    await openPilot(page)
    await expect(page.locator('.novex-tour__count')).toHaveText('Paso 1 de 11')
    expect(writes).toEqual([])
  })

  test('el atajo de teclado navega y no escribe en el backend', async ({ page }) => {
    await installRoleExperience(page, 'COORDINADOR')
    await mockOperationalOverview(page)
    const writes = trackWrites(page)
    await page.goto('/')
    await openPilot(page)

    await page.keyboard.press('ArrowRight')
    await expect(page.locator('.novex-tour__count')).toHaveText('Paso 2 de 11')
    await page.keyboard.press('ArrowLeft')
    await expect(page.locator('.novex-tour__count')).toHaveText('Paso 1 de 11')
    expect(writes).toEqual([])
  })
})

const NON_COORDINATOR_ROLES: RoleCode[] = ['ANALISTA', 'DIRECTOR', 'ADMIN']
for (const roleCode of NON_COORDINATOR_ROLES) {
  test(`${roleCode} no ve el piloto del COORDINADOR en el menú`, async ({ page }) => {
    await installRoleExperience(page, roleCode)
    await mockOperationalOverview(page)
    await page.goto('/')
    await expect(page.getByTestId('operational-shell')).toBeVisible()

    await page.getByTestId('shell-menu-trigger').click()
    await expect(page.getByTestId('shell-menu-pilot')).toHaveCount(0)
    await expect(page.locator('.novex-tour')).toHaveCount(0)
  })
}
