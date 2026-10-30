import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from 'playwright/test'
import {
  AFFECTING,
  CLOSED_OWN,
  IN_PROGRESS_OWN,
  install,
  OPEN_OWN,
} from './coordinator-pilot.fixture'

/** Piloto del COORDINADOR con problemas registrados (pasos 7 a 10). Escenario en coordinator-pilot.fixture.ts. */

const SCREENSHOT_DIR = join(process.cwd(), 'test-results', 'pilot-screens-problems')

const VIEWPORTS = [
  { name: 'escritorio-1440', width: 1440, height: 900 },
  { name: 'tableta-1024', width: 1024, height: 768 },
  { name: 'tableta-820', width: 820, height: 1180 },
  { name: 'movil-390', width: 390, height: 844 },
] as const

const LIST = '[data-tour="coordination-problems"]'
const DETAIL = '[data-tour="problem-detail"]'
const ACTIONS = '[data-tour="problem-actions"]'
const PANEL = '[data-tour="action-panel"]'
const HISTORY_OPEN = '[data-tour="history-open"]'

const count = (page: Page) => page.locator('.novex-tour__count')
const title = (page: Page) => page.locator('#novex-tour-title')
const notice = (page: Page) => page.locator('.novex-tour__notice')
/** Botón del globo (el expediente tiene sus propios «Reintentar» y «Volver»). */
const tourButton = (page: Page, name: string) =>
  page.locator('.novex-tour').getByRole('button', { name })
const row = (page: Page, text: string) =>
  page.getByTestId('problem-row').filter({ hasText: text })

async function openPilotAt(page: Page, step: number) {
  await page.goto('/')
  await expect(page.getByTestId('operational-shell')).toBeVisible()
  await page.getByTestId('pilot-invitation-later').click()
  await page.getByTestId('shell-menu-trigger').click()
  await page.getByTestId('shell-menu-pilot').click()
  await expect(count(page)).toHaveText('Paso 1 de 11')
  for (let n = 2; n <= step; n += 1) {
    // Sin problema seleccionado, los pasos 7 y 8 solo ofrecen continuar sin ellos.
    const next = tourButton(page, 'Siguiente')
    const skip = tourButton(page, 'Continuar sin este paso')
    await expect(next.or(skip)).toBeVisible({ timeout: 12_000 })
    await ((await next.isVisible()) ? next : skip).click()
    await expect(count(page)).toHaveText(`Paso ${n} de 11`)
  }
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

async function expectAligned(page: Page, selector: string) {
  await expect.poll(() => highlightError(page, selector), { timeout: 4_000 }).toBeLessThanOrEqual(3)
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

async function expectUncovered(page: Page, selector: string, label: string) {
  expect(await cardCoverRatio(page, selector), `${label}: el globo tapa ${selector}`).toBe(0)
}

async function capture(page: Page, name: string) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true })
  await page.screenshot({ path: join(SCREENSHOT_DIR, `${name}.png`) })
}

/** Paso 9 sobre la vista principal: opciones reales, sin abrir formularios. */
async function expectReportOptions(page: Page, label: string) {
  await expect(count(page)).toHaveText('Paso 9 de 11')
  await expect(title(page)).toHaveText('Reportar o consultar')
  await expectAligned(page, PANEL)
  const panel = page.getByTestId('action-panel')
  await expect(panel).toHaveAttribute('data-mode', 'idle')
  await expect(panel).toHaveAttribute('data-can-create', 'true')
  for (const testId of ['report-internal-button', 'report-dependency-button', 'history-open-button']) {
    await expect(panel.getByTestId(testId)).toBeEnabled()
    await expectUncovered(page, `[data-testid="${testId}"]`, label)
  }
  await expectCardInViewport(page, label)
}

