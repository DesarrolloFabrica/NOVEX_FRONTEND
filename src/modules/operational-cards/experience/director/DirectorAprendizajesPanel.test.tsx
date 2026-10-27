// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  analysisPeriodFromCycle,
  analysisPeriodFromMonth,
  analysisPeriodFromWeek,
  type AnalysisPeriod,
} from '@/modules/operational-cards/domain/analysis-period'
import { DirectorAprendizajesPanel } from '@/modules/operational-cards/experience/director/DirectorAprendizajesPanel'
import { appendLearningItems } from '@/modules/operational-cards/hooks/useDirectorLearnings'
import {
  fetchLearningItems,
  fetchLearningsSummary,
} from '@/modules/operational-cards/services/learnings.service'
import type {
  LearningCategory,
  LearningItem,
  LearningItemsPage,
  LearningsSummary,
} from '@/modules/operational-cards/types/learnings.types'

vi.mock('@/modules/operational-cards/services/learnings.service', () => ({
  LEARNINGS_PAGE_SIZE: 20,
  fetchLearningsSummary: vi.fn(),
  fetchLearningItems: vi.fn(),
}))

// ECharts necesita layout real: aquí basta con saber QUÉ categorías recibe.
vi.mock('@/modules/operational-cards/charts/DirectorAprendizajesChart', () => ({
  DirectorAprendizajesChart: ({ categories }: { categories: readonly LearningCategory[] }) => (
    <div
      data-testid="director-aprendizajes-chart"
      data-categories={categories.map((c) => `${c.name}:${c.count}`).join(',')}
    />
  ),
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const summaryMock = vi.mocked(fetchLearningsSummary)
const itemsMock = vi.mocked(fetchLearningItems)

const NOW = new Date('2026-10-07T15:00:00.000Z')
const OCT = analysisPeriodFromMonth(2026, 9, NOW)
const SEP = analysisPeriodFromMonth(2026, 8, NOW)
const WEEK_CROSS = analysisPeriodFromWeek('2026-09-28', NOW)
const H2 = analysisPeriodFromCycle(2026, 2, NOW)
const A = 'coord-a'
const B = 'coord-b'

const cat = (id: string, name: string, count: number): LearningCategory => ({
  id,
  code: id,
  name,
  selectable: true,
  count,
})

function summary(over: Partial<LearningsSummary> = {}): LearningsSummary {
  const categories = over.categories ?? [cat('net', 'Internet', 3), cat('app', 'Aplicativos', 1)]
  const learningCount = categories.reduce((sum, c) => sum + c.count, 0)
  const closedCount = over.closedCount ?? learningCount + 1
  return {
    coordinationId: A,
    period: {
      kind: OCT.kind,
      from: OCT.from,
      to: OCT.to,
      calendarEnd: OCT.calendarEnd,
      dataTo: OCT.to,
      isCurrent: true,
      isPartial: true,
      cutAt: '2026-10-08T05:00:00.000Z',
    },
    closedCount,
    learningCount,
    withoutLearningCount: closedCount - learningCount,
    coverage: closedCount === 0 ? null : Math.round((learningCount / closedCount) * 100),
    categories,
    ...over,
  }
}

function item(id: string, over: Partial<LearningItem> = {}): LearningItem {
  return {
    situationId: id,
    title: `Problema ${id}`,
    reportKind: 'INTERNAL',
    category: { id: 'net', code: 'net', name: 'Internet', selectable: true },
    closedAt: '2026-10-02T19:00:00.000Z',
    resolvedAt: '2026-10-02T19:00:00.000Z',
    recordedAt: '2026-10-02T19:00:00.000Z',
    resolvedByName: 'Coordinadora',
    learningExcerpt: `Aprendizaje ${id}`,
    learningTruncated: false,
    learningLength: 14,
    ...over,
  }
}

function page(items: LearningItem[], total: number, pageNumber = 1): LearningItemsPage {
  return { coordinationId: A, categoryId: null, total, page: pageNumber, limit: 20, items }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (cause: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

let host: HTMLDivElement
let root: Root

async function render(
  coordinationId: string | null,
  period: AnalysisPeriod,
  onOpenProblem: ((id: string) => void) | null = null,
) {
  await act(async () => {
    root.render(
      <DirectorAprendizajesPanel
        coordinationId={coordinationId}
        analysisPeriod={period}
        onOpenProblem={onOpenProblem}
      />,
    )
  })
}

const q = (testId: string) => host.querySelector(`[data-testid="${testId}"]`)
const qa = (testId: string) => [...host.querySelectorAll(`[data-testid="${testId}"]`)]
const cardIds = () => qa('director-aprendizaje-card').map((el) => el.getAttribute('data-problem-id'))

async function selectCategory(value: string) {
  const select = q('director-aprendizajes-filter') as HTMLSelectElement
  await act(async () => {
    select.value = value
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

async function click(el: Element | null) {
  await act(async () => {
    ;(el as HTMLElement).click()
  })
}

beforeEach(() => {
  summaryMock.mockReset()
  itemsMock.mockReset()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('DIRECTOR → APRENDIZAJES', () => {
  it('sin coordinación no consulta nada', async () => {
    await render(null, OCT)
    expect(q('director-aprendizajes-no-coordination')).not.toBeNull()
    expect(summaryMock).not.toHaveBeenCalled()
    expect(itemsMock).not.toHaveBeenCalled()
  })

  it('la coordinación y el periodo seleccionados determinan el universo pedido', async () => {
    summaryMock.mockResolvedValue(summary())
    itemsMock.mockResolvedValue(page([item('p1')], 1))
    await render(A, OCT)
    expect(summaryMock).toHaveBeenCalledWith(
      {
        coordinationId: A,
        period: { kind: 'month', from: '2026-10-01', to: OCT.to, calendarEnd: '2026-10-31' },
      },
      expect.anything(),
    )
    expect(itemsMock).toHaveBeenCalledWith(
      expect.objectContaining({ coordinationId: A, categoryId: null, page: 1 }),
      expect.anything(),
    )
  })

  it('semana, mes y ciclo (incluida una semana que cruza meses) viajan íntegros', async () => {
    summaryMock.mockResolvedValue(summary({ categories: [], closedCount: 0 }))
    for (const period of [WEEK_CROSS, OCT, H2]) {
      await render(A, period)
      const last = summaryMock.mock.calls.at(-1)![0]
      expect(last.period).toEqual({
        kind: period.kind,
        from: period.from,
        to: period.to,
        calendarEnd: period.calendarEnd,
      })
    }
    expect(WEEK_CROSS.from).toBe('2026-09-28')
    expect(WEEK_CROSS.calendarEnd).toBe('2026-10-04')
  })

  it('indicadores reales: aprendizajes y cobertura sobre TODOS los cierres', async () => {
    summaryMock.mockResolvedValue(summary({ closedCount: 5 }))
    itemsMock.mockResolvedValue(page([item('p1')], 4))
    await render(A, OCT)
    expect(q('director-aprendizajes-count')?.textContent).toBe('4')
    expect(q('director-aprendizajes-coverage')?.textContent).toBe('80 %')
    expect(host.textContent).toContain('4 de 5')
  })

  it('la gráfica recibe todas las categorías y el filtro solo cambia las fichas', async () => {
    summaryMock.mockResolvedValue(summary())
    itemsMock.mockImplementation(async (query) =>
      query.categoryId === 'app'
        ? { ...page([item('p9', { category: { id: 'app', code: 'app', name: 'Aplicativos', selectable: true } })], 1), categoryId: 'app' }
        : page([item('p1'), item('p2'), item('p3'), item('p9')], 4),
    )
    await render(A, OCT)
    const chartBefore = q('director-aprendizajes-chart')?.getAttribute('data-categories')
    expect(chartBefore).toBe('Internet:3,Aplicativos:1')
    expect(cardIds()).toEqual(['p1', 'p2', 'p3', 'p9'])
    expect(q('director-aprendizajes-cards')?.textContent).toContain('4')

    await selectCategory('app')
    expect(cardIds()).toEqual(['p9'])
    expect(itemsMock.mock.calls.at(-1)![0]).toMatchObject({ categoryId: 'app', page: 1 })
    expect(q('director-aprendizajes-chart')?.getAttribute('data-categories')).toBe(chartBefore)
    expect(summaryMock).toHaveBeenCalledTimes(1)
  })

  it('«Cargar más» agrega la página siguiente del MISMO filtro, sin duplicados', async () => {
    summaryMock.mockResolvedValue(summary({ categories: [cat('net', 'Internet', 3)], closedCount: 3 }))
    itemsMock.mockImplementation(async (query) =>
      query.page === 1
        ? page([item('p1'), item('p2')], 3)
        : // El servidor devuelve un solape (p2): no se duplica.
          page([item('p2'), item('p3')], 3, 2),
    )
    await render(A, OCT)
    await selectCategory('net')
    expect(cardIds()).toEqual(['p1', 'p2'])
    await click(q('director-aprendizajes-more'))
    expect(itemsMock.mock.calls.at(-1)![0]).toMatchObject({ categoryId: 'net', page: 2 })
    expect(cardIds()).toEqual(['p1', 'p2', 'p3'])
    expect(q('director-aprendizajes-more')).toBeNull()
    expect((q('director-aprendizajes-filter') as HTMLSelectElement).value).toBe('net')
  })

  it('appendLearningItems conserva el orden y descarta repetidos', () => {
    expect(
      appendLearningItems([item('a'), item('b')], [item('b'), item('c')]).map((i) => i.situationId),
    ).toEqual(['a', 'b', 'c'])
  })

  it('cambiar de coordinación nunca muestra la lectura anterior', async () => {
    summaryMock.mockResolvedValueOnce(summary())
    itemsMock.mockResolvedValue(page([item('p1')], 1))
    await render(A, OCT)
    expect(cardIds()).toEqual(['p1'])

    const pending = deferred<LearningsSummary>()
    summaryMock.mockReturnValueOnce(pending.promise)
    await render(B, OCT)
    expect(q('director-aprendizajes-loading')).not.toBeNull()
    expect(cardIds()).toEqual([])
    expect(q('director-aprendizajes-count')).toBeNull()

    await act(async () => pending.resolve(summary({ coordinationId: B, categories: [], closedCount: 0 })))
    expect(q('director-aprendizajes-no-closures')).not.toBeNull()
  })

  it('cambiar de periodo tampoco muestra la lectura anterior y vuelve a «Todas»', async () => {
    summaryMock.mockResolvedValueOnce(summary())
    itemsMock.mockResolvedValue(page([item('p1')], 1))
    await render(A, OCT)
    await selectCategory('net')

    const pending = deferred<LearningsSummary>()
    summaryMock.mockReturnValueOnce(pending.promise)
    await render(A, SEP)
    expect(q('director-aprendizajes-loading')).not.toBeNull()
    expect(cardIds()).toEqual([])

    await act(async () => pending.resolve(summary()))
    expect((q('director-aprendizajes-filter') as HTMLSelectElement).value).toBe('')
    expect(itemsMock.mock.calls.at(-1)![0]).toMatchObject({ categoryId: null })
  })

  it('una respuesta tardía de la selección anterior no pisa la actual', async () => {
    const slowA = deferred<LearningsSummary>()
    summaryMock.mockReturnValueOnce(slowA.promise)
    summaryMock.mockResolvedValueOnce(summary({ coordinationId: B, categories: [], closedCount: 2 }))
    await render(A, OCT)
    await render(B, OCT)
    await act(async () => slowA.resolve(summary()))
    expect(q('director-aprendizajes-without-learning')).not.toBeNull()
    expect(q('director-aprendizajes-chart')).toBeNull()
  })

  it('sin cierres: sin porcentaje inventado, sin gráfica y sin fichas', async () => {
    summaryMock.mockResolvedValue(summary({ categories: [], closedCount: 0 }))
    await render(A, OCT)
    expect(q('director-aprendizajes-coverage')?.textContent).toBe('—')
    expect(q('director-aprendizajes-no-closures')).not.toBeNull()
    expect(q('director-aprendizajes-chart')).toBeNull()
    expect(itemsMock).not.toHaveBeenCalled()
  })

  it('cierres sin aprendizaje: se distingue de «sin cierres» y no genera fichas vacías', async () => {
    summaryMock.mockResolvedValue(summary({ categories: [], closedCount: 3 }))
    await render(A, OCT)
    expect(q('director-aprendizajes-coverage')?.textContent).toBe('0 %')
    expect(q('director-aprendizajes-without-learning')?.textContent).toContain('3 cierres')
    expect(q('director-aprendizajes-no-closures')).toBeNull()
    expect(qa('director-aprendizaje-card')).toHaveLength(0)
  })

  it('categoría sin resultados: mensaje breve y vuelta a todas', async () => {
    summaryMock.mockResolvedValue(summary())
    itemsMock.mockImplementation(async (query) =>
      query.categoryId ? page([], 0) : page([item('p1')], 1),
    )
    await render(A, OCT)
    await selectCategory('app')
    expect(q('director-aprendizajes-category-empty')).not.toBeNull()
    await click(host.querySelector('.director-aprendizajes__link'))
    expect((q('director-aprendizajes-filter') as HTMLSelectElement).value).toBe('')
    expect(cardIds()).toEqual(['p1'])
  })

  it('error del resumen con reintento', async () => {
    summaryMock.mockRejectedValueOnce(new Error('Servidor caído'))
    summaryMock.mockResolvedValueOnce(summary())
    itemsMock.mockResolvedValue(page([item('p1')], 1))
    await render(A, OCT)
    expect(q('director-aprendizajes-error')?.textContent).toContain('Servidor caído')
    await click(host.querySelector('.director-aprendizajes__retry'))
    expect(q('director-aprendizajes-error')).toBeNull()
    expect(cardIds()).toEqual(['p1'])
  })

  it('error de fichas: conserva indicadores y gráfica, permite reintentar', async () => {
    summaryMock.mockResolvedValue(summary())
    itemsMock.mockRejectedValueOnce(new Error('Timeout'))
    itemsMock.mockResolvedValueOnce(page([item('p1')], 1))
    await render(A, OCT)
    expect(q('director-aprendizajes-cards-error')).not.toBeNull()
    expect(q('director-aprendizajes-chart')).not.toBeNull()
    await click(q('director-aprendizajes-cards-error')!.querySelector('button'))
    expect(cardIds()).toEqual(['p1'])
  })

  it('ficha: categoría, folio, fecha de cierre, título, extracto y «Ver expediente» por onOpenProblem', async () => {
    summaryMock.mockResolvedValue(summary())
    itemsMock.mockResolvedValue(page([item('5eedc0de-0e1f-4000-8000-00000000a5f0')], 1))
    const onOpen = vi.fn()
    await render(A, OCT, onOpen)
    const card = q('director-aprendizaje-card')!
    expect(card.textContent).toContain('Internet')
    expect(card.textContent).toContain('Nº A5F0')
    expect(card.querySelector('time')?.getAttribute('dateTime')).toBe('2026-10-02T19:00:00.000Z')
    expect(card.textContent).toContain('Problema 5eedc0de')
    expect(card.textContent).toContain('Aprendizaje 5eedc0de')
    // Solo lectura: ningún control de escritura en las fichas.
    expect(card.querySelector('textarea, input, form')).toBeNull()
    await click(card.querySelector('[data-testid="director-aprendizaje-open"]'))
    expect(onOpen).toHaveBeenCalledWith('5eedc0de-0e1f-4000-8000-00000000a5f0')
  })
})
