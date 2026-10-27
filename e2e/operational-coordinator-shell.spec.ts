import { expect, test, type Page } from 'playwright/test'
import { operationalOverviewFixture } from './operational-overview.fixture'
import path from 'node:path'

/**
 * Composición COORDINADOR: carta propia, sin baraja, grupos Debo resolver /
 * Afectan, Mis reportes sin desplazar la carta.
 */

const CARD = '[data-testid="coordination-card"]'
const B2B = 'coord-b2b'
const NEGOCIOS = 'coord-negocios'

const PERMISSIONS = [
  'SITUATIONS_VIEW',
  'COORDINATIONS_VIEW',
  'SITUATIONS_CREATE',
  'SITUATIONS_CLOSE',
  'AI_VIEW_REPORTS',
  'REPORTS_VIEW',
]

const OVERVIEW = operationalOverviewFixture({ severe: true })
const B2B_ROW = OVERVIEW.coordinations.find((c) => c.code === B2B)!
const NEGOCIOS_ROW = OVERVIEW.coordinations.find((c) => c.code === NEGOCIOS)!

const session = {
  id: 'e2e-coord',
  name: 'Coordinador B2B E2E',
  role: 'ejecutor',
  roleCode: 'COORDINADOR',
  roleName: 'Coordinador',
  permissions: PERMISSIONS,
  coordinationId: B2B_ROW.id,
  selectedAreaId: B2B,
  onboardingStep: 100,
  onboardingCompleted: true,
}

