import { expect, test, type Locator, type Page } from 'playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  B2B,
  ESPE,
  installResponsiveCentro,
  type ResponsiveRole,
} from './responsive-centro.fixture'

/**
 * Batería responsive del Centro Operacional: 6 resoluciones × 4 roles.
 *
 * Qué protege:
 * - sin desbordamiento horizontal global;
 * - el shell llena el alto disponible (sin filas muertas bajo el menú);
 * - las regiones principales son visibles DENTRO de la pantalla;
 * - las vidas del personaje se ven completas dentro de su región;
 * - la carta propia del COORDINADOR se ve y no invade otros paneles;
 * - selección de carta, filtros, apertura de problema y pestañas de lectura
 *   siguen funcionando.
 *
 * Las comprobaciones geométricas son `expect.soft`: un fallo no corta el test,
 * así la serie de capturas y medidas queda completa para comparar.
 *
 * Capturas y medidas: `test-results/responsive/<RESPONSIVE_LABEL>/` (ignorado
 * por git). Para comparar antes/después:
 *   RESPONSIVE_LABEL=before npx playwright test responsive-centro-operacional
 *   RESPONSIVE_LABEL=after  npx playwright test responsive-centro-operacional
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LABEL = process.env.RESPONSIVE_LABEL ?? 'current'
const OUT = path.join(__dirname, '..', 'test-results', 'responsive', LABEL)

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 820, height: 1180 },
  { width: 768, height: 1024 },
] as const

const ROLES: readonly ResponsiveRole[] = ['ADMIN', 'DIRECTOR', 'ANALISTA', 'COORDINADOR']

/** Alto mínimo tras recuperar al menos 55 px respecto a la medición de Fase 1. */
const MIN_SHELL_HEIGHT: Readonly<Record<string, number>> = {
  '1920x1080': 1021,
  '1440x900': 841,
  '1366x768': 709,
  '1024x768': 709,
  '820x1180': 1132,
  '768x1024': 976,
}

/** Tolerancia de redondeo y bordes decorativos. */
const EPS = 2

interface Box {
  x: number
  y: number
  width: number
  height: number
}

async function box(locator: Locator): Promise<Box> {
  const value = await locator.boundingBox()
  expect(value, 'el elemento debe tener caja').not.toBeNull()
  return value as Box
}

function inside(child: Box, parent: Box, eps = EPS) {
  return (
    child.x >= parent.x - eps &&
    child.y >= parent.y - eps &&
    child.x + child.width <= parent.x + parent.width + eps &&
    child.y + child.height <= parent.y + parent.height + eps
  )
}

function intersects(a: Box, b: Box, eps = EPS) {
  return (
    a.x + eps < b.x + b.width &&
    b.x + eps < a.x + a.width &&
    a.y + eps < b.y + b.height &&
    b.y + eps < a.y + a.height
  )
}

/** Tablet vertical: la composición por filas de la Fase 2A. */
function isPortraitTablet(page: Page) {
  const viewport = page.viewportSize()!
  return viewport.height > viewport.width && viewport.width <= 1100
}

/**
 * Objetivos de la Fase 2A en tablet vertical: personaje dibujado ≥160 px
 * (≥120 en COORDINADOR), cartas ≥90 px, pestañas de lectura enteras y ningún
 * botón de acción partido en 3+ líneas. El tamaño dibujado sale del artboard
 * 800×900 con Contain dentro de la figura.
 */
