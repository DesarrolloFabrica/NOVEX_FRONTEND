import { describe, expect, it } from 'vitest'
import { mapAuthUserToUser } from '@/modules/auth/services/auth-session.service'
import { decodeAccessTokenClaims } from '@/modules/auth/utils/decodeAccessToken'
import type { AccessTokenClaims } from '@/modules/auth/utils/decodeAccessToken'

function encodeClaims(claims: AccessTokenClaims): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const payload = btoa(JSON.stringify(claims))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
  return `${header}.${payload}.sig`
}

describe('decodeAccessTokenClaims', () => {
  it('extrae id, rol, coordinación y permisos del JWT', () => {
    const claims: AccessTokenClaims = {
      sub: 'user-1',
      email: 'coord@cun.edu.co',
      roleId: 'role-1',
      roleCode: 'COORDINADOR',
      coordinationId: 'coord-uuid',
      permissions: ['SITUATIONS_VIEW'],
      status: 'ACTIVE',
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

    const decoded = decodeAccessTokenClaims(encodeClaims(payload as AccessTokenClaims))
    expect(decoded?.coordinationId).toBeNull()
    expect(decoded?.roleCode).toBe('DIRECTOR')
  })
})

describe('mapAuthUserToUser', () => {
  it('usa la coordinación del JWT y no inventa una mock', () => {
    const user = mapAuthUserToUser(
      {
        id: 'user-1',
        fullName: 'Ana',
        roleCode: 'COORDINADOR',
        coordinationId: 'should-not-win',
        coordinationCode: 'coord-b2b',
      },
      {
        sub: 'user-1',
        email: 'ana@cun.edu.co',
        roleId: 'role-1',
        roleCode: 'COORDINADOR',
        coordinationId: 'jwt-coordination-id',
        permissions: ['SITUATIONS_CREATE'],
        status: 'ACTIVE',
      },
    )

    expect(user.coordinationId).toBe('jwt-coordination-id')
    expect(user.roleCode).toBe('COORDINADOR')
    expect(user.permissions).toEqual(['SITUATIONS_CREATE'])
    expect(user.selectedAreaId).toBe('coord-b2b')
    expect(user.role).toBe('ejecutor')
  })

  it('permite login de admin sin coordinación asignada', () => {
    const user = mapAuthUserToUser(
      {
        id: 'admin-1',
        fullName: 'Desarrollo Fabrica',
        roleCode: 'ADMIN',
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
      },
    )

    expect(user.coordinationId).toBeUndefined()
    expect(user.selectedAreaId).toBeUndefined()
    expect(user.role).toBe('supervisor')
    expect(user.roleCode).toBe('ADMIN')
  })
})
