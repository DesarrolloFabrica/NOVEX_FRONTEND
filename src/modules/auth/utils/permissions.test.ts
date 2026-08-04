import { describe, expect, it } from 'vitest'
import {
  canCreateSituations,
  canCreateCoordinationSituations,
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
  roleName: 'Director',
  permissions: ['SITUATIONS_VIEW', 'REPORTS_VIEW'],
  coordinationId: 'coord-general',
  onboardingCompleted: false,
  onboardingStep: 0,
  onboardingSeenAt: null,
}

const analyst: User = {
  ...director,
  id: '2',
  name: 'Analista',
  roleCode: 'ANALISTA',
  roleName: 'Analista',
  permissions: ['SITUATIONS_VIEW', 'SITUATIONS_UPDATE'],
}

const coordinator: User = {
  ...director,
  id: '3',
  name: 'Coordinador',
  role: 'ejecutor',
  roleCode: 'COORDINADOR',
  roleName: 'Coordinador',
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

  it('permite al analista registrar sin darle creación por coordinación', () => {
    const analystWithCreate: User = {
      ...analyst,
      permissions: [...analyst.permissions, 'SITUATIONS_CREATE'],
    }

    expect(canCreateSituations(analystWithCreate)).toBe(true)
    expect(canCreateCoordinationSituations(analystWithCreate)).toBe(false)
  })

  it('oculta el registro incluso si un admin conserva un permiso anterior', () => {
    const adminWithStalePermission: User = {
      ...director,
      roleCode: 'ADMIN',
      roleName: 'Administrador',
      permissions: ['SITUATIONS_CREATE'],
    }

    expect(canCreateSituations(adminWithStalePermission)).toBe(false)
    expect(canCreateCoordinationSituations(adminWithStalePermission)).toBe(false)
  })

  it('identifica coordinador para bloqueo de coordinación', () => {
    expect(isCoordinator(coordinator)).toBe(true)
    expect(canCreateSituations(coordinator)).toBe(true)
    expect(canCreateCoordinationSituations(coordinator)).toBe(true)
  })
})
