import { describe, expect, it } from 'vitest'
import {
  resolveCoordinationId,
  starEdgeId,
} from '@/modules/impact-network/data/coordination-islands.config'

describe('coordination-islands.config', () => {
  it('resuelve ids de coordinaciones operativas y áreas institucionales', () => {
    expect(resolveCoordinationId('area-b2b')).toBe('coord-b2b')
    expect(resolveCoordinationId('TEC')).toBe('coord-ingenierias')
    expect(resolveCoordinationId('Coordinador de Operación Académica')).toBe(
      'coord-operaciones-academicas',
    )
    expect(resolveCoordinationId('Coordinador de Desarrollo Profesional')).toBe(
      'coord-desarrollo-profesional',
    )
  })

  it('genera ids de aristas estrella estables', () => {
    expect(starEdgeId('coord-ingenierias', 'coord-saber-pro')).toBe(
      'coord-ingenierias-->coord-saber-pro',
    )
  })
})
