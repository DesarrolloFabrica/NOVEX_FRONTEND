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
}

export interface AdminOverview {
  users: AdminUser[]
  roles: AdminRole[]
  permissions: AdminPermission[]
  coordinations: AdminCoordination[]
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const [users, roles, permissions, coordinations] = await Promise.all([
    apiRequest<AdminUser[]>('/users?includeInactive=true'),
    apiRequest<AdminRole[]>('/roles?includeInactive=true'),
    apiRequest<AdminPermission[]>('/permissions'),
    apiRequest<AdminCoordination[]>(
      '/coordinations?includeInactive=true&catalog=true',
    ),
  ])
  return { users, roles, permissions, coordinations }
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
