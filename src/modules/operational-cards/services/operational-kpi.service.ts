import { apiRequest } from '@/shared/api/http'
import { parseOperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'
import type {
  OperationalKpiAnalystRegistry,
  OperationalKpiBreakdownQuery,
  OperationalKpiBreakdownResponse,
  OperationalKpiRelationsQuery,
  OperationalKpiRelationsResponse,
  OperationalKpiCoordinationIdentity,
  OperationalKpiCoordinationSnapshot,
  OperationalKpiCoordinationStatusTotals,
  OperationalKpiDependencies,
  OperationalKpiDirectionResponse,
  OperationalKpiDirectionSnapshot,
  OperationalKpiHistoryPoint,
  OperationalKpiHistoryQuery,
  OperationalKpiHistoryResponse,
  OperationalKpiMetricVersions,
  OperationalKpiPeriodQuery,
  OperationalKpiPeriodResponse,
  OperationalKpiStateQuery,
  OperationalKpiStateResponse,
  OperationalKpiProblemCounts,
  OperationalKpiSeverityCounts,
  OperationalKpiStatusCounts,
  OperationalKpiUniverse,
  OperationalKpiCoordinationResponse,
} from '@/modules/operational-cards/types/operational-kpi.types'

const DIRECTION_PATH = '/operational-kpis?scope=direction'

export const KPI_MAX_LIFE_POINTS = 10

export class OperationalKpiContractError extends Error {
  constructor(detail: string) {
    super(`Respuesta KPI operacional no utilizable: ${detail}`)
    this.name = 'OperationalKpiContractError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readText(
  source: Record<string, unknown>,
  field: string,
  path: string,
): string {
  const value = source[field]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new OperationalKpiContractError(
      `${path}.${field} debe ser un texto no vacío`,
    )
  }
  return value
}

function readCount(
  source: Record<string, unknown>,
  field: string,
  path: string,
): number {
  const value = source[field]
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new OperationalKpiContractError(
      `${path}.${field} debe ser un entero no negativo`,
    )
  }
  return value
}

function readSection(
  source: Record<string, unknown>,
  field: string,
  path: string,
): Record<string, unknown> {
  const value = source[field]
  if (!isRecord(value)) {
    throw new OperationalKpiContractError(`${path}.${field} ausente o no es objeto`)
  }
  return value
}

function parseLifePoints(value: unknown): number | null {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > KPI_MAX_LIFE_POINTS
  ) {
    return null
  }
  return value
}

function parseStatusCounts(
  source: Record<string, unknown>,
  path: string,
): OperationalKpiStatusCounts {
  const status = readSection(source, 'status', path)
  return {
    open: readCount(status, 'open', `${path}.status`),
    inProgress: readCount(status, 'inProgress', `${path}.status`),
  }
}

function parseSeverity(
  source: Record<string, unknown>,
  path: string,
): OperationalKpiSeverityCounts {
  const severity = readSection(source, 'severity', path)
  return {
    critical: readCount(severity, 'critical', `${path}.severity`),
    high: readCount(severity, 'high', `${path}.severity`),
    medium: readCount(severity, 'medium', `${path}.severity`),
    low: readCount(severity, 'low', `${path}.severity`),
  }
}

function parseProblems(
  source: Record<string, unknown>,
  path: string,
): OperationalKpiProblemCounts {
  const problems = readSection(source, 'problems', path)
  return {
    activeCount: readCount(problems, 'activeCount', `${path}.problems`),
    status: parseStatusCounts(problems, `${path}.problems`),
    severity: parseSeverity(problems, `${path}.problems`),
  }
}

function parseDependencies(
  source: Record<string, unknown>,
  path: string,
): OperationalKpiDependencies {
  const dependencies = readSection(source, 'dependencies', path)
  return {
    incoming: readCount(dependencies, 'incoming', `${path}.dependencies`),
    outgoing: readCount(dependencies, 'outgoing', `${path}.dependencies`),
  }
}

function parseIdentity(
  source: Record<string, unknown>,
  path: string,
): OperationalKpiCoordinationIdentity {
  const coordination = readSection(source, 'coordination', path)
  return {
    id: readText(coordination, 'id', `${path}.coordination`),
    code: readText(coordination, 'code', `${path}.coordination`),
    name: readText(coordination, 'name', `${path}.coordination`),
    shortName: readText(coordination, 'shortName', `${path}.coordination`),
  }
}

