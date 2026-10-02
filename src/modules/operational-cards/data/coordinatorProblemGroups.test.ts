import { describe, expect, it } from 'vitest'
import {
  classifyCoordinatorProblems,
  resolveOtherCoordinationCode,
} from '@/modules/operational-cards/data/coordinatorProblemGroups'
import type { CoordinationProblem } from '@/modules/operational-cards/types/operational-cards.state'

function problem(
  partial: Partial<CoordinationProblem> & Pick<CoordinationProblem, 'id'>,
): CoordinationProblem {
  return {
    title: partial.title ?? partial.id,
    severity: partial.severity ?? 'MEDIUM',
    status: partial.status ?? 'OPEN',
    createdAt: partial.createdAt ?? '2026-09-01T10:00:00.000Z',
    reportKind: partial.reportKind ?? 'INTERNAL',
    coordinationCode: partial.coordinationCode ?? null,
    affectedCoordinationCode: partial.affectedCoordinationCode ?? null,
    ...partial,
  }
}

describe('classifyCoordinatorProblems', () => {
  const own = 'coord-b2b'

  it('INTERNAL de la propia área va a Debo resolver', () => {
    const groups = classifyCoordinatorProblems(
      [
        problem({
          id: 'int',
          coordinationCode: own,
          affectedCoordinationCode: own,
        }),
      ],
      own,
    )
    expect(groups.toResolve.map((p) => p.id)).toEqual(['int'])
    expect(groups.affecting).toEqual([])
  })

  it('INTER donde soy responsable va a Debo resolver', () => {
    const groups = classifyCoordinatorProblems(
      [
        problem({
          id: 'inter-out',
          reportKind: 'INTER_COORDINATION',
          coordinationCode: own,
          affectedCoordinationCode: 'coord-negocios',
        }),
      ],
      own,
    )
    expect(groups.toResolve.map((p) => p.id)).toEqual(['inter-out'])
    expect(groups.affecting).toEqual([])
  })

  it('INTER donde soy afectada y otra es responsable va a Afectan', () => {
    const groups = classifyCoordinatorProblems(
      [
        problem({
          id: 'inter-in',
          reportKind: 'INTER_COORDINATION',
          coordinationCode: 'coord-negocios',
          affectedCoordinationCode: own,
        }),
      ],
      own,
    )
    expect(groups.toResolve).toEqual([])
    expect(groups.affecting.map((p) => p.id)).toEqual(['inter-in'])
  })

  it('no duplica un caso que reúna más de una condición', () => {
    const same = problem({
      id: 'once',
      reportKind: 'INTER_COORDINATION',
      coordinationCode: own,
      affectedCoordinationCode: own,
    })
    const groups = classifyCoordinatorProblems([same, same], own)
    expect(groups.toResolve).toHaveLength(1)
    expect(groups.affecting).toHaveLength(0)
  })

  it('ignora problemas ajenos sin vínculo con la propia área', () => {
    const groups = classifyCoordinatorProblems(
      [
        problem({
          id: 'ajeno',
          coordinationCode: 'coord-negocios',
          affectedCoordinationCode: 'coord-negocios',
        }),
      ],
      own,
    )
    expect(groups.toResolve).toEqual([])
    expect(groups.affecting).toEqual([])
  })

  it('en Debo resolver, las dependencias INTER van antes que los INTERNAL', () => {
    const groups = classifyCoordinatorProblems(
      [
        problem({
          id: 'int-a',
          severity: 'CRITICAL',
          coordinationCode: own,
          affectedCoordinationCode: own,
        }),
        problem({
          id: 'inter-out',
          reportKind: 'INTER_COORDINATION',
          severity: 'LOW',
          coordinationCode: own,
          affectedCoordinationCode: 'coord-negocios',
        }),
        problem({
          id: 'int-b',
          severity: 'HIGH',
          coordinationCode: own,
          affectedCoordinationCode: own,
        }),
        problem({
          id: 'inter-out-2',
          reportKind: 'INTER_COORDINATION',
          severity: 'MEDIUM',
          coordinationCode: own,
          affectedCoordinationCode: 'coord-academica',
        }),
      ],
      own,
    )
    expect(groups.toResolve.map((p) => p.id)).toEqual([
      'inter-out',
      'inter-out-2',
      'int-a',
      'int-b',
    ])
  })
})

describe('resolveOtherCoordinationCode', () => {
  it('devuelve la afectada cuando soy responsable INTER', () => {
    expect(
      resolveOtherCoordinationCode(
        problem({
          id: 'a',
          reportKind: 'INTER_COORDINATION',
          coordinationCode: 'coord-b2b',
          affectedCoordinationCode: 'coord-negocios',
        }),
        'coord-b2b',
      ),
    ).toBe('coord-negocios')
  })

  it('devuelve la responsable cuando soy afectada INTER', () => {
    expect(
      resolveOtherCoordinationCode(
        problem({
          id: 'b',
          reportKind: 'INTER_COORDINATION',
          coordinationCode: 'coord-negocios',
          affectedCoordinationCode: 'coord-b2b',
        }),
        'coord-b2b',
      ),
    ).toBe('coord-negocios')
  })

  it('INTERNAL no tiene otra coordinación', () => {
    expect(
      resolveOtherCoordinationCode(
        problem({
          id: 'c',
          coordinationCode: 'coord-b2b',
          affectedCoordinationCode: 'coord-b2b',
        }),
        'coord-b2b',
      ),
    ).toBeNull()
  })
})
