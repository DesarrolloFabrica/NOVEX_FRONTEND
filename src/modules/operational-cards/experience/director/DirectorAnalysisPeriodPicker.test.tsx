// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  analysisPeriodFromCycle,
  analysisPeriodFromMonth,
  analysisPeriodFromWeek,
  buildCurrentCyclePeriod,
  buildCurrentWeekPeriod,
  type AnalysisPeriod,
} from '@/modules/operational-cards/domain/analysis-period'
import { DirectorAnalysisPeriodPicker } from '@/modules/operational-cards/experience/director/DirectorAnalysisPeriodPicker'

/** Martes 6 oct 2026, mediodía Bogotá → semana actual lun 5 – dom 11 oct. */
const NOW = new Date('2026-10-06T12:00:00-05:00')

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
})

/** Picker controlado como en DirectorReadingPanel: onChange actualiza el periodo. */
function renderPicker(
  initial: AnalysisPeriod,
  variant: 'full' | 'cycle' = 'full',
) {
  const onChange = vi.fn<(next: AnalysisPeriod) => void>()
  function Harness() {
    const [period, setPeriod] = useState(initial)
    return (
      <DirectorAnalysisPeriodPicker
        period={period}
        variant={variant}
        onChange={(next) => {
          onChange(next)
          setPeriod(next)
        }}
      />
    )
  }
  act(() => root.render(<Harness />))
  return { onChange }
}

function byTestId(testId: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(
    `[data-testid="${testId}"]`,
  )
  if (!element) throw new Error(`No existe [data-testid="${testId}"]`)
  return element
}

function query(testId: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(`[data-testid="${testId}"]`)
}

