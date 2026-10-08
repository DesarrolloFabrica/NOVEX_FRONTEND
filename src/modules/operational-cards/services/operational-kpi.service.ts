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
  OperationalKpiFlowBucket,
  OperationalKpiHistoryPoint,
  OperationalKpiHistoryQuery,
  OperationalKpiHistoryResponse,
  OperationalKpiMetricVersions,
  OperationalKpiPeriodHistoryQuery,
  OperationalKpiPeriodHistoryResponse,
  OperationalKpiPeriodQuery,
  OperationalKpiPeriodResponse,
  OperationalKpiStateQuery,
  OperationalKpiAging,
  OperationalKpiResolution,
  OperationalKpiResolutionBandKey,
  OperationalKpiStateSnapshot,
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

export function parseOperationalKpiPeriodHistoryResponse(
  payload: unknown,
): OperationalKpiPeriodHistoryResponse {
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
  const period = readSection(payload, 'period', 'root')
  const kind = readText(period, 'kind', 'period')
  if (kind !== 'week' && kind !== 'month' && kind !== 'cycle') {
    throw new OperationalKpiContractError('period.kind inválido')
  }
  const bucket = readText(period, 'bucket', 'period')
  if (bucket !== 'day' && bucket !== 'week' && bucket !== 'month') {
    throw new OperationalKpiContractError('period.bucket inválido')
  }
  if (readText(payload, 'timezone', 'root') !== 'America/Bogota') {
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
    period: {
      kind,
      from: readText(period, 'from', 'period'),
      dataTo: readText(period, 'dataTo', 'period'),
      calendarEnd: readText(period, 'calendarEnd', 'period'),
      bucket,
    },
    timezone: 'America/Bogota',
    series: seriesRaw.map((point, index) =>
      parseHistoryPoint(point, `series[${index}]`),
    ),
  }
}

