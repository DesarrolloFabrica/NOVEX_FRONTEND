import type { Page } from 'playwright/test'
import { flowStateResponse } from './flujo-state.fixture'
import { operationalOverviewFixture } from './operational-overview.fixture'

/**
 * Mocks del Centro Operacional para la batería responsive.
 *
 * Reutiliza el overview de 15 coordinaciones y el `/state` del flujo de ESTADO
 * (los mismos que `estado-hierarchy-qa` y `operational-coordinator-shell`), y
 * añade un conjunto pequeño de problemas con identificadores ÚNICOS.
 *
 * El mock de `/situations` respeta los filtros que envía el cliente
 * (`status`, `mine`, `coordinationId`). La lista de una coordinación se pide
 * con una llamada por estado activo (OPEN e IN_PROGRESS): un mock que ignore
 * `status` devuelve todo dos veces y la lista aparece con filas duplicadas,
 * que es justo lo que no debe servir de referencia visual.
 */

export type ResponsiveRole = 'ADMIN' | 'DIRECTOR' | 'ANALISTA' | 'COORDINADOR'

export const SESSION_KEY = 'novex.auth.session.v1'
export const TOKEN_KEY = 'novex.auth.accessToken.v1'

export const OVERVIEW = operationalOverviewFixture({ severe: true })

export const ESPE = 'coord-especializaciones'
export const B2B = 'coord-b2b'
const NEGOCIOS = 'coord-negocios'

function row(code: string) {
  const found = OVERVIEW.coordinations.find((c) => c.code === code)
  if (!found) throw new Error(`Coordinación inexistente en el fixture: ${code}`)
  return found
}

const PERMISSIONS: Record<ResponsiveRole, string[]> = {
  ADMIN: [
    'AUTH_VIEW_PROFILE',
    'COORDINATIONS_VIEW',
    'SITUATIONS_VIEW',
    'SITUATIONS_CREATE',
    'AI_VIEW_REPORTS',
    'REPORTS_VIEW',
    'REPORTS_EXPORT',
    'USERS_VIEW',
    'SYSTEM_CONFIGURATION',
    'KPIS_VIEW',
  ],
  DIRECTOR: [
    'AUTH_VIEW_PROFILE',
    'COORDINATIONS_VIEW',
    'SITUATIONS_VIEW',
    'AI_VIEW_REPORTS',
    'REPORTS_VIEW',
    'REPORTS_EXPORT',
    'KPIS_VIEW',
  ],
  ANALISTA: [
    'AUTH_VIEW_PROFILE',
    'COORDINATIONS_VIEW',
    'SITUATIONS_VIEW',
    'SITUATIONS_CREATE',
    'SITUATIONS_UPDATE',
    'AI_ANALYZE',
    'AI_VIEW_REPORTS',
    'REPORTS_VIEW',
  ],
  COORDINADOR: [
    'SITUATIONS_VIEW',
    'COORDINATIONS_VIEW',
    'SITUATIONS_CREATE',
    'SITUATIONS_CLOSE',
    'AI_VIEW_REPORTS',
    'REPORTS_VIEW',
  ],
}

const ROLE_NAMES: Record<ResponsiveRole, string> = {
  ADMIN: 'Administrador',
  DIRECTOR: 'Director',
  ANALISTA: 'Analista',
  COORDINADOR: 'Coordinador',
}

