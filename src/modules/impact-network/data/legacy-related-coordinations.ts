/**
 * Extrae los códigos declarados por el formulario histórico antes de que las
 * relaciones se persistieran en `relatedCoordinations`.
 */
export function extractLegacyRelatedCodes(description: string): string[] {
  const perceptionMatch =
    description.match(
      /Coordinaciones relacionadas \(percepción inicial\): (.+)/i,
    ) ?? description.match(/Áreas relacionadas \(percepción inicial\): (.+)/i)

  if (!perceptionMatch?.[1]) return []

  return [
    ...new Set(
      perceptionMatch[1]
        .split(',')
        .map((label) => label.trim().split('·')[0]?.trim())
        .filter((code): code is string => Boolean(code)),
    ),
  ]
}