/** Evolución de una serie dentro del AnalysisPeriod (buckets automáticos). */
export async function fetchOperationalKpiPeriodHistory(
  query: OperationalKpiPeriodHistoryQuery,
  init?: RequestInit,
): Promise<OperationalKpiPeriodHistoryResponse> {
  const params = new URLSearchParams({
    scope: 'coordination',
    coordinationId: query.coordinationId,
    metric: query.metric,
    kind: query.kind,
    from: query.from,
    to: query.to,
    calendarEnd: query.calendarEnd,
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
  return parseOperationalKpiPeriodHistoryResponse(payload)
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

function readCountOrNull(
  source: Record<string, unknown>,
  field: string,
  path: string,
): number | null {
  return source[field] === null ? null : readCount(source, field, path)
}

function readFlag(
  source: Record<string, unknown>,
  field: string,
  path: string,
): boolean {
  const value = source[field]
  if (typeof value !== 'boolean') {
    throw new OperationalKpiContractError(`${path}.${field} debe ser booleano`)
  }
  return value
}

function parseActiveLoad(
  value: unknown,
  path: string,
): OperationalKpiFlowBucket['active'] {
  if (value === null) return null
  if (!isRecord(value)) {
    throw new OperationalKpiContractError(`${path} debe ser objeto o null`)
  }
  const internalRaw = value.internalBreakdown
  const externalRaw = value.externalBreakdown
  if (!Array.isArray(internalRaw) || !Array.isArray(externalRaw)) {
    throw new OperationalKpiContractError(`${path}: breakdowns deben ser arreglos`)
  }
  return {
    total: readCount(value, 'total', path),
    internal: readCount(value, 'internal', path),
    external: readCount(value, 'external', path),
    internalBreakdown: internalRaw.map((row, index) => {
      const rowPath = `${path}.internalBreakdown[${index}]`
      if (!isRecord(row)) throw new OperationalKpiContractError(`${rowPath} no es objeto`)
      return {
        categoryId: readText(row, 'categoryId', rowPath),
        categoryCode: readText(row, 'categoryCode', rowPath),
        categoryName: readText(row, 'categoryName', rowPath),
        selectable: readFlag(row, 'selectable', rowPath),
        count: readCount(row, 'count', rowPath),
      }
    }),
    externalBreakdown: externalRaw.map((row, index) => {
      const rowPath = `${path}.externalBreakdown[${index}]`
      if (!isRecord(row)) throw new OperationalKpiContractError(`${rowPath} no es objeto`)
      return {
        coordinationId: row.coordinationId === null ? null : readText(row, 'coordinationId', rowPath),
        coordinationCode:
          row.coordinationCode === null ? null : readText(row, 'coordinationCode', rowPath),
        coordinationName: readText(row, 'coordinationName', rowPath),
        count: readCount(row, 'count', rowPath),
      }
    }),
  }
}

function parseFlowBuckets(value: unknown): OperationalKpiFlowBucket[] {
  if (!Array.isArray(value)) {
    throw new OperationalKpiContractError('evolution.buckets debe ser un arreglo')
  }
  return value.map((raw, index) => {
    const path = `evolution.buckets[${index}]`
    if (!isRecord(raw)) {
      throw new OperationalKpiContractError(`${path} no es un objeto`)
    }
    const future = readFlag(raw, 'future', path)
    const dataEnd = raw.dataEnd === null ? null : readText(raw, 'dataEnd', path)
    return {
      start: readText(raw, 'start', path),
      end: readText(raw, 'end', path),
      dataEnd,
      calendarStart: readText(raw, 'calendarStart', path),
      calendarEnd: readText(raw, 'calendarEnd', path),
      label: readText(raw, 'label', path),
      current: readFlag(raw, 'current', path),
      future,
      created: readCountOrNull(raw, 'created', path),
      closed: readCountOrNull(raw, 'closed', path),
      backlog: readCountOrNull(raw, 'backlog', path),
      active: parseActiveLoad(raw.active, `${path}.active`),
      solved:
        raw.solved === null
          ? null
          : (() => {
              if (!isRecord(raw.solved)) {
                throw new OperationalKpiContractError(`${path}.solved debe ser objeto o null`)
              }
              return { total: readCount(raw.solved, 'total', `${path}.solved`) }
            })(),
    }
  })
}

function readOneOf<T extends string>(
  source: Record<string, unknown>,
  field: string,
  path: string,
  allowed: readonly T[],
): T {
  const value = source[field]
  const match = allowed.find((option) => option === value)
  if (match === undefined) {
    throw new OperationalKpiContractError(
      `${path}.${field} debe ser uno de: ${allowed.join(', ')}`,
    )
  }
  return match
}

function readTextOrNull(
  source: Record<string, unknown>,
  field: string,
  path: string,
): string | null {
  return source[field] === null ? null : readText(source, field, path)
}

function readIsoInstant(
  source: Record<string, unknown>,
  field: string,
  path: string,
): string {
  const value = readText(source, field, path)
  if (Number.isNaN(Date.parse(value))) {
    throw new OperationalKpiContractError(`${path}.${field} no es un instante ISO`)
  }
  return value
}

const AGING_BAND_KEYS = ['0-7', '8-14', '15-30', '31+'] as const
const AGING_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
const AGING_REPORT_KINDS = ['INTERNAL', 'INTER_COORDINATION'] as const
const AGING_STATUSES = ['OPEN', 'IN_PROGRESS'] as const
const AGING_RELIABILITY = ['current', 'unavailable'] as const

/**
 * ANTIGÜEDAD. Además de tipos, valida la coherencia semántica: en un corte
 * histórico el backend no puede afirmar status ni SLA.
 */
const RESOLUTION_BANDS: ReadonlyArray<{
  key: OperationalKpiResolutionBandKey
  fromHours: number
  toHours: number | null
}> = [
  { key: 'lt-1d', fromHours: 0, toHours: 24 },
  { key: '1-3d', fromHours: 24, toHours: 72 },
  { key: '3-7d', fromHours: 72, toHours: 168 },
  { key: '7-14d', fromHours: 168, toHours: 336 },
  { key: '14-30d', fromHours: 336, toHours: 720 },
  { key: '30d+', fromHours: 720, toHours: null },
]

function readDaysOrNull(
  source: Record<string, unknown>,
  field: string,
  path: string,
): number | null {
  const value = source[field]
  if (value === null) return null
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new OperationalKpiContractError(`${path}.${field} debe ser número ≥ 0 o null`)
  }
  return value
}

/** Sin cierres ⇔ sin mediana/P75 (nunca 0 «instantáneo»); P75 ≥ mediana. */
function assertResolutionStats(
  closedCount: number | null,
  medianDays: number | null,
  p75Days: number | null,
  path: string,
): void {
  const hasData = closedCount !== null && closedCount > 0
  if (hasData !== (medianDays !== null) || hasData !== (p75Days !== null)) {
    throw new OperationalKpiContractError(`${path}: mediana y P75 existen solo cuando hay cierres`)
  }
  if (medianDays !== null && p75Days !== null && p75Days < medianDays) {
    throw new OperationalKpiContractError(`${path}: P75 no puede ser menor que la mediana`)
  }
}

/**
 * RESOLUCIÓN (FLOW OUTCOME): mismos cierres que «Solucionados» de Movimiento.
 * Rechaza cualquier respuesta que no cuadre: el frontend nunca pinta una
 * mediana de otra población.
 */
function parseResolution(
  payload: Record<string, unknown>,
  flowBuckets: readonly OperationalKpiFlowBucket[],
): OperationalKpiResolution {
  const resolution = readSection(payload, 'resolution', 'root')
  if (readText(resolution, 'semantics', 'resolution') !== 'closed-in-period-duration-since-created') {
    throw new OperationalKpiContractError('resolution.semantics inválida')
  }
  const closedCount = readCount(resolution, 'closedCount', 'resolution')
  const medianDays = readDaysOrNull(resolution, 'medianDays', 'resolution')
  const p75Days = readDaysOrNull(resolution, 'p75Days', 'resolution')
  assertResolutionStats(closedCount, medianDays, p75Days, 'resolution')

  const bucketsRaw = resolution.buckets
  const distributionRaw = resolution.distribution
  if (!Array.isArray(bucketsRaw) || !Array.isArray(distributionRaw)) {
    throw new OperationalKpiContractError('resolution.buckets/distribution deben ser arreglos')
  }
  if (bucketsRaw.length !== flowBuckets.length) {
    throw new OperationalKpiContractError(
      'resolution.buckets debe tener la misma geometría que evolution.buckets',
    )
  }
  const buckets = bucketsRaw.map((raw: unknown, index) => {
    const path = `resolution.buckets[${index}]`
    if (!isRecord(raw)) throw new OperationalKpiContractError(`${path} no es objeto`)
    const flow = flowBuckets[index]
    const start = readText(raw, 'start', path)
    if (start !== flow.start) {
      throw new OperationalKpiContractError(`${path}.start no coincide con evolution.buckets`)
    }
    const count = readCountOrNull(raw, 'closedCount', path)
    // Invariante con Movimiento: mismos cierres, mismo bucket; futuro = null.
    const solved = flow.solved ? flow.solved.total : null
    if (count !== solved) {
      throw new OperationalKpiContractError(
        `${path}.closedCount (${String(count)}) ≠ Solucionados (${String(solved)})`,
      )
    }
    const median = readDaysOrNull(raw, 'medianDays', path)
    const p75 = readDaysOrNull(raw, 'p75Days', path)
    assertResolutionStats(count, median, p75, path)
    return { start, closedCount: count, medianDays: median, p75Days: p75 }
  })
  if (distributionRaw.length !== RESOLUTION_BANDS.length) {
    throw new OperationalKpiContractError('resolution.distribution debe traer los seis rangos')
  }
  const distribution = distributionRaw.map((raw: unknown, index) => {
    const path = `resolution.distribution[${index}]`
    if (!isRecord(raw)) throw new OperationalKpiContractError(`${path} no es objeto`)
    const expected = RESOLUTION_BANDS[index]
    if (
      raw.key !== expected.key ||
      raw.fromHours !== expected.fromHours ||
      raw.toHours !== expected.toHours
    ) {
      throw new OperationalKpiContractError(
        `resolution.distribution debe traer ${RESOLUTION_BANDS.map((b) => b.key).join(', ')} en orden`,
      )
    }
    return { ...expected, count: readCount(raw, 'count', path) }
  })
  const sum = (values: ReadonlyArray<number | null>) =>
    values.reduce<number>((acc, value) => acc + (value ?? 0), 0)
  if (sum(buckets.map((b) => b.closedCount)) !== closedCount) {
    throw new OperationalKpiContractError('resolution.buckets no suma resolution.closedCount')
  }
  if (sum(distribution.map((b) => b.count)) !== closedCount) {
    throw new OperationalKpiContractError('resolution.distribution no suma resolution.closedCount')
  }
  return {
    semantics: 'closed-in-period-duration-since-created',
    closedCount,
    medianDays,
    p75Days,
    buckets,
    distribution,
  }
}

function parseAging(payload: Record<string, unknown>): OperationalKpiAging {
  const aging = readSection(payload, 'aging', 'root')
  if (readText(aging, 'semantics', 'aging') !== 'active-at-cut-age-since-created') {
    throw new OperationalKpiContractError('aging.semantics inválida')
  }
  if (readText(aging, 'severitySemantics', 'aging') !== 'current-severity') {
    throw new OperationalKpiContractError('aging.severitySemantics inválida')
  }
  const isNow = readFlag(aging, 'isNow', 'aging')
  const reliabilityRaw = readSection(aging, 'reliability', 'aging')
  const reliability = {
    status: readOneOf(reliabilityRaw, 'status', 'aging.reliability', AGING_RELIABILITY),
    sla: readOneOf(reliabilityRaw, 'sla', 'aging.reliability', AGING_RELIABILITY),
  }
  if (!isNow && (reliability.status === 'current' || reliability.sla === 'current')) {
    throw new OperationalKpiContractError(
      'aging.reliability: un corte histórico no puede afirmar status ni SLA',
    )
  }
  const median = aging.medianAgeDays
  if (median !== null && (typeof median !== 'number' || !Number.isFinite(median) || median < 0)) {
    throw new OperationalKpiContractError('aging.medianAgeDays debe ser número ≥ 0 o null')
  }
  const bandsRaw = aging.bands
  const oldestRaw = aging.oldest
  if (!Array.isArray(bandsRaw) || !Array.isArray(oldestRaw)) {
    throw new OperationalKpiContractError('aging.bands/oldest deben ser arreglos')
  }
  const activeCount = readCount(aging, 'activeCount', 'aging')
  if (oldestRaw.length > Math.min(5, activeCount)) {
    throw new OperationalKpiContractError('aging.oldest excede el top 5 o activeCount')
  }
  const bands = bandsRaw.map((raw, index) => {
    const path = `aging.bands[${index}]`
    if (!isRecord(raw)) throw new OperationalKpiContractError(`${path} no es objeto`)
    return {
      key: readOneOf(raw, 'key', path, AGING_BAND_KEYS),
      count: readCount(raw, 'count', path),
    }
  })
  // Fotografía completa: los cuatro rangos, en orden, y suman la carga activa.
  if (bands.map((band) => band.key).join('|') !== AGING_BAND_KEYS.join('|')) {
    throw new OperationalKpiContractError(
      `aging.bands debe traer exactamente ${AGING_BAND_KEYS.join(', ')} en orden`,
    )
  }
  if (bands.reduce((sum, band) => sum + band.count, 0) !== activeCount) {
    throw new OperationalKpiContractError('aging.bands no suma aging.activeCount')
  }
  return {
    semantics: 'active-at-cut-age-since-created',
    at: readText(aging, 'at', 'aging'),
    isNow,
    reliability,
    severitySemantics: 'current-severity',
    activeCount,
    medianAgeDays: median,
    bands,
    oldest: oldestRaw.map((raw, index) => {
      const path = `aging.oldest[${index}]`
      if (!isRecord(raw)) throw new OperationalKpiContractError(`${path} no es objeto`)
      const status =
        raw.status === null ? null : readOneOf(raw, 'status', path, AGING_STATUSES)
      const slaOverdue = raw.slaOverdue === null ? null : readFlag(raw, 'slaOverdue', path)
      if (reliability.status === 'unavailable' && status !== null) {
        throw new OperationalKpiContractError(`${path}.status no es afirmable en este corte`)
      }
      if (reliability.sla === 'unavailable' && slaOverdue !== null) {
        throw new OperationalKpiContractError(`${path}.slaOverdue no es afirmable en este corte`)
      }
      return {
        id: readText(raw, 'id', path),
        title: readText(raw, 'title', path),
        createdAt: readIsoInstant(raw, 'createdAt', path),
        ageDays: readCount(raw, 'ageDays', path),
        severity: readOneOf(raw, 'severity', path, AGING_SEVERITIES),
        reportKind: readOneOf(raw, 'reportKind', path, AGING_REPORT_KINDS),
        categoryName: readTextOrNull(raw, 'categoryName', path),
        affectedCoordinationName: readTextOrNull(raw, 'affectedCoordinationName', path),
        status,
        slaOverdue,
        closedAfterCutAt:
          raw.closedAfterCutAt === null
            ? null
            : readIsoInstant(raw, 'closedAfterCutAt', path),
      }
    }),
  }
}

const SNAPSHOT_RELIABILITY = ['exact', 'current-value'] as const

/**
 * SNAPSHOT AT CUT. Además de tipos, exige la coherencia de una sola población:
 * Σ severidad = Σ atención = activeCount = aging.activeCount = Carga (último bucket no futuro),
 * corte = period.dataTo, y fiabilidad honesta (histórico ⇒ «valor actual»;
 * hoy ⇒ sin «cerrados después»).
 */
function parseSnapshot(
  payload: Record<string, unknown>,
  cut: {
    dataTo: string
    isCurrent: boolean
    lastActive: number | null
    aging: OperationalKpiAging
  },
): OperationalKpiStateSnapshot {
  const snap = readSection(payload, 'snapshot', 'root')
  if (readText(snap, 'semantics', 'snapshot') !== 'active-at-cut') {
    throw new OperationalKpiContractError('snapshot.semantics inválida')
  }
  const isNow = readFlag(snap, 'isNow', 'snapshot')
  const at = readText(snap, 'at', 'snapshot')
  const activeCount = readCount(snap, 'activeCount', 'snapshot')
  const sev = readSection(snap, 'severity', 'snapshot')
  const att = readSection(snap, 'attention', 'snapshot')
  const rel = readSection(snap, 'reliability', 'snapshot')
  const severity = {
    low: readCount(sev, 'low', 'snapshot.severity'),
    medium: readCount(sev, 'medium', 'snapshot.severity'),
    high: readCount(sev, 'high', 'snapshot.severity'),
    critical: readCount(sev, 'critical', 'snapshot.severity'),
  }
  const attention = {
    open: readCount(att, 'open', 'snapshot.attention'),
    inProgress: readCount(att, 'inProgress', 'snapshot.attention'),
    closedAfterCut: readCount(att, 'closedAfterCut', 'snapshot.attention'),
    unclassified: readCount(att, 'unclassified', 'snapshot.attention'),
  }
  const reliability = {
    severity: readOneOf(rel, 'severity', 'snapshot.reliability', SNAPSHOT_RELIABILITY),
    attention: readOneOf(rel, 'attention', 'snapshot.reliability', SNAPSHOT_RELIABILITY),
  }
  if (severity.low + severity.medium + severity.high + severity.critical !== activeCount) {
    throw new OperationalKpiContractError('snapshot.severity no suma activeCount')
  }
  if (
    attention.open + attention.inProgress + attention.closedAfterCut + attention.unclassified !==
    activeCount
  ) {
    throw new OperationalKpiContractError('snapshot.attention no suma activeCount')
  }
  if (at !== cut.dataTo || isNow !== cut.isCurrent) {
    throw new OperationalKpiContractError('snapshot debe cortar en period.dataTo')
  }
  if (
    cut.aging.at !== at ||
    cut.aging.isNow !== isNow ||
    cut.aging.activeCount !== activeCount
  ) {
    throw new OperationalKpiContractError(
      'snapshot y aging deben describir la misma población al mismo corte',
    )
  }
  if (cut.lastActive !== null && activeCount !== cut.lastActive) {
    throw new OperationalKpiContractError(
      'snapshot y Carga (último bucket) deben describir la misma población',
    )
  }
  const expected = isNow ? 'exact' : 'current-value'
  if (reliability.severity !== expected || reliability.attention !== expected) {
    throw new OperationalKpiContractError(
      'snapshot.reliability: un corte histórico usa valor actual; el de hoy es exacto',
    )
  }
  if (isNow && attention.closedAfterCut !== 0) {
    throw new OperationalKpiContractError('snapshot: un corte de hoy no tiene cerrados después')
  }
  return { semantics: 'active-at-cut', at, isNow, activeCount, severity, attention, reliability }
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
  const relations = readSection(payload, 'relations', 'root')
  const evolution = readSection(payload, 'evolution', 'root')
  const bucket = readText(evolution, 'bucket', 'evolution')
  if (bucket !== 'day' && bucket !== 'week' && bucket !== 'month') {
    throw new OperationalKpiContractError('evolution.bucket inválido')
  }
  const flowBuckets = parseFlowBuckets(evolution.buckets)
  const dataTo = readText(period, 'dataTo', 'period')
  const lastActive = flowBuckets.filter((b) => !b.future).at(-1)?.active?.total ?? null
  const aging = parseAging(payload)
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
    relations: {
      dependencies: readCount(relations, 'dependencies', 'relations'),
      commitments: readCount(relations, 'commitments', 'relations'),
    },
    evolution: {
      bucket,
      backlog: parseHistorySeries(evolution.backlog, 'evolution.backlog'),
      created: parseHistorySeries(evolution.created, 'evolution.created'),
      closed: parseHistorySeries(evolution.closed, 'evolution.closed'),
      buckets: flowBuckets,
    },
    activeAtPeriodEnd: (() => {
      const active = readSection(payload, 'activeAtPeriodEnd', 'root')
      return {
        count: readCount(active, 'count', 'activeAtPeriodEnd'),
        at: readText(active, 'at', 'activeAtPeriodEnd'),
        isNow: readFlag(active, 'isNow', 'activeAtPeriodEnd'),
      }
    })(),
    aging,
    snapshot: parseSnapshot(payload, { dataTo, isCurrent, lastActive, aging }),
    resolution: parseResolution(payload, flowBuckets),
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