function parseCoordinationSnapshot(
  value: unknown,
  path: string,
): OperationalKpiCoordinationSnapshot {
  if (!isRecord(value)) {
    throw new OperationalKpiContractError(`${path} no es objeto`)
  }
  return {
    coordination: parseIdentity(value, path),
    problems: parseProblems(value, path),
    dependencies: parseDependencies(value, path),
    integrityStatus: parseOperationalIntegrityStatus(value.integrityStatus),
    lifePoints: parseLifePoints(value.lifePoints),
  }
}

function parseStatusTotals(
  source: Record<string, unknown>,
  path: string,
): OperationalKpiCoordinationStatusTotals {
  const totals = readSection(source, 'coordinationStatusTotals', path)
  return {
    critical: readCount(totals, 'critical', `${path}.coordinationStatusTotals`),
    alert: readCount(totals, 'alert', `${path}.coordinationStatusTotals`),
    stable: readCount(totals, 'stable', `${path}.coordinationStatusTotals`),
    unknown: readCount(totals, 'unknown', `${path}.coordinationStatusTotals`),
  }
}

function parseAnalystRegistry(
  source: Record<string, unknown>,
  path: string,
): OperationalKpiAnalystRegistry {
  const registry = readSection(source, 'analystRegistry', path)
  return {
    integrityStatus: parseOperationalIntegrityStatus(registry.integrityStatus),
    problems: parseProblems(registry, `${path}.analystRegistry`),
  }
}

function parseUniverse(source: Record<string, unknown>): OperationalKpiUniverse {
  const universe = readSection(source, 'universe', 'root')
  const type = readText(universe, 'type', 'universe')
  if (type !== 'active-catalog') {
    throw new OperationalKpiContractError('universe.type no reconocido')
  }
  return {
    type,
    coordinationCount: readCount(universe, 'coordinationCount', 'universe'),
  }
}

function parseMetricVersions(
  source: Record<string, unknown>,
): OperationalKpiMetricVersions {
  const versions = readSection(source, 'metricVersions', 'root')
  return {
    integrity: readText(versions, 'integrity', 'metricVersions'),
    lifePoints: readText(versions, 'lifePoints', 'metricVersions'),
  }
}

function parseDirectionSnapshot(
  source: Record<string, unknown>,
): OperationalKpiDirectionSnapshot {
  const direction = readSection(source, 'direction', 'root')
  const rows = direction.coordinations
  if (!Array.isArray(rows)) {
    throw new OperationalKpiContractError(
      'direction.coordinations debe ser un arreglo',
    )
  }
  return {
    directionStatus: parseOperationalIntegrityStatus(direction.directionStatus),
    problems: parseProblems(direction, 'direction'),
    dependencies: parseDependencies(direction, 'direction'),
    coordinationStatusTotals: parseStatusTotals(direction, 'direction'),
    analystRegistry: parseAnalystRegistry(direction, 'direction'),
    coordinations: rows.map((row, index) =>
      parseCoordinationSnapshot(row, `direction.coordinations[${index}]`),
    ),
  }
}

export function parseOperationalKpiDirectionResponse(
  payload: unknown,
): OperationalKpiDirectionResponse {
  if (!isRecord(payload)) {
    throw new OperationalKpiContractError('la raíz no es un objeto')
  }
  const scope = readSection(payload, 'scope', 'root')
  const scopeType = readText(scope, 'type', 'scope')
  if (scopeType !== 'direction') {
    throw new OperationalKpiContractError('scope.type debe ser direction')
  }
  const generatedAt = payload.generatedAt
  if (typeof generatedAt !== 'string' || Number.isNaN(Date.parse(generatedAt))) {
    throw new OperationalKpiContractError('generatedAt inválido')
  }
  return {
    scope: { type: 'direction' },
    generatedAt,
    universe: parseUniverse(payload),
    metricVersions: parseMetricVersions(payload),
    direction: parseDirectionSnapshot(payload),
  }
}

export async function fetchOperationalKpiDirection(): Promise<OperationalKpiDirectionResponse> {
  const payload = await apiRequest<unknown>(DIRECTION_PATH)
  return parseOperationalKpiDirectionResponse(payload)
}

