// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchSituations, type SituationsListResponse } from '@/modules/api/situations.api'
import { CoordinationProblemList } from '@/modules/operational-cards/components/CoordinationProblemList'
import { resolveCoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type {
  CoordinationProblem,
  OperationalCardsLevel1State,
} from '@/modules/operational-cards/types/operational-cards.state'
import type { SituationResponse } from '@/modules/situations/types/situation.types'

vi.mock('@/modules/api/situations.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/api/situations.api')>()),
  fetchSituations: vi.fn(),
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

/**
 * Filtros del panel «Problemas de la coordinación»: activos desde LEVEL 1,
 * cerrados desde el listado paginado, AND entre los dos desplegables, y una
 * cabecera que sigue hablando del universo activo pase lo que pase abajo.
 */

const fetchMock = vi.mocked(fetchSituations)

function coordination(code: string, id: string): CoordinationOverview {
  return {
    id,
    code,
    name: code,
    shortName: code,
    color: '#28C8F4',
    displayOrder: 1,
    status: 'CRITICO',
    activeProblemsCount: 3,
    criticalCount: 1,
    affectedCoordinationCount: 0,
    lifePoints: 4,
  }
}

const B2B = coordination('coord-b2b', 'uuid-b2b')
const SABER = coordination('coord-saber-pro', 'uuid-saber')

function active(
  id: string,
  severity: CoordinationProblem['severity'],
  status: CoordinationProblem['status'],
): CoordinationProblem {
  return {
    id,
    title: `Activo ${id}`,
    severity,
    status,
    createdAt: '2026-09-01T10:00:00.000Z',
    reportKind: 'INTERNAL',
    coordinationCode: 'coord-b2b',
    affectedCoordinationCode: 'coord-b2b',
  }
}

const LEVEL1: OperationalCardsLevel1State = {
  status: 'ready',
  coordinationCode: 'coord-b2b',
  problems: [
    active('a1', 'CRITICAL', 'OPEN'),
    active('a2', 'HIGH', 'IN_PROGRESS'),
    active('a3', 'HIGH', 'OPEN'),
  ],
  errorMessage: null,
  scope: 'complete',
}

function closedSituation(id: string, severity = 'HIGH'): SituationResponse {
  return {
    id,
    title: `Cerrado ${id}`,
    severity,
    status: 'CLOSED',
    createdAt: '2026-08-01T10:00:00.000Z',
    reportKind: 'INTERNAL',
    coordinationCode: 'coord-b2b',
    affectedCoordinationCode: 'coord-b2b',
  } as unknown as SituationResponse
}

function page(
  items: SituationResponse[],
  total: number,
  pageNumber = 1,
  limit = 25,
): SituationsListResponse {
  return { items, total, page: pageNumber, limit, scope: 'complete' }
}

let container: HTMLDivElement
let root: Root
const onSelect = vi.fn()

function render(target: CoordinationOverview = B2B, level1 = LEVEL1) {
  act(() => {
    root.render(
      <CoordinationProblemList
        coordination={target}
        identity={resolveCoordinationVisualIdentity(target)}
        productLabel="B2B"
        level1={level1}
        onProblemSelect={onSelect}
      />,
    )
  })
}

