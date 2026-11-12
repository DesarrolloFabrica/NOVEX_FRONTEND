import { apiRequest } from '@/shared/api/http'

export interface AdminUser {
  id: string
  fullName: string
  email: string
  roleCode: string
  roleName: string
  coordinationId: string | null
  coordinationName: string | null
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  lastLoginAt: string | null
}

export interface AdminRole {
  id: string
  code: string
  name: string
  description: string | null
  isSystem: boolean
  isActive: boolean
}

export interface AdminPermission {
  id: string
  code: string
  name: string
  module: string
  description: string | null
}

export interface AdminCoordination {
  id: string
  code: string
  name: string
  isActive: boolean
  shortName?: string
  description?: string | null
  color?: string
  displayOrder?: number
}

/** Fila de la matriz rol × permisos (`GET /admin/role-matrix`). */
export interface AdminRoleMatrixRow extends AdminRole {
  /** El rol Administrador no se edita desde la consola (anti-bloqueo). */
  locked: boolean
  permissionCodes: string[]
  userCount: number
  activeUserCount: number
}

export interface AdminOverview {
  users: AdminUser[]
  roles: AdminRole[]
  permissions: AdminPermission[]
  coordinations: AdminCoordination[]
  roleMatrix: AdminRoleMatrixRow[]
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const [users, roles, permissions, coordinations, roleMatrix] = await Promise.all([
    apiRequest<AdminUser[]>('/users?includeInactive=true'),
    apiRequest<AdminRole[]>('/roles?includeInactive=true'),
    apiRequest<AdminPermission[]>('/permissions'),
    apiRequest<AdminCoordination[]>(
      '/coordinations?includeInactive=true&catalog=true',
    ),
    apiRequest<AdminRoleMatrixRow[]>('/admin/role-matrix'),
  ])
  return { users, roles, permissions, coordinations, roleMatrix }
}

export async function updateAdminUserStatus(
  userId: string,
  status: AdminUser['status'],
): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

/* ---------------------------------------------------------------- Usuarios */

export interface AdminUserInput {
  fullName: string
  email: string
  roleCode: string
  /** `null` = alcance global (no permitido para COORDINADOR). */
  coordinationId: string | null
  status: 'ACTIVE' | 'INACTIVE'
}

export function createAdminUser(input: AdminUserInput): Promise<AdminUser> {
  return apiRequest<AdminUser>('/users', { method: 'POST', body: JSON.stringify(input) })
}

export function updateAdminUser(
  userId: string,
  changes: Partial<Omit<AdminUserInput, 'email'>>,
): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  })
}

/* ------------------------------------------------------------------- Roles */

export function updateAdminRole(
  roleId: string,
  changes: { name?: string; description?: string | null; isActive?: boolean },
): Promise<AdminRoleMatrixRow> {
  return apiRequest<AdminRoleMatrixRow>(`/admin/roles/${encodeURIComponent(roleId)}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  })
}

export function replaceAdminRolePermissions(
  roleId: string,
  permissionCodes: string[],
): Promise<AdminRoleMatrixRow> {
  return apiRequest<AdminRoleMatrixRow>(
    `/admin/roles/${encodeURIComponent(roleId)}/permissions`,
    { method: 'PUT', body: JSON.stringify({ permissionCodes }) },
  )
}

/* ---------------------------------------------------------- Coordinaciones */

export interface AdminCoordinationInput {
  code: string
  name: string
  shortName: string
  description: string | null
  color: string
  displayOrder?: number
}

export function createAdminCoordination(
  input: AdminCoordinationInput,
): Promise<AdminCoordination> {
  return apiRequest<AdminCoordination>('/admin/coordinations', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateAdminCoordination(
  coordinationId: string,
  changes: Partial<Omit<AdminCoordinationInput, 'code'>> & { isActive?: boolean },
): Promise<AdminCoordination> {
  return apiRequest<AdminCoordination>(
    `/admin/coordinations/${encodeURIComponent(coordinationId)}`,
    { method: 'PATCH', body: JSON.stringify(changes) },
  )
}

/* --------------------------------------------------------------- Auditoría */

export interface AdminAuditLogItem {
  id: string
  action: string
  resourceType: string
  resourceId: string | null
  actorUserId: string | null
  actorRole: string | null
  actorName: string | null
  actorEmail: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface AdminAuditLogPage {
  items: AdminAuditLogItem[]
  total: number
  page: number
  limit: number
  facets: { actions: string[]; resourceTypes: string[] }
}

export interface AdminAuditLogQuery {
  page?: number
  limit?: number
  action?: string
  resourceType?: string
  from?: string
  to?: string
}

export function fetchAdminAuditLogs(query: AdminAuditLogQuery): Promise<AdminAuditLogPage> {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  return apiRequest<AdminAuditLogPage>(`/admin/audit-logs?${params.toString()}`)
}
