import { impactDependencyId } from '@/modules/impact-network/data/impact-topology.mock'
import type {
  ImpactAreaId,
  ImpactPrediction,
  IncidentReplay,
  IncidentReplayStepType,
} from '@/modules/impact-network/types/impact-network.types'

export const FRONTEND_EVENT_IDS = [
  'evt-001',
  'evt-002',
  'evt-003',
  'evt-004',
  'evt-005',
  'evt-006',
  'evt-007',
  'evt-008',
  'evt-009',
  'evt-010',
] as const

export const BACKEND_SEED_EVENT_IDS = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
] as const

export const IMPACT_SCENARIO_EVENT_IDS = [
  ...FRONTEND_EVENT_IDS,
  ...BACKEND_SEED_EVENT_IDS,
] as const

interface ReplayStepSeed {
  type: IncidentReplayStepType
  label: string
  minute: number
  areaId?: ImpactAreaId
  fromAreaId?: ImpactAreaId
}

function addMinutes(base: string, minutes: number): string {
  return new Date(new Date(base).getTime() + minutes * 60_000).toISOString()
}

function replay(
  eventId: string,
  detectedAt: string,
  seeds: readonly ReplayStepSeed[],
  resolved = false,
): IncidentReplay {
  return {
    eventId,
    traversalDurationMs: 1_000,
    settlementDurationMs: 250,
    recoveryDurationMs: resolved ? 6_000 : undefined,
    steps: seeds.map((seed, index) => ({
      id: `${eventId}-step-${index + 1}`,
      type: seed.type,
      label: seed.label,
      at: addMinutes(detectedAt, seed.minute),
      offsetMs: seed.minute * 60_000,
      areaId: seed.areaId,
      dependencyId:
        seed.fromAreaId && seed.areaId
          ? impactDependencyId(seed.fromAreaId, seed.areaId)
          : undefined,
    })),
  }
}

const detected = (label = 'Problema detectado'): ReplayStepSeed => ({
  type: 'detected',
  label,
  minute: 0,
})

const impact = (
  areaId: ImpactAreaId,
  minute: number,
  label: string,
  fromAreaId?: ImpactAreaId,
): ReplayStepSeed => ({
  type: 'area_impacted',
  label,
  minute,
  areaId,
  fromAreaId,
})

const milestone = (
  type: Exclude<IncidentReplayStepType, 'detected' | 'area_impacted'>,
  minute: number,
  label: string,
  areaId?: ImpactAreaId,
): ReplayStepSeed => ({ type, label, minute, areaId })

