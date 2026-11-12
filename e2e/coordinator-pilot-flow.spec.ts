import { expect, test, type Page } from 'playwright/test'
import { ALL, install, OVERVIEW } from './coordinator-pilot.fixture'
import { installRoleExperience, type RoleCode } from './role-experience.fixture'

/*
 * Recorrido del COORDINADOR de principio a fin, sobre la pantalla actual
 * (`CoordinatorOperationalLayout`) y con datos simulados.
 *
 * Comprueba lo que se rompió en la versión anterior: el globo de bienvenida
 * centrado y con velo, que ningún paso se quede buscando un elemento que no
 * existe, el paso interactivo (abrir una situación), la petición de «Volver» y
 * que el recorrido no escribe nada en el backend.
 */

const VIEWPORTS = [
  { name: 'escritorio', width: 1440, height: 900 },
  { name: 'tableta', width: 1024, height: 768 },
  { name: 'movil', width: 390, height: 844 },
] as const

const tour = (page: Page) => page.locator('.novex-tour')
const card = (page: Page) => page.locator('.novex-tour__card')
const title = (page: Page) => page.locator('#novex-tour-title')
const count = (page: Page) => page.locator('.novex-tour__count')
const button = (page: Page, name: string | RegExp) => tour(page).getByRole('button', { name })

async function openPilot(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('operational-shell')).toBeVisible()
  const later = page.getByTestId('pilot-invitation-later')
  if (await later.isVisible().catch(() => false)) await later.click()
  await page.getByTestId('shell-menu-trigger').click()
  await page.getByTestId('shell-menu-pilot').click()
  await expect(title(page)).toHaveText('Bienvenido a su Centro Operacional')
}

/** El globo cabe entero en la ventana. */
async function expectCardInViewport(page: Page) {
  // La entrada anima la posición (la hoja superior parte de -24 px): se mide al terminar.
  await card(page).evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  )
  const box = await card(page).boundingBox()
  const viewport = page.viewportSize()!
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1)
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1)
}

async function next(page: Page, expectedTitle: string) {
  await button(page, /Siguiente/).click()
  await expect(title(page)).toHaveText(expectedTitle)
  await expectCardInViewport(page)
}

