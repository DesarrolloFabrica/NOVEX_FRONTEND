// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NovexChartCategoryInteraction } from '@/modules/operational-cards/charts/NovexChart'
import type { FlujoLevel } from '@/modules/operational-cards/charts/flujo-option'
import {
  buildCurrentCyclePeriod,
  type AnalysisPeriod,
} from '@/modules/operational-cards/domain/analysis-period'
import { DirectorFlujoProblemas } from '@/modules/operational-cards/experience/director/DirectorFlujoProblemas'
import type { OperationalKpiFlowBucket } from '@/modules/operational-cards/types/operational-kpi.types'

/**
 * ECharts no pinta en jsdom: se sustituyen las dos gráficas por dobles que
 * guardan sus props. Así se verifica el contrato entre CARGA y MOVIMIENTO:
 * mismos buckets, mismo nivel, mismo AnalysisPeriod y hover cruzado.
 */
type ChartProps = {
  buckets: readonly OperationalKpiFlowBucket[]
  level: FlujoLevel
  categoryInteraction?: NovexChartCategoryInteraction
  highlightIndex?: number | null
}

const charts = vi.hoisted(() => ({
  carga: null as ChartProps | null,
  movimiento: null as ChartProps | null,
}))

vi.mock('@/modules/operational-cards/charts/DirectorFlujoChart', () => ({
  FlujoChart: (props: ChartProps) => {
    charts.carga = props
    return <div data-testid="director-flujo-chart" />
  },
  MovimientoChart: (props: ChartProps) => {
    charts.movimiento = props
    return <div data-testid="director-movimiento-chart" />
  },
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

/** Martes 6 oct 2026, mediodía Bogotá. */
const NOW = new Date('2026-10-06T12:00:00-05:00')

function slot(start: string, end: string, future = false): OperationalKpiFlowBucket {
  return {
    start,
    end,
    dataEnd: future ? null : end,
    calendarStart: start,
    calendarEnd: end,
    label: start,
    current: start <= '2026-10-06' && '2026-10-06' <= end,
    future,
    created: future ? null : 3,
    closed: future ? null : 1,
    backlog: future ? null : 5,
    active: future
      ? null
      : { total: 5, internal: 3, external: 2, internalBreakdown: [], externalBreakdown: [] },
    solved: future ? null : { total: 1 },
  }
}

/** Geometría del backend: ciclo → meses, mes → semanas lun–dom. */
function bucketsFor(period: AnalysisPeriod): OperationalKpiFlowBucket[] {
  if (period.kind === 'cycle') {
    return [
      slot('2026-07-01', '2026-07-31'),
      slot('2026-08-01', '2026-08-31'),
      slot('2026-09-01', '2026-09-30'),
      slot('2026-10-01', '2026-10-31'),
      slot('2026-11-01', '2026-11-30', true),
      slot('2026-12-01', '2026-12-31', true),
    ]
  }
  if (period.kind === 'month') {
    return [
      slot('2026-09-28', '2026-10-04'),
      slot('2026-10-05', '2026-10-11'),
      slot('2026-10-12', '2026-10-18', true),
    ]
  }
  return Array.from({ length: 7 }, (_, i) => {
    const day = String(5 + i).padStart(2, '0')
    return slot(`2026-10-${day}`, `2026-10-${day}`, i > 1)
  })
}

const seen: AnalysisPeriod[] = []

function Harness() {
  const [period, setPeriod] = useState(() => buildCurrentCyclePeriod(NOW))
  seen.push(period)
  return (
    <DirectorFlujoProblemas
      period={period}
      buckets={bucketsFor(period)}
      loading={false}
      error={null}
      onPeriodChange={setPeriod}
    />
  )
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  charts.carga = null
  charts.movimiento = null
  seen.length = 0
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<Harness />))
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
})

const section = () => container.querySelector<HTMLElement>('[data-testid="director-flujo"]')!
const current = () => seen.at(-1)!
const indexOf = (props: ChartProps | null, start: string) =>
  props!.buckets.findIndex((b) => b.calendarStart === start)

