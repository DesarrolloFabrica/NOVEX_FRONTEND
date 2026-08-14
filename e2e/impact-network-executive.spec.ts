import { expect, test, type Page } from 'playwright/test'

const AUTH_SESSION_KEY = 'novex.auth.session.v1'
const AUTH_TOKEN_KEY = 'novex.auth.accessToken.v1'

type RoleCode = 'COORDINADOR' | 'ANALISTA' | 'DIRECTOR' | 'ADMIN'

const COORDINATIONS = [
  ['coord-general', 'Coordinación General', 'CoordGeneral'],
  ['coord-b2b', 'B2B', 'CoordB2B'],
  ['coord-bellas-artes', 'Bellas Artes', 'CoordBellasArtes'],
  [
    'coord-desarrollo-profesional',
    'Desarrollo Profesional',
    'CoordDesarrolloprof',
  ],
  ['coord-empresarial', 'Empresarial', 'CoordTransformacionEmpresarial'],
  ['coord-especializaciones', 'Especializaciones', 'CoordEspecializaciones'],
  ['coord-ingenierias', 'Ingenierías', 'CoordIngenierias'],
  [
    'coord-operaciones-academicas',
    'Operaciones Académicas',
    'CoordOperacionesAcademicas',
  ],
  ['coord-proyeccion-social', 'Proyección Social', 'CoordProyeccionAcademica'],
  ['coord-saber-pro', 'Saber Pro', 'CoordSaberPro'],
  ['coord-transversales', 'Transversales', 'CoordTransversales'],
  ['coord-homologaciones', 'Homologaciones', 'CoordHomologaciones'],
  ['coord-negocios', 'Negocios', 'CoordNegocios'],
  [
    'coord-fabrica-contenidos',
    'Fábrica de contenidos',
    'CoordFabricaDeContenido',
  ],
  ['coord-servicios', 'Servicios', 'CoordServicios'],
] as const

const COORDINATION_RESPONSE = COORDINATIONS.map(
  ([code, name, imageAsset], index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    code,
    name,
    shortName: name,
    description: null,
    color: '#45cdd7',
    icon: 'network',
    imageAsset: `${imageAsset}.png`,
    displayOrder: index + 1,
    isActive: true,
    createdAt: '2026-08-14T00:00:00.000Z',
    updatedAt: '2026-08-14T00:00:00.000Z',
  }),
)

const PERMISSIONS = [
  'AUTH_VIEW_PROFILE',
  'COORDINATIONS_VIEW',
  'SITUATIONS_VIEW',
  'AI_VIEW_REPORTS',
  'REPORTS_VIEW',
]

