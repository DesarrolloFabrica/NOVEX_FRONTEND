import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from 'playwright/test'
import {
  CLOSED_OWN,
  IN_PROGRESS_OWN,
  install,
  MY_DEPENDENCY,
  OPEN_OWN,
  type PilotScenario,
} from './coordinator-pilot.fixture'
import {
  bubbleButtonIssues,
  box,
  CARD,
  cardCoverRatio,
  count,
  openPilot,
  tourButton,
  VIEWPORTS,
} from './coordinator-pilot.helpers'

/**
 * Paso 5 del piloto del COORDINADOR: «Mis reportes».
 *
 * El panel lista lo que creó el propio usuario (`mine=true`, autoría fijada por
 * el servidor), en cualquier coordinación y estado, paginado de 20 en 20, y no
 * depende de la carta seleccionada. Los escenarios están en el fixture.
 */

const SCREENSHOT_DIR = join(process.cwd(), 'test-results', 'pilot-screens-reports')

const PANEL = '[data-tour="my-reports"] [data-testid="my-reports"]'
const REGION = '[data-tour="my-reports"]'

const STEP_TITLE = 'Los problemas que usted ha reportado'
const STEP_TEXT =
  'Aquí encuentra los problemas que usted ha registrado, abiertos o cerrados, con su estado actual, aunque involucren a otras coordinaciones.'
const STEP_EXPECTATION = 'Al elegir uno se abre su expediente. Solo aparecen los que usted registró.'

/** Lo que el panel debe mostrar en cada escenario: título y estado de cada reporte. */
const EXPECTED: Partial<Record<PilotScenario, Array<{ title: string; status: string }>>> = {
  SIN_REPORTES: [],
  UN_REPORTE: [{ title: OPEN_OWN.title, status: 'Abierto' }],
  VARIOS_REPORTES: [
    { title: OPEN_OWN.title, status: 'Abierto' },
    { title: MY_DEPENDENCY.title, status: 'En atención' },
    { title: CLOSED_OWN.title, status: 'Cerrado' },
  ],
}

const SCENARIOS = Object.keys(EXPECTED) as PilotScenario[]

async function capture(page: Page, name: string) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true })
  await page.screenshot({ path: join(SCREENSHOT_DIR, `${name}.png`) })
}

async function highlightError(page: Page): Promise<number> {
  const spot = await box(page, '.novex-tour__spotlight')
  const panel = await box(page, PANEL)
  return Math.max(
    Math.abs(spot.top - Math.max(8, panel.top - 10)),
    Math.abs(spot.left - Math.max(8, panel.left - 10)),
    Math.abs(spot.right - (panel.right + 10)),
    Math.abs(spot.bottom - (panel.bottom + 10)),
  )
}

async function goToStep5(page: Page) {
  await openPilot(page)
  for (let n = 2; n <= 5; n += 1) {
    await tourButton(page, 'Siguiente').click()
    await expect(count(page)).toHaveText(`Paso ${n} de 11`)
  }
}

const row = (page: Page, title: string) =>
  page.locator(PANEL).getByTestId('my-report-row').filter({ hasText: title })

