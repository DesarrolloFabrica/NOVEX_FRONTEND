import { describe, expect, it } from 'vitest'
import {
  buildFilteredEmptyMessage,
  DEFAULT_PROBLEM_LIST_FILTERS,
  filterActiveProblems,
  isDefaultProblemListFilters,
  needsActiveProblems,
  needsClosedProblems,
  PANEL_STATUS_LABEL,
  SEVERITY_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
} from '@/modules/operational-cards/data/coordinationProblemFilters'
import type { CoordinationProblem } from '@/modules/operational-cards/types/operational-cards.state'

function problem(
  id: string,
  severity: CoordinationProblem['severity'],
  status: CoordinationProblem['status'],
): CoordinationProblem {
  return { id, title: id, severity, status, createdAt: '2026-09-01T10:00:00.000Z' }
}

const ACTIVE = [
  problem('crit-open', 'CRITICAL', 'OPEN'),
  problem('high-open', 'HIGH', 'OPEN'),
  problem('high-review', 'HIGH', 'IN_PROGRESS'),
  problem('low-review', 'LOW', 'IN_PROGRESS'),
]

const ids = (list: readonly { id: string }[]) => list.map((item) => item.id)

describe('filtros del panel de problemas', () => {
  it('por defecto: todas las severidades y solo activos', () => {
    expect(DEFAULT_PROBLEM_LIST_FILTERS).toEqual({ severity: 'ALL', status: 'ACTIVE' })
    expect(SEVERITY_FILTER_OPTIONS[0]).toEqual({
      value: 'ALL',
      label: 'Todas las severidades',
    })
    expect(STATUS_FILTER_OPTIONS[0]).toEqual({ value: 'ACTIVE', label: 'Activas' })
    expect(isDefaultProblemListFilters(DEFAULT_PROBLEM_LIST_FILTERS)).toBe(true)
  })

  it('opciones y valores de dominio', () => {
    expect(SEVERITY_FILTER_OPTIONS.map((o) => o.value)).toEqual([
      'ALL',
      'CRITICAL',
      'HIGH',
      'MEDIUM',
      'LOW',
    ])
    expect(STATUS_FILTER_OPTIONS.map((o) => `${o.value}:${o.label}`)).toEqual([
      'ACTIVE:Activas',
      'ALL:Todas',
      'OPEN:Abiertas',
      'IN_PROGRESS:En atención',
      'CLOSED:Cerradas',
    ])
  })

  it('IN_PROGRESS se presenta como «En atención» sin cambiar el valor', () => {
    expect(PANEL_STATUS_LABEL.IN_PROGRESS).toBe('En atención')
    expect(PANEL_STATUS_LABEL.OPEN).toBe('Abierta')
    expect(PANEL_STATUS_LABEL.CLOSED).toBe('Cerrada')
  })

  it('activos sin filtro de severidad: la lista completa, en su orden', () => {
    expect(ids(filterActiveProblems(ACTIVE, DEFAULT_PROBLEM_LIST_FILTERS))).toEqual(
      ids(ACTIVE),
    )
  })

  it('severidad y estado se combinan con AND', () => {
    expect(
      ids(filterActiveProblems(ACTIVE, { severity: 'HIGH', status: 'IN_PROGRESS' })),
    ).toEqual(['high-review'])
    expect(ids(filterActiveProblems(ACTIVE, { severity: 'HIGH', status: 'ACTIVE' }))).toEqual([
      'high-open',
      'high-review',
    ])
    expect(ids(filterActiveProblems(ACTIVE, { severity: 'ALL', status: 'OPEN' }))).toEqual([
      'crit-open',
      'high-open',
    ])
  })

  it('«Cerradas» no toma nada de LEVEL 1; «Todas» toma activas y cerradas', () => {
    expect(filterActiveProblems(ACTIVE, { severity: 'ALL', status: 'CLOSED' })).toEqual([])
    expect(needsActiveProblems('CLOSED')).toBe(false)
    expect(needsClosedProblems('CLOSED')).toBe(true)
    expect(needsActiveProblems('ALL')).toBe(true)
    expect(needsClosedProblems('ALL')).toBe(true)
    for (const status of ['ACTIVE', 'OPEN', 'IN_PROGRESS'] as const) {
      expect(needsClosedProblems(status)).toBe(false)
    }
  })

  it('el vacío nombra la combinación elegida', () => {
    expect(
      buildFilteredEmptyMessage({ severity: 'CRITICAL', status: 'IN_PROGRESS' }, 'complete'),
    ).toBe('No hay situaciones críticas en atención')
    expect(
      buildFilteredEmptyMessage({ severity: 'HIGH', status: 'OPEN' }, 'complete'),
    ).toBe('No hay situaciones abiertas de severidad alta')
    expect(buildFilteredEmptyMessage({ severity: 'ALL', status: 'CLOSED' }, 'complete')).toBe(
      'No hay situaciones cerradas',
    )
    expect(buildFilteredEmptyMessage({ severity: 'LOW', status: 'ALL' }, 'complete')).toBe(
      'No hay situaciones de severidad baja',
    )
    expect(buildFilteredEmptyMessage({ severity: 'ALL', status: 'ALL' }, 'complete')).toBe(
      'No hay situaciones registradas',
    )
  })

  it('con lectura parcial aclara que habla de lo visible para el usuario', () => {
    expect(
      buildFilteredEmptyMessage({ severity: 'ALL', status: 'CLOSED' }, 'own-only'),
    ).toBe('No hay situaciones cerradas visibles para su usuario')
  })
})