export const IMPACT_REPLAYS: Readonly<Record<string, IncidentReplay>> = {
  'evt-001': replay('evt-001', '2026-07-22T12:45:00.000Z', [
    detected('Caída del SGP detectada'),
    impact('technology', 3, 'Tecnología afectada'),
    impact('registry', 6, 'Registro afectado', 'technology'),
    impact('finance', 9, 'Financiera afectada', 'registry'),
    milestone('communication', 12, 'Comunicación operativa emitida'),
    impact('operations', 15, 'Operaciones recibe el impacto', 'finance'),
  ]),
  'evt-002': replay('evt-002', '2026-07-21T15:10:00.000Z', [
    detected('Desfase de contratación detectado'),
    impact('academic-direction', 2, 'Dirección Académica afectada'),
    impact('planning', 7, 'Planeación activa contingencia', 'academic-direction'),
    impact('people', 12, 'Talento Humano afectado', 'planning'),
    milestone('mitigation', 18, 'Cobertura temporal en preparación', 'people'),
  ]),
  'evt-003': replay('evt-003', '2026-07-20T18:30:00.000Z', [
    detected('Inconsistencias académicas detectadas'),
    impact('academic-direction', 2, 'Dirección Académica afectada'),
    impact('wellbeing', 6, 'Bienestar recibe casos estudiantiles', 'academic-direction'),
    impact('operations', 11, 'Operaciones coordina la respuesta', 'wellbeing'),
    milestone('mitigation', 18, 'Carga académica aislada', 'academic-direction'),
  ]),
  'evt-004': replay('evt-004', '2026-07-19T21:05:00.000Z', [
    detected('Intermitencia LMS detectada'),
    impact('technology', 2, 'Tecnología afectada'),
    impact('lms', 5, 'LMS degradado', 'technology'),
    impact('academic-direction', 9, 'Evaluaciones académicas afectadas', 'lms'),
    milestone('mitigation', 14, 'Monitoreo intensivo activado', 'lms'),
  ]),
  'evt-005': replay('evt-005', '2026-07-18T14:20:00.000Z', [
    detected('Inconsistencia B2B detectada'),
    impact('communications', 3, 'Comunicaciones afectada'),
    impact('wellbeing', 8, 'Bienestar recibe consultas', 'communications'),
    impact('operations', 13, 'Operaciones consolida el impacto', 'wellbeing'),
  ]),
  'evt-006': replay('evt-006', '2026-07-22T09:15:00.000Z', [
    detected('Falla de tickets detectada'),
    impact('operations', 2, 'Operaciones de servicio afectada'),
    milestone('communication', 6, 'Escalamiento de SLA emitido', 'operations'),
    milestone('mitigation', 11, 'Cola manual de respaldo activada', 'operations'),
  ]),
  'evt-007': replay('evt-007', '2026-07-17T16:40:00.000Z', [
    detected('Dependencia de proveedor detectada'),
    impact('people', 3, 'Talento Humano afectado'),
    impact('operations', 9, 'Operaciones recibe el bloqueo', 'people'),
    milestone('mitigation', 15, 'Proveedor alterno en evaluación', 'people'),
  ]),
  'evt-008': replay('evt-008', '2026-07-16T11:00:00.000Z', [
    detected('Reproceso de informe detectado'),
    impact('wellbeing', 3, 'Bienestar afectado'),
    impact('operations', 8, 'Operaciones recibe alerta de entrega', 'wellbeing'),
    milestone('mitigation', 14, 'Consolidación manual iniciada', 'wellbeing'),
  ]),
  'evt-009': replay('evt-009', '2026-07-21T10:25:00.000Z', [
    detected('Brecha de aforo detectada'),
    impact('registry', 2, 'Registro afectado'),
    impact('academic-direction', 7, 'Dirección Académica afectada', 'registry'),
    impact('planning', 12, 'Planeación busca sedes alternas', 'academic-direction'),
  ]),
  'evt-010': replay(
    'evt-010',
    '2026-07-15T13:50:00.000Z',
    [
      detected('Degradación del piloto detectada'),
      impact('lms', 2, 'LMS afectado'),
      impact('academic-direction', 6, 'Actividad académica afectada', 'lms'),
      milestone('mitigation', 12, 'Workers reiniciados', 'lms'),
      milestone('recovery', 18, 'Servicio recuperado', 'lms'),
    ],
    true,
  ),
  '11111111-1111-4111-8111-111111111111': replay(
    '11111111-1111-4111-8111-111111111111',
    '2026-07-22T08:15:00.000Z',
    [
      detected('Caída crítica del SGP detectada'),
      impact('registry', 3, 'Registro afectado'),
      impact('finance', 7, 'Financiera afectada', 'registry'),
      impact('academic-direction', 10, 'Dirección Académica afectada', 'registry'),
      impact('wellbeing', 14, 'Bienestar recibe demanda', 'academic-direction'),
      milestone('communication', 18, 'Comunicado institucional emitido'),
      impact('operations', 23, 'Operaciones concentra la respuesta', 'wellbeing'),
    ],
  ),
  '22222222-2222-4222-8222-222222222222': replay(
    '22222222-2222-4222-8222-222222222222',
    '2026-07-22T11:10:00.000Z',
    [
      detected('Inconsistencia académica detectada'),
      impact('academic-direction', 2, 'Dirección Académica afectada'),
      impact('planning', 7, 'Planeación evalúa el desvío', 'academic-direction'),
      impact('operations', 12, 'Operaciones activa seguimiento', 'planning'),
      milestone('mitigation', 17, 'Corrección controlada en curso'),
    ],
  ),
  '33333333-3333-4333-8333-333333333333': replay(
    '33333333-3333-4333-8333-333333333333',
    '2026-07-22T14:35:00.000Z',
    [
      detected('Degradación tecnológica detectada'),
      impact('technology', 2, 'Tecnología afectada'),
      impact('lms', 6, 'LMS afectado', 'technology'),
      impact('academic-direction', 10, 'Dirección Académica afectada', 'lms'),
      milestone('mitigation', 16, 'Capacidad adicional habilitada', 'technology'),
    ],
  ),
  '44444444-4444-4444-8444-444444444444': replay(
    '44444444-4444-4444-8444-444444444444',
    '2026-07-21T08:05:00.000Z',
    [
      detected('Incidente financiero detectado'),
      impact('finance', 2, 'Financiera afectada'),
      impact('operations', 7, 'Operaciones coordina conciliación', 'finance'),
      milestone('mitigation', 13, 'Pagos pendientes conciliados', 'finance'),
      milestone('recovery', 20, 'Operación financiera normalizada', 'finance'),
    ],
    true,
  ),
}

