import {
  getCoordination,
  type CoordinationId,
} from '@/modules/impact-network/data/coordination-islands.config'
import type { FocusedPropagation } from '@/modules/impact-network/types/impact-network.types'
import type {
  AffectedAreaAssessment,
  OperationalEvent,
  RecommendedAction,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'
import { RISK_LEVEL_LABEL } from '@/modules/operational-events/components/eventPresentation'

export type IslandFocusRole = 'origin' | 'affected' | 'ambient'

export interface IslandAffectedBriefing {
  coordinationId: CoordinationId
  coordinationName: string
  shortName: string
  role: 'affected' | 'ambient'
  affectationLevel: RiskLevel
  reason: string
  propagationChain: string
  dependencies: readonly string[]
  suggestedActions: readonly RecommendedAction[]
}

function normalizeLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function labelsMatch(a: string, b: string): boolean {
  const left = normalizeLabel(a)
  const right = normalizeLabel(b)
  if (!left || !right) return false
  return left.includes(right) || right.includes(left)
}

export function resolveIslandFocusRole(
  coordinationId: CoordinationId,
  propagation: FocusedPropagation,
): IslandFocusRole {
  if (coordinationId === propagation.originCoordinationId) return 'origin'
  if (propagation.affectedCoordinationIds.includes(coordinationId)) {
    return 'affected'
  }
  return 'ambient'
}

function matchAffectedAreaAssessment(
  coordinationId: CoordinationId,
  propagation: FocusedPropagation,
  areas: readonly AffectedAreaAssessment[],
): AffectedAreaAssessment | null {
  const coordination = getCoordination(coordinationId)
  const affectedIndex = propagation.affectedCoordinationIds.indexOf(coordinationId)

  if (affectedIndex >= 0 && areas[affectedIndex]) {
    return areas[affectedIndex]
  }

  return (
    areas.find(
      (area) =>
        labelsMatch(area.name, coordination.name) ||
        labelsMatch(area.name, coordination.shortName),
    ) ?? null
  )
}

function buildPropagationChain(
  coordinationId: CoordinationId,
  propagation: FocusedPropagation,
  role: 'affected' | 'ambient',
): string {
  const coordination = getCoordination(coordinationId)
  const order = propagation.affectedCoordinationIds.indexOf(coordinationId)

  if (role === 'ambient') {
    return `${coordination.name} aparece en la red como contexto, sin afectación directa confirmada en esta propagación.`
  }

  if (order < 0) {
    return `Relacionada con la situación originada en ${propagation.originName}. No hay secuencia de propagación confirmada para esta coordinación.`
  }

  const sequence = order + 1
  return `Impacto propagado desde ${propagation.originName}. Secuencia ${sequence} de ${propagation.affectedCoordinationIds.length} áreas afectadas.`
}

function filterSuggestedActions(
  actions: readonly RecommendedAction[],
  coordinationName: string,
  shortName: string,
): RecommendedAction[] {
  // Solo acciones explícitamente asignadas a esta área; sin inventar genéricas.
  return actions.filter(
    (action) =>
      labelsMatch(action.suggestedArea, coordinationName) ||
      labelsMatch(action.suggestedArea, shortName),
  )
}

export function resolveIslandAffectedBriefing(
  coordinationId: CoordinationId,
  propagation: FocusedPropagation,
  event: OperationalEvent,
): IslandAffectedBriefing {
  const coordination = getCoordination(coordinationId)
  const role = resolveIslandFocusRole(coordinationId, propagation)
  const focusRole = role === 'origin' ? 'affected' : role
  const report = event.interpretation?.executiveReport ?? null
  const matchedArea = report
    ? matchAffectedAreaAssessment(coordinationId, propagation, report.affectedAreas)
    : null

  const affectationLevel =
    matchedArea?.affectationLevel ??
    (focusRole === 'ambient'
      ? 'low'
      : (propagation.riskLevel ?? event.interpretation?.riskLevel ?? 'moderate'))

  const reason =
    matchedArea?.reason ??
    (focusRole === 'ambient'
      ? `Sin afectación directa confirmada para ${coordination.name} en el análisis disponible.`
      : `Sin lectura específica de afectación para ${coordination.name} en el análisis disponible.`)

  // Dependencias globales del reporte solo si hay match de área; si no, vacío.
  const dependencies = matchedArea
    ? (report?.rootCause.dependencies.slice(0, 3) ?? [])
    : []
  const suggestedActions = filterSuggestedActions(
    report?.recommendedActions ?? [],
    coordination.name,
    coordination.shortName,
  )

  return {
    coordinationId,
    coordinationName: coordination.name,
    shortName: coordination.shortName,
    role: focusRole,
    affectationLevel,
    reason,
    propagationChain: buildPropagationChain(
      coordinationId,
      propagation,
      focusRole,
    ),
    dependencies,
    suggestedActions,
  }
}

export function isIslandFocusOrigin(
  coordinationId: CoordinationId,
  propagation: FocusedPropagation,
): boolean {
  return resolveIslandFocusRole(coordinationId, propagation) === 'origin'
}

export interface IslandStageMetric {
  label: string
  value: string
}

export interface IslandStageBriefing {
  coordinationName: string
  shortName: string
  roleLabel: string
  role: IslandFocusRole
  statusLabel: string
  riskLevel: RiskLevel
  topSummary: string
  bottomDetail: string
  metrics: IslandStageMetric[]
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1).trimEnd()}…`
}

function resolveOriginStageBriefing(
  coordination: ReturnType<typeof getCoordination>,
  event: OperationalEvent,
  propagation: FocusedPropagation,
): IslandStageBriefing {
  const report = event.interpretation?.executiveReport ?? null
  const interpretation = event.interpretation
  const riskLevel =
    report?.riskAssessment.riskLevel ??
    interpretation?.riskLevel ??
    propagation.riskLevel ??
    'moderate'
  const riskScore =
    report?.riskAssessment.riskScore ?? interpretation?.riskScore ?? null
  const certainty =
    report?.riskAssessment.certainty.percentage ??
    (interpretation?.confidence !== undefined
      ? Math.round(interpretation.confidence * 100)
      : null)
  const affectedCount =
    report?.affectedAreas.length ?? propagation.affectedCoordinationIds.length

  const topSummary =
    report?.incidentSummary.executiveSummary ??
    interpretation?.executiveSummary ??
    `La situación se originó en ${coordination.name} y está siendo monitoreada en la red de impacto.`

  const bottomDetail =
    report?.incidentSummary.executiveTitle ??
    event.title ??
    `Expediente operacional activo en ${coordination.shortName}.`

  const metrics: IslandStageMetric[] = [
    {
      label: 'Riesgo',
      value: riskScore !== null ? `${riskScore}/100` : RISK_LEVEL_LABEL[riskLevel],
    },
    ...(certainty !== null
      ? [{ label: 'Certeza', value: `${certainty}%` }]
      : []),
    {
      label: 'Áreas afectadas',
      value: String(affectedCount),
    },
  ]

  return {
    coordinationName: coordination.name,
    shortName: coordination.shortName,
    roleLabel: 'Situación origen',
    role: 'origin',
    statusLabel: 'ORIGEN ACTIVA',
    riskLevel,
    topSummary: truncateText(topSummary, 160),
    bottomDetail: truncateText(bottomDetail, 120),
    metrics,
  }
}

function resolveAffectedStageBriefing(
  coordinationId: CoordinationId,
  propagation: FocusedPropagation,
  event: OperationalEvent,
): IslandStageBriefing {
  const briefing = resolveIslandAffectedBriefing(coordinationId, propagation, event)
  const role = resolveIslandFocusRole(coordinationId, propagation)
  const order = propagation.affectedCoordinationIds.indexOf(coordinationId)

  const statusLabel =
    role === 'ambient'
      ? 'EN RED'
      : briefing.affectationLevel === 'critical' || briefing.affectationLevel === 'high'
        ? 'IMPACTO'
        : 'AFECTADA'

  const roleLabel =
    role === 'ambient' ? 'Coordinación en red' : 'Coordinación afectada'

  const metrics: IslandStageMetric[] =
    role === 'ambient'
      ? [
          { label: 'Rol', value: 'Contexto' },
          { label: 'Impacto', value: 'Sin afectación' },
          { label: 'Red', value: 'Monitoreada' },
        ]
      : [
          {
            label: 'Afectación',
            value: RISK_LEVEL_LABEL[briefing.affectationLevel],
          },
          ...(order >= 0
            ? [
                {
                  label: 'Secuencia',
                  value: `${order + 1}/${propagation.affectedCoordinationIds.length}`,
                },
              ]
            : []),
          {
            label: 'Dependencias',
            value: String(briefing.dependencies.length),
          },
        ]

  return {
    coordinationName: briefing.coordinationName,
    shortName: briefing.shortName,
    roleLabel,
    role,
    statusLabel,
    riskLevel: briefing.affectationLevel,
    topSummary: truncateText(briefing.reason, 160),
    bottomDetail: truncateText(briefing.propagationChain, 120),
    metrics,
  }
}

export function resolveIslandStageBriefing(
  coordinationId: CoordinationId,
  propagation: FocusedPropagation,
  event: OperationalEvent,
): IslandStageBriefing {
  const coordination = getCoordination(coordinationId)
  const role = resolveIslandFocusRole(coordinationId, propagation)

  if (role === 'origin') {
    return resolveOriginStageBriefing(coordination, event, propagation)
  }

  return resolveAffectedStageBriefing(coordinationId, propagation, event)
}
