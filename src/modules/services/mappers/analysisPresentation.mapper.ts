import type {
  AIAnalysisResult,
  SituationAIAnalysisResponse,
} from '@/modules/api/types/analysis.types'
import type {
  ActionPriority,
  AIInterpretation,
  CertaintyLevel,
  ExecutiveIntelligenceReport,
  ExecutiveUrgency,
  ImpactSeverity,
  OperationalEvent,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'
import { INTELLIGENCE_CONTRACT_VERSION } from '@/modules/operational-events/types/operational-event.types'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'
import { situationOwnerLabel } from '@/modules/situations/utils/situationOwner'

const SEVERITY_TO_RISK: Record<SituationSeverity, RiskLevel> = {
  LOW: 'low',
  MEDIUM: 'moderate',
  HIGH: 'high',
  CRITICAL: 'critical',
}

const SEVERITY_TO_IMPACT: Record<SituationSeverity, ImpactSeverity> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 4,
  CRITICAL: 5,
}

const PRIORITY_TO_ACTION: Record<SituationSeverity, ActionPriority> = {
  CRITICAL: 'immediate',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'scheduled',
}

const PRIORITY_TO_URGENCY: Record<SituationSeverity, ExecutiveUrgency> = {
  CRITICAL: 'immediate',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
}

function severityToRiskScore(severity: SituationSeverity): number {
  const scores: Record<SituationSeverity, number> = {
    LOW: 25,
    MEDIUM: 50,
    HIGH: 75,
    CRITICAL: 92,
  }
  return scores[severity]
}

function resolveCertaintyLevel(overall: number): CertaintyLevel {
  if (overall >= 0.75) return 'high'
  if (overall >= 0.45) return 'medium'
  return 'low'
}

function buildCertaintyExplanation(analysis: AIAnalysisResult): string {
  if (analysis.confidenceExplanation) {
    const supporting = analysis.confidenceExplanation.supportingFactors
      .map((factor) => `+ ${factor}`)
      .join(' · ')
    const reducing = analysis.confidenceExplanation.reducingFactors
      .map((factor) => `- ${factor}`)
      .join(' · ')
    return [supporting, reducing].filter(Boolean).join('. ')
  }

  if (analysis.confidence.factors.length === 0) {
    return analysis.impactAssessment.reasoning
  }

  return analysis.confidence.factors
    .map((factor) => `${factor.name}: ${Math.round(factor.score * 100)}%`)
    .join(' · ')
}

function mapDecisionMatrixItem(
  item: { action: string; reason: string },
  priority: ActionPriority,
  suggestedArea: string,
  recommendedTime: string,
) {
  return {
    priority,
    action: item.action,
    reason: item.reason,
    suggestedArea,
    recommendedTime,
  }
}

function estimateImpactPercentages(
  analysis: AIAnalysisResult,
): {
  internal: number
  external: number
  students: number
  affectation: number
} {
  const affectedCount = analysis.impactAssessment.affectedCoordinations.length
  const base = Math.min(95, 30 + affectedCount * 12)
  const severityBoost =
    analysis.incidentClassification.operationalSeverity === 'CRITICAL'
      ? 20
      : analysis.incidentClassification.operationalSeverity === 'HIGH'
        ? 12
        : analysis.incidentClassification.operationalSeverity === 'MEDIUM'
          ? 6
          : 0

  const affectation = Math.min(100, base + severityBoost)
  return {
    internal: Math.min(100, Math.round(affectation * 0.55)),
    external: Math.min(100, Math.round(affectation * 0.25)),
    students: Math.min(100, Math.round(affectation * 0.2)),
    affectation,
  }
}

