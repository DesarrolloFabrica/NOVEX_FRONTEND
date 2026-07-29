import { expect, test, type Page } from 'playwright/test'

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
    roleCode: 'DIRECTOR_OPERACIONES',
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
      document.querySelectorAll<HTMLElement>('.organizational-scene__island'),
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
      label: read(
        island.querySelector('.propagation-island__label') as Element,
      ),
      body: read(
        island.querySelector('.propagation-island__image') as Element,
      ),
    }))
  })
}

function intersects(a: LabelRect | Omit<LabelRect, 'id'>, b: LabelRect | Omit<LabelRect, 'id'>) {
  const x = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  return x > 1 && y > 1
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ sessionKey, tokenKey, session }) => {
      localStorage.setItem(sessionKey, JSON.stringify(session))
      localStorage.setItem(tokenKey, 'e2e-access-token')
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
})

for (const viewport of VIEWPORTS) {
  test(`las etiquetas del mapa institucional no se tapan en ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.goto('/red-impacto', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.organizational-scene')).toBeVisible()
    await expect(page.locator('.organizational-scene__island')).toHaveCount(12)
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

    const hubLabel = await page
      .locator('.organizational-scene__direction-label')
      .boundingBox()
    expect(hubLabel).not.toBeNull()
    for (const island of islands) {
      expect(
        intersects(island.label, {
          left: hubLabel!.x,
          right: hubLabel!.x + hubLabel!.width,
          top: hubLabel!.y,
          bottom: hubLabel!.y + hubLabel!.height,
        }),
        `etiqueta ${island.id} choca con la etiqueta del nodo institucional`,
      ).toBe(false)
    }
  })
}

test('la etiqueta de la isla focalizada no queda detrás de sus situaciones', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/red-impacto', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.organizational-scene')).toBeVisible()

  const selectedIsland = page.locator(
    '.organizational-scene__island[data-coordination-id="coord-ingenierias"]',
  )
  await selectedIsland.click()
  await expect(
    page.locator('.operational-context-panel[data-level="coordination"]'),
  ).toBeVisible()

  const situationNodes = page.locator('.coordination-situation-node')
  await expect(situationNodes.first()).toBeVisible()

  const labelBox = await selectedIsland
    .locator('.propagation-island__label')
    .boundingBox()
  expect(labelBox).not.toBeNull()

  for (let index = 0; index < (await situationNodes.count()); index += 1) {
    const situationBox = await situationNodes.nth(index).boundingBox()
    expect(situationBox).not.toBeNull()
    expect(
      intersects(
        {
          left: labelBox!.x,
          right: labelBox!.x + labelBox!.width,
          top: labelBox!.y,
          bottom: labelBox!.y + labelBox!.height,
        },
        {
          left: situationBox!.x,
          right: situationBox!.x + situationBox!.width,
          top: situationBox!.y,
          bottom: situationBox!.y + situationBox!.height,
        },
      ),
      `la etiqueta seleccionada se solapa con la situación ${index + 1}`,
    ).toBe(false)
  }
})
