import {
  getCoordination,
  resolveCoordinationId,
  type CoordinationId,
} from '@/modules/impact-network/data/coordination-islands.config'
import {
  OPERATIONAL_STATUS_LABEL,
  type OperationalOverviewMetrics,
  type OperationalStatus,
  type ProblemCategoryId,
  type ProblemCategoryItem,
} from '@/modules/impact-network/data/executive-operational-overview.mock'
import { extractLegacyRelatedCodes } from '@/modules/impact-network/data/legacy-related-coordinations'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import {
  INCIDENT_CATEGORY_ICON_DESCRIPTION,
  INCIDENT_CATEGORY_ICON_LABEL,
  resolveIncidentCategoryIcon,
} from '@/modules/situations/data/incident-category-visual'

const STATUS_WEIGHT: Readonly<Record<OperationalStatus, number>> = {
  normal: 0,
  attention: 1,
  high: 2,
  critical: 3,
}

const SEVERITY_STATUS: Readonly<
  Record<SituationResponse['severity'], OperationalStatus>
> = {
  LOW: 'attention',
  MEDIUM: 'attention',
  HIGH: 'high',
  CRITICAL: 'critical',
}

const CATEGORY_LABEL = INCIDENT_CATEGORY_ICON_LABEL
const CATEGORY_DESCRIPTION = INCIDENT_CATEGORY_ICON_DESCRIPTION

export const EXECUTIVE_STATUS_ORDER: readonly OperationalStatus[] = [
  'critical',
  'high',
  'attention',
  'normal',
]

export interface ExecutiveSituationItem {
  id: string
  title: string
  description: string
  categoryId: ProblemCategoryId
  categoryName: string
  status: string
  severity: SituationResponse['severity']
  operationalStatus: OperationalStatus
  operationalReason: string
  updatedAt: string
  affectedCoordinationCount: number
}

export interface ExecutiveCoordinationView {
  id: CoordinationId
  name: string
  shortName: string
  islandAsset: string
  status: OperationalStatus
  statusLabel: string
  statusReason: string
  activeSituationCount: number
  categories: readonly ProblemCategoryId[]
  situations: readonly ExecutiveSituationItem[]
}

export interface ExecutivePriorityItem {
  rank: number
  coordinationId: CoordinationId
  name: string
  status: OperationalStatus
  statusLabel: string
  activeSituationCount: number
  affectedCoordinationCount: number
  summary: string
}

export interface ExecutivePatternItem {
  id: string
  categoryId: ProblemCategoryId
  title: string
  primary: string
  secondary: string
  tone: OperationalStatus
}

export interface ExecutiveOverviewModel {
  coordinations: readonly ExecutiveCoordinationView[]
  groups: Readonly<Record<OperationalStatus, readonly ExecutiveCoordinationView[]>>
  metrics: OperationalOverviewMetrics
  categories: readonly ProblemCategoryItem[]
  priorities: readonly ExecutivePriorityItem[]
  patterns: readonly ExecutivePatternItem[]
}

interface ExecutiveOverviewOptions {
  operationalRisk?: number | null
  updatedAt?: string | null
}

/** Limpia marcadores internos del mock sin alterar el dato de dominio. */
export function cleanExecutiveCopy(
  value: string | null | undefined,
  fallback = 'Información operacional en revisión.',
): string {
  if (!value) return fallback
  const narrative = value.split(/\n\n---\nContexto reportado por el usuario:/i)[0]
  const cleaned = narrative
    .replace(/\[[^\]]*(?:mock|seed)[^\]]*\]/gi, ' ')
    .replace(/\bmock[-_ ]?seed\b\s*:*/gi, ' ')
    .replace(/^[\s·:|—–-]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || fallback
}

function isActiveSituation(situation: SituationResponse): boolean {
  return situation.status.trim().toUpperCase() !== 'CLOSED'
}

/**
 * El volumen nunca escala por sí solo el estado de una coordinación.
 * Se toma la situación vigente más severa y se pondera su ciclo de vida/SLA:
 * - CLOSED no participa.
 * - RESOLVED permanece visible solo como seguimiento.
 * - Un SLA vencido escala un nivel (hasta crítico).
 */
export function resolveSituationOperationalStatus(
  situation: SituationResponse,
): OperationalStatus | null {
  const lifecycle = situation.status.trim().toUpperCase()
  if (lifecycle === 'CLOSED') return null
  if (lifecycle === 'RESOLVED') return 'attention'

  const base = SEVERITY_STATUS[situation.severity]
  const overdue =
    situation.slaHealth === 'overdue' || Boolean(situation.slaBreachedAt)
  if (!overdue) return base
  if (base === 'attention') return 'high'
  if (base === 'high') return 'critical'
  return base
}