for (const viewport of VIEWPORTS) {
  test.describe(`recorrido del coordinador · ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      contextOptions: { reducedMotion: 'no-preference' },
    })

    test('completa los pasos, abre una situación, pide volver y no escribe nada', async ({ page }) => {
      const writes = await install(page, { scenario: 'CRITICO' })
      await openPilot(page)

      // Bienvenida: velo completo, sin foco, globo centrado aunque haya animación.
      await expect(page.locator('.novex-tour__shade--full')).toBeVisible()
      await expect(page.locator('.novex-tour__spotlight')).toHaveCount(0)
      await page.waitForTimeout(400)
      const welcome = (await card(page).boundingBox())!
      const size = page.viewportSize()!
      expect(Math.abs(welcome.x + welcome.width / 2 - size.width / 2)).toBeLessThan(2)
      expect(Math.abs(welcome.y + welcome.height / 2 - size.height / 2)).toBeLessThan(2)

      await next(page, 'Lo primero que debe saber')
      await expect(page.locator('.novex-tour__spotlight')).toBeVisible()
      await next(page, 'Su coordinación, en una carta')
      await next(page, 'Cómo está su área')
      await next(page, 'Tres bandejas de trabajo')
      await next(page, 'Abra una situación')

      // Paso interactivo: sin «Siguiente»; avanza solo al abrir una fila.
      await expect(button(page, /Siguiente/)).toHaveCount(0)
      await expect(button(page, 'Saltar paso')).toBeVisible()
      await expect(tour(page)).toContainText('Esperando que elija una fila')
      await page.locator('.situation-row').first().click()
      await expect(title(page)).toHaveText('Todo sobre la situación')
      await expectCardInViewport(page)

      await next(page, 'Avance y cierre')

      // Al seguir, la columna derecha muestra el expediente: el recorrido pide volver.
      await button(page, /Siguiente/).click()
      await expect(title(page)).toHaveText('Regrese a la vista principal')
      await expect(page.locator('.novex-tour__spotlight--gate')).toBeVisible()
      await page.getByTestId('detail-bar-back').click()
      await expect(title(page)).toHaveText('Registre una novedad')

      await next(page, 'Historial y gestión')
      await next(page, 'Listo para trabajar')
      await button(page, /Finalizar/).click()
      await expect(tour(page)).toHaveCount(0)

      expect(writes).toEqual([])
    })
  })
}

test.describe('recorrido del coordinador · navegación', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('«Saltar paso» omite el expediente y retroceder no rebota hacia delante', async ({ page }) => {
    await install(page, { scenario: 'CRITICO' })
    await openPilot(page)
    for (const expected of [
      'Lo primero que debe saber',
      'Su coordinación, en una carta',
      'Cómo está su área',
      'Tres bandejas de trabajo',
      'Abra una situación',
    ]) {
      await next(page, expected)
    }

    // Sin expediente abierto, los pasos que dependen de él se saltan.
    await button(page, 'Saltar paso').click()
    await expect(title(page)).toHaveText('Registre una novedad')

    // Atrás: el expediente sigue sin aplicar y se vuelve a «Abra una situación».
    await button(page, /Anterior/).click()
    await expect(title(page)).toHaveText('Abra una situación')
  })

  test('el teclado navega y Escape cierra; al reabrir empieza de nuevo', async ({ page }) => {
    await install(page, { scenario: 'CRITICO' })
    await openPilot(page)
    await page.keyboard.press('ArrowRight')
    await expect(title(page)).toHaveText('Lo primero que debe saber')
    await page.keyboard.press('ArrowRight')
    await expect(title(page)).toHaveText('Su coordinación, en una carta')
    await page.keyboard.press('ArrowLeft')
    await expect(title(page)).toHaveText('Lo primero que debe saber')

    await page.keyboard.press('Escape')
    await expect(tour(page)).toHaveCount(0)

    await page.getByTestId('shell-menu-trigger').click()
    await page.getByTestId('shell-menu-pilot').click()
    await expect(title(page)).toHaveText('Bienvenido a su Centro Operacional')
    await expect(count(page)).toHaveText(/^Paso 1 de /)
  })

  test('las flechas y Escape dentro de un control de la página no mueven el recorrido', async ({
    page,
  }) => {
    await install(page, { scenario: 'CRITICO' })
    await openPilot(page)
    for (const expected of [
      'Lo primero que debe saber',
      'Su coordinación, en una carta',
      'Cómo está su área',
      'Tres bandejas de trabajo',
    ]) {
      await next(page, expected)
    }
    // El selector de fecha queda fuera del foco: se usa con el teclado.
    const period = page.getByTestId('coordinator-period')
    await period.focus()
    for (let n = 0; n < 4; n++) await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Escape')
    await expect(title(page)).toHaveText('Tres bandejas de trabajo')

    // Las pestañas también usan flechas.
    await page.getByTestId('coordinator-to-resolve-tab').focus()
    await page.keyboard.press('ArrowRight')
    await expect(title(page)).toHaveText('Tres bandejas de trabajo')
  })
})

test.describe('recorrido del coordinador · seguimiento', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('tras el expediente explica el seguimiento de la situación', async ({ page }) => {
    const writes = await install(page, { scenario: 'CRITICO' })
    await openPilot(page)
    await expect(count(page)).toHaveText('Paso 1 de 11')
    for (const expected of [
      'Lo primero que debe saber',
      'Su coordinación, en una carta',
      'Cómo está su área',
      'Tres bandejas de trabajo',
      'Abra una situación',
    ]) {
      await next(page, expected)
    }
    await page.locator('.situation-row').first().click()
    await expect(title(page)).toHaveText('Todo sobre la situación')
    await next(page, 'Avance y cierre')
    await expect(page.locator('.novex-tour__spotlight')).toBeVisible()
    await button(page, /Siguiente/).click()
    await page.getByTestId('detail-bar-back').click()
    await expect(title(page)).toHaveText('Registre una novedad')
    await expect(page.getByTestId('report-situation-button')).toBeVisible()
    expect(writes).toEqual([])
  })
})

test.describe('invitación al recorrido', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('el coordinador la ve al entrar, sin velo ni recorrido abierto', async ({ page }) => {
    await install(page, { scenario: 'CRITICO' })
    await page.goto('/')
    await expect(page.getByTestId('pilot-invitation')).toBeVisible()
    await expect(tour(page)).toHaveCount(0)
  })

  test('«Ahora no» la cierra, deja la pantalla usable y no reaparece al recargar', async ({ page }) => {
    await install(page, { scenario: 'CRITICO' })
    await page.goto('/')
    await page.getByTestId('pilot-invitation-later').click()
    await expect(page.getByTestId('pilot-invitation')).toHaveCount(0)

    await page.getByTestId('shell-menu-trigger').click()
    await expect(page.getByTestId('shell-menu-trigger')).toHaveAttribute('aria-expanded', 'true')

    await page.reload()
    await expect(page.getByTestId('operational-shell')).toBeVisible()
    await expect(page.getByTestId('pilot-invitation')).toHaveCount(0)
  })

  test('«Iniciar recorrido» abre la bienvenida y retira la invitación', async ({ page }) => {
    await install(page, { scenario: 'CRITICO' })
    await page.goto('/')
    await page.getByTestId('pilot-invitation-start').click()
    await expect(title(page)).toHaveText('Bienvenido a su Centro Operacional')
    await expect(count(page)).toHaveText('Paso 1 de 11')
    await expect(page.getByTestId('pilot-invitation')).toHaveCount(0)
  })

  const OTHER_ROLES: RoleCode[] = ['ANALISTA', 'DIRECTOR', 'ADMIN']
  for (const roleCode of OTHER_ROLES) {
    test(`${roleCode} no recibe la invitación ni el recorrido del coordinador`, async ({ page }) => {
      await installRoleExperience(page, roleCode)
      await page.route('**/api/v1/operational-overview*', (route) => route.fulfill({ json: OVERVIEW }))
      await page.goto('/')
      await expect(page.getByTestId('operational-shell')).toBeVisible()
      await expect(page.getByTestId('pilot-invitation')).toHaveCount(0)
      await expect(tour(page)).toHaveCount(0)
    })
  }
})

test.describe('recorrido del coordinador · expediente largo', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('el foco no se sale del panel, la página no salta y el scroll del panel no lo deforma', async ({ page }) => {
    // Descripción muy larga: el expediente supera el alto de su panel con scroll.
    const originals = ALL.map((item) => item.description)
    for (const item of ALL) item.description = 'Descripción larga del problema simulado. '.repeat(40)
    try {
      await install(page, { scenario: 'CRITICO' })
      await openPilot(page)
      for (const expected of [
        'Lo primero que debe saber',
        'Su coordinación, en una carta',
        'Cómo está su área',
        'Tres bandejas de trabajo',
        'Abra una situación',
      ]) {
        await next(page, expected)
      }
      const pageScroll = () =>
        page.evaluate(() =>
          [...document.querySelectorAll('*')].reduce((total, element) => {
            const inPanel = element.closest('[data-testid="action-panel"]')
            return inPanel ? total : total + element.scrollTop
          }, 0),
        )
      const before = await pageScroll()
      await page.locator('.situation-row').first().click()
      await expect(title(page)).toHaveText('Todo sobre la situación')
      await page.waitForTimeout(700)

      const spot = (await page.locator('.novex-tour__spotlight').boundingBox())!
      const panel = (await page.getByTestId('action-panel').boundingBox())!
      // El relleno del foco (10 px) puede asomar; nunca el expediente oculto.
      expect(spot.y).toBeGreaterThanOrEqual(panel.y - 12)
      expect(spot.y + spot.height).toBeLessThanOrEqual(panel.y + panel.height + 12)
      expect(await pageScroll()).toBe(before)

      // Leer desplazándose dentro del panel: el foco no se mueve ni se encoge
      // hasta quedar en una franja bajo la barra «Volver».
      const scrollPanel = (where: 'end' | 'start') =>
        page.evaluate((position) => {
          let element: HTMLElement | null = document.querySelector('[data-tour="problem-detail"]')
          while (element && !(element.scrollHeight > element.clientHeight &&
            /(auto|scroll)/.test(getComputedStyle(element).overflowY))) {
            element = element.parentElement
          }
          if (!element) return false
          element.scrollTop = position === 'end' ? element.scrollHeight : 0
          return true
        }, where)
      expect(await scrollPanel('end')).toBe(true)
      await page.waitForTimeout(400)
      const afterScroll = (await page.locator('.novex-tour__spotlight').boundingBox())!
      expect(Math.abs(afterScroll.y - spot.y)).toBeLessThan(2)
      expect(Math.abs(afterScroll.height - spot.height)).toBeLessThan(2)
      await expect(title(page)).toHaveText('Todo sobre la situación')

      await scrollPanel('start')
      await page.waitForTimeout(400)
      const back = (await page.locator('.novex-tour__spotlight').boundingBox())!
      expect(Math.abs(back.height - spot.height)).toBeLessThan(2)
    } finally {
      ALL.forEach((item, index) => {
        item.description = originals[index]
      })
    }
  })
})
