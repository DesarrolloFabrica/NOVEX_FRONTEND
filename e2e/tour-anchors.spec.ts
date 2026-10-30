import { expect, test, type Page } from 'playwright/test'
import { installRoleExperience, type RoleCode } from './role-experience.fixture'

/*
 * Anclas `data-tour` del Centro Operacional por rol.
 *
 * Son atributos pasivos: estas pruebas solo comprueban su presencia, su unicidad
 * dentro del estado visible, que las exclusivas no aparecen en roles que no las
 * usan, y los estados que requieren seleccionar una carta o abrir un panel. No
 * activan el tutorial y no envían nada: los datos son deterministas y las
 * escrituras se rastrean para verificar que no ocurren.
 */

const COORDINATION_CODES = [
  'coord-general',
  'coord-b2b',
  'coord-bellas-artes',
  'coord-desarrollo-profesional',
  'coord-empresarial',
  'coord-especializaciones',
  'coord-ingenierias',
  'coord-operaciones-academicas',
  'coord-proyeccion-social',
  'coord-saber-pro',
  'coord-transversales',
  'coord-homologaciones',
  'coord-negocios',
  'coord-fabrica-contenidos',
  'coord-servicios',
]

/** Overview determinista: 15 coordinaciones reales, ninguna con problemas. */
function overviewPayload() {
  return {
    directionStatus: 'ESTABLE',
    generatedAt: '2026-08-04T12:00:00.000Z',
    totals: { critical: 0, alert: 0, stable: COORDINATION_CODES.length },
    coordinations: COORDINATION_CODES.map((code, index) => ({
      id: code,
      code,
      name: code,
      shortName: code,
      color: '#28C8F4',
      displayOrder: index + 1,
      status: 'ESTABLE',
      activeProblemsCount: 0,
      criticalCount: 0,
      affectedCoordinationCount: 0,
    })),
    analystRegistry: {
      status: 'ESTABLE',
      activeProblemsCount: 0,
      criticalCount: 0,
      affectedCoordinationCount: 0,
    },
  }
}

const ANCHORS_BY_ROLE: Record<RoleCode, { present: string[]; absent: string[] }> = {
  ADMIN: {
    present: [
      'operational-shell',
      'center-menu',
      'operational-deck',
      'coordination-problems',
      'my-reports',
      'action-panel',
      'history-open',
    ],
    absent: [
      'director-reading',
      'report-internal',
      'report-dependency',
      'report-form',
      'director-mode-state',
      'own-coordination',
    ],
  },
  DIRECTOR: {
    present: [
      'operational-shell',
      'center-menu',
      'operational-deck',
      'coordination-problems',
      'director-reading',
      'director-mode-state',
      'director-mode-internos',
      'director-mode-dependencias',
      'director-mode-aprendizajes',
      // Sin elegir nada, el Director lee Coordinación General: el periodo ya aparece.
      'director-period',
    ],
    absent: [
      'my-reports',
      'action-panel',
      'report-internal',
      'report-dependency',
      'report-form',
      'history-open',
      'own-coordination',
    ],
  },
  ANALISTA: {
    present: [
      'operational-shell',
      'center-menu',
      'operational-deck',
      'coordination-problems',
      'my-reports',
      'action-panel',
      'report-internal',
      'report-dependency',
      'history-open',
    ],
    absent: [
      'director-reading',
      'director-mode-state',
      'own-coordination',
      'report-form',
    ],
  },
  COORDINADOR: {
    present: [
      'operational-shell',
      'center-menu',
      'coordination-problems',
      'my-reports',
      'action-panel',
      'report-internal',
      'report-dependency',
      'history-open',
    ],
    absent: [
      'operational-deck',
      'director-reading',
      'director-mode-state',
      'report-form',
    ],
  },
}

/** Rastrea las peticiones que escriben; deben permanecer vacías en estas pruebas. */
function trackWrites(page: Page): string[] {
  const writes: string[] = []
  page.on('request', (request) => {
    if (request.method() !== 'GET' && request.url().includes('/api/v1/')) {
      writes.push(`${request.method()} ${new URL(request.url()).pathname}`)
    }
  })
  return writes
}

async function mockOperationalOverview(page: Page) {
  await page.route('**/api/v1/operational-overview*', (route) =>
    route.fulfill({ json: overviewPayload() }),
  )
}

async function selectFirstCard(page: Page) {
  await page
    .locator('[data-tour="operational-deck"] [data-testid="coordination-card"]')
    .first()
    .click()
}

/** Cuenta las anclas visibles y comprueba que cada una aparece una sola vez. */
async function expectUniqueAnchors(page: Page, anchors: string[]) {
  for (const anchor of anchors) {
    const count = await page.locator(`[data-tour="${anchor}"]`).count()
    expect(count, `ancla ${anchor} duplicada`).toBeLessThanOrEqual(1)
  }
}

async function expectAnchorsByRole(page: Page, roleCode: RoleCode) {
  const { present, absent } = ANCHORS_BY_ROLE[roleCode]
  for (const anchor of present) {
    await expect(
      page.locator(`[data-tour="${anchor}"]`),
      `${roleCode}: falta el ancla ${anchor}`,
    ).toHaveCount(1)
  }
  for (const anchor of absent) {
    await expect(
      page.locator(`[data-tour="${anchor}"]`),
      `${roleCode}: el ancla ${anchor} no debe aparecer`,
    ).toHaveCount(0)
  }
  await expectUniqueAnchors(page, present)
}

