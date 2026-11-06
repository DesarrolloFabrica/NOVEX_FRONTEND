import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from 'playwright/test'
import { bubbleButtonIssues } from './coordinator-pilot.helpers'
import { install, type PilotScenario } from './coordinator-pilot.fixture'

/** Paso 9 del piloto del COORDINADOR: «Reporte situaciones y consulte su historial». Escenarios en coordinator-pilot.fixture.ts. */

const SCREENSHOT_DIR = join(process.cwd(), 'test-results', 'pilot-screens-step9')

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
const IDLE = '[data-testid="action-panel-idle"]'
const INTERNAL = '[data-testid="report-internal-button"]'
const DEPENDENCY = '[data-testid="report-dependency-button"]'
const HISTORY = '[data-testid="history-open-button"]'
const REPORT_FORM = '[data-testid="report-form"]'
const REPORT_BACK = '[data-testid="report-form-back"]'
const PANEL = '[data-testid="action-panel"]'

const count = (page: Page) => page.locator('.novex-tour__count')
const title = (page: Page) => page.locator('#novex-tour-title')
const tourButton = (page: Page, name: string) =>
  page.locator('.novex-tour').getByRole('button', { name })

/** Total de pasos del recorrido: 11, o 10 sin permiso de crear (el paso 9 no existe). */
async function openPilotAtStep6(page: Page, total = 11) {
  await page.goto('/')
  await expect(page.getByTestId('operational-shell')).toBeVisible()
  await page.getByTestId('pilot-invitation-later').click()
  await page.getByTestId('shell-menu-trigger').click()
  await page.getByTestId('shell-menu-pilot').click()
  await expect(count(page)).toHaveText(`Paso 1 de ${total}`)
  for (let n = 2; n <= 6; n += 1) {
    await tourButton(page, 'Siguiente').click()
    await expect(count(page)).toHaveText(`Paso ${n} de ${total}`)
  }
}

