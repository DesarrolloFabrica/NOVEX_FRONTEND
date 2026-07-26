// Capa: utilidades — constructor del reporte ejecutivo mock.
// Responsabilidad: producir el contrato omega.intelligence.v2 a partir del
// contexto del evento SIN inventar datos ajenos a él. Cuando Gemini real esté
// disponible, este builder se reemplaza por la respuesta del proveedor:
// el resto del sistema no cambia.

import type {
  AIInterpretation,
  CertaintyLevel,
  ExecutiveIntelligenceReport,
  ExecutiveUrgency,
  RecommendedAction,
  RiskLevel,
  TimelineSuggestion,
} from '@/modules/operational-events/types/operational-event.types'
import { INTELLIGENCE_CONTRACT_VERSION } from '@/modules/operational-events/types/operational-event.types'

/** Contexto crudo del evento: lo único sobre lo que la IA puede trabajar. */
export interface ExecutiveReportContext {
  title: string
  description: string
  observations?: string
}

const AFFECTED_PROCESSES_BY_CATEGORY: Record<string, string[]> = {
  'cat-outage': [
    'Consulta de programación académica',
    'Atención de primera línea a estudiantes',
    'Gestión de cupos y horarios',
  ],
  'cat-delay': [
    'Contratación y asignación docente',
    'Apertura de cursos del periodo',
  ],
  'cat-data-quality': [
    'Reportería ejecutiva',
    'Toma de decisiones comerciales',
  ],
  'cat-tech-failure': [
    'Escalamiento y propiedad de casos',
    'Sincronización entre plataformas',
  ],
  'cat-academic-error': [
    'Programación académica',
    'Matrícula y ajuste de horarios de estudiantes',
  ],
  'cat-dependency': [
    'Cadena de entregas entre áreas',
    'Cumplimiento de fechas comprometidas',
  ],
  'cat-reprocess': [
    'Generación y validación de informes',
    'Cumplimiento de entregas a Dirección',
  ],
  'cat-intermittence': [
    'Continuidad de evaluaciones en línea',
    'Experiencia de usuario en plataformas académicas',
  ],
  'cat-risk': [
    'Planeación operativa preventiva',
    'Gestión de aforos y logística',
  ],
}

const DEPENDENCIES_BY_CATEGORY: Record<string, string[]> = {
  'cat-outage': [
    'Infraestructura de balanceo y servidores de aplicación',
    'Monitoreo de disponibilidad de plataformas críticas',
  ],
  'cat-delay': [
    'Procesos de talento humano y contratación',
    'Calendario académico institucional',
  ],
  'cat-data-quality': [
    'Integraciones ERP y fuentes de datos primarias',
    'Reglas de reconciliación entre sistemas',
  ],
  'cat-tech-failure': [
    'Integraciones entre CRM y plataformas de servicio',
    'Equipos de desarrollo y soporte de plataforma',
  ],
  'cat-academic-error': [
    'Carga y validación de mallas curriculares',
    'Sistemas de gestión académica',
  ],
  'cat-dependency': [
    'Entregas de terceros o áreas antecesoras',
    'Acuerdos de nivel de servicio internos',
  ],
  'cat-reprocess': [
    'Controles de calidad previos a entrega',
    'Fuentes de consolidación documental',
  ],
  'cat-intermittence': [
    'Capacidad y estabilidad de la plataforma LMS',
    'Ventanas de mantenimiento y picos de concurrencia',
  ],
  'cat-risk': [
    'Capacidad instalada frente a demanda proyectada',
    'Planes de contingencia del área responsable',
  ],
}

const CERTAINTY_EXPLANATION: Record<CertaintyLevel, string> = {
  high:
    'El relato incluye síntomas verificables, horario y sistemas identificados; el patrón coincide con casos históricos equivalentes.',
  medium:
    'El contexto permite clasificar el incidente, pero faltan mediciones directas para precisar el alcance total.',
  low:
    'La información recibida es limitada; la clasificación es preliminar y debe validarse con el área reportante.',
}

