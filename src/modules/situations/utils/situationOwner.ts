import type { SituationResponse } from '@/modules/situations/types/situation.types'

/**
 * Un analista registra a su propio nombre y no representa ningún área, así que
 * su caso no cuelga de una coordinación. La interfaz lo declara como registro
 * de analista en vez de mostrar un hueco.
 */
export const ANALYST_REGISTRY_LABEL = 'Registro de analista'
export const ANALYST_REGISTRY_CODE = 'ANALISTA'

export function situationOwnerLabel(
  situation: Pick<SituationResponse, 'coordinationName'>,
): string {
  return situation.coordinationName ?? ANALYST_REGISTRY_LABEL
}

export function situationOwnerCode(
  situation: Pick<SituationResponse, 'coordinationCode'>,
): string {
  return situation.coordinationCode ?? ANALYST_REGISTRY_CODE
}
