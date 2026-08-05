import {
  getCoordination,
  resolveCoordinationIdOrGeneral,
  type CoordinationId,
} from '@/modules/impact-network/data/coordination-islands.config'
import { IMPACT_REPLAYS } from '@/modules/impact-network/data/impact-scenarios.mock'
import type {
  Coordination,
  CoordinationOperationalStatus,
  OperationalDirection,
  OperationalNetworkSnapshot,
  Situation,
  SituationImpact,
  SituationPropagation,
  SituationSummary,
} from '@/modules/impact-network/types/operational-network.types'
import { OPERATIONAL_EVENTS } from '@/modules/operational-events/data/operational-events.mock'
import type { RiskLevel } from '@/modules/operational-events/types/operational-event.types'

export const OPERATIONAL_COORDINATION_IDS: readonly CoordinationId[] = [
  'coord-ingenierias',
  'coord-operaciones-academicas',
  'coord-general',
  'coord-empresarial',
  'coord-saber-pro',
  'coord-b2b',
  'coord-desarrollo-profesional',
  'coord-proyeccion-social',
  'coord-bellas-artes',
  'coord-servicios',
  'coord-especializaciones',
  'coord-transversales',
] as const

const SITUATION_COORDINATION: Readonly<Record<string, CoordinationId>> = {
  'evt-001': 'coord-ingenierias',
  'evt-002': 'coord-operaciones-academicas',
  'evt-003': 'coord-operaciones-academicas',
  'evt-004': 'coord-ingenierias',
  'evt-005': 'coord-b2b',
  'evt-006': 'coord-empresarial',
  'evt-007': 'coord-desarrollo-profesional',
  'evt-008': 'coord-proyeccion-social',
  'evt-009': 'coord-saber-pro',
  'evt-010': 'coord-transversales',
}

const COORDINATION_RESPONSIBLES: Readonly<
  Record<CoordinationId, readonly string[]>
> = {
  'coord-general': ['Valentina Rojas', 'Mesa de Operaciones'],
  'coord-b2b': ['Mónica Salas', 'Equipo B2B'],
  'coord-bellas-artes': ['Camila Suárez', 'Mesa Académica'],
  'coord-desarrollo-profesional': ['Daniela Vargas', 'Gestión de Talento'],
  'coord-servicios': ['Equipo Servicios', 'Mesa de Servicios'],
  'coord-empresarial': ['Natalia Ruiz', 'Servicio Institucional'],
  'coord-especializaciones': ['Laura Peña', 'Mesa de Posgrados'],
  'coord-ingenierias': ['Andrés Rivas', 'Fábrica y Desarrollo'],
  'coord-operaciones-academicas': ['Laura Gómez', 'Carlos Méndez'],
  'coord-proyeccion-social': ['Valeria Ospina', 'Gestión Social'],
  'coord-saber-pro': ['Patricia León', 'Equipo Saber Pro'],
  'coord-transversales': ['Sofía Ramírez', 'Innovación EDU'],
  'coord-negocios': ['Mónica Salas', 'Equipo de Negocios'],
}

const GENERATED_AT = '2026-07-22T15:00:00.000Z'

function riskLevelForEvent(eventId: string): RiskLevel {
  return (
    OPERATIONAL_EVENTS.find((event) => event.id === eventId)?.interpretation
      ?.riskLevel ?? 'moderate'
  )
}

function statusFromRisk(risk: RiskLevel | undefined): CoordinationOperationalStatus {
  if (risk === 'critical') return 'critical'
  if (risk === 'high' || risk === 'moderate') return 'attention'
  return 'stable'
}

export const OPERATIONAL_SITUATIONS: readonly Situation[] =
  OPERATIONAL_EVENTS.map((event) => {
    const riskLevel = event.interpretation?.riskLevel ?? 'moderate'
    return {
      id: event.id,
      coordinationId:
        SITUATION_COORDINATION[event.id] ??
        resolveCoordinationIdOrGeneral(event.sourceAreaId),
      title: event.title,
      priority: riskLevel,
      status: event.status,
      riskLevel,
      riskScore: event.interpretation?.riskScore ?? 0,
      reportedAt: event.reportedAt,
      lastActivityAt: event.lastUpdateAt ?? event.reportedAt,
    }
  })

