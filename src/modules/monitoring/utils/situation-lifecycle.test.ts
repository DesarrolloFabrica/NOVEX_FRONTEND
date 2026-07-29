import { describe, expect, it } from 'vitest'
import type { SituationRecommendation } from '@/modules/api/recommendations.api'
import { groupRecommendationsByPriority } from '@/modules/monitoring/utils/situation-management.presentation'
import {
  getNextOperationalStatus,
  lifecyclePhase,
  requiresStatusComment,
} from '@/modules/monitoring/utils/situation-lifecycle'

describe('situation lifecycle', () => {
  it('solo permite el estado inmediatamente siguiente', () => {
    expect(getNextOperationalStatus('OPEN')).toBe('IN_PROGRESS')
    expect(getNextOperationalStatus('IN_PROGRESS')).toBe('RESOLVED')
    expect(getNextOperationalStatus('RESOLVED')).toBe('CLOSED')
    expect(getNextOperationalStatus('CLOSED')).toBeNull()
  })

  it('marca fases complete / current / pending', () => {
    expect(lifecyclePhase('IN_PROGRESS', 'OPEN')).toBe('complete')
    expect(lifecyclePhase('IN_PROGRESS', 'IN_PROGRESS')).toBe('current')
    expect(lifecyclePhase('IN_PROGRESS', 'RESOLVED')).toBe('pending')
  })

  it('exige comentario en Resuelta y Cerrada', () => {
    expect(requiresStatusComment('IN_PROGRESS')).toBe(false)
    expect(requiresStatusComment('RESOLVED')).toBe(true)
    expect(requiresStatusComment('CLOSED')).toBe(true)
  })
})

describe('groupRecommendationsByPriority', () => {
  it('agrupa por prioridad y etiqueta CRITICAL como Inmediata', () => {
    const recommendations = [
      {
        id: '1',
        title: 'Monitorear',
        description: 'x',
        priority: 'MEDIUM',
      },
      {
        id: '2',
        title: 'Escalar',
        description: 'y',
        priority: 'CRITICAL',
      },
      {
        id: '3',
        title: 'Comunicar',
        description: 'z',
        priority: 'HIGH',
      },
    ] as SituationRecommendation[]

    const groups = groupRecommendationsByPriority(recommendations)
    expect(groups.map((group) => group.priority)).toEqual([
      'CRITICAL',
      'HIGH',
      'MEDIUM',
    ])
    expect(groups[0]?.label).toBe('Inmediata')
    expect(groups[0]?.items).toHaveLength(1)
  })
})
