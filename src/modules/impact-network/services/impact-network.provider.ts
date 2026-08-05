import type {
  ImpactNetworkDataProvider,
  ImpactPrediction,
  ImpactSimulationOptions,
  IncidentReplay,
} from '@/modules/impact-network/types/impact-network.types'
import { resolveCoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import { simulateSituationImpact } from '@/modules/api/impact.api'
import { ApiError } from '@/shared/api/http'

/**
 * Adapter desacoplado para Replay / Simulación.
 * La simulación consulta el análisis IA persistido (máx. 2 islas).
 * El replay sigue pendiente de backend real.
 */
export interface ImpactPropagationAdapter {
  loadReplay(eventId: string): Promise<IncidentReplay | null>
  simulateImpact(
    eventId: string,
    options?: ImpactSimulationOptions,
  ): Promise<ImpactPrediction | null>
}

function mapSimulationToPrediction(
  eventId: string,
  horizonMinutes: number,
  potentialCodes: readonly string[],
  generatedAt: string,
): ImpactPrediction | null {
  const potentialAreaIds = [
    ...new Set(
      potentialCodes
        .map((code) => resolveCoordinationId(code))
        .filter((id): id is NonNullable<typeof id> => Boolean(id)),
    ),
  ].slice(0, 2)

  if (potentialAreaIds.length === 0) {
    return null
  }

  return {
    eventId,
    generatedAt,
    horizonMinutes,
    potentialAreaIds,
    steps: potentialAreaIds.map((areaId, index) => ({
      dependencyId: `sim-${eventId}-${areaId}`,
      areaId,
      etaMinutes: Math.max(5, Math.round(((index + 1) * horizonMinutes) / 3)),
      probability: Math.max(0.55, 0.9 - index * 0.15),
    })),
  }
}

export const stubImpactPropagationAdapter: ImpactPropagationAdapter = {
  async loadReplay() {
    return null
  },
  async simulateImpact() {
    return null
  },
}

export const backendImpactPropagationAdapter: ImpactPropagationAdapter = {
  async loadReplay() {
    return null
  },
  async simulateImpact(eventId, options) {
    const horizonMinutes = options?.horizonMinutes ?? 30
    try {
      const result = await simulateSituationImpact(eventId, horizonMinutes)
      if (!result.canSimulate || result.hasDeclaredRelated) {
        return null
      }
      return mapSimulationToPrediction(
        eventId,
        result.horizonMinutes,
        result.potentialCoordinations.map((item) => item.coordinationCode),
        result.generatedAt,
      )
    } catch (error) {
      // Despliegue escalonado / endpoint aún no disponible: no inventar datos.
      if (error instanceof ApiError && (error.status === 404 || error.status === 501)) {
        return null
      }
      throw error
    }
  },
}

export let impactPropagationAdapter: ImpactPropagationAdapter =
  backendImpactPropagationAdapter

export function setImpactPropagationAdapter(
  adapter: ImpactPropagationAdapter,
): void {
  impactPropagationAdapter = adapter
}

/** Provider de topología: la carga real vive en loadImpactNetworkGraph. */
export const impactNetworkDataProvider: ImpactNetworkDataProvider = {
  async loadTopology() {
    throw new Error(
      'loadTopology está deprecado. Usar loadImpactNetworkGraph().',
    )
  },
  async loadReplay(eventId) {
    return impactPropagationAdapter.loadReplay(eventId)
  },
  async simulateImpact(eventId, options) {
    return impactPropagationAdapter.simulateImpact(eventId, options)
  },
}
