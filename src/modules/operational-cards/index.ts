/**
 * Experiencia ADMIN de estado operacional (baraja de coordinaciones).
 * Módulo aislado: no reutiliza ImpactNetworkExperience como contenedor ni
 * mueve código legacy.
 *
 * Fase 2: solo identidad visual y contratos. Todavía sin UI, sin cliente de
 * API, sin reducer y sin CSS.
 */

export {
  getCoordinationVisualIdentities,
  getCoordinationVisualIdentity,
  resolveCoordinationVisualIdentity,
} from '@/modules/operational-cards/data/coordinationVisualIdentity'
export type {
  CoordinationVisualIdentity,
  CoordinationVisualIdentitySource,
} from '@/modules/operational-cards/data/coordinationVisualIdentity'

export {
  OPERATIONAL_INTEGRITY_STATUSES,
  isOperationalIntegrityStatus,
  parseOperationalIntegrityStatus,
} from '@/modules/operational-cards/types/operational-status.types'
export type {
  CoordinationIntegrityStatus,
  OperationalIntegrityStatus,
} from '@/modules/operational-cards/types/operational-status.types'

export { DEFAULT_CHARACTER_PRESENTATION } from '@/modules/operational-cards/types/character.types'
export type {
  CharacterInteraction,
  CharacterOrientation,
  CharacterPresentation,
  CharacterStatus,
} from '@/modules/operational-cards/types/character.types'

export type {
  AnalystRegistryOverview,
  CoordinationOverview,
  OperationalOverview,
  OperationalOverviewTotals,
} from '@/modules/operational-cards/types/operational-overview.contract'

export type {
  ActiveSituationStatus,
  CoordinationProblemSummary,
  CoordinationProblemsCache,
  LoadState,
  OperationalCardsState,
} from '@/modules/operational-cards/types/operational-cards.state'

export { OperationalCardExperience } from '@/modules/operational-cards/experience/OperationalCardExperience'

export { fetchOperationalOverview, parseOperationalOverview, OperationalOverviewContractError } from '@/modules/operational-cards/services/operational-overview.service'

export { useOperationalOverview } from '@/modules/operational-cards/hooks/useOperationalOverview'