function certaintyLevelFrom(confidence: number): CertaintyLevel {
  if (confidence >= 0.85) return 'high'
  if (confidence >= 0.6) return 'medium'
  return 'low'
}

function urgencyFrom(risk: RiskLevel): ExecutiveUrgency {
  switch (risk) {
    case 'critical':
      return 'immediate'
    case 'high':
      return 'high'
    case 'moderate':
      return 'medium'
    default:
      return 'low'
  }
}

function affectationLevelFor(index: number, base: RiskLevel): RiskLevel {
  // El área principal hereda el nivel del incidente; las siguientes bajan un grado.
  if (index === 0) return base
  const ladder: RiskLevel[] = ['low', 'moderate', 'high', 'critical']
  const position = ladder.indexOf(base)
  return ladder[Math.max(0, position - 1)]
}

function areaReason(index: number, categoryName: string): string {
  if (index === 0) {
    return `Área de origen del incidente; concentra la gestión directa de la ${categoryName.toLowerCase()}.`
  }
  return index === 1
    ? 'Recibe el impacto operativo inmediato y debe absorber la demanda derivada.'
    : 'Depende de los procesos afectados para cumplir sus compromisos del periodo.'
}

function buildActions(
  interpretation: AIInterpretation,
): RecommendedAction[] {
  const [primaryArea, secondaryArea] = interpretation.affectedAreaNames
  const critical =
    interpretation.riskLevel === 'critical' ||
    interpretation.riskLevel === 'high'

  const actions: RecommendedAction[] = [
    {
      priority: critical ? 'immediate' : 'high',
      action: critical
        ? 'Activar célula de respuesta y confirmar responsable único del incidente.'
        : 'Asignar responsable de seguimiento y validar el alcance reportado.',
      reason: critical
        ? 'El incidente está activo y cada hora sin dueño amplifica el impacto.'
        : 'Sin un responsable definido, el caso pierde trazabilidad y tiempos.',
      suggestedArea: primaryArea ?? interpretation.categoryName,
      recommendedTime: critical ? '30 minutos' : '2 horas',
    },
    {
      priority: critical ? 'immediate' : 'medium',
      action:
        'Comunicar estado y plan de acción a las áreas afectadas y a Dirección de Operaciones.',
      reason:
        'La comunicación temprana reduce reprocesos, tickets duplicados y presión sobre servicio.',
      suggestedArea: secondaryArea ?? primaryArea ?? 'Dirección de Operaciones',
      recommendedTime: critical ? '1 hora' : '4 horas',
    },
    {
      priority: 'high',
      action:
        'Documentar causa raíz preliminar y evidencias en el expediente de la situación.',
      reason:
        'Habilita decisiones informadas y evita depender de memoria operativa.',
      suggestedArea: primaryArea ?? 'Área reportante',
      recommendedTime: '24 horas',
    },
    {
      priority: 'scheduled',
      action:
        'Definir medida preventiva para evitar recurrencia y registrarla como compromiso.',
      reason:
        'Los patrones detectados sugieren que el incidente puede repetirse si no se interviene la causa.',
      suggestedArea: primaryArea ?? 'Dirección de Operaciones',
      recommendedTime: '48 horas',
    },
  ]

  return actions
}

function buildConsequences(interpretation: AIInterpretation): string[] {
  const base: string[] = []
  if (interpretation.impactStudents >= 40) {
    base.push(
      'Deterioro de la experiencia estudiantil y aumento de quejas formales.',
    )
  }
  if (
    interpretation.riskLevel === 'critical' ||
    interpretation.riskLevel === 'high'
  ) {
    base.push(
      'Escalamiento del riesgo institucional si el incidente supera las 24 horas sin contención.',
      'Bloqueo de procesos dependientes en las áreas afectadas.',
    )
  } else {
    base.push(
      'Incremento gradual del riesgo si la situación se normaliza sin causa identificada.',
    )
  }
  if (interpretation.impactExternal >= 35) {
    base.push(
      'Afectación reputacional frente a aliados y terceros que consumen los servicios impactados.',
    )
  }
  base.push(
    'Reprocesos operativos y sobrecostos por atención reactiva en lugar de preventiva.',
  )
  return base
}

