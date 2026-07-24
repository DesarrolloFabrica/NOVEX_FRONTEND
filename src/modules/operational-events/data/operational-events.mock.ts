// Capa: datos (mock) del módulo "operational-events".
// Responsabilidad: proveer eventos operacionales de ejemplo con interpretación
// IA simulada. Más adelante este origen se reemplazará por API + Gemini.
//
// Reglas aplicadas a estos mocks:
// - Representan incidentes reales (no compromisos).
// - Cada evento incluye AIInterpretation simulada (gemini-mock).
// - El área global no genera eventos propios.
// - Cobertura de varias áreas y categorías del catálogo.

import { INCIDENT_CATEGORIES } from '@/modules/operational-events/data/incident-categories.mock'
import { OPERATIONAL_AREAS_CATALOG } from '@/modules/operational-events/data/operational-areas.mock'
import type {
  AIInterpretation,
  ImpactSeverity,
  OperationalActor,
  OperationalEvent,
  OperationalEventStatus,
  OperationalIndicator,
  OperationalTimeline,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'
import {
  resolveIncidentCategoryName,
  resolveOperationalAreaName,
} from '@/modules/operational-events/utils/operationalArea.utils'

/** Semilla mínima para construir un evento con su interpretación mock. */
interface OperationalEventSeed {
  title: string
  description: string
  sourceAreaId: string
  status: OperationalEventStatus
  reportedBy: OperationalActor
  reportedAt: string
  categoryId: string
  affectedAreaIds: string[]
  impactSeverity: ImpactSeverity
  affectationPercentage: number
  impactInternal?: number
  impactExternal?: number
  impactStudents?: number
  riskLevel: RiskLevel
  riskScore: number
  executiveSummary: string
  narrative: string
  suggestedIndicators: Omit<OperationalIndicator, 'id' | 'suggestedByAI'>[]
  detectedPatterns: string[]
  confidence?: number
}

let sequence = 0

function buildIndicators(
  eventId: string,
  seeds: Omit<OperationalIndicator, 'id' | 'suggestedByAI'>[],
): OperationalIndicator[] {
  return seeds.map((seed, index) => ({
    ...seed,
    id: `ind-${eventId}-${index + 1}`,
    suggestedByAI: true,
  }))
}

function buildInterpretation(
  eventId: string,
  seed: OperationalEventSeed,
): AIInterpretation {
  const affectedAreaNames = seed.affectedAreaIds.map((areaId) =>
    resolveOperationalAreaName(OPERATIONAL_AREAS_CATALOG, areaId),
  )

  return {
    id: `ai-${eventId}`,
    eventId,
    categoryId: seed.categoryId,
    categoryName: resolveIncidentCategoryName(
      INCIDENT_CATEGORIES,
      seed.categoryId,
    ),
    affectedAreaIds: seed.affectedAreaIds,
    affectedAreaNames,
    impactSeverity: seed.impactSeverity,
    affectationPercentage: seed.affectationPercentage,
    impactInternal:
      seed.impactInternal ?? seed.affectationPercentage,
    impactExternal:
      seed.impactExternal ??
      Math.round(seed.affectationPercentage * 0.55),
    impactStudents:
      seed.impactStudents ??
      Math.round(seed.affectationPercentage * 0.72),
    riskLevel: seed.riskLevel,
    riskScore: seed.riskScore,
    executiveSummary: seed.executiveSummary,
    narrative: seed.narrative,
    suggestedIndicators: buildIndicators(eventId, seed.suggestedIndicators),
    detectedPatterns: seed.detectedPatterns,
    modelLabel: 'gemini-mock',
    interpretedAt: seed.reportedAt,
    confidence: seed.confidence ?? 0.86,
  }
}

function buildTimeline(
  eventId: string,
  seed: OperationalEventSeed,
): OperationalTimeline {
  return {
    eventId,
    entries: [
      {
        id: `tl-${eventId}-1`,
        eventId,
        type: 'event_registered',
        at: seed.reportedAt,
        byUserId: seed.reportedBy.id,
        byUserName: seed.reportedBy.name,
        description: `Evento registrado por ${seed.reportedBy.name}.`,
      },
      {
        id: `tl-${eventId}-2`,
        eventId,
        type: 'interpretation_generated',
        at: seed.reportedAt,
        description:
          'Interpretación generada por gemini-mock (simulación local).',
      },
    ],
  }
}

function buildEvent(seed: OperationalEventSeed): OperationalEvent {
  sequence += 1
  const id = `evt-${String(sequence).padStart(3, '0')}`
  const interpretation = buildInterpretation(id, seed)

  return {
    id,
    title: seed.title,
    description: seed.description,
    reportedBy: seed.reportedBy,
    reportedAt: seed.reportedAt,
    sourceAreaId: seed.sourceAreaId,
    sourceAreaName: resolveOperationalAreaName(
      OPERATIONAL_AREAS_CATALOG,
      seed.sourceAreaId,
    ),
    status: seed.status,
    interpretation,
    timeline: buildTimeline(id, seed),
    createdAt: seed.reportedAt,
    lastUpdateAt: seed.reportedAt,
  }
}

const SEEDS: OperationalEventSeed[] = [
  {
    title: 'Caída total del SGP en horario pico',
    description:
      'El Sistema de Gestión de Programas (SGP) dejó de responder desde las 07:40. Estudiantes y coordinación no pueden consultar horarios ni cupos. Se observan timeouts en el balanceador.',
    sourceAreaId: 'area-fabrica-desarrollo',
    status: 'open',
    reportedBy: { id: 'user-andres', name: 'Andrés Rivas' },
    reportedAt: '2026-07-22T12:45:00.000Z',
    categoryId: 'cat-outage',
    affectedAreaIds: [
      'area-fabrica-desarrollo',
      'area-operacion-academica',
      'area-servicio',
    ],
    impactSeverity: 5,
    affectationPercentage: 78,
    riskLevel: 'critical',
    riskScore: 88,
    executiveSummary:
      'Caída crítica del SGP con afectación transversal a operación académica y servicio.',
    narrative:
      'La indisponibilidad del SGP en horario pico interrumpe la consulta de programación y genera fila de tickets en servicio. La interpretación prioriza restauración del balanceador y comunicación a áreas dependientes.',
    suggestedIndicators: [
      {
        code: 'SGP_AVAILABILITY',
        label: 'Disponibilidad SGP',
        value: 22,
        unit: '%',
        direction: 'higher_is_better',
      },
      {
        code: 'OPEN_CRITICAL_EVENTS',
        label: 'Eventos críticos abiertos',
        value: 1,
        unit: 'count',
        direction: 'higher_is_worse',
      },
    ],
    detectedPatterns: [
      'Caídas SGP recurrentes en ventana 07:00–09:00',
      'Correlación con picos de matrícula',
    ],
    confidence: 0.92,
  },
  {
    title: 'Retraso en contratación de docentes de refuerzo',
    description:
      'El proceso de contratación de docentes de refuerzo para el periodo lleva 12 días de desfase. Hay cursos sin titular asignado y riesgo de apertura incompleta.',
    sourceAreaId: 'area-operacion-academica',
    status: 'monitoring',
    reportedBy: { id: 'user-laura', name: 'Laura Gómez' },
    reportedAt: '2026-07-21T15:10:00.000Z',
    categoryId: 'cat-delay',
    affectedAreaIds: [
      'area-operacion-academica',
      'area-desarrollo-profesional',
    ],
    impactSeverity: 4,
    affectationPercentage: 55,
    riskLevel: 'high',
    riskScore: 67,
    executiveSummary:
      'Retraso contractual que compromete la cobertura docente de cursos críticos.',
    narrative:
      'El desfase de 12 días en contratación eleva el riesgo de inicio de clases sin titular. Se recomienda escalar a Dirección y activar plan de cobertura temporal.',
    suggestedIndicators: [
      {
        code: 'HIRING_DELAY_DAYS',
        label: 'Días de retraso en contratación',
        value: 12,
        unit: 'days',
        direction: 'higher_is_worse',
      },
      {
        code: 'COURSES_WITHOUT_LEAD',
        label: 'Cursos sin titular',
        value: 7,
        unit: 'count',
        direction: 'higher_is_worse',
      },
    ],
    detectedPatterns: [
      'Retrasos de contratación concentrados en inicio de periodo',
    ],
    confidence: 0.88,
  },
  {
    title: 'Errores masivos en programación académica del semestre',
    description:
      'Se detectaron cruces de horario y cupos duplicados en 34 cursos tras la última carga de malla. Coordinación académica recibe reportes de estudiantes desplazados.',
    sourceAreaId: 'area-operacion-academica',
    status: 'open',
    reportedBy: { id: 'user-carlos', name: 'Carlos Méndez' },
    reportedAt: '2026-07-20T18:30:00.000Z',
    categoryId: 'cat-academic-error',
    affectedAreaIds: [
      'area-operacion-academica',
      'area-servicio',
    ],
    impactSeverity: 4,
    affectationPercentage: 62,
    riskLevel: 'high',
    riskScore: 71,
    executiveSummary:
      'Errores de programación académica con impacto directo en experiencia estudiantil.',
    narrative:
      'La carga defectuosa de malla generó cruces y cupos inconsistentes. La IA clasifica el caso como error de programación académica con afectación alta sobre servicio al estudiante.',
    suggestedIndicators: [
      {
        code: 'SCHEDULE_CONFLICTS',
        label: 'Cursos con cruce de horario',
        value: 34,
        unit: 'count',
        direction: 'higher_is_worse',
      },
    ],
    detectedPatterns: [
      'Incidencias post-carga de malla en COA',
    ],
  },
  {
    title: 'Intermitencia en el LMS durante evaluaciones',
    description:
      'El LMS presenta cortes de 2–5 minutos cada hora desde ayer. Docentes reportan pérdida de intentos de evaluación en línea.',
    sourceAreaId: 'area-fabrica-desarrollo',
    status: 'monitoring',
    reportedBy: { id: 'user-diana', name: 'Diana Quintero' },
    reportedAt: '2026-07-19T21:05:00.000Z',
    categoryId: 'cat-intermittence',
    affectedAreaIds: [
      'area-fabrica-desarrollo',
      'area-operacion-academica',
      'area-innovacion-edu',
    ],
    impactSeverity: 3,
    affectationPercentage: 41,
    riskLevel: 'moderate',
    riskScore: 48,
    executiveSummary:
      'Intermitencia del LMS con riesgo sobre integridad de evaluaciones en curso.',
    narrative:
      'La degradación periódica del LMS afecta la continuidad de evaluaciones. Se sugiere monitoreo intensivo y ventana de mantenimiento controlada.',
    suggestedIndicators: [
      {
        code: 'LMS_INTERRUPTIONS_PER_HOUR',
        label: 'Cortes LMS por hora',
        value: 1,
        unit: 'count',
        direction: 'higher_is_worse',
      },
    ],
    detectedPatterns: [
      'Intermitencias LMS alineadas a ventanas de evaluación',
    ],
  },
  {
    title: 'Calidad de datos inconsistente en reporte B2B',
    description:
      'El tablero comercial B2B muestra montos y estados de contrato desalineados con el ERP. Hay 18 cuentas con datos contradictorios.',
    sourceAreaId: 'area-b2b',
    status: 'open',
    reportedBy: { id: 'user-monica', name: 'Mónica Salas' },
    reportedAt: '2026-07-18T14:20:00.000Z',
    categoryId: 'cat-data-quality',
    affectedAreaIds: ['area-b2b', 'area-fabrica-desarrollo'],
    impactSeverity: 3,
    affectationPercentage: 36,
    riskLevel: 'moderate',
    riskScore: 44,
    executiveSummary:
      'Inconsistencia de datos comerciales que distorsiona la lectura ejecutiva B2B.',
    narrative:
      'La desalineación ERP–tablero compromete decisiones comerciales. La interpretación recomienda congelar indicadores afectados hasta reconciliar fuentes.',
    suggestedIndicators: [
      {
        code: 'B2B_DATA_MISMATCHES',
        label: 'Cuentas con datos contradictorios',
        value: 18,
        unit: 'count',
        direction: 'higher_is_worse',
      },
    ],
    detectedPatterns: [
      'Desalineación recurrente ERP ↔ tablero B2B',
    ],
  },
  {
    title: 'Falla en integración de tickets de servicio',
    description:
      'La cola de tickets VIP no está sincronizando con el CRM desde la madrugada. Casos escalados quedan sin propietario visible.',
    sourceAreaId: 'area-servicio',
    status: 'open',
    reportedBy: { id: 'user-natalia', name: 'Natalia Ruiz' },
    reportedAt: '2026-07-22T09:15:00.000Z',
    categoryId: 'cat-tech-failure',
    affectedAreaIds: ['area-servicio', 'area-fabrica-desarrollo'],
    impactSeverity: 4,
    affectationPercentage: 58,
    riskLevel: 'high',
    riskScore: 69,
    executiveSummary:
      'Falla tecnológica en integración de tickets con riesgo de incumplimiento de SLA VIP.',
    narrative:
      'Sin sincronización CRM, el servicio pierde trazabilidad de casos VIP. Se clasifica como falla tecnológica de alto riesgo operacional.',
    suggestedIndicators: [
      {
        code: 'VIP_UNASSIGNED_TICKETS',
        label: 'Tickets VIP sin propietario',
        value: 11,
        unit: 'count',
        direction: 'higher_is_worse',
      },
    ],
    detectedPatterns: [
      'Fallos de sync CRM en madrugada',
    ],
  },
  {
    title: 'Dependencia bloqueante con proveedor de certificación',
    description:
      'El proveedor externo no entrega cupos de certificación técnica. El plan de desarrollo profesional queda detenido para 40 colaboradores.',
    sourceAreaId: 'area-desarrollo-profesional',
    status: 'monitoring',
    reportedBy: { id: 'user-daniela', name: 'Daniela Vargas' },
    reportedAt: '2026-07-17T16:40:00.000Z',
    categoryId: 'cat-dependency',
    affectedAreaIds: ['area-desarrollo-profesional'],
    impactSeverity: 3,
    affectationPercentage: 40,
    riskLevel: 'moderate',
    riskScore: 46,
    executiveSummary:
      'Dependencia externa bloquea el plan de certificaciones del trimestre.',
    narrative:
      'La falta de cupos del proveedor detiene la ruta de certificación. Se sugiere plan B con proveedor alterno y comunicación a líderes de área.',
    suggestedIndicators: [
      {
        code: 'BLOCKED_CERTIFICATIONS',
        label: 'Colaboradores bloqueados',
        value: 40,
        unit: 'count',
        direction: 'higher_is_worse',
      },
    ],
    detectedPatterns: [
      'Dependencias externas en ventana de certificaciones',
    ],
  },
  {
    title: 'Reproceso de informe de impacto social',
    description:
      'El informe semestral de proyección social debe rehacerse por errores de consolidación de indicadores. La fecha de entrega a Dirección está en riesgo.',
    sourceAreaId: 'area-proyeccion-social',
    status: 'monitoring',
    reportedBy: { id: 'user-valeria', name: 'Valeria Ospina' },
    reportedAt: '2026-07-16T11:00:00.000Z',
    categoryId: 'cat-reprocess',
    affectedAreaIds: ['area-proyeccion-social'],
    impactSeverity: 2,
    affectationPercentage: 28,
    riskLevel: 'low',
    riskScore: 29,
    executiveSummary:
      'Reproceso documental con impacto acotado pero con fecha ejecutiva comprometida.',
    narrative:
      'Errores de consolidación obligan a reprocesar el informe. El riesgo es bajo en operación diaria, moderado en cumplimiento de entrega a Dirección.',
    suggestedIndicators: [
      {
        code: 'REPORT_REPROCESS_HOURS',
        label: 'Horas estimadas de reproceso',
        value: 16,
        unit: 'hours',
        direction: 'higher_is_worse',
      },
    ],
    detectedPatterns: [
      'Reprocesos por consolidación manual de indicadores',
    ],
  },
  {
    title: 'Riesgo de aforo insuficiente en simulacro Saber',
    description:
      'La proyección de inscritos supera la capacidad de sedes confirmadas. Si no se liberan aulas adicionales, el simulacro quedaría incompleto.',
    sourceAreaId: 'area-pruebas-saber',
    status: 'open',
    reportedBy: { id: 'user-patricia', name: 'Patricia León' },
    reportedAt: '2026-07-21T10:25:00.000Z',
    categoryId: 'cat-risk',
    affectedAreaIds: [
      'area-pruebas-saber',
      'area-operacion-academica',
    ],
    impactSeverity: 3,
    affectationPercentage: 47,
    riskLevel: 'moderate',
    riskScore: 52,
    executiveSummary:
      'Riesgo de capacidad en simulacro Saber con posible afectación de cobertura.',
    narrative:
      'El gap de aforo aún no materializa falla, pero la probabilidad es alta. Se recomienda gestión inmediata de sedes alternativas.',
    suggestedIndicators: [
      {
        code: 'SEAT_GAP',
        label: 'Cupos faltantes vs inscritos',
        value: 220,
        unit: 'count',
        direction: 'higher_is_worse',
      },
    ],
    detectedPatterns: [
      'Subestimación de aforo en simulacros masivos',
    ],
  },
  {
    title: 'Degradación del piloto de IA en aula',
    description:
      'La herramienta de IA del piloto EDU responde con latencia >8s y errores 502. Docentes suspendieron la actividad planificada.',
    sourceAreaId: 'area-innovacion-edu',
    status: 'resolved',
    reportedBy: { id: 'user-sofia', name: 'Sofía Ramírez' },
    reportedAt: '2026-07-15T13:50:00.000Z',
    categoryId: 'cat-tech-failure',
    affectedAreaIds: [
      'area-innovacion-edu',
      'area-fabrica-desarrollo',
    ],
    impactSeverity: 2,
    affectationPercentage: 25,
    riskLevel: 'low',
    riskScore: 24,
    executiveSummary:
      'Falla del piloto de IA contenida y marcada como resuelta tras mitigación.',
    narrative:
      'La degradación afectó el piloto EDU de forma acotada. Tras reinicio de workers y ajuste de timeout, el evento se considera resuelto en mocks.',
    suggestedIndicators: [
      {
        code: 'AI_PILOT_ERROR_RATE',
        label: 'Tasa de error piloto IA',
        value: 3,
        unit: '%',
        direction: 'higher_is_worse',
      },
    ],
    detectedPatterns: [
      'Latencia elevada en picos de uso del piloto',
    ],
    confidence: 0.81,
  },
]

/** Eventos operacionales de ejemplo con interpretación IA simulada. */
export const OPERATIONAL_EVENTS: OperationalEvent[] = SEEDS.map(buildEvent)
