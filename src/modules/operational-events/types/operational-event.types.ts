// Capa: dominio (tipos) del módulo "operational-events".
// Responsabilidad: contratos de Visión general.
// Sin lógica: son el contrato que consumen servicios, reducers, motor y selectores.
//
// Este módulo convive temporalmente con "commitments". No lo reemplaza.

/** Ciclo de vida de un evento operacional reportado. */
export type OperationalEventStatus =
  | 'open'
  | 'monitoring'
  | 'resolved'
  | 'archived'

/**
 * Severidad de impacto operacional en escala 1..5.
 * Entrada típica de la interpretación IA y del motor de métricas.
 */
export type ImpactSeverity = 1 | 2 | 3 | 4 | 5

/** Nivel cualitativo de riesgo derivado de la interpretación. */
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical'

/**
 * Semáforo del entorno operacional (compatible conceptualmente con la Sala).
 * El motor lo deriva a partir de eventos e interpretaciones.
 */
export type OperationalEnvironmentStatus =
  | 'pending'
  | 'healthy'
  | 'attention'
  | 'critical'

/** Actor que reporta o interviene sobre un evento. */
export interface OperationalActor {
  id: string
  name: string
}

/**
 * OperationalArea — ámbito institucional monitoreado.
 *
 * Propósito: contextualizar origen y afectación de eventos.
 * Responsabilidad: catálogo de áreas de la Dirección de Operaciones
 * (operativas o agregador global). Independiente del módulo "areas"
 * legado, aunque reutiliza los mismos identificadores institucionales
 * para facilitar la convivencia.
 */
export interface OperationalArea {
  /** Identificador estable e interno. */
  id: string
  /** Código corto/operativo (siglas). */
  code: string
  /** Nombre oficial visible en la interfaz. */
  name: string
  /** Alcance opcional del área. */
  description?: string
  /**
   * Área agregadora (p. ej. Visión General Operaciones).
   * No genera eventos propios; consolida métricas de áreas operativas.
   */
  isGlobal?: boolean
}

/**
 * IncidentCategory — taxonomía estable de problemas operacionales.
 *
 * Propósito: clasificar eventos de forma agregable (incidentes, retrasos,
 * fallas, reprocesos, etc.).
 * Responsabilidad: vocabulario cerrado que la IA debe respetar al interpretar.
 */
export interface IncidentCategory {
  id: string
  code: string
  name: string
  description?: string
}

/**
 * OperationalIndicator — KPI operacional sugerido o materializado.
 *
 * Propósito: expresar mediciones que el tablero puede mostrar.
 * Responsabilidad: valor numérico etiquetado; suele nacer como sugerencia
 * de la IA y luego materializarse en DashboardMetrics.
 */
export interface OperationalIndicator {
  id: string
  /** Código corto estable (p. ej. EVT_OPEN_CRITICAL). */
  code: string
  /** Etiqueta legible para dirección. */
  label: string
  /** Valor numérico actual o sugerido. */
  value: number
  /** Unidad opcional (%, horas, conteo…). */
  unit?: string
  /** Orientación semántica del indicador. */
  direction?: 'higher_is_worse' | 'higher_is_better'
  /** true si proviene de una sugerencia de interpretación IA. */
  suggestedByAI: boolean
}

// ---------------------------------------------------------------------------
// CONTRATO DEFINITIVO DE INTELIGENCIA OPERACIONAL — novex.intelligence.v2
//
// La IA no clasifica incidentes: asiste decisiones. Este contrato responde
// las preguntas de un Director de Operaciones. Cuando se conecte Gemini real,
// el proveedor deberá producir exactamente esta estructura (vía backend).
// ---------------------------------------------------------------------------

/** Versión estable del contrato de inteligencia. */
export const INTELLIGENCE_CONTRACT_VERSION = 'novex.intelligence.v2'

export type IntelligenceContractVersion = typeof INTELLIGENCE_CONTRACT_VERSION

export function isSupportedIntelligenceContractVersion(
  version: string | undefined | null,
): version is IntelligenceContractVersion {
  return version === INTELLIGENCE_CONTRACT_VERSION
}

/** Nivel cualitativo de certeza del análisis (reemplaza "Confianza IA"). */
export type CertaintyLevel = 'low' | 'medium' | 'high'

/** Prioridad de una acción recomendada. */
export type ActionPriority = 'immediate' | 'high' | 'medium' | 'scheduled'

/** Tendencia esperada de un indicador operacional. */
export type IndicatorTrend = 'up' | 'down' | 'stable'

/** Urgencia institucional expresada en la conclusión ejecutiva. */
export type ExecutiveUrgency = 'immediate' | 'high' | 'medium' | 'low'

