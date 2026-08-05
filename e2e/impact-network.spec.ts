import { expect, test, type Page } from 'playwright/test'
import { installImpactNetworkApiMocks } from './impact-network.fixtures'

const AUTH_SESSION_KEY = 'novex.auth.session.v1'
const AUTH_TOKEN_KEY = 'novex.auth.accessToken.v1'
const SUPERVISOR_SESSION = {
  id: 'e2e-supervisor',
  name: 'Directora E2E',
  role: 'supervisor',
  onboardingCompleted: true,
  onboardingSeenAt: '2026-07-22T00:00:00.000Z',
}

const AUTH_ME_RESPONSE = {
  user: {
    id: 'e2e-supervisor',
    fullName: 'Directora E2E',
    roleCode: 'DIRECTOR',
    roleName: 'Director',
    onboardingStep: 100,
    onboardingCompleted: true,
    onboardingSeenAt: '2026-07-22T00:00:00.000Z',
    coordinationId: 'coord-general',
    coordinationCode: 'VGO',
  },
}

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
] as const

async function openImpactNetwork(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto('/red-impacto', {
        waitUntil: 'domcontentloaded',
        timeout: 15_000,
      })
      await expect(page).toHaveURL(/\/red-impacto$/)
      await expect(page.locator('.impact-network--v2')).toHaveCount(1, {
        timeout: 10_000,
      })
      break
    } catch (error) {
      if (attempt === 1) throw error
    }
  }
  await expect(page.locator('.organizational-scene')).toBeVisible()
  await expect(
    page.locator('.operational-context-panel[data-level="institutional"]'),
  ).toBeVisible()
}

async function openCoordination(page: Page): Promise<void> {
  await openImpactNetwork(page)
  await page
    .locator(
      '.organizational-scene__island[data-coordination-id="coord-ingenierias"]',
    )
    .click()
  await expect(page.locator('.organizational-scene')).toHaveCount(1)
  await expect(
    page.locator('.operational-context-panel[data-level="coordination"]'),
  ).toBeVisible()
}

async function openSituation(page: Page): Promise<void> {
  await openCoordination(page)
  await page.locator('.operational-context-panel__situation').first().click()
  await expect(
    page.locator(
      '.impact-network__scene-layer--propagation > .propagation-scene',
    ),
  ).toBeVisible()
  await expect(
    page.locator('.operational-context-panel[data-level="situation"]'),
  ).toBeVisible()
  await expect(page.locator('.impact-map-summary')).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ sessionKey, tokenKey, session }) => {
      localStorage.setItem(sessionKey, JSON.stringify(session))
      localStorage.setItem(
        tokenKey,
        'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJlMmUtc3VwZXJ2aXNvciIsImVtYWlsIjoiZTJlQG5vdmV4LnRlc3QiLCJyb2xlSWQiOiJyb2xlLWUyZSIsInJvbGVDb2RlIjoiQU5BTElTVEEiLCJjb29yZGluYXRpb25JZCI6bnVsbCwicGVybWlzc2lvbnMiOlsiQVVUSF9WSUVXX1BST0ZJTEUiLCJDT09SRElOQVRJT05TX1ZJRVciLCJTSVRVQVRJT05TX1ZJRVciLCJTSVRVQVRJT05TX0NSRUFURSIsIlNJVFVBVElPTlNfVVBEQVRFIiwiQUlfQU5BTFlaRSIsIkFJX1ZJRVdfUkVQT1JUUyIsIlJFUE9SVFNfVklFVyJdLCJzdGF0dXMiOiJBQ1RJVkUifQ.e2e',
      )
    },
    {
      sessionKey: AUTH_SESSION_KEY,
      tokenKey: AUTH_TOKEN_KEY,
      session: SUPERVISOR_SESSION,
    },
  )

  await page.route('**/api/v1/**', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'E2E fallback' }),
    })
  })
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(AUTH_ME_RESPONSE),
    })
  })
  await installImpactNetworkApiMocks(page)
})

