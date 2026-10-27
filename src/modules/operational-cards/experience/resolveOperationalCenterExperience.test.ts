import { describe, expect, it } from 'vitest'
import {
  experienceAllowsOperation,
  resolveOperationalCenterExperience,
} from '@/modules/operational-cards/experience/resolveOperationalCenterExperience'

describe('resolveOperationalCenterExperience', () => {
  it('asigna un shell por rol sin compartir composición', () => {
    expect(resolveOperationalCenterExperience('DIRECTOR')).toBe('director')
    expect(resolveOperationalCenterExperience('ANALISTA')).toBe('analyst')
    expect(resolveOperationalCenterExperience('COORDINADOR')).toBe(
      'coordinator',
    )
    expect(resolveOperationalCenterExperience('ADMIN')).toBe('admin')
  })

  it('solo ANALISTA y COORDINADOR operan el ciclo de vida', () => {
    expect(experienceAllowsOperation('director')).toBe(false)
    expect(experienceAllowsOperation('admin')).toBe(false)
    expect(experienceAllowsOperation('analyst')).toBe(true)
    expect(experienceAllowsOperation('coordinator')).toBe(true)
  })
})
