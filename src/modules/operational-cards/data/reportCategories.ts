import type { IncidentCategorySummary } from '@/modules/situations/types/situation.types'

/**
 * Categoría «Otra» del catálogo (`incident_categories.code`). Al elegirla, el
 * alta exige que quien reporta escriba su propia categoría.
 */
export const OTHER_CATEGORY_CODE = 'OTRA'

/** Límites de la categoría escrita; los mismos que valida el backend. */
export const CATEGORY_OTHER_TEXT_MIN = 3
export const CATEGORY_OTHER_TEXT_MAX = 120

export function isOtherCategory(
  category: Pick<IncidentCategorySummary, 'code'> | null | undefined,
): boolean {
  return category?.code === OTHER_CATEGORY_CODE
}

/** ¿El `categoryId` elegido es «Otra»? */
export function categoryRequiresOtherText(
  categories: readonly IncidentCategorySummary[],
  categoryId: string,
): boolean {
  if (!categoryId) return false
  return isOtherCategory(categories.find((item) => item.id === categoryId))
}

/**
 * Orden del selector: el del catálogo, con «Otra» siempre al final. No se
 * confía en que el servidor ya lo haga (un backend anterior ordena por nombre).
 */
export function orderReportCategories(
  categories: readonly IncidentCategorySummary[],
): IncidentCategorySummary[] {
  return [
    ...categories.filter((item) => !isOtherCategory(item)),
    ...categories.filter((item) => isOtherCategory(item)),
  ]
}

/**
 * Error de la categoría escrita, o `null` si es válida. Mide el texto ya
 * recortado: solo espacios cuenta como vacío.
 */
export function validateCategoryOtherText(value: string): string | null {
  const text = value.trim()
  if (text.length === 0) return 'Escriba la categoría de la situación.'
  if (text.length < CATEGORY_OTHER_TEXT_MIN) {
    return `Use al menos ${CATEGORY_OTHER_TEXT_MIN} caracteres.`
  }
  if (text.length > CATEGORY_OTHER_TEXT_MAX) {
    return `Use como máximo ${CATEGORY_OTHER_TEXT_MAX} caracteres.`
  }
  return null
}
