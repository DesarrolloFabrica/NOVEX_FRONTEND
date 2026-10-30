import type { Page } from 'playwright/test'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * Escenario del piloto del COORDINADOR con problemas registrados.
 *
 * El piloto base (`coordinator-pilot-tour.spec.ts`) solo cubre el estado vacío.
 * Aquí la coordinación del usuario (B2B) tiene problemas en todos los estados
 * reales y con capacidades calculadas como las calcula el backend
 * (`OperationalScopeService`):
 *
 *   canAdvanceToInProgress  status OPEN y la coordinación del actor es la RESPONSABLE
 *   canResolve              OPEN/IN_PROGRESS y la coordinación del actor es la RESPONSABLE
 *   canUpdate               SITUATIONS_UPDATE y autoría
 *
 * Permisos del COORDINADOR según las migraciones (incluye SITUATIONS_CLOSE desde
 * GrantReportingAndClosurePermissions). Todo es mock: ninguna petición sale del
 * navegador y cualquier escritura queda registrada y rechazada.
 */

/**
 * Lectura de B2B y Negocios coherente con los problemas simulados de abajo,
 * según la política del backend (`integrity-mvp-v1` y `life-points`):
 *
 *   B2B       responsable de 2 activos (HIGH abierto, MEDIUM en revisión) y
 *             afectada por 1 dependencia CRITICAL de Negocios.
 *             Estado CRITICO por dependencia crítica entrante.
 *             Vidas 10 − (2 + 1) − 2 = 5.
 *   Negocios  responsable de 1 activo CRITICAL (afecta a B2B) y afectada por
 *             1 dependencia MEDIUM de B2B. Estado CRITICO. Vidas 10 − 2 − 1 = 7.
 *
 * El problema cerrado no cuenta: solo OPEN e IN_PROGRESS son activos.
 */
type OverviewRow = ReturnType<typeof operationalOverviewFixture>['coordinations'][number]

const COHERENT_ROWS: Readonly<Record<string, Partial<OverviewRow>>> = {
  'coord-b2b': {
    status: 'CRITICO',
    activeProblemsCount: 2,
    criticalCount: 0,
    affectedCoordinationCount: 0,
    lifePoints: 5,
  },
  'coord-negocios': {
    status: 'CRITICO',
    activeProblemsCount: 1,
    criticalCount: 1,
    affectedCoordinationCount: 0,
    lifePoints: 7,
  },
}

// La dirección y el resto de coordinaciones conservan el reparto `severe`.
const BASE_OVERVIEW = operationalOverviewFixture({ severe: true })
export const OVERVIEW = {
  ...BASE_OVERVIEW,
  coordinations: BASE_OVERVIEW.coordinations.map((row) => ({
    ...row,
    ...COHERENT_ROWS[row.code],
  })),
}
export const B2B = OVERVIEW.coordinations.find((c) => c.code === 'coord-b2b')!
export const NEGOCIOS = OVERVIEW.coordinations.find((c) => c.code === 'coord-negocios')!

export const PERMISSIONS = [
  'AUTH_VIEW_PROFILE',
  'COORDINATIONS_VIEW',
  'SITUATIONS_VIEW',
  'SITUATIONS_CREATE',
  'SITUATIONS_UPDATE',
  'SITUATIONS_CLOSE',
  'AI_ANALYZE',
  'AI_VIEW_REPORTS',
]

export const session = {
  id: 'e2e-coord-piloto',
  name: 'Coordinador Piloto E2E',
  role: 'ejecutor',
  roleCode: 'COORDINADOR',
  roleName: 'Coordinador',
  permissions: PERMISSIONS,
  coordinationId: B2B.id,
  selectedAreaId: B2B.code,
  onboardingStep: 100,
  onboardingCompleted: true,
}

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url')
}

function accessToken(): string {
  return `${base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64Url(
    JSON.stringify({
      sub: session.id,
      email: 'coord.piloto@novex.test',
      roleId: 'role-coord',
      roleCode: 'COORDINADOR',
      coordinationId: B2B.id,
      permissions: PERMISSIONS,
      status: 'ACTIVE',
    }),
  )}.e2e`
}