async function checkPortraitTargets(
  page: Page,
  role: ResponsiveRole,
  record: Record<string, unknown>,
) {
  if (!isPortraitTablet(page)) return
  const targets = await page.evaluate(() => {
    const figure = document.querySelector('.direction-character__figure')!.getBoundingClientRect()
    const drawnWidth = Math.min(figure.width, (figure.height * 800) / 900)
    const stage = document.querySelector('[data-testid="shell-stage"]')
    const cards = stage
      ? Array.from(stage.querySelectorAll<HTMLElement>('[data-testid="coordination-card"]'))
          .filter((c) => c.offsetWidth > 0)
          .map((c) => c.offsetWidth)
      : []
    const nav = document.querySelector('.director-reading__modes')
    const navBox = nav?.getBoundingClientRect()
    const cutTabs = nav
      ? Array.from(nav.querySelectorAll('button')).filter((b) => {
          const r = b.getBoundingClientRect()
          return r.right > navBox!.right + 1 || r.left < navBox!.left - 1
        }).length
      : 0
    const action = document.querySelector('.operational-shell__action')
    const brokenButtons = action
      ? Array.from(action.querySelectorAll<HTMLElement>('button, a')).filter((b) => {
          if (!b.offsetWidth) return false
          const cs = getComputedStyle(b)
          const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2
          const content = b.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
          return Math.round(content / lineHeight) >= 3
        }).length
      : 0
    return {
      drawnWidth: Math.round(drawnWidth),
      minCard: cards.length ? Math.min(...cards) : null,
      cutTabs,
      brokenButtons,
    }
  })
  record['vertical.objetivos'] = targets
  const minDrawn = role === 'COORDINADOR' ? 120 : 160
  expect
    .soft(targets.drawnWidth, `vertical: personaje dibujado ≥ ${minDrawn} px`)
    .toBeGreaterThanOrEqual(minDrawn)
  if (targets.minCard !== null) {
    expect.soft(targets.minCard, 'vertical: cartas ≥ 90 px').toBeGreaterThanOrEqual(90)
  }
  expect.soft(targets.cutTabs, 'vertical: pestañas de lectura enteras').toBe(0)
  expect.soft(targets.brokenButtons, 'vertical: ningún botón de acción partido en 3+ líneas').toBe(0)
}

async function settle(page: Page) {
  await page.waitForTimeout(900)
}

async function waitReady(page: Page, role: ResponsiveRole) {
  await expect(page.getByTestId('operational-shell')).toBeVisible({ timeout: 60_000 })
  if (role === 'COORDINADOR') {
    await expect(
      page.getByTestId('coordinator-to-resolve').getByTestId('problem-row').first(),
    ).toBeVisible({ timeout: 30_000 })
  } else {
    await expect(
      page.getByTestId('shell-stage').getByTestId('coordination-card').first(),
    ).toBeVisible({ timeout: 30_000 })
  }
  await expect(page.getByTestId('direction-character-lives')).toBeAttached()
  await settle(page)
}

async function measureGlobal(page: Page) {
  return page.evaluate(() => {
    const deck = document.querySelector<HTMLElement>('.novex-os-deck__content')
    const shell = document.querySelector<HTMLElement>('[data-testid="operational-shell"]')
    /*
     * Quién desplaza: contenedores con scroll vertical real (contenido mayor
     * que la caja y overflow auto/scroll). La ruta del Centro no debe ser uno
     * de ellos: el scroll vive dentro de cada panel.
     */
    const scrollers = Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .filter((el) => {
        const overflowY = getComputedStyle(el).overflowY
        return (
          (overflowY === 'auto' || overflowY === 'scroll') &&
          el.scrollHeight > el.clientHeight + 1 &&
          el.clientHeight > 0
        )
      })
      .map((el) => (el.dataset.testid ?? el.className.toString()).slice(0, 60))
    return {
      innerWidth,
      innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      bodyScrollWidth: document.body.scrollWidth,
      deckOverflowY: deck ? getComputedStyle(deck).overflowY : null,
      deckHiddenPx: deck ? deck.scrollHeight - deck.clientHeight : null,
      shellHeight: shell?.getBoundingClientRect().height ?? null,
      eocChromeCount: document.querySelectorAll('.eoc-chrome').length,
      accessibleTitleCount: document.querySelectorAll(
        'h1.eoc-accessible-title',
      ).length,
      scrollers,
    }
  })
}

