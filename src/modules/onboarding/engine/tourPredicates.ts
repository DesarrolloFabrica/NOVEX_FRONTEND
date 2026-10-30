/**
 * Predicados de avance del recorrido.
 *
 * Un paso no avanza porque su ancla exista en el DOM: avanza cuando un ESTADO
 * verificable lo confirma (un atributo que la propia interfaz publica, por
 * ejemplo `data-scope="coordination"`). Estos predicados son pasivos: solo leen
 * el DOM y nunca disparan operaciones de negocio.
 */

export type TourPredicate =
  /** El ancla existe en el DOM. Útil para esperar un componente, no para confirmar una acción. */
  | { type: 'present'; selector: string }
  /** El ancla existe y su atributo tiene exactamente el valor indicado. */
  | { type: 'attribute'; selector: string; name: string; value: string }
  | { type: 'all'; predicates: TourPredicate[] }
  | { type: 'any'; predicates: TourPredicate[] }

export function evaluateTourPredicate(
  predicate: TourPredicate,
  root: ParentNode = document,
): boolean {
  switch (predicate.type) {
    case 'present':
      return root.querySelector(predicate.selector) !== null
    case 'attribute': {
      const element = root.querySelector(predicate.selector)
      return element?.getAttribute(predicate.name) === predicate.value
    }
    case 'all':
      return predicate.predicates.every((item) =>
        evaluateTourPredicate(item, root),
      )
    case 'any':
      return predicate.predicates.some((item) =>
        evaluateTourPredicate(item, root),
      )
  }
}

/**
 * Compatibilidad con los campos heredados `advanceOnTarget` y
 * `advanceOnVisibleTarget`. Se traducen a un predicado de presencia y el motor
 * los trata como antes; los pasos nuevos declaran `advanceWhen`.
 */
export function legacyAdvancePredicate(step: {
  advanceOnTarget?: string
  advanceOnVisibleTarget?: string
}): TourPredicate | null {
  if (step.advanceOnTarget) {
    return { type: 'present', selector: step.advanceOnTarget }
  }
  if (step.advanceOnVisibleTarget) {
    return { type: 'present', selector: step.advanceOnVisibleTarget }
  }
  return null
}