function buildSituationOperationalReason(
  situation: SituationResponse,
  status: OperationalStatus,
): string {
  const title = cleanExecutiveCopy(situation.title, 'Situación activa')
  const lifecycle = situation.status.trim().toUpperCase()
  if (lifecycle === 'RESOLVED') return `En verificación · ${title}`
  if (situation.slaHealth === 'overdue' || situation.slaBreachedAt) {
    return `SLA vencido · ${title}`
  }
  if (status === 'critical') return `Situación crítica activa · ${title}`
  if (status === 'high') return `Situación de impacto alto · ${title}`
  return `Situación en seguimiento · ${title}`
}

export function resolveProblemCategoryId(
  code: string,
  name: string,
  icon?: string | null,
): ProblemCategoryId {
  return resolveIncidentCategoryIcon(code, name, icon)
}

function resolveSituationCoordinationIds(
  situation: SituationResponse,
  availableIds: ReadonlySet<CoordinationId>,
): CoordinationId[] {
  const candidates = [
    situation.coordinationCode,
    situation.coordinationId,
    ...(situation.relatedCoordinations ?? []).flatMap((related) => [
      related.coordinationCode,
      related.coordinationId,
    ]),
    ...extractLegacyRelatedCodes(situation.description),
  ]

  return [
    ...new Set(
      candidates
        .map((candidate) => resolveCoordinationId(candidate))
        .filter(
          (coordinationId): coordinationId is CoordinationId =>
            coordinationId !== null && availableIds.has(coordinationId),
        ),
    ),
  ]
}

export function formatExecutiveUpdatedLabel(
  value: string | null | undefined,
): string {
  if (!value) return 'Actualizado ahora'
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return 'Actualizado ahora'

  const elapsedMinutes = Math.max(
    0,
    Math.round((Date.now() - timestamp) / 60_000),
  )
  if (elapsedMinutes <= 1) return 'Actualizado ahora'
  if (elapsedMinutes < 60) return `Actualizado hace ${elapsedMinutes} min`
  const elapsedHours = Math.round(elapsedMinutes / 60)
  return `Actualizado hace ${elapsedHours} h`
}

function sortCoordinationViews(
  left: ExecutiveCoordinationView,
  right: ExecutiveCoordinationView,
): number {
  return (
    STATUS_WEIGHT[right.status] - STATUS_WEIGHT[left.status] ||
    right.activeSituationCount - left.activeSituationCount ||
    left.name.localeCompare(right.name, 'es')
  )
}

