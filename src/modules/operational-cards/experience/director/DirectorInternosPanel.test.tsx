import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  analysisPeriodFromMonth,
  analysisPeriodFromWeek,
  buildCurrentCyclePeriod,
} from '@/modules/operational-cards/domain/analysis-period'
import { DirectorInternosAfectaciones } from '@/modules/operational-cards/experience/director/DirectorInternosAfectaciones'
import { DirectorInternosPanelView } from '@/modules/operational-cards/experience/director/DirectorInternosPanel'
import { DirectorInternosRecurrencia } from '@/modules/operational-cards/experience/director/DirectorInternosRecurrencia'
import {
  FABRICA_PROBLEMS,
  GENERAL_RECURRENCE,
  INTERNOS_REFERENCE,
  problemsResponse,
  ROW_D,
  ROW_G,
  ROW_I,
  ROW_J,
  ROW_K,
  ROW_A,
  ROW_B,
  ROW_F,
  ROW_H,
  ROW_OLD,
} from '@/modules/operational-cards/experience/director/internal-problems.fixture'
import type { InternalProblemsResponse } from '@/modules/operational-cards/types/internal-problems.types'

const here = dirname(fileURLToPath(import.meta.url))
const NOW = new Date('2026-10-07T15:00:00.000Z')
const H2 = buildCurrentCyclePeriod(NOW)

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

function panel(over: Partial<ComponentProps<typeof DirectorInternosPanelView>> = {}) {
  return renderToStaticMarkup(
    <DirectorInternosPanelView
      hasCoordination
      period={H2}
      onPeriodChange={() => undefined}
      page={0}
      onPageChange={() => undefined}
      recurrenceStatus="success"
      recurrence={GENERAL_RECURRENCE}
      recurrenceError={null}
      problemsStatus="success"
      problems={FABRICA_PROBLEMS}
      problemsError={null}
      reference={INTERNOS_REFERENCE}
      openProblemId={null}
      onOpenProblem={() => undefined}
      showDemoMark={false}
      {...over}
    />,
  )
}

function affectations(problems: InternalProblemsResponse) {
  return renderToStaticMarkup(
    <DirectorInternosAfectaciones
      status="success"
      problems={problems}
      error={null}
      reference={INTERNOS_REFERENCE}
      openProblemId={null}
      onOpenProblem={() => undefined}
    />,
  )
}

