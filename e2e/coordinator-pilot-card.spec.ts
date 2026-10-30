import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from 'playwright/test'
import { B2B, install, OPEN_OWN } from './coordinator-pilot.fixture'
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
 * Paso 2 del piloto del COORDINADOR (la carta de su coordinación) y área
 * táctil de 44 px en los botones del globo, en todos los pasos.
 *
 * El escenario es el del fixture del piloto: B2B en estado crítico con lectura
 * coherente con sus problemas simulados (no la carta «Desconocido»).
 */

const SCREENSHOT_DIR = join(process.cwd(), 'test-results', 'pilot-screens-card')

const STEP_TITLE = 'Su coordinación, en una carta'
const STEP_TEXT =
  'Esta carta representa a su coordinación y es la pieza central de su espacio de trabajo. Su ilustración, su color y sus señales le muestran cómo está su área.'

async function capture(page: Page, name: string) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true })
  await page.screenshot({ path: join(SCREENSHOT_DIR, `${name}.png`) })
}

for (const viewport of VIEWPORTS) {
  test.describe(`paso 2 · carta de coordinación · ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test('resalta la carta completa sin taparla y navega 1 → 2 → 3 sin escrituras', async ({
      page,
    }) => {
      const writes = await install(page)
      await openPilot(page)

      // La carta es la del escenario coherente: B2B, crítica.
      await expect(page.locator(CARD)).toHaveAttribute('data-code', B2B.code)
      await expect(page.locator(CARD)).toHaveAttribute('data-status', 'CRITICO')
      await expect(page.locator(CARD_STATUS)).toHaveText('Crítico')

      await tourButton(page, 'Siguiente').click()
      await expect(count(page)).toHaveText('Paso 2 de 11')
      await expect(page.locator('#novex-tour-title')).toHaveText(STEP_TITLE)
      await expect(page.locator('#novex-tour-description')).toHaveText(STEP_TEXT)

      // El resaltado es la carta entera con el margen del motor (10 px), no su
      // contenedor estirado ni un fragmento.
      await expect
        .poll(async () => {
          const spot = await box(page, '.novex-tour__spotlight')
          const card = await box(page, CARD)
          return Math.max(
            Math.abs(spot.top - Math.max(8, card.top - 10)),
            Math.abs(spot.left - Math.max(8, card.left - 10)),
            Math.abs(spot.right - (card.right + 10)),
            Math.abs(spot.bottom - (card.bottom + 10)),
          )
        }, { timeout: 4_000 })
        .toBeLessThanOrEqual(3)

      // El globo no tapa la carta ni su estado, ni los indicadores del personaje.
      expect(await cardCoverRatio(page, CARD), 'el globo tapa la carta').toBe(0)
      expect(await cardCoverRatio(page, CARD_STATUS), 'el globo tapa el estado').toBe(0)
      expect(await cardCoverRatio(page, CHARACTER_LIVES), 'el globo tapa las vidas').toBe(0)
      expect(await cardCoverRatio(page, CHARACTER_STATUS), 'el globo tapa el estado del personaje').toBe(0)
      await expect(page.locator(CHARACTER_LIVES)).toContainText(`${B2B.lifePoints} / 10`)
      expect(await bubbleButtonIssues(page, 44)).toEqual([])
      // El personaje se pinta en un lienzo (Rive) de forma asíncrona: se espera
      // a que exista para que la captura sea representativa.
      await waitForCharacterCanvas(page)
      await capture(page, `${viewport.name}-paso-2`)

      // 2 → 3 → 2 → 3: el paso 3 no cambia.
      await tourButton(page, 'Siguiente').click()
      await expect(count(page)).toHaveText('Paso 3 de 11')
      await expect(page.locator('#novex-tour-title')).toHaveText('El estado de su coordinación')
      await tourButton(page, 'Anterior').click()
      await expect(count(page)).toHaveText('Paso 2 de 11')
      await expect(page.locator('#novex-tour-title')).toHaveText(STEP_TITLE)
      await tourButton(page, 'Siguiente').click()
      await expect(count(page)).toHaveText('Paso 3 de 11')

      expect(writes, 'el paso 2 no escribe en el backend').toEqual([])
    })
  })
}

/** Recorre los once pasos revisando los botones del globo en cada estado. */
for (const viewport of VIEWPORTS.filter((item) => item.width <= 390)) {
  test.describe(`botones del globo · ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test('44 px, sin desbordes ni solapamientos en todos los pasos y estados', async ({ page }) => {
      const writes = await install(page)
      await openPilot(page)
      const issues: string[] = []
      const check = async (state: string) => {
        for (const issue of await bubbleButtonIssues(page, 44)) issues.push(`${state}: ${issue}`)
      }

      // Pasos 1 a 6 normales; 7 y 8 sin problema elegido (cuatro botones en el pie).
      for (let n = 1; n <= 11; n += 1) {
        await expect(count(page)).toHaveText(`Paso ${n} de 11`)
        if (n === 7 || n === 8) {
          await expect(page.locator('.novex-tour__notice')).toBeVisible({ timeout: 12_000 })
          await check(`paso ${n} sin expediente`)
          if (n === 7) await capture(page, `${viewport.name}-paso-7-cuatro-botones`)
          await tourButton(page, 'Continuar sin este paso').click()
          continue
        }
        await expect(page.locator('.novex-tour__waiting')).toHaveCount(0)
        await check(`paso ${n}`)
        if (n < 11) await tourButton(page, 'Siguiente').click()
      }

      // Condición previa del paso 9 (expediente abierto): el pie lleva el aviso de espera.
      await tourButton(page, 'Finalizar').click()
      await page.getByTestId('problem-row').filter({ hasText: OPEN_OWN.title }).click()
      await page.getByTestId('shell-menu-trigger').click()
      await page.getByTestId('shell-menu-pilot').click()
      for (let n = 2; n <= 9; n += 1) await tourButton(page, 'Siguiente').click()
      await expect(page.locator('.novex-tour__waiting')).toHaveText('Esperando que cierre la vista')
      await check('paso 9 esperando volver')
      await capture(page, `${viewport.name}-paso-9-esperando`)

      expect(issues).toEqual([])
      expect(writes).toEqual([])
    })
  })
}