function click(testId: string) {
  act(() => {
    byTestId(testId).dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

function lastPeriod(onChange: ReturnType<typeof renderPicker>['onChange']) {
  const call = onChange.mock.calls.at(-1)
  if (!call) throw new Error('onChange no fue llamado')
  return call[0]
}

describe('DirectorAnalysisPeriodPicker · estado cerrado', () => {
  it('solo muestra rango y estado del periodo; sin panel', () => {
    renderPicker(buildCurrentWeekPeriod())
    expect(byTestId('director-analysis-period-range').textContent).toBe(
      '5 — 11 OCT 2026',
    )
    expect(byTestId('director-analysis-period').textContent).toContain(
      'Semana actual · En curso',
    )
    expect(query('director-analysis-period-panel')).toBeNull()
    expect(query('director-analysis-period-go-current')).toBeNull()
  })

  it('al abrir ve primero los ciclos', () => {
    renderPicker(buildCurrentWeekPeriod())
    click('director-analysis-period-trigger')
    expect(byTestId('director-analysis-period-panel').dataset.level).toBe('cycle')
    expect(query('director-analysis-period-cycle-H1')).not.toBeNull()
    expect(query('director-analysis-period-cycle-H2')).not.toBeNull()
  })
})

describe('DirectorAnalysisPeriodPicker · Ciclo → Mes → Semana', () => {
  it('H2 → Meses → Octubre → Semanas → selecciona semana', () => {
    const { onChange } = renderPicker(buildCurrentWeekPeriod())
    click('director-analysis-period-trigger')
    click('director-analysis-period-drill-cycle-H2')
    expect(byTestId('director-analysis-period-panel').dataset.level).toBe('month')
    click('director-analysis-period-drill-month-9')
    expect(byTestId('director-analysis-period-panel').dataset.level).toBe('week')
    click('director-analysis-period-week-2026-09-28')

    const picked = lastPeriod(onChange)
    expect(picked).toMatchObject({
      kind: 'week',
      from: '2026-09-28',
      to: '2026-10-04',
      calendarEnd: '2026-10-04',
      isCurrent: false,
      isPartial: false,
      navigationContext: { year: 2026, month: 9 },
    })
    expect(query('director-analysis-period-panel')).toBeNull()
    expect(byTestId('director-analysis-period-range').textContent).toBe(
      '28 SEP — 4 OCT 2026',
    )
  })

  it('H2 → Usar ciclo, sin profundizar', () => {
    const { onChange } = renderPicker(buildCurrentWeekPeriod())
    click('director-analysis-period-trigger')
    click('director-analysis-period-use-cycle-H2')

    expect(lastPeriod(onChange)).toMatchObject({
      kind: 'cycle',
      from: '2026-07-01',
      to: '2026-10-06',
      calendarEnd: '2026-12-31',
      isCurrent: true,
      isPartial: true,
      navigationContext: { year: 2026, half: 2 },
    })
    expect(query('director-analysis-period-panel')).toBeNull()
  })

  it('H2 → Meses → Usar mes (octubre), sin entrar a semanas', () => {
    const { onChange } = renderPicker(buildCurrentWeekPeriod())
    click('director-analysis-period-trigger')
    click('director-analysis-period-drill-cycle-H2')
    click('director-analysis-period-use-month-9')

    expect(lastPeriod(onChange)).toMatchObject({
      kind: 'month',
      from: '2026-10-01',
      to: '2026-10-06',
      calendarEnd: '2026-10-31',
      isCurrent: true,
      isPartial: true,
      navigationContext: { year: 2026, month: 9 },
    })
  })

  it('no permite elegir meses ni semanas completamente futuros', () => {
    renderPicker(buildCurrentWeekPeriod())
    click('director-analysis-period-trigger')
    expect(
      (byTestId('director-analysis-period-year-next') as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    click('director-analysis-period-drill-cycle-H2')
    expect(
      (byTestId('director-analysis-period-use-month-10') as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    click('director-analysis-period-drill-month-9')
    expect(
      (byTestId('director-analysis-period-week-2026-10-12') as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    expect(
      (byTestId('director-analysis-period-week-2026-10-05') as HTMLButtonElement)
        .disabled,
    ).toBe(false)
  })
})

describe('DirectorAnalysisPeriodPicker · contexto inicial del drill', () => {
  it('seleccionar Marzo 2025, cerrar y reabrir vuelve a H1 2025', () => {
    renderPicker(buildCurrentWeekPeriod())
    click('director-analysis-period-trigger')
    click('director-analysis-period-year-prev')
    click('director-analysis-period-drill-cycle-H1')
    click('director-analysis-period-use-month-2')
    expect(query('director-analysis-period-panel')).toBeNull()

    click('director-analysis-period-trigger')
    const panel = byTestId('director-analysis-period-panel')
    expect(panel.dataset.level).toBe('cycle')
    expect(panel.textContent).toContain('2025')
    expect(byTestId('director-analysis-period-cycle-H1').dataset.selection).toBe(
      'contains',
    )
    expect(byTestId('director-analysis-period-cycle-H2').dataset.selection).toBe(
      'none',
    )
  })

  it('H2 2025 abre en 2025 con H2 seleccionado', () => {
    renderPicker(analysisPeriodFromCycle(2025, 2))
    click('director-analysis-period-trigger')
    expect(byTestId('director-analysis-period-panel').textContent).toContain(
      '2025',
    )
    const h2 = byTestId('director-analysis-period-cycle-H2')
    expect(h2.dataset.selection).toBe('selected')
    expect(
      byTestId('director-analysis-period-use-cycle-H2').getAttribute(
        'aria-current',
      ),
    ).toBe('true')
  })

  it('13–19 oct 2025 abre en H2 2025 y el drill llega a octubre', () => {
    renderPicker(analysisPeriodFromWeek('2025-10-13'))
    click('director-analysis-period-trigger')
    expect(byTestId('director-analysis-period-cycle-H2').dataset.selection).toBe(
      'contains',
    )
    click('director-analysis-period-drill-cycle-H2')
    expect(
      byTestId('director-analysis-period-month-2025-10-01').dataset.selection,
    ).toBe('contains')
    click('director-analysis-period-drill-month-9')
    const week = byTestId('director-analysis-period-week-2025-10-13')
    expect(week.dataset.selection).toBe('selected')
    expect(week.getAttribute('aria-current')).toBe('true')
  })
})

describe('DirectorAnalysisPeriodPicker · marca de selección por nivel', () => {
  it('un mes aplicado se marca seleccionado; su ciclo solo lo contiene', () => {
    renderPicker(analysisPeriodFromMonth(2025, 2))
    click('director-analysis-period-trigger')
    expect(byTestId('director-analysis-period-cycle-H1').dataset.selection).toBe(
      'contains',
    )
    click('director-analysis-period-drill-cycle-H1')
    expect(
      byTestId('director-analysis-period-month-2025-03-01').dataset.selection,
    ).toBe('selected')
    expect(
      byTestId('director-analysis-period-month-2025-04-01').dataset.selection,
    ).toBe('none')
  })
})

describe('DirectorAnalysisPeriodPicker · semanas que cruzan el mes', () => {
  it('octubre 2025 muestra 29 sep – 5 oct y 27 oct – 2 nov completas', () => {
    renderPicker(analysisPeriodFromMonth(2025, 9))
    click('director-analysis-period-trigger')
    click('director-analysis-period-drill-cycle-H2')
    click('director-analysis-period-drill-month-9')

    const first = byTestId('director-analysis-period-week-2025-09-29')
    const last = byTestId('director-analysis-period-week-2025-10-27')
    expect(first.textContent).toContain('29 SEP — 5 OCT')
    expect(last.textContent).toContain('27 OCT — 2 NOV')
  })

  it('elegir 27 oct – 2 nov entrega la semana lunes→domingo sin recortar', () => {
    const { onChange } = renderPicker(analysisPeriodFromMonth(2025, 9))
    click('director-analysis-period-trigger')
    click('director-analysis-period-drill-cycle-H2')
    click('director-analysis-period-drill-month-9')
    click('director-analysis-period-week-2025-10-27')
    expect(lastPeriod(onChange)).toMatchObject({
      kind: 'week',
      from: '2025-10-27',
      calendarEnd: '2025-11-02',
      to: '2025-11-02',
    })
  })
})

describe('DirectorAnalysisPeriodPicker · anterior / siguiente', () => {
  it('mes: ‹ va al mes anterior y › al siguiente', () => {
    const { onChange } = renderPicker(analysisPeriodFromMonth(2025, 9))
    click('director-analysis-period-prev')
    expect(lastPeriod(onChange)).toMatchObject({
      kind: 'month',
      from: '2025-09-01',
    })
    click('director-analysis-period-next')
    click('director-analysis-period-next')
    expect(lastPeriod(onChange)).toMatchObject({
      kind: 'month',
      from: '2025-11-01',
    })
  })

  it('› deshabilitado en la semana, mes y ciclo actuales', () => {
    for (const period of [
      buildCurrentWeekPeriod(),
      analysisPeriodFromMonth(2026, 9),
      analysisPeriodFromCycle(2026, 2),
    ]) {
      renderPicker(period)
      expect(
        (byTestId('director-analysis-period-next') as HTMLButtonElement)
          .disabled,
      ).toBe(true)
    }
  })

  it('«↺ Ciclo actual» lleva al default único (ciclo actual) y desaparece', () => {
    const { onChange } = renderPicker(analysisPeriodFromMonth(2025, 2))
    expect(byTestId('director-analysis-period-go-current').textContent).toContain(
      'Ciclo actual',
    )
    click('director-analysis-period-go-current')
    expect(lastPeriod(onChange)).toMatchObject({
      kind: 'cycle',
      from: '2026-07-01',
      isCurrent: true,
    })
    expect(query('director-analysis-period-go-current')).toBeNull()
  })
})

function pressEscape() {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
  })
}

function mousedownOutside() {
  act(() => {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  })
}

function activeTestId(): string | undefined {
  return (document.activeElement as HTMLElement | null)?.dataset.testid
}

describe('DirectorAnalysisPeriodPicker · estado pasivo', () => {
  it('cerrado por default: semana actual, sin jerarquía temporal visible', () => {
    renderPicker(buildCurrentWeekPeriod())
    expect(byTestId('director-analysis-period').dataset.open).toBe('false')
    expect(query('director-analysis-period-panel')).toBeNull()
    expect(query('director-analysis-period-cycle-H2')).toBeNull()
    expect(query('director-analysis-period-year')).toBeNull()
    expect(container.textContent).not.toMatch(/Seleccionar|Meses|Semanas/)
    expect(container.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}/)
  })

  it('mes aplicado: «OCTUBRE 2026 · Mes actual · En curso»', () => {
    renderPicker(analysisPeriodFromMonth(2026, 9))
    expect(byTestId('director-analysis-period-range').textContent).toBe(
      'OCTUBRE 2026',
    )
    expect(byTestId('director-analysis-period').textContent).toContain(
      'Mes actual · En curso',
    )
  })

  it('ciclo aplicado: «JUL — DIC 2026 · Ciclo H2 · En curso»', () => {
    renderPicker(analysisPeriodFromCycle(2026, 2))
    expect(byTestId('director-analysis-period-range').textContent).toBe(
      'JUL — DIC 2026',
    )
    expect(byTestId('director-analysis-period').textContent).toContain(
      'Ciclo H2 · En curso',
    )
  })

  it('periodo histórico: sin «En curso» y con «↺ Ciclo actual»', () => {
    renderPicker(analysisPeriodFromMonth(2025, 2))
    expect(byTestId('director-analysis-period-range').textContent).toBe(
      'MARZO 2025',
    )
    const text = byTestId('director-analysis-period').textContent ?? ''
    expect(text).toContain('Mes')
    expect(text).not.toContain('En curso')
    expect(
      byTestId('director-analysis-period-go-current').textContent,
    ).toContain('Ciclo actual')
    expect(container.textContent).not.toContain('Volver a semana actual')
  })

  it('› deshabilitado sigue presente (no desaparece)', () => {
    renderPicker(buildCurrentWeekPeriod())
    const next = byTestId('director-analysis-period-next') as HTMLButtonElement
    expect(next.disabled).toBe(true)
    expect(next.isConnected).toBe(true)
  })
})

describe('DirectorAnalysisPeriodPicker · cierre', () => {
  it('Escape cierra sin cambiar el periodo y devuelve el foco al trigger', () => {
    const { onChange } = renderPicker(buildCurrentWeekPeriod())
    click('director-analysis-period-trigger')
    click('director-analysis-period-drill-cycle-H2')
    pressEscape()
    expect(query('director-analysis-period-panel')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
    expect(activeTestId()).toBe('director-analysis-period-trigger')
  })

  it('click fuera cierra sin cambiar el periodo', () => {
    const { onChange } = renderPicker(buildCurrentWeekPeriod())
    click('director-analysis-period-trigger')
    mousedownOutside()
    expect(query('director-analysis-period-panel')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('click dentro del panel no lo cierra', () => {
    renderPicker(buildCurrentWeekPeriod())
    click('director-analysis-period-trigger')
    act(() => {
      byTestId('director-analysis-period-panel').dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      )
    })
    expect(query('director-analysis-period-panel')).not.toBeNull()
  })

  it('seleccionar ciclo, mes o semana cierra y deja el foco en el trigger', () => {
    const paths = [
      ['director-analysis-period-use-cycle-H2'],
      [
        'director-analysis-period-drill-cycle-H2',
        'director-analysis-period-use-month-9',
      ],
      [
        'director-analysis-period-drill-cycle-H2',
        'director-analysis-period-drill-month-9',
        'director-analysis-period-week-2026-09-28',
      ],
    ]
    for (const path of paths) {
      renderPicker(buildCurrentWeekPeriod())
      click('director-analysis-period-trigger')
      for (const step of path) click(step)
      expect(query('director-analysis-period-panel')).toBeNull()
      expect(activeTestId()).toBe('director-analysis-period-trigger')
    }
  })
})

describe('DirectorAnalysisPeriodPicker · ruta y foco', () => {
  it('al abrir enfoca el encabezado del nivel ciclo (año)', () => {
    renderPicker(buildCurrentWeekPeriod())
    click('director-analysis-period-trigger')
    const focused = document.activeElement as HTMLElement
    expect(focused.dataset.periodFocus).toBe('heading')
    expect(focused.textContent).toBe('2026')
  })

  it('breadcrumb: semana → mes → ciclo, con foco de vuelta al origen', () => {
    renderPicker(buildCurrentWeekPeriod())
    click('director-analysis-period-trigger')
    click('director-analysis-period-drill-cycle-H2')
    expect((document.activeElement as HTMLElement).dataset.periodFocus).toBe(
      'heading',
    )
    click('director-analysis-period-drill-month-9')

    const crumb = byTestId('director-analysis-period-crumb')
    expect(crumb.textContent).toContain('Ciclos')
    expect(crumb.textContent).toContain('H2 2026')
    expect(crumb.textContent).toContain('Octubre')
    expect(crumb.textContent).toContain('Semanas')

    click('director-analysis-period-crumb-cycle')
    expect(byTestId('director-analysis-period-panel').dataset.level).toBe(
      'month',
    )
    expect(activeTestId()).toBe('director-analysis-period-drill-month-9')

    click('director-analysis-period-crumb-cycles')
    expect(byTestId('director-analysis-period-panel').dataset.level).toBe(
      'cycle',
    )
    expect(activeTestId()).toBe('director-analysis-period-drill-cycle-H2')
  })

  it('la ruta no marca selección: los sellos viven en los elementos', () => {
    renderPicker(buildCurrentWeekPeriod())
    click('director-analysis-period-trigger')
    click('director-analysis-period-drill-cycle-H2')
    const crumb = byTestId('director-analysis-period-crumb')
    expect(crumb.querySelector('[data-selection]')).toBeNull()
    expect(crumb.textContent).not.toMatch(/Seleccionad|Contiene/)
    expect(
      byTestId('director-analysis-period-month-2026-10-01').dataset.selection,
    ).toBe('contains')
  })

  it('cada nivel ofrece dos acciones; la semana solo una', () => {
    renderPicker(buildCurrentWeekPeriod())
    click('director-analysis-period-trigger')
    const h2 = byTestId('director-analysis-period-cycle-H2')
    expect(h2.querySelectorAll('button')).toHaveLength(2)
    click('director-analysis-period-drill-cycle-H2')
    const oct = byTestId('director-analysis-period-month-2026-10-01')
    expect(oct.querySelectorAll('button')).toHaveLength(2)
    click('director-analysis-period-drill-month-9')
    const week = byTestId('director-analysis-period-week-2026-10-05')
    expect(week.tagName).toBe('BUTTON')
    expect(week.querySelectorAll('button')).toHaveLength(0)
  })

  it('meses futuros del ciclo se muestran deshabilitados, no se ocultan', () => {
    renderPicker(buildCurrentWeekPeriod())
    click('director-analysis-period-trigger')
    click('director-analysis-period-drill-cycle-H2')
    for (const id of ['2026-11-01', '2026-12-01']) {
      const cell = byTestId(`director-analysis-period-month-${id}`)
      expect(cell.dataset.future).toBe('true')
      for (const button of Array.from(cell.querySelectorAll('button'))) {
        expect(button.disabled).toBe(true)
      }
    }
  })
})

describe('DirectorAnalysisPeriodPicker · variante ciclo (el flujo hace el drill-down)', () => {
  it('pasivo: «H2 2026» y «JUL — DIC 2026 · En curso»; sin «Ciclo actual» en el actual', () => {
    renderPicker(buildCurrentCyclePeriod(), 'cycle')
    expect(byTestId('director-analysis-period-range').textContent).toBe('H2 2026')
    expect(byTestId('director-analysis-period').textContent).toContain(
      'JUL — DIC 2026 · En curso',
    )
    expect(query('director-analysis-period-go-current')).toBeNull()
  })

  it('el trigger refleja el periodo REAL: ciclo «H2 2026 · JUL — DIC 2026 · En curso»', () => {
    renderPicker(buildCurrentCyclePeriod(), 'cycle')
    expect(byTestId('director-analysis-period-range').textContent).toBe('H2 2026')
    expect(byTestId('director-analysis-period').textContent).toContain('JUL — DIC 2026 · En curso')
    expect(byTestId('director-analysis-period').dataset.kind).toBe('cycle')
  })

  it('mes aplicado (drill-down): «SEPTIEMBRE 2026 · Mes», nunca el ciclo contenedor', () => {
    renderPicker(analysisPeriodFromMonth(2026, 8), 'cycle')
    expect(byTestId('director-analysis-period-range').textContent).toBe('SEPTIEMBRE 2026')
    const text = byTestId('director-analysis-period').textContent ?? ''
    expect(text).toContain('Mes')
    expect(text).not.toContain('H2 2026')
    expect(text).not.toContain('En curso')
    expect(byTestId('director-analysis-period').dataset.kind).toBe('month')
    // Sigue dentro del ciclo actual: sin «↺ Ciclo actual».
    expect(query('director-analysis-period-go-current')).toBeNull()
  })

  it('semana aplicada (drill-down): «7 — 13 SEP 2026 · Semana»', () => {
    renderPicker(analysisPeriodFromWeek('2026-09-07'), 'cycle')
    expect(byTestId('director-analysis-period-range').textContent).toBe('7 — 13 SEP 2026')
    const text = byTestId('director-analysis-period').textContent ?? ''
    expect(text).toContain('Semana')
    expect(text).not.toContain('H2 2026')
    expect(
      byTestId('director-analysis-period-trigger').getAttribute('aria-label'),
    ).not.toContain('H2')
  })

  it('‹ › navegan al NIVEL del periodo real y lo dicen en su nombre accesible', () => {
    renderPicker(analysisPeriodFromWeek('2026-09-07'), 'cycle')
    expect(byTestId('director-analysis-period-prev').getAttribute('aria-label')).toBe(
      'Semana anterior',
    )
    expect(byTestId('director-analysis-period-next').getAttribute('aria-label')).toBe(
      'Semana siguiente',
    )
  })

  it('semana: ‹ va a la semana anterior y › a la siguiente (periodo global)', () => {
    const { onChange } = renderPicker(analysisPeriodFromWeek('2026-09-07'), 'cycle')
    click('director-analysis-period-prev')
    expect(lastPeriod(onChange)).toMatchObject({ kind: 'week', from: '2026-08-31' })
    // Controlado: desde 31 ago, › vuelve a 7 sep.
    click('director-analysis-period-next')
    expect(lastPeriod(onChange)).toMatchObject({ kind: 'week', from: '2026-09-07' })
  })

  it('ciclo: ‹ va al ciclo anterior', () => {
    const { onChange } = renderPicker(buildCurrentCyclePeriod(), 'cycle')
    expect(byTestId('director-analysis-period-prev').getAttribute('aria-label')).toBe(
      'Ciclo anterior',
    )
    click('director-analysis-period-prev')
    expect(lastPeriod(onChange)).toMatchObject({ kind: 'cycle', from: '2026-01-01' })
  })

  it('desde una semana, elegir un ciclo en el diálogo vuelve a kind = cycle', () => {
    const { onChange } = renderPicker(analysisPeriodFromWeek('2026-09-07'), 'cycle')
    click('director-analysis-period-trigger')
    click('director-analysis-period-year-prev')
    click('director-analysis-period-use-cycle-H1')
    expect(lastPeriod(onChange)).toMatchObject({ kind: 'cycle', from: '2025-01-01' })
  })

  it('mes: ‹ desde octubre 2026 va a SEPTIEMBRE 2026; › desde septiembre a octubre', () => {
    const { onChange } = renderPicker(analysisPeriodFromMonth(2026, 9), 'cycle')
    expect(byTestId('director-analysis-period-prev').getAttribute('aria-label')).toBe(
      'Mes anterior',
    )
    // Octubre es el mes en curso: no hay › más allá.
    expect((byTestId('director-analysis-period-next') as HTMLButtonElement).disabled).toBe(true)
    click('director-analysis-period-prev')
    expect(lastPeriod(onChange)).toMatchObject({ kind: 'month', from: '2026-09-01' })
    click('director-analysis-period-next')
    expect(lastPeriod(onChange)).toMatchObject({ kind: 'month', from: '2026-10-01' })
  })

  it('el panel solo ofrece ciclos: sin «Meses →» ni semanas', () => {
    renderPicker(buildCurrentCyclePeriod(), 'cycle')
    click('director-analysis-period-trigger')
    expect(query('director-analysis-period-drill-cycle-H2')).toBeNull()
    expect(container.textContent).not.toMatch(/Meses|Semanas/)
  })

  it('H2 2025 → seleccionar: ciclo histórico con «↺ Ciclo actual»', () => {
    const { onChange } = renderPicker(buildCurrentCyclePeriod(), 'cycle')
    click('director-analysis-period-trigger')
    click('director-analysis-period-year-prev')
    click('director-analysis-period-use-cycle-H2')
    expect(lastPeriod(onChange)).toMatchObject({ kind: 'cycle', from: '2025-07-01' })
    expect(byTestId('director-analysis-period-range').textContent).toBe('H2 2025')
    expect(byTestId('director-analysis-period-go-current').textContent).toContain(
      'Ciclo actual',
    )
  })
})
