import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from 'playwright/test'
import { install, type PilotScenario } from './coordinator-pilot.fixture'
import {
  bubbleButtonIssues,
  box,
  CARD,
  CARD_STATUS,
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
 * Paso 3 del piloto del COORDINADOR: la etiqueta de estado de su carta, en los
 * cuatro estados que puede presentar. Cada escenario simula los problemas que
 * llevarían a B2B a ese estado (ver `coordinator-pilot.fixture.ts`).
 */

const SCREENSHOT_DIR = join(process.cwd(), 'test-results', 'pilot-screens-status')

const STEP_TITLE = 'El estado de su coordinación'
const STEP_TEXT =
  'Esta etiqueta indica el estado operativo actual de su coordinación. Se calcula con sus problemas activos y con las dependencias de otras áreas que la afectan.'

const LABEL: Record<PilotScenario, string> = {
  ESTABLE: 'Estable',
  ALERTA: 'Alerta',
  CRITICO: 'Crítico',
  DESCONOCIDO: 'Desconocido',
}

const SCENARIOS: PilotScenario[] = ['ESTABLE', 'ALERTA', 'CRITICO', 'DESCONOCIDO']

async function capture(page: Page, name: string) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true })
  await page.screenshot({ path: join(SCREENSHOT_DIR, `${name}.png`) })
}

/** Error máximo entre el resaltado y la etiqueta, con las reglas de recorte del motor. */
async function highlightError(page: Page): Promise<number> {
  const spot = await box(page, '.novex-tour__spotlight')
  const label = await box(page, CARD_STATUS)
  return Math.max(
    Math.abs(spot.top - Math.max(8, label.top - 10)),
    Math.abs(spot.left - Math.max(8, label.left - 10)),
    Math.abs(spot.right - (label.right + 10)),
    Math.abs(spot.bottom - (label.bottom + 10)),
  )
}

/**
 * Contraste del texto de la etiqueta sobre su píldora. La píldora pinta un
 * tinte del estado sobre una base oscura casi opaca; se compone en ese orden.
 */
async function labelContrast(page: Page): Promise<number> {
  return page.locator(CARD_STATUS).evaluate((element) => {
    const parse = (value: string) => {
      const [r, g, b, a = 1] = (value.match(/[\d.]+/g) ?? []).map(Number)
      return { r, g, b, a }
    }
    const over = (top: { r: number; g: number; b: number; a: number }, bottom: { r: number; g: number; b: number }) => ({
      r: top.r * top.a + bottom.r * (1 - top.a),
      g: top.g * top.a + bottom.g * (1 - top.a),
      b: top.b * top.a + bottom.b * (1 - top.a),
    })
    const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
      const channel = (value: number) => {
        const c = value / 255
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
    }
    const style = getComputedStyle(element)
    const rgb = style.getPropertyValue('--status-rgb').trim().split(/\s+/).map(Number)
    // Base de la píldora rgb(4 9 18 / 0.82) sobre negro, y encima el tinte al 18 %.
    const base = over({ r: 4, g: 9, b: 18, a: 0.82 }, { r: 0, g: 0, b: 0 })
    const background = over({ r: rgb[0], g: rgb[1], b: rgb[2], a: 0.18 }, base)
    const text = over(parse(style.color), background)
    const [light, dark] = [luminance(text), luminance(background)].sort((a, b) => b - a)
    return (light + 0.05) / (dark + 0.05)
  })
}

