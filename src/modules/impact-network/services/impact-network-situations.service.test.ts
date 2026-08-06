import { describe, expect, it } from 'vitest'
import { mapSituationStatusToEventStatus } from './impact-network-situations.service'

describe('mapSituationStatusToEventStatus', () => {
  it('mantiene OPEN e IN_PROGRESS en el mapa', () => {
    expect(mapSituationStatusToEventStatus('OPEN')).toBe('open')
    expect(mapSituationStatusToEventStatus('IN_PROGRESS')).toBe('monitoring')
  })

  it('trata RESOLVED legado como En atención (sigue activo en el mapa)', () => {
    expect(mapSituationStatusToEventStatus('RESOLVED')).toBe('monitoring')
  })

  it('solo CLOSED abandona el mapa', () => {
    expect(mapSituationStatusToEventStatus('CLOSED')).toBe('archived')
  })
})
