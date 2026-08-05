import type { Page } from 'playwright/test'

const CODES = [
  ['coord-ingenierias', 'Ingenierías'],
  ['coord-operaciones-academicas', 'Operaciones Académicas'],
  ['coord-general', 'Coordinación General'],
  ['coord-empresarial', 'Empresarial'],
  ['coord-saber-pro', 'Saber Pro'],
  ['coord-b2b', 'B2B'],
  ['coord-desarrollo-profesional', 'Desarrollo Profesional'],
  ['coord-proyeccion-social', 'Proyección Social'],
  ['coord-bellas-artes', 'Bellas Artes'],
  ['coord-servicios', 'Servicios'],
  ['coord-especializaciones', 'Especializaciones'],
  ['coord-transversales', 'Transversales'],
] as const

export const IMPACT_E2E_SITUATION_ID = '6ce4e56e-5555-4555-8555-555555555555'

const coordinations = CODES.map(([code, name], index) => ({
  id: code,
  code,
  name,
  shortName: name,
  description: null,
  color: ['#57d6ff', '#718cff', '#a3ff5c', '#a770ff'][index % 4],
  icon: 'network',
  imageAsset:
    code === 'coord-b2b'
      ? 'CoordB2B.png'
      : code === 'coord-bellas-artes'
        ? 'CoordBellasartes.png'
        : code === 'coord-servicios'
          ? 'CoordServicios.png'
          : code === 'coord-proyeccion-social'
            ? 'CoordSociallab.png'
            : code === 'coord-desarrollo-profesional'
              ? 'CoordDesarrolloprof.png'
              : 'CoordGeneral.png',
  displayOrder: index + 1,
  isActive: true,
  createdAt: '2026-07-20T00:00:00.000Z',
  updatedAt: '2026-07-20T00:00:00.000Z',
}))

const situation = {
  id: IMPACT_E2E_SITUATION_ID,
  title: 'Interrupción de matrículas',
  description: 'Degradación sostenida con impacto entre coordinaciones.',
  coordinationId: 'coord-ingenierias',
  coordinationCode: 'coord-ingenierias',
  coordinationName: 'Ingenierías',
  createdByUserId: 'e2e-supervisor',
  createdByUserName: 'Directora E2E',
  assignedUserId: null,
  assignedUserName: null,
  categoryId: 'category-tech',
  categoryCode: 'TECH',
  categoryName: 'Tecnología',
  severity: 'HIGH',
  status: 'OPEN',
  lastStatusComment: null,
  resolvedAt: null,
  closedAt: null,
  occurredAt: '2026-07-28T15:00:00.000Z',
  createdAt: '2026-07-28T15:25:00.000Z',
  updatedAt: '2026-07-28T15:25:00.000Z',
}

export function buildImpactE2ESituations(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    ...situation,
    id: `6ce4e56e-5555-4555-8555-${String(index + 1).padStart(12, '0')}`,
    title: `${situation.title} ${index + 1}`,
    severity: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'][index % 4],
  }))
}

export async function installImpactNetworkApiMocks(page: Page): Promise<void> {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    if (path.endsWith('/coordinations/graph')) {
      await route.fulfill({ json: { coordinations, dependencies: [] } })
      return
    }
    if (path.endsWith('/coordinations/network-status')) {
      await route.fulfill({
        json: {
          networkStatus: 'attention',
          globalRiskScore: 64,
          activeIncidentsCount: 1,
          coordinationsCount: 12,
          synchronizedCoordinationsCount: 12,
          lastSynchronizedAt: '2026-07-28T15:30:00.000Z',
        },
      })
      return
    }
    if (path.endsWith('/situations') && route.request().method() === 'GET') {
      await route.fulfill({
        json: { items: [situation], total: 1, page: 1, limit: 100 },
      })
      return
    }
    if (path.endsWith(`/situations/${IMPACT_E2E_SITUATION_ID}`)) {
      await route.fulfill({ json: situation })
      return
    }
    if (
      path.endsWith(
        `/situations/${IMPACT_E2E_SITUATION_ID}/affected-coordinations`,
      )
    ) {
      await route.fulfill({
        json: {
          situationId: IMPACT_E2E_SITUATION_ID,
          impactAssessmentId: 'impact-e2e',
          items: coordinations.slice(1, 5).map((item, index) => ({
            coordinationId: item.id,
            coordinationCode: item.code,
            coordinationName: item.name,
            impactLevel: index === 0 ? 'HIGH' : 'MEDIUM',
            impactScore: 70 - index * 8,
            rationale: 'Dependencia operacional',
          })),
          total: 4,
        },
      })
      return
    }
    if (path.endsWith(`/situations/${IMPACT_E2E_SITUATION_ID}/analysis`)) {
      await route.fulfill({ status: 404, json: { message: 'Sin análisis' } })
      return
    }
    if (
      path.endsWith(`/situations/${IMPACT_E2E_SITUATION_ID}/impact-context`)
    ) {
      await route.fulfill({
        json: {
          situationId: IMPACT_E2E_SITUATION_ID,
          originCoordinationId: 'coord-ingenierias',
          originCoordinationCode: 'coord-ingenierias',
          hasDeclaredRelated: true,
          canSimulate: false,
          simulationAvailable: false,
          declaredRelated: coordinations.slice(1, 5).map((item, index) => ({
            coordinationId: item.id,
            coordinationCode: item.code,
            coordinationName: item.name,
            coordinationShortName: item.shortName,
            impactLevel: index === 0 ? 'HIGH' : 'MEDIUM',
            description: 'Dependencia operacional',
            source: 'declared',
          })),
          message: 'Se muestran las coordinaciones declaradas por el usuario.',
        },
      })
      return
    }
    if (path.includes(`/situations/${IMPACT_E2E_SITUATION_ID}/`)) {
      await route.fulfill({
        json: {
          situationId: IMPACT_E2E_SITUATION_ID,
          items: [],
          total: 0,
          latestVersion: null,
        },
      })
      return
    }
    await route.fallback()
  })
}
