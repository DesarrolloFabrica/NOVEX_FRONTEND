import { describe, expect, it } from 'vitest'
import {
  getEffectiveDashboardRole,
  getRoleLandingPath,
  seesInstitutionalSituationRegistry,
} from './roleExperience'

describe('roleExperience', () => {
  it('envía los cuatro roles al Centro Operacional', () => {
    // Fase 1: landing único. Ningún rol aterriza ya en `/red-impacto`.
    for (const roleCode of ['ADMIN', 'DIRECTOR', 'ANALISTA', 'COORDINADOR']) {
      expect(getRoleLandingPath({ roleCode })).toBe('/centro-operacional')
    }
    expect(
      getRoleLandingPath({ roleCode: 'COORDINADOR', selectedAreaId: 'B2B' }),
    ).toBe('/centro-operacional')
    // Sin sesión o con un rol desconocido tampoco hay destino legacy.
    expect(getRoleLandingPath(null)).toBe('/centro-operacional')
    expect(getRoleLandingPath({ roleCode: 'OTRO' })).toBe('/centro-operacional')
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
