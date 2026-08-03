const CONTEXT_SEPARATOR = '\n\n---\nContexto reportado por el usuario:\n'

export function splitSituationDescription(description: string): {
  narrative: string
  reportedContext: string | null
} {
  const index = description.indexOf(CONTEXT_SEPARATOR)
  if (index === -1) {
    return {
      narrative: description.trim(),
      reportedContext: null,
    }
  }

  return {
    narrative: description.slice(0, index).trim(),
    reportedContext: description.slice(index + CONTEXT_SEPARATOR.length).trim() || null,
  }
}