interface PredictionStepSeed {
  fromAreaId: ImpactAreaId
  areaId: ImpactAreaId
  etaMinutes: number
  probability: number
}

function prediction(
  eventId: string,
  generatedAt: string,
  seeds: readonly PredictionStepSeed[],
): ImpactPrediction {
  return {
    eventId,
    generatedAt,
    horizonMinutes: 30,
    potentialAreaIds: [...new Set(seeds.map((seed) => seed.areaId))],
    steps: seeds.map((seed) => ({
      dependencyId: impactDependencyId(seed.fromAreaId, seed.areaId),
      areaId: seed.areaId,
      etaMinutes: seed.etaMinutes,
      probability: seed.probability,
    })),
  }
}

const GENERATED_AT = '2026-07-22T15:00:00.000Z'

export const IMPACT_PREDICTIONS: Readonly<Record<string, ImpactPrediction>> = {
  'evt-001': prediction('evt-001', GENERATED_AT, [
    {
      fromAreaId: 'technology',
      areaId: 'communications',
      etaMinutes: 8,
      probability: 0.82,
    },
    {
      fromAreaId: 'communications',
      areaId: 'wellbeing',
      etaMinutes: 16,
      probability: 0.68,
    },
  ]),
  'evt-002': prediction('evt-002', GENERATED_AT, [
    {
      fromAreaId: 'academic-direction',
      areaId: 'wellbeing',
      etaMinutes: 12,
      probability: 0.66,
    },
    {
      fromAreaId: 'wellbeing',
      areaId: 'operations',
      etaMinutes: 23,
      probability: 0.52,
    },
  ]),
  'evt-003': prediction('evt-003', GENERATED_AT, [
    {
      fromAreaId: 'academic-direction',
      areaId: 'planning',
      etaMinutes: 10,
      probability: 0.73,
    },
    {
      fromAreaId: 'planning',
      areaId: 'people',
      etaMinutes: 20,
      probability: 0.57,
    },
  ]),
  'evt-004': prediction('evt-004', GENERATED_AT, [
    {
      fromAreaId: 'technology',
      areaId: 'library',
      etaMinutes: 9,
      probability: 0.61,
    },
    {
      fromAreaId: 'library',
      areaId: 'academic-direction',
      etaMinutes: 18,
      probability: 0.49,
    },
  ]),
  'evt-005': prediction('evt-005', GENERATED_AT, []),
  'evt-006': prediction('evt-006', GENERATED_AT, []),
  'evt-007': prediction('evt-007', GENERATED_AT, []),
  'evt-008': prediction('evt-008', GENERATED_AT, []),
  'evt-009': prediction('evt-009', GENERATED_AT, [
    {
      fromAreaId: 'registry',
      areaId: 'finance',
      etaMinutes: 11,
      probability: 0.64,
    },
    {
      fromAreaId: 'finance',
      areaId: 'operations',
      etaMinutes: 22,
      probability: 0.46,
    },
  ]),
  'evt-010': prediction('evt-010', GENERATED_AT, [
    {
      fromAreaId: 'academic-direction',
      areaId: 'planning',
      etaMinutes: 15,
      probability: 0.35,
    },
  ]),
  '11111111-1111-4111-8111-111111111111': prediction(
    '11111111-1111-4111-8111-111111111111',
    GENERATED_AT,
    [
      {
        fromAreaId: 'academic-direction',
        areaId: 'planning',
        etaMinutes: 12,
        probability: 0.78,
      },
      {
        fromAreaId: 'planning',
        areaId: 'people',
        etaMinutes: 24,
        probability: 0.56,
      },
    ],
  ),
  '22222222-2222-4222-8222-222222222222': prediction(
    '22222222-2222-4222-8222-222222222222',
    GENERATED_AT,
    [
      {
        fromAreaId: 'academic-direction',
        areaId: 'wellbeing',
        etaMinutes: 14,
        probability: 0.58,
      },
      {
        fromAreaId: 'wellbeing',
        areaId: 'operations',
        etaMinutes: 26,
        probability: 0.44,
      },
    ],
  ),
  '33333333-3333-4333-8333-333333333333': prediction(
    '33333333-3333-4333-8333-333333333333',
    GENERATED_AT,
    [
      {
        fromAreaId: 'technology',
        areaId: 'communications',
        etaMinutes: 10,
        probability: 0.54,
      },
      {
        fromAreaId: 'communications',
        areaId: 'wellbeing',
        etaMinutes: 21,
        probability: 0.41,
      },
    ],
  ),
  '44444444-4444-4444-8444-444444444444': prediction(
    '44444444-4444-4444-8444-444444444444',
    GENERATED_AT,
    [],
  ),
}

