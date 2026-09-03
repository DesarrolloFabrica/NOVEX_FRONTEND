import { describe, expect, it } from 'vitest'
import {
  compareProblemPriority,
  sortProblemsByPriority,
} from '@/modules/operational-cards/data/problemPriority'
import type { CoordinationProblem } from '@/modules/operational-cards/types/operational-cards.state'

function problem(
  overrides: Partial<CoordinationProblem> & { id: string },
): CoordinationProblem {
  return {
    title: `Problema ${overrides.id}`,
    severity: 'MEDIUM',
    status: 'OPEN',
    createdAt: '2026-08-15T10:00:00.000Z',
    ...overrides,
  }
}

function order(problems: CoordinationProblem[]): string[] {
  return sortProblemsByPriority(problems).map((item) => item.id)
}

describe('compareProblemPriority · severidad', () => {
  it('CRITICAL antes que HIGH', () => {
    expect(
      order([
        problem({ id: 'high', severity: 'HIGH' }),
        problem({ id: 'critical', severity: 'CRITICAL' }),
      ]),
    ).toEqual(['critical', 'high'])
  })

  it('HIGH antes que MEDIUM', () => {
    expect(
      order([
        problem({ id: 'medium', severity: 'MEDIUM' }),
        problem({ id: 'high', severity: 'HIGH' }),
      ]),
    ).toEqual(['high', 'medium'])
  })

  it('MEDIUM antes que LOW', () => {
    expect(
      order([
        problem({ id: 'low', severity: 'LOW' }),
        problem({ id: 'medium', severity: 'MEDIUM' }),
      ]),
    ).toEqual(['medium', 'low'])
  })

  it('ordena las cuatro severidades de una vez', () => {
    expect(
      order([
        problem({ id: 'low', severity: 'LOW' }),
        problem({ id: 'critical', severity: 'CRITICAL' }),
        problem({ id: 'medium', severity: 'MEDIUM' }),
        problem({ id: 'high', severity: 'HIGH' }),
      ]),
    ).toEqual(['critical', 'high', 'medium', 'low'])
  })

  it('la severidad manda sobre el SLA', () => {
    // Un HIGH vencido no adelanta a un CRITICAL en plazo.
    expect(
      order([
        problem({ id: 'high-overdue', severity: 'HIGH', slaHealth: 'overdue' }),
        problem({
          id: 'critical-ok',
          severity: 'CRITICAL',
          slaHealth: 'on_track',
        }),
      ]),
    ).toEqual(['critical-ok', 'high-overdue'])
  })
})

describe('compareProblemPriority · criterios secundarios', () => {
  it('el SLA desempata a igual severidad', () => {
    expect(
      order([
        problem({ id: 'on-track', slaHealth: 'on_track' }),
        problem({ id: 'overdue', slaHealth: 'overdue' }),
        problem({ id: 'at-risk', slaHealth: 'at_risk' }),
      ]),
    ).toEqual(['overdue', 'at-risk', 'on-track'])
  })

  it('un problema sin SLA no adelanta a uno con SLA en plazo', () => {
    expect(
      order([
        problem({ id: 'sin-sla' }),
        problem({ id: 'con-sla', slaHealth: 'on_track' }),
      ]),
    ).toEqual(['con-sla', 'sin-sla'])
  })

  it('el impacto desempata cuando severidad y SLA coinciden', () => {
    expect(
      order([
        problem({ id: 'una', slaHealth: 'at_risk', affectedCoordinationCount: 1 }),
        problem({ id: 'tres', slaHealth: 'at_risk', affectedCoordinationCount: 3 }),
      ]),
    ).toEqual(['tres', 'una'])
  })

  it('la antigüedad desempata al final: lo más viejo primero', () => {
    expect(
      order([
        problem({ id: 'nuevo', createdAt: '2026-08-20T10:00:00.000Z' }),
        problem({ id: 'viejo', createdAt: '2026-07-01T10:00:00.000Z' }),
      ]),
    ).toEqual(['viejo', 'nuevo'])
  })

  it('el id da un orden estable cuando todo lo demás empata', () => {
    const problems = [problem({ id: 'b' }), problem({ id: 'a' })]
    expect(order(problems)).toEqual(['a', 'b'])
    expect(order([...problems].reverse())).toEqual(['a', 'b'])
  })

  it('respeta el orden completo de criterios', () => {
    expect(
      order([
        problem({ id: '4-low', severity: 'LOW' }),
        problem({ id: '2-high-overdue', severity: 'HIGH', slaHealth: 'overdue' }),
        problem({ id: '1-critical', severity: 'CRITICAL' }),
        problem({ id: '3-high', severity: 'HIGH', slaHealth: 'on_track' }),
      ]),
    ).toEqual(['1-critical', '2-high-overdue', '3-high', '4-low'])
  })
})

describe('compareProblemPriority · sin IA', () => {
  it('no consulta riskScore ni ningún campo de análisis', () => {
    // El tipo no tiene esos campos, y añadirlos no altera el orden.
    const withNoise = [
      { ...problem({ id: 'a' }), riskScore: 99 },
      { ...problem({ id: 'b', severity: 'CRITICAL' }), riskScore: 1 },
    ] as unknown as CoordinationProblem[]
    expect(order(withNoise)).toEqual(['b', 'a'])
  })

  it('es puro: no muta la lista recibida', () => {
    const problems = [
      problem({ id: 'low', severity: 'LOW' }),
      problem({ id: 'critical', severity: 'CRITICAL' }),
    ]
    sortProblemsByPriority(problems)
    expect(problems.map((item) => item.id)).toEqual(['low', 'critical'])
  })

  it('el comparador es simétrico', () => {
    const left = problem({ id: 'a', severity: 'CRITICAL' })
    const right = problem({ id: 'b', severity: 'LOW' })
    expect(compareProblemPriority(left, right)).toBeLessThan(0)
    expect(compareProblemPriority(right, left)).toBeGreaterThan(0)
    expect(compareProblemPriority(left, left)).toBe(0)
  })
})