function base64Url(value: string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function sessionFor(role: ResponsiveRole) {
  const coordinationId = role === 'COORDINADOR' ? row(B2B).id : null
  return {
    id: `e2e-${role.toLowerCase()}`,
    name: `${ROLE_NAMES[role]} E2E`,
    role: role === 'COORDINADOR' ? 'ejecutor' : 'supervisor',
    roleCode: role,
    roleName: ROLE_NAMES[role],
    permissions: PERMISSIONS[role],
    coordinationId,
    selectedAreaId: role === 'COORDINADOR' ? B2B : undefined,
    onboardingStep: 100,
    onboardingCompleted: true,
  }
}

function accessToken(role: ResponsiveRole): string {
  const session = sessionFor(role)
  return `${base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64Url(
    JSON.stringify({
      sub: session.id,
      email: `${role.toLowerCase()}@novex.test`,
      roleId: `role-${role.toLowerCase()}`,
      roleCode: role,
      coordinationId: session.coordinationId,
      permissions: session.permissions,
      status: 'ACTIVE',
    }),
  )}.e2e`
}

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
type Status = 'OPEN' | 'IN_PROGRESS'

interface ProblemSeed {
  id: string
  title: string
  responsible: string
  affected: string
  kind: 'INTERNAL' | 'INTER_COORDINATION'
  severity: Severity
  status: Status
  day: number
  /** `true` si lo reportó el usuario de la sesión: entra en «Mis reportes». */
  mine?: boolean
}

/*
 * Títulos de longitud variada a propósito: los largos son los que revelan el
 * truncado de la lista en columnas estrechas.
 */
const SEEDS: readonly ProblemSeed[] = [
  { id: 'sit-espe-1', title: 'Retraso en la publicación de notas del corte 2 para estudiantes de último semestre', responsible: ESPE, affected: ESPE, kind: 'INTERNAL', severity: 'CRITICAL', status: 'OPEN', day: 1, mine: true },
  { id: 'sit-espe-2', title: 'Falla en la plataforma de matrícula', responsible: ESPE, affected: ESPE, kind: 'INTERNAL', severity: 'HIGH', status: 'IN_PROGRESS', day: 2 },
  { id: 'sit-espe-3', title: 'Docentes sin asignación de carga académica en tres programas', responsible: ESPE, affected: ESPE, kind: 'INTERNAL', severity: 'HIGH', status: 'OPEN', day: 3 },
  { id: 'sit-espe-4', title: 'Demora en respuesta de PQRS', responsible: ESPE, affected: ESPE, kind: 'INTERNAL', severity: 'MEDIUM', status: 'OPEN', day: 4 },
  { id: 'sit-espe-5', title: 'Aulas virtuales sin contenido para el nuevo ciclo', responsible: ESPE, affected: ESPE, kind: 'INTERNAL', severity: 'MEDIUM', status: 'IN_PROGRESS', day: 5 },
  { id: 'sit-espe-6', title: 'Inconsistencia en reportes financieros enviados a cartera', responsible: NEGOCIOS, affected: ESPE, kind: 'INTER_COORDINATION', severity: 'LOW', status: 'IN_PROGRESS', day: 6, mine: true },
  { id: 'sit-b2b-1', title: 'Problema interno B2B', responsible: B2B, affected: B2B, kind: 'INTERNAL', severity: 'HIGH', status: 'OPEN', day: 7, mine: true },
  { id: 'sit-b2b-2', title: 'Debemos resolver para Negocios', responsible: B2B, affected: NEGOCIOS, kind: 'INTER_COORDINATION', severity: 'HIGH', status: 'OPEN', day: 8 },
  { id: 'sit-b2b-3', title: 'Negocios nos afecta con convenios pendientes de firma', responsible: NEGOCIOS, affected: B2B, kind: 'INTER_COORDINATION', severity: 'MEDIUM', status: 'IN_PROGRESS', day: 9 },
]

function situation(seed: ProblemSeed, role: ResponsiveRole) {
  const responsible = row(seed.responsible)
  const affected = row(seed.affected)
  const session = sessionFor(role)
  const iso = `2026-09-${String(seed.day).padStart(2, '0')}T10:00:00.000Z`
  return {
    id: seed.id,
    title: seed.title,
    description: 'Descripción del problema para la batería responsive.',
    reportKind: seed.kind,
    coordinationId: responsible.id,
    coordinationCode: responsible.code,
    coordinationName: responsible.name,
    affectedCoordinationId: affected.id,
    affectedCoordinationCode: affected.code,
    affectedCoordinationName: affected.name,
    affectedProcess: seed.kind === 'INTER_COORDINATION' ? 'Inscripciones' : null,
    pendingDelivery: seed.kind === 'INTER_COORDINATION' ? 'Cupos' : null,
    createdByUserId: seed.mine ? session.id : 'e2e-otro-usuario',
    createdByUserName: seed.mine ? session.name : 'Otro usuario',
    categoryId: 'cat-acas',
    categoryCode: 'ACAS',
    categoryName: 'ACAS',
    severity: seed.severity,
    status: seed.status,
    occurredAt: iso,
    createdAt: iso,
    updatedAt: iso,
    relatedCoordinations: [],
    resolution: null,
    canResolve: role === 'COORDINADOR' && seed.responsible === B2B,
    slaHealth: 'on_track',
    dueAt: null,
  }
}

function situationsFor(url: URL, role: ResponsiveRole) {
  const all = SEEDS.map((seed) => situation(seed, role))
  const status = url.searchParams.get('status')
  const coordinationId = url.searchParams.get('coordinationId')
  const mine = url.searchParams.get('mine') === 'true'
  const sessionId = sessionFor(role).id

  const items = all.filter(
    (item) =>
      (!status || item.status === status) &&
      (!mine || item.createdByUserId === sessionId) &&
      (!coordinationId ||
        item.coordinationId === coordinationId ||
        item.affectedCoordinationId === coordinationId),
  )
  return { items, total: items.length, page: 1, limit: 100, scope: 'complete' }
}

const METRIC_META = {
  generatedAt: '2026-10-05T16:00:00.000Z',
  universe: { type: 'active-catalog', coordinationCount: 15 },
  metricVersions: {
    integrity: 'integrity-mvp-v1',
    lifePoints: 'life-points-v1',
  },
}

function historySeries() {
  return [
    { start: '2026-09-07', end: '2026-09-13', label: '7–13 septiembre', value: 0 },
    { start: '2026-09-14', end: '2026-09-20', label: '14–20 septiembre', value: 5 },
    { start: '2026-09-21', end: '2026-09-27', label: '21–27 septiembre', value: 5 },
    { start: '2026-09-28', end: '2026-10-04', label: '28 sep–4 oct', value: 5 },
    { start: '2026-10-05', end: '2026-10-11', label: '5–11 octubre', value: 6 },
  ]
}

function stateResponse(url: URL) {
  const kind = (url.searchParams.get('kind') ?? 'week') as 'week' | 'month' | 'cycle'
  const from = url.searchParams.get('from') ?? '2026-09-29'
  const to = url.searchParams.get('to') ?? '2026-10-05'
  const calendarEnd = url.searchParams.get('calendarEnd') ?? to
  const coordinationId = url.searchParams.get('coordinationId') ?? row(ESPE).id
  const severity = { low: 1, medium: 2, high: 2, critical: 1 }
  const attention = { open: 3, inProgress: 3 }
  const flow = flowStateResponse({ coordinationId, kind, from, to, calendarEnd }, to)
  const point = (start: string, end: string, label: string, value: number) => ({
    start,
    end,
    label,
    value,
  })
  const evolution = [point(from, from, 'Inicio', 4), point(to, to, 'Fin', 6)]
  return {
    scope: { type: 'coordination', coordinationId },
    timezone: 'America/Bogota',
    period: {
      kind,
      from,
      to,
      calendarEnd,
      label: `${from} – ${calendarEnd}`,
      isCurrent: true,
      isPartial: true,
      dataTo: to,
    },
    severity,
    attention,
    relations: { dependencies: 1, commitments: 0 },
    registeredCount: 6,
    severitySemantics: 'current-severity-of-period-registrations',
    activeAtPeriodEnd: { count: 6, at: to, isNow: true },
    aging: flow.aging,
    resolution: flow.resolution,
    snapshot: flow.snapshot,
    evolution: {
      buckets: flow.evolution.buckets,
      bucket: 'day' as const,
      backlog: evolution,
      created: evolution.map((p) => ({ ...p, value: 1 })),
      closed: evolution.map((p) => ({ ...p, value: 0 })),
    },
  }
}

function kpiResponse(url: URL) {
  const coordinationId = url.searchParams.get('coordinationId')
  if (url.searchParams.get('scope') === 'coordination' && coordinationId) {
    const meta = OVERVIEW.coordinations.find((c) => c.id === coordinationId)
    return {
      scope: { type: 'coordination', coordinationId },
      ...METRIC_META,
      coordination: {
        coordination: meta
          ? { id: meta.id, code: meta.code, name: meta.name, shortName: meta.shortName }
          : null,
        integrityStatus: meta?.status ?? 'DESCONOCIDO',
        lifePoints: meta?.lifePoints ?? null,
        problems: {
          activeCount: 6,
          status: { open: 3, inProgress: 3 },
          severity: { critical: 1, high: 2, medium: 2, low: 1 },
        },
        dependencies: { incoming: 1, outgoing: 1 },
      },
    }
  }
  return {
    scope: { type: 'direction' },
    ...METRIC_META,
    direction: {
      directionStatus: 'ALERTA',
      problems: {
        activeCount: 9,
        status: { open: 5, inProgress: 4 },
        severity: { critical: 1, high: 4, medium: 3, low: 1 },
      },
      coordinationStatusTotals: { critical: 7, alert: 1, stable: 7, unknown: 0 },
      dependencies: { incoming: 3, outgoing: 3 },
      analystRegistry: {
        integrityStatus: 'ESTABLE',
        problems: {
          activeCount: 0,
          status: { open: 0, inProgress: 0 },
          severity: { critical: 0, high: 0, medium: 0, low: 0 },
        },
      },
      coordinations: [],
    },
  }
}

/** Sesión, token y API simulada del Centro Operacional para un rol. */
export async function installResponsiveCentro(page: Page, role: ResponsiveRole) {
  const session = sessionFor(role)

  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
  await page.addInitScript(
    ({ sessionKey, tokenKey, sessionValue, token }) => {
      localStorage.setItem(sessionKey, JSON.stringify(sessionValue))
      localStorage.setItem(tokenKey, token)
    },
    {
      sessionKey: SESSION_KEY,
      tokenKey: TOKEN_KEY,
      sessionValue: session,
      token: accessToken(role),
    },
  )

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    const method = route.request().method()

    if (path.endsWith('/auth/me')) {
      await route.fulfill({
        json: { user: { ...session, fullName: session.name, status: 'ACTIVE' } },
      })
      return
    }
    if (path.endsWith('/operational-overview')) {
      await route.fulfill({ json: OVERVIEW })
      return
    }
    if (path.includes('/operational-kpis/history')) {
      await route.fulfill({
        json: {
          scope: { type: 'coordination', coordinationId: url.searchParams.get('coordinationId') },
          metric: url.searchParams.get('metric') ?? 'backlog',
          granularity: url.searchParams.get('granularity') ?? 'week',
          range: { from: '2026-09-07', to: '2026-10-11' },
          timezone: 'America/Bogota',
          series: historySeries(),
        },
      })
      return
    }
    if (path.includes('/operational-kpis/state')) {
      await route.fulfill({ json: stateResponse(url) })
      return
    }
    if (path.includes('/operational-kpis')) {
      await route.fulfill({ json: kpiResponse(url) })
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
    if (method === 'GET' && path.endsWith('/situations')) {
      await route.fulfill({ json: situationsFor(url, role) })
      return
    }
    const detail = path.match(/\/situations\/([^/]+)$/)
    if (method === 'GET' && detail) {
      const seed = SEEDS.find((s) => s.id === detail[1])
      await route.fulfill(
        seed
          ? { json: situation(seed, role) }
          : { status: 404, json: { message: 'E2E' } },
      )
      return
    }
    if (method === 'GET' && /\/situations\/[^/]+\//.test(path)) {
      // Evidencias, recomendaciones, línea de tiempo, notas: vacías.
      await route.fulfill({ json: [] })
      return
    }
    if (method === 'GET' && /\/(coordinations|users|roles|permissions)$/.test(path)) {
      await route.fulfill({ json: [] })
      return
    }
    await route.fulfill({ status: 200, json: {} })
  })
}