function base64Url(value: string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function accessToken(coordinationId: string | null = B2B_ROW.id): string {
  return `${base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64Url(
    JSON.stringify({
      sub: 'e2e-coord',
      email: 'coord.b2b@novex.test',
      roleId: 'role-coord',
      roleCode: 'COORDINADOR',
      coordinationId,
      permissions: PERMISSIONS,
      status: 'ACTIVE',
    }),
  )}.e2e`
}

const OWN_INTERNAL = {
  id: 'sit-own-internal',
  title: 'Problema interno B2B',
  description: 'Desc',
  reportKind: 'INTERNAL',
  coordinationId: B2B_ROW.id,
  coordinationCode: B2B,
  coordinationName: B2B_ROW.name,
  affectedCoordinationId: B2B_ROW.id,
  affectedCoordinationCode: B2B,
  affectedCoordinationName: B2B_ROW.name,
  affectedProcess: null,
  pendingDelivery: null,
  createdByUserId: session.id,
  createdByUserName: session.name,
  categoryId: 'cat-acas',
  categoryCode: 'ACAS',
  categoryName: 'ACAS',
  severity: 'HIGH',
  status: 'OPEN',
  occurredAt: '2026-09-01T10:00:00.000Z',
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  relatedCoordinations: [],
  resolution: null,
  canResolve: true,
  slaHealth: 'on_track',
  dueAt: null,
}

const INTER_RESOLVE = {
  ...OWN_INTERNAL,
  id: 'sit-inter-resolve',
  title: 'Debemos resolver para Negocios',
  reportKind: 'INTER_COORDINATION',
  coordinationId: B2B_ROW.id,
  coordinationCode: B2B,
  coordinationName: B2B_ROW.name,
  affectedCoordinationId: NEGOCIOS_ROW.id,
  affectedCoordinationCode: NEGOCIOS,
  affectedCoordinationName: NEGOCIOS_ROW.name,
  affectedProcess: 'Inscripciones',
  pendingDelivery: 'Cupos',
  categoryId: null,
  categoryCode: null,
  categoryName: null,
  canResolve: true,
}

const INTER_AFFECTING = {
  ...OWN_INTERNAL,
  id: 'sit-inter-affecting',
  title: 'Negocios nos afecta',
  reportKind: 'INTER_COORDINATION',
  coordinationId: NEGOCIOS_ROW.id,
  coordinationCode: NEGOCIOS,
  coordinationName: NEGOCIOS_ROW.name,
  affectedCoordinationId: B2B_ROW.id,
  affectedCoordinationCode: B2B,
  affectedCoordinationName: B2B_ROW.name,
  affectedProcess: 'Ventas',
  pendingDelivery: 'Datos',
  categoryId: null,
  categoryCode: null,
  categoryName: null,
  canResolve: false,
  createdByUserId: 'otro',
  createdByUserName: 'Otro',
}

const FOREIGN_REPORT = {
  ...OWN_INTERNAL,
  id: 'sit-foreign-mine',
  title: 'Reporté en Negocios',
  reportKind: 'INTERNAL',
  coordinationId: NEGOCIOS_ROW.id,
  coordinationCode: NEGOCIOS,
  coordinationName: NEGOCIOS_ROW.name,
  affectedCoordinationId: NEGOCIOS_ROW.id,
  affectedCoordinationCode: NEGOCIOS,
  affectedCoordinationName: NEGOCIOS_ROW.name,
  canResolve: false,
}

async function settle(page: Page) {
  await page.waitForTimeout(500)
}

async function install(
  page: Page,
  options: {
    coordinationId?: string | null
    level1Items?: (typeof OWN_INTERNAL)[]
    /**
     * Las vidas de B2B en el overview se DERIVAN de los problemas activos del
     * mock con la regla del backend (LOW/MEDIUM 1, HIGH/CRITICAL 2; propios +
     * INTER entrantes de otra responsable), en lugar de quedarse fijas. Así un
     * alta o una resolución cambian `lifePoints` de forma coherente.
     */
    derivedLives?: boolean
  } = {},
) {
  const coordinationId =
    options.coordinationId === undefined
      ? B2B_ROW.id
      : options.coordinationId

  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
  await page.addInitScript(
    ({ token, sessionPayload }) => {
      localStorage.setItem('novex.auth.accessToken.v1', token)
      localStorage.setItem(
        'novex.auth.session.v1',
        JSON.stringify(sessionPayload),
      )
    },
    {
      token: accessToken(coordinationId),
      sessionPayload: {
        ...session,
        coordinationId,
      },
    },
  )

  let created: Record<string, unknown> | null = null
  const level1Items = options.level1Items ?? [
    OWN_INTERNAL,
    INTER_RESOLVE,
    INTER_AFFECTING,
  ]
  const resolvedIds = new Set<string>()

  /** Espejo de la política `life-points-v1` sobre los problemas del mock. */
  function b2bLifePoints(): number {
    const weight = (severity: unknown) =>
      severity === 'HIGH' || severity === 'CRITICAL' ? 2 : 1
    const active = [
      ...level1Items,
      ...(created ? [created as typeof OWN_INTERNAL] : []),
    ].filter((item) => !resolvedIds.has(String(item.id)))
    const damage = active.reduce((sum, item) => {
      const owned = item.coordinationId === B2B_ROW.id
      const incoming =
        item.reportKind === 'INTER_COORDINATION' &&
        item.affectedCoordinationId === B2B_ROW.id &&
        item.coordinationId !== B2B_ROW.id
      return owned || incoming ? sum + weight(item.severity) : sum
    }, 0)
    return Math.min(10, Math.max(0, 10 - damage))
  }

  function overviewResponse() {
    if (!options.derivedLives) return OVERVIEW
    return {
      ...OVERVIEW,
      coordinations: OVERVIEW.coordinations.map((row) =>
        row.code === B2B ? { ...row, lifePoints: b2bLifePoints() } : row,
      ),
    }
  }

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()

    if (url.pathname.endsWith('/auth/me')) {
      await route.fulfill({
        json: {
          user: {
            ...session,
            coordinationId,
            fullName: session.name,
          },
        },
      })
      return
    }

    if (url.pathname.endsWith('/operational-overview')) {
      await route.fulfill({ json: overviewResponse() })
      return
    }

    if (url.pathname.endsWith('/situations/categories')) {
      await route.fulfill({
        json: [
          {
            id: 'cat-acas',
            code: 'ACAS',
            name: 'ACAS',
            description: null,
            isSelectable: true,
            icon: 'acas',
          },
        ],
      })
      return
    }

    if (
      method === 'POST' &&
      url.pathname.endsWith('/situations/register-with-analysis')
    ) {
      const body = route.request().postDataJSON() as Record<string, unknown>
      const isInter = body.reportKind === 'INTER_COORDINATION'
      const destId = String(body.coordinationId ?? '')
      const dest =
        OVERVIEW.coordinations.find((c) => c.id === destId) ?? B2B_ROW
      created = {
        id: `sit-created-${Date.now()}`,
        title: body.title,
        description: body.description,
        reportKind: body.reportKind ?? 'INTERNAL',
        coordinationId: body.coordinationId ?? null,
        coordinationCode: dest.code,
        coordinationName: dest.name,
        affectedCoordinationId:
          body.affectedCoordinationId ?? body.coordinationId ?? null,
        affectedCoordinationCode: isInter ? B2B : dest.code,
        affectedCoordinationName: isInter ? B2B_ROW.name : dest.name,
        affectedProcess: body.affectedProcess ?? null,
        pendingDelivery: body.pendingDelivery ?? null,
        createdByUserId: session.id,
        createdByUserName: session.name,
        categoryId: body.categoryId ?? null,
        categoryCode: body.categoryId ? 'ACAS' : null,
        categoryName: body.categoryId ? 'ACAS' : null,
        severity: body.severity,
        status: 'OPEN',
        occurredAt: body.occurredAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        relatedCoordinations: [],
        resolution: null,
        canResolve: dest.code === B2B,
        slaHealth: 'on_track',
        dueAt: null,
      }
      await route.fulfill({
        status: 201,
        json: { situation: created, analysis: null },
      })
      return
    }

    if (url.pathname.includes('/situations/') && method === 'GET') {
      const idMatch = url.pathname.match(/\/situations\/([^/]+)$/)
      if (idMatch && idMatch[1] !== 'categories') {
        const id = idMatch[1]
        const found =
          created?.id === id
            ? created
            : [...level1Items, FOREIGN_REPORT].find((s) => s.id === id)
        await route.fulfill({ json: found ?? OWN_INTERNAL })
        return
      }
    }

    if (
      method === 'POST' &&
      /\/situations\/[^/]+\/resolution$/.test(url.pathname)
    ) {
      const id = url.pathname.split('/').at(-2)
      if (id) resolvedIds.add(id)
      const body = route.request().postDataJSON() as { learning?: string }
      await route.fulfill({
        json: {
          ...OWN_INTERNAL,
          id,
          status: 'CLOSED',
          canResolve: false,
          resolution: {
            learning: body.learning ?? '',
            resolvedByUserName: session.name,
            resolvedAt: new Date().toISOString(),
          },
        },
      })
      return
    }

    if (url.pathname.endsWith('/situations')) {
      const mine = url.searchParams.get('mine') === 'true'
      const status = url.searchParams.get('status')
      const coordinationId = url.searchParams.get('coordinationId')

      if (mine) {
        const items = [FOREIGN_REPORT, OWN_INTERNAL]
        await route.fulfill({
          json: {
            items: status
              ? items.filter((i) => i.status === status)
              : items,
            total: items.length,
            page: 1,
            limit: 20,
            scope: 'complete',
          },
        })
        return
      }

      let items = level1Items
      if (created && (!status || status === created.status)) {
        items = [...items, created as typeof OWN_INTERNAL]
      }
      if (coordinationId === B2B_ROW.id) {
        items = items.filter(
          (i) =>
            i.coordinationId === B2B_ROW.id ||
            i.affectedCoordinationId === B2B_ROW.id,
        )
      }
      if (status) {
        items = items.filter((i) => i.status === status)
      }

      await route.fulfill({
        json: {
          items,
          total: items.length,
          page: 1,
          limit: 100,
          scope: 'complete',
        },
      })
      return
    }

    if (
      url.pathname.includes('/evidences') ||
      url.pathname.includes('/recommendations') ||
      url.pathname.includes('/timeline')
    ) {
      await route.fulfill({ json: [] })
      return
    }

    await route.fulfill({ status: 404, json: { message: 'not mocked' } })
  })
}

