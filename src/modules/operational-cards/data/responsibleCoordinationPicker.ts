/**
 * Utilidades del selector visual de coordinación RESPONSABLE (dependencias INTER).
 * Sin React: filtrado, validez de la selección y etiqueta de confirmación.
 */

export interface ResponsiblePickerOption {
  id: string
  label: string
  /** Code para logo (`coord-…`). */
  code: string
}

/** Filtra por nombre (sin distinguir mayúsculas). Cadena vacía = todas. */
export function filterResponsibleOptions(
  options: readonly ResponsiblePickerOption[],
  query: string,
): ResponsiblePickerOption[] {
  const needle = query.trim().toLocaleLowerCase('es')
  if (!needle) return [...options]
  return options.filter((option) =>
    option.label.toLocaleLowerCase('es').includes(needle),
  )
}

/** ¿La selección sigue entre las opciones disponibles (p. ej. tras cambiar de carta)? */
export function isResponsibleSelectionValid(
  selectedId: string,
  options: readonly ResponsiblePickerOption[],
): boolean {
  if (!selectedId) return true
  return options.some((option) => option.id === selectedId)
}

export function findResponsibleOption(
  options: readonly ResponsiblePickerOption[],
  selectedId: string,
): ResponsiblePickerOption | null {
  if (!selectedId) return null
  return options.find((option) => option.id === selectedId) ?? null
}

/** Confirmación legible: quién necesita la entrega y quién debe responder. */
export function buildResponsibleSelectionSummary(
  affectedLabel: string,
  responsibleLabel: string,
): string {
  return `Afectada: ${affectedLabel} → Responsable: ${responsibleLabel}`
}
