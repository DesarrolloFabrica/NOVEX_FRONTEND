/**
 * Catálogo runtime de coordinaciones alimentado por GET /coordinations/graph.
 * El backend define la organización; el frontend conserva la presentación
 * canónica de los assets que forman parte del bundle visual.
 */

export type CoordinationId = string

export const GENERAL_COORDINATION_ID: CoordinationId = 'coord-general'

export interface CoordinationDefinition {
  id: CoordinationId
  uuid: string
  name: string
  shortName: string
  islandAsset: string
  color: string
  displayOrder: number
  isActive: boolean
}

let catalog: readonly CoordinationDefinition[] = []
const byCode = new Map<string, CoordinationDefinition>()
const byUuid = new Map<string, CoordinationDefinition>()
const byNameToken = new Map<string, CoordinationDefinition>()

/**
 * El arte es una responsabilidad del frontend. Esta tabla evita que un
 * imageAsset legado del backend haga que dos coordinaciones compartan isla.
 */
const ISLAND_ASSET_BY_COORDINATION_ID: Readonly<Record<string, string>> = {
  'coord-general': 'CoordGeneral',
  'coord-b2b': 'CoordB2B',
  'coord-bellas-artes': 'CoordBellasArtes',
  'coord-desarrollo-profesional': 'CoordDesarrolloprof',
  'coord-empresarial': 'CoordTransformacionEmpresarial',
  'coord-especializaciones': 'CoordEspecializaciones',
  'coord-ingenierias': 'CoordIngenierias',
  'coord-operaciones-academicas': 'CoordOperacionesAcademicas',
  'coord-proyeccion-social': 'CoordProyeccionAcademica',
  'coord-saber-pro': 'CoordSaberPro',
  'coord-transversales': 'CoordTransversales',
  'coord-homologaciones': 'CoordHomologaciones',
  'coord-negocios': 'CoordNegocios',
  'coord-fabrica-contenidos': 'CoordFabricaDeContenido',
  'coord-servicios': 'CoordServicios',
}

const ISLAND_COLOR_BY_COORDINATION_ID: Readonly<Record<string, string>> = {
  'coord-general': '#28C8F4',
  'coord-b2b': '#FF5F66',
  'coord-bellas-artes': '#6F7CFF',
  'coord-desarrollo-profesional': '#B267FF',
  'coord-empresarial': '#A95CFF',
  'coord-especializaciones': '#FF626A',
  'coord-ingenierias': '#FF8A2A',
  'coord-operaciones-academicas': '#8FA7C8',
  'coord-proyeccion-social': '#88AD5A',
  'coord-saber-pro': '#9ACD50',
  'coord-transversales': '#FF9A28',
  'coord-homologaciones': '#FF6978',
  'coord-negocios': '#FF7B20',
  'coord-fabrica-contenidos': '#22D3E5',
  'coord-servicios': '#C050FF',
}

export function normalizeCatalogToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Convierte imageAsset del backend (ej. CoordGeneral.png) a ruta pública. */
export function resolveIslandAssetPath(
  imageAsset: string,
  coordinationId?: CoordinationId,
): string {
  const canonicalAsset = coordinationId
    ? ISLAND_ASSET_BY_COORDINATION_ID[coordinationId]
    : undefined
  const fileName = (canonicalAsset ?? imageAsset)
    .trim()
    .replace(/^.*[/\\]/, '')
  if (!fileName) return '/islas/CoordGeneral.webp'
  const base = fileName.replace(/\.(png|jpg|jpeg|webp)$/i, '')
  return `/islas/${base}.webp`
}

export function resolveIslandColor(
  coordinationId: CoordinationId,
  backendColor: string,
): string {
  return ISLAND_COLOR_BY_COORDINATION_ID[coordinationId] ?? backendColor
}

export function setCoordinationCatalog(
  items: readonly CoordinationDefinition[],
): void {
  catalog = items
  byCode.clear()
  byUuid.clear()
  byNameToken.clear()

  for (const item of items) {
    byCode.set(item.id, item)
    byUuid.set(item.uuid, item)
    byNameToken.set(normalizeCatalogToken(item.name), item)
    byNameToken.set(normalizeCatalogToken(item.shortName), item)
    byNameToken.set(normalizeCatalogToken(item.id), item)
  }
}

export function getCoordinationCatalog(): readonly CoordinationDefinition[] {
  return catalog
}

export function getCoordination(
  coordinationId: CoordinationId,
): CoordinationDefinition {
  const resolved =
    byCode.get(coordinationId) ??
    byUuid.get(coordinationId) ??
    byNameToken.get(normalizeCatalogToken(coordinationId))

  if (resolved) return resolved

  return {
    id: coordinationId,
    uuid: coordinationId,
    name: coordinationId,
    shortName: coordinationId,
    islandAsset: '/islas/CoordGeneral.webp',
    color: '#4F8EF7',
    displayOrder: Number.MAX_SAFE_INTEGER,
    isActive: true,
  }
}

export function getCoordinationIslandAsset(
  coordinationId: CoordinationId,
): string {
  return getCoordination(coordinationId).islandAsset
}

/**
 * Resuelve un identificador externo contra el catálogo cargado del backend.
 * Acepta code, UUID o nombre exacto del catálogo (sin aliases inventados).
 */
export function resolveCoordinationId(
  value: string | null | undefined,
): CoordinationId | null {
  if (!value) return null
  const direct = byCode.get(value) ?? byUuid.get(value)
  if (direct) return direct.id

  const token = normalizeCatalogToken(value)
  if (!token) return null
  return byNameToken.get(token)?.id ?? null
}

export function resolveCoordinationIdOrFallback(
  value: string | null | undefined,
  fallback: CoordinationId | null = null,
): CoordinationId | null {
  return resolveCoordinationId(value) ?? fallback
}

/** @deprecated Usar resolveCoordinationId + catálogo backend. */
export function resolveCoordinationIdOrGeneral(
  value: string | null | undefined,
): CoordinationId {
  return (
    resolveCoordinationId(value) ??
    catalog.find((item) => item.id.includes('general'))?.id ??
    catalog[0]?.id ??
    'unknown'
  )
}

export function starEdgeId(
  originId: CoordinationId,
  targetId: CoordinationId,
): string {
  return `${originId}-->${targetId}`
}

export function hexToRgbChannels(hex: string): string {
  const normalized = hex.replace('#', '').trim()
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized.padEnd(6, '0').slice(0, 6)
  const value = Number.parseInt(full, 16)
  if (Number.isNaN(value)) return '88 135 255'
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `${r} ${g} ${b}`
}

/** Legacy export vacío: el catálogo llega del backend en runtime. */
export const COORDINATION_CATALOG: readonly CoordinationDefinition[] = []
