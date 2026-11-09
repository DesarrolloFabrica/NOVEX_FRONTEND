import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from 'playwright/test'
import { bubbleButtonIssues } from './coordinator-pilot.helpers'
import { CLOSED_OWN, install, type PilotScenario } from './coordinator-pilot.fixture'

/** Paso 8 del piloto del COORDINADOR: «Seguimiento y resolución». Escenarios en coordinator-pilot.fixture.ts. */

const SCREENSHOT_DIR = join(process.cwd(), 'test-results', 'pilot-screens-step8')

const VIEWPORTS = [
  { name: 'escritorio-1440', width: 1440, height: 900 },
  { name: 'tableta-1024', width: 1024, height: 768 },
  { name: 'tableta-820', width: 820, height: 1180 },
  { name: 'movil-390', width: 390, height: 844 },
  { name: 'movil-360', width: 360, height: 740 },
] as const

const LIST = '[data-tour="coordination-problems"]'
const ROW = `${LIST} [data-testid="problem-row"]`
const DETAIL = '[data-tour="problem-detail"]'
const ACTIONS = '[data-tour="problem-actions"]'
const ADVANCE = '[data-testid="status-advance-button"]'
const RESOLVE_FORM = '[data-testid="resolve-form"]'
const NOT_ALLOWED = '[data-testid="resolve-not-allowed"]'
const NOTICE = '.novex-tour__notice'

const count = (page: Page) => page.locator('.novex-tour__count')
const title = (page: Page) => page.locator('#novex-tour-title')
const tourButton = (page: Page, name: string) =>
  page.locator('.novex-tour').getByRole('button', { name })

/** Recorrido hasta el paso 6 con el escenario ya instalado. */
async function openPilotAtStep6(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('operational-shell')).toBeVisible()
  await page.getByTestId('pilot-invitation-later').click()
  await page.getByTestId('shell-menu-trigger').click()
  await page.getByTestId('shell-menu-pilot').click()
  await expect(count(page)).toHaveText('Paso 1 de 11')
  for (let n = 2; n <= 6; n += 1) {
    await tourButton(page, 'Siguiente').click()
    await expect(count(page)).toHaveText(`Paso ${n} de 11`)
  }
}

/** Elige una fila de la lista del paso 6 y llega al paso 8 sin pulsar ninguna acción operacional. */
async function reachStep8(page: Page, rowIndex: number) {
  await page.locator(ROW).nth(rowIndex).click()
  await expect(page.locator(DETAIL)).toBeVisible()
  await tourButton(page, 'Siguiente').click()
  await expect(count(page)).toHaveText('Paso 7 de 11')
  await tourButton(page, 'Siguiente').click()
  await expect(count(page)).toHaveText('Paso 8 de 11')
  await expect(title(page)).toHaveText('Seguimiento y resolución')
  await expect(page.locator(ACTIONS)).toBeVisible()
}

/** Diferencia máxima entre el resaltado y el ancla, con las reglas de recorte del motor. */
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

/** Fracción visible del elemento (recortada a la ventana) que tapa el globo. */
async function cardCoverRatio(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const card = document.querySelector('.novex-tour__card')?.getBoundingClientRect()
    const raw = document.querySelector(sel)?.getBoundingClientRect()
    if (!card || !raw) return 0
    const top = Math.max(0, raw.top)
    const bottom = Math.min(window.innerHeight, raw.bottom)
    const left = Math.max(0, raw.left)
    const right = Math.min(window.innerWidth, raw.right)
    const visible = Math.max(0, right - left) * Math.max(0, bottom - top)
    if (visible === 0) return 0
    const width = Math.min(card.right, right) - Math.max(card.left, left)
    const height = Math.min(card.bottom, bottom) - Math.max(card.top, top)
    return width > 0 && height > 0 ? (width * height) / visible : 0
  }, selector)
}

async function expectCardInViewport(page: Page, label: string) {
  const fits = await page.evaluate(() => {
    const card = document.querySelector('.novex-tour__card')?.getBoundingClientRect()
    if (!card) return false
    return (
      card.left >= -1 &&
      card.top >= -1 &&
      card.right <= window.innerWidth + 1 &&
      card.bottom <= window.innerHeight + 1
    )
  })
  expect(fits, `${label}: el globo sale de la pantalla`).toBe(true)
}

async function capture(page: Page, name: string) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true })
  await page.screenshot({ path: join(SCREENSHOT_DIR, `${name}.png`) })
}

