import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from 'playwright/test'
import { install, type PilotScenario } from './coordinator-pilot.fixture'
import {
  bubbleButtonIssues,
  box,
  cardCoverRatio,
  CHARACTER_LIVES,
  CHARACTER_STATUS,
  count,
  openPilot,
  tourButton,
  VIEWPORTS,
  waitForCharacterCanvas,
} from './coordinator-pilot.helpers'

/**
 * Paso 4 del piloto del COORDINADOR: el personaje y sus vidas operativas.
 *
 * Cada escenario simula los problemas que llevarían a B2B a ese estado y a esas
 * vidas con la política del backend (ver `coordinator-pilot.fixture.ts`).
 */

const SCREENSHOT_DIR = join(process.cwd(), 'test-results', 'pilot-screens-character')

const CHARACTER = '[data-tour="operational-shell"] [data-testid="direction-character"]'
const REGION = '[data-testid="shell-region-character"]'

const STEP_TITLE = 'El personaje de su coordinación'
const STEP_TEXT =
  'Su expresión refleja el estado de su coordinación. Los corazones representan sus vidas operativas y disminuyen según la cantidad y gravedad de los problemas que la afectan.'
const STEP_EXPECTATION =
  'Estado y vidas son indicadores distintos: Crítico no significa haber perdido todos los corazones.'

/** Lectura esperada del personaje en cada escenario. */
const EXPECTED: Record<
  Exclude<PilotScenario, never>,
  { label: string; lifePoints: string; mood: string }
> = {
  ESTABLE: { label: 'Estable', lifePoints: '10', mood: 'happy_2' },
  ALERTA: { label: 'Alerta', lifePoints: '9', mood: 'neutral' },
  CRITICO: { label: 'Crítico', lifePoints: '5', mood: 'sad_2' },
  CRITICO_SIN_VIDAS: { label: 'Crítico', lifePoints: '0', mood: 'sad_2' },
  DESCONOCIDO: { label: 'Desconocido', lifePoints: 'unknown', mood: 'neutral' },
}

const SCENARIOS = Object.keys(EXPECTED) as PilotScenario[]

async function capture(page: Page, name: string) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true })
  await page.screenshot({ path: join(SCREENSHOT_DIR, `${name}.png`) })
}

async function highlightError(page: Page): Promise<number> {
  const spot = await box(page, '.novex-tour__spotlight')
  const target = await box(page, CHARACTER)
  return Math.max(
    Math.abs(spot.top - Math.max(8, target.top - 10)),
    Math.abs(spot.left - Math.max(8, target.left - 10)),
    Math.abs(spot.right - (target.right + 10)),
    Math.abs(spot.bottom - (target.bottom + 10)),
  )
}

async function goToStep4(page: Page) {
  await openPilot(page)
  for (let n = 2; n <= 4; n += 1) {
    await tourButton(page, 'Siguiente').click()
    await expect(count(page)).toHaveText(`Paso ${n} de 11`)
  }
}

for (const viewport of VIEWPORTS) {
  for (const scenario of SCENARIOS) {
    test.describe(`paso 4 · ${scenario} · ${viewport.name}`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } })

      test('resalta personaje y vidas sin taparlos y navega 3 → 4 → 5 sin escrituras', async ({
        page,
      }) => {
        const writes = await install(page, { scenario })
        await goToStep4(page)
        const expected = EXPECTED[scenario]

        await expect(page.locator('#novex-tour-title')).toHaveText(STEP_TITLE)
        await expect(page.locator('#novex-tour-description')).toHaveText(STEP_TEXT)
        await expect(page.locator('.novex-tour__expectation')).toContainText(STEP_EXPECTATION)

        // La lectura del personaje es la del escenario: el texto no la contradice.
        await expect(page.locator(CHARACTER_STATUS)).toHaveText(expected.label)
        await expect(page.locator('[data-testid="character-lives"]')).toHaveAttribute(
          'data-life-points',
          expected.lifePoints,
        )
        await expect(page.locator(CHARACTER)).toHaveAttribute('data-mood', expected.mood)

        // Resaltado: la unidad figura + vidas + rótulo, dentro del marco de su región.
        await expect.poll(() => highlightError(page), { timeout: 4_000 }).toBeLessThanOrEqual(3)
        const spot = await box(page, '.novex-tour__spotlight')
        const region = await box(page, REGION)
        expect(
          spot.top >= region.top - 1 &&
            spot.left >= region.left - 1 &&
            spot.right <= region.right + 1 &&
            spot.bottom <= region.bottom + 1,
          'el resaltado se sale del marco del personaje',
        ).toBe(true)

        // El globo no tapa al personaje ni sus indicadores.
        expect(await cardCoverRatio(page, CHARACTER), 'tapa al personaje').toBe(0)
        expect(await cardCoverRatio(page, CHARACTER_LIVES), 'tapa las vidas').toBe(0)
        expect(await cardCoverRatio(page, CHARACTER_STATUS), 'tapa el rótulo').toBe(0)
        expect(await bubbleButtonIssues(page, 44)).toEqual([])

        await waitForCharacterCanvas(page)
        await capture(page, `${scenario.toLowerCase()}-${viewport.name}-paso-4`)

        // 4 → 5 → 4 → 3 → 4.
        await tourButton(page, 'Siguiente').click()
        await expect(count(page)).toHaveText('Paso 5 de 11')
        await expect(page.locator('#novex-tour-title')).toHaveText('Los problemas que usted ha reportado')
        await tourButton(page, 'Anterior').click()
        await expect(count(page)).toHaveText('Paso 4 de 11')
        await expect(page.locator('#novex-tour-title')).toHaveText(STEP_TITLE)
        await tourButton(page, 'Anterior').click()
        await expect(count(page)).toHaveText('Paso 3 de 11')
        await expect(page.locator('#novex-tour-title')).toHaveText('El estado de su coordinación')
        await tourButton(page, 'Siguiente').click()
        await expect(count(page)).toHaveText('Paso 4 de 11')

        expect(writes, 'el paso 4 no escribe en el backend').toEqual([])
      })
    })
  }
}

test.describe('paso 4 · movimiento reducido', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('con movimiento reducido el globo y el resaltado no se animan', async ({ page }) => {
    // La suite ya corre con `reducedMotion: 'reduce'` (playwright.config.ts).
    await install(page)
    await goToStep4(page)
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
    await expect(page.locator('.novex-tour')).toHaveClass(/novex-tour--reduced-motion/)
    await expect(page.locator('.novex-tour__card')).toHaveCSS('animation-name', 'none')
    await expect(page.locator('.novex-tour__spotlight')).toHaveCSS('transition-duration', '0s')
  })
})
