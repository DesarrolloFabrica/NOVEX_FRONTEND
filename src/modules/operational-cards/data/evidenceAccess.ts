import type { User } from '@/modules/auth/types/user.types'
import { hasPermission } from '@/modules/auth/utils/permissions'
import type { ProblemDetail } from '@/modules/operational-cards/types/problem-detail.types'
import type { SituationEvidenceItem } from '@/modules/api/evidences.api'

const WORKABLE = new Set(['OPEN', 'IN_PROGRESS'])

/**
 * ¿Tiene sentido intentar consultar el historial retirado?
 *
 * El backend exige ADMIN **o** (`SITUATIONS_UPDATE` + alcance + operar). Aquí
 * solo filtramos candidatos obvios; la denegación real llega como 404 y no
 * debe revelar existencia ni motivos.
 */
export function mayRequestRetiredEvidenceHistory(
  user: Pick<User, 'roleCode' | 'permissions'> | null | undefined,
  /**
   * El backend decidió que este usuario puede operar ESTE caso (`canUpdate`,
   * `canResolve` o `canAdvanceToInProgress`). Sin esa señal la petición acaba
   * en un 404 seguro: el analista lo recibía en cada expediente ajeno.
   */
  caseOperable = true,
): boolean {
  if (!user) return false
  if (user.roleCode === 'ADMIN') return true
  return hasPermission(user, 'SITUATIONS_UPDATE') && caseOperable
}

/**
 * Oferta de «Retirar» en UI. El servidor vuelve a autorizar
 * (`SITUATIONS_UPDATE` + caso operable). CLOSED/CANCELLED/RESOLVED no admiten
 * retiro.
 */
export function canOfferEvidenceRetirement(input: {
  user: Pick<User, 'permissions'> | null | undefined
  situationStatus: string
  /** Shell operativo (ANALISTA/COORDINADOR). ADMIN consulta, no retira. */
  allowOperationalWrites: boolean
}): boolean {
  if (!input.allowOperationalWrites) return false
  if (!hasPermission(input.user, 'SITUATIONS_UPDATE')) return false
  return WORKABLE.has(input.situationStatus)
}

export function isActiveEvidence(item: SituationEvidenceItem): boolean {
  return (item.status ?? 'ACTIVE') !== 'RETIRED'
}

export function isRetiredEvidence(item: SituationEvidenceItem): boolean {
  return item.status === 'RETIRED' || Boolean(item.retirement?.retiredAt)
}

export function activeEvidencesOf(
  items: readonly SituationEvidenceItem[],
): SituationEvidenceItem[] {
  return items.filter(isActiveEvidence)
}

export function retiredEvidencesOf(
  items: readonly SituationEvidenceItem[],
): SituationEvidenceItem[] {
  return items.filter(isRetiredEvidence)
}

export function situationAllowsEvidenceMutation(
  detail: Pick<ProblemDetail, 'status'> | null | undefined,
): boolean {
  if (!detail) return false
  return WORKABLE.has(detail.status)
}
