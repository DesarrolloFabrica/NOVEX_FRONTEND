import type {
  ImpactArea,
  ImpactAreaBinding,
  ImpactAreaId,
  ImpactDependency,
  ImpactTopology,
} from '@/modules/impact-network/types/impact-network.types'

export const IMPACT_CANVAS = {
  width: 1800,
  height: 1200,
  incidentCenter: { x: 900, y: 570 },
} as const

export const IMPACT_AREAS: readonly ImpactArea[] = [
  {
    id: 'planning',
    code: 'PLA',
    name: 'Planeación',
    position: { x: 900, y: 120 },
  },
  {
    id: 'infrastructure',
    code: 'INF',
    name: 'Infraestructura',
    position: { x: 230, y: 180 },
  },
  {
    id: 'technology',
    code: 'TEC',
    name: 'Tecnología',
    position: { x: 520, y: 330 },
  },
  {
    id: 'registry',
    code: 'REG',
    name: 'Registro',
    position: { x: 1280, y: 330 },
  },
  {
    id: 'communications',
    code: 'COM',
    name: 'Comunicaciones',
    position: { x: 1570, y: 190 },
  },
  {
    id: 'library',
    code: 'BIB',
    name: 'Biblioteca',
    position: { x: 170, y: 650 },
  },
  {
    id: 'lms',
    code: 'LMS',
    name: 'LMS',
    position: { x: 350, y: 850 },
  },
  {
    id: 'academic-direction',
    code: 'ACA',
    name: 'Dirección Académica',
    position: { x: 700, y: 980 },
  },
  {
    id: 'operations',
    code: 'OPE',
    name: 'Operaciones',
    position: { x: 1030, y: 970 },
  },
  {
    id: 'finance',
    code: 'FIN',
    name: 'Financiera',
    position: { x: 1430, y: 930 },
  },
  {
    id: 'wellbeing',
    code: 'BIE',
    name: 'Bienestar',
    position: { x: 1600, y: 650 },
  },
  {
    id: 'people',
    code: 'TAL',
    name: 'Talento Humano',
    position: { x: 1220, y: 1100 },
  },
]

export function impactDependencyId(
  sourceAreaId: ImpactAreaId,
  targetAreaId: ImpactAreaId,
): string {
  return `${sourceAreaId}--${targetAreaId}`
}

function dependency(
  sourceAreaId: ImpactAreaId,
  targetAreaId: ImpactAreaId,
): ImpactDependency {
  return {
    id: impactDependencyId(sourceAreaId, targetAreaId),
    sourceAreaId,
    targetAreaId,
  }
}

export const IMPACT_DEPENDENCIES: readonly ImpactDependency[] = [
  dependency('infrastructure', 'technology'),
  dependency('technology', 'registry'),
  dependency('technology', 'lms'),
  dependency('technology', 'library'),
  dependency('technology', 'communications'),
  dependency('registry', 'finance'),
  dependency('registry', 'academic-direction'),
  dependency('lms', 'academic-direction'),
  dependency('library', 'academic-direction'),
  dependency('academic-direction', 'wellbeing'),
  dependency('academic-direction', 'planning'),
  dependency('communications', 'wellbeing'),
  dependency('finance', 'operations'),
  dependency('wellbeing', 'operations'),
  dependency('planning', 'people'),
  dependency('planning', 'operations'),
  dependency('people', 'operations'),
]

export const IMPACT_AREA_BINDINGS: readonly ImpactAreaBinding[] = [
  {
    catalog: 'backend',
    areaId: 'technology',
    externalIds: [],
    externalCodes: ['TEC'],
    externalNames: ['Tecnología', 'Tecnologia'],
  },
  {
    catalog: 'backend',
    areaId: 'registry',
    externalIds: [],
    externalCodes: ['REG'],
    externalNames: ['Registro', 'Registro y Control'],
  },
  {
    catalog: 'backend',
    areaId: 'academic-direction',
    externalIds: [],
    externalCodes: ['ACA'],
    externalNames: ['Coordinación Académica', 'Coordinacion Academica'],
  },
  {
    catalog: 'backend',
    areaId: 'finance',
    externalIds: [],
    externalCodes: ['FIN'],
    externalNames: ['Financiera'],
  },
  {
    catalog: 'backend',
    areaId: 'wellbeing',
    externalIds: [],
    externalCodes: ['BIEN'],
    externalNames: ['Bienestar', 'Bienestar Universitario'],
  },
  {
    catalog: 'backend',
    areaId: 'operations',
    externalIds: [],
    externalCodes: ['DIR'],
    externalNames: ['Dirección de Operaciones', 'Direccion de Operaciones'],
  },
  {
    catalog: 'frontend',
    areaId: 'technology',
    externalIds: ['area-fabrica-desarrollo'],
    externalCodes: ['CFD'],
    externalNames: [
      'Fábrica y Desarrollo',
      'Coordinador de Fábrica y Desarrollo',
    ],
  },
  {
    catalog: 'frontend',
    areaId: 'academic-direction',
    externalIds: ['area-operacion-academica'],
    externalCodes: ['COA'],
    externalNames: [
      'Operación Académica',
      'Coordinador de Operación Académica',
    ],
  },
  {
    catalog: 'frontend',
    areaId: 'lms',
    externalIds: ['area-innovacion-edu'],
    externalCodes: ['LIT'],
    externalNames: [
      'Innovación EDU',
      'Líder de Innovación y Transformación EDU',
    ],
  },
  {
    catalog: 'frontend',
    areaId: 'communications',
    externalIds: ['area-b2b'],
    externalCodes: ['SB2B'],
    externalNames: ['B2B', 'Supervisor B2B'],
  },
  {
    catalog: 'frontend',
    areaId: 'operations',
    externalIds: ['area-servicio'],
    externalCodes: ['LSV'],
    externalNames: ['Servicio', 'Líder de Servicio'],
  },
  {
    catalog: 'frontend',
    areaId: 'registry',
    externalIds: ['area-pruebas-saber'],
    externalCodes: ['CPS'],
    externalNames: ['Pruebas Saber', 'Coordinadora Pruebas Saber'],
  },
  {
    catalog: 'frontend',
    areaId: 'wellbeing',
    externalIds: ['area-proyeccion-social'],
    externalCodes: ['CPSO'],
    externalNames: [
      'Proyección Social',
      'Coordinador de Proyección Social',
    ],
  },
  {
    catalog: 'frontend',
    areaId: 'people',
    externalIds: ['area-desarrollo-profesional'],
    externalCodes: ['CDP'],
    externalNames: [
      'Desarrollo Profesional',
      'Coordinador de Desarrollo Profesional',
    ],
  },
]

export const IMPACT_TOPOLOGY: ImpactTopology = {
  canvas: IMPACT_CANVAS,
  areas: IMPACT_AREAS,
  dependencies: IMPACT_DEPENDENCIES,
  bindings: IMPACT_AREA_BINDINGS,
}

