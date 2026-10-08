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
  it('renderiza las dos gráficas lado a lado con títulos, ayuda y leyendas', () => {
    expect(container.querySelector('[data-testid="director-carga"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="director-movimiento"]')).not.toBeNull()
    expect(container.textContent).toContain('Carga de problemas')
    expect(container.textContent).toContain('Movimiento de problemas')
    expect(container.textContent).toContain(
      'Problemas que seguían pendientes al cierre de cada periodo.',
    )
    expect(container.textContent).toContain(
      'Problemas reportados y solucionados durante cada periodo.',
    )
    const legend = (chart: string) =>
      Array.from(
        container.querySelectorAll(`[data-chart="${chart}"] .director-flujo__legend li`),
      ).map((li) => li.textContent?.trim())
    expect(legend('carga')).toEqual(['Activos al cierre'])
    expect(legend('movimiento')).toEqual(['Reportados', 'Solucionados'])
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

  it('buckets futuros y el nivel día no son clicables en ninguna de las dos', () => {
    const future = indexOf(charts.carga, '2026-11-01')
    expect(charts.carga!.categoryInteraction!.isClickable(future)).toBe(false)
    expect(charts.movimiento!.categoryInteraction!.isClickable(future)).toBe(false)
    act(() => charts.movimiento!.categoryInteraction!.onClick(future))
    expect(current().kind).toBe('cycle')
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

  it('tabla accesible incluye Reportados junto a la carga', () => {
    const headers = Array.from(
      container.querySelectorAll('[data-testid="director-flujo-table"] thead th'),
    ).map((th) => th.textContent)
    expect(headers).toEqual([
      'Bloque',
      'Activos',
      'Internos',
      'Externos',
      'Reportados',
      'Solucionados',
    ])
  })
})