/** Prioridad ejecutiva del incidente (inteligencia operacional v2). */
export type ExecutivePriorityLevel = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'

/** 1. ¿Qué ocurrió? */
export interface IncidentSummary {
  /** Título ejecutivo normalizado por la IA (no el título crudo). */
  executiveTitle: string
  /** Resumen dirigido a dirección (2-3 oraciones, sin tecnicismos). */
  executiveSummary: string
}

/** 2. ¿Qué tan grave es? — incluye nivel de certeza con explicación. */
export interface RiskAssessment {
  riskScore: number
  riskLevel: RiskLevel
  severity: ImpactSeverity
  certainty: {
    level: CertaintyLevel
    /** 0..100 para lectura directa en UI. */
    percentage: number
    /** Por qué la IA tiene (o no) certeza: fuentes, señales, vacíos. */
    explanation: string
  }
}

/** 4. ¿A quién afecta? — análisis cuantitativo. */
export interface ImpactAnalysis {
  internalImpactPercentage: number
  externalImpactPercentage: number
  studentImpactPercentage: number
  /** Procesos institucionales interrumpidos o degradados. */
  affectedProcesses: string[]
  /** null cuando la IA no puede inferirlo del contexto. */
  estimatedAffectedStudents: number | null
  estimatedAffectedAreas: number
}

/** Área afectada con nivel y motivo (lista completa). */
export interface AffectedAreaAssessment {
  name: string
  affectationLevel: RiskLevel
  reason: string
}

/** ¿Por qué ocurrió? — solo sobre el contexto recibido, sin inventar. */
export interface RootCauseAnalysis {
  /** Causas con evidencia directa en el relato/observaciones. */
  detectedCauses: string[]
  /** Hipótesis plausibles, marcadas como tales. */
  hypotheses: string[]
  /** Dependencias técnicas u organizacionales involucradas. */
  dependencies: string[]
}

/** 5. ¿Por qué la IA llegó a esa conclusión? — factores de decisión. */
export type DecisionFactors = string[]

/** 6. ¿Qué debería hacerse ahora? — acción priorizada. */
export interface RecommendedAction {
  priority: ActionPriority
  action: string
  reason: string
  suggestedArea: string
  /** Ventana recomendada de ejecución (ej. "30 minutos", "24 horas"). */
  recommendedTime: string
}

/** 8. ¿Qué indicadores se verán afectados? */
export interface ExecutiveIndicator {
  name: string
  explanation: string
  unit: string
  suggestedValue: number
  trend: IndicatorTrend
}

/** 9. Hito de seguimiento sugerido. */
export interface TimelineSuggestion {
  /** Horizonte temporal (ej. "30 minutos", "2 horas", "24 horas"). */
  horizon: string
  checkpoint: string
}

/** 10. Conclusión final dirigida al Director. */
export interface ExecutiveConclusion {
  gravity: string
  urgency: ExecutiveUrgency
  recommendation: string
}

/**
 * ExecutiveIntelligenceReport — respuesta definitiva del Asistente Ejecutivo
 * Operacional. Todo proveedor de IA (mock o Gemini real) produce esta forma.
 */
export interface ExecutiveIntelligenceReport {
  contractVersion: IntelligenceContractVersion
  incidentSummary: IncidentSummary
  riskAssessment: RiskAssessment
  impactAnalysis: ImpactAnalysis
  affectedAreas: AffectedAreaAssessment[]
  rootCause: RootCauseAnalysis
  decisionFactors: DecisionFactors
  recommendedActions: RecommendedAction[]
  /** 7. ¿Qué pasa si nadie actúa? */
  operationalConsequences: string[]
  operationalIndicators: ExecutiveIndicator[]
  timelineSuggestions: TimelineSuggestion[]
  executiveConclusion: ExecutiveConclusion
  /** Vacíos de información que la IA declara explícitamente (no inventa). */
  dataGaps: string[]
  /** Decisión ejecutiva inmediata (inteligencia operacional v2). */
  executiveDecision?: {
    decision: string
    urgencyLevel: ExecutiveUrgency
    recommendedActionTime: string
    initialResponsible: string
  }
  /** Prioridad institucional del incidente. */
  executivePriority?: {
    level: ExecutivePriorityLevel
    justification: string
  }
  /** Ventana crítica antes de escalamiento del impacto. */
  criticalWindow?: {
    timeBeforeEscalation: string
    explanation: string
  }
  /** Desglose compuesto del riesgo. */
  riskBreakdown?: {
    totalScore: number
    components: Array<{
      name: string
      score: number
      explanation: string
    }>
  }
  /** Hipótesis causales con probabilidad. */
  probableCauses?: Array<{
    hypothesis: string
    probability: number
    justification: string
  }>
  /** Cadena de propagación operacional. */
  operationalPropagation?: {
    chain: Array<{
      stage: string
      description: string
    }>
  }
  /** Matriz de decisiones clasificadas. */
  decisionMatrix?: {
    resolveNow: RecommendedAction[]
    resolveToday: RecommendedAction[]
    monitor: RecommendedAction[]
    escalate: RecommendedAction[]
  }
  /** Lectura ejecutiva analítica (no repetir resumen). */
  executiveNarrative?: string
  /** Explicación cualitativa de la confianza. */
  confidenceExplanation?: {
    supportingFactors: string[]
    reducingFactors: string[]
  }
}

