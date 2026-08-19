import { describe, expect, it } from 'vitest'
import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import { resolveSituationCoordinatorState } from './situation-coordinator-state'

function event(overrides: Partial<OperationalEvent> = {}): OperationalEvent {
  return {
    id: 'sit-1',
    title: 'Prueba',
    description: 'Desc',
    reportedBy: { id: 'u1', name: 'Ana' },
    reportedAt: '2026-08-19T12:00:00.000Z',
    sourceAreaId: 'fab',
    sourceAreaName: 'Fábrica',
    status: 'open',
    interpretation: null,
    timeline: { eventId: 'sit-1', entries: [] },
    createdAt: '2026-08-19T12:00:00.000Z',
    ...overrides,
  }
}

describe('resolveSituationCoordinatorState', () => {
  it('marca registrada y quieta cuando nadie la tomó', () => {
    const state = resolveSituationCoordinatorState(event(), {
      status: 'OPEN',
      lastStatusComment: null,
    })
    expect(state.label).toBe('Registrada')
    expect(state.tone).toBe('open')
    expect(state.detail).toMatch(/quieta/i)
  })

  it('marca en atención cuando el coordinador ya la tomó', () => {
    const state = resolveSituationCoordinatorState(event({ status: 'monitoring' }), {
      status: 'IN_PROGRESS',
    })
    expect(state.label).toBe('En atención')
    expect(state.tone).toBe('attention')
  })

  it('marca cerrada cuando el coordinador la cerró', () => {
    const state = resolveSituationCoordinatorState(event({ status: 'archived' }), {
      status: 'CLOSED',
    })
    expect(state.label).toBe('Cerrada')
    expect(state.tone).toBe('closed')
  })
})
