import {
  IMPACT_PREDICTIONS,
  IMPACT_REPLAYS,
} from '@/modules/impact-network/data/impact-scenarios.mock'
import { IMPACT_TOPOLOGY } from '@/modules/impact-network/data/impact-topology.mock'
import type {
  ImpactNetworkDataProvider,
  ImpactPrediction,
  ImpactTopology,
  IncidentReplay,
} from '@/modules/impact-network/types/impact-network.types'

function cloneTopology(topology: ImpactTopology): ImpactTopology {
  return {
    canvas: {
      ...topology.canvas,
      incidentCenter: { ...topology.canvas.incidentCenter },
    },
    areas: topology.areas.map((area) => ({
      ...area,
      position: { ...area.position },
    })),
    dependencies: topology.dependencies.map((dependency) => ({
      ...dependency,
    })),
    bindings: topology.bindings.map((binding) => ({
      ...binding,
      externalIds: [...binding.externalIds],
      externalCodes: [...binding.externalCodes],
      externalNames: [...binding.externalNames],
    })),
  }
}

function cloneReplay(replay: IncidentReplay): IncidentReplay {
  return {
    ...replay,
    steps: replay.steps.map((step) => ({ ...step })),
  }
}

function clonePrediction(prediction: ImpactPrediction): ImpactPrediction {
  return {
    ...prediction,
    potentialAreaIds: [...prediction.potentialAreaIds],
    steps: prediction.steps.map((step) => ({ ...step })),
  }
}

/** Búsqueda síncrona para disponibilidad de controles y pruebas. */
export function getReplay(eventId: string): IncidentReplay | null {
  const replay = IMPACT_REPLAYS[eventId]
  return replay ? cloneReplay(replay) : null
}

/** Alias explícito que evita colisiones en consumidores con otros timelines. */
export const getImpactReplay = getReplay

/**
 * Obtiene una predicción determinista. Reducir el horizonte descarta pasos
 * posteriores sin alterar el fixture original.
 */
export function getPrediction(
  eventId: string,
  horizonMinutes?: number,
): ImpactPrediction | null {
  const prediction = IMPACT_PREDICTIONS[eventId]
  if (!prediction) return null

  const requestedHorizon =
    horizonMinutes !== undefined &&
    Number.isFinite(horizonMinutes) &&
    horizonMinutes > 0
      ? Math.round(horizonMinutes)
      : prediction.horizonMinutes
  const steps = prediction.steps
    .filter((step) => step.etaMinutes <= requestedHorizon)
    .map((step) => ({ ...step }))

  return {
    ...clonePrediction(prediction),
    horizonMinutes: requestedHorizon,
    steps,
    potentialAreaIds: [...new Set(steps.map((step) => step.areaId))],
  }
}

export const getImpactPrediction = getPrediction

export const mockImpactNetworkDataProvider: ImpactNetworkDataProvider = {
  async loadTopology() {
    return cloneTopology(IMPACT_TOPOLOGY)
  },

  async loadReplay(eventId) {
    return getReplay(eventId)
  },

  async simulateImpact(eventId, options) {
    return getPrediction(eventId, options?.horizonMinutes)
  },
}

export const impactNetworkDataProvider = mockImpactNetworkDataProvider