function buildDecisionFactors(
  interpretation: AIInterpretation,
  context: ExecutiveReportContext,
): string[] {
  const factors: string[] = []
  const text = `${context.title} ${context.description}`.toLowerCase()

  factors.push(
    `La categoría "${interpretation.categoryName}" concentra severidad ${interpretation.impactSeverity}/5 según el relato recibido.`,
  )
  if (interpretation.impactStudents >= 40) {
    factors.push(
      `Afecta directamente a estudiantes (impacto estimado ${interpretation.impactStudents}%).`,
    )
  }
  if (interpretation.affectedAreaNames.length > 1) {
    factors.push(
      `Involucra ${interpretation.affectedAreaNames.length} áreas institucionales, lo que eleva la coordinación requerida.`,
    )
  }
  if (/pico|horario|madrugada|semana/.test(text)) {
    factors.push(
      'Ocurre en una ventana horaria sensible para la operación, según el propio reporte.',
    )
  }
  if (/sistema|plataforma|lms|erp|crm|sgp|integraci/.test(text)) {
    factors.push(
      'Depende de infraestructura tecnológica crítica, lo que amplifica el efecto en cadena.',
    )
  }
  if (interpretation.detectedPatterns.length > 0) {
    factors.push(
      `Existen patrones previos relacionados: ${interpretation.detectedPatterns[0].toLowerCase()}.`,
    )
  }
  return factors
}

function buildTimeline(risk: RiskLevel): TimelineSuggestion[] {
  const critical = risk === 'critical' || risk === 'high'
  return [
    {
      horizon: '30 minutos',
      checkpoint: critical
        ? 'Confirmar responsable, canal de guerra y primer diagnóstico técnico.'
        : 'Confirmar recepción del caso y responsable de seguimiento.',
    },
    {
      horizon: '2 horas',
      checkpoint: critical
        ? 'Validar contención inicial y comunicar estado a áreas afectadas.'
        : 'Registrar alcance verificado y primeras evidencias.',
    },
    {
      horizon: '24 horas',
      checkpoint:
        'Revisar evolución de indicadores y decidir cierre, escalamiento o plan correctivo.',
    },
    {
      horizon: '48 horas',
      checkpoint:
        'Formalizar causa raíz, medida preventiva y aprendizajes en el expediente.',
    },
  ]
}

function estimateAffectedStudents(
  interpretation: AIInterpretation,
  context: ExecutiveReportContext,
): number | null {
  // Solo se estima cuando el relato evidencia afectación estudiantil directa.
  const mentionsStudents = /estudiante|matr[ií]cula|evaluaci|curso|clase/.test(
    `${context.title} ${context.description}`.toLowerCase(),
  )
  if (!mentionsStudents || interpretation.impactStudents < 20) return null
  return Math.round(interpretation.impactStudents * 24)
}

/**
 * Construye el reporte ejecutivo (contrato v2) desde la interpretación base
 * y el contexto crudo del evento. Determinista: misma entrada, misma salida.
 */
