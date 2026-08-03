import { apiRequest } from '@/shared/api/http'

export interface AuthMeUser {
  id: string
  fullName: string
  roleCode: string
  coordinationId: string | null
  coordinationCode: string | null
}

export async function fetchAuthMe(): Promise<AuthMeUser> {
  const response = await apiRequest<{ user: AuthMeUser }>('/auth/me')
  return response.user
}
