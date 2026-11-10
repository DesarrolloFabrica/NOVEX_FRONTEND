import { describe, expect, it } from 'vitest'
import { mapAuthUserToUser } from '@/modules/auth/services/auth-session.service'
import {
  decodeAccessTokenClaims,
  isAccessTokenExpired,
  type AccessTokenClaims,
} from '@/modules/auth/utils/decodeAccessToken'

function encodeClaims(
  claims: AccessTokenClaims | (Omit<AccessTokenClaims, 'exp'> & { exp?: number }),
): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const payload = btoa(JSON.stringify(claims))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
  return `${header}.${payload}.sig`
}

const baseClaims = (): AccessTokenClaims => ({
  sub: 'user-1',
  email: 'coord@cun.edu.co',
  roleId: 'role-1',
  roleCode: 'COORDINADOR',
  coordinationId: 'coord-uuid',
  permissions: ['SITUATIONS_VIEW'],
  status: 'ACTIVE',
  exp: null,
})

describe('decodeAccessTokenClaims', () => {
  it('extrae id, rol, coordinación, permisos y exp del JWT', () => {
    const claims: AccessTokenClaims = {
      ...baseClaims(),
      exp: 1_700_000_000,
    }

    const decoded = decodeAccessTokenClaims(encodeClaims(claims))
    expect(decoded).toEqual(claims)
  })

  it('acepta coordinación nula para roles sin asignación', () => {
    const claims: AccessTokenClaims = {
      sub: 'admin-1',
      email: 'admin@cun.edu.co',
      roleId: 'role-1',
      roleCode: 'ADMIN',
      coordinationId: null,
      permissions: ['SITUATIONS_VIEW'],
      status: 'ACTIVE',
      exp: null,
    }

    const decoded = decodeAccessTokenClaims(encodeClaims(claims))
    expect(decoded).toEqual(claims)
  })

  it('acepta token sin campo coordinationId (usuarios sin coordinación)', () => {
    const payload = {
      sub: 'director-1',
      email: 'director@cun.edu.co',
      roleId: 'role-1',
      roleCode: 'DIRECTOR',
      permissions: ['SITUATIONS_VIEW'],
      status: 'ACTIVE',
    }

    const decoded = decodeAccessTokenClaims(
      encodeClaims(payload as AccessTokenClaims),
    )
    expect(decoded?.coordinationId).toBeNull()
    expect(decoded?.roleCode).toBe('DIRECTOR')
    expect(decoded?.exp).toBeNull()
  })

  it('detecta caducidad con el claim exp', () => {
    const token = encodeClaims({
      ...baseClaims(),
      exp: 1_000,
    })
    expect(isAccessTokenExpired(token, 1_000_000)).toBe(true)
    expect(isAccessTokenExpired(token, 500_000)).toBe(false)
  })
})

describe('mapAuthUserToUser', () => {
  it('prioriza coordinación y permisos de /auth/me sobre claims JWT', () => {
    const user = mapAuthUserToUser(
      {
        id: 'user-1',
        fullName: 'Ana',
        roleCode: 'COORDINADOR',
        roleName: 'Coordinador',
        coordinationId: 'me-coordination-id',
        coordinationCode: 'coord-b2b',
      },
      {
        sub: 'user-1',
        email: 'ana@cun.edu.co',
        roleId: 'role-1',
        roleCode: 'COORDINADOR',
        coordinationId: 'jwt-coordination-id',
        permissions: ['SITUATIONS_CREATE', 'SITUATIONS_VIEW'],
        status: 'ACTIVE',
        exp: null,
      },
      { permissions: ['SITUATIONS_VIEW'] },
    )

    expect(user.coordinationId).toBe('me-coordination-id')
    expect(user.permissions).toEqual(['SITUATIONS_VIEW'])
    expect(user.selectedAreaId).toBe('coord-b2b')
    expect(user.role).toBe('ejecutor')
  })

  it('no reutiliza coordinación del JWT cuando /auth/me indica ausencia', () => {
    const user = mapAuthUserToUser(
      {
        id: 'user-1',
        fullName: 'Ana',
        roleCode: 'COORDINADOR',
        roleName: 'Coordinador',
        coordinationId: null,
        coordinationCode: null,
      },
      {
        sub: 'user-1',
        email: 'ana@cun.edu.co',
        roleId: 'role-1',
        roleCode: 'COORDINADOR',
        coordinationId: 'stale-jwt-coordination',
        permissions: ['SITUATIONS_CREATE'],
        status: 'ACTIVE',
        exp: null,
      },
      { permissions: [] },
    )

    expect(user.coordinationId).toBeUndefined()
    expect(user.selectedAreaId).toBeUndefined()
    expect(user.permissions).toEqual([])
  })

  it('permite login de admin sin coordinación asignada', () => {
    const user = mapAuthUserToUser(
      {
        id: 'admin-1',
        fullName: 'Desarrollo Fabrica',
        roleCode: 'ADMIN',
        roleName: 'Administrador',
        coordinationId: null,
        coordinationCode: null,
      },
      {
        sub: 'admin-1',
        email: 'desarrollofabrica@cun.edu.co',
        roleId: 'role-1',
        roleCode: 'ADMIN',
        coordinationId: null,
        permissions: ['SITUATIONS_VIEW'],
        status: 'ACTIVE',
        exp: null,
      },
    )

    expect(user.coordinationId).toBeUndefined()
    expect(user.selectedAreaId).toBeUndefined()
    expect(user.role).toBe('supervisor')
    expect(user.roleCode).toBe('ADMIN')
    expect(user.roleName).toBe('Administrador')
  })
})
