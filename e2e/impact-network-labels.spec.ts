import { expect, test, type Page } from 'playwright/test'
import {
  buildImpactE2ESituations,
  installImpactNetworkApiMocks,
} from './impact-network.fixtures'

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
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
] as const

interface LabelRect {
  id: string
  left: number
  right: number
  top: number
  bottom: number
}

async function readIslandBoxes(page: Page) {
  return page.evaluate(() => {
    const islands = Array.from(
      document.querySelectorAll<HTMLElement>('.impact-status-island'),
    )
    const read = (element: Element) => {
      const rect = element.getBoundingClientRect()
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      }
    }
    return islands.map((island) => ({
      id: island.dataset.coordinationId ?? '',
      label: read(island.querySelector('.impact-status-island__copy') as Element),
      body: read(island.querySelector('.impact-status-island__image') as Element),
    }))
  })
}

function intersects(
  a: LabelRect | Omit<LabelRect, 'id'>,
  b: LabelRect | Omit<LabelRect, 'id'>,
) {
  const x = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  return x > 1 && y > 1
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ sessionKey, tokenKey, session }) => {
      localStorage.setItem(sessionKey, JSON.stringify(session))
      localStorage.setItem(
        `novex.impact-network.tour.v1.${encodeURIComponent(session.id)}`,
        JSON.stringify({
          version: 1,
          outcome: 'completed',
          seenAt: '2026-07-22T00:00:00.000Z',
        }),
      )
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

for (const viewport of VIEWPORTS) {
  test(`las etiquetas del tablero institucional no se tapan en ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.goto('/red-impacto', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.impact-executive__status-board')).toBeVisible()
    await expect(page.locator('.impact-status-island')).toHaveCount(11)
    await page.waitForTimeout(1200)

    const islands = await readIslandBoxes(page)

    for (let i = 0; i < islands.length; i += 1) {
      for (let j = i + 1; j < islands.length; j += 1) {
        expect(
          intersects(islands[i].label, islands[j].label),
          `etiqueta ${islands[i].id} se solapa con etiqueta ${islands[j].id}`,
        ).toBe(false)
        expect(
          intersects(islands[i].label, islands[j].body),
          `etiqueta ${islands[i].id} queda sobre la isla ${islands[j].id}`,
        ).toBe(false)
      }
    }

  })
}

test('la isla focalizada distribuye muchas situaciones sin superposiciones', async ({
  page,
}) => {
  const situations = buildImpactE2ESituations(8)
  await page.route('**/api/v1/situations**', async (route) => {
    const url = new URL(route.request().url())
    if (
      url.pathname.endsWith('/situations') &&
      route.request().method() === 'GET'
    ) {
      await route.fulfill({
        json: {
          items: situations,
          total: situations.length,
          page: 1,
          limit: 100,
        },
      })
      return
    }
    await route.fallback()
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/red-impacto', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.impact-executive__status-board')).toBeVisible()

  await page
    .locator(
      '.impact-status-island[data-coordination-id="coord-ingenierias"]',
    )
    .click()
  await page.locator('.impact-executive-context__cta--map').click()
  await expect(page.locator('.organizational-scene')).toBeVisible()

  const selectedIsland = page.locator(
    '.organizational-scene__island--selected[data-coordination-id="coord-ingenierias"]',
  )
  await expect(
    page.locator('.operational-context-panel[data-level="coordination"]'),
  ).toBeVisible()

  const situationLayer = page.locator('.coordination-situation-nodes')
  const situationNodes = page.locator('.coordination-situation-node')
  await expect(situationLayer).toHaveAttribute('data-visible-count', '8')
  await expect(situationLayer).toHaveAttribute('data-hidden-count', '0')
  await expect(situationNodes).toHaveCount(8)
  await expect(
    page.locator('.operational-context-panel__situation'),
  ).toHaveCount(4)
  await expect(page.locator('.coordination-situation-nodes__hint')).toBeVisible()
  await page.waitForTimeout(900)

  const labelBox = await selectedIsland
    .locator('.propagation-island__label')
    .boundingBox()
  expect(labelBox).not.toBeNull()

  const situationBoxes = await situationNodes.evaluateAll((nodes) =>
    nodes.map((node, index) => {
      const rect = node.getBoundingClientRect()
      return {
        id: String(index + 1),
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      }
    }),
  )

  for (let index = 0; index < situationBoxes.length; index += 1) {
    const situationBox = situationBoxes[index]
    expect(
      intersects(
        {
          left: labelBox!.x,
          right: labelBox!.x + labelBox!.width,
          top: labelBox!.y,
          bottom: labelBox!.y + labelBox!.height,
        },
        {
          left: situationBox.left,
          right: situationBox.right,
          top: situationBox.top,
          bottom: situationBox.bottom,
        },
      ),
      `la etiqueta seleccionada se solapa con la situación ${index + 1}`,
    ).toBe(false)

    for (
      let siblingIndex = index + 1;
      siblingIndex < situationBoxes.length;
      siblingIndex += 1
    ) {
      expect(
        intersects(situationBox, situationBoxes[siblingIndex]),
        `la situación ${index + 1} se solapa con la situación ${siblingIndex + 1}`,
      ).toBe(false)
    }
  }
})