describe('DirectorInternosPanelView · carrusel de 2 láminas', () => {
  it('dos páginas (Recurrencia, Afectaciones), sin tabla ni tabs ACTIVOS/CERRADOS', () => {
    const html = panel()
    expect(html).toContain('data-testid="director-internos-carousel"')
    expect(html).toContain('data-pages="2"')
    expect(html).toContain('data-testid="director-internos-page-recurrencia"')
    expect(html).toContain('data-testid="director-internos-page-afectaciones"')
    // No choca con los testids de ESTADO.
    expect(html).not.toContain('data-testid="director-estado-carousel"')
    expect(html).not.toMatch(/director-internal-table|director-internos-view-|>Cerrados</)
    expect(html).not.toMatch(/director-internos-search|director-internos-filter/)
  })

  it('scroll SOLO de INTERNOS: una región por lámina; flechas y puntos fuera de ellas', () => {
    const html = panel()
    expect(html.match(/class="director-internos-scroll"/g)).toHaveLength(2)
    for (const id of ['recurrencia', 'afectaciones']) {
      const pageStart = html.indexOf(`data-testid="director-internos-page-${id}"`)
      const region = html.indexOf(`data-testid="director-internos-scroll-${id}"`)
      expect(region).toBeGreaterThan(pageStart)
    }
    const firstRegion = html.indexOf('class="director-internos-scroll"')
    const lastRegionEnd = html.lastIndexOf('director-internos-scroll-afectaciones')
    expect(html.indexOf('data-testid="director-internos-carousel-prev"')).toBeLessThan(firstRegion)
    expect(html.indexOf('data-testid="director-internos-carousel-next"')).toBeGreaterThan(lastRegionEnd)
    expect(html.indexOf('data-testid="director-internos-carousel-dot-0"')).toBeGreaterThan(lastRegionEnd)
  })

  it('el CSS de scroll está acotado a INTERNOS (ESTADO y el cuerpo compartido no cambian)', () => {
    const css = readFileSync(join(here, '../../../../styles/director-internos.css'), 'utf8')
    const rules = css.match(/[^{}]*\{[^{}]*overflow-y:\s*auto[^{}]*\}/g) ?? []
    expect(rules.length).toBeGreaterThan(0)
    for (const rule of rules) {
      expect(rule).toMatch(/\.director-internos \.director-internos-scroll\s*\{/)
    }
    expect(css).not.toMatch(/\.director-reading__body[^{]*\{[^}]*overflow-y:\s*auto/)
    expect(css).not.toMatch(/\.director-estado-carousel__page[^{]*\{[^}]*overflow/)
  })

  it('la página activa la controla el padre', () => {
    expect(panel({ page: 1 })).toMatch(/data-testid="director-internos-carousel"[^>]*data-page="1"/)
  })

  it('marca única «Datos de demostración» y nunca «escalamiento simulado»', () => {
    const html = panel({ showDemoMark: true })
    expect(html.match(/Datos de demostración/g)).toHaveLength(1)
    expect(html).not.toMatch(/simulado/i)
  })

  it('sin coordinación: invita a elegir una', () => {
    expect(panel({ hasCoordination: false })).toContain('Selecciona una coordinación')
  })
})

describe('Lámina 1 · Recurrencia', () => {
  const recurrence = (period = H2, data = GENERAL_RECURRENCE) =>
    renderToStaticMarkup(
      <DirectorInternosRecurrencia
        period={period}
        status="success"
        recurrence={data}
        error={null}
        onPeriodChange={() => undefined}
      />,
    )

  it('heatmap: 5 filas × 6 meses; totales de columna; futuros sin número ni cero', () => {
    const html = recurrence()
    expect(html).toContain('data-rows="5"')
    expect(html).toContain('data-cols="6"')
    expect(text(html)).toMatch(/JUL 5 AGO 6 SEP 6 OCT 7 NOV DIC/)
    expect(html.match(/data-state="future"/g)).toHaveLength(10)
    // Aplicativos en julio: 0 observado → punto tenue, no vacío.
    expect(html).toMatch(/data-testid="director-internos-cell-apps-0"[^>]*>.*?<span class="director-internos-heatmap__value">·</s)
  })

  it('drill-down: columnas pasadas clicables; las futuras no', () => {
    const html = recurrence()
    expect(html).toContain('data-testid="director-internos-drill-2026-09-01"')
    expect(html).toContain('data-testid="director-internos-cell-internet-2"')
    expect(html).not.toContain('data-testid="director-internos-drill-2026-11-01"')
  })

  it('semana = días terminales: sin drill', () => {
    const week = analysisPeriodFromWeek('2026-09-14', NOW)
    const daily = {
      ...GENERAL_RECURRENCE,
      bucket: 'day' as const,
      buckets: Array.from({ length: 7 }, (_, i) => {
        const day = `2026-09-${String(14 + i).padStart(2, '0')}`
        return { start: day, end: day, calendarStart: day, calendarEnd: day, dataEnd: day, label: day, current: false, future: false, total: 0 }
      }),
      eligibleBuckets: 7,
      total: 0,
      categories: [],
    }
    const html = recurrence(week, daily)
    expect(html).toContain('data-level="day"')
    expect(html).not.toContain('director-internos-drill-')
    expect(html).toContain('Sin problemas internos reportados en este periodo.')
  })

  it('ranking «Más recurrentes»: reportes + presencia, constancia primero', () => {
    const ranking = text(recurrence())
    expect(ranking).toMatch(/Infraestructura 6 reportes · presente en 4\/4 meses/)
    expect(ranking).toMatch(/Aplicativos 7 reportes · presente en 3\/4 meses/)
    expect(ranking.indexOf('Infraestructura 6')).toBeLessThan(ranking.indexOf('Aplicativos 7'))
  })

  it('copy: categoría, nunca «el mismo problema se repitió»', () => {
    const html = recurrence()
    expect(html).toContain('Problemas reportados por categoría')
    expect(html).not.toMatch(/se repiti|mismo problema volvi/i)
  })

  it('mes: miga H2 2026 › SEPTIEMBRE', () => {
    const sep = analysisPeriodFromMonth(2026, 8, NOW)
    expect(text(recurrence(sep))).toMatch(/H2 2026 › SEPTIEMBRE/)
  })
})

describe('Lámina 2 · Tiempo activo y afectaciones', () => {
  it('una sola sección: sin «Afectaciones de problemas activos» ni «Problemas con más afectaciones»', () => {
    const html = affectations(FABRICA_PROBLEMS)
    expect(html.match(/director-estado__section-title/g)).toHaveLength(1)
    expect(text(html)).toMatch(/Tiempo activo y afectaciones \? .* Problemas activos al corte y afectaciones registradas en el tiempo · al 7 OCT/)
    expect(html).not.toMatch(/Afectaciones de problemas activos|Problemas con más afectaciones|director-internos-top/)
  })

  it('vacíos: sin activos lo dice; activos sin afectaciones siguen con su línea limpia y atenuada', () => {
    expect(affectations(problemsResponse([]))).toContain('Sin problemas internos activos en este corte.')
    const zero = affectations(problemsResponse([ROW_D, ROW_G]))
    expect(zero).toContain('data-testid="director-internos-timeline-row"')
    expect(zero).toMatch(/data-marks="0" data-empty="true"/)
    expect(zero).not.toContain('director-internos-timeline-mark')
    const mixed = affectations(problemsResponse([ROW_K, ROW_D]))
    expect(mixed.match(/data-empty="true"/g)).toHaveLength(1)
  })

  /** Filas de la línea de vida: id, ●, hechos y longitud de la línea (px). */
  const lanes = (html: string) =>
    html
      .split('data-testid="director-internos-timeline-row"')
      .slice(1)
      .map((chunk) => {
        const life = chunk.match(/<line x1="([\d.]+)" x2="([\d.]+)" y1="15" y2="15" class="director-internos-timeline__life"/)!
        return {
          id: chunk.match(/data-problem-id="([^"]+)"/)![1],
          marks: (chunk.match(/data-testid="director-internos-timeline-mark"/g) ?? []).length,
          facts: chunk.match(/data-testid="director-internos-timeline-facts">([^<]+)</)![1],
          length: Number(life[2]) - Number(life[1]),
        }
      })

  it('Fábrica: A 8 d · 5 ● claramente más larga que H (2 d · 1) y F (hoy · 1)', () => {
    const html = affectations(FABRICA_PROBLEMS)
    const [a, h, f] = lanes(html)
    expect([a.id, h.id, f.id]).toEqual([ROW_A.id, ROW_H.id, ROW_F.id])
    expect([a.marks, h.marks, f.marks]).toEqual([5, 1, 1])
    expect([a.facts, h.facts, f.facts]).toEqual(['8 d · 5 afectaciones', '2 d · 1 afectación', 'hoy · 1 afectación'])
    expect(a.length).toBeGreaterThan(h.length * 3)
    expect(h.length).toBeGreaterThan(f.length)
    expect(html).toContain('MEDIA → CRÍTICA')
    expect(html).toContain('>HOY<')
  })

  it('Ingenierías: I (~30 d · 4) frente a J (~20 d · 1), misma escala', () => {
    const [i, j] = lanes(affectations(problemsResponse([ROW_I, ROW_J])))
    expect([i.marks, j.marks]).toEqual([4, 1])
    expect(i.length).toBeGreaterThan(j.length)
  })

  it('Op. Académica: K reciente con 3 ●, D limpia, antiguo de 97 d en bandas; G fuera y en la nota', () => {
    const html = affectations(problemsResponse([ROW_K, ROW_D, ROW_G, ROW_OLD]))
    expect(html).toContain('data-scale="banded"')
    const rows = lanes(html)
    expect(rows.map((r) => r.id)).toEqual([ROW_K.id, ROW_D.id, ROW_OLD.id])
    const [k, d, old] = rows
    expect(k.marks).toBe(3)
    expect(d.marks).toBe(0)
    expect(d.facts).toBe('2 d · sin afectaciones')
    expect(old.length).toBeGreaterThan(k.length)
    // K no queda aplastado por el caso de 97 d.
    expect(k.length).toBeGreaterThan(50)
    expect(html).not.toContain(`data-problem-id="${ROW_G.id}"`)
    expect(html).toContain('1 activo anterior al registro de afectaciones no se muestra.')
    // Filas mostradas + legacy = activos.
    expect(html).toMatch(/data-total="4" data-reliable="3" data-legacy="1"/)
  })

  it('tramos visibles: cabecera con rango fuerte + fecha secundaria, HOY al final, fondo por tramos', () => {
    const html = affectations(problemsResponse([ROW_K, ROW_D, ROW_OLD]))
    const labels = [...html.matchAll(/director-internos-timeline__segment-label">([^<]+)</g)].map((m) => m[1])
    expect(labels).toEqual(['60+ D', '31–60 D', '15–30 D', '8–14 D', '0–7 D'])
    expect(labels.at(-1)).toBe('0–7 D')
    expect(labels.length).toBeGreaterThanOrEqual(4)
    expect(html.match(/class="director-internos-timeline__band"/g)?.length).toBe(labels.length)
    expect(html).toMatch(/data-testid="director-internos-timeline-end">HOY</)
    // Dos niveles por fila: cabecera (título + resumen) y pista.
    const firstRow = html.split('data-testid="director-internos-timeline-row"')[1]
    expect(firstRow.indexOf('director-internos-timeline__head')).toBeLessThan(firstRow.indexOf('director-internos-timeline__lane'))
    // Resumen en UNA lectura: severidad · edad · afectaciones.
    const meta = firstRow.slice(firstRow.indexOf('director-internos-timeline__meta')).replace(/<[^>]+>/g, '')
    expect(meta).toMatch(/^[^A-Z]*ALTA·5 d · 3 afectaciones/)
  })

  it('histórico: el extremo derecho es el corte', () => {
    const sep = { ...FABRICA_PROBLEMS, period: { ...FABRICA_PROBLEMS.period, isCurrent: false, dataTo: '2026-09-30' } }
    expect(affectations(sep)).toMatch(/data-testid="director-internos-timeline-end">30 SEP</)
  })

  it('más de 5 fiables: muestra 5 y lo dice', () => {
    const html = affectations(problemsResponse([ROW_A, ROW_I, ROW_K, ROW_B, ROW_H, ROW_J, ROW_F]))
    expect(lanes(html)).toHaveLength(5)
    expect(html).toContain('Se muestran 5 de 7 activos.')
  })

  it('sin dispersión: ni puntos, ni leyenda de formas, ni puntaje', () => {
    const html = affectations(FABRICA_PROBLEMS)
    expect(html).toContain('Tiempo activo y afectaciones')
    expect(html).not.toMatch(/director-internos-point|director-internos-scatter|Duración × afectaciones|○ Baja/)
    expect(html).not.toMatch(/priority|score|umbral/i)
  })

  it('subtítulo del corte', () => {
    expect(text(affectations(FABRICA_PROBLEMS))).toContain('Problemas activos al corte y afectaciones registradas en el tiempo · al 7 OCT')
  })
})

describe('INTERNOS · sin acoplar rol', () => {
  it('ni el panel ni las láminas miran el rol', () => {
    for (const file of ['DirectorInternosPanel.tsx', 'DirectorInternosRecurrencia.tsx', 'DirectorInternosAfectaciones.tsx']) {
      expect(readFileSync(join(here, file), 'utf8')).not.toMatch(/\broleCode\b|\brole\s*===\s*/)
    }
  })
})