test.describe('Centro operacional COORDINADOR', () => {
  test('entra con carta propia, sin baraja, y clasifica problemas', async ({
    page,
  }, testInfo) => {
    await install(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/centro-operacional')
    await settle(page)

    const shell = page.getByTestId('operational-shell')
    await expect(shell).toHaveAttribute('data-shell-layout', 'coordinator')
    await expect(shell).toHaveAttribute('data-shell-experience', 'coordinator')
    await expect(page.getByTestId('shell-stage')).toHaveCount(0)
    await expect(page.getByTestId('coordinator-own-card')).toBeVisible()
    await expect(page.locator(CARD)).toHaveCount(1)
    await expect(page.locator(CARD)).toHaveAttribute('data-code', B2B)

    await expect(page.getByTestId('coordinator-to-resolve')).toBeVisible()
    await expect(
      page.getByTestId('coordinator-to-resolve').getByTestId('problem-row'),
    ).toHaveCount(2)
    await expect(
      page.getByTestId('coordinator-affecting').getByTestId('problem-row'),
    ).toHaveCount(1)

    await page
      .getByTestId('coordinator-to-resolve')
      .getByTestId('problem-row')
      .filter({ hasText: 'Debemos resolver' })
      .click()
    await settle(page)
    await expect(page.getByTestId('resolve-submit')).toBeVisible()

    await page
      .getByTestId('coordinator-affecting')
      .getByTestId('problem-row')
      .click()
    await settle(page)
    await expect(page.getByTestId('resolve-not-allowed')).toBeVisible()
    await expect(page.getByTestId('resolve-submit')).toHaveCount(0)

    await page.screenshot({
      path: path.join(
        testInfo.outputDir,
        'coord-1440x900.png',
      ),
      fullPage: true,
    })
  })

  test('marca lateral: la otra coordinación en los dos grupos, la propia en internos', async ({
    page,
  }) => {
    await install(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/centro-operacional')
    await settle(page)

    const toResolve = page.getByTestId('coordinator-to-resolve')
    const affecting = page.getByTestId('coordinator-affecting')

    const internal = toResolve
      .getByTestId('problem-row')
      .filter({ hasText: 'Problema interno B2B' })
    await expect(internal.getByTestId('coordination-mark')).toHaveAttribute(
      'data-mark-code',
      B2B,
    )
    // Ficha compacta: visible solo la coordinación; la relación, en el tooltip.
    await expect(internal.getByTestId('problem-row-origin')).toHaveText('B2B')
    await expect(internal.getByTestId('problem-row-origin')).toHaveAttribute(
      'title',
      'Problema interno · B2B',
    )

    // Debo resolver (INTER): somos la responsable → la afectada.
    const resolveRow = toResolve
      .getByTestId('problem-row')
      .filter({ hasText: 'Debemos resolver' })
    await expect(resolveRow.getByTestId('coordination-mark')).toHaveAttribute(
      'data-mark-code',
      NEGOCIOS,
    )
    await expect(resolveRow.getByTestId('problem-row-origin')).toHaveAttribute(
      'title',
      /Debemos resolver/i,
    )

    // Afectan (INTER): somos la afectada → la responsable.
    const affectingRow = affecting.getByTestId('problem-row')
    await expect(affectingRow.getByTestId('coordination-mark')).toHaveAttribute(
      'data-mark-code',
      NEGOCIOS,
    )
    await expect(affectingRow.getByTestId('problem-row-origin')).toHaveAttribute(
      'title',
      /Nos afecta desde/,
    )
    await expect(affectingRow).toHaveAttribute(
      'aria-label',
      /Negocios nos afecta\. Dependencia que nos afecta\. Coordinación responsable: .+\. Severidad Alta\. Abierto\./,
    )
  })

  for (const width of [1024, 1440, 1920]) {
    test(`título largo a ${width}px no oculta severidad ni estado`, async ({
      page,
    }) => {
      const LONG =
        'Retraso en la entrega de materiales del curso virtual de ingeniería de software para el segundo periodo académico'
      await install(page, {
        level1Items: [
          { ...OWN_INTERNAL, title: LONG },
          { ...INTER_RESOLVE, title: LONG },
          { ...INTER_AFFECTING, title: LONG },
        ],
      })
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/centro-operacional')
      await settle(page)

      const container = page.getByTestId('coordinator-problems-groups')
      const box = await container.boundingBox()
      expect(box).not.toBeNull()
      const rows = page
        .getByTestId('coordinator-problem-panel')
        .getByTestId('problem-row')
      await expect(rows).toHaveCount(3)

      for (let index = 0; index < 3; index += 1) {
        const row = rows.nth(index)
        const rowBox = await row.boundingBox()
        expect(rowBox!.x + rowBox!.width).toBeLessThanOrEqual(
          box!.x + box!.width + 1,
        )
        for (const testId of ['problem-row-severity', 'problem-row-status']) {
          const part = row.getByTestId(testId)
          await expect(part).toBeVisible()
          const partBox = await part.boundingBox()
          expect(partBox!.width).toBeGreaterThan(0)
          expect(partBox!.x).toBeGreaterThanOrEqual(box!.x - 1)
          expect(partBox!.x + partBox!.width).toBeLessThanOrEqual(
            box!.x + box!.width + 1,
          )
        }
      }
    })
  }

  test('Mis reportes de otra área no desplaza la carta propia', async ({
    page,
  }) => {
    await install(page)
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/centro-operacional')
    await settle(page)

    await page
      .getByTestId('my-report-row')
      .filter({ hasText: 'Reporté en Negocios' })
      .click()
    await settle(page)

    await expect(page.locator(CARD)).toHaveAttribute('data-code', B2B)
    await expect(page.getByTestId('action-panel')).toHaveAttribute(
      'data-mode',
      'detail',
    )
    await expect(page.getByTestId('resolve-not-allowed')).toBeVisible()
  })

  test('registro interno y dependencia desde la vista', async ({ page }) => {
    await install(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/centro-operacional')
    await settle(page)

    // CTAs solo en el panel de acciones; Mis reportes no los duplica.
    await expect(
      page.getByTestId('my-reports').getByTestId('report-internal-button'),
    ).toHaveCount(0)
    await expect(page.getByTestId('action-panel')).toHaveAttribute(
      'data-can-create',
      'true',
    )

    await page.getByTestId('report-internal-button').first().click()
    await settle(page)
    await expect(page.getByTestId('report-form')).toHaveAttribute(
      'data-report-kind',
      'INTERNAL',
    )
    // INTERNAL vivo: el coordinador registra en SU coordinación (sin «Destino»)
    // y puede declarar una afectación inicial opcional.
    await expect(page.getByTestId('report-internal-destination')).toHaveCount(0)
    await expect(page.getByTestId('report-initial-consequence')).toBeVisible()
    await page.getByTestId('report-title').fill('Nuevo interno B2B')
    await page.getByTestId('report-description').fill('Descripción suficiente')
    await page.getByTestId('report-category').selectOption('cat-acas')
    await page.getByTestId('report-submit').click()
    await settle(page)

    // Tras el alta el panel abre el expediente; Volver restaura idle y los CTAs.
    await expect(page.getByTestId('action-panel')).toHaveAttribute(
      'data-mode',
      'detail',
    )
    await page.getByTestId('detail-back').click()
    await settle(page)
    await expect(page.getByTestId('action-panel')).toHaveAttribute(
      'data-mode',
      'idle',
    )

    await page.getByTestId('report-dependency-button').first().click()
    await settle(page)
    await expect(page.getByTestId('report-form')).toHaveAttribute(
      'data-report-kind',
      'INTER_COORDINATION',
    )
    await page.getByTestId('report-responsible-trigger').click()
    await page
      .locator(
        `[data-testid="report-responsible-option"][data-option-id="${NEGOCIOS_ROW.id}"]`,
      )
      .click()
    await expect(page.getByTestId('report-responsible-value')).toHaveValue(
      NEGOCIOS_ROW.id,
    )
    await page.getByTestId('report-title').fill('Dependencia hacia Negocios')
    await page.getByTestId('report-description').fill('Bloqueo de cupos')
    await page.getByTestId('report-affected-process').fill('Proceso ventas')
    await page.getByTestId('report-pending-delivery').fill('Entrega de datos')
    await page.getByTestId('report-submit').click()
    await settle(page)
  })

  test('sin coordinación asignada muestra error explícito', async ({
    page,
  }) => {
    await install(page, { coordinationId: null })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/centro-operacional')
    await settle(page)

    await expect(page.getByTestId('coordinator-assignment-error')).toBeVisible()
    await expect(page.getByTestId('shell-stage')).toHaveCount(0)
    await expect(page.locator(CARD)).toHaveCount(0)
  })

  test('ADMIN conserva la baraja', async ({ page }) => {
    const adminPerms = [
      'SITUATIONS_VIEW',
      'COORDINATIONS_VIEW',
      'AI_VIEW_REPORTS',
      'REPORTS_VIEW',
    ]
    const adminToken = `${base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64Url(
      JSON.stringify({
        sub: 'e2e-admin',
        email: 'admin@novex.test',
        roleId: 'role-admin',
        roleCode: 'ADMIN',
        coordinationId: null,
        permissions: adminPerms,
        status: 'ACTIVE',
      }),
    )}.e2e`

    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
      route.abort(),
    )
    await page.addInitScript((token) => {
      localStorage.setItem('novex.auth.accessToken.v1', token)
    }, adminToken)

    await page.route('**/api/v1/**', async (route) => {
      const url = new URL(route.request().url())
      if (url.pathname.endsWith('/auth/me')) {
        await route.fulfill({
          json: {
            user: {
              id: 'e2e-admin',
              name: 'Admin',
              roleCode: 'ADMIN',
              roleName: 'Administrador',
              permissions: adminPerms,
              coordinationId: null,
              fullName: 'Admin',
            },
          },
        })
        return
      }
      if (url.pathname.endsWith('/operational-overview')) {
        await route.fulfill({ json: OVERVIEW })
        return
      }
      if (url.pathname.endsWith('/situations/categories')) {
        await route.fulfill({ json: [] })
        return
      }
      if (url.pathname.endsWith('/situations')) {
        await route.fulfill({
          json: { items: [], total: 0, page: 1, limit: 20, scope: 'complete' },
        })
        return
      }
      await route.fulfill({ status: 404, json: { message: 'not mocked' } })
    })

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/centro-operacional')
    await settle(page)

    await expect(page.getByTestId('operational-shell')).toHaveAttribute(
      'data-shell-layout',
      'deck',
    )
    await expect(page.getByTestId('operational-shell')).toHaveAttribute(
      'data-shell-experience',
      'admin',
    )
    await expect(page.getByTestId('shell-stage')).toBeVisible()
    await expect(page.locator(CARD).first()).toBeVisible()
  })

  test('capturas 1920 y 1280', async ({ page }, testInfo) => {
    await install(page)

    for (const size of [
      { width: 1920, height: 1080, name: 'coord-1920x1080' },
      { width: 1280, height: 800, name: 'coord-1280x800' },
    ]) {
      await page.setViewportSize({
        width: size.width,
        height: size.height,
      })
      await page.goto('/centro-operacional')
      await settle(page)
      await expect(page.getByTestId('coordinator-own-card')).toBeVisible()
      const rail = page.getByTestId('shell-region-rail')
      const reports = page.getByTestId('shell-region-my-reports')
      const problems = page.getByTestId('shell-region-coordination-problems')
      const action = page.getByTestId('shell-region-action')
      for (const region of [rail, reports, problems, action]) {
        const box = await region.boundingBox()
        expect(box).not.toBeNull()
        expect(box!.width).toBeGreaterThan(80)
        expect(box!.height).toBeGreaterThan(120)
      }
      await page.screenshot({
        path: path.join(testInfo.outputDir, `${size.name}.png`),
        fullPage: true,
      })
    }
  })

  /*
   * VIDAS del COORDINADOR: siempre las de su coordinación ASIGNADA (B2B, 3
   * puntos en el fixture), desde la entrada y aunque abra un reporte propio en
   * otra área (Negocios, lifePoints null). Se mide además que quepan en el
   * rail en los cinco viewports de validación.
   */
  test('vidas desde la coordinación asignada, en cinco viewports', async ({
    page,
  }, testInfo) => {
    test.slow()
    await install(page)

    expect(B2B_ROW.lifePoints).toBe(3)
    expect(NEGOCIOS_ROW.lifePoints).toBeNull()

    const character = page.getByTestId('direction-character')
    const hearts = page.locator(
      '[data-testid="shell-region-character"] [data-testid="character-lives-heart"]',
    )
    const B2B_STATES = ['full', 'half', 'empty', 'empty', 'empty']

    async function expectB2BLives() {
      await expect(character).toHaveAttribute('data-lives', 'shown')
      await expect(hearts).toHaveCount(5)
      expect(
        await hearts.evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute('data-state')),
        ),
      ).toEqual(B2B_STATES)
      await expect(page.getByTestId('character-lives')).toHaveAttribute(
        'data-life-points',
        '3',
      )
      await expect(page.getByTestId('character-lives-value')).toHaveText(
        '3 / 10',
      )
      await expect(character).toHaveAttribute(
        'aria-label',
        /^Estado: [^.]+\. Vidas del personaje: 3 de 10 puntos\.$/,
      )
      await expect(
        page.locator('[data-testid="direction-character"] [role="img"]'),
      ).toHaveCount(0)
    }

    for (const size of [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1366, height: 768 },
      { width: 1280, height: 720 },
      { width: 1100, height: 700 },
    ]) {
      await page.setViewportSize(size)
      await page.goto('/centro-operacional')
      await settle(page)
      await expect(page.getByTestId('operational-shell')).toHaveAttribute(
        'data-shell-layout',
        'coordinator',
      )

      // Desde la entrada, sin que el coordinador elija nada.
      await expectB2BLives()

      const geometry = await page.evaluate(() => {
        const rect = (selector: string) =>
          document.querySelector(selector)!.getBoundingClientRect()
        const region = rect('[data-testid="shell-region-character"]')
        const figure = rect('.direction-character__figure')
        const slot = rect('[data-testid="direction-character-lives"]')
        const lives = rect('[data-testid="character-lives"]')
        const status = rect('[data-testid="direction-character-status"]')
        const r = (value: number) => Math.round(value * 10) / 10
        return {
          region: { top: r(region.top), bottom: r(region.bottom), left: r(region.left), right: r(region.right) },
          figure: { top: r(figure.top), bottom: r(figure.bottom), height: r(figure.height) },
          slot: { top: r(slot.top), bottom: r(slot.bottom), height: r(slot.height) },
          lives: { left: r(lives.left), right: r(lives.right), width: r(lives.width), height: r(lives.height) },
          status: { top: r(status.top), bottom: r(status.bottom) },
          overflow: {
            x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
          },
        }
      })
      console.log(`COORD_LIVES_GEOMETRY ${JSON.stringify({ size, geometry })}`)

      expect(geometry.slot.top).toBeGreaterThanOrEqual(geometry.figure.bottom - 0.5)
      expect(geometry.status.top).toBeGreaterThanOrEqual(geometry.slot.bottom - 0.5)
      expect(geometry.figure.top).toBeGreaterThanOrEqual(geometry.region.top - 1)
      expect(geometry.status.bottom).toBeLessThanOrEqual(geometry.region.bottom + 1)
      expect(geometry.lives.left).toBeGreaterThanOrEqual(geometry.region.left - 0.5)
      expect(geometry.lives.right).toBeLessThanOrEqual(geometry.region.right + 0.5)
      expect(geometry.lives.height).toBeLessThanOrEqual(geometry.slot.height + 0.5)
      expect(geometry.overflow.x).toBeLessThanOrEqual(0)

      // Solo para la captura: el `.riv` pinta de forma asíncrona.
      await page.waitForTimeout(1500)
      const name = `coord-lives-${size.width}x${size.height}`
      await page.screenshot({ path: path.join(testInfo.outputDir, `${name}.png`) })
      await page
        .getByTestId('shell-region-character')
        .screenshot({ path: path.join(testInfo.outputDir, `${name}-character.png`) })
    }

    // Abrir un reporte propio en Negocios (null) NO cambia las vidas: siguen
    // siendo las de B2B, no pasan a UNKNOWN.
    await page
      .getByTestId('my-report-row')
      .filter({ hasText: 'Reporté en Negocios' })
      .click()
    await settle(page)
    await expect(page.getByTestId('action-panel')).toHaveAttribute(
      'data-mode',
      'detail',
    )
    await expectB2BLives()
  })
})

