export type ActionPriority = 'immediate' | 'high' | 'medium' | 'scheduled'

export type ExecutionActionStatus =
  | 'pending'
  | 'in_progress'
  | 'executed'
  | 'not_executable'

export const EXECUTION_STATUS_LABELS: Record<ExecutionActionStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En ejecución',
  executed: 'Ejecutada',
  not_executable: 'No fue posible ejecutar',
}

export const PRIORITY_LABELS: Record<ActionPriority, string> = {
  immediate: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  scheduled: 'Baja',
}

export interface ExecutionActionImpact {
  benefitExpected: string
  indicatorToImprove: string
  estimatedTime: string
  dependency: string
  nextSuggestedAction: string
}

export interface ExecutionActionTimelineItem {
  type: string
  at: string
  description: string
  byUserName: string | null
}

export interface ExecutionAction {
  id: string
  action: string
  reason: string
  whyRecommended: string
  priority: ActionPriority
  recommendedTime: string
  executionStatus: ExecutionActionStatus
  statusNote: string | null
  observation: string | null
  suggestedAreaId: string | null
  suggestedAreaCode: string | null
  suggestedAreaName: string
  eventId: string
  eventTitle: string
  sourceAreaId: string
  sourceAreaName: string
  interpretationId: string
  generatedByAi: true
  suggestedAt: string
  riskIfNotExecuted: string
  executiveSummary: string
  expectedImpact: ExecutionActionImpact
  timeline: ExecutionActionTimelineItem[]
  createdAt: string
  updatedAt: string
  startedAt: string | null
  completedAt: string | null
}

export interface ExecutionActionsProgress {
  executed: number
  total: number
}

export interface ExecutionActionsListResult {
  items: ExecutionAction[]
  total: number
  page: number
  limit: number
  progress: ExecutionActionsProgress
}

export interface UpdateExecutionActionStatusInput {
  status: ExecutionActionStatus
  note?: string
  observation?: string
  byUserId?: string
  byUserName?: string
}

