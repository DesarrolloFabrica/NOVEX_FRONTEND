import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from 'playwright/test'
import { bubbleButtonIssues } from './coordinator-pilot.helpers'
import { CLOSED_OWN, install, type PilotScenario } from './coordinator-pilot.fixture'

/** Paso 7 del piloto del COORDINADOR: «Conozca los detalles de una situación». Escenarios en coordinator-pilot.fixture.ts. */

const SCREENSHOT_DIR = join(process.cwd(), 'test-results', 'pilot-screens-step7')

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
const DETAIL_TITLE = '#problem-detail-title'
const DETAIL_CONTEXT = '[data-testid="detail-context"]'
const ACTIONS = '[data-tour="problem-actions"]'
const NOTICE = '.novex-tour__notice'

const count = (page: Page) => page.locator('.novex-tour__count')
const title = (page: Page) => page.locator('#novex-tour-title')
const tourButton = (page: Page, name: string) =>
  page.locator('.novex-tour').getByRole('button', { name })

async function openPilotAtStep6(page: Page, scenario: PilotScenario) {
  await install(page, { scenario })
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

async function openPilotAtStep5(page: Page, scenario: PilotScenario) {
  await install(page, { scenario })
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
}

/** Elige un problema de la lista del paso 6 y continúa al paso 7. */
async function selectRowAndContinue(page: Page, index: number) {
  await page.locator(ROW).nth(index).click()
  await expect(page.locator(DETAIL)).toBeVisible()
  await tourButton(page, 'Siguiente').click()
  await expect(count(page)).toHaveText('Paso 7 de 11')
  await expect(title(page)).toHaveText('Conozca los detalles de una situación')
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
  test.describe(`paso 7 de expediente · ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test('resalta el expediente, el globo no tapa su título ni sus datos y los botones miden 44 px (interno abierto)', async ({ page }) => {
      await openPilotAtStep6(page, 'UN_REPORTE')
      await selectRowAndContinue(page, 0)

      await expect.poll(() => highlightError(page, DETAIL), { timeout: 4_000 }).toBeLessThanOrEqual(3)
      await expectCardInViewport(page, 'UN_REPORTE')
      for (const selector of [DETAIL_TITLE, DETAIL_CONTEXT]) {
        expect(await cardCoverRatio(page, selector), `UN_REPORTE: el globo tapa ${selector}`).toBe(0)
      }
      // El expediente no debe incluir los controles de avance del paso 8.
      expect(await page.locator(DETAIL).locator(ACTIONS).count()).toBe(0)
      expect(await bubbleButtonIssues(page, 44)).toEqual([])
      await capture(page, `${viewport.name}-interno`)
    })

    test('dependencia en atención donde la responsable es otra coordinación (CRITICO, fila de «Afectan mi coordinación»)', async ({ page }) => {
      await openPilotAtStep6(page, 'CRITICO')
      await selectRowAndContinue(page, 2)

      await expect.poll(() => highlightError(page, DETAIL), { timeout: 4_000 }).toBeLessThanOrEqual(3)
      await expectCardInViewport(page, 'CRITICO-afectada')
      for (const selector of [DETAIL_TITLE, DETAIL_CONTEXT, '.problem-detail__badges']) {
        expect(await cardCoverRatio(page, selector), `CRITICO-afectada: el globo tapa ${selector}`).toBe(0)
      }
      expect(await bubbleButtonIssues(page, 44)).toEqual([])
      await capture(page, `${viewport.name}-dependencia-otra-coordinacion`)
    })
  })
}

test.describe('paso 7 de expediente · estados y navegación', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('una dependencia en atención (CRITICO, primera fila) se lee con su título y su contexto', async ({ page }) => {
    const writes = await install(page, { scenario: 'CRITICO' })
    await openPilotAtStep6(page, 'CRITICO')
    await selectRowAndContinue(page, 0)
    await expect(page.locator(DETAIL_CONTEXT)).toBeVisible()
    await expect(page.locator(DETAIL)).toHaveAttribute('data-report-kind', 'INTER_COORDINATION')
    await capture(page, 'escritorio-1440-dependencia-en-atencion')
    expect(writes).toEqual([])
  })

  test('un problema cerrado se consulta desde «Mis reportes» y el paso 7 lo muestra en solo lectura', async ({ page }) => {
    const writes = await install(page, { scenario: 'VARIOS_REPORTES' })
    await openPilotAtStep5(page, 'VARIOS_REPORTES')
    await page.locator('[data-tour="my-reports"]').getByText(CLOSED_OWN.title).click()
    await expect(page.locator(DETAIL)).toBeVisible()
    await tourButton(page, 'Siguiente').click()
    await expect(count(page)).toHaveText('Paso 6 de 11')
    await tourButton(page, 'Siguiente').click()
    await expect(count(page)).toHaveText('Paso 7 de 11')
    await expect(page.getByTestId('detail-status')).toHaveAttribute('data-status', 'CLOSED')
    await capture(page, 'escritorio-1440-cerrado')
    expect(writes).toEqual([])
  })

  test('sin expediente, el paso 7 explica la ausencia y permite continuar sin él', async ({ page }) => {
    await install(page, { scenario: 'UN_REPORTE' })
    await openPilotAtStep6(page, 'UN_REPORTE')
    await tourButton(page, 'Siguiente').click()
    await expect(count(page)).toHaveText('Paso 7 de 11')
    await expect(page.locator(NOTICE)).toContainText('Todavía no hay un problema seleccionado')
    await expect(tourButton(page, 'Continuar sin este paso')).toBeVisible()
    await expect(page.locator(DETAIL)).toHaveCount(0)
    await capture(page, 'escritorio-1440-sin-expediente')
  })

  test('cerrar el expediente durante el recorrido no avanza el paso y elegir otro problema lo hace reaparecer', async ({ page }) => {
    await install(page, { scenario: 'CRITICO' })
    await openPilotAtStep6(page, 'CRITICO')
    await selectRowAndContinue(page, 0)
    const first = await page.locator(DETAIL).getAttribute('data-problem')

    await page.getByTestId('detail-back').click()
    await expect(page.locator(DETAIL)).toHaveCount(0)
    await expect(count(page)).toHaveText('Paso 7 de 11')
    await expect(page.locator(NOTICE)).toContainText('Todavía no hay un problema seleccionado')

    await page.locator(ROW).nth(2).click()
    await expect(page.locator(DETAIL)).toBeVisible()
    await expect(page.locator(DETAIL)).not.toHaveAttribute('data-problem', first ?? '')
    await expect(count(page)).toHaveText('Paso 7 de 11')
  })

  test('navegación 6 → 7 → 8 → 7 → 6 conserva la selección', async ({ page }) => {
    await install(page, { scenario: 'UN_REPORTE' })
    await openPilotAtStep6(page, 'UN_REPORTE')
    await selectRowAndContinue(page, 0)
    const selected = await page.locator(DETAIL).getAttribute('data-problem')

    await tourButton(page, 'Siguiente').click()
    await expect(count(page)).toHaveText('Paso 8 de 11')
    await expect(page.locator(ACTIONS)).toBeVisible()

    await tourButton(page, 'Anterior').click()
    await expect(count(page)).toHaveText('Paso 7 de 11')
    await expect(page.locator(DETAIL)).toHaveAttribute('data-problem', selected ?? '')

    await tourButton(page, 'Anterior').click()
    await expect(count(page)).toHaveText('Paso 6 de 11')
  })
})
