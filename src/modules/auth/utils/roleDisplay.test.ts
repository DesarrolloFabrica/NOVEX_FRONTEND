import { describe, expect, it } from 'vitest'
import { getRoleDisplayName } from '@/modules/auth/utils/roleDisplay'
import type { User } from '@/modules/auth/types/user.types'

const baseUser: User = {
  id: '1',
  name: 'Usuario',
  role: 'supervisor',
  roleCode: 'DIRECTOR',
  roleName: '',
  permissions: [],
  onboardingCompleted: false,
  onboardingStep: 0,
  onboardingSeenAt: null,
}

describe('getRoleDisplayName', () => {
  it('prioriza roleName del backend', () => {
    expect(
      getRoleDisplayName({ ...baseUser, roleName: 'Coordinador Bellas Artes' }),
    ).toBe('Coordinador Bellas Artes')
  })

  it('resuelve por roleCode cuando roleName está vacío', () => {
    expect(getRoleDisplayName({ ...baseUser, roleCode: 'COORDINADOR' })).toBe(
      'Coordinador',
    )
    expect(getRoleDisplayName({ ...baseUser, roleCode: 'ANALISTA' })).toBe(
      'Analista',
    )
    expect(getRoleDisplayName({ ...baseUser, roleCode: 'DIRECTOR' })).toBe(
      'Director',
    )
    expect(getRoleDisplayName({ ...baseUser, roleCode: 'ADMIN' })).toBe(
      'Administrador',
    )
  })

  it('devuelve Operador cuando no hay usuario', () => {
    expect(getRoleDisplayName(null)).toBe('Operador')
    expect(getRoleDisplayName(undefined)).toBe('Operador')
  })
})
