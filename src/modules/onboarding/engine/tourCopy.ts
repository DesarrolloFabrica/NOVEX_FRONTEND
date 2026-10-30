/**
 * Textos que el motor compone a partir de la definición del paso. Funciones
 * puras: la puntuación se normaliza aquí y no en cada definición.
 */

export const DEFAULT_MISSING_NOTICE =
  'No encontramos esta parte de la pantalla todavía. Ábrala y pulse «Reintentar».'

/** Quita la puntuación final para que la frase admita un cierre propio. */
function withoutClosingPunctuation(text: string): string {
  return text.trim().replace(/[\s.,;:]+$/, '')
}

/**
 * Aviso de un paso cuyo elemento no aparece: la explicación del paso, la
 * alternativa de continuar si es opcional y la garantía de que no avanza solo.
 */
export function composeMissingNotice(notice: string | undefined, optional: boolean): string {
  const base = withoutClosingPunctuation(notice ?? '') || withoutClosingPunctuation(DEFAULT_MISSING_NOTICE)
  const sentences = [`${base}.`]
  if (optional) sentences.push('Si lo prefiere, continúe sin este paso.')
  sentences.push('El recorrido no avanzará hasta que usted lo decida.')
  return sentences.join(' ')
}
