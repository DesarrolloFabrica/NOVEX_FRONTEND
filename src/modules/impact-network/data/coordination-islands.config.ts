import { normalizeAreaToken } from '@/modules/impact-network/engine/impact-paths'

export type CoordinationId =
  | 'coord-general'
  | 'coord-b2b'
  | 'coord-bellas-artes'
  | 'coord-desarrollo-profesional'
  | 'coord-social-lab'
  | 'coord-empresarial'
  | 'coord-especializaciones'
  | 'coord-ingenierias'
  | 'coord-operaciones-academicas'
  | 'coord-proyeccion-social'
  | 'coord-saber-pro'
  | 'coord-transversales'
  | 'coord-negocios'

export interface CoordinationDefinition {
  id: CoordinationId
  name: string
  shortName: string
  islandAsset: string
}

const ISLAND_ASSETS = {
  general: '/islas/CoordGeneral.png',
  b2b: '/islas/CoordB2B.png',
  bellasArtes: '/islas/CoordBellasartes.png',
  desarrolloProfesional: '/islas/CoordDesarrolloprof.png',
  socialLab: '/islas/CoordSociallab.png',
} as const

export const COORDINATION_CATALOG: readonly CoordinationDefinition[] = [
  {
    id: 'coord-general',
    name: 'Coordinación General',
    shortName: 'General',
    islandAsset: ISLAND_ASSETS.general,
  },
  {
    id: 'coord-b2b',
    name: 'Coordinación Supervisor B2B',
    shortName: 'B2B',
    islandAsset: ISLAND_ASSETS.b2b,
  },
  {
    id: 'coord-bellas-artes',
    name: 'Coordinador Bellas Artes',
    shortName: 'Bellas Artes',
    islandAsset: ISLAND_ASSETS.bellasArtes,
  },
  {
    id: 'coord-desarrollo-profesional',
    name: 'Coordinador Desarrollo Profesional',
    shortName: 'Desarrollo Prof.',
    islandAsset: ISLAND_ASSETS.desarrolloProfesional,
  },
  {
    id: 'coord-social-lab',
    name: 'Coordinador de Social - Social Lab',
    shortName: 'Social Lab',
    islandAsset: ISLAND_ASSETS.socialLab,
  },
  {
    id: 'coord-empresarial',
    name: 'Coordinador Empresarial',
    shortName: 'Empresarial',
    islandAsset: ISLAND_ASSETS.b2b,
  },
  {
    id: 'coord-especializaciones',
    name: 'Coordinador Especializaciones',
    shortName: 'Especializaciones',
    islandAsset: ISLAND_ASSETS.desarrolloProfesional,
  },
  {
    id: 'coord-ingenierias',
    name: 'Coordinador Ingenierías',
    shortName: 'Ingenierías',
    islandAsset: ISLAND_ASSETS.general,
  },
  {
    id: 'coord-operaciones-academicas',
    name: 'Coordinador Operaciones Académicas',
    shortName: 'Op. Académicas',
    islandAsset: ISLAND_ASSETS.desarrolloProfesional,
  },
  {
    id: 'coord-proyeccion-social',
    name: 'Coordinador Proyección Social',
    shortName: 'Proyección Social',
    islandAsset: ISLAND_ASSETS.socialLab,
  },
  {
    id: 'coord-saber-pro',
    name: 'Coordinador Saber Pro',
    shortName: 'Saber Pro',
    islandAsset: ISLAND_ASSETS.desarrolloProfesional,
  },
  {
    id: 'coord-transversales',
    name: 'Coordinador Transversales',
    shortName: 'Transversales',
    islandAsset: ISLAND_ASSETS.general,
  },
  {
    id: 'coord-negocios',
    name: 'Negocios',
    shortName: 'Negocios',
    islandAsset: ISLAND_ASSETS.b2b,
  },
] as const

const COORDINATION_BY_ID = new Map(
  COORDINATION_CATALOG.map((coordination) => [coordination.id, coordination]),
)

interface CoordinationAlias {
  coordinationId: CoordinationId
  tokens: readonly string[]
}

