import type { SituationResponse } from '@/modules/situations/types/situation.types'

/**
 * Un reporte entre coordinaciones no lleva categoría (solo el problema interno
 * la exige). Las vistas que agrupan o filtran por categoría necesitan una clave,
 * así que la ausencia se declara explícitamente en vez de dejar un hueco.
 */
export const UNCATEGORIZED_LABEL = 'Sin categoría'
export const UNCATEGORIZED_ID = 'sin-categoria'
export const UNCATEGORIZED_CODE = 'SIN_CATEGORIA'

export function situationCategoryId(
  situation: Pick<SituationResponse, 'categoryId'>,
): string {
  return situation.categoryId ?? UNCATEGORIZED_ID
}

export function situationCategoryCode(
  situation: Pick<SituationResponse, 'categoryCode'>,
): string {
  return situation.categoryCode ?? UNCATEGORIZED_CODE
}

export function situationCategoryLabel(
  situation: Pick<SituationResponse, 'categoryName'>,
): string {
  return situation.categoryName ?? UNCATEGORIZED_LABEL
}