async function flush() {
  for (let i = 0; i < 4; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

function choose(testId: string, value: string) {
  const select = container.querySelector<HTMLSelectElement>(
    `[data-testid="${testId}"]`,
  )!
  act(() => {
    select.value = value
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

const rowIds = () =>
  [...container.querySelectorAll('[data-testid="problem-row"]')].map((row) =>
    row.getAttribute('data-problem-id'),
  )
const byTestId = (testId: string) =>
  container.querySelector(`[data-testid="${testId}"]`)

beforeEach(() => {
  fetchMock.mockReset()
  onSelect.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('filtros del panel de problemas', () => {
  it('arranca en «Todas · Activos», sin EXPANDIR y sin pedir cerrados', () => {
    render()
    const severity = byTestId('coordination-filter-severity') as HTMLSelectElement
    const status = byTestId('coordination-filter-status') as HTMLSelectElement
    expect(severity.value).toBe('ALL')
    expect(status.value).toBe('ACTIVE')
    // Sin rótulo visible, pero con nombre accesible propio (no el valor).
    expect(container.querySelector(`label[for="${severity.id}"]`)?.textContent).toBe(
      'Filtrar por severidad',
    )
    expect(container.querySelector(`label[for="${status.id}"]`)?.textContent).toBe(
      'Filtrar por estado',
    )
    expect(severity.selectedOptions[0]?.textContent).toBe('Todas las severidades')
    expect(status.selectedOptions[0]?.textContent).toBe('Activos')
    expect(rowIds()).toEqual(['a1', 'a2', 'a3'])
    expect(byTestId('coordination-problems-expand')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('las filas de este panel dicen «En revisión», no «En atención»', () => {
    render()
    const review = container.querySelector('[data-problem-id="a2"]')!
    expect(review.querySelector('[data-testid="problem-row-status"]')?.textContent).toBe(
      'En revisión',
    )
    expect(review.getAttribute('data-status')).toBe('IN_PROGRESS')
    expect(container.textContent).not.toContain('En atención')
  })

  it('severidad AND estado sobre los activos, sin tocar la cabecera ni el estado', () => {
    render()
    const list = byTestId('coordination-problem-list')!
    const headingBefore = list.querySelector('h3')?.textContent

    choose('coordination-filter-severity', 'HIGH')
    expect(rowIds()).toEqual(['a2', 'a3'])

    choose('coordination-filter-status', 'IN_PROGRESS')
    expect(rowIds()).toEqual(['a2'])

    choose('coordination-filter-status', 'OPEN')
    expect(rowIds()).toEqual(['a3'])

    expect(list.querySelector('h3')?.textContent).toBe(headingBefore)
    expect(list.getAttribute('data-status')).toBe('CRITICO')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('una combinación sin resultados lo dice con sus palabras', () => {
    render()
    choose('coordination-filter-severity', 'CRITICAL')
    choose('coordination-filter-status', 'IN_PROGRESS')
    expect(rowIds()).toEqual([])
    expect(byTestId('coordination-panel-empty-filtered')?.textContent).toBe(
      'No hay problemas críticos en revisión',
    )
  })

  it('«Cerrados» pide CLOSED de ESA coordinación, paginado, y carga más al pedirlo', async () => {
    fetchMock
      .mockResolvedValueOnce(page([closedSituation('c1'), closedSituation('c2')], 3, 1, 2))
      .mockResolvedValueOnce(page([closedSituation('c2'), closedSituation('c3')], 3, 2, 2))
    render()

    choose('coordination-filter-status', 'CLOSED')
    expect(byTestId('coordination-panel-loading')).not.toBeNull()
    await flush()

    expect(fetchMock).toHaveBeenCalledWith({
      coordinationId: 'uuid-b2b',
      status: 'CLOSED',
      severity: undefined,
      page: 1,
      limit: 25,
    })
    expect(rowIds()).toEqual(['c1', 'c2'])
    expect(
      container.querySelector('[data-problem-id="c1"] [data-testid="problem-row-status"]')
        ?.textContent,
    ).toBe('Cerrado')
    expect(container.querySelector('[data-problem-id="c1"]')?.getAttribute('data-closed')).toBe(
      'true',
    )

    // Hay más que la primera página: no se presenta como el universo.
    const more = byTestId('coordination-panel-load-more') as HTMLButtonElement
    expect(more.textContent).toBe('Ver más cerrados (1)')
    act(() => more.click())
    await flush()

    expect(fetchMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))
    // c2 repetido por desplazamiento del offset: no se duplica.
    expect(rowIds()).toEqual(['c1', 'c2', 'c3'])
    expect(byTestId('coordination-panel-load-more')).toBeNull()
  })

  it('la severidad de los cerrados se filtra en el servidor', async () => {
    fetchMock.mockResolvedValue(page([], 0))
    render()
    choose('coordination-filter-severity', 'CRITICAL')
    choose('coordination-filter-status', 'CLOSED')
    await flush()

    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'CLOSED', severity: 'CRITICAL', page: 1 }),
    )
    expect(byTestId('coordination-panel-empty-filtered')?.textContent).toBe(
      'No hay problemas críticos cerrados',
    )
  })

  it('«Todos»: activos primero, cerrados después', async () => {
    fetchMock.mockResolvedValue(page([closedSituation('c1')], 1))
    render()
    choose('coordination-filter-status', 'ALL')
    await flush()
    expect(rowIds()).toEqual(['a1', 'a2', 'a3', 'c1'])
  })

  it('un error de cerrados no se disfraza de vacío y se puede reintentar', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(page([closedSituation('c1')], 1))
    render()
    choose('coordination-filter-status', 'CLOSED')
    await flush()

    expect(byTestId('coordination-panel-closed-error')).not.toBeNull()
    expect(byTestId('coordination-panel-empty-filtered')).toBeNull()

    act(() => (byTestId('coordination-panel-closed-retry') as HTMLButtonElement).click())
    await flush()
    expect(rowIds()).toEqual(['c1'])
  })

  it('una fila cerrada se selecciona como cualquier otra', async () => {
    fetchMock.mockResolvedValue(page([closedSituation('c1')], 1))
    render()
    choose('coordination-filter-status', 'CLOSED')
    await flush()
    act(() => (container.querySelector('[data-problem-id="c1"]') as HTMLButtonElement).click())
    expect(onSelect).toHaveBeenCalledWith('c1')
  })

  it('cambiar de coordinación devuelve los filtros a su valor por defecto', () => {
    render()
    choose('coordination-filter-severity', 'HIGH')
    render(SABER, { ...LEVEL1, coordinationCode: 'coord-saber-pro' })
    expect((byTestId('coordination-filter-severity') as HTMLSelectElement).value).toBe('ALL')
    expect((byTestId('coordination-filter-status') as HTMLSelectElement).value).toBe('ACTIVE')
  })
})
