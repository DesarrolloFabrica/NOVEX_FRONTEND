/** Usuario autenticado en O.M.E.G.A. */
export type UserRole = 'supervisor' | 'ejecutor'

export interface User {
  /** Identificador estable e interno del usuario. */
  id: string
  /** Nombre visible del usuario. */
  name: string
  /** Rol que determina permisos y vistas disponibles. */
  role: UserRole
  /** Área seleccionada (relevante sobre todo para el rol ejecutor). */
  selectedAreaId?: string
  /** Preferencia: onboarding de primera vez completado. */
  onboardingCompleted: boolean
  /** Timestamp ISO de la primera finalización del onboarding. */
  onboardingSeenAt: string | null
}
