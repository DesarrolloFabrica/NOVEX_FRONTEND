import type { SituationResponse } from '@/modules/situations/types/situation.types'
import { isValidUuid } from '@/shared/utils/uuid'

export function findLatestSituationCreatedByUser(
  situations: SituationResponse[],
  userId: string | undefined,
): SituationResponse | null {
  if (!userId) return null

  return (
    situations
      .filter(
        (situation) =>
          situation.createdByUserId === userId && isValidUuid(situation.id),
      )
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      )[0] ?? null
  )
}