for (const viewport of VIEWPORTS) {
  for (const scenario of SCENARIOS) {
    test.describe(`paso 3 · estado ${scenario} · ${viewport.name}`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } })

      test('resalta solo la etiqueta, el globo no la tapa y navega 2 → 3 → 4 sin escrituras', async ({
        page,
      }) => {
        const writes = await install(page, { scenario })
        await openPilot(page)
        await expect(page.locator(CARD)).toHaveAttribute('data-status', scenario)
        await expect(page.locator(CARD_STATUS)).toHaveText(LABEL[scenario])

        await tourButton(page, 'Siguiente').click()
        await expect(count(page)).toHaveText('Paso 2 de 11')
        await tourButton(page, 'Siguiente').click()
        await expect(count(page)).toHaveText('Paso 3 de 11')
        await expect(page.locator('#novex-tour-title')).toHaveText(STEP_TITLE)
        await expect(page.locator('#novex-tour-description')).toHaveText(STEP_TEXT)

        // Solo la etiqueta: el resaltado coincide con ella y no abarca la carta.
        await expect.poll(() => highlightError(page), { timeout: 4_000 }).toBeLessThanOrEqual(3)
        const spot = await box(page, '.novex-tour__spotlight')
        const card = await box(page, CARD)
        expect(
          spot.top <= card.top && spot.bottom >= card.bottom,
          'el resaltado abarca la carta entera',
        ).toBe(false)

        // Nada de lo necesario para entenderla queda tapado.
        expect(await cardCoverRatio(page, CARD_STATUS), 'tapa la etiqueta').toBe(0)
        expect(await cardCoverRatio(page, CARD), 'tapa la carta').toBe(0)
        expect(await cardCoverRatio(page, CHARACTER_LIVES), 'tapa las vidas').toBe(0)
        expect(await cardCoverRatio(page, CHARACTER_STATUS), 'tapa el estado del personaje').toBe(0)
        expect(await bubbleButtonIssues(page, 44)).toEqual([])

        // Legibilidad de la etiqueta: tamaño y contraste sobre su píldora.
        const fontSize = await page
          .locator(CARD_STATUS)
          .evaluate((element) => parseFloat(getComputedStyle(element).fontSize))
        expect(fontSize).toBeGreaterThanOrEqual(10)
        const contrast = await labelContrast(page)
        test.info().annotations.push({ type: 'contraste', description: contrast.toFixed(2) })
        expect(contrast, `contraste ${contrast.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)

        await waitForCharacterCanvas(page)
        await capture(page, `${scenario.toLowerCase()}-${viewport.name}-paso-3`)

        // 3 → 2 → 3 → 4: después del estado viene el personaje.
        await tourButton(page, 'Anterior').click()
        await expect(count(page)).toHaveText('Paso 2 de 11')
        await tourButton(page, 'Siguiente').click()
        await expect(count(page)).toHaveText('Paso 3 de 11')
        await tourButton(page, 'Siguiente').click()
        await expect(count(page)).toHaveText('Paso 4 de 11')
        await expect(page.locator('#novex-tour-title')).toHaveText('El personaje de su coordinación')

        expect(writes, 'el paso 3 no escribe en el backend').toEqual([])
      })
    })
  }
}

test.describe('paso 3 · la etiqueta cambia de tamaño', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('el resaltado sigue a la etiqueta cuando su texto se alarga', async ({ page }) => {
    // El overview solo se vuelve a pedir tras una escritura confirmada, que el
    // recorrido no hace; aquí se simula el re-render de la etiqueta para
    // comprobar que el motor sigue su tamaño (ResizeObserver).
    await install(page, { scenario: 'ALERTA' })
    await openPilot(page)
    await tourButton(page, 'Siguiente').click()
    await tourButton(page, 'Siguiente').click()
    await expect.poll(() => highlightError(page), { timeout: 4_000 }).toBeLessThanOrEqual(3)
    const before = await box(page, '.novex-tour__spotlight')

    await page.locator(CARD_STATUS).evaluate((element) => {
      element.lastChild!.textContent = 'Desconocido'
    })
    await expect.poll(() => highlightError(page), { timeout: 4_000 }).toBeLessThanOrEqual(3)
    const after = await box(page, '.novex-tour__spotlight')
    expect(after.right - after.left).toBeGreaterThan(before.right - before.left)
  })
})
