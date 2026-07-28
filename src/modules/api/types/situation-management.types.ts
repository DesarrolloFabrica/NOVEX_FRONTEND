import type { AnalysisHistoryResponse } from '@/modules/api/analysis.api'
import type { SituationAIAnalysisResponse } from '@/modules/api/types/analysis.types'
import type { SituationRecommendation } from '@/modules/api/recommendations.api'
import type { SituationTimelineEntry } from '@/modules/api/timeline.api'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import type {
  SituationAffectedCoordinationsResponse,
  SituationImpactAssessmentResponse,
} from '@/modules/situations/types/situation.types'

export interface SituationEvidenceItem {
  id: string
  situationId: string
  uploadedByUserId: string
  uploadedByUserName: string
  type: string
  title: string
  description: string
  fileName: string | null
  storagePath: string | null
  mimeType: string | null
  fileSize: number | null
  createdAt: string
}

export interface SituationListItem {
  id: string
  title: string
  coordinationName: string
  coordinationCode: string
  categoryName: string
  severity: SituationResponse['severity']
  status: SituationResponse['status']
  createdAt: string
  updatedAt: string
  occurredAt: string
  createdByUserName: string
}

export interface SituationDossier {
  situation: SituationResponse
  analysis: SituationAIAnalysisResponse | null
  impact: SituationImpactAssessmentResponse | null
  affectedCoordinations: SituationAffectedCoordinationsResponse | null
  recommendations: SituationRecommendation[]
  timeline: SituationTimelineEntry[]
  evidences: SituationEvidenceItem[]
  analysisHistory: AnalysisHistoryResponse
}

export interface SituationManagementSummary {
  total: number
  open: number
  inProgress: number
  resolved: number
  closed: number
  critical: number
}