test('inicia en la vista institucional sin mostrar situaciones', async ({
  page,
}) => {
  await openImpactNetwork(page)

  await expect(
    page.locator('.organizational-scene__direction-hub'),
  ).toBeVisible()
  await expect(page.locator('.organizational-scene__island')).toHaveCount(11)
  await expect(
    page.locator(
      '.organizational-scene__island[data-coordination-id="coord-general"]',
    ),
  ).toHaveCount(0)
  await expect(page.locator('.organizational-scene__connection')).toHaveCount(
    11,
  )
  await expect(
    page.locator('.operational-context-panel__situation'),
  ).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'Coordinaciones activas' }),
  ).toBeVisible()
  await expect(
    page.locator('.operational-context-panel__hero strong'),
  ).toHaveText('11')
})

test('expone breadcrumb, guía y controles de zoom en el mapa organizacional', async ({
  page,
}) => {
  await openImpactNetwork(page)

  await expect(
    page.getByRole('navigation', { name: 'Ruta operacional' }),
  ).toContainText('Dirección Operaciones')
  await expect(
    page.getByRole('heading', { name: 'Estructura institucional' }),
  ).toBeVisible()
  const zoomControls = page.getByLabel('Controles de zoom del mapa')
  await expect(zoomControls).toBeVisible()
  await expect(
    zoomControls.getByRole('button', { name: 'Acercar mapa' }),
  ).toBeEnabled()
  await expect(
    zoomControls.getByRole('button', { name: 'Alejar mapa' }),
  ).toBeEnabled()
})

test('seleccionar isla abre sus situaciones sin conexiones de impacto', async ({
  page,
}) => {
  await openCoordination(page)

  await expect(
    page.getByRole('navigation', { name: 'Ruta operacional' }),
  ).toContainText('Ingenierías')
  await expect(page.locator('.impact-network__scene-stack')).toHaveAttribute(
    'data-active-scene',
    'organization',
  )
  await expect(
    page.locator('.operational-context-panel[data-level="coordination"]'),
  ).toBeVisible()
  await expect(
    page.locator('.operational-context-panel[data-level="situation"]'),
  ).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'Seleccione una situación' }),
  ).toBeVisible()
  await expect(
    page.locator('.operational-context-panel__situation'),
  ).not.toHaveCount(0)
  await expect(page.locator('.propagation-edge')).toHaveCount(0)
  await expect(
    page.locator('.organizational-scene__structural-network'),
  ).toHaveCSS('opacity', '0')
  await expect(page.locator('.impact-map-selection')).toHaveCount(0)
  await expect(page.locator('.impact-map-summary')).toHaveCount(0)
  await expect(
    page.locator(
      '.organizational-scene__island:not(.organizational-scene__island--unrelated)',
    ),
  ).toHaveCount(1)
  await expect(page.locator('.organizational-scene__island')).toHaveCount(1)
  await expect(
    page.locator('.organizational-scene__direction-hub'),
  ).toHaveCount(0)

  const readPanelRatio = () =>
    page.evaluate(() => {
      const workspace = document
        .querySelector('.impact-network__workspace')!
        .getBoundingClientRect()
      const panel = document
        .querySelector('.operational-context-panel')!
        .getBoundingClientRect()
      return panel.width / workspace.width
    })
  await expect
    .poll(async () => {
      const ratio = await readPanelRatio()
      return ratio > 0.18 && ratio < 0.32
    })
    .toBe(true)
})

test('la transición al mapa de conexiones anima las islas de forma escalonada', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await openSituation(page)

  const motion = await page.evaluate(() => {
    const layer = document.querySelector(
      '.impact-network__scene-layer--propagation',
    )!
    const islands = [
      ...document.querySelectorAll<HTMLElement>(
        '.impact-network__scene-layer--propagation .propagation-scene__island',
      ),
    ]
    const edgeLayer = document.querySelector(
      '.impact-network__scene-layer--propagation .propagation-scene__edges',
    )!

    return {
      layerDuration: getComputedStyle(layer).transitionDuration,
      islandAnimations: islands.map((island) => {
        const style = getComputedStyle(island)
        return {
          name: style.animationName,
          duration: style.animationDuration,
          delay: style.animationDelay,
          transition: style.transitionDuration,
        }
      }),
      edgeAnimation: getComputedStyle(edgeLayer).animationName,
    }
  })

  expect(motion.layerDuration).toBe('0s')
  expect(motion.islandAnimations.length).toBeGreaterThan(1)
  expect(
    motion.islandAnimations.every(({ transition }) =>
      transition.includes('0.68s'),
    ),
  ).toBe(true)
  expect(motion.edgeAnimation).toContain('impact-connections-enter')
})