for (const roleCode of ['ADMIN', 'DIRECTOR', 'ANALISTA', 'COORDINADOR'] as const) {
  test(`${roleCode}: las anclas del estado inicial son las de su rol`, async ({
    page,
  }) => {
    await installRoleExperience(page, roleCode)
    await mockOperationalOverview(page)
    await page.goto('/')

    await expect(page.getByTestId('operational-shell')).toBeVisible()
    await expectAnchorsByRole(page, roleCode)
  })

  test(`${roleCode}: ninguna escritura se dispara al aterrizar`, async ({
    page,
  }) => {
    await installRoleExperience(page, roleCode)
    await mockOperationalOverview(page)
    const writes = trackWrites(page)

    await page.goto('/')
    await expect(page.getByTestId('operational-shell')).toBeVisible()
    expect(writes).toEqual([])
  })
}

test('el menú del Centro expone su ancla solo mientras está abierto', async ({
  page,
}) => {
  await installRoleExperience(page, 'ANALISTA')
  await mockOperationalOverview(page)
  await page.goto('/')

  await expect(page.locator('[data-tour="center-menu"]')).toHaveCount(1)
  await expect(page.locator('[data-tour="center-menu-panel"]')).toHaveCount(0)

  await page.locator('[data-tour="center-menu"]').click()
  await expect(page.locator('[data-tour="center-menu-panel"]')).toHaveCount(1)
})

test('COORDINADOR: su carta propia y la acción de reportar quedan disponibles', async ({
  page,
}) => {
  await installRoleExperience(page, 'COORDINADOR')
  await mockOperationalOverview(page)
  await page.goto('/')

  await expect(page.locator('[data-tour="own-coordination"]')).toHaveCount(1)
  // Su coordinación queda seleccionada desde el inicio: reportar está activo.
  await expect(page.locator('[data-tour="report-internal"]')).toBeEnabled()
})

test('ANALISTA: parte con Coordinación General y puede reportar; al cambiar de carta muestra sus problemas', async ({
  page,
}) => {
  await installRoleExperience(page, 'ANALISTA')
  await mockOperationalOverview(page)
  await page.goto('/')

  // Sin elegir nada, el panel usa Coordinación General: reportar ya está activo.
  await expect(page.locator('[data-tour="report-internal"]')).toBeEnabled()
  await expect(page.locator('[data-tour="report-dependency"]')).toBeEnabled()

  await selectFirstCard(page)

  await expect(page.locator('[data-tour="report-internal"]')).toBeEnabled()
  // La región de problemas muestra su estado (vacío o lista) tras la selección.
  await expect(
    page
      .locator('[data-tour="coordination-problems"] [data-testid^="coordination-panel-"]')
      .first(),
  ).toBeVisible()
})

test('ANALISTA: el formulario de reporte se abre dentro del panel de acción y se cancela sin enviar', async ({
  page,
}) => {
  await installRoleExperience(page, 'ANALISTA')
  await mockOperationalOverview(page)
  const writes = trackWrites(page)
  await page.goto('/')

  await selectFirstCard(page)
  await page.locator('[data-tour="report-internal"]').click()

  await expect(page.locator('[data-tour="report-form"]')).toHaveCount(1)
  await expect(page.locator('[data-tour="action-panel"] [data-tour="report-form"]')).toHaveCount(1)

  // «Volver» del formulario cancela el reporte sin guardar nada.
  await page.locator('[data-testid="report-form-back"]').click()

  await expect(page.locator('[data-tour="report-form"]')).toHaveCount(0)
  expect(writes).toEqual([])
})

test('DIRECTOR: la lectura sigue en coordinación al elegir otra carta', async ({
  page,
}) => {
  await installRoleExperience(page, 'DIRECTOR')
  await mockOperationalOverview(page)
  await page.goto('/')

  const reading = page.locator(
    '[data-tour="director-reading"] [data-testid="director-reading-panel"]',
  )
  // Al entrar lee Coordinación General: el alcance es de coordinación y el periodo está visible.
  await expect(reading).toHaveAttribute('data-scope', 'coordination')
  await expect(page.locator('[data-tour="director-period"]')).toHaveCount(1)

  await selectFirstCard(page)

  await expect(reading).toHaveAttribute('data-scope', 'coordination')
  await expect(page.locator('[data-tour="director-period"]')).toHaveCount(1)
})

test('ADMIN: seleccionar una carta no habilita ninguna acción de reporte', async ({
  page,
}) => {
  await installRoleExperience(page, 'ADMIN')
  await mockOperationalOverview(page)
  await page.goto('/')

  await selectFirstCard(page)

  await expect(page.locator('[data-tour="report-internal"]')).toHaveCount(0)
  await expect(page.locator('[data-tour="report-dependency"]')).toHaveCount(0)
  await expect(page.locator('[data-tour="history-open"]')).toHaveCount(1)
})

test('ADMIN: el historial se abre y se cierra desde el panel de acción', async ({
  page,
}) => {
  await installRoleExperience(page, 'ADMIN')
  await mockOperationalOverview(page)
  const writes = trackWrites(page)
  await page.goto('/')

  await page.locator('[data-tour="history-open"]').click()
  await expect(page.locator('[data-tour="problem-history"]')).toHaveCount(1)

  await page.locator('[data-testid="history-back"]').click()
  await expect(page.locator('[data-tour="problem-history"]')).toHaveCount(0)
  expect(writes).toEqual([])
})
