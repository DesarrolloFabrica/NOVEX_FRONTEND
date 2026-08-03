import { describe, expect, it } from 'vitest'
import {
  canCreateSituations,
  canUpdateSituations,
  hasPermission,
  isCoordinator,
} from '@/modules/auth/utils/permissions'
import type { User } from '@/modules/auth/types/user.types'

const director: User = {
  id: '1',
  name: 'Director',
  role: 'supervisor',
  roleCode: 'DIRECTOR',
  permissions: ['SITUATIONS_VIEW', 'REPORTS_VIEW'],
  coordinationId: 'coord-general',
  onboardingCompleted: false,
  onboardingSeenAt: null,
}

const analyst: User = {
  ...director,
  id: '2',
  name: 'Analista',
  roleCode: 'ANALISTA',
  permissions: ['SITUATIONS_VIEW', 'SITUATIONS_UPDATE'],
}

const coordinator: User = {
  ...director,
  id: '3',
  name: 'Coordinador',
  role: 'ejecutor',
  roleCode: 'COORDINADOR',
  permissions: ['SITUATIONS_VIEW', 'SITUATIONS_CREATE', 'SITUATIONS_UPDATE'],
  coordinationId: 'coord-b2b',
  selectedAreaId: 'coord-b2b',
}

describe('permissions utils', () => {
  it('oculta registro de situaciones al director', () => {
    expect(canCreateSituations(director)).toBe(false)
    expect(hasPermission(director, 'SITUATIONS_CREATE')).toBe(false)
  })

  it('permite actualizar estados al analista', () => {
    expect(canUpdateSituations(analyst)).toBe(true)
  })

  it('identifica coordinador para bloqueo de coordinación', () => {
    expect(isCoordinator(coordinator)).toBe(true)
    expect(canCreateSituations(coordinator)).toBe(true)
  })
})
