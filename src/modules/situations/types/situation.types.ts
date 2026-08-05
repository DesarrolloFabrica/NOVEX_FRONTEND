export type SituationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface CoordinationSummary {
  id: string
  code: string
  name: string
  shortName: string
  description: string | null
  color: string
  icon: string
  imageAsset: string
  displayOrder: number
  isActive: boolean
}

export interface IncidentCategorySummary {
  id: string
  code: string
  name: string
  description: string | null
}

export interface CreateSituationPayload {
  title: string
  description: string
  coordinationId?: string
  categoryId: string
  severity: SituationSeverity
  occurredAt: string
  relatedCoordinationIds?: string[]
}

export interface RelatedCoordinationResponse {
  id: string
  coordinationId: string
  coordinationCode: string
  coordinationName: string
  coordinationShortName: string
  displayOrder: number
}

export interface SituationResponse {
  id: string
  title: string
  description: string
  coordinationId: string | null
  coordinationCode: string | null
  coordinationName: string | null
  createdByUserId: string
  createdByUserName: string
  assignedUserId?: string | null
  assignedUserName?: string | null
  categoryId: string
  categoryCode: string
  categoryName: string
  severity: SituationSeverity
  status: string
  lastStatusComment?: string | null
  resolvedAt?: string | null
  closedAt?: string | null
  occurredAt: string
  createdAt: string
  updatedAt: string
  relatedCoordinations?: RelatedCoordinationResponse[]
}

export type EvidenceType =
  | 'IMAGE'
  | 'DOCUMENT'
  | 'VIDEO'
  | 'EMAIL'
  | 'LINK'
  | 'NOTE'
  | 'OTHER'

export interface CreateEvidencePayload {
  type: EvidenceType
  title: string
  description: string
  fileName?: string
  storagePath?: string
  mimeType?: string
  fileSize?: number
}

export interface SituationImpactAssessmentResponse {
  id: string
  situationId: string
  operationalSeverity: SituationSeverity
  confidence: number
  estimatedDurationMinutes: number
  summary: string
  reasoning: string
  createdAt: string
  updatedAt: string
}

export interface SituationAffectedCoordinationsResponse {
  situationId: string
  impactAssessmentId: string | null
  items: Array<{
    id: string
    coordinationId: string
    coordinationCode: string
    coordinationName: string
    impactLevel: SituationSeverity
    description: string
  }>
  total: number
}

export type ImpactCoordinationSource = 'declared' | 'simulated' | 'none'

export interface ImpactCoordinationCandidate {
  coordinationId: string
  coordinationCode: string
  coordinationName: string
  coordinationShortName: string
  impactLevel: SituationSeverity | null
  description: string | null
  source: ImpactCoordinationSource
}

export interface SituationImpactContextResponse {
  situationId: string
  originCoordinationId: string
  originCoordinationCode: string
  hasDeclaredRelated: boolean
  canSimulate: boolean
  simulationAvailable: boolean
  declaredRelated: ImpactCoordinationCandidate[]
  message: string | null
}

export interface SituationImpactSimulationResponse {
  situationId: string
  generatedAt: string
  horizonMinutes: number
  source: 'ai_assessment' | 'none'
  canSimulate: boolean
  hasDeclaredRelated: boolean
  potentialCoordinations: ImpactCoordinationCandidate[]
  message: string | null
}