export function buildExecutiveReport(
  interpretation: AIInterpretation,
  context: ExecutiveReportContext,
): ExecutiveIntelligenceReport {
  const confidence = interpretation.confidence ?? 0.8
  const certaintyLevel = certaintyLevelFrom(confidence)
  const urgency = urgencyFrom(interpretation.riskLevel)
  const affectedStudents = estimateAffectedStudents(interpretation, context)

  const dataGaps: string[] = []
  if (affectedStudents === null) {
    dataGaps.push(
      'El relato no permite estimar un número confiable de estudiantes afectados.',
    )
  }
  if (!context.observations?.trim()) {
    dataGaps.push(
      'No se recibieron observaciones adicionales del reportante; el análisis se basa solo en el relato principal.',
    )
  }
  if (confidence < 0.85) {
    dataGaps.push(
      'Faltan mediciones directas del sistema afectado para confirmar el alcance exacto.',
    )
  }

  return {
    contractVersion: INTELLIGENCE_CONTRACT_VERSION,
    incidentSummary: {
      executiveTitle: context.title,
      executiveSummary: interpretation.executiveSummary,
    },
    riskAssessment: {
      riskScore: interpretation.riskScore,
      riskLevel: interpretation.riskLevel,
      severity: interpretation.impactSeverity,
      certainty: {
        level: certaintyLevel,
        percentage: Math.round(confidence * 100),
        explanation: CERTAINTY_EXPLANATION[certaintyLevel],
      },
    },
    impactAnalysis: {
      internalImpactPercentage: interpretation.impactInternal,
      externalImpactPercentage: interpretation.impactExternal,
      studentImpactPercentage: interpretation.impactStudents,
      affectedProcesses:
        AFFECTED_PROCESSES_BY_CATEGORY[interpretation.categoryId] ?? [
          'Procesos operativos del área reportante',
        ],
      estimatedAffectedStudents: affectedStudents,
      estimatedAffectedAreas: interpretation.affectedAreaNames.length,
    },
    affectedAreas: interpretation.affectedAreaNames.map((name, index) => ({
      name,
      affectationLevel: affectationLevelFor(index, interpretation.riskLevel),
      reason: areaReason(index, interpretation.categoryName),
    })),
    rootCause: {
      detectedCauses:
        interpretation.detectedPatterns.length > 0
          ? interpretation.detectedPatterns
          : ['El relato no evidencia una causa directa verificable.'],
      hypotheses: [
        `Hipótesis principal: el incidente corresponde a ${interpretation.categoryName.toLowerCase()} originada en ${interpretation.affectedAreaNames[0] ?? 'el área reportante'}.`,
        'Hipótesis secundaria: condiciones de carga u operación inusuales amplificaron un punto débil ya existente.',
      ],
      dependencies:
        DEPENDENCIES_BY_CATEGORY[interpretation.categoryId] ?? [
          'Dependencias operativas del área reportante',
        ],
    },
    decisionFactors: buildDecisionFactors(interpretation, context),
    recommendedActions: buildActions(interpretation),
    operationalConsequences: buildConsequences(interpretation),
    operationalIndicators: interpretation.suggestedIndicators.map(
      (indicator) => ({
        name: indicator.label,
        explanation:
          indicator.direction === 'higher_is_better'
            ? `Mide la recuperación del servicio: debe subir a medida que la situación se controla.`
            : `Mide la presión del incidente: si sube, la situación se está deteriorando.`,
        unit: indicator.unit ?? 'valor',
        suggestedValue: indicator.value,
        trend:
          indicator.direction === 'higher_is_better' ? 'up' : 'down',
      }),
    ),
    timelineSuggestions: buildTimeline(interpretation.riskLevel),
    executiveConclusion: {
      gravity:
        interpretation.riskLevel === 'critical'
          ? 'Situación crítica activa con impacto transversal confirmado.'
          : interpretation.riskLevel === 'high'
            ? 'Situación de alta gravedad que compromete metas del periodo.'
            : interpretation.riskLevel === 'moderate'
              ? 'Situación moderada, controlable con gestión oportuna.'
              : 'Situación de baja gravedad, sin impacto estructural.',
      urgency,
      recommendation:
        urgency === 'immediate'
          ? 'Intervenir de inmediato con célula de respuesta y seguimiento horario hasta contención.'
          : urgency === 'high'
            ? 'Priorizar en la agenda del día: asignar responsable y plan con hitos verificables.'
            : urgency === 'medium'
              ? 'Gestionar dentro del ciclo operativo normal con seguimiento en 24-48 horas.'
              : 'Registrar, monitorear y cerrar con medida preventiva documentada.',
    },
    dataGaps,
  }
}
