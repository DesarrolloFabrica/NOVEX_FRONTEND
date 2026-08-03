import type {
  ImpactNetworkDataProvider,
  ImpactPrediction,
  ImpactSimulationOptions,
  IncidentReplay,
} from '@/modules/impact-network/types/impact-network.types'

/**
 * Adapter desacoplado para Replay / Simulación.
 * Sprint de Propagación Inteligente: conectar aquí el backend real.
 * Hasta entonces no inventa datos (siempre null).
 */
export interface ImpactPropagationAdapter {
  loadReplay(eventId: string): Promise<IncidentReplay | null>
  simulateImpact(
    eventId: string,
    options?: ImpactSimulationOptions,
  ): Promise<ImpactPrediction | null>
}

export const stubImpactPropagationAdapter: ImpactPropagationAdapter = {
  async loadReplay() {
    return null
  },
  async simulateImpact() {
    return null
  },
}

export let impactPropagationAdapter: ImpactPropagationAdapter =
  stubImpactPropagationAdapter

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