test('seleccionar situación conserva el escenario y muestra la lectura de red', async ({
  page,
}) => {
  await openSituation(page)

  await expect(page).toHaveURL(
    /\/red-impacto\?coordination=coord-ingenierias&situation=6ce4e56e-5555-4555-8555-555555555555$/,
  )
  await expect(page.locator('.impact-network__scene-stack')).toHaveAttribute(
    'data-active-scene',
    'propagation',
  )
  const propagationLayer = page.locator(
    '.impact-network__scene-layer--propagation',
  )
  await expect(
    propagationLayer.locator('.propagation-island--origin'),
  ).toHaveCount(1)
  await expect
    .poll(() => propagationLayer.locator('.propagation-island').count())
    .toBeGreaterThan(1)
  await expect(propagationLayer.locator('.impact-map-selection')).toBeVisible()
  await expect(propagationLayer.locator('.impact-map-summary')).toBeVisible()
  const visibleIslandCount = await propagationLayer
    .locator(
      '.organizational-scene__island:not(.organizational-scene__island--unrelated)',
    )
    .count()
  const relatedEdgeCount = await propagationLayer
    .locator('.propagation-edge')
    .count()
  expect(visibleIslandCount).toBe(relatedEdgeCount + 1)
  await expect(
    propagationLayer
      .locator('.organizational-scene__island--unrelated')
      .first(),
  ).toHaveCSS('visibility', 'hidden')
  await expect(
    page.getByRole('heading', { name: 'Propagación de la situación' }),
  ).toBeVisible()
  await expect(page.locator('.island-focus-panel--origin')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: /descargar pdf/i }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: /ver expediente/i })).toHaveCount(
    0,
  )
})

