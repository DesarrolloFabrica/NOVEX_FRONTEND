import { expect, test } from 'playwright/test'
import {
  installResponsiveCentro,
  SESSION_KEY,
  TOKEN_KEY,
} from './responsive-centro.fixture'

async function openCenter(role: 'ADMIN' | 'DIRECTOR' | 'ANALISTA' | 'COORDINADOR', page: Parameters<typeof installResponsiveCentro>[0]) {
  await installResponsiveCentro(page, role)
  await page.goto('/centro-operacional')
  await expect(page.getByTestId('operational-shell')).toBeVisible({
    timeout: 60_000,
  })
}

test.describe('menú flotante del Centro Operacional', () => {
  test('ADMIN entra a Administración y regresa mediante la cabecera que se conserva', async ({
    page,
  }) => {
    await openCenter('ADMIN', page)

    await page.getByTestId('shell-menu-trigger').click()
    await page.getByTestId('shell-menu-option-admin').click()
    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.locator('.novex-os-topbar')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Control del sistema' })).toBeVisible()

    await page.getByRole('button', { name: /Menú de usuario/ }).click()
    await page.getByRole('menuitem', { name: /Centro operacional/ }).click()
    await expect(page).toHaveURL(/\/centro-operacional$/)
    await expect(page.getByTestId('operational-shell')).toBeVisible()
    await expect(page.locator('.eoc-chrome')).toHaveCount(0)
  })

  test('ANALISTA abre el registro mediante el intent protegido existente', async ({
    page,
  }) => {
    await openCenter('ANALISTA', page)

    await page.getByTestId('shell-menu-trigger').click()
    const register = page.getByTestId('shell-menu-register')
    await expect(register).toHaveAttribute(
      'href',
      '/centro-operacional?reportar=interno',
    )
    await register.click()
    await expect(page.getByTestId('report-form')).toBeVisible()
    await expect(page).toHaveURL(/\/centro-operacional$/)
    await expect(page.getByTestId('shell-menu-panel')).toHaveCount(0)
  })

  test('logout cierra el panel, limpia la sesión y vuelve al login', async ({
    page,
  }) => {
    await openCenter('DIRECTOR', page)

    await page.getByTestId('shell-menu-trigger').click()
    await page.getByTestId('shell-menu-logout').click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByTestId('shell-menu-panel')).toHaveCount(0)
    await expect
      .poll(() =>
        page.evaluate(
          ({ sessionKey, tokenKey }) => ({
            session: localStorage.getItem(sessionKey),
            token: localStorage.getItem(tokenKey),
          }),
          { sessionKey: SESSION_KEY, tokenKey: TOKEN_KEY },
        ),
      )
      .toEqual({ session: null, token: null })
  })
})

test.describe('menú flotante táctil', () => {
  test.use({ hasTouch: true, viewport: { width: 820, height: 1180 } })

  test('abre y cierra mediante tap sin desplazar el escenario', async ({
    page,
  }) => {
    await openCenter('COORDINADOR', page)
    const shell = page.getByTestId('operational-shell')
    const before = await shell.boundingBox()

    await page.getByTestId('shell-menu-trigger').tap()
    await expect(page.getByTestId('shell-menu-panel')).toBeVisible()
    expect(await shell.boundingBox()).toEqual(before)

    await page.getByTestId('shell-menu-trigger').tap()
    await expect(page.getByTestId('shell-menu-panel')).toBeHidden()
    expect(await shell.boundingBox()).toEqual(before)
  })

  test('la flecha de la baraja vuelve a la mesa mediante tap', async ({ page }) => {
    await openCenter('DIRECTOR', page)
    const card = page
      .getByTestId('shell-stage')
      .locator('[data-testid="coordination-card"][data-code="coord-especializaciones"]')
    await card.tap()
    await expect(card).toHaveAttribute('data-selected', 'true')
    await page.getByTestId('breadcrumb-direction').tap()
    await expect(page.getByTestId('operational-breadcrumb')).toHaveCount(0)
    await expect(card).toHaveAttribute('data-selected', 'false')
  })
})
