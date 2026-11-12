import type { ResponsiblePickerOption } from '@/modules/operational-cards/data/responsibleCoordinationPicker'

/**
 * Utilidades del selector múltiple de coordinaciones RELACIONADAS.
 * Sin React: qué opciones se ofrecen, búsqueda y saneado de la selección.
 */

export type RelatedPickerOption = ResponsiblePickerOption

/** Minúsculas y sin tildes: «fabrica» encuentra «Fábrica de Contenidos». */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('es')
    .trim()
}

/**
 * Opciones que aún se pueden añadir: ni ya elegidas ni excluidas (la
 * coordinación propia/afectada y la responsable), filtradas por la búsqueda.
 */
export function availableRelatedOptions(
  options: readonly RelatedPickerOption[],
  selectedIds: readonly string[],
  excludedIds: readonly string[],
  query: string,
): RelatedPickerOption[] {
  const blocked = new Set([...selectedIds, ...excludedIds])
  const needle = normalize(query)
  return options.filter(
    (option) =>
      !blocked.has(option.id) &&
      (needle.length === 0 ||
        normalize(option.label).includes(needle) ||
        normalize(option.code).includes(needle)),
  )
}

/**
 * Selección enviable: sin vacíos ni duplicados, sin la propia ni la
 * responsable y, si se conocen las opciones, solo coordinaciones vigentes.
 * Conserva el orden de elección (el backend lo guarda como `displayOrder`).
 */
export function sanitizeRelatedIds(
  selectedIds: readonly string[],
  excludedIds: readonly (string | null | undefined)[],
  knownIds?: ReadonlySet<string>,
): string[] {
  const excluded = new Set(excludedIds.filter(Boolean) as string[])
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of selectedIds) {
    if (!id || excluded.has(id) || seen.has(id)) continue
    if (knownIds && !knownIds.has(id)) continue
    seen.add(id)
    result.push(id)
  }
  return result
}

/** Resumen para lectores de pantalla tras cada cambio. */
export function describeRelatedCount(count: number): string {
  if (count === 0) return 'Sin coordinaciones relacionadas.'
  if (count === 1) return '1 coordinación relacionada seleccionada.'
  return `${count} coordinaciones relacionadas seleccionadas.`
}