function parseIsoTimestamp(payload: Record<string, unknown>): string {
  const generatedAt = payload.generatedAt
  if (typeof generatedAt !== 'string' || Number.isNaN(Date.parse(generatedAt))) {
    throw new OperationalKpiContractError('generatedAt inválido')
  }
  return generatedAt
}

export function parseOperationalKpiCoordinationResponse(
  payload: unknown,
): OperationalKpiCoordinationResponse {
  if (!isRecord(payload)) {
    throw new OperationalKpiContractError('la raíz no es un objeto')
  }
  const scope = readSection(payload, 'scope', 'root')
  const scopeType = readText(scope, 'type', 'scope')
  if (scopeType !== 'coordination') {
    throw new OperationalKpiContractError('scope.type debe ser coordination')
  }
  const coordinationId = readText(scope, 'coordinationId', 'scope')
  return {
    scope: { type: 'coordination', coordinationId },
    generatedAt: parseIsoTimestamp(payload),
    universe: parseUniverse(payload),
    metricVersions: parseMetricVersions(payload),
    coordination: parseCoordinationSnapshot(
      payload.coordination,
      'coordination',
    ),
  }
}

export async function fetchOperationalKpiCoordination(
  coordinationId: string,
): Promise<OperationalKpiCoordinationResponse> {
  const payload = await apiRequest<unknown>(
    `/operational-kpis?scope=coordination&coordinationId=${encodeURIComponent(coordinationId)}`,
  )
  return parseOperationalKpiCoordinationResponse(payload)
}

function parseHistoryPoint(
  value: unknown,
  path: string,
): OperationalKpiHistoryResponse['series'][number] {
  if (!isRecord(value)) {
    throw new OperationalKpiContractError(`${path} no es un objeto`)
  }
  return {
    start: readText(value, 'start', path),
    end: readText(value, 'end', path),
    label: readText(value, 'label', path),
    value: readCount(value, 'value', path),
  }
}

export function parseOperationalKpiHistoryResponse(
  payload: unknown,
): OperationalKpiHistoryResponse {
  if (!isRecord(payload)) {
    throw new OperationalKpiContractError('la raíz no es un objeto')
  }
  const scope = readSection(payload, 'scope', 'root')
  if (readText(scope, 'type', 'scope') !== 'coordination') {
    throw new OperationalKpiContractError('scope.type debe ser coordination')
  }
  const metric = readText(payload, 'metric', 'root')
  if (metric !== 'backlog' && metric !== 'created' && metric !== 'closed') {
    throw new OperationalKpiContractError('metric inválida')
  }
  const granularity = readText(payload, 'granularity', 'root')
  if (
    granularity !== 'week' &&
    granularity !== 'month' &&
    granularity !== 'cycle'
  ) {
    throw new OperationalKpiContractError('granularity inválida')
  }
  const range = readSection(payload, 'range', 'root')
  const timezone = readText(payload, 'timezone', 'root')
  if (timezone !== 'America/Bogota') {
    throw new OperationalKpiContractError('timezone debe ser America/Bogota')
  }
  const seriesRaw = payload.series
  if (!Array.isArray(seriesRaw)) {
    throw new OperationalKpiContractError('series debe ser un arreglo')
  }
  return {
    scope: {
      type: 'coordination',
      coordinationId: readText(scope, 'coordinationId', 'scope'),
    },
    metric,
    granularity,
    range: {
      from: readText(range, 'from', 'range'),
      to: readText(range, 'to', 'range'),
    },
    timezone: 'America/Bogota',
    series: seriesRaw.map((point, index) =>
      parseHistoryPoint(point, `series[${index}]`),
    ),
  }
}

export async function fetchOperationalKpiHistory(
  query: OperationalKpiHistoryQuery,
  init?: RequestInit,
): Promise<OperationalKpiHistoryResponse> {
  const params = new URLSearchParams({
    scope: 'coordination',
    coordinationId: query.coordinationId,
    metric: query.metric,
    granularity: query.granularity,
    from: query.from,
    to: query.to,
  })
  if (query.categoryId) {
    params.set('categoryId', query.categoryId)
  }
  if (query.partnerCoordinationId && query.dependencySide) {
    params.set('partnerCoordinationId', query.partnerCoordinationId)
    params.set('dependencySide', query.dependencySide)
  }
  const payload = await apiRequest<unknown>(
    `/operational-kpis/history?${params.toString()}`,
    init,
  )
  return parseOperationalKpiHistoryResponse(payload)
}

