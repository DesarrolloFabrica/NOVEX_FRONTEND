import type { NovexRoleCode } from '@/modules/auth/utils/roleExperience'

const IMPACT_NETWORK_TOUR_VERSION = 1
const IMPACT_NETWORK_TOUR_PREFIX = `novex.impact-network.tour.v${IMPACT_NETWORK_TOUR_VERSION}`

export type ImpactNetworkTourOutcome = 'completed' | 'skipped'

interface ImpactNetworkTourRecord {
  version: number
  outcome: ImpactNetworkTourOutcome
  seenAt: string
}

function browserStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

export function isImpactNetworkTourRole(role: NovexRoleCode): boolean {
  return role === 'ADMIN' || role === 'DIRECTOR' || role === 'ANALISTA'
}

export function getImpactNetworkTourStorageKey(userId: string): string {
  return `${IMPACT_NETWORK_TOUR_PREFIX}.${encodeURIComponent(userId)}`
}

export function hasSeenImpactNetworkTour(
  userId: string,
  storage: Storage | undefined = browserStorage(),
): boolean {
  if (!storage) return false
  try {
    const raw = storage.getItem(getImpactNetworkTourStorageKey(userId))
    if (!raw) return false
    const record = JSON.parse(raw) as Partial<ImpactNetworkTourRecord>
    return (
      record.version === IMPACT_NETWORK_TOUR_VERSION &&
      (record.outcome === 'completed' || record.outcome === 'skipped')
    )
  } catch {
    return false
  }
}

export function rememberImpactNetworkTour(
  userId: string,
  outcome: ImpactNetworkTourOutcome,
  storage: Storage | undefined = browserStorage(),
): void {
  if (!storage) return
  const record: ImpactNetworkTourRecord = {
    version: IMPACT_NETWORK_TOUR_VERSION,
    outcome,
    seenAt: new Date().toISOString(),
  }
  try {
    storage.setItem(
      getImpactNetworkTourStorageKey(userId),
      JSON.stringify(record),
    )
  } catch {
    // El recorrido sigue funcionando aunque el navegador bloquee storage.
  }
}
