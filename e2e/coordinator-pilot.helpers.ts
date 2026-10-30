import { expect, test, type Page } from 'playwright/test'

/** Utilidades de medición compartidas por las specs del piloto del COORDINADOR. */

export const OWN = '[data-tour="own-coordination"]'
export const CARD = `${OWN} [data-testid="coordination-card"]`
export const CARD_STATUS = `${OWN} [data-testid="coordination-card-status"]`
/** Indicadores visibles del personaje, junto a la carta. */
export const CHARACTER_LIVES = '[data-testid="direction-character-lives"]'
export const CHARACTER_STATUS = '[data-testid="direction-character-status"]'

export const VIEWPORTS = [
  { name: 'escritorio-1440', width: 1440, height: 900 },
  { name: 'tableta-1024', width: 1024, height: 768 },
  { name: 'tableta-820', width: 820, height: 1180 },
  { name: 'movil-390', width: 390, height: 844 },
  { name: 'movil-360', width: 360, height: 640 },
] as const

export const count = (page: Page) => page.locator('.novex-tour__count')
export const tourButton = (page: Page, name: string) =>
  page.locator('.novex-tour').getByRole('button', { name })

export async function openPilot(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('operational-shell')).toBeVisible()
  await page.getByTestId('pilot-invitation-later').click()
  await page.getByTestId('shell-menu-trigger').click()
  await page.getByTestId('shell-menu-pilot').click()
  await expect(count(page)).toHaveText('Paso 1 de 11')
}

/** Rectángulo de un selector en la ventana. */
export async function box(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom }
  })
}

/** Fracción visible del elemento (recortada a la ventana) que tapa el globo. */
export async function cardCoverRatio(page: Page, selector: string): Promise<number> {
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

/**
 * Botones del globo: área táctil, dentro del globo, sin solaparse entre sí y
 * sin texto desbordado. Devuelve las incidencias.
 */
export async function bubbleButtonIssues(page: Page, minimum: number): Promise<string[]> {
  return page.evaluate((min) => {
    const card = document.querySelector('.novex-tour__card')
    if (!card) return ['sin globo']
    const frame = card.getBoundingClientRect()
    const buttons = [...card.querySelectorAll('button')].filter(
      (button) => button.getBoundingClientRect().width > 0,
    )
    const issues: string[] = []
    const label = (button: Element) =>
      button.textContent?.trim() || button.getAttribute('aria-label') || '?'
    buttons.forEach((button, index) => {
      const rect = button.getBoundingClientRect()
      if (rect.height < min - 0.5) issues.push(`«${label(button)}» mide ${Math.round(rect.height)}px`)
      if (rect.left < frame.left - 1 || rect.right > frame.right + 1)
        issues.push(`«${label(button)}» sale del globo`)
      if (button.scrollWidth > button.clientWidth + 1) issues.push(`«${label(button)}» desborda su texto`)
      for (const other of buttons.slice(index + 1)) {
        const peer = other.getBoundingClientRect()
        const width = Math.min(rect.right, peer.right) - Math.max(rect.left, peer.left)
        const height = Math.min(rect.bottom, peer.bottom) - Math.max(rect.top, peer.top)
        if (width > 1 && height > 1) issues.push(`«${label(button)}» se solapa con «${label(other)}»`)
      }
    })
    const scroll = [card, ...card.querySelectorAll('*')].some(
      (node) =>
        node.scrollHeight > node.clientHeight + 1 &&
        /(auto|scroll)/.test(getComputedStyle(node).overflowY),
    )
    if (scroll) issues.push('el globo obliga a desplazarse')
    if (
      frame.left < -1 ||
      frame.top < -1 ||
      frame.right > window.innerWidth + 1 ||
      frame.bottom > window.innerHeight + 1
    )
      issues.push('el globo sale de la pantalla')
    return issues
  }, minimum)
}

/**
 * Espera a que Rive monte el lienzo del personaje antes de una captura. Solo
 * afecta a la calidad de la captura: bajo carga el runtime puede tardar, y eso
 * se anota en lugar de hacer fallar una prueba que no trata del lienzo.
 */
export async function waitForCharacterCanvas(page: Page) {
  try {
    await page.locator('[data-testid="direction-character"] canvas').waitFor({ timeout: 10_000 })
    await page.waitForTimeout(600)
  } catch {
    test.info().annotations.push({
      type: 'captura',
      description: 'el lienzo del personaje no se montó a tiempo',
    })
  }
}