async function checkGlobal(page: Page, record: Record<string, unknown>, phase: string) {
  const global = await measureGlobal(page)
  record[`${phase}.global`] = global
  expect
    .soft(global.scrollWidth, `${phase}: sin desbordamiento horizontal`)
    .toBeLessThanOrEqual(global.innerWidth)
  expect
    .soft(global.scrollHeight, `${phase}: la página no desplaza en vertical`)
    .toBeLessThanOrEqual(global.innerHeight)
  expect.soft(global.eocChromeCount, `${phase}: el chrome superior no se monta`).toBe(0)
  expect
    .soft(global.accessibleTitleCount, `${phase}: la vista conserva un h1 accesible`)
    .toBe(1)
  expect
    .soft(global.deckOverflowY, `${phase}: el scroll de ruta queda desactivado explícitamente`)
    .toBe('hidden')
  expect
    .soft(global.deckHiddenPx ?? 0, `${phase}: el contenido cabe en la ruta (sin scroll de ruta)`)
    .toBeLessThanOrEqual(EPS)

  const expectedShellHeight = MIN_SHELL_HEIGHT[`${global.innerWidth}x${global.innerHeight}`]
  if (expectedShellHeight) {
    expect
      .soft(global.shellHeight ?? 0, `${phase}: el shell recupera al menos 55 px de alto`)
      .toBeGreaterThanOrEqual(expectedShellHeight)
  }

  const shell = await box(page.getByTestId('operational-shell'))
  const menu = await box(page.getByTestId('shell-menu-anchor'))
  record[`${phase}.menuAnchor`] = menu
  expect
    .soft(menu.y - shell.y, `${phase}: el menú queda anclado arriba`)
    .toBeLessThanOrEqual(16)
  expect
    .soft(
      shell.x + shell.width - (menu.x + menu.width),
      `${phase}: el menú queda anclado a la derecha`,
    )
    .toBeLessThanOrEqual(16)

  // Escenario a sangre: telón y suelo cubren toda la pantalla, sin deformarse.
  const scene = await page.getByTestId('shell-circus-scene').evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const image = element.querySelector('img')
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      objectFit: image ? getComputedStyle(image).objectFit : null,
    }
  })
  record[`${phase}.scene`] = scene
  expect
    .soft(
      scene.x <= 0.5 &&
        scene.y <= 0.5 &&
        scene.x + scene.width >= global.innerWidth - 0.5 &&
        scene.y + scene.height >= global.innerHeight - 0.5,
      `${phase}: el escenario cubre todo el viewport`,
    )
    .toBe(true)
  expect.soft(scene.objectFit, `${phase}: el fondo recorta sin deformar`).toBe('cover')

  // La hamburguesa flota sobre el escenario: no puede tapar un control.
  const covered = await page.getByTestId('shell-menu-trigger').evaluate((trigger) => {
    const anchor = trigger.closest('[data-testid="shell-menu-anchor"]')!
    const rect = trigger.getBoundingClientRect()
    const hits = new Set<string>()
    for (const fx of [0.1, 0.5, 0.9]) {
      for (const fy of [0.1, 0.5, 0.9]) {
        const under = document
          .elementsFromPoint(rect.x + rect.width * fx, rect.y + rect.height * fy)
          .find((element) => !anchor.contains(element))
        const control = under?.closest(
          'button, a[href], select, input, textarea, [role="button"], [tabindex]:not([tabindex="-1"])',
        )
        if (control) {
          hits.add(
            (control as HTMLElement).dataset.testid ??
              control.getAttribute('aria-label') ??
              control.tagName,
          )
        }
      }
    }
    return Array.from(hits)
  })
  record[`${phase}.menuCovers`] = covered
  expect.soft(covered, `${phase}: la hamburguesa no tapa ningún control`).toEqual([])
}

async function operationalGeometry(page: Page) {
  return page.evaluate(() => {
    const shell = document.querySelector<HTMLElement>(
      '[data-testid="operational-shell"]',
    )
    if (!shell) return {}

    const selectors = [
      '[data-testid^="shell-region-"]',
      '[data-testid="shell-stage"]',
    ]
    const elements = shell.querySelectorAll<HTMLElement>(selectors.join(','))
    return Object.fromEntries(
      Array.from(elements).map((element) => {
        const rect = element.getBoundingClientRect()
        return [
          element.dataset.testid!,
          { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        ]
      }),
    )
  })
}

function expectSameGeometry(
  before: Record<string, Box>,
  after: Record<string, Box>,
) {
  expect(Object.keys(after)).toEqual(Object.keys(before))
  for (const [testId, expected] of Object.entries(before)) {
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      expect
        .soft(after[testId]?.[key], `menú abierto: ${testId}.${key} no cambia`)
        .toBeCloseTo(expected[key], 1)
    }
  }
}

