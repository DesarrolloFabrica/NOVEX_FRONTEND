export type SituationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

/** Tipo de registro. Independiente de la categoría de incidente. */
export type SituationReportKind = 'INTERNAL' | 'INTER_COORDINATION'

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
  isSelectable: boolean
  icon: string
}

export interface CreateSituationPayload {
  title: string
  description: string
  /** Obligatorio: el backend ya no asume INTERNAL por omisión. */
  reportKind: SituationReportKind
  /** Coordinación RESPONSABLE. Obligatoria en ambos tipos. */
  coordinationId: string
  /** Coordinación AFECTADA (obligatoria en INTER). */
  affectedCoordinationId?: string
  /** Obligatoria en INTERNAL; omitida en INTER. */
  categoryId?: string
  severity: SituationSeverity
  occurredAt: string
  affectedProcess?: string
  pendingDelivery?: string
  relatedCoordinationIds?: string[]
  /** Solo INTERNAL, opcional. Sin fecha propia: ocurre con el problema. */
  initialConsequence?: { description: string }
}

/** Origen de un nivel de severidad. */
export type SituationSeverityChangeSource = 'REPORTED' | 'AUTO_TIME'

/** Un nivel del historial de severidad (append-only en el backend). */
export interface SituationSeverityHistoryItem {
  id: string
  from: SituationSeverity | null
  to: SituationSeverity
  source: SituationSeverityChangeSource
  /** Desde cuándo rige el nivel. */
  effectiveAt: string
  /** Cuándo lo registró el sistema. */
  recordedAt: string
  policyCode: string | null
  ruleKey: string | null
}

/** Una afectación del problema (append-only). */
export interface SituationConsequenceResponse {
  id: string
  situationId: string
  description: string
  occurredAt: string
  createdAt: string
  createdByUserId: string
  createdByUserName: string
  createdByRoleName: string | null
  /** Derivada del historial en el servidor; no se persiste. */
  severityAtOccurrence: SituationSeverity | null
}

export interface CreateSituationConsequencePayload {
  description: string
  /** ISO. Por defecto, ahora (lo decide el servidor). */
  occurredAt?: string
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
  reportKind?: SituationReportKind
  coordinationId: string | null
  coordinationCode: string | null
  coordinationName: string | null
  affectedCoordinationId?: string | null
  affectedCoordinationCode?: string | null
  affectedCoordinationName?: string | null
  affectedProcess?: string | null
  pendingDelivery?: string | null
  createdByUserId: string
  createdByUserName: string
  assignedUserId?: string | null
  assignedUserName?: string | null
  categoryId: string | null
  categoryCode: string | null
  categoryName: string | null
  categoryIcon?: string | null
  /** false = categoría legacy (ya no seleccionable), solo lectura. */
  categorySelectable?: boolean | null
  /** Severidad EFECTIVA: el nivel operacional actual. */
  severity: SituationSeverity
  /** Severidad REPORTADA al registrar. Inmutable; base del SLA. */
  reportedSeverity?: SituationSeverity
  status: string
  lastStatusComment?: string | null
  resolvedAt?: string | null
  closedAt?: string | null
  dueAt?: string | null
  slaPolicyCode?: string | null
  slaBreachedAt?: string | null
  slaHealth?: 'on_track' | 'at_risk' | 'overdue' | 'closed'
  closedOnTime?: boolean | null
  occurredAt: string
  createdAt: string
  updatedAt: string
  relatedCoordinations?: RelatedCoordinationResponse[]
  /**
   * Resolución con aprendizaje, o `null`. Es null en los problemas activos y
   * también en los cerrados antes de que existiera el aprendizaje: la ausencia
   * es legítima y no se rellena con texto inventado.
   */
  resolution?: SituationResolutionSummary | null
  /**
   * Si el USUARIO DE ESTA PETICIÓN puede solucionar el problema. Lo calcula el
   * backend con la misma política que autoriza la escritura. Es una PISTA para
   * la interfaz: la autorización definitiva vuelve a aplicarse en el servidor.
   */
  canResolve?: boolean
  /**
   * Si puede avanzar OPEN → IN_PROGRESS. Independiente de `canUpdate` y
   * `canResolve`. Pista de UI; el servidor vuelve a autorizar al escribir.
   */
  canAdvanceToInProgress?: boolean
  /**
   * Si puede aplicar otras actualizaciones vía PATCH (autoría / ownership).
   * No sustituye a `canAdvanceToInProgress` para «En atención».
   */
  canUpdate?: boolean
  /**
   * Si puede registrar una afectación (autor ANALISTA o coordinador
   * responsable, problema INTERNAL activo). La interfaz NO reconstruye la
   * regla: solo lee este indicador.
   */
  canAddConsequence?: boolean
  /** Solo en el detalle: historial ascendente; la primera fila es REPORTED. */
  severityHistory?: SituationSeverityHistoryItem[]
  /** Solo en el detalle: orden por ocurrencia. */
  consequences?: SituationConsequenceResponse[]
  consequenceCount?: number
}

export interface SituationResolutionSummary {
  learning: string
  resolvedByUserId: string
  resolvedByUserName: string
  resolvedAt: string | null
  recordedAt: string
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
