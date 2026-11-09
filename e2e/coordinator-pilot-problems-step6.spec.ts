import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from 'playwright/test'
import { CLOSED_OWN, install, type PilotScenario } from './coordinator-pilot.fixture'

/** Paso 6 del piloto del COORDINADOR: «Problemas de su coordinación». Escenarios en coordinator-pilot.fixture.ts. */

const SCREENSHOT_DIR = join(process.cwd(), 'test-results', 'pilot-screens-step6')

const VIEWPORTS = [
  { name: 'escritorio-1440', width: 1440, height: 900 },
  { name: 'tableta-1024', width: 1024, height: 768 },
  { name: 'tableta-820', width: 820, height: 1180 },
  { name: 'movil-390', width: 390, height: 844 },
  { name: 'movil-360', width: 360, height: 740 },
] as const

const LIST = '[data-tour="coordination-problems"]'
const LIST_HEADER = `${LIST} .coordination-panel__header`
const FIRST_ROW = `${LIST} [data-testid="problem-row"]`
const EXPAND = '[data-testid="coordinator-problems-expand"]'

const count = (page: Page) => page.locator('.novex-tour__count')
const title = (page: Page) => page.locator('#novex-tour-title')
/** Botón del globo (no los de la lista ni los del expediente). */
const tourButton = (page: Page, name: string) =>
  page.locator('.novex-tour').getByRole('button', { name })

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
  await expect(title(page)).toHaveText('Problemas de su coordinación')
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
  test.describe(`paso 6 de problemas · ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test('resalta la lista, el globo no tapa encabezado, filas ni «Expandir» (CRITICO)', async ({ page }) => {
      const writes = await install(page, { scenario: 'CRITICO' })
      await openPilotAtStep6(page)

      await expect.poll(() => highlightError(page, LIST), { timeout: 4_000 }).toBeLessThanOrEqual(3)
      await expectCardInViewport(page, 'CRITICO')
      await expect(page.locator(FIRST_ROW).first()).toBeVisible()

      for (const selector of [LIST_HEADER, FIRST_ROW, EXPAND]) {
        expect(await cardCoverRatio(page, selector), `CRITICO: el globo tapa ${selector}`).toBe(0)
      }
      await capture(page, `${viewport.name}-critico`)
      expect(writes).toEqual([])
    })

    test('sin situaciones activas, explica la lista vacía y no bloquea el recorrido (ESTABLE)', async ({ page }) => {
      const writes = await install(page, { scenario: 'ESTABLE' })
      await openPilotAtStep6(page)

      await expect(page.getByTestId('coordinator-to-resolve-empty')).toBeVisible()
      await expect(page.getByTestId('coordinator-affecting-empty')).toBeVisible()
      await expect(page.locator(FIRST_ROW)).toHaveCount(0)
      // El cerrado existe, pero el panel de problemas solo lista los activos.
      await expect(page.locator(LIST).getByText(CLOSED_OWN.title)).toHaveCount(0)
      await expect.poll(() => highlightError(page, LIST), { timeout: 4_000 }).toBeLessThanOrEqual(3)
      await expectCardInViewport(page, 'ESTABLE')
      await capture(page, `${viewport.name}-vacio`)
      expect(writes).toEqual([])
    })

    test('un problema interno abierto aparece en «Debo resolver» (UN_REPORTE)', async ({ page }) => {
      const writes = await install(page, { scenario: 'UN_REPORTE' })
      await openPilotAtStep6(page)

      await expect(page.locator(`${LIST} [data-testid="problem-row"]`)).toHaveCount(1)
      await expect(page.getByTestId('coordinator-to-resolve').locator('[data-testid="problem-row"]')).toHaveCount(1)
      await expect(page.getByTestId('coordinator-affecting').locator('[data-testid="problem-row"]')).toHaveCount(0)
      expect(await cardCoverRatio(page, FIRST_ROW), 'UN_REPORTE: el globo tapa la fila').toBe(0)
      await capture(page, `${viewport.name}-interno`)
      expect(writes).toEqual([])
    })
  })
}

test.describe('paso 6 de problemas · interacción', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('elegir una situación no avanza el recorrido y el paso 7 reconoce el expediente', async ({ page }) => {
    const writes = await install(page, { scenario: 'CRITICO' })
    await openPilotAtStep6(page)

    await page.locator(FIRST_ROW).first().click()
    await expect(page.locator('[data-tour="problem-detail"]')).toBeVisible()
    await expect(count(page)).toHaveText('Paso 6 de 11')

    await tourButton(page, 'Siguiente').click()
    await expect(count(page)).toHaveText('Paso 7 de 11')
    await expect(title(page)).toHaveText('Conozca los detalles de una situación')
    await expect(page.getByText('Todavía no hay un problema seleccionado')).toHaveCount(0)
    expect(writes).toEqual([])
  })

  test('Anterior vuelve al paso 5 y Siguiente regresa al paso 6 sin perder la lista', async ({ page }) => {
    await install(page, { scenario: 'CRITICO' })
    await openPilotAtStep6(page)

    await tourButton(page, 'Anterior').click()
    await expect(count(page)).toHaveText('Paso 5 de 11')
    await tourButton(page, 'Siguiente').click()
    await expect(count(page)).toHaveText('Paso 6 de 11')
    await expect(page.locator(FIRST_ROW).first()).toBeVisible()
  })

  test('«Expandir» alterna su estado sin tocar la selección', async ({ page }) => {
    await install(page, { scenario: 'CRITICO' })
    await openPilotAtStep6(page)

    const toggle = page.locator(EXPAND)
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(count(page)).toHaveText('Paso 6 de 11')
  })
})
