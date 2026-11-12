import type { AdminOverview, AdminUser } from '@/modules/api/admin.api'

/**
 * Lógica pura de la Consola de Administración: filtros, orden, paginación y
 * formatos de presentación. Sin React ni red, para poder probarla aislada.
 */

export type AdminSection = 'usuarios' | 'roles' | 'coordinaciones' | 'permisos' | 'sistema'

export type UserStatusFilter = 'todos' | 'activos' | 'inactivos'

export type UserSortKey = 'usuario' | 'rol' | 'coordinacion' | 'acceso' | 'estado'

export interface UserSort {
  key: UserSortKey
  direction: 'asc' | 'desc'
}

export interface UserQuery {
  text: string
  status: UserStatusFilter
  roleCode: string | null
  sort: UserSort
}

export const USERS_PAGE_SIZE = 6

export const DEFAULT_USER_SORT: UserSort = { key: 'usuario', direction: 'asc' }

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true })

export function isActive(user: AdminUser): boolean {
  return user.status === 'ACTIVE'
}

export function countByStatus(users: readonly AdminUser[]) {
  const active = users.filter(isActive).length
  return { total: users.length, active, inactive: users.length - active }
}

function matchesText(user: AdminUser, text: string): boolean {
  const needle = text.trim().toLocaleLowerCase('es')
  if (!needle) return true
  return [user.fullName, user.email, user.roleName, user.coordinationName ?? 'alcance global'].some(
    (value) => value.toLocaleLowerCase('es').includes(needle),
  )
}

function accessTime(user: AdminUser): number {
  if (!user.lastLoginAt) return Number.NEGATIVE_INFINITY
  const time = new Date(user.lastLoginAt).getTime()
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time
}

function compareUsers(a: AdminUser, b: AdminUser, key: UserSortKey): number {
  switch (key) {
    case 'usuario':
      return collator.compare(a.fullName, b.fullName)
    case 'rol':
      return collator.compare(a.roleName, b.roleName)
    case 'coordinacion':
      return collator.compare(a.coordinationName ?? '', b.coordinationName ?? '')
    case 'acceso':
      return accessTime(a) - accessTime(b)
    case 'estado':
      return collator.compare(a.status, b.status)
  }
}

/** Filtra y ordena. El desempate por nombre mantiene un orden estable. */
export function selectUsers(users: readonly AdminUser[], query: UserQuery): AdminUser[] {
  const factor = query.sort.direction === 'asc' ? 1 : -1
  return users
    .filter((user) => matchesText(user, query.text))
    .filter((user) =>
      query.status === 'activos'
        ? isActive(user)
        : query.status === 'inactivos'
          ? !isActive(user)
          : true,
    )
    .filter((user) => (query.roleCode ? user.roleCode === query.roleCode : true))
    .sort(
      (a, b) =>
        factor * compareUsers(a, b, query.sort.key) ||
        collator.compare(a.fullName, b.fullName),
    )
}

export interface Page<T> {
  items: T[]
  page: number
  pageCount: number
  from: number
  to: number
  total: number
}

export function paginate<T>(items: readonly T[], page: number, size = USERS_PAGE_SIZE): Page<T> {
  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / size))
  const current = Math.min(Math.max(1, page), pageCount)
  const start = (current - 1) * size
  const slice = items.slice(start, start + size)
  return {
    items: slice,
    page: current,
    pageCount,
    from: total === 0 ? 0 : start + 1,
    to: start + slice.length,
    total,
  }
}

/**
 * Números de página a mostrar, con `null` como hueco («…»). Siempre primera y
 * última; alrededor de la actual, una a cada lado.
 */
export function pageWindow(page: number, pageCount: number): Array<number | null> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const pages = new Set([1, pageCount, page - 1, page, page + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b)
  const result: Array<number | null> = []
  sorted.forEach((p, index) => {
    if (index > 0 && p - sorted[index - 1] > 1) result.push(null)
    result.push(p)
  })
  return result
}

/** Dos iniciales del nombre; para nombres tipo correo, las dos primeras letras. */
export function userInitials(fullName: string): string {
  const clean = fullName.split('@')[0].replace(/[._-]+/g, ' ').trim()
  const words = clean.split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toLocaleUpperCase('es')
  return (words[0] ?? '?').slice(0, 2).toLocaleUpperCase('es')
}

const timeFormat = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' })
const monthFormat = new Intl.DateTimeFormat('es-CO', { month: 'short' })

/** «13 nov» (sin el «de» ni el punto que añade es-CO). */
function dayMonth(date: Date): string {
  return `${date.getDate()} ${monthFormat.format(date).replace('.', '')}`
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/**
 * Último acceso en lenguaje llano: «Hoy, 10:24 a. m.», «Ayer, 4:37 p. m.»,
 * «13 nov, 6:21 p. m.» (este año) o «13 nov 2025» (años anteriores).
 */
export function formatLastAccess(value: string | null, now: Date = new Date()): string {
  if (!value) return 'Sin ingreso registrado'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)
  const time = timeFormat.format(date)
  if (days === 0) return `Hoy, ${time}`
  if (days === 1) return `Ayer, ${time}`
  if (date.getFullYear() === now.getFullYear()) return `${dayMonth(date)}, ${time}`
  return `${dayMonth(date)} ${date.getFullYear()}`
}

/** Cifras reales para las tarjetas de resumen (sin tendencias inventadas). */
export function summarize(data: AdminOverview) {
  const users = countByStatus(data.users)
  const activeRoles = data.roles.filter((role) => role.isActive)
  const activeCoordinations = data.coordinations.filter((item) => item.isActive).length
  const modules = new Set(data.permissions.map((item) => item.module)).size
  return {
    users,
    roles: {
      active: activeRoles.length,
      system: activeRoles.filter((role) => role.isSystem).length,
    },
    coordinations: {
      active: activeCoordinations,
      inactive: data.coordinations.length - activeCoordinations,
    },
    permissions: { total: data.permissions.length, modules },
  }
}

/** Roles presentes en la lista de usuarios, para el filtro. */
export function roleOptions(users: readonly AdminUser[]) {
  const byCode = new Map<string, string>()
  users.forEach((user) => byCode.set(user.roleCode, user.roleName))
  return [...byCode.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => collator.compare(a.name, b.name))
}

/** Permisos agrupados por módulo, en orden alfabético. */
export function permissionsByModule(data: AdminOverview) {
  const groups = new Map<string, AdminOverview['permissions']>()
  data.permissions.forEach((item) => {
    const list = groups.get(item.module) ?? []
    list.push(item)
    groups.set(item.module, list)
  })
  return [...groups.entries()]
    .map(([module, items]) => ({
      module,
      items: [...items].sort((a, b) => collator.compare(a.name, b.name)),
    }))
    .sort((a, b) => collator.compare(a.module, b.module))
}
