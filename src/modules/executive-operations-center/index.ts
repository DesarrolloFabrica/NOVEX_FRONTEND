export {
  EXECUTIVE_OPERATIONS_HOME,
  EXECUTIVE_OPERATIONS_ROUTES,
  EXECUTIVE_ROLES,
} from '@/modules/executive-operations-center/constants/routes'

export {
  EXECUTIVE_CENTER_RAIL_ITEM,
  EOC_SUB_NAV_ITEMS,
} from '@/modules/executive-operations-center/constants/navigation'

export { ExecutiveOperationsLayout } from '@/modules/executive-operations-center/components/layout/ExecutiveOperationsLayout'

export { ExecutiveOperationsHomePage } from '@/modules/executive-operations-center/pages/ExecutiveOperationsHomePage'
export { ExecutiveHome } from '@/modules/executive-operations-center/components/home/ExecutiveHome'
export { useExecutiveOperations } from '@/modules/executive-operations-center/hooks/useExecutiveOperations'
export { PanoramaPage } from '@/modules/executive-operations-center/pages/PanoramaPage'
export { InteligenciaPage } from '@/modules/executive-operations-center/pages/InteligenciaPage'
export { ReportesPage } from '@/modules/executive-operations-center/pages/ReportesPage'

export type {
  ExecutiveNavIcon,
  ExecutiveNavItem,
} from '@/modules/executive-operations-center/types/navigation.types'

export type {
  OperationalCenterData,
  OperationalCenterSituation,
  OperationalCenterMetrics,
  OperationalAuditEvent,
  OperationalCoordinationRollup,
} from '@/modules/executive-operations-center/types/operational-center.types'
