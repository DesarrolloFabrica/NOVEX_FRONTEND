/** usuario autenticado en Novex */
export type UserRole = 'supervisor' | 'ejecutor'

export interface User {
  /** Identificador estable e interno del usuario. */
  id: string
  /** Nombre visible del usuario. */
  name: string
  /** Rol que determina permisos y vistas disponibles. */
  role: UserRole
  /** Código de rol del backend (COORDINADOR, ANALISTA, DIRECTOR, ADMIN). */
  roleCode: string
  /** Permisos embebidos en el JWT. */
  permissions: string[]
  /** Código de coordinación del backend (relevante para el rol ejecutor). */
  selectedAreaId?: string
  /** Coordinación principal del usuario (UUID embebido en el JWT). */
  coordinationId?: string
  /** Preferencia: onboarding de primera vez completado. */
  onboardingCompleted: boolean
  /** Timestamp ISO de la primera finalización del onboarding. */
  onboardingSeenAt: string | null
}