test('el segundo clic abre el dossier terminal sin encadenar nuevas islas', async ({
  page,
}) => {
  await openSituation(page)

  const breadcrumbBefore = await page
    .getByRole('navigation', { name: 'Ruta operacional' })
    .innerText()
  const canvasWidthBefore = await page
    .locator('.impact-network__canvas')
    .evaluate((element) => element.getBoundingClientRect().width)
  const focusedIsland = page.locator('.organizational-scene__island--selected')
  const focusedIslandImage = focusedIsland.locator('.propagation-island__image')
  await page.mouse.move(1, 1)
  await page.waitForTimeout(750)
  const visualStateBeforeHover = await focusedIslandImage.evaluate(
    (element) => {
      const styles = getComputedStyle(element)
      return {
        filter: styles.filter,
        transform: styles.transform,
      }
    },
  )
  await focusedIsland.hover()
  await page.waitForTimeout(300)
  const visualStateAfterHover = await focusedIslandImage.evaluate((element) => {
    const styles = getComputedStyle(element)
    return {
      filter: styles.filter,
      transform: styles.transform,
    }
  })
  expect(visualStateAfterHover.filter).toBe(visualStateBeforeHover.filter)
  await focusedIsland.click()

  const network = page.locator('.impact-network--v2')
  await expect(network).toHaveClass(/impact-network--island-focus/)
  const dossier = page.locator('.island-focus-dossier')
  await expect(dossier).toBeVisible({ timeout: 4_000 })
  await expect(dossier).toHaveAttribute('role', 'dialog')
  await expect(page.locator('.operational-context-panel')).toHaveCSS(
    'visibility',
    'hidden',
  )
  await expect(
    page.locator('.propagation-scene__island--focus-active'),
  ).toHaveCount(1)
  await expect(page.locator('.organizational-scene__connections')).toHaveCSS(
    'visibility',
    'hidden',
  )
  await expect(page.locator('.impact-map-selection')).toHaveCSS(
    'visibility',
    'hidden',
  )
  await expect(
    page.locator('.organizational-scene__island[aria-disabled="true"]'),
  ).not.toHaveCount(0)

  const geometry = await page.evaluate(() => {
    const workspace = document
      .querySelector('.impact-network__workspace')!
      .getBoundingClientRect()
    const scene = document
      .querySelector('.organizational-scene')!
      .getBoundingClientRect()
    const island = document
      .querySelector('.propagation-scene__island--focus-active')!
      .getBoundingClientRect()
    const panel = document
      .querySelector('.island-focus-dossier__panel')!
      .getBoundingClientRect()
    return {
      islandCenterX: island.left + island.width / 2,
      leftLimit: scene.left + scene.width * 0.4,
      panelLeft: panel.left,
      panelLimit: scene.left + scene.width * 0.38,
      canvasWidth: scene.width,
      workspaceRightGap: workspace.right - panel.right,
      focusedIslandWidth: island.width,
    }
  })
  expect(geometry.islandCenterX).toBeLessThan(geometry.leftLimit)
  expect(geometry.panelLeft).toBeGreaterThanOrEqual(geometry.panelLimit)
  expect(
    Math.abs(geometry.canvasWidth - canvasWidthBefore),
  ).toBeLessThanOrEqual(1)
  expect(Math.abs(geometry.workspaceRightGap)).toBeLessThanOrEqual(24)
  expect(geometry.focusedIslandWidth).toBeGreaterThanOrEqual(150)
  expect(geometry.focusedIslandWidth).toBeLessThanOrEqual(260)

  const focusedCoordinationId = await page
    .locator('.propagation-scene__island--focus-active')
    .getAttribute('data-coordination-id')
  const anotherRelatedIsland = page
    .locator(
      '.organizational-scene__island:not(.organizational-scene__island--unrelated):not(.propagation-scene__island--focus-active)',
    )
    .first()
  if ((await anotherRelatedIsland.count()) > 0) {
    await anotherRelatedIsland.dispatchEvent('click')
  }
  await expect(
    page.locator('.propagation-scene__island--focus-active'),
  ).toHaveAttribute('data-coordination-id', focusedCoordinationId ?? '')
  await expect(dossier).toHaveCount(1)

  const breadcrumbAfter = await page
    .getByRole('navigation', { name: 'Ruta operacional' })
    .innerText()
  expect(breadcrumbAfter.replace(/\s/g, '')).toBe(
    breadcrumbBefore.replace(/\s/g, ''),
  )

  await dossier.locator('.island-focus-dossier__close').click()
  await expect(dossier).toHaveCount(0, { timeout: 4_000 })
  await expect(network).not.toHaveClass(/impact-network--island-focus/)
  await expect(
    page.locator('.propagation-scene__island--focus-active'),
  ).toHaveCount(0)
  await expect(
    page.locator('.organizational-scene__island--selected'),
  ).toHaveCount(1)
  await expect(page.locator('.organizational-scene__connections')).toHaveCSS(
    'visibility',
    'visible',
  )
  await expect(page.locator('.operational-context-panel')).toHaveCSS(
    'visibility',
    'visible',
  )
})

test('centra el origen y evita solapes entre imágenes focalizadas', async ({
  page,
}) => {
  await openSituation(page)
  await page.waitForTimeout(1_200)

  const geometry = await page.evaluate(() => {
    const scene = document
      .querySelector(
        '.impact-network__scene-layer--propagation > .propagation-scene',
      )!
      .getBoundingClientRect()
    const nodes = [
      ...document.querySelectorAll<HTMLElement>(
        '.impact-network__scene-layer--propagation .propagation-island',
      ),
    ].map((element) => {
      const rect = element.getBoundingClientRect()
      return {
        role: element.dataset.role,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
      }
    })
    const origin = nodes.find((node) => node.role === 'origin')!
    const overlaps = nodes.some((node, index) =>
      nodes
        .slice(index + 1)
        .some(
          (other) =>
            Math.min(node.right, other.right) >
              Math.max(node.left, other.left) &&
            Math.min(node.bottom, other.bottom) > Math.max(node.top, other.top),
        ),
    )

    return {
      originOffsetX: Math.abs(origin.centerX - (scene.left + scene.width / 2)),
      originOffsetY: Math.abs(origin.centerY - (scene.top + scene.height / 2)),
      overlaps,
      nodeCount: nodes.length,
      edgeCount: document.querySelectorAll(
        '.impact-network__scene-layer--propagation .propagation-edge',
      ).length,
    }
  })

  expect(geometry.originOffsetX).toBeLessThanOrEqual(1)
  expect(geometry.originOffsetY).toBeLessThanOrEqual(1)
  expect(geometry.overlaps).toBe(false)
  expect(geometry.edgeCount).toBeGreaterThan(0)
  expect(geometry.edgeCount).toBeLessThan(geometry.nodeCount)
})