function accessToken(roleCode: RoleCode): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    sub: `e2e-${roleCode.toLowerCase()}`,
    email: `${roleCode.toLowerCase()}@novex.test`,
    roleId: `role-${roleCode.toLowerCase()}`,
    roleCode,
    coordinationId:
      roleCode === 'COORDINADOR'
        ? COORDINATION_RESPONSE.find(
            (item) => item.code === 'coord-ingenierias',
          )?.id
        : null,
    permissions: PERMISSIONS,
    status: 'ACTIVE',
  })}.e2e`
}

async function installRole(page: Page, roleCode: RoleCode) {
  const coordinator = roleCode === 'COORDINADOR'
  const coordination = COORDINATION_RESPONSE.find(
    (item) => item.code === 'coord-ingenierias',
  )
  const session = {
    id: `e2e-${roleCode.toLowerCase()}`,
    name: `${roleCode} E2E`,
    role: coordinator ? 'ejecutor' : 'supervisor',
    roleCode,
    roleName: roleCode,
    permissions: PERMISSIONS,
    selectedAreaId: coordinator ? 'coord-ingenierias' : undefined,
    coordinationId: coordinator ? coordination?.id : undefined,
    onboardingStep: 100,
    onboardingCompleted: true,
    onboardingSeenAt: '2026-08-14T00:00:00.000Z',
  }

  await page.addInitScript(
    ({ sessionKey, tokenKey, currentSession, token }) => {
      localStorage.setItem(sessionKey, JSON.stringify(currentSession))
      localStorage.setItem(tokenKey, token)
    },
    {
      sessionKey: AUTH_SESSION_KEY,
      tokenKey: AUTH_TOKEN_KEY,
      currentSession: session,
      token: accessToken(roleCode),
    },
  )

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname

    if (path.endsWith('/auth/me')) {
      await route.fulfill({
        json: {
          user: {
            id: session.id,
            fullName: session.name,
            roleCode,
            roleName: roleCode,
            coordinationId: coordinator ? coordination?.id : null,
            coordinationCode: coordinator ? coordination?.code : null,
            onboardingStep: 100,
            onboardingCompleted: true,
            onboardingSeenAt: session.onboardingSeenAt,
          },
        },
      })
      return
    }

    if (path.endsWith('/coordinations/graph')) {
      await route.fulfill({
        json: { coordinations: COORDINATION_RESPONSE, dependencies: [] },
      })
      return
    }

    if (path.endsWith('/coordinations/network-status')) {
      await route.fulfill({
        json: {
          networkStatus: 'attention',
          globalRiskScore: 68,
          activeIncidentsCount: 12,
          coordinationsCount: 14,
          synchronizedCoordinationsCount: 14,
          lastSynchronizedAt: '2026-08-14T14:42:00.000Z',
        },
      })
      return
    }

    if (
      path.endsWith('/coordinations') &&
      request.method() === 'GET'
    ) {
      await route.fulfill({ json: COORDINATION_RESPONSE })
      return
    }

    if (path.endsWith('/situations') && request.method() === 'GET') {
      await route.fulfill({
        json: { items: [], total: 0, page: 1, limit: 100 },
      })
      return
    }

    await route.fulfill({ status: 404, json: { message: 'E2E mock' } })
  })
}

for (const roleCode of ['DIRECTOR', 'ADMIN', 'ANALISTA'] as const) {
  test(`${roleCode} abre y cierra el contexto desde mapa y rail`, async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    await installRole(page, roleCode)
    await page.goto('/red-impacto', { waitUntil: 'domcontentloaded' })

    const overview = page.locator('.impact-executive')
    await expect(overview).toBeVisible()
    await expect(
      page.locator('.impact-network[data-role-view="director"]'),
    ).toBeVisible()
    await expect(
      page.locator('.impact-executive__rail-general > section').first(),
    ).toHaveAttribute('aria-label', 'Requiere atención')
    await expect(
      page.locator('.impact-executive__cartography .propagation-scene__atlas'),
    ).toBeVisible()
    await expect(page.locator('.impact-executive__territory')).toBeVisible()
    await expect(
      page.locator('.impact-executive__territory-land'),
    ).toHaveCount(1)
    await expect(
      page.locator('.impact-executive__territory-border'),
    ).toHaveCount(2)
    await expect(
      page.locator('.impact-executive__territory-labels span'),
    ).toHaveCount(4)
    // El lenguaje de líneas queda reservado al impacto real entre coordinaciones.
    await expect(
      page.locator('.impact-executive__territory-routes'),
    ).toHaveCount(0)
    await expect(page.locator('.impact-executive__map')).toHaveAttribute(
      'data-status-scenario',
      'mixed',
    )
    await expect(
      page.locator('.impact-executive-island[data-focal="true"]'),
    ).toHaveCount(1)
    await expect(
      page.locator(
        '.impact-executive-island[data-focal="true"] .impact-executive-island__focus',
      ),
    ).toHaveText('Foco operacional')
    await expect(
      page.locator(
        '.impact-executive-island[data-coordination-id="coord-homologaciones"] .impact-executive-island__badge',
      ),
    ).toHaveText('Alta')
    await expect(
      page.locator(
        '.impact-executive-island[data-coordination-id="coord-servicios"] .impact-executive-island__badge',
      ),
    ).toHaveText('Atención')
    await expect(
      page.locator('.impact-executive__metric[data-metric="attention"]'),
    ).toContainText('Coordinaciones afectadas')

    const fabrica = page.locator(
      '.impact-executive-island[data-coordination-id="coord-fabrica-contenidos"]',
    )
    await expect(fabrica).toBeVisible()
    await expect(page.locator('.impact-executive__patterns')).toBeInViewport()
    if (roleCode === 'DIRECTOR') {
      await expect
        .poll(() =>
          page
            .locator('.impact-executive-island__image')
            .evaluateAll((images: HTMLImageElement[]) =>
              images.every(
                (image) =>
                  image.complete &&
                  image.naturalWidth > 0 &&
                  !image.currentSrc.includes('.preview.'),
              ),
            ),
        )
        .toBe(true)
      if (process.env.NOVEX_CAPTURE === '1') {
        await page.waitForTimeout(2_500)
        await page.screenshot({
          path: 'test-results/director-operational-map.png',
          fullPage: true,
        })
      }
    }
    await fabrica.click()
    await expect(
      page.locator(
        '.impact-executive-context[data-coordination-id="coord-fabrica-contenidos"]',
      ),
    ).toBeVisible()
    await expect(fabrica).toHaveClass(/impact-executive-island--selected/)
    await expect(
      page.locator('.impact-executive-island--dimmed').first(),
    ).toBeVisible()

    if (roleCode === 'DIRECTOR') {
      if (process.env.NOVEX_CAPTURE === '1') {
        await page.screenshot({
          path: 'test-results/director-fabrica-contexto.png',
          fullPage: true,
        })
      }
    }

    await page.getByRole('button', { name: 'Cerrar panel' }).click()
    await expect(page.locator('.impact-executive-context')).toHaveCount(0)
    await expect(page.locator('.impact-executive__rail-general')).toBeVisible()

    await page
      .locator(
        '.impact-executive__attention-item[data-coordination-id="coord-homologaciones"]',
      )
      .click()
    await expect(
      page.locator(
        '.impact-executive-context[data-coordination-id="coord-homologaciones"]',
      ),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Cerrar panel' }).click()
    await page
      .locator(
        '.impact-executive__attention-item[data-coordination-id="coord-servicios"]',
      )
      .click()
    await expect(
      page.locator(
        '.impact-executive-context[data-coordination-id="coord-servicios"]',
      ),
    ).toBeVisible()
  })
}

test('COORDINADOR conserva la experiencia anterior', async ({ page }) => {
  test.setTimeout(60_000)
  await installRole(page, 'COORDINADOR')
  await page.goto('/red-impacto?coordination=coord-ingenierias', {
    waitUntil: 'domcontentloaded',
  })

  await expect(page.locator('.impact-executive')).toHaveCount(0)
  await expect(page.locator('.organizational-scene')).toBeVisible()
  await expect(
    page.locator('.operational-context-panel[data-level="coordination"]'),
  ).toBeVisible()
  await expect(
    page.locator('.organizational-scene__island--selected'),
  ).toHaveAttribute('data-coordination-id', 'coord-ingenierias')
})

test('viewport ejecutivo soporta zoom, pan, reset y fullscreen real', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await installRole(page, 'DIRECTOR')
  await page.goto('/red-impacto', { waitUntil: 'domcontentloaded' })

  const map = page.locator('.impact-executive__map')
  const stage = page.locator('.impact-executive__map-stage')
  const viewport = page.locator('.impact-executive__map-viewport')
  await expect(map).toBeVisible()

  // Panorama de entrada al 92%: todas las coordinaciones visibles y legibles.
  await expect(map).toHaveAttribute('data-zoom', '92')

  await page.getByRole('button', { name: 'Acercar mapa' }).click()
  await expect(map).toHaveAttribute('data-zoom', '102')
  await expect(page.locator('.impact-executive__map-zoom')).toHaveText('102%')

  await page.getByRole('button', { name: 'Alejar mapa' }).click()
  await page.getByRole('button', { name: 'Alejar mapa' }).click()
  await page.getByRole('button', { name: 'Alejar mapa' }).click()
  await page.getByRole('button', { name: 'Alejar mapa' }).click()
  await expect(map).toHaveAttribute('data-zoom', '62')
  await expect(page.locator('.impact-executive__map-zoom')).toHaveText('62%')

  const cartography = page.locator('.impact-executive__cartography')
  await expect(viewport.locator('.impact-executive__cartography')).toHaveCount(0)
  await expect(
    cartography.locator('.propagation-scene__atlas'),
  ).toBeVisible()
  await expect(
    cartography.locator('.propagation-scene__atlas-land path'),
  ).toHaveCount(7)
  await expect(
    cartography.locator('.impact-executive__territory-coast'),
  ).toHaveCount(1)
  await expect(
    cartography.locator('.impact-executive__territory-border'),
  ).toHaveCount(2)
  const cartographyBox = await cartography.boundingBox()
  const zoomedOutStageBox = await stage.boundingBox()
  expect(cartographyBox).not.toBeNull()
  expect(zoomedOutStageBox).not.toBeNull()
  if (cartographyBox && zoomedOutStageBox) {
    expect(cartographyBox.width).toBeGreaterThan(zoomedOutStageBox.width * 1.03)
    expect(cartographyBox.height).toBeGreaterThan(zoomedOutStageBox.height * 1.03)
  }

  if (process.env.NOVEX_CAPTURE === '1') {
    await page.waitForTimeout(500)
    await page.screenshot({
      path: 'test-results/director-operational-map-zoomout.png',
      fullPage: true,
    })
  }

  const box = await stage.boundingBox()
  expect(box).not.toBeNull()
  if (!box) return

  await page.mouse.move(box.x + box.width * 0.62, box.y + 42)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.67, box.y + 74, { steps: 6 })
  await page.mouse.up()

  await expect
    .poll(() =>
      viewport.evaluate((element) =>
        element.style.getPropertyValue('--operational-pan-x'),
      ),
    )
    .not.toBe('0px')

  const reset = page.getByRole('button', { name: 'Centrar mapa' })
  await expect(reset).toBeEnabled()
  await reset.click()
  await expect(map).toHaveAttribute('data-zoom', '92')
  await expect(reset).toBeDisabled()

  for (const coordinationId of [
    'coord-fabrica-contenidos',
    'coord-homologaciones',
    'coord-servicios',
  ]) {
    const island = page.locator(
      `.impact-executive-island[data-coordination-id="${coordinationId}"]`,
    )
    const islandBox = await island.boundingBox()
    const metaBox = await island
      .locator('.impact-executive-island__meta')
      .boundingBox()
    expect(islandBox).not.toBeNull()
    expect(metaBox).not.toBeNull()
    if (islandBox && metaBox) {
      expect(metaBox.y + metaBox.height).toBeLessThan(
        islandBox.y + islandBox.height * 0.5,
      )
    }
  }

  await page
    .getByRole('button', { name: 'Ver mapa en pantalla completa' })
    .click()
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.fullscreenElement?.classList.contains('impact-executive__body') ??
        false,
      ),
    )
    .toBe(true)
  await expect(
    page.getByRole('button', { name: 'Salir de pantalla completa' }),
  ).toBeVisible()
  await expect(map).toHaveAttribute('data-density', 'expanded')

  if (process.env.NOVEX_CAPTURE === '1') {
    await page.waitForTimeout(1_200)
    await page.screenshot({
      path: 'test-results/director-operational-map-fullscreen.png',
      fullPage: true,
    })
  }

  await page
    .locator(
      '.impact-executive-island[data-coordination-id="coord-fabrica-contenidos"]',
    )
    .click()
  await expect(
    page.locator(
      '.impact-executive-context[data-coordination-id="coord-fabrica-contenidos"]',
    ),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar panel' }).click()
  await page.getByRole('button', { name: 'Salir de pantalla completa' }).click()
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull()
})

test('hover respira sin mover vecinos y el mapa selecciona cada coordinación', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await installRole(page, 'DIRECTOR')
  await page.goto('/red-impacto', { waitUntil: 'domcontentloaded' })

  const islands = page.locator('.impact-executive-island')
  await expect(islands).toHaveCount(14)
  const positions = () =>
    islands.evaluateAll((elements) =>
      elements.map((element) => {
        const island = element as HTMLElement
        return `${island.dataset.coordinationId}:${island.style.left},${island.style.top},${island.style.width}`
      }),
    )
  const restingPositions = await positions()

  const ingenierias = page.locator(
    '.impact-executive-island[data-coordination-id="coord-ingenierias"]',
  )
  await expect(ingenierias).toHaveCSS('cursor', 'pointer')
  const restingScale = await ingenierias
    .locator('.impact-executive-island__body')
    .evaluate((element) => getComputedStyle(element).transform)

  await ingenierias.hover()
  await expect
    .poll(() =>
      ingenierias
        .locator('.impact-executive-island__body')
        .evaluate((element) => getComputedStyle(element).transform),
    )
    .not.toBe(restingScale)
  // El hover es un respiro local: la composición territorial no se recalcula.
  expect(await positions()).toEqual(restingPositions)

  for (const coordinationId of ['coord-homologaciones', 'coord-servicios']) {
    await page
      .locator(`.impact-executive-island[data-coordination-id="${coordinationId}"]`)
      .click()
    await expect(
      page.locator(
        `.impact-executive-context[data-coordination-id="${coordinationId}"]`,
      ),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Cerrar panel' }).click()
  }
})

test('la jerarquía geométrica no cambia en estados operacionales uniformes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await installRole(page, 'DIRECTOR')
  await page.goto('/red-impacto', { waitUntil: 'domcontentloaded' })

  const map = page.locator('.impact-executive__map')
  const islands = page.locator('.impact-executive-island')
  await expect(islands).toHaveCount(14)
  const geometry = () =>
    islands.evaluateAll((elements) =>
      elements.map((element) => {
        const htmlElement = element as HTMLElement
        return {
          id: htmlElement.dataset.coordinationId,
          left: htmlElement.style.left,
          top: htmlElement.style.top,
          width: htmlElement.style.width,
          height: htmlElement.style.height,
          focal: htmlElement.dataset.focal,
        }
      }),
    )
  const initialGeometry = await geometry()

  for (const status of ['normal', 'attention', 'critical'] as const) {
    await map.evaluate((element, nextStatus) => {
      element.setAttribute('data-status-scenario', `uniform-${nextStatus}`)
      const statusLabel = {
        normal: 'Normal',
        attention: 'Atención',
        critical: 'Crítica',
      }[nextStatus]
      element
        .querySelectorAll<HTMLElement>('.impact-executive-island')
        .forEach((island) => {
          island.setAttribute('data-status', nextStatus)
          const badge = island.querySelector<HTMLElement>(
            '.impact-executive-island__badge',
          )
          const labelNode = badge?.lastChild
          if (labelNode) labelNode.textContent = statusLabel
        })
    }, status)

    await expect(
      page.locator('.impact-executive-island[data-focal="true"]'),
    ).toHaveCount(1)
    expect(await geometry()).toEqual(initialGeometry)

    if (process.env.NOVEX_CAPTURE === '1') {
      await map.screenshot({
        path: `test-results/director-operational-map-all-${status}.png`,
      })
    }
  }
})

for (const viewportSize of [
  { width: 1366, height: 768 },
  { width: 1600, height: 900 },
  { width: 1920, height: 1080 },
] as const) {
  test(`mapa y rail permanecen accesibles a ${viewportSize.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewportSize)
    await installRole(page, 'DIRECTOR')
    await page.goto('/red-impacto', { waitUntil: 'domcontentloaded' })

    const map = page.locator('.impact-executive__map')
    const rail = page.locator('.impact-executive__rail')
    const controls = page.locator('.impact-executive__map-controls')
    await expect(map).toBeVisible()
    await expect(rail).toBeVisible()
    await expect(controls).toBeInViewport()
    await expect(page.locator('.impact-executive__patterns')).toBeInViewport()

    if (process.env.NOVEX_CAPTURE === '1') {
      await page.waitForTimeout(1_200)
      await page.screenshot({
        path: `test-results/director-operational-map-${viewportSize.width}.png`,
        fullPage: true,
      })
    }

    const mapBox = await map.boundingBox()
    const railBox = await rail.boundingBox()
    const guideBox = await page
      .locator('.impact-executive__map-header h3')
      .boundingBox()
    const b2bLabelBox = await page
      .locator(
        '.impact-executive-island[data-coordination-id="coord-b2b"] .impact-executive-island__meta',
      )
      .boundingBox()
    const labelRects = await page
      .locator('.impact-executive-island__meta')
      .evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect()
          return {
            id: element.closest<HTMLElement>('.impact-executive-island')
              ?.dataset.coordinationId,
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
          }
        }),
      )
    expect(mapBox).not.toBeNull()
    expect(railBox).not.toBeNull()
    expect(guideBox).not.toBeNull()
    expect(b2bLabelBox).not.toBeNull()
    if (mapBox && railBox) {
      expect(mapBox.x + mapBox.width).toBeLessThanOrEqual(railBox.x)
    }
    if (guideBox && b2bLabelBox) {
      const separatedHorizontally =
        b2bLabelBox.x >= guideBox.x + guideBox.width + 6
      const separatedVertically =
        b2bLabelBox.y >= guideBox.y + guideBox.height + 6
      expect(separatedHorizontally || separatedVertically).toBe(true)
    }

    for (let leftIndex = 0; leftIndex < labelRects.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < labelRects.length;
        rightIndex += 1
      ) {
        const left = labelRects[leftIndex]
        const right = labelRects[rightIndex]
        const overlapX = Math.min(left.right, right.right) - Math.max(left.left, right.left)
        const overlapY = Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top)

        expect(
          overlapX > 2 && overlapY > 2,
          `${left.id} solapa la etiqueta de ${right.id}`,
        ).toBe(false)
      }
    }

    // Las etiquetas de sector no deben leerse como el nombre de una coordinación.
    const sectorRects = await page
      .locator('.impact-executive__territory-labels span')
      .evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect()
          return {
            id: element.textContent?.trim() ?? '',
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
          }
        }),
      )
    expect(sectorRects).toHaveLength(4)

    for (const sector of sectorRects) {
      for (const label of labelRects) {
        const overlapX =
          Math.min(sector.right, label.right) - Math.max(sector.left, label.left)
        const overlapY =
          Math.min(sector.bottom, label.bottom) - Math.max(sector.top, label.top)

        expect(
          overlapX > -6 && overlapY > -6,
          `${sector.id} compite con el nombre de ${label.id}`,
        ).toBe(false)
      }
    }
  })
}