export function parseOperationalKpiBreakdownResponse(
  payload: unknown,
): OperationalKpiBreakdownResponse {
  if (!isRecord(payload)) {
    throw new OperationalKpiContractError('la raíz no es un objeto')
  }
  const scope = readSection(payload, 'scope', 'root')
  if (readText(scope, 'type', 'scope') !== 'coordination') {
    throw new OperationalKpiContractError('scope.type debe ser coordination')
  }
  if (readText(payload, 'dimension', 'root') !== 'category') {
    throw new OperationalKpiContractError('dimension debe ser category')
  }
  const metric = readText(payload, 'metric', 'root')
  if (metric !== 'backlog' && metric !== 'created' && metric !== 'closed') {
    throw new OperationalKpiContractError('metric inválida')
  }
  const range = readSection(payload, 'range', 'root')
  const timezone = readText(payload, 'timezone', 'root')
  if (timezone !== 'America/Bogota') {
    throw new OperationalKpiContractError('timezone debe ser America/Bogota')
  }
  const itemsRaw = payload.items
  if (!Array.isArray(itemsRaw)) {
    throw new OperationalKpiContractError('items debe ser un arreglo')
  }
  return {
    scope: {
      type: 'coordination',
      coordinationId: readText(scope, 'coordinationId', 'scope'),
    },
    dimension: 'category',
    metric,
    range: {
      from: readText(range, 'from', 'range'),
      to: readText(range, 'to', 'range'),
    },
    timezone: 'America/Bogota',
    items: itemsRaw.map((item, index) => {
      if (!isRecord(item)) {
        throw new OperationalKpiContractError(`items[${index}] no es objeto`)
      }
      const category = readSection(item, 'category', `items[${index}]`)
      const selectable = category.selectable
      if (typeof selectable !== 'boolean') {
        throw new OperationalKpiContractError(
          `items[${index}].category.selectable debe ser boolean`,
        )
      }
      return {
        category: {
          id: readText(category, 'id', `items[${index}].category`),
          code: readText(category, 'code', `items[${index}].category`),
          name: readText(category, 'name', `items[${index}].category`),
          selectable,
        },
        value: readCount(item, 'value', `items[${index}]`),
      }
    }),
  }
}

export async function fetchOperationalKpiBreakdown(
  query: OperationalKpiBreakdownQuery,
  init?: RequestInit,
): Promise<OperationalKpiBreakdownResponse> {
  const params = new URLSearchParams({
    scope: 'coordination',
    coordinationId: query.coordinationId,
    dimension: 'category',
    metric: query.metric,
    from: query.from,
    to: query.to,
  })
  const payload = await apiRequest<unknown>(
    `/operational-kpis/breakdown?${params.toString()}`,
    init,
  )
  return parseOperationalKpiBreakdownResponse(payload)
}

function parseRelationItem(
  value: unknown,
  path: string,
): OperationalKpiRelationsResponse['commitments'][number] {
  if (!isRecord(value)) {
    throw new OperationalKpiContractError(`${path} no es un objeto`)
  }
  const coordination = readSection(value, 'coordination', path)
  return {
    coordination: {
      id: readText(coordination, 'id', `${path}.coordination`),
      code: readText(coordination, 'code', `${path}.coordination`),
      name: readText(coordination, 'name', `${path}.coordination`),
      shortName: readText(coordination, 'shortName', `${path}.coordination`),
    },
    value: readCount(value, 'value', path),
  }
}

