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
