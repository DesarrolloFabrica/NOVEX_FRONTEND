import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Locator, type Page } from 'playwright/test'
import { installRoleExperience, type RoleCode } from './role-experience.fixture'

/**
 * Bienvenida del piloto del COORDINADOR: invitación y paso 1.
 *
 * Mide en navegador real lo que la revisión visual pide: textos exactos, globo
 * sin desplazamiento interno, botones con área táctil suficiente, nada fuera de
 * pantalla ni encima del menú, y ninguna escritura.
 */

const SCREENSHOT_DIR = join(process.cwd(), 'test-results', 'pilot-screens-welcome')

const INVITATION_TITLE = '¿Quiere conocer su Centro Operacional?'
const INVITATION_TEXT =
  'Le mostraremos cómo consultar los problemas de su coordinación, realizar seguimiento y utilizar las herramientas disponibles.'
const STEP_TITLE = 'Bienvenido a su coordinación'
const STEP_TEXT =
  'Este es su espacio de trabajo en NOVEX. Aquí podrá conocer el estado de su coordinación, consultar situaciones y realizar seguimiento a los problemas que requieren atención.'

const VIEWPORTS = [
  { name: 'escritorio-1440', width: 1440, height: 900 },
  { name: 'tableta-820', width: 820, height: 1180 },
  { name: 'movil-390', width: 390, height: 844 },
  { name: 'movil-360', width: 360, height: 640 },
] as const

function trackWrites(page: Page): string[] {
  const writes: string[] = []
  page.on('request', (request) => {
    if (request.method() !== 'GET' && request.url().includes('/api/v1/')) {
      writes.push(`${request.method()} ${new URL(request.url()).pathname}`)
    }
  })
  return writes
}

async function capture(page: Page, name: string) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true })
  await page.screenshot({ path: join(SCREENSHOT_DIR, `${name}.png`) })
}

/** El elemento cabe entero en la ventana. */
async function expectInViewport(locator: Locator, label: string) {
  const fits = await locator.evaluate((element) => {
    const box = element.getBoundingClientRect()
    return (
      box.left >= -1 &&
      box.top >= -1 &&
      box.right <= window.innerWidth + 1 &&
      box.bottom <= window.innerHeight + 1
    )
  })
  expect(fits, `${label}: sale de la pantalla`).toBe(true)
}

/** Ningún bloque del globo obliga a desplazarse para leerlo. */
async function expectNoInnerScroll(locator: Locator, label: string) {
  const overflow = await locator.evaluate((element) =>
    [element, ...element.querySelectorAll('*')]
      .filter((node) => node.scrollHeight > node.clientHeight + 1)
      .filter((node) => /(auto|scroll)/.test(getComputedStyle(node).overflowY))
      .map((node) => node.className || node.tagName),
  )
  expect(overflow, `${label}: hay desplazamiento interno`).toEqual([])
}

/** Área táctil mínima de cada botón. */
async function expectTapTargets(locator: Locator, minimum: number, label: string) {
  const sizes = await locator.locator('button').evaluateAll((buttons) =>
    buttons
      .filter((button) => button.getBoundingClientRect().width > 0)
      .map((button) => ({
        text: button.textContent?.trim() || button.getAttribute('aria-label'),
        height: Math.round(button.getBoundingClientRect().height),
      })),
  )
  for (const size of sizes) {
    expect(size.height, `${label}: «${size.text}» mide ${size.height}px`).toBeGreaterThanOrEqual(minimum)
  }
}

/** Nada del escenario se pinta encima: el centro de cada parte pertenece al propio elemento. */
async function expectOnTop(locator: Locator, label: string) {
  const covered = await locator.evaluate((element) =>
    [element, ...element.querySelectorAll('h2, p, button')]
      .map((part) => {
        const box = part.getBoundingClientRect()
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
        return hit && element.contains(hit)
          ? null
          : `${part.tagName.toLowerCase()} bajo ${hit?.className || hit?.tagName}`
      })
      .filter(Boolean),
  )
  expect(covered, `${label}: el escenario se pinta encima`).toEqual([])
}

/** El elemento no se superpone al disparador del menú del Centro. */
async function expectMenuFree(locator: Locator, label: string) {
  const overlap = await locator.evaluate((element) => {
    const box = element.getBoundingClientRect()
    const menu = document.querySelector('[data-testid="shell-menu-trigger"]')?.getBoundingClientRect()
    if (!menu) return 0
    const width = Math.min(box.right, menu.right) - Math.max(box.left, menu.left)
    const height = Math.min(box.bottom, menu.bottom) - Math.max(box.top, menu.top)
    return width > 0 && height > 0 ? width * height : 0
  })
  expect(overlap, `${label}: tapa el menú`).toBe(0)
}