async function checkShellMenu(
  page: Page,
  role: ResponsiveRole,
  tag: string,
  record: Record<string, unknown>,
) {
  const trigger = page.getByTestId('shell-menu-trigger')
  await expect(trigger).toBeVisible()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  const triggerBox = await box(trigger)
  expect.soft(triggerBox.width, 'hamburguesa con 44 px táctiles de ancho').toBeGreaterThanOrEqual(44)
  expect.soft(triggerBox.height, 'hamburguesa con 44 px táctiles de alto').toBeGreaterThanOrEqual(44)

  const before = (await operationalGeometry(page)) as Record<string, Box>
  await trigger.click()
  const panel = page.getByTestId('shell-menu-panel')
  await expect(panel).toBeVisible()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')

  const focusedOption = role === 'ADMIN' ? 'shell-menu-option-admin' : 'shell-menu-option-center'
  await expect(page.locator(':focus')).toHaveAttribute('data-testid', focusedOption)
  await expect(panel).toContainText(`${role === 'ADMIN' ? 'Administrador' : role[0] + role.slice(1).toLowerCase()} E2E`)
  await expect(page.getByTestId('shell-menu-option-center')).toBeVisible()
  await expect(page.getByTestId('shell-menu-option-admin')).toHaveCount(role === 'ADMIN' ? 1 : 0)
  await expect(page.getByTestId('shell-menu-register')).toHaveCount(
    role === 'ANALISTA' || role === 'COORDINADOR' ? 1 : 0,
  )
  await expect(page.getByTestId('shell-menu-tutorial')).toHaveCount(0)

  const viewport = page.viewportSize()!
  const panelBox = await box(panel)
  expect.soft(inside(panelBox, { x: 0, y: 0, ...viewport }), 'panel dentro del viewport').toBe(true)
  expect
    .soft(panelBox.y >= triggerBox.y + triggerBox.height - EPS, 'panel abre debajo de la hamburguesa')
    .toBe(true)
  expect.soft(panelBox.width, 'panel compacto: ancho máximo de 320 px').toBeLessThanOrEqual(322)

  const whileOpen = (await operationalGeometry(page)) as Record<string, Box>
  expectSameGeometry(before, whileOpen)
  record['menu'] = { trigger: triggerBox, panel: panelBox, geometry: whileOpen }
  await shot(page, `${tag}-menu-abierto`)

  if (viewport.width === 1024 && viewport.height === 768) {
    const help = page.getByRole('button', { name: 'Ayuda del Centro operacional' })
    await help.click()
    await expect(panel.locator('.novex-help-menu__popover')).toContainText(
      'Cada carta representa una coordinación',
    )
    await help.click()
  }

  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(trigger).toBeFocused()

  if (viewport.width === 1024 && viewport.height === 768) {
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('shell-menu-panel')).toBeVisible()
    await page.mouse.click(1, 1)
    await expect(page.getByTestId('shell-menu-panel')).toBeHidden()
    await expect(trigger).toBeFocused()

    await page.keyboard.press('Space')
    await expect(page.getByTestId('shell-menu-panel')).toBeVisible()
    await page.getByTestId('shell-menu-option-center').click()
    await expect(page.getByTestId('shell-menu-panel')).toBeHidden()
  }
}

async function expectMenuAboveCurrentContent(page: Page, context: string) {
  await page.getByTestId('shell-menu-trigger').click()
  const panel = page.getByTestId('shell-menu-panel')
  await expect(panel).toBeVisible()
  const panelOwnsTopLayer = await panel.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const top = document.elementFromPoint(
      rect.x + rect.width / 2,
      rect.y + Math.min(40, rect.height / 2),
    )
    return Boolean(top && element.contains(top))
  })
  expect.soft(panelOwnsTopLayer, `${context}: el menú queda en la capa superior`).toBe(true)
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
}

async function checkLives(page: Page, record: Record<string, unknown>, phase: string) {
  const region = page.getByTestId('shell-region-character')
  const lives = page.locator('[data-testid="direction-character-lives"] .character-lives')
  if ((await lives.count()) === 0) {
    record[`${phase}.lives`] = 'sin vidas'
    return
  }
  await expect(lives).toBeVisible()
  const regionBox = await box(region)
  const livesBox = await box(lives)
  record[`${phase}.lives`] = { region: regionBox, lives: livesBox }

  const parts = lives.locator('.character-lives__heart, .character-lives__value')
  const count = await parts.count()
  for (let index = 0; index < count; index += 1) {
    const partBox = await box(parts.nth(index))
    expect
      .soft(inside(partBox, regionBox), `${phase}: vida #${index} completa dentro de su región`)
      .toBe(true)
  }
}