export const OPERATIONAL_PROPAGATIONS: readonly SituationPropagation[] =
  OPERATIONAL_SITUATIONS.map((situation) => {
    const replay = IMPACT_REPLAYS[situation.id]
    const affectedCoordinationIds = [
      ...new Set(
        (replay?.steps ?? [])
          .filter((step) => step.type === 'area_impacted' && step.areaId)
          .map((step) => resolveCoordinationIdOrGeneral(step.areaId))
          .filter((coordinationId) => coordinationId !== situation.coordinationId),
      ),
    ]

    return {
      situationId: situation.id,
      originCoordinationId: situation.coordinationId,
      affectedCoordinationIds,
    }
  })

export const OPERATIONAL_IMPACTS: readonly SituationImpact[] =
  OPERATIONAL_PROPAGATIONS.flatMap((propagation) =>
    propagation.affectedCoordinationIds.map((coordinationId) => ({
      situationId: propagation.situationId,
      coordinationId,
      level: riskLevelForEvent(propagation.situationId),
      score:
        OPERATIONAL_SITUATIONS.find(
          (situation) => situation.id === propagation.situationId,
        )?.riskScore ?? 0,
    })),
  )

export const OPERATIONAL_SUMMARIES: readonly SituationSummary[] =
  OPERATIONAL_EVENTS.map((event) => ({
    situationId: event.id,
    executiveSummary:
      event.interpretation?.executiveSummary ??
      'Situación pendiente de interpretación ejecutiva.',
    affectedAreaCount: event.interpretation?.affectedAreaIds.length ?? 0,
    generatedAt: event.interpretation?.interpretedAt ?? GENERATED_AT,
  }))

export const OPERATIONAL_COORDINATIONS: readonly Coordination[] =
  OPERATIONAL_COORDINATION_IDS.map((coordinationId) => {
    const definition = getCoordination(coordinationId)
    const situations = OPERATIONAL_SITUATIONS.filter(
      (situation) => situation.coordinationId === coordinationId,
    )
    const strongest = [...situations].sort(
      (left, right) => right.riskScore - left.riskScore,
    )[0]

    return {
      ...definition,
      operationalStatus: statusFromRisk(strongest?.riskLevel),
      responsiblePeople: COORDINATION_RESPONSIBLES[coordinationId],
      situationIds: situations.map((situation) => situation.id),
      lastActivityAt: strongest?.lastActivityAt ?? GENERATED_AT,
    }
  })

const activeSituations = OPERATIONAL_SITUATIONS.filter(
  (situation) =>
    situation.status === 'open' || situation.status === 'monitoring',
)

export const OPERATIONAL_DIRECTION: OperationalDirection = {
  id: 'direction-operations',
  name: 'Dirección de Operaciones',
  shortName: 'Dirección Operaciones',
  coordinationIds: OPERATIONAL_COORDINATION_IDS,
  globalRiskScore: Math.round(
    activeSituations.reduce(
      (total, situation) => total + situation.riskScore,
      0,
    ) / Math.max(1, activeSituations.length),
  ),
  activeSituationCount: activeSituations.length,
  lastSynchronizedAt: GENERATED_AT,
}

export const OPERATIONAL_NETWORK_MOCK: OperationalNetworkSnapshot = {
  direction: OPERATIONAL_DIRECTION,
  coordinations: OPERATIONAL_COORDINATIONS,
  situations: OPERATIONAL_SITUATIONS,
  propagations: OPERATIONAL_PROPAGATIONS,
  impacts: OPERATIONAL_IMPACTS,
  summaries: OPERATIONAL_SUMMARIES,
}
