import { describe, expect, it } from 'vitest'
import { getEffectiveDashboardRole, getRoleLandingPath } from './roleExperience'

describe('roleExperience', () => {
  it('envía cada rol a su experiencia inicial', () => {
    expect(getRoleLandingPath({ roleCode: 'ANALISTA' })).toBe('/dashboard')
    expect(getRoleLandingPath({ roleCode: 'DIRECTOR' })).toBe('/dashboard')
    expect(getRoleLandingPath({ roleCode: 'ADMIN' })).toBe('/admin')
    expect(
      getRoleLandingPath({ roleCode: 'COORDINADOR', selectedAreaId: 'B2B' }),
    ).toBe('/red-impacto?coordination=B2B')
  })

  it('solo permite que el administrador previsualice otro rol', () => {
    expect(getEffectiveDashboardRole({ roleCode: 'ADMIN' }, 'DIRECTOR')).toBe(
      'DIRECTOR',
    )
    expect(
      getEffectiveDashboardRole({ roleCode: 'ANALISTA' }, 'DIRECTOR'),
    ).toBe('ANALISTA')
  })
})
