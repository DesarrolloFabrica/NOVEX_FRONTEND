import { apiRequest } from '@/shared/api/http'
import type { AnalysisPeriod } from '@/modules/operational-cards/domain/analysis-period'
import { OperationalKpiContractError } from '@/modules/operational-cards/services/operational-kpi.service'
import type {
  InternalConsequenceMark,
  InternalProblemRow,
  InternalProblemSla,
  InternalProblemStatus,
  InternalProblemsResponse,
  InternalRecurrenceBucket,
  InternalRecurrenceBucketKind,
  InternalRecurrenceCategory,
  InternalRecurrenceResponse,
  InternosPeriod,
} from '@/modules/operational-cards/types/internal-problems.types'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'

const SEVERITIES: readonly SituationSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const STATUSES: readonly InternalProblemStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
const SLA: readonly InternalProblemSla[] = ['on_track', 'at_risk', 'overdue', 'none']
const BUCKETS: readonly InternalRecurrenceBucketKind[] = ['day', 'week', 'month']

type Source = Record<string, unknown>

function isRecord(value: unknown): value is Source {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function fail(path: string, detail: string): never {
  throw new OperationalKpiContractError(`${path} ${detail}`)
}

function section(source: Source, field: string, path: string): Source {
  const value = source[field]
  if (!isRecord(value)) fail(`${path}.${field}`, 'ausente o no es objeto')
  return value
}

function list(source: Source, field: string, path: string): unknown[] {
  const value = source[field]
  if (!Array.isArray(value)) fail(`${path}.${field}`, 'debe ser un arreglo')
  return value
}

function text(source: Source, field: string, path: string): string {
  const value = source[field]
  if (typeof value !== 'string' || value.trim() === '') {
    fail(`${path}.${field}`, 'debe ser un texto no vacío')
  }
  return value
}

function textOrNull(source: Source, field: string, path: string): string | null {
  return source[field] === null || source[field] === undefined ? null : text(source, field, path)
}

function instant(source: Source, field: string, path: string): string {
  const value = text(source, field, path)
  if (Number.isNaN(Date.parse(value))) fail(`${path}.${field}`, 'no es un instante ISO')
  return value
}

function instantOrNull(source: Source, field: string, path: string): string | null {
  return source[field] === null || source[field] === undefined ? null : instant(source, field, path)
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function count(source: Source, field: string, path: string): number {
  const value = source[field]
  if (!isCount(value)) fail(`${path}.${field}`, 'debe ser un entero no negativo')
  return value
}

function countOrNull(source: Source, field: string, path: string): number | null {
  const value = source[field]
  if (value === null) return null
  if (!isCount(value)) fail(`${path}.${field}`, 'debe ser un entero no negativo o null')
  return value
}

function oneOf<T extends string>(source: Source, field: string, path: string, allowed: readonly T[]): T {
  const match = allowed.find((option) => option === source[field])
  if (match === undefined) fail(`${path}.${field}`, `debe ser uno de: ${allowed.join(', ')}`)
  return match
}

function flag(source: Source, field: string, path: string): boolean {
  const value = source[field]
  if (typeof value !== 'boolean') fail(`${path}.${field}`, 'debe ser booleano')
  return value
}

function parsePeriod(payload: Source, path: string): InternosPeriod {
  const period = section(payload, 'period', path)
  const at = `${path}.period`
  return {
    kind: text(period, 'kind', at),
    from: text(period, 'from', at),
    to: text(period, 'to', at),
    calendarEnd: text(period, 'calendarEnd', at),
    dataTo: text(period, 'dataTo', at),
    isCurrent: flag(period, 'isCurrent', at),
    isPartial: flag(period, 'isPartial', at),
    cutAt: instant(period, 'cutAt', at),
  }
}

function parseRow(value: unknown, path: string): InternalProblemRow {
  if (!isRecord(value)) fail(path, 'no es un objeto')
  const category = value.category
  let parsedCategory: InternalProblemRow['category'] = null
  if (category !== null && category !== undefined) {
    if (!isRecord(category)) fail(`${path}.category`, 'no es un objeto')
    parsedCategory = {
      id: text(category, 'id', `${path}.category`),
      code: typeof category.code === 'string' ? category.code : '',
      name: text(category, 'name', `${path}.category`),
    }
  }
  const latest = value.latestConsequence
  let parsedLatest: InternalProblemRow['latestConsequence'] = null
  if (latest !== null && latest !== undefined) {
    if (!isRecord(latest)) fail(`${path}.latestConsequence`, 'no es un objeto')
    const preview = latest.preview
    if (typeof preview !== 'string') fail(`${path}.latestConsequence.preview`, 'debe ser texto')
    parsedLatest = {
      occurredAt: instant(latest, 'occurredAt', `${path}.latestConsequence`),
      createdAt: instant(latest, 'createdAt', `${path}.latestConsequence`),
      preview,
      truncated: latest.truncated === true,
    }
  }
  return {
    id: text(value, 'id', path),
    title: text(value, 'title', path),
    category: parsedCategory,
    createdAt: instant(value, 'createdAt', path),
    createdByName: textOrNull(value, 'createdByName', path),
    ageDays: count(value, 'ageDays', path),
    statusAtCut: oneOf(value, 'statusAtCut', path, STATUSES),
    reportedSeverity: oneOf(value, 'reportedSeverity', path, SEVERITIES),
    severityAtCut: oneOf(value, 'severityAtCut', path, SEVERITIES),
    consequenceCountAtCut: count(value, 'consequenceCountAtCut', path),
    latestConsequence: parsedLatest,
    dueAt: instantOrNull(value, 'dueAt', path),
    slaAtCut: oneOf(value, 'slaAtCut', path, SLA),
    historyReliable: flag(value, 'historyReliable', path),
    consequenceTimeline: list(value, 'consequenceTimeline', path).map((item, index) =>
      parseMark(item, `${path}.consequenceTimeline[${index}]`),
    ),
  }
}

function parseMark(value: unknown, path: string): InternalConsequenceMark {
  if (!isRecord(value)) fail(path, 'no es un objeto')
  const preview = value.preview
  if (typeof preview !== 'string') fail(`${path}.preview`, 'debe ser texto')
  return {
    id: text(value, 'id', path),
    occurredAt: instant(value, 'occurredAt', path),
    createdAt: instant(value, 'createdAt', path),
    preview,
    truncated: value.truncated === true,
    severityAtOccurrence: oneOf(value, 'severityAtOccurrence', path, SEVERITIES),
  }
}

export function parseInternalProblemsResponse(payload: unknown): InternalProblemsResponse {
  const path = 'internal-problems'
  if (!isRecord(payload)) fail(path, 'no es un objeto')
  const scope = section(payload, 'scope', path)
  const items = list(payload, 'items', path).map((item, index) => parseRow(item, `${path}.items[${index}]`))
  const total = count(payload, 'total', path)
  if (total !== items.length && payload.truncated !== true) {
    fail(`${path}.total`, 'no coincide con items')
  }
  return {
    coordinationId: text(scope, 'coordinationId', `${path}.scope`),
    period: parsePeriod(payload, path),
    total,
    truncated: payload.truncated === true,
    items,
  }
}

function parseBucket(value: unknown, path: string): InternalRecurrenceBucket {
  if (!isRecord(value)) fail(path, 'no es un objeto')
  const future = flag(value, 'future', path)
  const total = countOrNull(value, 'total', path)
  if (future !== (total === null)) fail(`${path}.total`, 'futuro ⇔ null')
  return {
    start: text(value, 'start', path),
    end: text(value, 'end', path),
    calendarStart: text(value, 'calendarStart', path),
    calendarEnd: text(value, 'calendarEnd', path),
    dataEnd: textOrNull(value, 'dataEnd', path),
    label: text(value, 'label', path),
    current: flag(value, 'current', path),
    future,
    total,
  }
}

function parseCategory(value: unknown, path: string, buckets: readonly InternalRecurrenceBucket[]): InternalRecurrenceCategory {
  if (!isRecord(value)) fail(path, 'no es un objeto')
  const values = list(value, 'values', path).map((cell, index) => {
    const future = buckets[index]?.future === true
    if (cell === null) {
      if (!future) fail(`${path}.values[${index}]`, 'null solo en buckets futuros')
      return null
    }
    // Un futuro nunca trae número: ni siquiera un 0.
    if (future) fail(`${path}.values[${index}]`, 'un bucket futuro debe ser null')
    if (!isCount(cell)) fail(`${path}.values[${index}]`, 'debe ser un entero no negativo')
    return cell
  })
  if (values.length !== buckets.length) fail(`${path}.values`, 'no está alineado con buckets')
  return {
    id: text(value, 'id', path),
    code: typeof value.code === 'string' ? value.code : '',
    name: text(value, 'name', path),
    selectable: value.selectable !== false,
    totalCreated: count(value, 'totalCreated', path),
    bucketsWithOccurrences: count(value, 'bucketsWithOccurrences', path),
    values,
  }
}

export function parseInternalRecurrenceResponse(payload: unknown): InternalRecurrenceResponse {
  const path = 'internal-recurrence'
  if (!isRecord(payload)) fail(path, 'no es un objeto')
  const scope = section(payload, 'scope', path)
  const buckets = list(payload, 'buckets', path).map((item, index) => parseBucket(item, `${path}.buckets[${index}]`))
  const categories = list(payload, 'categories', path).map((item, index) =>
    parseCategory(item, `${path}.categories[${index}]`, buckets),
  )
  const total = count(payload, 'total', path)
  if (categories.reduce((sum, c) => sum + c.totalCreated, 0) !== total) {
    fail(`${path}.total`, 'no es la suma de las categorías')
  }
  return {
    coordinationId: text(scope, 'coordinationId', `${path}.scope`),
    period: parsePeriod(payload, path),
    bucket: oneOf(payload, 'bucket', path, BUCKETS),
    buckets,
    eligibleBuckets: count(payload, 'eligibleBuckets', path),
    total,
    categories,
  }
}

type PeriodQuery = Pick<AnalysisPeriod, 'kind' | 'from' | 'to' | 'calendarEnd'>

function params(coordinationId: string, period: PeriodQuery): string {
  return new URLSearchParams({
    scope: 'coordination',
    coordinationId,
    from: period.from,
    to: period.to,
    kind: period.kind,
    calendarEnd: period.calendarEnd,
  }).toString()
}

/** Afectaciones activas al corte. Mismo periodo que /state. */
export async function fetchInternalProblems(
  query: { coordinationId: string; period: PeriodQuery },
  init?: RequestInit,
): Promise<InternalProblemsResponse> {
  const payload = await apiRequest<unknown>(
    `/operational-kpis/internal-problems?${params(query.coordinationId, query.period)}`,
    init,
  )
  return parseInternalProblemsResponse(payload)
}

/** Recurrencia de categorías. Mismo periodo que /state. */
export async function fetchInternalRecurrence(
  query: { coordinationId: string; period: PeriodQuery },
  init?: RequestInit,
): Promise<InternalRecurrenceResponse> {
  const payload = await apiRequest<unknown>(
    `/operational-kpis/internal-recurrence?${params(query.coordinationId, query.period)}`,
    init,
  )
  return parseInternalRecurrenceResponse(payload)
}