for (const viewport of VIEWPORTS) {
  test.describe(`piloto con problemas · ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test('del expediente al panel: pasos 7 a 11 con un problema abierto propio, sin escrituras', async ({
      page,
    }) => {
      const writes = await install(page)
      await openPilotAt(page, 6)

      // Paso 6: la lista está resaltada y se elige un problema dentro del hueco.
      await expectAligned(page, LIST)
      await row(page, OPEN_OWN.title).click()
      await expect(page.getByTestId('problem-detail')).toBeVisible()

      // Paso 7: el expediente.
      await tourButton(page, 'Siguiente').click()
      await expect(count(page)).toHaveText('Paso 7 de 11')
      await expect(notice(page)).toHaveCount(0)
      await expectAligned(page, DETAIL)
      await expect(page.getByTestId('detail-status')).toContainText('Abierto')
      await expectCardInViewport(page, 'paso 7')
      expect(await cardCoverRatio(page, DETAIL)).toBeLessThanOrEqual(0.35)
      await capture(page, `${viewport.name}-paso-7-expediente`)

      // Paso 8: acciones que corresponden a sus permisos, sin pulsarlas.
      await tourButton(page, 'Siguiente').click()
      await expect(count(page)).toHaveText('Paso 8 de 11')
      await expectAligned(page, ACTIONS)
      const actions = page.getByTestId('problem-actions')
      await expect(actions).toHaveAttribute('data-can-advance', 'true')
      await expect(actions).toHaveAttribute('data-can-resolve', 'true')
      await expect(actions.getByTestId('status-advance-button')).toBeEnabled()
      await expect(actions.getByTestId('resolve-form')).toBeVisible()
      await expect(actions.getByTestId('resolve-submit')).toBeDisabled()
      await expectCardInViewport(page, 'paso 8')
      await capture(page, `${viewport.name}-paso-8-acciones`)

      // Paso 9 con el expediente abierto: pide volver y resalta la flecha real.
      await tourButton(page, 'Siguiente').click()
      await expect(count(page)).toHaveText('Paso 9 de 11')
      await expect(title(page)).toHaveText('Regrese a la vista de su coordinación')
      await expect(page.locator('.novex-tour__waiting')).toHaveText('Esperando que cierre la vista')
      await expect(tourButton(page, 'Siguiente')).toHaveCount(0)
      await expectAligned(page, '[data-testid="detail-back"]')
      await expectUncovered(page, '[data-testid="detail-back"]', 'paso 9 · volver')
      await expectCardInViewport(page, 'paso 9 · volver')
      await capture(page, `${viewport.name}-paso-9-volver`)

      // El usuario cierra el expediente: el paso 9 explica las opciones reales.
      await page.getByTestId('detail-back').click()
      await expectReportOptions(page, 'paso 9')
      await capture(page, `${viewport.name}-paso-9-opciones`)

      // Paso 10: el acceso real al historial.
      await tourButton(page, 'Siguiente').click()
      await expect(count(page)).toHaveText('Paso 10 de 11')
      await expect(notice(page)).toHaveCount(0)
      await expectAligned(page, HISTORY_OPEN)
      await expectUncovered(page, HISTORY_OPEN, 'paso 10')
      await expectCardInViewport(page, 'paso 10')
      await capture(page, `${viewport.name}-paso-10-historial`)

      await tourButton(page, 'Siguiente').click()
      await expect(count(page)).toHaveText('Paso 11 de 11')
      await tourButton(page, 'Finalizar').click()
      await expect(page.locator('.novex-tour')).toHaveCount(0)

      // El recorrido no tocó el problema ni abrió formularios.
      await row(page, OPEN_OWN.title).click()
      await expect(page.getByTestId('problem-actions')).toHaveAttribute('data-status', 'OPEN')
      expect(writes, 'el piloto no debe escribir en el backend').toEqual([])
    })

    test('paso 7 sin expediente: la lista queda libre, se elige un problema ajeno y Reintentar lo encuentra', async ({
      page,
    }) => {
      const writes = await install(page)
      await openPilotAt(page, 7)
      await expect(notice(page)).toContainText('Todavía no hay un problema seleccionado', {
        timeout: 12_000,
      })
      await expect(notice(page)).not.toContainText('.,')

      // La lista donde se elige queda resaltada y el globo no la tapa.
      await expectAligned(page, LIST)
      await expectUncovered(page, LIST, 'paso 7 sin expediente')
      await expectCardInViewport(page, 'paso 7 sin expediente')
      await capture(page, `${viewport.name}-paso-7-sin-expediente`)

      // Clic real (Playwright falla si el velo o el globo lo interceptan).
      await row(page, AFFECTING.title).click()
      await expect(page.getByTestId('problem-detail')).toBeVisible()
      await tourButton(page, 'Reintentar').click()
      await expect(notice(page)).toHaveCount(0)
      await expectAligned(page, DETAIL)
      await expect(count(page)).toHaveText('Paso 7 de 11')

      // Paso 8 sin permiso de avance ni cierre: nada restringido se ofrece.
      await tourButton(page, 'Siguiente').click()
      await expect(count(page)).toHaveText('Paso 8 de 11')
      await expectAligned(page, ACTIONS)
      const actions = page.getByTestId('problem-actions')
      await expect(actions).toHaveAttribute('data-can-advance', 'false')
      await expect(actions).toHaveAttribute('data-can-resolve', 'false')
      await expect(actions.getByTestId('status-advance-button')).toHaveCount(0)
      await expect(actions.getByTestId('resolve-form')).toHaveCount(0)
      await expect(actions.getByTestId('resolve-not-allowed')).toBeVisible()
      await expectCardInViewport(page, 'paso 8 restringido')
      await capture(page, `${viewport.name}-paso-8-restringido`)

      expect(writes).toEqual([])
    })
  })
}

test.describe('piloto con problemas · interacciones', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('cambiar de situación, ir y volver entre pasos, cerrar el expediente y reintentar', async ({
    page,
  }) => {
    const writes = await install(page)
    await openPilotAt(page, 6)

    await row(page, OPEN_OWN.title).click()
    await expect(page.getByTestId('problem-detail')).toContainText(OPEN_OWN.title)
    await row(page, IN_PROGRESS_OWN.title).click()
    await expect(page.getByTestId('problem-detail')).toContainText(IN_PROGRESS_OWN.title)
    await expectAligned(page, LIST)

    // En revisión: cierra, ya no avanza.
    await tourButton(page, 'Siguiente').click()
    await expectAligned(page, DETAIL)
    await expect(page.getByTestId('detail-status')).toContainText('En revisión')
    await tourButton(page, 'Siguiente').click()
    await expectAligned(page, ACTIONS)
    const actions = page.getByTestId('problem-actions')
    await expect(actions).toHaveAttribute('data-status', 'IN_PROGRESS')
    await expect(actions.getByTestId('status-advance-button')).toHaveCount(0)
    await expect(actions.getByTestId('resolve-form')).toBeVisible()
    await capture(page, 'interacciones-paso-8-en-revision')

    // 7 → 8 con expediente (pide volver) → Anterior vuelve al 7 intacto.
    await tourButton(page, 'Siguiente').click()
    await expect(title(page)).toHaveText('Regrese a la vista de su coordinación')
    await tourButton(page, 'Anterior').click()
    await expect(count(page)).toHaveText('Paso 8 de 11')
    await expectAligned(page, ACTIONS)
    await page.keyboard.press('ArrowLeft')
    await expect(count(page)).toHaveText('Paso 7 de 11')
    await expectAligned(page, DETAIL)

    // Cerrar el expediente en el paso 7: se resalta la lista para elegir otro.
    await page.getByTestId('detail-back').click()
    await expect(page.getByTestId('problem-detail')).toHaveCount(0)
    await expect(notice(page)).toBeVisible({ timeout: 12_000 })
    await expectAligned(page, LIST)
    await expectCardInViewport(page, 'paso 7 tras cerrar')

    await row(page, OPEN_OWN.title).click()
    await tourButton(page, 'Reintentar').click()
    await expectAligned(page, DETAIL)
    await expect(page.getByTestId('problem-detail')).toContainText(OPEN_OWN.title)

    // Con el expediente abierto, la flecha derecha no salta la condición previa.
    await tourButton(page, 'Siguiente').click()
    await tourButton(page, 'Siguiente').click()
    await expect(title(page)).toHaveText('Regrese a la vista de su coordinación')
    await page.keyboard.press('ArrowRight')
    await expect(count(page)).toHaveText('Paso 9 de 11')
    await expect(title(page)).toHaveText('Regrese a la vista de su coordinación')

    expect(writes).toEqual([])
  })

  test('con el expediente ya cerrado el paso 9 explica las opciones directamente', async ({
    page,
  }) => {
    const writes = await install(page)
    await openPilotAt(page, 7)
    await expect(notice(page)).toBeVisible({ timeout: 12_000 })
    await tourButton(page, 'Continuar sin este paso').click()
    await expect(count(page)).toHaveText('Paso 8 de 11')
    await expect(notice(page)).toContainText('Estas acciones aparecen al abrir un problema', {
      timeout: 12_000,
    })
    await expectAligned(page, LIST)
    await tourButton(page, 'Continuar sin este paso').click()

    await expectReportOptions(page, 'paso 9 directo')
    await expect(page.locator('.novex-tour__waiting')).toHaveCount(0)
    expect(writes).toEqual([])
  })

  test('paso 10: el historial se abre, se consulta un cerrado en lectura y se vuelve sin escrituras', async ({
    page,
  }) => {
    const writes = await install(page)
    await openPilotAt(page, 10)
    await expectAligned(page, HISTORY_OPEN)

    // Abrir el historial (dentro del resaltado): el paso resalta el historial abierto.
    await page.getByTestId('history-open-button').click()
    await expectAligned(page, '[data-tour="problem-history"]')
    await expect(notice(page)).toHaveCount(0)
    await expect(count(page)).toHaveText('Paso 10 de 11')
    await capture(page, 'interacciones-paso-10-historial-abierto')

    // Un cerrado se abre en lectura; el paso pide volver al historial.
    await page.getByTestId('problem-history').getByText(CLOSED_OWN.title).click()
    const actions = page.getByTestId('problem-actions')
    await expect(actions).toHaveAttribute('data-resolved', 'true')
    await expect(actions.getByTestId('status-advance-button')).toHaveCount(0)
    await expect(actions.getByTestId('resolve-form')).toHaveCount(0)
    await expect(actions).toContainText('Aprendizaje simulado del piloto.')
    await expect(title(page)).toHaveText('Regrese a la vista de su coordinación')
    await expectAligned(page, '[data-testid="detail-back"]')

    await page.getByTestId('detail-back').click()
    await expect(title(page)).toHaveText('Problemas ya cerrados')
    await expect(tourButton(page, 'Siguiente')).toBeVisible()
    expect(writes).toEqual([])
  })
})