for (const viewport of VIEWPORTS) {
  test.describe(`bienvenida del piloto · ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test('invitación y paso 1: textos, lectura sin desplazamiento, botones y posición', async ({
      page,
    }) => {
      const writes = trackWrites(page)
      await installRoleExperience(page, 'COORDINADOR')
      await page.goto('/')
      await expect(page.getByTestId('operational-shell')).toBeVisible()

      const invitation = page.getByTestId('pilot-invitation')
      await expect(invitation).toBeVisible()
      await expect(invitation.getByRole('heading')).toHaveText(INVITATION_TITLE)
      await expect(invitation.locator('.pilot-invitation__text')).toHaveText(INVITATION_TEXT)
      // Orden de lectura: primero la salida, al final la acción principal.
      await expect(invitation.getByRole('button')).toHaveText(['Ahora no', 'Iniciar recorrido'])
      await expectInViewport(invitation, 'invitación')
      await expectNoInnerScroll(invitation, 'invitación')
      await expectTapTargets(invitation, 44, 'invitación')
      await expectMenuFree(invitation, 'invitación')
      await expectOnTop(invitation, 'invitación')
      // Con movimiento reducido (configuración de la suite) aparece ya opaca, sin fundido.
      await expect(invitation).toHaveCSS('animation-name', 'none')
      await expect(invitation).toHaveCSS('opacity', '1')
      await capture(page, `${viewport.name}-invitacion`)

      await page.getByTestId('pilot-invitation-start').click()
      await expect(invitation).toHaveCount(0)

      const card = page.locator('.novex-tour__card')
      await expect(page.locator('.novex-tour__count')).toHaveText('Paso 1 de 11')
      await expect(card.locator('#novex-tour-title')).toHaveText(STEP_TITLE)
      await expect(card.locator('#novex-tour-description')).toHaveText(STEP_TEXT)
      await expect(card.locator('.novex-tour__progress')).toBeVisible()
      await expect(card.getByRole('button', { name: 'Siguiente' })).toBeVisible()
      await expect(card.getByRole('button', { name: 'Omitir recorrido' })).toBeVisible()
      await expect(card.getByRole('button', { name: 'Anterior' })).toBeDisabled()
      await expectInViewport(card, 'paso 1')
      await expectNoInnerScroll(card, 'paso 1')
      await expectMenuFree(card, 'paso 1')
      await expectOnTop(card, 'paso 1')
      await expect(card).toBeFocused()
      // Los botones del globo son el estilo común de todos los pasos: se registran, no se exigen aquí.
      const bubbleButtons = await card.locator('footer button').evaluateAll((buttons) =>
        buttons.map((button) => `${button.textContent?.trim()}=${Math.round(button.getBoundingClientRect().height)}px`),
      )
      test.info().annotations.push({ type: 'botones-globo', description: bubbleButtons.join(', ') })
      await capture(page, `${viewport.name}-paso-1`)

      await card.getByRole('button', { name: 'Siguiente' }).click()
      await expect(page.locator('.novex-tour__count')).toHaveText('Paso 2 de 11')
      expect(writes, 'la bienvenida no escribe en el backend').toEqual([])
    })
  })
}

test.describe('bienvenida del piloto · controles', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('«Ahora no» cierra la invitación sin iniciar el recorrido ni escribir', async ({ page }) => {
    const writes = trackWrites(page)
    await installRoleExperience(page, 'COORDINADOR')
    await page.goto('/')
    await page.getByTestId('pilot-invitation-later').click()
    await expect(page.getByTestId('pilot-invitation')).toHaveCount(0)
    await expect(page.locator('.novex-tour')).toHaveCount(0)
    expect(writes).toEqual([])
  })

  test('desde el paso 1 se puede omitir el recorrido sin escribir', async ({ page }) => {
    const writes = trackWrites(page)
    await installRoleExperience(page, 'COORDINADOR')
    await page.goto('/')
    await page.getByTestId('pilot-invitation-start').click()
    await expect(page.locator('#novex-tour-title')).toHaveText(STEP_TITLE)
    await page.getByRole('button', { name: 'Omitir recorrido' }).click()
    await expect(page.locator('.novex-tour')).toHaveCount(0)
    await expect(page.getByTestId('pilot-invitation')).toHaveCount(0)
    expect(writes).toEqual([])
  })

  const OTHER_ROLES: RoleCode[] = ['ANALISTA', 'DIRECTOR', 'ADMIN']
  for (const role of OTHER_ROLES) {
    test(`${role} no recibe la invitación ni el paso 1`, async ({ page }) => {
      await installRoleExperience(page, role)
      await page.goto('/')
      await expect(page.getByTestId('operational-shell')).toBeVisible()
      await expect(page.getByTestId('pilot-invitation')).toHaveCount(0)
      await expect(page.locator('.novex-tour')).toHaveCount(0)
    })
  }
})