/**
 * AIInterpretation — resultado estructurado de la capa de inteligencia.
 *
 * Propósito: convertir el relato crudo del usuario en significado operacional.
 * Responsabilidad: categoría, áreas afectadas, impacto, afectación, riesgo,
 * resumen ejecutivo, narrativa, indicadores sugeridos y patrones.
 * En esta fase la interpretación es mock (sin Gemini).
 */
export interface AIInterpretation {
  id: string
  /** Evento al que pertenece esta interpretación. */
  eventId: string
  /** Categoría asignada (referencia). */
  categoryId: string
  /** Nombre denormalizado de la categoría. */
  categoryName: string
  /** Áreas afectadas (pueden diferir del área reportante). */
  affectedAreaIds: string[]
  /** Nombres denormalizados de áreas afectadas. */
  affectedAreaNames: string[]
  /** Severidad de impacto 1..5. */
  impactSeverity: ImpactSeverity
  /** Porcentaje de afectación operacional estimado (0..100). */
  affectationPercentage: number
  /**
   * Impacto interno (0..100): procesos, equipos y operación institucional.
   * Derivado por la IA; el usuario no lo captura.
   */
  impactInternal: number
  /**
   * Impacto externo (0..100): aliados, proveedores, clientes B2B, reputación.
   */
  impactExternal: number
  /**
   * Impacto en estudiantes (0..100): experiencia académica y continuidad.
   */
  impactStudents: number
  /** Nivel cualitativo de riesgo. */
  riskLevel: RiskLevel
  /** Puntaje de riesgo (0..100). */
  riskScore: number
  /** Resumen ejecutivo breve. */
  executiveSummary: string
  /** Narrativa extendida para el tablero. */
  narrative: string
  /** Indicadores sugeridos por la interpretación. */
  suggestedIndicators: OperationalIndicator[]
  /** Patrones detectados en texto libre (fase mock). */
  detectedPatterns: string[]
  /**
   * Etiqueta del modelo o fuente de interpretación.
   * En mocks: "gemini-mock". Más adelante: versión real de Gemini.
   */
  modelLabel: string
  /** Marca de tiempo de la interpretación (ISO 8601). */
  interpretedAt: string
  /** Confianza opcional 0..1. */
  confidence?: number
  /**
   * Reporte ejecutivo definitivo (contrato novex.intelligence.v2).
   * Opcional por compatibilidad: interpretaciones antiguas no lo traen.
   * El proveedor de IA (mock hoy, Gemini mañana) siempre debe producirlo.
   */
  executiveReport?: ExecutiveIntelligenceReport
}

/**
 * OperationalTimelineEntry — unidad atómica de memoria del evento.
 *
 * Propósito: auditar el ciclo de vida (alta, interpretación, cambio de estado).
 */
export interface OperationalTimelineEntry {
  id: string
  eventId: string
  type:
    | 'event_registered'
    | 'interpretation_generated'
    | 'status_change'
    | 'note'
  at: string
  byUserId?: string
  byUserName?: string
  description: string
}

/**
 * OperationalTimeline — historial ordenado de un evento.
 *
 * Propósito: mantener la memoria operacional del expediente.
 * Responsabilidad: agrupar entradas de trazabilidad asociadas a un eventId.
 */
export interface OperationalTimeline {
  eventId: string
  entries: OperationalTimelineEntry[]
}

/**
 * OperationalEvent — unidad atómica que registra el usuario.
 *
 * Propósito: capturar el hecho crudo (problema, incidente, retraso, falla…).
 * Responsabilidad: persistir lo reportado y enlazar la interpretación IA
 * y el timeline. El usuario no clasifica: solo describe lo ocurrido.
 */