/*
 * TRANSICIÓN DE VIDAS tras un refetch real del overview. Las vidas de B2B se
 * derivan de los problemas activos del mock (`derivedLives`):
 *
 *   entrada            3 HIGH activos (propio, «debemos resolver», entrante) → 4
 *   alta MEDIUM        +1 de daño → 3   pérdida: corazón 1 FULL → HALF
 *   resolver HIGH      −2 de daño → 5   ganancia: corazón 1 HALF → FULL,
 *                                                 corazón 2 EMPTY → HALF
 */
const LIVES = '[data-testid="character-lives"]'

function livesHeart(page: Page, index: number) {
  return page.locator(
    `[data-testid="shell-region-character"] [data-testid="character-lives-heart"][data-heart-index="${index}"]`,
  )
}

async function createMediumInternal(page: Page) {
  await page.getByTestId('report-internal-button').first().click()
  await settle(page)
  await page.getByTestId('report-title').fill('Nuevo interno B2B')
  await page.getByTestId('report-description').fill('Descripción suficiente')
  await page.getByTestId('report-category').selectOption('cat-acas')
  await page.getByTestId('report-submit').click()
}

async function resolveOwnInternal(page: Page) {
  await page
    .getByTestId('coordinator-to-resolve')
    .getByTestId('problem-row')
    .filter({ hasText: 'Problema interno B2B' })
    .click()
  await settle(page)
  await page.getByTestId('resolve-learning').fill('Aprendizaje registrado')
  await page.getByTestId('resolve-submit').click()
}

