import { describe, expect, it } from 'vitest'
import type { AdminOverview, AdminUser } from '@/modules/api/admin.api'
import {
  DEFAULT_USER_SORT,
  formatLastAccess,
  pageWindow,
  paginate,
  permissionsByModule,
  roleOptions,
  selectUsers,
  summarize,
  userInitials,
} from '@/modules/admin-console/adminConsoleModel'

function user(partial: Partial<AdminUser>): AdminUser {
  return {
    id: partial.fullName ?? 'u',
    fullName: 'Usuario',
    email: 'u@cun.edu.co',
    roleCode: 'COORDINADOR',
    roleName: 'Coordinador',
    coordinationId: null,
    coordinationName: null,
    status: 'ACTIVE',
    lastLoginAt: null,
    ...partial,
  }
}

const USERS = [
  user({ fullName: 'Zuany Acuña', roleCode: 'ADMIN', roleName: 'Administrador', lastLoginAt: '2026-11-11T15:00:00Z' }),
  user({ fullName: 'Ana Gómez', coordinationName: 'Saber Pro', lastLoginAt: '2026-11-09T10:00:00Z' }),
  user({ fullName: 'Bruno Díaz', status: 'INACTIVE', coordinationName: 'Negocios' }),
  user({ fullName: 'Carla Ruiz', status: 'SUSPENDED', roleCode: 'ANALISTA', roleName: 'Analista' }),
]

const ALL = { text: '', status: 'todos' as const, roleCode: null, sort: DEFAULT_USER_SORT }

describe('selectUsers', () => {
  it('ordena por nombre con acentos y sin distinguir mayúsculas', () => {
    expect(selectUsers(USERS, ALL).map((u) => u.fullName)).toEqual([
      'Ana Gómez',
      'Bruno Díaz',
      'Carla Ruiz',
      'Zuany Acuña',
    ])
  })

  it('«inactivos» incluye cualquier estado distinto de ACTIVE', () => {
    expect(selectUsers(USERS, { ...ALL, status: 'inactivos' }).map((u) => u.fullName)).toEqual([
      'Bruno Díaz',
      'Carla Ruiz',
    ])
  })

  it('busca en nombre, correo, rol y coordinación (también «alcance global»)', () => {
    expect(selectUsers(USERS, { ...ALL, text: 'saber' })).toHaveLength(1)
    expect(selectUsers(USERS, { ...ALL, text: 'ADMINISTRADOR' })).toHaveLength(1)
    expect(selectUsers(USERS, { ...ALL, text: 'alcance global' })).toHaveLength(2)
  })

  it('filtra por rol', () => {
    expect(selectUsers(USERS, { ...ALL, roleCode: 'ANALISTA' })).toHaveLength(1)
  })

  it('ordena por último acceso y deja al final a quien nunca entró', () => {
    const desc = selectUsers(USERS, { ...ALL, sort: { key: 'acceso', direction: 'desc' } })
    expect(desc[0].fullName).toBe('Zuany Acuña')
    expect(desc[1].fullName).toBe('Ana Gómez')
  })
})

describe('paginate y pageWindow', () => {
  it('acota la página y calcula el rango mostrado', () => {
    const page = paginate([1, 2, 3, 4, 5, 6, 7], 9, 3)
    expect(page).toMatchObject({ page: 3, pageCount: 3, from: 7, to: 7, total: 7 })
    expect(paginate([], 1, 3)).toMatchObject({ page: 1, pageCount: 1, from: 0, to: 0 })
  })

  it('muestra todas las páginas si son pocas y huecos si son muchas', () => {
    expect(pageWindow(2, 6)).toEqual([1, 2, 3, 4, 5, 6])
    expect(pageWindow(6, 12)).toEqual([1, null, 5, 6, 7, null, 12])
  })
})

describe('presentación', () => {
  it('saca iniciales de nombres y de correos', () => {
    expect(userInitials('Alberto Mario Valencia')).toBe('AM')
    expect(userInitials('analista@t.co')).toBe('AN')
    expect(userInitials('coord.a@t.co')).toBe('CA')
  })

  it('formatea el último acceso relativo a hoy', () => {
    const now = new Date(2026, 10, 11, 18, 0)
    expect(formatLastAccess(new Date(2026, 10, 11, 10, 24).toISOString(), now)).toMatch(/^Hoy, 10:24/)
    expect(formatLastAccess(new Date(2026, 10, 10, 16, 37).toISOString(), now)).toMatch(/^Ayer, 4:37/)
    expect(formatLastAccess(new Date(2026, 10, 3, 9, 0).toISOString(), now)).toMatch(/^3 nov, 9:00/)
    expect(formatLastAccess(new Date(2025, 2, 3).toISOString(), now)).toBe('3 mar 2025')
    expect(formatLastAccess(null, now)).toBe('Sin ingreso registrado')
  })

  it('resume con cifras reales', () => {
    const data: AdminOverview = {
      users: USERS,
      roles: [
        { id: 'r1', code: 'ADMIN', name: 'Administrador', description: null, isSystem: true, isActive: true },
        { id: 'r2', code: 'OLD', name: 'Antiguo', description: null, isSystem: false, isActive: false },
      ],
      permissions: [
        { id: 'p1', code: 'A', name: 'Ver', module: 'situaciones', description: null },
        { id: 'p2', code: 'B', name: 'Crear', module: 'situaciones', description: null },
        { id: 'p3', code: 'C', name: 'KPI', module: 'indicadores', description: null },
      ],
      coordinations: [
        { id: 'c1', code: 'x', name: 'X', isActive: true },
        { id: 'c2', code: 'y', name: 'Y', isActive: false },
      ],
      roleMatrix: [],
    }
    expect(summarize(data)).toEqual({
      users: { total: 4, active: 2, inactive: 2 },
      roles: { active: 1, system: 1 },
      coordinations: { active: 1, inactive: 1 },
      permissions: { total: 3, modules: 2 },
    })
    expect(permissionsByModule(data).map((g) => g.module)).toEqual(['indicadores', 'situaciones'])
    expect(roleOptions(USERS).map((r) => r.code)).toEqual(['ADMIN', 'ANALISTA', 'COORDINADOR'])
  })
})