const BASE = {
  description: 'Descripción simulada para el piloto.',
  affectedProcess: null,
  pendingDelivery: null,
  categoryId: 'cat-acas',
  categoryCode: 'ACAS',
  categoryName: 'ACAS',
  occurredAt: '2026-10-20T10:00:00.000Z',
  createdAt: '2026-10-20T10:00:00.000Z',
  updatedAt: '2026-10-20T10:00:00.000Z',
  relatedCoordinations: [],
  resolution: null,
  slaHealth: 'on_track',
  dueAt: null,
  canAddConsequence: false,
}

const ownership = (responsible: typeof B2B, affected: typeof B2B) => ({
  coordinationId: responsible.id,
  coordinationCode: responsible.code,
  coordinationName: responsible.name,
  affectedCoordinationId: affected.id,
  affectedCoordinationCode: affected.code,
  affectedCoordinationName: affected.name,
})

/** Abierto, interno, B2B responsable y autor el propio usuario: puede avanzar y cerrar. */
export const OPEN_OWN = {
  ...BASE,
  ...ownership(B2B, B2B),
  id: 'sit-piloto-abierto',
  title: 'Piloto · abierto propio',
  reportKind: 'INTERNAL',
  severity: 'HIGH',
  status: 'OPEN',
  createdByUserId: session.id,
  createdByUserName: session.name,
  canResolve: true,
  canAdvanceToInProgress: true,
  canUpdate: true,
}

/** En revisión, dependencia donde B2B es responsable: ya no avanza, sí cierra. */
export const IN_PROGRESS_OWN = {
  ...BASE,
  ...ownership(B2B, NEGOCIOS),
  id: 'sit-piloto-revision',
  title: 'Piloto · en revisión propio',
  reportKind: 'INTER_COORDINATION',
  affectedProcess: 'Inscripciones',
  pendingDelivery: 'Cupos',
  categoryId: null,
  categoryCode: null,
  categoryName: null,
  severity: 'MEDIUM',
  status: 'IN_PROGRESS',
  createdByUserId: 'otro-usuario',
  createdByUserName: 'Otro Usuario',
  canResolve: true,
  canAdvanceToInProgress: false,
  canUpdate: false,
}

/** Abierto, dependencia que afecta a B2B con Negocios responsable: B2B no avanza ni cierra. */
export const AFFECTING = {
  ...BASE,
  ...ownership(NEGOCIOS, B2B),
  id: 'sit-piloto-ajeno',
  title: 'Piloto · Negocios nos afecta',
  reportKind: 'INTER_COORDINATION',
  affectedProcess: 'Ventas',
  pendingDelivery: 'Datos',
  categoryId: null,
  categoryCode: null,
  categoryName: null,
  severity: 'CRITICAL',
  status: 'OPEN',
  createdByUserId: 'otro-usuario',
  createdByUserName: 'Otro Usuario',
  canResolve: false,
  canAdvanceToInProgress: false,
  canUpdate: false,
}

/** Cerrado, interno de B2B, con aprendizaje: solo lectura. */
export const CLOSED_OWN = {
  ...BASE,
  ...ownership(B2B, B2B),
  id: 'sit-piloto-cerrado',
  title: 'Piloto · cerrado propio',
  reportKind: 'INTERNAL',
  severity: 'LOW',
  status: 'CLOSED',
  createdByUserId: session.id,
  createdByUserName: session.name,
  closedAt: '2026-10-25T15:00:00.000Z',
  resolvedAt: '2026-10-25T15:00:00.000Z',
  resolution: {
    learning: 'Aprendizaje simulado del piloto.',
    resolvedByUserName: session.name,
    resolvedAt: '2026-10-25T15:00:00.000Z',
  },
  canResolve: false,
  canAdvanceToInProgress: false,
  canUpdate: true,
}

export const ALL = [OPEN_OWN, IN_PROGRESS_OWN, AFFECTING, CLOSED_OWN]

/** Cinco problemas HIGH abiertos de B2B: daño 5 × 2 = 10, sin vidas. */
const HIGH_OWN = [1, 2, 3, 4, 5].map((n) => ({
  ...OPEN_OWN,
  id: `sit-piloto-alto-${n}`,
  title: `Piloto · alto propio ${n}`,
}))

/**
 * Dependencia que el propio usuario reportó: Negocios es la responsable y B2B
 * la afectada. En atención. Aparece en «Mis reportes» aunque no sea de su área.
 */
export const MY_DEPENDENCY = {
  ...AFFECTING,
  id: 'sit-piloto-mi-dependencia',
  title: 'Piloto · dependencia que reporté',
  severity: 'MEDIUM',
  status: 'IN_PROGRESS',
  createdByUserId: session.id,
  createdByUserName: session.name,
  canUpdate: true,
}