test('no renderiza React Flow', async ({ page }) => {
  await openImpactNetwork(page)
  await expect(page.locator('.react-flow')).toHaveCount(0)
})

test('sin replay enriquecido mantiene la propagación visible', async ({
  page,
}) => {
  await openSituation(page)

  await expect(
    page.getByRole('button', {
      name: /reproducir animación|pausar animación|continuar animación/i,
    }),
  ).toHaveCount(0)

  await expect
    .poll(() =>
      page
        .locator(
          '.impact-network__scene-layer--propagation .propagation-island--illuminated',
        )
        .count(),
    )
    .toBeGreaterThan(0)
})

test('las conexiones de situación son solo estrella origen → afectada', async ({
  page,
}) => {
  await openSituation(page)

  const propagationLayer = page.locator(
    '.impact-network__scene-layer--propagation',
  )
  await expect
    .poll(() => propagationLayer.locator('.propagation-edge').count())
    .toBeGreaterThan(0)
  const edgeCount = await propagationLayer.locator('.propagation-edge').count()
  const islandCount = await propagationLayer
    .locator('.propagation-island')
    .count()
  expect(edgeCount).toBeGreaterThan(0)
  expect(edgeCount).toBeLessThanOrEqual(Math.max(0, islandCount - 1))
})

test('Escape regresa de situación al listado de la coordinación', async ({
  page,
}) => {
  await openSituation(page)

  await page.keyboard.press('Escape')
  await expect(page.locator('.organizational-scene')).toBeVisible()
  await expect(
    page.locator('.operational-context-panel[data-level="coordination"]'),
  ).toBeVisible()
  await expect(page.locator('.propagation-edge')).toHaveCount(0)
  await expect(
    page.locator('.operational-context-panel__situation'),
  ).not.toHaveCount(0)
})

test('la situación y la isla muestran información de distinta profundidad', async ({
  page,
}) => {
  await openSituation(page)

  await expect(page.locator('.impact-map-summary')).toBeVisible()
  await expect(page.locator('.island-focus-panel--origin')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: /descargar pdf/i }),
  ).toBeVisible()
  await expect(page.locator('.island-focus-dossier')).toHaveCount(0)

  await page.locator('.organizational-scene__island--selected').click()

  const dossier = page.locator('.island-focus-dossier')
  await expect(dossier).toBeVisible({ timeout: 4_000 })
  await expect(dossier.locator('.impact-map-summary')).toHaveCount(0)
  await expect(dossier.locator('.island-focus-panel--origin')).toBeVisible()
  await expect(
    dossier.getByRole('button', { name: /descargar pdf/i }),
  ).toBeVisible()
})

test('cerrar expediente regresa al listado de la coordinación', async ({
  page,
}) => {
  await openSituation(page)
  await page.getByRole('button', { name: /Volver a Ingenier/i }).click()

  await expect(
    page.locator('.operational-context-panel[data-level="coordination"]'),
  ).toBeVisible()
  await expect(page.locator('.organizational-scene')).toHaveCount(1)
  await expect(page.locator('.organizational-scene__island')).toHaveCount(1)
  await expect(
    page.locator('.organizational-scene__direction-hub'),
  ).toHaveCount(0)
  await expect(page.locator('.propagation-edge')).toHaveCount(0)
  await expect(
    page.locator('.operational-context-panel__situation'),
  ).not.toHaveCount(0)
  await expect(page).toHaveURL(/\/red-impacto\?coordination=coord-ingenierias$/)
})

