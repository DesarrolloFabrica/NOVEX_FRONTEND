import { describe, expect, it } from 'vitest'
import {
  getEffectiveDashboardRole,
  getRoleLandingPath,
  seesInstitutionalSituationRegistry,
} from './roleExperience'

describe('roleExperience', () => {
  it('envía cada rol a su experiencia inicial', () => {
    expect(getRoleLandingPath({ roleCode: 'ANALISTA' })).toBe('/red-impacto')
    expect(getRoleLandingPath({ roleCode: 'DIRECTOR' })).toBe('/red-impacto')
    expect(getRoleLandingPath({ roleCode: 'ADMIN' })).toBe('/red-impacto')
    // VERDAD NUEVA: el coordinador aterriza en el Centro Operacional, que es
    // donde reporta y donde resuelve. Antes llegaba a la red de impacto con su
    // coordinación preseleccionada, y a esta pantalla solo se entraba a mano.
    expect(
      getRoleLandingPath({ roleCode: 'COORDINADOR', selectedAreaId: 'B2B' }),
    ).toBe('/centro-operacional')
    expect(getRoleLandingPath({ roleCode: 'COORDINADOR' })).toBe(
      '/centro-operacional',
    )
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