/** Llega al paso 9 desde un problema seleccionado: 6 → 7 → 8 → 9, y vuelve del expediente. */
async function reachStep9(page: Page, rowIndex: number) {
  await page.locator(ROW).nth(rowIndex).click()
  await expect(page.locator(DETAIL)).toBeVisible()
  await tourButton(page, 'Siguiente').click()
  await expect(count(page)).toHaveText('Paso 7 de 11')
  await tourButton(page, 'Siguiente').click()
  await expect(count(page)).toHaveText('Paso 8 de 11')
  await tourButton(page, 'Siguiente').click()
  await expect(count(page)).toHaveText('Paso 9 de 11')
  // La condición previa del paso 9 pide volver del expediente con su control real.
  await page.getByTestId('detail-back').click()
  await expect(page.getByTestId('action-panel')).toHaveAttribute('data-mode', 'idle')
  await expect(title(page)).toHaveText('Reporte situaciones y consulte su historial')
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
  test.describe(`paso 9 de reportar · ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })
    // El recorrido completo hasta el paso 9 supera los 30 s por defecto con dos workers.
    test.setTimeout(150_000)

    test('resalta el bloque de reporte y consulta sin tapar sus botones ni el historial (CRITICO)', async ({ page }) => {
      const writes = await install(page, { scenario: 'CRITICO' })
      await openPilotAtStep6(page)
      await reachStep9(page, 0)

      await expect.poll(() => highlightError(page, IDLE), { timeout: 10_000 }).toBeLessThanOrEqual(3)
      await expectCardInViewport(page, 'CRITICO')
      for (const selector of [INTERNAL, DEPENDENCY, HISTORY]) {
        await expect(page.locator(selector)).toBeEnabled()
        expect(await cardCoverRatio(page, selector), `CRITICO: el globo tapa ${selector}`).toBe(0)
      }
      expect(await bubbleButtonIssues(page, 44)).toEqual([])
      expect(writes).toEqual([])
      await capture(page, `${viewport.name}-reportar-consultar`)
    })
  })
}

test.describe('paso 9 de reportar · estados, permisos y navegación', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.setTimeout(150_000)

  test('el bloque de reporte se resalta sin espacio vacío del panel', async ({ page }) => {
    await install(page, { scenario: 'CRITICO' })
    await openPilotAtStep6(page)
    await reachStep9(page, 0)
    const idle = await page.locator(IDLE).boundingBox()
    const panel = await page.locator(PANEL).boundingBox()
    expect(idle && panel && idle.height < panel.height * 0.5, 'el bloque ocupa menos de la mitad del panel').toBe(true)
  })

  test('elegir «Problema interno» abre el formulario y «Volver» regresa sin enviar nada', async ({ page }) => {
    const writes = await install(page, { scenario: 'CRITICO' })
    await openPilotAtStep6(page)
    await reachStep9(page, 0)

    await page.locator(INTERNAL).click()
    await expect(page.locator(REPORT_FORM)).toBeVisible()
    await expect(page.getByTestId('action-panel')).toHaveAttribute('data-mode', 'report')
    // La condición previa del globo vuelve a pedir regresar mientras el formulario está abierto.
    await expect(title(page)).toHaveText('Regrese a la vista de su coordinación')
    await page.locator(REPORT_BACK).click()
    await expect(page.getByTestId('action-panel')).toHaveAttribute('data-mode', 'idle')
    await expect(count(page)).toHaveText('Paso 9 de 11')
    await expect(title(page)).toHaveText('Reporte situaciones y consulte su historial')
    expect(writes).toEqual([])
  })

  test('avanza al historial (paso 10) y regresa al 9 sin escrituras', async ({ page }) => {
    const writes = await install(page, { scenario: 'CRITICO' })
    await openPilotAtStep6(page)
    await reachStep9(page, 0)
    await tourButton(page, 'Siguiente').click()
    await expect(count(page)).toHaveText('Paso 10 de 11')
    await tourButton(page, 'Anterior').click()
    await expect(count(page)).toHaveText('Paso 9 de 11')
    await expect(title(page)).toHaveText('Reporte situaciones y consulte su historial')
    expect(writes).toEqual([])
  })

  test('sin permiso de crear, el paso 9 no se muestra y el panel solo ofrece consulta', async ({ page }) => {
    const writes = await install(page, {
      scenario: 'CRITICO',
      permissions: ['SITUATIONS_VIEW', 'SITUATIONS_UPDATE', 'SITUATIONS_CLOSE', 'COORDINATIONS_VIEW'],
    })
    await openPilotAtStep6(page, 10)
    await page.locator(ROW).nth(0).click()
    await expect(page.locator(DETAIL)).toBeVisible()
    await tourButton(page, 'Siguiente').click()
    await expect(count(page)).toHaveText('Paso 7 de 10')
    await tourButton(page, 'Siguiente').click()
    await expect(count(page)).toHaveText('Paso 8 de 10')
    // Sin SITUATIONS_CREATE el paso 9 no existe: el recorrido salta del 8 al
    // historial, que pasa a ser el paso 9 de 10 (el total también cambia).
    await tourButton(page, 'Siguiente').click()
    await expect(count(page)).toHaveText('Paso 9 de 10')
    // El paso del historial pide antes volver del expediente, con su control real.
    await page.getByTestId('detail-back').click()
    await expect(title(page)).toHaveText('Problemas ya cerrados')
    // Sin SITUATIONS_CREATE el recorrido continúa al menú (paso 10 de 10) sin pasar por el reporte.
    await tourButton(page, 'Siguiente').click()
    await expect(count(page)).toHaveText('Paso 10 de 10')
    expect(writes).toEqual([])
  })

  test('sin problemas activos, el bloque sigue visible con la coordinación propia seleccionada (ESTABLE)', async ({ page }) => {
    const writes = await install(page, { scenario: 'ESTABLE' })
    await openPilotAtStep6(page)
    await tourButton(page, 'Siguiente').click()
    await expect(count(page)).toHaveText('Paso 7 de 11')
    // Sin problema, los pasos 7 y 8 solo ofrecen continuar; se espera cada control antes de pulsarlo.
    const skip = tourButton(page, 'Continuar sin este paso')
    await expect(skip).toBeVisible({ timeout: 15_000 })
    await skip.click()
    await expect(count(page)).toHaveText('Paso 8 de 11')
    await expect(skip).toBeVisible({ timeout: 15_000 })
    await skip.click()
    await expect(count(page)).toHaveText('Paso 9 de 11')
    await expect(page.locator(INTERNAL)).toBeEnabled()
    await expect.poll(() => highlightError(page, IDLE), { timeout: 10_000 }).toBeLessThanOrEqual(3)
    expect(writes).toEqual([])
  })
})