export interface OperationalEvent {
  /** Identificador estable e interno. */
  id: string
  /** Título corto del evento. */
  title: string
  /** Relato crudo reportado por el usuario. */
  description: string
  /** Quién reportó el evento. */
  reportedBy: OperationalActor
  /** Momento del reporte (ISO 8601). */
  reportedAt: string
  /** Área que reporta (origen). */
  sourceAreaId: string
  /** Nombre denormalizado del área origen. */
  sourceAreaName: string
  /** Estado del ciclo de vida. */
  status: OperationalEventStatus
  /**
   * Interpretación IA vigente.
   * En mocks siempre presente; en runtime futuro puede ser null
   * mientras se genera.
   */
  interpretation: AIInterpretation | null
  /** Historial del evento. */
  timeline: OperationalTimeline
  /** Observaciones opcionales del reportante (texto libre). */
  observations?: string
  /**
   * Nombres de adjuntos (placeholder de captura).
   * No hay carga real de archivos en esta fase.
   */
  attachmentNames?: string[]
  /** Fecha de creación del registro (ISO 8601). */
  createdAt: string
  /** Última actualización (ISO 8601). */
  lastUpdateAt?: string
}

/**
 * OperationalEventDraft — captura cruda del wizard (Paso 1).
 *
 * Propósito: lo que el usuario escribe antes de la interpretación IA.
 * No incluye categoría, impactos ni riesgo (eso lo produce la IA).
 */
export interface OperationalEventDraft {
  title: string
  description: string
  coordinationId: string
  /** Compatibilidad con mocks históricos. */
  sourceAreaId?: string
  /** Fecha del evento (YYYY-MM-DD o ISO 8601). */
  reportedAt: string
  observations?: string
  /** Nombres de archivos seleccionados (sin upload real). */
  attachmentNames?: string[]
}

/** Agregado de conteo por categoría para el tablero. */
export interface CategoryMetricBreakdown {
  categoryId: string
  categoryName: string
  /** Total de eventos interpretados en la categoría. */
  count: number
  /** Eventos activos (open/monitoring) en la categoría. */
  activeCount: number
  /** Eventos críticos activos en la categoría. */
  criticalCount: number
}

/** Agregado de riesgo/apertura por área para el tablero. */
export interface AreaMetricBreakdown {
  areaId: string
  areaName: string
  /** Eventos activos que afectan al área. */
  openCount: number
  /** Total de eventos (cualquier estado) que afectan al área. */
  eventCount: number
  /** Eventos críticos activos que afectan al área. */
  criticalCount: number
  /** Riesgo promedio de las interpretaciones asociadas. */
  averageRiskScore: number
}

/**
 * Tendencia general del periodo (determinista, sin IA).
 * Se estima comparando mitades temporales del conjunto de eventos.
 */
export type OperationalTrend =
  | 'improving'
  | 'stable'
  | 'deteriorating'
  | 'insufficient_data'

/**
 * Indicador consolidado del tablero.
 * Puede nacer del motor (agregados) o de sugerencias IA deduplicadas.
 */
export interface ConsolidatedIndicator {
  code: string
  label: string
  value: number
  unit?: string
  direction?: 'higher_is_worse' | 'higher_is_better'
  source: 'engine' | 'ai_suggested'
}

/**
 * DashboardMetrics — fotografía viva del tablero ejecutivo.
 *
 * Propósito: representar el estado operacional consolidado.
 * Responsabilidad: totales, distribuciones, impactos, riesgo, tendencia,
 * indicadores, estado de sala y narrativa ejecutiva determinista.
 * Lo calcula el Motor de Inteligencia Operacional a partir de eventos.
 */
export interface DashboardMetrics {
  totalEvents: number
  openCount: number
  monitoringCount: number
  resolvedCount: number
  archivedCount: number
  averageAffectationPercentage: number
  averageRiskScore: number
  criticalCount: number
  highRiskCount: number
  /** Impacto promedio interno (0..100) sobre eventos activos interpretados. */
  averageImpactInternal: number
  /** Impacto promedio externo (0..100). */
  averageImpactExternal: number
  /** Impacto promedio sobre estudiantes (0..100). */
  averageImpactStudents: number
  /** Nivel cualitativo de riesgo operacional consolidado. */
  operationalRiskLevel: RiskLevel
  /** Tendencia general del periodo. */
  trend: OperationalTrend
  byCategory: CategoryMetricBreakdown[]
  byArea: AreaMetricBreakdown[]
  /** Indicadores consolidados listos para el tablero. */
  consolidatedIndicators: ConsolidatedIndicator[]
  /**
   * Narrativa ejecutiva determinista (sin IA).
   * Se construye con reglas a partir de los agregados.
   */
  executiveNarrative: string
  /** Área con mayor concentración de eventos activos (si existe). */
  dominantAreaName: string | null
  /** Categoría predominante por volumen (si existe). */
  dominantCategoryName: string | null
  /** Estado general de la sala (semáforo ambiental). */
  environment: OperationalEnvironmentStatus
  /** Marca de generación de la fotografía (ISO 8601). */
  generatedAt: string
}