describe('ESTADO · CARGA | MOVIMIENTO sobre un único AnalysisPeriod', () => {
  it('resumen + Carga ARRIBA y Movimiento DEBAJO, con títulos, ayuda y leyendas', () => {
    const carga = container.querySelector('[data-testid="director-carga"]')!
    const movimiento = container.querySelector('[data-testid="director-movimiento"]')!
    const summary = container.querySelector('[data-testid="director-flujo-summary"]')!
    // Orden del documento: resumen → carga → movimiento.
    expect(summary.compareDocumentPosition(carga) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(carga.compareDocumentPosition(movimiento) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(container.textContent).toContain('Carga de problemas')
    expect(container.textContent).toContain('Movimiento de problemas')
    expect(container.textContent).toContain(
      'Problemas que seguían activos al corte de cada tramo: su último día, o el último día con datos si el tramo está en curso.',
    )
    expect(container.textContent).toContain(
      'Problemas reportados (registrados) y cerrados (con fecha de cierre) dentro de cada tramo.',
    )
    const legend = (chart: string) =>
      Array.from(
        container.querySelectorAll(`[data-chart="${chart}"] .director-flujo__legend li`),
      ).map((li) => li.textContent?.trim())
    expect(legend('carga')).toEqual(['Activos al corte'])
    expect(legend('movimiento')).toEqual(['Reportados', 'Cerrados'])
  })

  it('resumen: activos = último corte (no la suma de la línea); reportados y cerrados = Σ de tramos con datos', () => {
    const stat = (key: string) =>
      container.querySelector(`[data-testid="director-flujo-stat-${key}"]`)!
    const value = (key: string) =>
      stat(key).querySelector('.director-flujo__stat-value')!.textContent
    // Ciclo H2 a 6 oct: jul–oct con datos (5 activos cada uno), nov–dic futuros.
    expect(value('active')).toBe('5')
    expect(value('reported')).toBe('12')
    expect(value('closed')).toBe('4')
    // Corte del último tramo con datos; sin «hoy».
    expect(stat('active').textContent).toContain('31 oct · en curso')
    expect(stat('reported').textContent).toContain('1 jul – 31 oct 2026')
    expect(container.textContent).not.toMatch(/\bhoy\b/i)
  })

  it('periodo histórico: el corte lleva fecha completa y no dice «en curso» ni «hoy»', () => {
    const h1 = ['01', '02', '03', '04', '05', '06'].map((m) => {
      const last = new Date(Date.UTC(2026, Number(m), 0)).getUTCDate()
      return slot(`2026-${m}-01`, `2026-${m}-${last}`)
    })
    act(() =>
      root.render(
        <DirectorFlujoProblemas
          period={{ ...buildCurrentCyclePeriod(NOW), from: '2026-01-01', to: '2026-06-30', calendarEnd: '2026-06-30', isCurrent: false, isPartial: false, navigationContext: { year: 2026, half: 1 } }}
          buckets={h1}
          loading={false}
          error={null}
          onPeriodChange={() => {}}
        />,
      ),
    )
    const active = container.querySelector('[data-testid="director-flujo-stat-active"]')!
    expect(active.textContent).toContain('30 jun 2026')
    expect(active.textContent).not.toContain('en curso')
    expect(container.textContent).not.toMatch(/\bhoy\b/i)
    // Seis meses completos: ninguna marca de tramo incompleto.
    expect(container.querySelector('[data-testid="director-flujo-partial-note"]')).toBeNull()
  })

  it('ambas gráficas reciben exactamente los mismos buckets y nivel', () => {
    expect(charts.carga!.buckets).toBe(charts.movimiento!.buckets)
    expect(charts.carga!.level).toBe('month')
    expect(charts.movimiento!.level).toBe('month')
  })

  it('click en CARGA (OCT) cambia el periodo y MOVIMIENTO lo refleja en semanas', () => {
    act(() => charts.carga!.categoryInteraction!.onClick(indexOf(charts.carga, '2026-10-01')))
    expect(current().kind).toBe('month')
    expect(current().from).toBe('2026-10-01')
    expect(section().dataset.level).toBe('week')
    expect(charts.movimiento!.level).toBe('week')
    expect(charts.movimiento!.buckets[0].calendarStart).toBe('2026-09-28')
    expect(charts.carga!.buckets).toBe(charts.movimiento!.buckets)
  })

  it('CARGA y MOVIMIENTO son dos interfaces del MISMO setAnalysisPeriod (periodo idéntico)', () => {
    act(() => charts.carga!.categoryInteraction!.onClick(indexOf(charts.carga, '2026-09-01')))
    const fromCarga = current()
    // Volver al ciclo (ruta) y repetir desde MOVIMIENTO.
    act(() => {
      container
        .querySelector<HTMLElement>('[data-testid="director-flujo-crumb-cycle"]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(current().kind).toBe('cycle')
    act(() =>
      charts.movimiento!.categoryInteraction!.onClick(indexOf(charts.movimiento, '2026-09-01')),
    )
    expect(fromCarga).toMatchObject({ kind: 'month', from: '2026-09-01', calendarEnd: '2026-09-30' })
    expect(current()).toEqual(fromCarga)
  })

  it('click en MOVIMIENTO (OCT) cambia el periodo y CARGA lo refleja; luego semana', () => {
    act(() =>
      charts.movimiento!.categoryInteraction!.onClick(indexOf(charts.movimiento, '2026-10-01')),
    )
    expect(current().kind).toBe('month')
    expect(charts.carga!.level).toBe('week')
    act(() =>
      charts.carga!.categoryInteraction!.onClick(indexOf(charts.carga, '2026-10-05')),
    )
    expect(current().kind).toBe('week')
    expect(current().from).toBe('2026-10-05')
    expect(charts.carga!.level).toBe('day')
    expect(charts.movimiento!.level).toBe('day')
  })

  it('los tramos futuros no llegan a ninguna gráfica (sin columnas reservadas)', () => {
    const starts = (props: ChartProps | null) => props!.buckets.map((b) => b.start)
    expect(starts(charts.carga)).toEqual(['2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01'])
    expect(starts(charts.movimiento)).toEqual(starts(charts.carga))
    expect(charts.carga!.buckets.some((b) => b.future)).toBe(false)
    // Un índice fuera de los tramos visibles no es clicable ni navega.
    expect(charts.carga!.categoryInteraction!.isClickable(4)).toBe(false)
    act(() => charts.movimiento!.categoryInteraction!.onClick(4))
    expect(current().kind).toBe('cycle')
    // Teclado: un botón por tramo con datos, ninguno para nov/dic.
    const keys = Array.from(
      container.querySelectorAll<HTMLElement>('[data-testid^="director-flujo-drill-"]'),
    ).map((el) => el.dataset.testid)
    expect(keys).toEqual([
      'director-flujo-drill-2026-07-01',
      'director-flujo-drill-2026-08-01',
      'director-flujo-drill-2026-09-01',
      'director-flujo-drill-2026-10-01',
    ])
  })

  it('el índice de cada columna resuelve SU tramo al hacer clic (sin desfase tras excluir futuros)', () => {
    act(() => charts.movimiento!.categoryInteraction!.onClick(3))
    expect(current()).toMatchObject({ kind: 'month', from: '2026-10-01' })
    // Semanas de octubre a 6 oct: 28 sep–4 oct y 5–11 oct; 12–18 futura fuera.
    expect(charts.carga!.buckets.map((b) => b.calendarStart)).toEqual(['2026-09-28', '2026-10-05'])
    act(() => charts.carga!.categoryInteraction!.onClick(1))
    expect(current()).toMatchObject({ kind: 'week', from: '2026-10-05' })
  })

  it('el nivel día no es clicable', () => {
    act(() => charts.carga!.categoryInteraction!.onClick(3))
    act(() => charts.carga!.categoryInteraction!.onClick(1))
    expect(charts.carga!.level).toBe('day')
    expect(charts.carga!.categoryInteraction!.isClickable(0)).toBe(false)
    act(() => charts.carga!.categoryInteraction!.onClick(0))
    expect(current().kind).toBe('week')
  })

  it('hover sincronizado: resalta la misma columna solo en la OTRA gráfica', () => {
    act(() => charts.carga!.categoryInteraction!.onHover!(3))
    expect(charts.movimiento!.highlightIndex).toBe(3)
    expect(charts.carga!.highlightIndex).toBeNull()
    act(() => charts.movimiento!.categoryInteraction!.onHover!(1))
    expect(charts.carga!.highlightIndex).toBe(1)
    expect(charts.movimiento!.highlightIndex).toBeNull()
    act(() => charts.movimiento!.categoryInteraction!.onHover!(null))
    expect(charts.carga!.highlightIndex).toBeNull()
    expect(charts.movimiento!.highlightIndex).toBeNull()
  })

  it('tabla accesible: Reportados y Cerrados junto a la carga, solo tramos con datos', () => {
    const headers = Array.from(
      container.querySelectorAll('[data-testid="director-flujo-table"] thead th'),
    ).map((th) => th.textContent)
    expect(headers).toEqual([
      'Tramo',
      'Activos',
      'Internos',
      'Externos',
      'Reportados',
      'Cerrados',
    ])
    expect(
      container.querySelectorAll('[data-testid="director-flujo-table"] tbody tr'),
    ).toHaveLength(4)
  })

  it('error sin datos: solo el aviso; ni resumen, ni gráficas, ni pista «Toca un mes»', () => {
    act(() =>
      root.render(
        <DirectorFlujoProblemas
          period={buildCurrentCyclePeriod(NOW)}
          buckets={null}
          loading={false}
          error="fallo simulado"
          onPeriodChange={() => {}}
        />,
      ),
    )
    expect(container.querySelector('[data-testid="director-flujo-error"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="director-flujo-summary"]')).toBeNull()
    expect(container.querySelector('[data-testid="director-carga"]')).toBeNull()
    expect(container.textContent).not.toContain('Toca un mes')
    expect(container.textContent).not.toContain('Leyendo flujo')
  })
})