async function animationNames(page: Page, index: number) {
  return livesHeart(page, index).evaluate((heart) => ({
    heart: getComputedStyle(heart).animationName,
    delta:
      heart.querySelector('.character-lives__delta') === null
        ? null
        : getComputedStyle(heart.querySelector('.character-lives__delta')!)
            .animationName,
    deltaOpacity:
      heart.querySelector('.character-lives__delta') === null
        ? null
        : getComputedStyle(heart.querySelector('.character-lives__delta')!).opacity,
  }))
}

/*
 * El proyecto corre con `reducedMotion: 'reduce'` (en `contextOptions`); este
 * bloque pide movimiento para ver la animación real.
 */
test.describe('vidas · transición con movimiento', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } })

  test('crear un problema anima una pérdida y resolverlo una ganancia', async ({
    page,
  }, testInfo) => {
    test.slow()
    await install(page, { derivedLives: true })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/centro-operacional')
    await settle(page)

    const lives = page.locator(LIVES)
    const character = page.getByTestId('direction-character')
    const region = page.getByTestId('shell-region-character')

    await expect(lives).toHaveAttribute('data-life-points', '4')
    await expect(lives).toHaveAttribute('data-transition', 'none')
    await page.waitForTimeout(1500)
    await region.screenshot({ path: testInfo.outputPath('lives-transition-0-entrada-4.png') })

    // ---- Alta: 4 → 3, pérdida ----
    await createMediumInternal(page)
    await expect(lives).toHaveAttribute('data-life-points', '3')
    await region.screenshot({ path: testInfo.outputPath('lives-transition-1-loss-t0.png') })
    await page.waitForTimeout(140)
    await region.screenshot({ path: testInfo.outputPath('lives-transition-1-loss-t140.png') })

    await expect(lives).toHaveAttribute('data-transition', 'loss')
    await expect(livesHeart(page, 1)).toHaveAttribute('data-transition', 'loss')
    await expect(livesHeart(page, 1)).toHaveAttribute('data-previous-state', 'full')
    await expect(livesHeart(page, 1)).toHaveAttribute('data-state', 'half')
    // Solo cambia el corazón 1.
    for (const index of [0, 2, 3, 4]) {
      await expect(livesHeart(page, index)).not.toHaveAttribute('data-transition', /.+/)
    }
    const lossNames = await animationNames(page, 1)
    expect(lossNames.heart).toMatch(/^cl-heart-loss-[ab]$/)
    expect(lossNames.delta).toBe('cl-delta-loss')
    // El lector de pantalla oye solo el valor final.
    await expect(character).toHaveAttribute(
      'aria-label',
      /Vidas del personaje: 3 de 10 puntos\.$/,
    )

    await page.waitForTimeout(800)
    await region.screenshot({ path: testInfo.outputPath('lives-transition-2-after-loss-3.png') })

    // ---- Resolución: 3 → 5, ganancia ----
    await resolveOwnInternal(page)
    await expect(lives).toHaveAttribute('data-life-points', '5')
    await region.screenshot({ path: testInfo.outputPath('lives-transition-3-gain-t0.png') })
    await page.waitForTimeout(160)
    await region.screenshot({ path: testInfo.outputPath('lives-transition-3-gain-t160.png') })

    await expect(lives).toHaveAttribute('data-transition', 'gain')
    await expect(livesHeart(page, 1)).toHaveAttribute('data-previous-state', 'half')
    await expect(livesHeart(page, 1)).toHaveAttribute('data-state', 'full')
    await expect(livesHeart(page, 2)).toHaveAttribute('data-previous-state', 'empty')
    await expect(livesHeart(page, 2)).toHaveAttribute('data-state', 'half')
    for (const index of [1, 2]) {
      await expect(livesHeart(page, index)).toHaveAttribute('data-transition', 'gain')
    }
    for (const index of [0, 3, 4]) {
      await expect(livesHeart(page, index)).not.toHaveAttribute('data-transition', /.+/)
    }
    // Escalonado de izquierda a derecha.
    await expect(livesHeart(page, 1)).toHaveAttribute('style', /--cl-delay:\s*0ms/)
    await expect(livesHeart(page, 2)).toHaveAttribute('style', /--cl-delay:\s*80ms/)
    const gainNames = await animationNames(page, 2)
    expect(gainNames.heart).toMatch(/^cl-heart-gain-[ab]$/)
    expect(gainNames.delta).toBe('cl-delta-gain')
    await expect(character).toHaveAttribute(
      'aria-label',
      /Vidas del personaje: 5 de 10 puntos\.$/,
    )

    await page.waitForTimeout(800)
    await region.screenshot({ path: testInfo.outputPath('lives-transition-4-after-gain-5.png') })
  })
})