for (const viewport of VIEWPORTS) {
  for (const scenario of SCENARIOS) {
    test.describe(`paso 5 · ${scenario} · ${viewport.name}`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } })

      test('resalta el panel, muestra solo lo reportado por el usuario y navega 4 → 5 → 6', async ({
        page,
      }) => {
        const writes = await install(page, { scenario })
        await goToStep5(page)
        const reports = EXPECTED[scenario]!

        await expect(page.locator('#novex-tour-title')).toHaveText(STEP_TITLE)
        await expect(page.locator('#novex-tour-description')).toHaveText(STEP_TEXT)
        await expect(page.locator('.novex-tour__expectation')).toContainText(STEP_EXPECTATION)

        // El contenido del panel es el del escenario: solo lo que creó el usuario.
        const panel = page.locator(PANEL)
        await expect(panel.getByTestId('my-reports-count')).toHaveText(String(reports.length))
        await expect(panel.getByTestId('my-report-row')).toHaveCount(reports.length)
        for (const report of reports) {
          await expect(row(page, report.title).getByTestId('my-report-status')).toHaveText(report.status)
        }
        // Un problema de otro autor nunca aparece aquí, aunque sea de su coordinación.
        await expect(row(page, IN_PROGRESS_OWN.title)).toHaveCount(0)
        if (reports.length === 0) {
          await expect(panel.getByTestId('my-reports-empty')).toBeVisible()
        }
        if (scenario === 'VARIOS_REPORTES') {
          // La dependencia hacia otra coordinación figura entre sus reportes.
          await expect(row(page, MY_DEPENDENCY.title)).toHaveAttribute('data-report-kind', 'INTER_COORDINATION')
        }

        // Resaltado: el panel, dentro del marco de su región.
        await expect.poll(() => highlightError(page), { timeout: 4_000 }).toBeLessThanOrEqual(3)
        const spot = await box(page, '.novex-tour__spotlight')
        const region = await box(page, REGION)
        expect(
          spot.top >= region.top - 1 &&
            spot.left >= region.left - 1 &&
            spot.right <= region.right + 1 &&
            spot.bottom <= region.bottom + 1,
          'el resaltado se sale del marco del panel',
        ).toBe(true)

        // Lo esencial nunca queda tapado: la cabecera con el total y el primer
        // reporte (o el aviso de vacío).
        expect(await cardCoverRatio(page, `${PANEL} .my-reports__header`), 'tapa la cabecera').toBe(0)
        const rows = await panel.getByTestId('my-report-row').count()
        const rowSelector = (index: number) =>
          `${PANEL} li:nth-child(${index + 1}) [data-testid="my-report-row"]`
        if (rows > 0) {
          expect(await cardCoverRatio(page, rowSelector(0)), 'tapa el primer reporte').toBe(0)
        }
        // El resto de reportes, también, salvo a 360 × 640: ahí el panel (~290 px)
        // y la hoja del globo (~365 px) no caben juntos y la hoja tapa parte del
        // segundo. Limitación documentada; se anota la fracción tapada.
        for (let index = 1; index < rows; index += 1) {
          const ratio = await cardCoverRatio(page, rowSelector(index))
          if (viewport.width > 360) {
            expect(ratio, `tapa el reporte ${index + 1}`).toBe(0)
          } else if (ratio > 0) {
            test.info().annotations.push({
              type: 'limitación 360',
              description: `reporte ${index + 1} tapado al ${Math.round(ratio * 100)} %`,
            })
          }
        }
        if (rows === 0) {
          expect(await cardCoverRatio(page, `${PANEL} [data-testid="my-reports-empty"]`), 'tapa el aviso').toBe(0)
        }
        expect(await bubbleButtonIssues(page, 44)).toEqual([])
        await capture(page, `${scenario.toLowerCase()}-${viewport.name}-paso-5`)

        // 5 → 6 → 5 → 4 → 5.
        await tourButton(page, 'Siguiente').click()
        await expect(count(page)).toHaveText('Paso 6 de 11')
        await expect(page.locator('#novex-tour-title')).toHaveText('Problemas de su coordinación')
        await tourButton(page, 'Anterior').click()
        await expect(count(page)).toHaveText('Paso 5 de 11')
        await expect.poll(() => highlightError(page), { timeout: 4_000 }).toBeLessThanOrEqual(3)
        await tourButton(page, 'Anterior').click()
        await expect(count(page)).toHaveText('Paso 4 de 11')
        await expect(page.locator('#novex-tour-title')).toHaveText('El personaje de su coordinación')
        await tourButton(page, 'Siguiente').click()
        await expect(count(page)).toHaveText('Paso 5 de 11')

        expect(writes, 'el paso 5 no escribe en el backend').toEqual([])
      })
    })
  }
}

for (const viewport of VIEWPORTS.filter((item) => [1440, 1024, 390].includes(item.width))) {
  test.describe(`paso 5 · interacción · ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test('abrir un reporte de otra coordinación (y expandir el panel) no pierde el paso', async ({
      page,
    }) => {
      const writes = await install(page, { scenario: 'VARIOS_REPORTES' })
      await goToStep5(page)

      // Abrir la dependencia (dentro del resaltado): se abre su expediente.
      await row(page, MY_DEPENDENCY.title).click()
      await expect(page.getByTestId('problem-detail')).toContainText(MY_DEPENDENCY.title)
      await expect(row(page, MY_DEPENDENCY.title)).toHaveAttribute('data-selected', 'true')
      // El recorrido sigue en el paso 5, resaltando el mismo panel.
      await expect(count(page)).toHaveText('Paso 5 de 11')
      await expect.poll(() => highlightError(page), { timeout: 4_000 }).toBeLessThanOrEqual(3)
      // La carta propia no cambia aunque el reporte sea de otra coordinación.
      await expect(page.locator(CARD)).toHaveAttribute('data-code', 'coord-b2b')
      await capture(page, `interaccion-${viewport.name}-reporte-abierto`)

      // Expandir: el resaltado sigue al panel.
      const expand = page.locator(PANEL).getByTestId('my-reports-expand')
      expect(await cardCoverRatio(page, `${PANEL} [data-testid="my-reports-expand"]`), '«Expandir» bajo el globo').toBe(0)
      await expand.click()
      await expect(page.locator(PANEL)).toHaveAttribute('data-expanded', 'true')
      await expect.poll(() => highlightError(page), { timeout: 4_000 }).toBeLessThanOrEqual(3)
      await capture(page, `interaccion-${viewport.name}-expandido`)

      if (viewport.width >= 1024) {
        // Hay sitio: «Contraer» sigue libre y el panel vuelve a su tamaño.
        await expand.click()
        await expect(page.locator(PANEL)).not.toHaveAttribute('data-expanded', 'true')
        await expect.poll(() => highlightError(page), { timeout: 4_000 }).toBeLessThanOrEqual(3)
      } else {
        // Limitación documentada: en móvil el panel expandido baja hasta la hoja
        // y «Contraer» queda debajo. El recorrido no se bloquea: el paso 6 sigue
        // resaltando su lista, que está en otra columna y se puede pulsar.
        test.info().annotations.push({ type: 'limitación móvil', description: '«Contraer» bajo la hoja del globo' })
      }

      // Continúa al paso 6 con normalidad.
      await tourButton(page, 'Siguiente').click()
      await expect(count(page)).toHaveText('Paso 6 de 11')
      await expect
        .poll(async () => {
          const spot = await box(page, '.novex-tour__spotlight')
          const list = await box(page, '[data-tour="coordination-problems"]')
          return Math.abs(spot.top - Math.max(8, list.top - 10))
        }, { timeout: 4_000 })
        .toBeLessThanOrEqual(3)
      expect(writes).toEqual([])
    })
  })
}
