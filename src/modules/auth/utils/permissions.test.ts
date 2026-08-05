import { describe, expect, it } from 'vitest'
import {
  canCreateSituations,
  canCreateCoordinationSituations,
  canUpdateSituations,
  canUpdateSituationStatus,
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
      coordinationId: undefined,
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

  it('deja actualizar el estado a la coordinación dueña del caso', () => {
    expect(
      canUpdateSituationStatus(coordinator, {
        createdByUserId: 'otro-usuario',
        coordinationId: 'coord-b2b',
      }),
    ).toBe(true)
  })

  it('bloquea al coordinador frente a casos de otra coordinación', () => {
    expect(
      canUpdateSituationStatus(coordinator, {
        createdByUserId: 'otro-usuario',
        coordinationId: 'coord-ingenierias',
      }),
    ).toBe(false)
  })

  it('limita al analista a los casos que registró', () => {
    expect(
      canUpdateSituationStatus(analyst, {
        createdByUserId: analyst.id,
        coordinationId: 'coord-b2b',
      }),
    ).toBe(true)
    expect(
      canUpdateSituationStatus(analyst, {
        createdByUserId: 'otro-usuario',
        coordinationId: 'coord-b2b',
      }),
    ).toBe(false)
  })

  it('mantiene informativo al director aunque conserve un permiso anterior', () => {
    const directorWithStalePermission: User = {
      ...director,
      permissions: [...director.permissions, 'SITUATIONS_UPDATE'],
    }

    expect(
      canUpdateSituationStatus(directorWithStalePermission, {
        createdByUserId: 'otro-usuario',
        coordinationId: 'coord-b2b',
      }),
    ).toBe(false)
  })

  it('no habilita acciones sin situación enfocada', () => {
    expect(canUpdateSituationStatus(coordinator, null)).toBe(false)
  })

  it('identifica coordinador para bloqueo de coordinación', () => {
    expect(isCoordinator(coordinator)).toBe(true)
    expect(canCreateSituations(coordinator)).toBe(true)
    expect(canCreateCoordinationSituations(coordinator)).toBe(true)
  })

  it('bloquea al coordinador sin coordinación aunque tenga permiso', () => {
    const coordinatorWithoutCoordination: User = {
      ...coordinator,
      coordinationId: undefined,
      selectedAreaId: undefined,
    }

    expect(canCreateSituations(coordinatorWithoutCoordination)).toBe(false)
    expect(canCreateCoordinationSituations(coordinatorWithoutCoordination)).toBe(
      false,
    )
  })
})