export function parseOperationalKpiRelationsResponse(
  payload: unknown,
): OperationalKpiRelationsResponse {
  if (!isRecord(payload)) {
    throw new OperationalKpiContractError('la raíz no es un objeto')
  }
  const scope = readSection(payload, 'scope', 'root')
  if (readText(scope, 'type', 'scope') !== 'coordination') {
    throw new OperationalKpiContractError('scope.type debe ser coordination')
  }
  const metric = readText(payload, 'metric', 'root')
  if (metric !== 'backlog' && metric !== 'created' && metric !== 'closed') {
    throw new OperationalKpiContractError('metric inválida')
  }
  const range = readSection(payload, 'range', 'root')
  if (readText(payload, 'timezone', 'root') !== 'America/Bogota') {
    throw new OperationalKpiContractError('timezone debe ser America/Bogota')
  }
  const commitmentsRaw = payload.commitments
  const dependenciesRaw = payload.dependencies
  if (!Array.isArray(commitmentsRaw) || !Array.isArray(dependenciesRaw)) {
    throw new OperationalKpiContractError(
      'commitments y dependencies deben ser arreglos',
    )
  }
  return {
    scope: {
      type: 'coordination',
      coordinationId: readText(scope, 'coordinationId', 'scope'),
    },
    metric,
    range: {
      from: readText(range, 'from', 'range'),
      to: readText(range, 'to', 'range'),
    },
    timezone: 'America/Bogota',
    commitments: commitmentsRaw.map((item, index) =>
      parseRelationItem(item, `commitments[${index}]`),
    ),
    dependencies: dependenciesRaw.map((item, index) =>
      parseRelationItem(item, `dependencies[${index}]`),
    ),
  }
}

export async function fetchOperationalKpiRelations(
  query: OperationalKpiRelationsQuery,
  init?: RequestInit,
): Promise<OperationalKpiRelationsResponse> {
  const params = new URLSearchParams({
    scope: 'coordination',
    coordinationId: query.coordinationId,
    metric: query.metric,
    from: query.from,
    to: query.to,
  })
  const payload = await apiRequest<unknown>(
    `/operational-kpis/relations?${params.toString()}`,
    init,
  )
  return parseOperationalKpiRelationsResponse(payload)
}

export function parseOperationalKpiPeriodResponse(
  payload: unknown,
): OperationalKpiPeriodResponse {
  if (!isRecord(payload)) {
    throw new OperationalKpiContractError('la raíz no es un objeto')
  }
  const scope = readSection(payload, 'scope', 'root')
  if (readText(scope, 'type', 'scope') !== 'coordination') {
    throw new OperationalKpiContractError('scope.type debe ser coordination')
  }
  const granularity = readText(payload, 'granularity', 'root')
  const period = readSection(payload, 'period', 'root')
  if (readText(payload, 'timezone', 'root') !== 'America/Bogota') {
    throw new OperationalKpiContractError('timezone debe ser America/Bogota')
  }
  if (
    readText(payload, 'severitySemantics', 'root') !==
    'current-severity-of-period-registrations'
  ) {
    throw new OperationalKpiContractError(
      'severitySemantics debe ser current-severity-of-period-registrations',
    )
  }
  const incomplete = period.incomplete
  if (typeof incomplete !== 'boolean') {
    throw new OperationalKpiContractError(
      'period.incomplete debe ser boolean',
    )
  }
  const severity = readSection(payload, 'severity', 'root')
  const attention = readSection(payload, 'attention', 'root')
  const relations = readSection(payload, 'relations', 'root')
  return {
    scope: {
      type: 'coordination',
      coordinationId: readText(scope, 'coordinationId', 'scope'),
    },
    granularity,
    period: {
      from: readText(period, 'from', 'period'),
      to: readText(period, 'to', 'period'),
      calendarEnd: readText(period, 'calendarEnd', 'period'),
      label: readText(period, 'label', 'period'),
      incomplete,
    },
    timezone: 'America/Bogota',
    severity: {
      low: readCount(severity, 'low', 'severity'),
      medium: readCount(severity, 'medium', 'severity'),
      high: readCount(severity, 'high', 'severity'),
      critical: readCount(severity, 'critical', 'severity'),
    },
    attention: {
      open: readCount(attention, 'open', 'attention'),
      inProgress: readCount(attention, 'inProgress', 'attention'),
    },
    relations: {
      dependencies: readCount(relations, 'dependencies', 'relations'),
      commitments: readCount(relations, 'commitments', 'relations'),
    },
    registeredCount: readCount(payload, 'registeredCount', 'root'),
    severitySemantics: 'current-severity-of-period-registrations',
  }
}

export async function fetchOperationalKpiPeriod(
  query: OperationalKpiPeriodQuery,
  init?: RequestInit,
): Promise<OperationalKpiPeriodResponse> {
  const params = new URLSearchParams({
    scope: 'coordination',
    coordinationId: query.coordinationId,
    from: query.from,
    to: query.to,
  })
  const payload = await apiRequest<unknown>(
    `/operational-kpis/period?${params.toString()}`,
    init,
  )
  return parseOperationalKpiPeriodResponse(payload)
}

