import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'

/** Coordinaciones visibles en la constelación operacional del Live Field. */
export const NETWORK_CONSTELLATION_IDS: readonly CoordinationId[] = [
  'coord-general',
  'coord-bellas-artes',
  'coord-desarrollo-profesional',
  'coord-servicios',
  'coord-empresarial',
  'coord-especializaciones',
  'coord-ingenierias',
  'coord-operaciones-academicas',
  'coord-proyeccion-social',
  'coord-saber-pro',
] as const

export function resolveConstellationIds(
  originId: CoordinationId,
  affectedIds: readonly CoordinationId[],
): CoordinationId[] {
  const active = new Set<CoordinationId>([originId, ...affectedIds])
  const ambient = NETWORK_CONSTELLATION_IDS.filter((id) => !active.has(id))
  return [originId, ...affectedIds, ...ambient]
}