/**
 * Escenario que reproduce B2B. Los cinco primeros toman el nombre del estado de
 * su carta (salvo `CRITICO_SIN_VIDAS`); los de «Mis reportes», de lo que reportó.
 */
export type PilotScenario =
  | 'CRITICO'
  | 'CRITICO_SIN_VIDAS'
  | 'ALERTA'
  | 'ESTABLE'
  | 'DESCONOCIDO'
  | 'SIN_REPORTES'
  | 'UN_REPORTE'
  | 'VARIOS_REPORTES'

/**
 * Escenarios coherentes: cada uno simula los problemas que llevarían a B2B a
 * ese estado con la misma política del backend.
 *
 *   CRITICO      los cuatro problemas (ver COHERENT_ROWS).
 *   CRITICO_SIN_VIDAS
 *                cinco HIGH abiertos de B2B: CRITICO por acumulación de HIGH
 *                (≥ 3) y vidas 10 − 5 × 2 = 0. Negocios queda estable.
 *   ALERTA       solo la dependencia MEDIUM en revisión donde B2B es la
 *                responsable: 1 activo sin reglas críticas. Vidas 10 − 1 = 9.
 *                Negocios, afectada por ella: ALERTA, 9 vidas.
 *   ESTABLE      solo el problema cerrado: ningún activo. Vidas 10.
 *   DESCONOCIDO  el backend no pudo calcular (snapshot incoherente): estado
 *                DESCONOCIDO y vidas null. Los problemas siguen listándose.
 *
 * Escenarios de «Mis reportes» (`mine=true` devuelve lo que creó el usuario):
 *
 *   SIN_REPORTES     problemas solo de otros autores. B2B responsable de 1
 *                    MEDIUM y afectada por 1 CRITICAL → CRITICO, 10 − 1 − 2 = 7.
 *                    Negocios: CRITICAL propio y MEDIUM entrante → CRITICO, 7.
 *   UN_REPORTE       un HIGH abierto propio → ALERTA, 10 − 2 = 8.
 *   VARIOS_REPORTES  tres propios en estados distintos (abierto, dependencia en
 *                    atención hacia Negocios, cerrado) más uno de otro autor.
 *                    B2B: 2 activos (HIGH, MEDIUM) y 1 MEDIUM entrante → ALERTA,
 *                    10 − 3 − 1 = 6. Negocios: 1 MEDIUM propio y 1 entrante →
 *                    ALERTA, 10 − 1 − 1 = 8.
 */
const SCENARIOS: Readonly<
  Record<
    PilotScenario,
    { situations: typeof ALL; rows: Readonly<Record<string, Partial<OverviewRow>>> }
  >
> = {
  CRITICO: { situations: ALL, rows: COHERENT_ROWS },
  CRITICO_SIN_VIDAS: {
    situations: [...HIGH_OWN, CLOSED_OWN],
    rows: {
      'coord-b2b': { status: 'CRITICO', activeProblemsCount: 5, criticalCount: 0, affectedCoordinationCount: 0, lifePoints: 0 },
      'coord-negocios': { status: 'ESTABLE', activeProblemsCount: 0, criticalCount: 0, affectedCoordinationCount: 0, lifePoints: 10 },
    },
  },
  ALERTA: {
    situations: [IN_PROGRESS_OWN, CLOSED_OWN],
    rows: {
      'coord-b2b': { status: 'ALERTA', activeProblemsCount: 1, criticalCount: 0, affectedCoordinationCount: 0, lifePoints: 9 },
      'coord-negocios': { status: 'ALERTA', activeProblemsCount: 0, criticalCount: 0, affectedCoordinationCount: 0, lifePoints: 9 },
    },
  },
  ESTABLE: {
    situations: [CLOSED_OWN],
    rows: {
      'coord-b2b': { status: 'ESTABLE', activeProblemsCount: 0, criticalCount: 0, affectedCoordinationCount: 0, lifePoints: 10 },
      'coord-negocios': { status: 'ESTABLE', activeProblemsCount: 0, criticalCount: 0, affectedCoordinationCount: 0, lifePoints: 10 },
    },
  },
  DESCONOCIDO: {
    situations: ALL,
    rows: {
      ...COHERENT_ROWS,
      'coord-b2b': { ...COHERENT_ROWS['coord-b2b'], status: 'DESCONOCIDO', lifePoints: null },
    },
  },
  SIN_REPORTES: {
    situations: [IN_PROGRESS_OWN, AFFECTING],
    rows: {
      'coord-b2b': { status: 'CRITICO', activeProblemsCount: 1, criticalCount: 0, affectedCoordinationCount: 0, lifePoints: 7 },
      'coord-negocios': { status: 'CRITICO', activeProblemsCount: 1, criticalCount: 1, affectedCoordinationCount: 0, lifePoints: 7 },
    },
  },
  UN_REPORTE: {
    situations: [OPEN_OWN],
    rows: {
      'coord-b2b': { status: 'ALERTA', activeProblemsCount: 1, criticalCount: 0, affectedCoordinationCount: 0, lifePoints: 8 },
      'coord-negocios': { status: 'ESTABLE', activeProblemsCount: 0, criticalCount: 0, affectedCoordinationCount: 0, lifePoints: 10 },
    },
  },
  VARIOS_REPORTES: {
    situations: [OPEN_OWN, IN_PROGRESS_OWN, MY_DEPENDENCY, CLOSED_OWN],
    rows: {
      'coord-b2b': { status: 'ALERTA', activeProblemsCount: 2, criticalCount: 0, affectedCoordinationCount: 0, lifePoints: 6 },
      'coord-negocios': { status: 'ALERTA', activeProblemsCount: 1, criticalCount: 0, affectedCoordinationCount: 0, lifePoints: 8 },
    },
  },
}