function parseHistorySeries(
  value: unknown,
  path: string,
): OperationalKpiHistoryPoint[] {
  if (!Array.isArray(value)) {
    throw new OperationalKpiContractError(`${path} debe ser un arreglo`)
  }
  return value.map((point, index) =>
    parseHistoryPoint(point, `${path}[${index}]`),
  )
}

export function parseOperationalKpiStateResponse(
  payload: unknown,
): OperationalKpiStateResponse {
  if (!isRecord(payload)) {
    throw new OperationalKpiContractError('la raíz no es un objeto')
  }
  const scope = readSection(payload, 'scope', 'root')
  if (readText(scope, 'type', 'scope') !== 'coordination') {
    throw new OperationalKpiContractError('scope.type debe ser coordination')
  }
  if (readText(payload, 'timezone', 'root') !== 'America/Bogota') {
    throw new OperationalKpiContractError('timezone debe ser America/Bogota')
  }
  if (
    readText(payload, 'severitySemantics', 'root') !==
    'current-severity-of-period-registrations'
  ) {
    throw new OperationalKpiContractError('severitySemantics inválida')
  }
  const period = readSection(payload, 'period', 'root')
  const kind = readText(period, 'kind', 'period')
  if (kind !== 'week' && kind !== 'month' && kind !== 'cycle') {
    throw new OperationalKpiContractError('period.kind inválido')
  }
  const isCurrent = period.isCurrent
  const isPartial = period.isPartial
  if (typeof isCurrent !== 'boolean' || typeof isPartial !== 'boolean') {
    throw new OperationalKpiContractError(
      'period.isCurrent/isPartial deben ser boolean',
    )
  }
  const severity = readSection(payload, 'severity', 'root')
  const attention = readSection(payload, 'attention', 'root')
  const relations = readSection(payload, 'relations', 'root')
  const evolution = readSection(payload, 'evolution', 'root')
  const bucket = readText(evolution, 'bucket', 'evolution')
  if (bucket !== 'day' && bucket !== 'week' && bucket !== 'month') {
    throw new OperationalKpiContractError('evolution.bucket inválido')
  }
  return {
    scope: {
      type: 'coordination',
      coordinationId: readText(scope, 'coordinationId', 'scope'),
    },
    timezone: 'America/Bogota',
    period: {
      kind,
      from: readText(period, 'from', 'period'),
      to: readText(period, 'to', 'period'),
      calendarEnd: readText(period, 'calendarEnd', 'period'),
      label: readText(period, 'label', 'period'),
      isCurrent,
      isPartial,
      dataTo: readText(period, 'dataTo', 'period'),
    },
    severity: {
      low: readCount(severity, 'low', 'severity'),
      medium: readCount(severity, 'medium', 'severity'),
      high: readCount(severity, 'high', 'severity'),
      critical: readCount(severity, 'critical', 'severity'),
    },
    attention: {
      open: readCount(attention, 'open', 'attention'),
      inProgress: readCount(attention, 'inProgress', 'attention'),
    },
    relations: {
      dependencies: readCount(relations, 'dependencies', 'relations'),
      commitments: readCount(relations, 'commitments', 'relations'),
    },
    registeredCount: readCount(payload, 'registeredCount', 'root'),
    severitySemantics: 'current-severity-of-period-registrations',
    evolution: {
      bucket,
      backlog: parseHistorySeries(evolution.backlog, 'evolution.backlog'),
      created: parseHistorySeries(evolution.created, 'evolution.created'),
      closed: parseHistorySeries(evolution.closed, 'evolution.closed'),
    },
  }
}

export async function fetchOperationalKpiState(
  query: OperationalKpiStateQuery,
  init?: RequestInit,
): Promise<OperationalKpiStateResponse> {
  const params = new URLSearchParams({
    scope: 'coordination',
    coordinationId: query.coordinationId,
    from: query.from,
    to: query.to,
    kind: query.kind,
  })
  if (query.calendarEnd) {
    params.set('calendarEnd', query.calendarEnd)
  }
  const payload = await apiRequest<unknown>(
    `/operational-kpis/state?${params.toString()}`,
    init,
  )
  return parseOperationalKpiStateResponse(payload)
}