for (const viewport of VIEWPORTS) {
  test.describe(`paso 8 de seguimiento · ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test('problema propio abierto: avance y cierre disponibles, el globo no tapa las acciones', async ({ page }) => {
      const writes = await install(page, { scenario: 'UN_REPORTE' })
      await openPilotAtStep6(page)
      await reachStep8(page, 0)

      await expect.poll(() => highlightError(page, ACTIONS), { timeout: 4_000 }).toBeLessThanOrEqual(3)
      await expectCardInViewport(page, 'abierto')
      await expect(page.locator(ADVANCE)).toBeEnabled()
      await expect(page.locator(RESOLVE_FORM)).toBeVisible()
      for (const selector of [ADVANCE, RESOLVE_FORM]) {
        expect(await cardCoverRatio(page, selector), `abierto: el globo tapa ${selector}`).toBe(0)
      }
      expect(await bubbleButtonIssues(page, 44)).toEqual([])
      // El tutorial solo explica: ningún clic operacional ni escritura.
      expect(writes).toEqual([])
      await capture(page, `${viewport.name}-abierto-avance-y-cierre`)
    })

    test('problema propio en atención: solo cierre, sin botón de avance', async ({ page }) => {
      const writes = await install(page, { scenario: 'CRITICO' })
      await openPilotAtStep6(page)
      await reachStep8(page, 0)

      await expect.poll(() => highlightError(page, ACTIONS), { timeout: 4_000 }).toBeLessThanOrEqual(3)
      await expectCardInViewport(page, 'en atención')
      await expect(page.locator(ADVANCE)).toHaveCount(0)
      await expect(page.locator(RESOLVE_FORM)).toBeVisible()
      expect(await cardCoverRatio(page, RESOLVE_FORM), 'en atención: el globo tapa el cierre').toBe(0)
      expect(writes).toEqual([])
      await capture(page, `${viewport.name}-en-atencion-solo-cierre`)
    })

    test('problema de otra coordinación: sin acciones y con el aviso de responsable', async ({ page }) => {
      const writes = await install(page, { scenario: 'CRITICO' })
      await openPilotAtStep6(page)
      await reachStep8(page, 2)

      await expect.poll(() => highlightError(page, ACTIONS), { timeout: 4_000 }).toBeLessThanOrEqual(3)
      await expect(page.locator(ADVANCE)).toHaveCount(0)
      await expect(page.locator(RESOLVE_FORM)).toHaveCount(0)
      await expect(page.locator(NOT_ALLOWED)).toBeVisible()
      expect(writes).toEqual([])
      await capture(page, `${viewport.name}-otra-coordinacion`)
    })
  })
}

test.describe('paso 8 de seguimiento · estados y navegación', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('problema cerrado: solo el registro del aprendizaje, sin acciones', async ({ page }) => {
    const writes = await install(page, { scenario: 'VARIOS_REPORTES' })
    await page.goto('/')
    await expect(page.getByTestId('operational-shell')).toBeVisible()
    await page.getByTestId('pilot-invitation-later').click()
    await page.getByTestId('shell-menu-trigger').click()
    await page.getByTestId('shell-menu-pilot').click()
    await expect(count(page)).toHaveText('Paso 1 de 11')
    for (let n = 2; n <= 5; n += 1) {
      await tourButton(page, 'Siguiente').click()
      await expect(count(page)).toHaveText(`Paso ${n} de 11`)
    }
    await page.locator('[data-tour="my-reports"]').getByText(CLOSED_OWN.title).click()
    await expect(page.locator(DETAIL)).toBeVisible()
    for (const n of [6, 7, 8]) {
      await tourButton(page, 'Siguiente').click()
      await expect(count(page)).toHaveText(`Paso ${n} de 11`)
    }
    await expect(page.locator(ACTIONS)).toHaveAttribute('data-resolved', 'true')
    await expect(page.locator(ADVANCE)).toHaveCount(0)
    await expect(page.locator(RESOLVE_FORM)).toHaveCount(0)
    expect(writes).toEqual([])
    await capture(page, 'escritorio-1440-cerrado-solo-lectura')
  })

  test('sin expediente, el paso 8 explica la ausencia y permite continuar sin él', async ({ page }) => {
    await install(page, { scenario: 'UN_REPORTE' })
    await openPilotAtStep6(page)
    await tourButton(page, 'Siguiente').click()
    await expect(count(page)).toHaveText('Paso 7 de 11')
    await tourButton(page, 'Continuar sin este paso').click()
    await expect(count(page)).toHaveText('Paso 8 de 11')
    await expect(page.locator(NOTICE)).toContainText('Estas acciones aparecen al abrir un problema')
    await expect(tourButton(page, 'Continuar sin este paso')).toBeVisible()
    await expect(page.locator(ACTIONS)).toHaveCount(0)
  })

  test('navegación 7 → 8 → 9 y regreso 8 → 7 conserva el expediente', async ({ page }) => {
    await install(page, { scenario: 'UN_REPORTE' })
    await openPilotAtStep6(page)
    await page.locator(ROW).nth(0).click()
    await expect(page.locator(DETAIL)).toBeVisible()
    const selected = await page.locator(DETAIL).getAttribute('data-problem')
    await tourButton(page, 'Siguiente').click()
    await expect(count(page)).toHaveText('Paso 7 de 11')
    await tourButton(page, 'Siguiente').click()
    await expect(count(page)).toHaveText('Paso 8 de 11')
    await tourButton(page, 'Siguiente').click()
    await expect(count(page)).toHaveText('Paso 9 de 11')
    await tourButton(page, 'Anterior').click()
    await expect(count(page)).toHaveText('Paso 8 de 11')
    await tourButton(page, 'Anterior').click()
    await expect(count(page)).toHaveText('Paso 7 de 11')
    await expect(page.locator(DETAIL)).toHaveAttribute('data-problem', selected ?? '')
  })
})
