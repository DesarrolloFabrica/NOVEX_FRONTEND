import { describe, expect, it } from 'vitest'
import {
  bucketHeader,
  bucketLongName,
  cellIntensity,
  formatAgo,
  legacyNote,
  maxCell,
  periodCrumbLabel,
  presenceText,
  recurrenceCellTooltip,
  recurrenceRows,
  severityPath,
  timelineSelection,
  timelineScale,
  timelineSegments,
  layoutMarks,
  timelineMeta,
  timelineFacts,
  markTooltip,
  problemTooltip,
  daysBefore,
  dayBefore,
  formatMarkDay,
} from '@/modules/operational-cards/experience/director/internal-problems.presentation'
import {
  GENERAL_RECURRENCE,
  INTERNOS_REFERENCE,
  ROW_A,
  ROW_B,
  ROW_D,
  ROW_F,
  ROW_G,
  ROW_H,
  ROW_I,
  ROW_J,
  ROW_K,
  ROW_OLD,
} from '@/modules/operational-cards/experience/director/internal-problems.fixture'
import type { InternalRecurrenceCategory } from '@/modules/operational-cards/types/internal-problems.types'

describe('INTERNOS · recurrencia', () => {
  it('Top 5 en el orden del backend (presencia ↓ · total ↓ · nombre); sin «Otras» con ≤ 5', () => {
    const rows = recurrenceRows(GENERAL_RECURRENCE)
    expect(rows.map((r) => r.name)).toEqual(['Infraestructura', 'Equipos', 'Internet', 'Aplicativos', 'Tickets'])
    expect(rows.some((r) => r.id === 'otras')).toBe(false)
  })

  it('con más de 5, «Otras» suma EXACTAMENTE el resto y respeta los futuros', () => {
    const extra = (id: string, values: Array<number | null>): InternalRecurrenceCategory => ({
      id,
      code: id,
      name: id,
      selectable: true,
      totalCreated: values.reduce<number>((a, v) => a + (v ?? 0), 0),
      bucketsWithOccurrences: values.filter((v) => (v ?? 0) > 0).length,
      values,
    })
    const recurrence = {
      ...GENERAL_RECURRENCE,
      categories: [...GENERAL_RECURRENCE.categories, extra('zoho', [0, 1, 0, 0, null, null]), extra('acas', [0, 0, 2, 0, null, null])],
    }
    const rows = recurrenceRows(recurrence)
    expect(rows).toHaveLength(6)
    const others = rows.at(-1)!
    expect(others).toMatchObject({ id: 'otras', others: 2, totalCreated: 3, bucketsWithOccurrences: 2 })
    expect(others.values).toEqual([0, 1, 2, 0, null, null])
    const all = rows.reduce((a, r) => a + r.totalCreated, 0)
    expect(all).toBe(GENERAL_RECURRENCE.total + 3)
  })

  it('intensidad relativa al máximo visible; 0 y futuro sin intensidad', () => {
    const rows = recurrenceRows(GENERAL_RECURRENCE)
    expect(maxCell(rows)).toBe(3)
    expect(cellIntensity(3, 3)).toBe(1)
    expect(cellIntensity(0, 3)).toBe(0)
    expect(cellIntensity(null, 3)).toBe(0)
  })

  it('presencia: «presente en 4/4 meses» · semanas · días', () => {
    expect(presenceText({ bucketsWithOccurrences: 4 }, 4, 'month')).toBe('presente en 4/4 meses')
    expect(presenceText({ bucketsWithOccurrences: 2 }, 5, 'week')).toBe('presente en 2/5 semanas')
    expect(presenceText({ bucketsWithOccurrences: 1 }, 7, 'day')).toBe('presente en 1/7 días')
  })

  it('columnas y tooltip: «INTERNET · SEPTIEMBRE — 1 problema reportado de 6 internos registrados en septiembre»', () => {
    const sep = GENERAL_RECURRENCE.buckets[2]
    expect(bucketHeader(sep, 'month')).toBe('SEP')
    expect(bucketLongName(sep, 'month')).toBe('septiembre')
    expect(recurrenceCellTooltip({ name: 'Internet', others: 0 }, sep, 'month', 1)).toEqual({
      title: 'INTERNET · SEPTIEMBRE',
      lines: ['1 problema reportado', 'de 6 internos registrados en septiembre'],
    })
    const day = { ...sep, start: '2026-09-14', end: '2026-09-14', calendarStart: '2026-09-14', calendarEnd: '2026-09-14', label: 'Lun 14' }
    expect(bucketHeader(day, 'day')).toBe('LUN 14')
    const week = { ...sep, start: '2026-09-14', label: '14–20 sep' }
    expect(bucketHeader(week, 'week')).toBe('14–20 SEP')
  })

  it('miga: H2 2026 › SEPTIEMBRE › 14–20 SEP', () => {
    expect(periodCrumbLabel({ kind: 'cycle', from: '2026-07-01', calendarEnd: '2026-12-31', navigationContext: { year: 2026, half: 2 } })).toBe('H2 2026')
    expect(periodCrumbLabel({ kind: 'month', from: '2026-09-01', calendarEnd: '2026-09-30', navigationContext: { year: 2026 } })).toBe('SEPTIEMBRE')
    expect(periodCrumbLabel({ kind: 'week', from: '2026-09-14', calendarEnd: '2026-09-20', navigationContext: { year: 2026 } })).toBe('14–20 SEP')
  })
})

