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
  /** Nombre visible del rol desde el catálogo del backend. */
  roleName: string
  /** Permisos efectivos (desde `/auth/me` tras bootstrap; claims solo en login fresco). */
  permissions: string[]
  /** Código de coordinación del backend (relevante para el rol ejecutor). */
  selectedAreaId?: string
  /** Coordinación principal vigente del usuario (desde `/auth/me` / resumen). */
  coordinationId?: string
  /** Preferencia: onboarding de primera vez completado. */
  onboardingCompleted: boolean
  onboardingStep: number
  /** Timestamp ISO de la primera finalización del onboarding. */
  onboardingSeenAt: string | null
}
