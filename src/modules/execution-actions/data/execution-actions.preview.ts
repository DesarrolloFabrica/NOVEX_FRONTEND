import type { ExecutionAction } from '@/modules/execution-actions/types/execution-action.types'

const baseTimeline: ExecutionAction['timeline'] = [
  {
    type: 'ai_generated',
    at: '2026-07-27T14:10:00.000Z',
    description: 'Acción creada por IA',
    byUserName: 'Inteligencia Operacional',
  },
]

export const PREVIEW_EXECUTION_ACTIONS: ExecutionAction[] = [
  {
    id: 'preview-action-1',
    action:
      'Ejecutar diagnóstico de disponibilidad y validar la cola de pagos antes de reabrir transacciones',
    reason:
      'Reabrir el servicio sin validar consistencia puede duplicar o perder registros de matrícula.',
    whyRecommended:
      'La indisponibilidad coincide con una ventana crítica de matrícula y ya existen transacciones incompletas. La validación técnica reduce el riesgo de reprocesos.',
    priority: 'immediate',
    recommendedTime: '30 minutos',
    executionStatus: 'pending',
    statusNote: null,
    observation: null,
    suggestedAreaId: 'preview-area-tec',
    suggestedAreaCode: 'TEC',
    suggestedAreaName: 'Tecnología',
    eventId: 'preview-event-1',
    eventTitle: 'Caída crítica del SGP durante matrícula',
    sourceAreaId: 'preview-area-reg',
    sourceAreaName: 'Registro y Control',
    interpretationId: 'preview-interpretation-1',
    generatedByAi: true,
    suggestedAt: '2026-07-27T14:40:00.000Z',
    riskIfNotExecuted:
      'Podrían generarse registros duplicados, pagos sin conciliación y pérdida temporal de cupos.',
    executiveSummary:
      'El SGP presenta indisponibilidad crítica durante matrícula. La continuidad depende de validar la consistencia transaccional antes de reabrir el servicio.',
    expectedImpact: {
      benefitExpected:
        'Restablecer transacciones seguras y evitar reprocesos académicos y financieros.',
      indicatorToImprove: 'Disponibilidad del SGP',
      estimatedTime: '30 minutos',
      dependency: 'Base de datos académica y pasarela financiera',
      nextSuggestedAction:
        'Confirmar una muestra de matrículas y pagos antes de habilitar el acceso general.',
    },
    timeline: baseTimeline,
    createdAt: '2026-07-27T14:10:00.000Z',
    updatedAt: '2026-07-27T14:10:00.000Z',
    startedAt: null,
    completedAt: null,
  },
  {
    id: 'preview-action-2',
    action:
      'Conformar sala técnica con responsables de tecnología, registro, financiera y operaciones',
    reason:
      'La recuperación requiere decisiones coordinadas y una única versión del estado.',
    whyRecommended:
      'La situación afecta varios procesos dependientes y necesita coordinación transversal para reducir el tiempo de respuesta.',
    priority: 'high',
    recommendedTime: '15 minutos',
    executionStatus: 'in_progress',
    statusNote: null,
    observation: null,
    suggestedAreaId: 'preview-area-dir',
    suggestedAreaCode: 'DIR',
    suggestedAreaName: 'Dirección de Operaciones',
    eventId: 'preview-event-1',
    eventTitle: 'Caída crítica del SGP durante matrícula',
    sourceAreaId: 'preview-area-reg',
    sourceAreaName: 'Registro y Control',
    interpretationId: 'preview-interpretation-1',
    generatedByAi: true,
    suggestedAt: '2026-07-27T14:25:00.000Z',
    riskIfNotExecuted:
      'La respuesta puede fragmentarse y aumentar el tiempo de recuperación institucional.',
    executiveSummary:
      'La afectación es transversal. Una sala técnica permite priorizar decisiones y centralizar la comunicación operativa.',
    expectedImpact: {
      benefitExpected:
        'Coordinar la recuperación bajo una única secuencia de decisiones.',
      indicatorToImprove: 'Tiempo medio de recuperación',
      estimatedTime: '15 minutos',
      dependency: 'Disponibilidad de líderes operativos',
      nextSuggestedAction:
        'Definir responsable, siguiente corte de actualización y criterio de reapertura.',
    },
    timeline: [
      ...baseTimeline,
      {
        type: 'in_progress',
        at: '2026-07-27T14:32:00.000Z',
        description: 'Usuario cambió estado a En ejecución',
        byUserName: 'Alejandro',
      },
    ],
    createdAt: '2026-07-27T14:10:00.000Z',
    updatedAt: '2026-07-27T14:32:00.000Z',
    startedAt: '2026-07-27T14:32:00.000Z',
    completedAt: null,
  },
  {
    id: 'preview-action-3',
    action: 'Emitir comunicado con hora exacta del siguiente corte operativo',
    reason:
      'Reduce la saturación de canales y preserva la confianza durante la contingencia.',
    whyRecommended:
      'Los canales de atención registran consultas repetidas. Una comunicación centralizada reduce incertidumbre y carga operativa.',
    priority: 'medium',
    recommendedTime: '20 minutos',
    executionStatus: 'executed',
    statusNote: null,
    observation: 'Comunicado publicado en los canales institucionales.',
    suggestedAreaId: 'preview-area-bien',
    suggestedAreaCode: 'BIEN',
    suggestedAreaName: 'Bienestar Universitario',
    eventId: 'preview-event-1',
    eventTitle: 'Caída crítica del SGP durante matrícula',
    sourceAreaId: 'preview-area-reg',
    sourceAreaName: 'Registro y Control',
    interpretationId: 'preview-interpretation-1',
    generatedByAi: true,
    suggestedAt: '2026-07-27T14:30:00.000Z',
    riskIfNotExecuted:
      'Aumentarán las consultas repetidas y la percepción de falta de control.',
    executiveSummary:
      'La comunicación oportuna contiene la presión sobre soporte y mantiene informada a la comunidad.',
    expectedImpact: {
      benefitExpected:
        'Reducir consultas repetidas y alinear expectativas sobre la recuperación.',
      indicatorToImprove: 'Saturación de la mesa de ayuda',
      estimatedTime: '20 minutos',
      dependency: 'Confirmación del siguiente corte técnico',
      nextSuggestedAction:
        'Medir el volumen de consultas durante los treinta minutos posteriores.',
    },
    timeline: [
      ...baseTimeline,
      {
        type: 'executed',
        at: '2026-07-27T15:20:00.000Z',
        description: 'Marcada como Ejecutada',
        byUserName: 'Alejandro',
      },
    ],
    createdAt: '2026-07-27T14:10:00.000Z',
    updatedAt: '2026-07-27T15:20:00.000Z',
    startedAt: '2026-07-27T14:45:00.000Z',
    completedAt: '2026-07-27T15:20:00.000Z',
  },
  {
    id: 'preview-action-4',
    action: 'Preparar extensión extraordinaria de la ventana de matrícula',
    reason:
      'Mitiga el impacto si la recuperación técnica supera el umbral esperado.',
    whyRecommended:
      'La ventana actual puede resultar insuficiente para los estudiantes bloqueados durante la indisponibilidad.',
    priority: 'scheduled',
    recommendedTime: '2 horas',
    executionStatus: 'not_executable',
    statusNote: 'No se recibió autorización para extender el calendario.',
    observation:
      'La medida deberá reconsiderarse si la indisponibilidad supera tres horas.',
    suggestedAreaId: 'preview-area-aca',
    suggestedAreaCode: 'ACA',
    suggestedAreaName: 'Coordinación Académica',
    eventId: 'preview-event-1',
    eventTitle: 'Caída crítica del SGP durante matrícula',
    sourceAreaId: 'preview-area-reg',
    sourceAreaName: 'Registro y Control',
    interpretationId: 'preview-interpretation-1',
    generatedByAi: true,
    suggestedAt: '2026-07-27T16:10:00.000Z',
    riskIfNotExecuted:
      'Algunos estudiantes podrían quedar sin tiempo suficiente para completar su matrícula.',
    executiveSummary:
      'La extensión protege a los estudiantes afectados, pero depende de autorización académica y financiera.',
    expectedImpact: {
      benefitExpected:
        'Dar una ventana compensatoria a estudiantes afectados por la indisponibilidad.',
      indicatorToImprove: 'Matrículas completadas',
      estimatedTime: '2 horas',
      dependency: 'Autorización académica y financiera',
      nextSuggestedAction:
        'Reevaluar la extensión en el siguiente corte operativo.',
    },
    timeline: [
      ...baseTimeline,
      {
        type: 'not_executable',
        at: '2026-07-27T15:05:00.000Z',
        description: 'No fue posible ejecutar',
        byUserName: 'Alejandro',
      },
    ],
    createdAt: '2026-07-27T14:10:00.000Z',
    updatedAt: '2026-07-27T15:05:00.000Z',
    startedAt: null,
    completedAt: '2026-07-27T15:05:00.000Z',
  },
]
