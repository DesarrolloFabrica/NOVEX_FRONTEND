import { describe, expect, it } from 'vitest'
import {
  BACKEND_SEED_EVENT_IDS,
  FRONTEND_EVENT_IDS,
  IMPACT_PREDICTIONS,
  IMPACT_REPLAYS,
  IMPACT_SCENARIO_EVENT_IDS,
} from '@/modules/impact-network/data/impact-scenarios.mock'
import {
  IMPACT_AREAS,
  IMPACT_DEPENDENCIES,
  IMPACT_TOPOLOGY,
  impactDependencyId,
} from '@/modules/impact-network/data/impact-topology.mock'
import { resolveAreaId } from '@/modules/impact-network/engine/impact-paths'
import { mapOperationalEventToImpactIncident } from '@/modules/impact-network/selectors/impact-network.selectors'
import type { ImpactAreaId } from '@/modules/impact-network/types/impact-network.types'
import { OPERATIONAL_EVENTS } from '@/modules/operational-events/data/operational-events.mock'

describe('IMPACT_TOPOLOGY', () => {
  it('mantiene las doce coordenadas institucionales invariantes', () => {
    expect(IMPACT_TOPOLOGY.canvas).toEqual({
      width: 1800,
      height: 1200,
      incidentCenter: { x: 900, y: 570 },
    })
    expect(
      Object.fromEntries(
        IMPACT_AREAS.map((area) => [area.id, area.position]),
      ),
    ).toEqual({
      planning: { x: 900, y: 120 },
      infrastructure: { x: 230, y: 180 },
      technology: { x: 520, y: 330 },
      registry: { x: 1280, y: 330 },
      communications: { x: 1570, y: 190 },
      library: { x: 170, y: 650 },
      lms: { x: 350, y: 850 },
      'academic-direction': { x: 700, y: 980 },
      operations: { x: 1030, y: 970 },
      finance: { x: 1430, y: 930 },
      wellbeing: { x: 1600, y: 650 },
      people: { x: 1220, y: 1100 },
    })
  })

  it('no contiene aristas duplicadas, autorreferencias ni áreas inexistentes', () => {
    const areaIds = new Set(IMPACT_AREAS.map((area) => area.id))
    const dependencyIds = IMPACT_DEPENDENCIES.map(
      (dependency) => dependency.id,
    )

    expect(new Set(dependencyIds).size).toBe(dependencyIds.length)
    for (const dependency of IMPACT_DEPENDENCIES) {
      expect(dependency.sourceAreaId).not.toBe(dependency.targetAreaId)
      expect(areaIds.has(dependency.sourceAreaId)).toBe(true)
      expect(areaIds.has(dependency.targetAreaId)).toBe(true)
      expect(dependency.id).toBe(
        impactDependencyId(
          dependency.sourceAreaId,
          dependency.targetAreaId,
        ),
      )
    }
  })

  it('reconcilia ids frontend y códigos/nombres backend sin depender de tildes', () => {
    expect(resolveAreaId('area-fabrica-desarrollo')).toBe('technology')
    expect(resolveAreaId('Coordinador de Operación Académica')).toBe(
      'academic-direction',
    )
    expect(resolveAreaId('REG')).toBe('registry')
    expect(resolveAreaId('Registro y Control')).toBe('registry')
    expect(resolveAreaId('Direccion de Operaciones')).toBe('operations')
    expect(resolveAreaId('BIEN')).toBe('wellbeing')
    expect(resolveAreaId('área inexistente')).toBeNull()
  })
})

