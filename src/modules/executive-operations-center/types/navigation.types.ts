import type { NovexRoleCode } from '@/modules/auth/utils/roleExperience'

export type ExecutiveNavIcon =
  | 'home'
  | 'panorama'
  | 'inteligencia'
  | 'reportes'
  | 'admin'

export type ExecutiveNavItem = {
  to: string
  label: string
  eyebrow: string
  icon: ExecutiveNavIcon
  end?: boolean
  roles: readonly NovexRoleCode[]
}