describe('INTERNOS · afectaciones activas', () => {
  it('línea de vida: hasta 5 fiables en el orden del backend; completa con los de 0; legacy fuera', () => {
    const backendOrder = [ROW_K, ROW_D, ROW_G, ROW_OLD]
    const selection = timelineSelection(backendOrder)
    expect(selection.rows.map((r) => r.id)).toEqual([ROW_K.id, ROW_D.id, ROW_OLD.id])
    expect(selection).toMatchObject({ reliable: 3, legacy: 1 })
    // shown + legacy cubren todos los activos.
    expect(selection.reliable + selection.legacy).toBe(backendOrder.length)
    const many = timelineSelection([ROW_A, ROW_I, ROW_K, ROW_B, ROW_H, ROW_J, ROW_F])
    expect(many.rows).toHaveLength(5)
    expect(many.reliable).toBe(7)
    expect(legacyNote(1)).toBe('1 activo anterior al registro de afectaciones no se muestra.')
    expect(legacyNote(2)).toBe('2 activos anteriores al registro de afectaciones no se muestran.')
    expect(legacyNote(0)).toBeNull()
  })

  it('escala común hasta 14 d: lineal (A 8 d mucho más larga que F hoy)', () => {
    const ages = [ROW_A, ROW_H, ROW_F].map((r) => daysBefore(r.createdAt, INTERNOS_REFERENCE))
    const scale = timelineScale(ages)
    expect(scale.mode).toBe('linear')
    const len = (days: number) => scale.at(0) - scale.at(days)
    expect(len(ages[0])).toBeGreaterThan(len(ages[1]) * 3)
    expect(len(ages[2])).toBeLessThan(0.05)
    expect(scale.at(0)).toBe(1)
  })

  it('rango largo · bandas: 90 d no aplasta a los recientes (K 5 d ocupa ~1/6 del ancho)', () => {
    const ages = [5, 28, 97, 44, 14]
    const scale = timelineScale(ages)
    expect(scale.mode).toBe('banded')
    expect(scale.ticks).toEqual([7, 14, 30, 60, 90])
    // Sin espacio vacío: el más antiguo empieza en el borde izquierdo.
    expect(scale.at(97)).toBeCloseTo(0)
    const k = 1 - scale.at(5)
    expect(k).toBeGreaterThan(0.1)
    // Monótona y con escala común: más días = más largo.
    expect(scale.at(97)).toBeLessThan(scale.at(44))
    expect(scale.at(44)).toBeLessThan(scale.at(28))
    // En lineal (0–97 d) K ocuparía apenas el 5 %.
    expect(5 / 97).toBeLessThan(0.06)
  })

  it('tramos: rótulos del pasado a HOY, sin cambiar la escala; tramo diminuto fundido como «N+ D»', () => {
    const general = timelineScale([12, 91, 13, 0.1, 6])
    const segments = timelineSegments(general)
    // 90–91 d (~1 % del ancho) se funde con 60–90 y se lee «60+ D».
    expect(segments.map((s) => s.label)).toEqual(['60+ D', '31–60 D', '15–30 D', '8–14 D', '0–7 D'])
    // Tramos contiguos que cubren todo el ancho, en la MISMA escala.
    expect(segments.at(-1)!.right).toBe(1)
    expect(segments[0].left).toBeCloseTo(0)
    segments.slice(1).forEach((s, i) => expect(s.left).toBeCloseTo(segments[i].right))
    expect(segments.at(-1)!.left).toBeCloseTo(general.at(7))
    // Escala corta: lineal, 0–7 y 8–14.
    expect(timelineSegments(timelineScale([8, 2, 0])).map((s) => s.label)).toEqual(['8–14 D', '0–7 D'])
  })

  it('marcas cercanas: se separan en vertical sin mover su fecha; coincidentes ×N', () => {
    const layout = layoutMarks([100, 104, 108, 200, 200.5])
    expect(layout.map((m) => m.dy)).toEqual([0, -6, 6, 0, 0])
    expect(layout[3]).toMatchObject({ count: 2, visible: true })
    expect(layout[4].visible).toBe(false)
    expect(layoutMarks([10, 60, 120]).every((m) => m.dy === 0 && m.count === 1)).toBe(true)
    expect(timelineMeta(ROW_A)).toBe('MEDIA → CRÍTICA · 8 d · 5 afectaciones')
    expect(timelineMeta(ROW_OLD)).toBe('ALTA · 97 d · sin afectaciones')
  })

  it('hechos y tooltips', () => {
    expect(timelineFacts(ROW_A)).toBe('8 d · 5 afectaciones')
    expect(timelineFacts(ROW_F)).toBe('hoy · 1 afectación')
    expect(timelineFacts(ROW_OLD)).toBe('97 d · sin afectaciones')
    const tip = markTooltip(ROW_A.consequenceTimeline[4])
    // Orden: texto · ocurrencia · registro (si difiere) · severidad de entonces.
    expect(tip.title).toBe('Afectación a5')
    expect(tip.lines).toEqual(['6 OCT · 16:30', 'Registrada: 6 OCT · 16:50', 'Severidad en ese momento: Crítica'])
    const sameMinute = markTooltip({ ...ROW_A.consequenceTimeline[0], createdAt: ROW_A.consequenceTimeline[0].occurredAt })
    expect(sameMinute.lines).toEqual(['29 SEP · 10:00', 'Severidad en ese momento: Media'])
    expect(markTooltip({ ...ROW_A.consequenceTimeline[0], preview: 'x'.repeat(140), truncated: true }).title).toBe(`${'x'.repeat(140)}…`)
    expect(problemTooltip(ROW_A)).toEqual({
      title: ROW_A.title,
      lines: ['Internet', 'MEDIA → CRÍTICA', '8 días abierto', 'SLA vencido', '5 afectaciones registradas'],
    })
    expect(problemTooltip(ROW_OLD).lines.at(-1)).toBe('Sin afectaciones registradas')
    expect(formatMarkDay('2026-09-29T15:00:00.000Z')).toBe('29 SEP')
    expect(dayBefore(INTERNOS_REFERENCE, 7)).toBe('30 SEP')
    expect(severityPath(ROW_F)).toBe('MEDIA')
    expect(severityPath(ROW_B)).toBe('BAJA → MEDIA')
    expect(problemTooltip(ROW_H).lines).toContain('SLA en riesgo')
    expect(formatAgo('2026-10-07T12:30:00.000Z', INTERNOS_REFERENCE)).toBe('hace 2 h')
  })
})
