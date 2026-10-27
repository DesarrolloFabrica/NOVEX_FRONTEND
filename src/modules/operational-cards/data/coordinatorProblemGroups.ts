import type { CoordinationProblem } from '@/modules/operational-cards/types/operational-cards.state'

/**
 * Clasificación de problemas para la vista COORDINADOR.
 *
 *   Debo resolver     coordinación RESPONSABLE = la asignada (INTERNAL o INTER).
 *   Afectan mi área   INTER donde la AFECTADA es la asignada y la responsable otra.
 *
 * Un mismo ID nunca aparece en ambos grupos: si encaja en «Debo resolver»,
 * manda ese grupo. La autoría no entra en la clasificación.
 *
 * Dentro de «Debo resolver», las dependencias INTER (otras áreas nos asignaron
 * la responsabilidad) van antes que los INTERNAL; el orden relativo de
 * prioridad NOVEX se conserva dentro de cada subconjunto.
 */

export type CoordinatorProblemGroup = 'to-resolve' | 'affecting'

export interface CoordinatorProblemGroups {
  toResolve: CoordinationProblem[]
  affecting: CoordinationProblem[]
}

/** Dependencia INTER donde la coordinación propia es la responsable. */
export function isIncomingDependency(
  problem: CoordinationProblem,
  ownCode: string,
): boolean {
  return (
    problem.reportKind === 'INTER_COORDINATION' &&
    problem.coordinationCode === ownCode
  )
}

function prioritizeIncomingDependencies(
  problems: readonly CoordinationProblem[],
  ownCode: string,
): CoordinationProblem[] {
  const incoming: CoordinationProblem[] = []
  const rest: CoordinationProblem[] = []
  for (const problem of problems) {
    if (isIncomingDependency(problem, ownCode)) incoming.push(problem)
    else rest.push(problem)
  }
  return [...incoming, ...rest]
}

export function classifyCoordinatorProblems(
  problems: readonly CoordinationProblem[],
  ownCode: string,
): CoordinatorProblemGroups {
  const toResolve: CoordinationProblem[] = []
  const affecting: CoordinationProblem[] = []
  const seen = new Set<string>()

  for (const problem of problems) {
    if (seen.has(problem.id)) continue
    seen.add(problem.id)

    const responsible = problem.coordinationCode ?? null
    const affected = problem.affectedCoordinationCode ?? null
    const isInter = problem.reportKind === 'INTER_COORDINATION'

    if (responsible === ownCode) {
      toResolve.push(problem)
      continue
    }

    if (isInter && affected === ownCode && responsible !== ownCode) {
      affecting.push(problem)
    }
  }

  return {
    toResolve: prioritizeIncomingDependencies(toResolve, ownCode),
    affecting,
  }
}

/** La otra coordinación implicada según el grupo (etiqueta de lista). */
export function resolveOtherCoordinationCode(
  problem: CoordinationProblem,
  ownCode: string,
): string | null {
  if (problem.reportKind !== 'INTER_COORDINATION') return null
  if (problem.coordinationCode === ownCode) {
    return problem.affectedCoordinationCode ?? null
  }
  if (problem.affectedCoordinationCode === ownCode) {
    return problem.coordinationCode ?? null
  }
  return problem.coordinationCode ?? problem.affectedCoordinationCode ?? null
}
