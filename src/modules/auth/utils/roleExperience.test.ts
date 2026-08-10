import { describe, expect, it } from 'vitest'
import {
  getEffectiveDashboardRole,
  getRoleLandingPath,
  seesInstitutionalSituationRegistry,
} from './roleExperience'

describe('roleExperience', () => {
  it('envía cada rol a su experiencia inicial', () => {
    expect(getRoleLandingPath({ roleCode: 'ANALISTA' })).toBe(
      '/centro-operacional',
    )
    expect(getRoleLandingPath({ roleCode: 'DIRECTOR' })).toBe(
      '/centro-operacional',
    )
    expect(getRoleLandingPath({ roleCode: 'ADMIN' })).toBe('/centro-operacional')
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

  it('distingue historial institucional vs coordinación propia', () => {
    expect(seesInstitutionalSituationRegistry('ADMIN')).toBe(true)
    expect(seesInstitutionalSituationRegistry('DIRECTOR')).toBe(true)
    expect(seesInstitutionalSituationRegistry('ANALISTA')).toBe(true)
    expect(seesInstitutionalSituationRegistry('COORDINADOR')).toBe(false)
  })
})
