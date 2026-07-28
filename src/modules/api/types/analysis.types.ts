import type { SituationSeverity } from '@/modules/situations/types/situation.types'

export type HypothesisLikelihood = 'LOW' | 'MEDIUM' | 'HIGH'
export type MissingInformationPriority = 'LOW' | 'MEDIUM' | 'HIGH'
export type ExecutivePriorityLevel = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'
export type ImpactLevel = SituationSeverity

export interface ExecutiveSummaryResult {
  headline: string
  summary: string
  keyPoints: string[]
}

export interface IncidentClassificationResult {
  categoryCode: string
  categoryName: string
  operationalSeverity: SituationSeverity
  tags: string[]
}

export interface HypothesisResult {
  statement: string
  likelihood: HypothesisLikelihood
  supportingEvidence: string[]
}

export interface RootCauseResult {
  summary: string
  hypotheses: HypothesisResult[]
}

export interface AffectedCoordinationResult {
  coordinationCode: string
  impactLevel: ImpactLevel
  description: string
}

export interface PropagationNodeResult {
  coordinationCode: string
  depth: number
  impactLevel: ImpactLevel
  description: string
}

export interface ImpactAssessmentResult {
  operationalSeverity: SituationSeverity
  confidence: number
  estimatedDurationMinutes: number
  summary: string
  reasoning: string
  affectedCoordinations: AffectedCoordinationResult[]
  propagation: PropagationNodeResult[]
}

export interface RecommendationResult {
  title: string
  description: string
  priority: SituationSeverity
}

export interface ImmediateRiskResult {
  title: string
  description: string
  severity: SituationSeverity
}

export interface FutureRiskResult {
  title: string
  description: string
  likelihood: HypothesisLikelihood
  timeframe: string
}

export interface MissingInformationResult {
  topic: string
  question: string
  priority: MissingInformationPriority
}

export interface ExecutiveConclusionResult {
  conclusion: string
  recommendedNextStep: string
}

export interface ConfidenceFactorResult {
  name: string
  score: number
}

export interface ConfidenceAssessmentResult {
  overall: number
  factors: ConfidenceFactorResult[]
}

export interface ExecutiveDecisionResult {
  decision: string
  urgencyLevel: SituationSeverity
  recommendedActionTime: string
  initialResponsible: string
}

export interface ExecutivePriorityResult {
  level: ExecutivePriorityLevel
  justification: string
}

export interface CriticalWindowResult {
  timeBeforeEscalation: string
  explanation: string
}

export interface RiskBreakdownComponentResult {
  name: string
  score: number
  explanation: string
}

export interface RiskBreakdownResult {
  totalScore: number
  components: RiskBreakdownComponentResult[]
}

export interface ProbableCauseResult {
  hypothesis: string
  probability: number
  justification: string
}

export interface PropagationChainStepResult {
  stage: string
  description: string
}

export interface OperationalPropagationResult {
  chain: PropagationChainStepResult[]
}

export interface DecisionMatrixItemResult {
  action: string
  reason: string
}

export interface DecisionMatrixResult {
  resolveNow: DecisionMatrixItemResult[]
  resolveToday: DecisionMatrixItemResult[]
  monitor: DecisionMatrixItemResult[]
  escalate: DecisionMatrixItemResult[]
}

export interface ConfidenceExplanationResult {
  supportingFactors: string[]
  reducingFactors: string[]
}

export interface AIAnalysisResult {
  schemaVersion: string
  analyzedAt: string
  provider: string
  executiveSummary: ExecutiveSummaryResult
  incidentClassification: IncidentClassificationResult
  rootCause: RootCauseResult
  impactAssessment: ImpactAssessmentResult
  recommendations: RecommendationResult[]
  immediateRisks: ImmediateRiskResult[]
  futureRisks: FutureRiskResult[]
  missingInformation: MissingInformationResult[]
  executiveConclusion: ExecutiveConclusionResult
  confidence: ConfidenceAssessmentResult
  executiveDecision?: ExecutiveDecisionResult
  executivePriority?: ExecutivePriorityResult
  criticalWindow?: CriticalWindowResult
  riskBreakdown?: RiskBreakdownResult
  probableCauses?: ProbableCauseResult[]
  operationalPropagation?: OperationalPropagationResult
  decisionMatrix?: DecisionMatrixResult
  executiveNarrative?: string
  confidenceExplanation?: ConfidenceExplanationResult
}

export interface SituationAIAnalysisResponse {
  situationId: string
  sessionId: string
  analysisVersion: number
  isLatest: boolean
  provider: string
  analysis: AIAnalysisResult
  createdAt: string
  updatedAt: string
}

export interface ExecuteAIAnalysisResponse {
  situationId: string
  sessionId: string
  analysisVersion: number
  isLatest: boolean
  createdAt: string
  confidence: number
  analysis: AIAnalysisResult
}
