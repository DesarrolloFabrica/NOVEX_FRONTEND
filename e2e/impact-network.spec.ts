import { expect, test, type Page } from 'playwright/test'

const AUTH_SESSION_KEY = 'cunmark.auth.session.v1'
const SUPERVISOR_SESSION = {
  id: 'e2e-supervisor',
  name: 'Supervisora E2E',
  role: 'supervisor',
  onboardingCompleted: true,
  onboardingSeenAt: '2026-07-22T00:00:00.000Z',
}

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
] as const

async function openImpactNetwork(page: Page): Promise<void> {
  await page.goto('/red-impacto')
  await expect(page).toHaveURL(/\/red-impacto$/)
  await expect(page.locator('.impact-network')).toHaveCount(1)
  await expect(page.locator('.impact-network__canvas')).toHaveCount(1)
  await expect(page.locator('.propagation-scene--empty')).toHaveCount(1)
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session))
    },
    { key: AUTH_SESSION_KEY, session: SUPERVISOR_SESSION },
  )

  await page.route('**/api/v1/**', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'E2E fallback' }),
    })
  })
})

test('muestra escena vacía y panel de situaciones activas', async ({ page }) => {
  const startedAt = Date.now()
  await openImpactNetwork(page)

  await expect
    .poll(() => page.locator('.situation-command-panel__item').count())
    .toBeGreaterThan(0)
  await expect(page.locator('.impact-toolbar')).toBeAttached()
  expect(Date.now() - startedAt).toBeLessThan(2_000)
})

test('al seleccionar una situación solo aparecen islas focalizadas', async ({
  page,
}) => {
  await openImpactNetwork(page)

  const firstSituation = page.locator('.situation-command-panel__item').first()
  await expect(firstSituation).toBeVisible()
  await firstSituation.click()

  await expect(page.locator('.propagation-scene--empty')).toHaveCount(0)
  await expect
    .poll(() => page.locator('.propagation-island').count())
    .toBeGreaterThan(1)
  await expect(page.locator('.propagation-island--origin')).toHaveCount(1)
  await expect(page.locator('.propagation-island--ambient')).toHaveCount(0)
  const affectedCount = await page
    .locator('.situation-command-panel__affected li')
    .count()
  await expect(page.locator('.propagation-island')).toHaveCount(
    affectedCount + 1,
  )
  await expect(page.locator('.situation-command-panel__detail')).toBeVisible()
})

test('centra el origen y evita solapes entre imágenes focalizadas', async ({
  page,
}) => {
  await openImpactNetwork(page)
  await page.locator('.situation-command-panel__item').nth(2).click()
  await expect(page.locator('.propagation-island--origin')).toHaveCount(1)

  const geometry = await page.evaluate(() => {
    const scene = document
      .querySelector('.propagation-scene')!
      .getBoundingClientRect()
    const nodes = [
      ...document.querySelectorAll<HTMLElement>('.propagation-island'),
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
      nodes.slice(index + 1).some(
        (other) =>
          Math.min(node.right, other.right) > Math.max(node.left, other.left) &&
          Math.min(node.bottom, other.bottom) > Math.max(node.top, other.top),
      ),
    )

    return {
      originOffsetX: Math.abs(
        origin.centerX - (scene.left + scene.width / 2),
      ),
      originOffsetY: Math.abs(
        origin.centerY - (scene.top + scene.height / 2),
      ),
      overlaps,
      nodeCount: nodes.length,
      edgeCount: document.querySelectorAll('.propagation-edge').length,
    }
  })

  expect(geometry.originOffsetX).toBeLessThanOrEqual(1)
  expect(geometry.originOffsetY).toBeLessThanOrEqual(1)
  expect(geometry.overlaps).toBe(false)
  expect(geometry.edgeCount).toBe(geometry.nodeCount - 1)
})

test('no renderiza React Flow ni malla organizacional completa', async ({
  page,
}) => {
  await openImpactNetwork(page)

  await expect(page.locator('.react-flow')).toHaveCount(0)
  await expect(page.locator('.impact-area-node')).toHaveCount(0)
  await expect(page.locator('.impact-incident-node')).toHaveCount(0)
})

test('reproducir propagación ilumina islas desde el panel', async ({
  page,
}) => {
  await openImpactNetwork(page)

  await page.locator('.situation-command-panel__item').first().click()
  const replayButton = page
    .locator('.situation-command-panel__actions')
    .getByRole('button', {
      name: /reproducir propagación|pausar|continuar|repetir/i,
    })
  await expect(replayButton).toBeVisible()
  await replayButton.click()

  await expect
    .poll(() => page.locator('.propagation-island--illuminated').count())
    .toBeGreaterThan(0)
})

test('las conexiones son solo estrella origen → afectada', async ({ page }) => {
  await openImpactNetwork(page)
  await page.locator('.situation-command-panel__item').first().click()

  const edgeCount = await page.locator('.propagation-edge').count()
  const islandCount = await page.locator('.propagation-island').count()
  expect(edgeCount).toBeGreaterThan(0)
  expect(edgeCount).toBeLessThanOrEqual(Math.max(0, islandCount - 1))
})

test('Escape limpia la selección focalizada', async ({ page }) => {
  await openImpactNetwork(page)

  await page.locator('.situation-command-panel__item').first().click()
  await expect(page.locator('.propagation-island')).toHaveCount(
    await page.locator('.propagation-island').count(),
  )

  await page.keyboard.press('Escape')
  await expect(page.locator('.propagation-scene--empty')).toHaveCount(1)
})

test('al hacer clic en isla origen abre el dossier con reporte ejecutivo', async ({
  page,
}) => {
  await openImpactNetwork(page)
  await page.locator('.situation-command-panel__item').first().click()
  await expect(page.locator('.propagation-island--origin')).toHaveCount(1)

  await page.locator('.propagation-island--origin').click()

  await expect(page.locator('.island-focus-dossier')).toBeVisible()
  await expect(page.locator('.island-focus-panel--origin')).toBeVisible()
  await expect(page.locator('.propagation-scene--island-focus')).toHaveCount(1)
  await expect(
    page.getByRole('button', { name: /descargar reporte pdf/i }),
  ).toBeVisible()
})

test('al hacer clic en isla afectada muestra briefing de afectación', async ({
  page,
}) => {
  await openImpactNetwork(page)
  await page.locator('.situation-command-panel__item').first().click()
  await expect(page.locator('.propagation-island--affected').first()).toBeVisible()

  await page.locator('.propagation-island--affected').first().click()

  await expect(page.locator('.island-focus-dossier')).toBeVisible()
  await expect(page.locator('.island-focus-panel--affected')).toBeVisible()
  await expect(page.getByText('Por qué está afectada')).toBeVisible()
  await expect(page.getByText('Cadena de propagación')).toBeVisible()
})

test('Escape cierra el dossier de isla antes de limpiar la situación', async ({
  page,
}) => {
  await openImpactNetwork(page)
  await page.locator('.situation-command-panel__item').first().click()
  await page.locator('.propagation-island--origin').click()
  await expect(page.locator('.island-focus-dossier')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.locator('.island-focus-dossier')).toHaveCount(0)
  await expect(page.locator('.propagation-scene--empty')).toHaveCount(0)
  await expect(page.locator('.propagation-island')).toHaveCount(
    await page.locator('.propagation-island').count(),
  )

  await page.keyboard.press('Escape')
  await expect(page.locator('.propagation-scene--empty')).toHaveCount(1)
})

test('se adapta a los tres viewports', async ({ page }) => {
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
    expect(layout.network!.height).toBeGreaterThan(240)
  }
})