const COORDINATION_ALIASES: readonly CoordinationAlias[] = [
  {
    coordinationId: 'coord-general',
    tokens: [
      'coord-general',
      'area-vision-general',
      'vgo',
      'vision general operaciones',
      'vision general',
      'planning',
      'planeacion',
      'finance',
      'financiera',
      'library',
      'biblioteca',
      'infrastructure',
      'infraestructura',
    ],
  },
  {
    coordinationId: 'coord-b2b',
    tokens: [
      'coord-b2b',
      'area-b2b',
      'sb2b',
      'supervisor b2b',
      'b2b',
      'communications',
      'comunicaciones',
      'com',
    ],
  },
  {
    coordinationId: 'coord-bellas-artes',
    tokens: [
      'coord-bellas-artes',
      'bellas artes',
      'coordinador bellas artes',
    ],
  },
  {
    coordinationId: 'coord-desarrollo-profesional',
    tokens: [
      'coord-desarrollo-profesional',
      'area-desarrollo-profesional',
      'cdp',
      'desarrollo profesional',
      'coordinador de desarrollo profesional',
      'people',
      'talento humano',
      'tal',
    ],
  },
  {
    coordinationId: 'coord-social-lab',
    tokens: [
      'coord-social-lab',
      'social lab',
      'coordinador de social social lab',
    ],
  },
  {
    coordinationId: 'coord-empresarial',
    tokens: [
      'coord-empresarial',
      'empresarial',
      'coordinador empresarial',
      'area-servicio',
      'lsv',
      'lider de servicio',
      'servicio',
      'operations',
      'operaciones',
      'ope',
      'direccion de operaciones',
    ],
  },
  {
    coordinationId: 'coord-especializaciones',
    tokens: [
      'coord-especializaciones',
      'especializaciones',
      'coordinador especializaciones',
    ],
  },
  {
    coordinationId: 'coord-ingenierias',
    tokens: [
      'coord-ingenierias',
      'ingenierias',
      'coordinador ingenierias',
      'area-fabrica-desarrollo',
      'cfd',
      'fabrica y desarrollo',
      'coordinador de fabrica y desarrollo',
      'technology',
      'tecnologia',
      'tec',
    ],
  },
  {
    coordinationId: 'coord-operaciones-academicas',
    tokens: [
      'coord-operaciones-academicas',
      'operaciones academicas',
      'coordinador operaciones academicas',
      'area-operacion-academica',
      'coa',
      'operacion academica',
      'coordinador de operacion academica',
      'academic-direction',
      'direccion academica',
      'aca',
      'coordinacion academica',
    ],
  },
  {
    coordinationId: 'coord-proyeccion-social',
    tokens: [
      'coord-proyeccion-social',
      'proyeccion social',
      'coordinador proyeccion social',
      'area-proyeccion-social',
      'cpso',
      'wellbeing',
      'bienestar',
      'bien',
    ],
  },
  {
    coordinationId: 'coord-saber-pro',
    tokens: [
      'coord-saber-pro',
      'saber pro',
      'coordinador saber pro',
      'area-pruebas-saber',
      'cps',
      'pruebas saber',
      'coordinadora pruebas saber',
      'registry',
      'registro',
      'reg',
    ],
  },
  {
    coordinationId: 'coord-transversales',
    tokens: [
      'coord-transversales',
      'transversales',
      'coordinador transversales',
      'area-innovacion-edu',
      'lit',
      'innovacion edu',
      'lider de innovacion y transformacion edu',
      'lms',
    ],
  },
  {
    coordinationId: 'coord-negocios',
    tokens: ['coord-negocios', 'negocios'],
  },
]

const ALIAS_LOOKUP = new Map<string, CoordinationId>()
for (const alias of COORDINATION_ALIASES) {
  for (const token of alias.tokens) {
    ALIAS_LOOKUP.set(normalizeAreaToken(token), alias.coordinationId)
  }
}

export function getCoordination(
  coordinationId: CoordinationId,
): CoordinationDefinition {
  return (
    COORDINATION_BY_ID.get(coordinationId) ??
    COORDINATION_BY_ID.get('coord-general')!
  )
}

export function getCoordinationIslandAsset(
  coordinationId: CoordinationId,
): string {
  return getCoordination(coordinationId).islandAsset
}

export function resolveCoordinationId(
  value: string | null | undefined,
): CoordinationId | null {
  if (!value) return null
  const token = normalizeAreaToken(value)
  if (!token) return null
  return ALIAS_LOOKUP.get(token) ?? null
}

export function resolveCoordinationIdOrGeneral(
  value: string | null | undefined,
): CoordinationId {
  return resolveCoordinationId(value) ?? 'coord-general'
}

export function starEdgeId(
  originId: CoordinationId,
  targetId: CoordinationId,
): string {
  return `${originId}-->${targetId}`
}