function clampRisk(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function buildExecutiveOverviewModel(
  coordinationIds: readonly CoordinationId[],
  situations: readonly SituationResponse[],
  options: ExecutiveOverviewOptions = {},
): ExecutiveOverviewModel {
  const canonicalIds = [
    ...new Set(
      coordinationIds.map((coordinationId) => getCoordination(coordinationId).id),
    ),
  ]
  const availableIds = new Set(canonicalIds)
  const situationsByCoordination = new Map<
    CoordinationId,
    ExecutiveSituationItem[]
  >()
  const categorySituationIds = new Map<ProblemCategoryId, Set<string>>()
  const categoryCoordinationIds = new Map<ProblemCategoryId, Set<CoordinationId>>()
  const categoryTone = new Map<ProblemCategoryId, OperationalStatus>()
  const activeSituations = situations.filter(isActiveSituation)
  const mappedSituationIds = new Set<string>()

  for (const situation of activeSituations) {
    const coordinationTargets = resolveSituationCoordinationIds(
      situation,
      availableIds,
    )
    if (coordinationTargets.length === 0) continue
    mappedSituationIds.add(situation.id)

    const operationalStatus = resolveSituationOperationalStatus(situation)
    if (!operationalStatus) continue
    const categoryId = resolveProblemCategoryId(
      situation.categoryCode,
      situation.categoryName,
      situation.categoryIcon,
    )
    const view: ExecutiveSituationItem = {
      id: situation.id,
      title: cleanExecutiveCopy(situation.title, 'Situación activa'),
      description: cleanExecutiveCopy(situation.description),
      categoryId,
      categoryName: situation.categoryName || CATEGORY_LABEL[categoryId],
      status: situation.status,
      severity: situation.severity,
      operationalStatus,
      operationalReason: buildSituationOperationalReason(
        situation,
        operationalStatus,
      ),
      updatedAt: situation.updatedAt,
      affectedCoordinationCount: coordinationTargets.length,
    }

    const categorySituationSet =
      categorySituationIds.get(categoryId) ?? new Set<string>()
    categorySituationSet.add(situation.id)
    categorySituationIds.set(categoryId, categorySituationSet)

    const categoryCoordinationSet =
      categoryCoordinationIds.get(categoryId) ?? new Set<CoordinationId>()
    coordinationTargets.forEach((coordinationId) =>
      categoryCoordinationSet.add(coordinationId),
    )
    categoryCoordinationIds.set(categoryId, categoryCoordinationSet)

    const currentTone = categoryTone.get(categoryId) ?? 'normal'
    if (STATUS_WEIGHT[operationalStatus] > STATUS_WEIGHT[currentTone]) {
      categoryTone.set(categoryId, operationalStatus)
    }

    for (const coordinationId of coordinationTargets) {
      const items = situationsByCoordination.get(coordinationId) ?? []
      items.push(view)
      situationsByCoordination.set(coordinationId, items)
    }
  }

  const coordinations = canonicalIds
    .map((coordinationId): ExecutiveCoordinationView => {
      const definition = getCoordination(coordinationId)
      const coordinationSituations = [
        ...(situationsByCoordination.get(coordinationId) ?? []),
      ].sort(
        (left, right) =>
          STATUS_WEIGHT[right.operationalStatus] -
            STATUS_WEIGHT[left.operationalStatus] ||
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      )
      const status = coordinationSituations[0]?.operationalStatus ?? 'normal'

      return {
        id: definition.id,
        name: definition.name,
        shortName: definition.shortName,
        islandAsset: definition.islandAsset,
        status,
        statusLabel: OPERATIONAL_STATUS_LABEL[status],
        statusReason:
          coordinationSituations[0]?.operationalReason ??
          'Sin situaciones activas',
        activeSituationCount: coordinationSituations.length,
        categories: [
          ...new Set(coordinationSituations.map((item) => item.categoryId)),
        ],
        situations: coordinationSituations,
      }
    })
    .sort(sortCoordinationViews)

  const groups: Record<
    OperationalStatus,
    readonly ExecutiveCoordinationView[]
  > = {
    critical: coordinations.filter(
      (coordination) => coordination.status === 'critical',
    ),
    high: coordinations.filter((coordination) => coordination.status === 'high'),
    attention: coordinations.filter(
      (coordination) => coordination.status === 'attention',
    ),
    normal: coordinations.filter(
      (coordination) => coordination.status === 'normal',
    ),
  }

  const categories = [...categorySituationIds.entries()]
    .map(([categoryId, situationIds]): ProblemCategoryItem => ({
      id: categoryId,
      name: CATEGORY_LABEL[categoryId],
      shortDescription: CATEGORY_DESCRIPTION[categoryId],
      count: situationIds.size,
    }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'es'))

  const priorities = coordinations
    .filter((coordination) => coordination.status !== 'normal')
    .slice(0, 5)
    .map((coordination, index): ExecutivePriorityItem => {
      const primarySituation = coordination.situations[0]
      return {
        rank: index + 1,
        coordinationId: coordination.id,
        name: coordination.shortName,
        status: coordination.status,
        statusLabel: coordination.statusLabel,
        activeSituationCount: coordination.activeSituationCount,
        affectedCoordinationCount:
          primarySituation?.affectedCoordinationCount ?? 1,
        summary: primarySituation?.title ?? 'Requiere seguimiento operacional',
      }
    })

  const patterns = categories.slice(0, 4).map((category): ExecutivePatternItem => {
    const coordinationCount = categoryCoordinationIds.get(category.id)?.size ?? 0
    const tone = categoryTone.get(category.id) ?? 'attention'
    return {
      id: `pattern-${category.id}`,
      categoryId: category.id,
      title: `${category.name} · ${OPERATIONAL_STATUS_LABEL[tone]}`,
      primary: `${category.count} registro${category.count === 1 ? '' : 's'} activo${category.count === 1 ? '' : 's'}`,
      secondary: `${coordinationCount} coordinación${coordinationCount === 1 ? '' : 'es'} involucrada${coordinationCount === 1 ? '' : 's'}`,
      tone,
    }
  })

  const affected = coordinations.filter(
    (coordination) => coordination.status !== 'normal',
  ).length
  const derivedRisk = coordinations.length
    ? (coordinations.reduce(
        (total, coordination) =>
          total +
          ({ normal: 0, attention: 38, high: 72, critical: 100 } as const)[
            coordination.status
          ],
        0,
      ) /
        coordinations.length) *
      1.35
    : 0

  return {
    coordinations,
    groups,
    metrics: {
      coordinations: coordinations.length,
      affected,
      activeProblems: coordinations.reduce(
        (total, coordination) => total + coordination.activeSituationCount,
        0,
      ),
      openSituations: mappedSituationIds.size,
      operationalRisk: clampRisk(options.operationalRisk ?? derivedRisk),
      operationalRiskMax: 100,
      updatedLabel: formatExecutiveUpdatedLabel(options.updatedAt),
    },
    categories,
    priorities,
    patterns,
  }
}