test('el lienzo organizacional permanece montado al abrir y cerrar expediente', async ({
  page,
}) => {
  await openImpactNetwork(page)
  const organizationalScene = page.locator('.organizational-scene')
  await expect(organizationalScene).toHaveCount(1)

  await page
    .locator(
      '.organizational-scene__island[data-coordination-id="coord-ingenierias"]',
    )
    .click()
  await expect(organizationalScene).toHaveCount(1)
  await expect(
    page.locator(
      '.impact-network__scene-layer--propagation > .propagation-scene',
    ),
  ).toBeVisible()

  await page.locator('.operational-context-panel__situation').first().click()
  await expect(
    page.getByRole('button', { name: /Volver a Ingenier/i }),
  ).toBeVisible()
  await page.getByRole('button', { name: /Volver a Ingenier/i }).click()
  await expect(organizationalScene).toHaveCount(1)
  await expect(
    page.locator('.operational-context-panel[data-level="coordination"]'),
  ).toBeVisible()
})

test('el coordinador inicia directamente en su coordinación', async ({
  page,
}) => {
  await page.unroute('**/api/v1/auth/me')
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'e2e-coordinator',
          fullName: 'Coordinador E2E',
          roleCode: 'COORDINADOR',
          roleName: 'Coordinador',
          coordinationId: 'coord-ingenierias',
          coordinationCode: 'CFD',
          onboardingStep: 100,
          onboardingCompleted: true,
          onboardingSeenAt: '2026-07-22T00:00:00.000Z',
        },
      }),
    })
  })

  await page.goto('/red-impacto', {
    waitUntil: 'domcontentloaded',
    timeout: 15_000,
  })
  const network = page.locator('.impact-network--v2')
  await expect(network).toHaveAttribute('data-role-view', 'coordinator')
  await expect(
    page.locator('.operational-context-panel[data-level="coordination"]'),
  ).toBeVisible()
  await expect(
    page.locator('.organizational-scene__island--selected'),
  ).toHaveAttribute('data-coordination-id', 'coord-ingenierias')
  await expect(page.locator('.organizational-scene__island')).toHaveCount(1)
  await expect(
    page.locator('.organizational-scene__direction-hub'),
  ).toHaveCount(0)

  await page.getByRole('button', { name: 'Volver a la Dirección' }).click()

  await expect(page.locator('.organizational-scene__island')).toHaveCount(1)
  await expect(
    page.locator('.organizational-scene__direction-hub'),
  ).not.toHaveAttribute('data-context', 'true')
})

test('se adapta a los tres viewports sin desbordamiento horizontal', async ({
  page,
}) => {
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport)
    await openImpactNetwork(page)

    const layout = await page.evaluate(() => {
      const root = document.documentElement
      const network = document.querySelector('.impact-network')
      const rect = network?.getBoundingClientRect()
      return {
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        network: rect
          ? {
              left: rect.left,
              right: rect.right,
              width: rect.width,
              height: rect.height,
            }
          : null,
      }
    })

    expect(layout.network).not.toBeNull()
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1)
    expect(layout.network!.width).toBeGreaterThan(viewport.width * 0.5)
    expect(layout.network!.height).toBeGreaterThan(300)
  }
})

test('coordinación y expediente conservan el flujo en tableta y móvil', async ({
  page,
}) => {
  for (const viewport of VIEWPORTS.slice(1)) {
    await page.setViewportSize(viewport)
    await openSituation(page)

    const layout = await page.evaluate(() => {
      const root = document.documentElement
      const panel = document
        .querySelector('.operational-context-panel')!
        .getBoundingClientRect()
      const canvas = document
        .querySelector('.impact-network__canvas')!
        .getBoundingClientRect()
      return {
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        panelWidth: panel.width,
        canvasWidth: canvas.width,
      }
    })

    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1)
    expect(layout.panelWidth).toBeGreaterThan(250)
    expect(layout.canvasWidth).toBeGreaterThan(250)
    await expect(
      page.getByRole('button', { name: /Volver a Ingenier/i }),
    ).toBeVisible()
  }
})