async function checkRegionsOnScreen(page: Page, testIds: string[], phase: string) {
  const viewport = page.viewportSize()!
  const screen = { x: 0, y: 0, width: viewport.width, height: viewport.height }
  for (const id of testIds) {
    const locator = page.getByTestId(id)
    await expect(locator, `${phase}: ${id} visible`).toBeVisible()
    expect.soft(inside(await box(locator), screen), `${phase}: ${id} dentro de la pantalla`).toBe(true)
  }
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`) })
}

/**
 * Todas las piezas de la baraja —las nueve cartas y las subcartas asomadas de
 * las pilas— se ven enteras: ningún antepasado con `overflow` distinto de
 * `visible` las recorta. Las cartas están giradas, así que su caja envolvente
 * marca la esquina real más extrema, que es la que el recorte se comería.
 */
async function checkDeckPieces(page: Page, record: Record<string, unknown>, phase: string) {
  const pieces = await page.getByTestId('shell-stage').evaluate((stage) => {
    const visible = (el: Element) => {
      const style = getComputedStyle(el)
      return (
        (el as HTMLElement).offsetWidth > 0 &&
        style.visibility !== 'hidden' &&
        Number(style.opacity) > 0.05
      )
    }
    return Array.from(
      stage.querySelectorAll(
        '[data-testid="coordination-card"], [data-testid="coordination-deck-peek"]',
      ),
    )
      .filter(visible)
      .map((el) => {
        const rect = el.getBoundingClientRect()
        let clip = { left: -Infinity, top: -Infinity, right: Infinity, bottom: Infinity }
        for (let p = el.parentElement; p; p = p.parentElement) {
          const style = getComputedStyle(p)
          if (style.overflowX === 'visible' && style.overflowY === 'visible') continue
          const r = p.getBoundingClientRect()
          clip = {
            left: Math.max(clip.left, r.left),
            top: Math.max(clip.top, r.top),
            right: Math.min(clip.right, r.right),
            bottom: Math.min(clip.bottom, r.bottom),
          }
        }
        return {
          piece: (el as HTMLElement).dataset.code ?? 'subcarta',
          width: Math.round(rect.width),
          bottom: Math.max(0, Math.round(rect.bottom - clip.bottom)),
          top: Math.max(0, Math.round(clip.top - rect.top)),
          left: Math.max(0, Math.round(clip.left - rect.left)),
          right: Math.max(0, Math.round(rect.right - clip.right)),
        }
      })
  })
  record[`${phase}.deck`] = pieces
  const cards = pieces.filter((piece) => piece.piece !== 'subcarta')
  expect.soft(cards.length, `${phase}: las nueve cartas de la mesa están presentes`).toBeGreaterThanOrEqual(9)
  for (const piece of pieces) {
    expect
      .soft(
        Math.max(piece.bottom, piece.top, piece.left, piece.right),
        `${phase}: ${piece.piece} entera (recorte b${piece.bottom} t${piece.top} l${piece.left} r${piece.right})`,
      )
      .toBeLessThanOrEqual(1)
  }
}

async function checkProblemList(page: Page, phase: string) {
  const list = page.getByTestId('coordination-problem-list')
  const rows = list.getByTestId('problem-row')
  await expect(rows.first()).toBeVisible()

  // Sin filas duplicadas: cada problema aparece una sola vez.
  const titles = await rows.allTextContents()
  expect(new Set(titles).size, `${phase}: filas sin duplicados`).toBe(titles.length)

  // El primer elemento interactivo de la lista es visible dentro de su región.
  const region = await box(page.getByTestId('shell-region-coordination-problems'))
  expect.soft(inside(await box(rows.first()), region), `${phase}: primera fila dentro de la región`).toBe(true)

  // Los filtros siguen respondiendo.
  const before = await rows.count()
  await page.getByTestId('coordination-filter-severity').selectOption('HIGH')
  await expect.poll(() => rows.count()).toBeLessThan(before)
  await page.getByTestId('coordination-filter-severity').selectOption('ALL')
  await expect.poll(() => rows.count()).toBe(before)
}

for (const role of ROLES) {
  test.describe(`responsive ${role}`, () => {
    test.beforeAll(() => {
      mkdirSync(OUT, { recursive: true })
    })

    for (const viewport of VIEWPORTS) {
      const tag = `${role}-${viewport.width}x${viewport.height}`

      test(`${tag}`, async ({ page }) => {
        // Margen para máquinas cargadas: con WebGL por software un caso vertical
        // llega a ~4 min sin que haya bloqueo (medido en la Fase 2A).
        test.setTimeout(360_000)
        const record: Record<string, unknown> = { role, viewport }
        await page.setViewportSize(viewport)
        await installResponsiveCentro(page, role)
        await page.goto('/centro-operacional')
        await waitReady(page, role)

        try {
          if (role === 'COORDINADOR') {
            await runCoordinator(page, tag, record)
          } else {
            await runDeckRole(page, role, tag, record)
          }
        } finally {
          writeFileSync(path.join(OUT, `${tag}.json`), JSON.stringify(record, null, 2))
        }
      })
    }
  })
}

async function runDeckRole(
  page: Page,
  role: ResponsiveRole,
  tag: string,
  record: Record<string, unknown>,
) {
  await shot(page, `${tag}-0-inicio`)
  await checkGlobal(page, record, 'inicio')
  await checkLives(page, record, 'inicio')
  await checkRegionsOnScreen(
    page,
    ['shell-region-character', 'shell-region-coordination-problems', 'shell-stage'],
    'inicio',
  )
  await checkShellMenu(page, role, tag, record)
  await checkDeckPieces(page, record, 'reposo')

  // Hover sobre el mazo con subcartas: se eleva y abre su vista previa.
  const parentDeck = page
    .getByTestId('shell-stage')
    .locator('[data-testid="coordination-card"][data-code="coord-operaciones-academicas"]')
    .first()
  const parentBox = await box(parentDeck)
  await page.mouse.move(parentBox.x + parentBox.width / 2, parentBox.y + parentBox.height * 0.6)
  await settle(page)
  await checkDeckPieces(page, record, 'hover')
  await page.mouse.move(2, 2)
  await settle(page)

  // Selección de una coordinación desde la baraja.
  const card = page.getByTestId('shell-stage').locator(`[data-testid="coordination-card"][data-code="${ESPE}"]`)
  await card.click()
  await expect(card).toHaveAttribute('data-selected', 'true')
  await settle(page)
  await settle(page)
  await shot(page, `${tag}-1-seleccion`)
  await checkDeckPieces(page, record, 'seleccion')

  /*
   * Un solo retorno: la flecha de la miga, encima de las cartas y entera en la
   * banda. El «Volver a la mesa» inferior ya no existe ni reserva alto.
   */
  await expect(page.getByTestId('return-to-table')).toHaveCount(0)
  const back = page.getByTestId('breadcrumb-direction')
  await expect(back).toBeVisible()
  await expect(back).toHaveText('')
  const backBox = await box(back)
  const tableBox = await box(page.getByTestId('coordination-table'))
  expect
    .soft(inside(backBox, await box(page.getByTestId('shell-stage'))), 'flecha de retorno dentro de la banda')
    .toBe(true)
  expect.soft(backBox.y + backBox.height, 'flecha de retorno encima de la mesa').toBeLessThanOrEqual(tableBox.y + 1)

  /*
   * La baraja termina abajo, sin suelo muerto: en escritorio y tablet
   * horizontal, alineada con el borde inferior del panel de la derecha; en
   * tablet vertical (Fase 2A) ese panel va DEBAJO, así que la referencia es el
   * borde inferior de su propia banda.
   */
  const bottoms = await page.evaluate(() => {
    const stage = document.querySelector('[data-testid="shell-stage"]')!
    const pieces = Array.from(
      stage.querySelectorAll('[data-testid="coordination-card"], [data-testid="coordination-deck-peek"]'),
    ).filter((el) => (el as HTMLElement).offsetWidth > 0 && Number(getComputedStyle(el).opacity) > 0.05)
    const panel = document.querySelector('.operational-shell__action')!.getBoundingClientRect()
    const band = stage.getBoundingClientRect()
    return {
      deck: Math.max(...pieces.map((el) => el.getBoundingClientRect().bottom)),
      panel: panel.bottom,
      band: band.bottom,
      panelBeside: panel.left >= band.right - 1,
    }
  })
  record['seleccion.alineacion'] = bottoms
  const reference = bottoms.panelBeside ? bottoms.panel : bottoms.band
  expect
    .soft(reference - bottoms.deck, 'baraja alineada abajo: con el panel derecho o con su banda (≤ 12 px)')
    .toBeLessThanOrEqual(12)
  if (isPortraitTablet(page)) {
    expect.soft(bottoms.panelBeside, 'vertical: la lectura/acción va debajo de la baraja').toBe(false)
  }

  const stage = await box(page.getByTestId('shell-stage'))
  const cardBox = await box(card)
  record['seleccion.card'] = cardBox
  record['seleccion.stage'] = stage
  expect
    .soft(cardBox.x >= stage.x - EPS && cardBox.x + cardBox.width <= stage.x + stage.width + EPS,
      'seleccion: la carta seleccionada no se recorta en horizontal')
    .toBe(true)
  expect
    .soft(cardBox.y >= stage.y - EPS && cardBox.y + cardBox.height <= stage.y + stage.height + EPS,
      'seleccion: la carta seleccionada no se recorta en vertical')
    .toBe(true)

  await checkGlobal(page, record, 'seleccion')
  await checkLives(page, record, 'seleccion')
  await checkPortraitTargets(page, role, record)
  await checkProblemList(page, 'seleccion')

  if (role === 'DIRECTOR') {
    /*
     * La banda superior cede alto a la baraja solo mientras el personaje siga
     * limitado por el ANCHO (artboard 800×900, Contain): si la figura fuera más
     * baja que eso, la ilustración empezaría a encoger.
     */
    const figure = await box(page.locator('.direction-character__figure'))
    record['seleccion.figure'] = figure
    if (!isPortraitTablet(page)) {
      expect
        .soft(figure.height, 'personaje: la banda superior no encoge la ilustración')
        .toBeGreaterThanOrEqual(figure.width * (900 / 800) - EPS)
    }
    // En vertical la figura es ancha y la limita el alto: lo que se garantiza
    // es el tamaño dibujado (comprobación común en `checkPortraitTargets`).
    // La lista sigue siendo consultable: al menos tres filas completas a la vista.
    const fullRows = await page.getByTestId('coordination-panel-problems').evaluate((scroller) => {
      const s = scroller.getBoundingClientRect()
      return Array.from(scroller.querySelectorAll('[data-testid="problem-row"]')).filter((row) => {
        const r = row.getBoundingClientRect()
        return r.top >= s.top - 1 && r.bottom <= s.bottom + 1
      }).length
    })
    record['seleccion.filasVisibles'] = fullRows
    expect.soft(fullRows, 'problemas: al menos tres filas completas visibles').toBeGreaterThanOrEqual(3)

    const reading = page.getByTestId('director-reading-panel')
    await expect(reading).toBeVisible()
    await expect(page.getByTestId('director-flujo-chart')).toBeVisible({ timeout: 20_000 })
    await page.getByTestId('director-reading-mode-internos').click()
    await expect(page.getByTestId('director-reading-mode-internos')).toHaveAttribute('aria-pressed', 'true')
    await page.getByTestId('director-reading-mode-state').click()
    await expect(page.getByTestId('director-flujo-chart')).toBeVisible({ timeout: 20_000 })

    // Tooltip de Severidad: sobre la barra del extremo derecho, que es donde un
    // tooltip sin `confine` se saldría de la celda.
    await page.getByTestId('director-kpi-severity').scrollIntoViewIfNeeded()
    const severity = page.getByTestId('director-kpi-severity').locator('.novex-chart__canvas')
    await expect(severity).toBeVisible({ timeout: 20_000 })
    await settle(page)
    const chart = await box(severity)
    // Barra «Crítica» (color semántico NOVEX_SEVERITY_COLORS.critical).
    const critical = await box(severity.locator('path[fill="#9a2a26"]').first())
    await page.mouse.move(critical.x + critical.width / 2, critical.y + critical.height / 2)
    const tooltip = severity.getByText(/Severidad (baja|media|alta|crítica)/)
    await expect.soft(tooltip, 'severidad: tooltip visible al pasar por la barra').toBeVisible()
    if (await tooltip.isVisible()) {
      const tip = await box(tooltip)
      record['severidad.tooltip'] = { chart, tip }
      expect.soft(inside(tip, chart, 4), 'severidad: tooltip dentro de su gráfica').toBe(true)
    }
    await page.mouse.move(0, 0)
    await page.getByTestId('director-carga').scrollIntoViewIfNeeded()
  }

  // Apertura de un problema.
  await page.getByTestId('coordination-problem-list').getByTestId('problem-row').first().click()
  await expect(page.getByTestId('problem-detail')).toBeVisible({ timeout: 15_000 })
  await settle(page)
  await shot(page, `${tag}-2-detalle`)
  await checkGlobal(page, record, 'detalle')
  if (page.viewportSize()?.width === 1024) {
    await expectMenuAboveCurrentContent(page, 'detalle de problema abierto')
  }

  // La flecha también se usa con teclado: foco + Enter devuelve a la mesa.
  await page.getByTestId('breadcrumb-direction').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('operational-breadcrumb')).toHaveCount(0)
  await expect(card).toHaveAttribute('data-selected', 'false')
}

async function runCoordinator(page: Page, tag: string, record: Record<string, unknown>) {
  await shot(page, `${tag}-0-inicio`)
  await checkGlobal(page, record, 'inicio')
  await checkLives(page, record, 'inicio')
  await checkRegionsOnScreen(
    page,
    [
      'shell-region-character',
      'shell-region-my-reports',
      'shell-region-coordination-problems',
      'shell-region-action',
    ],
    'inicio',
  )
  await checkShellMenu(page, 'COORDINADOR', tag, record)
  await checkPortraitTargets(page, 'COORDINADOR', record)

  if (page.viewportSize()?.width === 1024) {
    const expand = page.getByTestId('coordinator-problems-expand')
    await expand.click()
    await expect(expand).toHaveAttribute('aria-expanded', 'true')
    await expectMenuAboveCurrentContent(page, 'lista de problemas expandida')
    await expand.click()
    await expect(expand).toHaveAttribute('aria-expanded', 'false')
  }

  // Carta propia: visible, dentro del rail y sin invadir los demás paneles.
  const ownCard = page.getByTestId('coordinator-own-card').getByTestId('coordination-card')
  await expect(ownCard).toBeVisible()
  await expect(ownCard).toHaveAttribute('data-code', B2B)
  const cardBox = await box(ownCard)
  const rail = await box(page.getByTestId('shell-region-rail'))
  const character = await box(page.getByTestId('shell-region-character'))
  record['inicio.ownCard'] = cardBox
  record['inicio.rail'] = rail
  expect.soft(cardBox.height, 'carta propia con alto legible').toBeGreaterThanOrEqual(110)
  expect.soft(inside(cardBox, rail, 4), 'carta propia dentro del rail').toBe(true)
  if (isPortraitTablet(page)) {
    // Fase 2A: en vertical la celda del rail es ancha; carta al lado del personaje.
    expect.soft(cardBox.x >= character.x + character.width - EPS, 'carta propia al lado del personaje').toBe(true)
  } else {
    expect.soft(cardBox.y >= character.y + character.height - EPS, 'carta propia debajo del personaje').toBe(true)
  }
  for (const id of [
    'shell-region-my-reports',
    'shell-region-coordination-problems',
    'shell-region-action',
  ]) {
    expect
      .soft(intersects(cardBox, await box(page.getByTestId(id))), `carta propia no invade ${id}`)
      .toBe(false)
  }

  // Nada tapa la carta: el punto central pertenece a la carta o a su envoltura.
  const covered = await page.evaluate(() => {
    const own = document.querySelector('[data-testid="coordinator-own-card"]')
    if (!own) return 'sin carta'
    const r = own.querySelector('[data-testid="coordination-card"]')!.getBoundingClientRect()
    const stack = document.elementsFromPoint(r.x + r.width / 2, r.y + r.height / 2)
    const top = stack.find((el) => !(el as HTMLElement).closest('[data-testid="shell-circus-scene"]'))
    if (!top) return 'nada'
    return own.contains(top) || top.contains(own) ? 'ok' : (top as HTMLElement).className.toString()
  })
  expect.soft(covered, 'ningún panel tapa la carta propia').toBe('ok')

  // Los dos grupos de problemas y el detalle siguen accesibles.
  await expect(page.getByTestId('coordinator-to-resolve').getByTestId('problem-row')).toHaveCount(2)
  await expect(page.getByTestId('coordinator-affecting').getByTestId('problem-row')).toHaveCount(1)
  await page.getByTestId('coordinator-to-resolve').getByTestId('problem-row').first().click()
  await expect(page.getByTestId('problem-detail')).toBeVisible({ timeout: 15_000 })
  await settle(page)
  await shot(page, `${tag}-2-detalle`)
  await checkGlobal(page, record, 'detalle')
  if (page.viewportSize()?.width === 1024) {
    await expectMenuAboveCurrentContent(page, 'detalle de problema abierto')
  }
}