export function mapAnalysisToExecutiveReport(
  analysis: AIAnalysisResult,
): ExecutiveIntelligenceReport {
  const severity = analysis.incidentClassification.operationalSeverity
  const riskLevel = SEVERITY_TO_RISK[severity]
  const impact = estimateImpactPercentages(analysis)
  const recommendedTime =
    analysis.executiveDecision?.recommendedActionTime ??
    (analysis.impactAssessment.estimatedDurationMinutes > 0
      ? `${analysis.impactAssessment.estimatedDurationMinutes} minutos`
      : 'Por definir')
  const suggestedArea = analysis.incidentClassification.categoryName

  return {
    contractVersion: INTELLIGENCE_CONTRACT_VERSION,
    incidentSummary: {
      executiveTitle: analysis.executiveSummary.headline,
      executiveSummary: analysis.executiveSummary.summary,
    },
    riskAssessment: {
      riskScore: analysis.riskBreakdown?.totalScore ?? severityToRiskScore(severity),
      riskLevel,
      severity: SEVERITY_TO_IMPACT[severity],
      certainty: {
        level: resolveCertaintyLevel(analysis.confidence.overall),
        percentage: Math.round(analysis.confidence.overall * 100),
        explanation: buildCertaintyExplanation(analysis),
      },
    },
    impactAnalysis: {
      internalImpactPercentage: impact.internal,
      externalImpactPercentage: impact.external,
      studentImpactPercentage: impact.students,
      affectedProcesses: analysis.executiveSummary.keyPoints,
      estimatedAffectedStudents: null,
      estimatedAffectedAreas:
        analysis.impactAssessment.affectedCoordinations.length,
    },
    affectedAreas: analysis.impactAssessment.affectedCoordinations.map(
      (coordination) => ({
        name: coordination.coordinationCode,
        affectationLevel: SEVERITY_TO_RISK[coordination.impactLevel],
        reason: coordination.description,
      }),
    ),
    rootCause: {
      detectedCauses: analysis.rootCause.summary
        ? [analysis.rootCause.summary]
        : [],
      hypotheses:
        analysis.probableCauses?.map(
          (cause) => `${cause.hypothesis} (${cause.probability}%)`,
        ) ??
        analysis.rootCause.hypotheses.map(
          (hypothesis) => hypothesis.statement,
        ),
      dependencies:
        analysis.operationalPropagation?.chain.map(
          (step) => `${step.stage}: ${step.description}`,
        ) ??
        analysis.impactAssessment.propagation.map(
          (node) => `${node.coordinationCode}: ${node.description}`,
        ),
    },
    decisionFactors: analysis.executiveSummary.keyPoints,
    recommendedActions: analysis.recommendations.map((recommendation) => ({
      priority: PRIORITY_TO_ACTION[recommendation.priority],
      action: recommendation.title,
      reason: recommendation.description,
      suggestedArea,
      recommendedTime,
    })),
    operationalConsequences: [
      ...analysis.immediateRisks.map(
        (risk) => `${risk.title}: ${risk.description}`,
      ),
      ...analysis.futureRisks.map(
        (risk) => `${risk.title} (${risk.timeframe}): ${risk.description}`,
      ),
    ],
    operationalIndicators: [],
    timelineSuggestions: analysis.criticalWindow
      ? [
          {
            horizon: analysis.criticalWindow.timeBeforeEscalation,
            checkpoint: analysis.criticalWindow.explanation,
          },
        ]
      : [],
    executiveConclusion: {
      gravity: analysis.executiveConclusion.conclusion,
      urgency: analysis.executiveDecision
        ? PRIORITY_TO_URGENCY[analysis.executiveDecision.urgencyLevel]
        : PRIORITY_TO_URGENCY[severity],
      recommendation:
        analysis.executiveDecision?.decision ??
        analysis.executiveConclusion.recommendedNextStep,
    },
    dataGaps: analysis.missingInformation.map(
      (item) => `${item.topic}: ${item.question}`,
    ),
    executiveDecision: analysis.executiveDecision
      ? {
          decision: analysis.executiveDecision.decision,
          urgencyLevel:
            PRIORITY_TO_URGENCY[analysis.executiveDecision.urgencyLevel],
          recommendedActionTime: analysis.executiveDecision.recommendedActionTime,
          initialResponsible: analysis.executiveDecision.initialResponsible,
        }
      : undefined,
    executivePriority: analysis.executivePriority,
    criticalWindow: analysis.criticalWindow,
    riskBreakdown: analysis.riskBreakdown,
    probableCauses: analysis.probableCauses,
    operationalPropagation: analysis.operationalPropagation,
    decisionMatrix: analysis.decisionMatrix
      ? {
          resolveNow: analysis.decisionMatrix.resolveNow.map((item) =>
            mapDecisionMatrixItem(item, 'immediate', suggestedArea, recommendedTime),
          ),
          resolveToday: analysis.decisionMatrix.resolveToday.map((item) =>
            mapDecisionMatrixItem(item, 'high', suggestedArea, recommendedTime),
          ),
          monitor: analysis.decisionMatrix.monitor.map((item) =>
            mapDecisionMatrixItem(item, 'medium', suggestedArea, recommendedTime),
          ),
          escalate: analysis.decisionMatrix.escalate.map((item) =>
            mapDecisionMatrixItem(item, 'scheduled', suggestedArea, recommendedTime),
          ),
        }
      : undefined,
    executiveNarrative: analysis.executiveNarrative,
    confidenceExplanation: analysis.confidenceExplanation,
  }
}

