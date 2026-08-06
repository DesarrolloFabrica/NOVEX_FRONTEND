import { describe, expect, it } from 'vitest'
import type { SituationRecommendation } from '@/modules/api/recommendations.api'
import { groupRecommendationsByPriority } from '@/modules/monitoring/utils/situation-management.presentation'
import {
  getNextOperationalStatus,
  lifecyclePhase,
  OPERATIONAL_STATUS_LABEL,
  requiresStatusComment,
} from '@/modules/monitoring/utils/situation-lifecycle'

describe('situation lifecycle', () => {
  it('solo permite el estado inmediatamente siguiente (3 pasos)', () => {
    expect(getNextOperationalStatus('OPEN')).toBe('IN_PROGRESS')
    expect(getNextOperationalStatus('IN_PROGRESS')).toBe('CLOSED')
    expect(getNextOperationalStatus('RESOLVED')).toBe('CLOSED')
    expect(getNextOperationalStatus('CLOSED')).toBeNull()
  })

  it('trata RESOLVED legado como En atención en la línea de tiempo', () => {
    expect(OPERATIONAL_STATUS_LABEL.RESOLVED).toBe('En atención')
    expect(lifecyclePhase('RESOLVED', 'OPEN')).toBe('complete')
    expect(lifecyclePhase('RESOLVED', 'IN_PROGRESS')).toBe('current')
    expect(lifecyclePhase('RESOLVED', 'CLOSED')).toBe('pending')
  })

  it('marca fases complete / current / pending', () => {
    expect(lifecyclePhase('IN_PROGRESS', 'OPEN')).toBe('complete')
    expect(lifecyclePhase('IN_PROGRESS', 'IN_PROGRESS')).toBe('current')
    expect(lifecyclePhase('IN_PROGRESS', 'CLOSED')).toBe('pending')
  })

  it('exige comentario solo al cerrar', () => {
    expect(requiresStatusComment('IN_PROGRESS')).toBe(false)
    expect(requiresStatusComment('RESOLVED')).toBe(false)
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