test.describe('vidas · transición con reduced motion', () => {
  // Es el modo del proyecto; se declara aquí para que el test no dependa de él.
  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  test('el estado final aparece sin animación prolongada', async ({ page }) => {
    test.slow()
    // La emulación llega de verdad a la página.
    await page.goto('about:blank')
    expect(
      await page.evaluate(
        () => matchMedia('(prefers-reduced-motion: reduce)').matches,
      ),
    ).toBe(true)
    await install(page, { derivedLives: true })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/centro-operacional')
    await settle(page)

    const lives = page.locator(LIVES)
    await expect(lives).toHaveAttribute('data-life-points', '4')

    await createMediumInternal(page)
    await expect(lives).toHaveAttribute('data-life-points', '3')
    await expect(lives).toHaveAttribute('data-transition', 'loss')

    // Estado final correcto y sin animación: ni pulso, ni capa perdida visible.
    expect(
      await livesHeart(page, 1).getAttribute('data-state'),
    ).toBe('half')
    const names = await animationNames(page, 1)
    expect(names.heart).toBe('none')
    expect(names.delta).toBe('none')
    expect(names.deltaOpacity).toBe('0')
    const running = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter(
            (animation) =>
              animation instanceof CSSAnimation &&
              animation.animationName.startsWith('cl-'),
          ).length,
    )
    expect(running).toBe(0)
  })
})