describe('fixtures de replay y predicción', () => {
  it('cubre evt-001..evt-010 y los cuatro UUID seed', () => {
    for (const eventId of IMPACT_SCENARIO_EVENT_IDS) {
      expect(IMPACT_REPLAYS[eventId]?.eventId).toBe(eventId)
      expect(IMPACT_PREDICTIONS[eventId]?.eventId).toBe(eventId)
    }
    expect(Object.keys(IMPACT_REPLAYS)).toHaveLength(14)
    expect(Object.keys(IMPACT_PREDICTIONS)).toHaveLength(14)
  })

  it('usa exactamente los eventId reales del fallback y comienza por su área origen', () => {
    expect(OPERATIONAL_EVENTS.map((event) => event.id)).toEqual(
      FRONTEND_EVENT_IDS,
    )

    for (const event of OPERATIONAL_EVENTS) {
      const incident = mapOperationalEventToImpactIncident(event)
      const firstImpactedArea = IMPACT_REPLAYS[event.id]?.steps.find(
        (step) => step.type === 'area_impacted',
      )?.areaId
      expect(firstImpactedArea, event.id).toBe(incident.sourceAreaId)
    }
  })

  it('alinea los cuatro UUID seed con sus códigos de área reales', () => {
    const expectedSeedOrigins: Record<string, ImpactAreaId> = {
      '11111111-1111-4111-8111-111111111111': 'registry',
      '22222222-2222-4222-8222-222222222222': 'academic-direction',
      '33333333-3333-4333-8333-333333333333': 'technology',
      '44444444-4444-4444-8444-444444444444': 'finance',
    }

    expect(Object.keys(expectedSeedOrigins)).toEqual(BACKEND_SEED_EVENT_IDS)
    for (const eventId of BACKEND_SEED_EVENT_IDS) {
      const firstImpactedArea = IMPACT_REPLAYS[eventId]?.steps.find(
        (step) => step.type === 'area_impacted',
      )?.areaId
      expect(firstImpactedArea, eventId).toBe(expectedSeedOrigins[eventId])
    }
  })

  it('mantiene cronología y recorridos reales válidos sobre la topología', () => {
    const dependencyIds = new Set(
      IMPACT_DEPENDENCIES.map((dependency) => dependency.id),
    )

    for (const replay of Object.values(IMPACT_REPLAYS)) {
      expect(replay.steps.length).toBeGreaterThan(0)
      expect(replay.steps[0]?.type).toBe('detected')
      const offsets = replay.steps.map((step) => step.offsetMs)
      expect(offsets).toEqual([...offsets].sort((a, b) => a - b))
      expect(new Set(replay.steps.map((step) => step.id)).size).toBe(
        replay.steps.length,
      )
      for (const step of replay.steps) {
        expect(Date.parse(step.at)).not.toBeNaN()
        if (step.dependencyId) {
          expect(dependencyIds.has(step.dependencyId)).toBe(true)
        }
      }
    }
  })

  it('mantiene las predicciones separadas y dentro de treinta minutos', () => {
    const dependencyIds = new Set(
      IMPACT_DEPENDENCIES.map((dependency) => dependency.id),
    )
    for (const prediction of Object.values(IMPACT_PREDICTIONS)) {
      expect(prediction.horizonMinutes).toBe(30)
      expect(new Set(prediction.potentialAreaIds)).toEqual(
        new Set(prediction.steps.map((step) => step.areaId)),
      )
      for (const step of prediction.steps) {
        expect(dependencyIds.has(step.dependencyId)).toBe(true)
        expect(step.etaMinutes).toBeLessThanOrEqual(30)
        expect(step.probability).toBeGreaterThanOrEqual(0)
        expect(step.probability).toBeLessThanOrEqual(1)
      }
    }
  })

  it('reserva la recuperación de seis segundos para fixtures resueltos', () => {
    const recoveredEventIds = Object.values(IMPACT_REPLAYS)
      .filter((replay) =>
        replay.steps.some((step) => step.type === 'recovery'),
      )
      .map((replay) => replay.eventId)
      .sort()

    expect(recoveredEventIds).toEqual(
      ['44444444-4444-4444-8444-444444444444', 'evt-010'].sort(),
    )
    for (const eventId of recoveredEventIds) {
      const replay = IMPACT_REPLAYS[eventId]
      expect(replay?.recoveryDurationMs).toBe(6_000)
      expect(replay?.steps.at(-1)?.type).toBe('recovery')
    }
    for (const event of OPERATIONAL_EVENTS) {
      const hasRecovery = IMPACT_REPLAYS[event.id]?.steps.some(
        (step) => step.type === 'recovery',
      )
      expect(hasRecovery, event.id).toBe(event.status === 'resolved')
    }
  })
})