export function overviewFor(scenario: PilotScenario) {
  return {
    ...BASE_OVERVIEW,
    coordinations: BASE_OVERVIEW.coordinations.map((row) => ({
      ...row,
      ...SCENARIOS[scenario].rows[row.code],
    })),
  }
}

export async function install(
  page: Page,
  { scenario = 'CRITICO' }: { scenario?: PilotScenario } = {},
): Promise<string[]> {
  const writes: string[] = []
  const overview = overviewFor(scenario)
  const situations = SCENARIOS[scenario].situations

  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
  await page.addInitScript(
    ({ token, sessionPayload }) => {
      localStorage.setItem('novex.auth.accessToken.v1', token)
      localStorage.setItem('novex.auth.session.v1', JSON.stringify(sessionPayload))
    },
    { token: accessToken(), sessionPayload: session },
  )

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    const method = request.method()

    // El piloto no escribe nunca: cualquier escritura se registra y se rechaza.
    if (method !== 'GET') {
      writes.push(`${method} ${path}`)
      await route.fulfill({ status: 403, json: { message: 'E2E: escritura no permitida' } })
      return
    }

    if (path.endsWith('/auth/me')) {
      await route.fulfill({ json: { user: { ...session, fullName: session.name } } })
      return
    }

    if (path.endsWith('/operational-overview')) {
      await route.fulfill({ json: overview })
      return
    }

    if (path.endsWith('/situations/categories')) {
      await route.fulfill({
        json: [
          { id: 'cat-acas', code: 'ACAS', name: 'ACAS', description: null, isSelectable: true, icon: 'acas' },
        ],
      })
      return
    }

    const detail = path.match(/\/situations\/([^/]+)$/)
    if (detail) {
      const found = situations.find((item) => item.id === detail[1])
      await route.fulfill(found ? { json: found } : { status: 404, json: { message: 'E2E' } })
      return
    }

    const subresource = path.match(/\/situations\/([^/]+)\/(evidences|timeline)$/)
    if (subresource) {
      await route.fulfill({
        json: { situationId: subresource[1], items: [], total: 0 },
      })
      return
    }

    if (path.endsWith('/situations')) {
      const status = url.searchParams.get('status')
      const coordinationId = url.searchParams.get('coordinationId')
      let items = url.searchParams.get('mine') === 'true'
        ? situations.filter((item) => item.createdByUserId === session.id)
        : situations
      if (coordinationId) {
        items = items.filter(
          (item) =>
            item.coordinationId === coordinationId ||
            item.affectedCoordinationId === coordinationId,
        )
      }
      if (status) items = items.filter((item) => item.status === status)
      await route.fulfill({
        json: { items, total: items.length, page: 1, limit: 100, scope: 'complete' },
      })
      return
    }

    await route.fulfill({ status: 404, json: { message: 'E2E' } })
  })

  return writes
}
