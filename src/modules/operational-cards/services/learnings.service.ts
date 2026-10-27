import { apiRequest } from '@/shared/api/http'
import type { AnalysisPeriod } from '@/modules/operational-cards/domain/analysis-period'
import { OperationalKpiContractError } from '@/modules/operational-cards/services/operational-kpi.service'
import type { InternosPeriod } from '@/modules/operational-cards/types/internal-problems.types'
import type {
  LearningCategory,
  LearningItem,
  LearningItemsPage,
  LearningsSummary,
} from '@/modules/operational-cards/types/learnings.types'

/**
 * APRENDIZAJES · `/operational-kpis/learnings` (resumen del periodo completo)
 * y `/operational-kpis/learnings/items` (fichas paginadas). El payload se
 * valida: una cifra que no cuadra no se presenta como dato.
 */

/** Fichas por página («Cargar más»). */
export const LEARNINGS_PAGE_SIZE = 20

type Source = Record<string, unknown>
type PeriodQuery = Pick<AnalysisPeriod, 'kind' | 'from' | 'to' | 'calendarEnd'>

function isRecord(value: unknown): value is Source {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function fail(path: string, detail: string): never {
  throw new OperationalKpiContractError(`${path} ${detail}`)
}

function record(value: unknown, path: string): Source {
  if (!isRecord(value)) fail(path, 'ausente o no es objeto')
  return value
}

function text(source: Source, field: string, path: string): string {
  const value = source[field]
  if (typeof value !== 'string' || value.trim() === '') fail(`${path}.${field}`, 'debe ser un texto no vacío')
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

function count(source: Source, field: string, path: string): number {
  const value = source[field]
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    fail(`${path}.${field}`, 'debe ser un entero no negativo')
  }
  return value
}

function flag(source: Source, field: string, path: string): boolean {
  const value = source[field]
  if (typeof value !== 'boolean') fail(`${path}.${field}`, 'debe ser booleano')
  return value
}

function list(source: Source, field: string, path: string): unknown[] {
  const value = source[field]
  if (!Array.isArray(value)) fail(`${path}.${field}`, 'debe ser un arreglo')
  return value
}

function parsePeriod(payload: Source, path: string): InternosPeriod {
  const period = record(payload.period, `${path}.period`)
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

function parseCategory(value: unknown, path: string): Omit<LearningCategory, 'count'> {
  const category = record(value, path)
  return {
    id: text(category, 'id', path),
    code: typeof category.code === 'string' ? category.code : '',
    name: text(category, 'name', path),
    selectable: flag(category, 'selectable', path),
  }
}

function coordinationOf(payload: Source, path: string): string {
  return text(record(payload.scope, `${path}.scope`), 'coordinationId', `${path}.scope`)
}

export function parseLearningsSummary(payload: unknown): LearningsSummary {
  const path = 'learnings'
  const source = record(payload, path)
  const closedCount = count(source, 'closedCount', path)
  const learningCount = count(source, 'learningCount', path)
  const withoutLearningCount = count(source, 'withoutLearningCount', path)
  if (learningCount > closedCount) fail(`${path}.learningCount`, 'supera los cierres del periodo')
  if (learningCount + withoutLearningCount !== closedCount) {
    fail(`${path}.withoutLearningCount`, 'no cuadra con los cierres')
  }
  const rawCoverage = source.coverage
  let coverage: number | null = null
  if (closedCount === 0) {
    if (rawCoverage !== null) fail(`${path}.coverage`, 'debe ser null sin cierres')
  } else {
    coverage = count(source, 'coverage', path)
    if (coverage > 100) fail(`${path}.coverage`, 'supera 100')
  }
  const categories = list(source, 'categories', path).map((value, index) => {
    const at = `${path}.categories[${index}]`
    return { ...parseCategory(value, at), count: count(record(value, at), 'count', at) }
  })
  if (categories.reduce((sum, c) => sum + c.count, 0) !== learningCount) {
    fail(`${path}.categories`, 'no suman los aprendizajes del periodo')
  }
  return {
    coordinationId: coordinationOf(source, path),
    period: parsePeriod(source, path),
    closedCount,
    learningCount,
    withoutLearningCount,
    coverage,
    categories,
  }
}

function parseItem(value: unknown, path: string): LearningItem {
  const item = record(value, path)
  const reportKind = item.reportKind === 'INTER_COORDINATION' ? 'INTER_COORDINATION' : 'INTERNAL'
  const excerpt = item.learningExcerpt
  if (typeof excerpt !== 'string' || excerpt.trim() === '') {
    fail(`${path}.learningExcerpt`, 'un aprendizaje no puede llegar vacío')
  }
  return {
    situationId: text(item, 'situationId', path),
    title: text(item, 'title', path),
    reportKind,
    category: parseCategory(item.category, `${path}.category`),
    closedAt: instant(item, 'closedAt', path),
    resolvedAt: item.resolvedAt == null ? null : instant(item, 'resolvedAt', path),
    recordedAt: instant(item, 'recordedAt', path),
    resolvedByName: textOrNull(item, 'resolvedByName', path),
    learningExcerpt: excerpt,
    learningTruncated: item.learningTruncated === true,
    learningLength: count(item, 'learningLength', path),
  }
}

export function parseLearningItemsPage(payload: unknown): LearningItemsPage {
  const path = 'learnings.items'
  const source = record(payload, path)
  const categoryId = source.categoryId
  return {
    coordinationId: coordinationOf(source, path),
    categoryId: typeof categoryId === 'string' ? categoryId : null,
    total: count(source, 'total', path),
    page: count(source, 'page', path),
    limit: count(source, 'limit', path),
    items: list(source, 'items', path).map((value, index) =>
      parseItem(value, `${path}.items[${index}]`),
    ),
  }
}

function periodParams(coordinationId: string, period: PeriodQuery): URLSearchParams {
  return new URLSearchParams({
    scope: 'coordination',
    coordinationId,
    from: period.from,
    to: period.to,
    kind: period.kind,
    calendarEnd: period.calendarEnd,
  })
}

/** Indicadores y categorías del periodo COMPLETO (no depende de las fichas). */
export async function fetchLearningsSummary(
  query: { coordinationId: string; period: PeriodQuery },
  init?: RequestInit,
): Promise<LearningsSummary> {
  const params = periodParams(query.coordinationId, query.period)
  const payload = await apiRequest<unknown>(`/operational-kpis/learnings?${params.toString()}`, init)
  return parseLearningsSummary(payload)
}

/** Una página de fichas (closedAt ↓), opcionalmente de una categoría. */
export async function fetchLearningItems(
  query: {
    coordinationId: string
    period: PeriodQuery
    categoryId: string | null
    page: number
    limit?: number
  },
  init?: RequestInit,
): Promise<LearningItemsPage> {
  const params = periodParams(query.coordinationId, query.period)
  if (query.categoryId) params.set('categoryId', query.categoryId)
  params.set('page', String(query.page))
  params.set('limit', String(query.limit ?? LEARNINGS_PAGE_SIZE))
  const payload = await apiRequest<unknown>(
    `/operational-kpis/learnings/items?${params.toString()}`,
    init,
  )
  return parseLearningItemsPage(payload)
}