export function mapAnalysisToInterpretation(
  response: SituationAIAnalysisResponse,
  situationId: string,
): AIInterpretation {
  const { analysis } = response
  const severity = analysis.incidentClassification.operationalSeverity
  const impact = estimateImpactPercentages(analysis)

  return {
    id: response.sessionId,
    eventId: situationId,
    categoryId: analysis.incidentClassification.categoryCode,
    categoryName: analysis.incidentClassification.categoryName,
    affectedAreaIds: analysis.impactAssessment.affectedCoordinations.map(
      (item) => item.coordinationCode,
    ),
    affectedAreaNames: analysis.impactAssessment.affectedCoordinations.map(
      (item) => item.coordinationCode,
    ),
    impactSeverity: SEVERITY_TO_IMPACT[severity],
    affectationPercentage: impact.affectation,
    impactInternal: impact.internal,
    impactExternal: impact.external,
    impactStudents: impact.students,
    riskLevel: SEVERITY_TO_RISK[severity],
    riskScore: severityToRiskScore(severity),
    executiveSummary: analysis.executiveSummary.summary,
    narrative:
      analysis.executiveNarrative ?? analysis.impactAssessment.reasoning,
    suggestedIndicators: analysis.incidentClassification.tags.map(
      (tag, index) => ({
        id: `tag-${index}`,
        code: tag,
        label: tag,
        value: Math.round(analysis.confidence.overall * 100),
        unit: '%',
        suggestedByAI: true,
      }),
    ),
    detectedPatterns: analysis.incidentClassification.tags,
    modelLabel: analysis.provider || response.provider,
    interpretedAt: analysis.analyzedAt,
    confidence: analysis.confidence.overall,
    executiveReport: mapAnalysisToExecutiveReport(analysis),
  }
}

export function mapSituationToOperationalEvent(
  situation: SituationResponse,
  interpretation: AIInterpretation,
): OperationalEvent {
  return {
    id: situation.id,
    title: situation.title,
    description: situation.description,
    reportedBy: {
      id: situation.createdByUserId,
      name: situation.createdByUserName,
    },
    reportedAt: situation.occurredAt,
    sourceAreaId: situation.coordinationId ?? 'sin-coordinacion',
    sourceAreaName: situationOwnerLabel(situation),
    status: 'open',
    createdAt: situation.createdAt,
    lastUpdateAt: situation.updatedAt,
    interpretation,
    timeline: {
      eventId: situation.id,
      entries: [
        {
          id: `${situation.id}-registered`,
          eventId: situation.id,
          type: 'event_registered',
          at: situation.createdAt,
          byUserId: situation.createdByUserId,
          byUserName: situation.createdByUserName,
          description: 'Situación registrada en el sistema.',
        },
        {
          id: `${interpretation.id}-interpretation`,
          eventId: situation.id,
          type: 'interpretation_generated',
          at: interpretation.interpretedAt,
          description: 'Análisis de IA generado.',
        },
      ],
    },
  }
}
