import type {
  InternalConsequenceMark,
  InternalProblemRow,
  InternalProblemsResponse,
  InternalRecurrenceResponse,
} from '@/modules/operational-cards/types/internal-problems.types'

/**
 * INTERNOS · filas con la forma de los escenarios QA A–K.
 * Referencia común: 7 oct 2026, 10:00 Bogotá.
 */
export const INTERNOS_REFERENCE = new Date('2026-10-07T15:00:00.000Z')
export const INTERNOS_CUT_AT = '2026-10-08T05:00:00.000Z'

function row(over: Partial<InternalProblemRow> & Pick<InternalProblemRow, 'id' | 'title'>): InternalProblemRow {
  return {
    category: { id: 'cat-internet', code: 'INTERNET', name: 'Internet' },
    createdAt: '2026-09-29T14:10:00.000Z',
    createdByName: 'Johan Daza',
    ageDays: 8,
    statusAtCut: 'IN_PROGRESS',
    reportedSeverity: 'MEDIUM',
    severityAtCut: 'MEDIUM',
    consequenceCountAtCut: 0,
    latestConsequence: null,
    dueAt: '2026-10-14T15:00:00.000Z',
    slaAtCut: 'on_track',
    historyReliable: true,
    consequenceTimeline: [],
    ...over,
  }
}

/** Afectación conocida al corte, registrada 20 min después de ocurrir. */
function mark(id: string, occurredAt: string, severity: InternalConsequenceMark['severityAtOccurrence']): InternalConsequenceMark {
  return {
    id,
    occurredAt,
    createdAt: new Date(new Date(occurredAt).getTime() + 20 * 60_000).toISOString(),
    preview: `Afectación ${id}`,
    truncated: false,
    severityAtOccurrence: severity,
  }
}

const latest = (occurredAt: string, preview: string) => ({
  occurredAt,
  createdAt: occurredAt,
  preview,
  truncated: false,
})

/** A · Fábrica: MEDIA → CRÍTICA, 5 afectaciones, 8 d, vencido. */
export const ROW_A = row({
  id: '5eedc0de-0e1f-4aaa-8aaa-000000005720',
  title: 'Intermitencia prolongada de internet en el estudio',
  severityAtCut: 'CRITICAL',
  consequenceCountAtCut: 5,
  latestConsequence: latest('2026-10-06T21:30:00.000Z', 'Se reprogramó la entrega de contenidos.'),
  dueAt: '2026-10-06T14:10:00.000Z',
  slaAtCut: 'overdue',
  consequenceTimeline: [
    mark('a1', '2026-09-29T15:00:00.000Z', 'MEDIUM'),
    mark('a2', '2026-09-30T20:40:00.000Z', 'MEDIUM'),
    mark('a3', '2026-10-02T16:20:00.000Z', 'HIGH'),
    mark('a4', '2026-10-04T14:15:00.000Z', 'HIGH'),
    mark('a5', '2026-10-06T21:30:00.000Z', 'CRITICAL'),
  ],
})

/** H · Fábrica: Alta, 1 afectación, 2 d, en riesgo. */
export const ROW_H = row({
  id: '5eedc0de-0e1f-4aaa-8aaa-00000000009b',
  title: 'Micrófonos inalámbricos del estudio con interferencia',
  category: { id: 'cat-equipos', code: 'EQUIPOS', name: 'Equipos' },
  reportedSeverity: 'HIGH',
  severityAtCut: 'HIGH',
  ageDays: 2,
  consequenceCountAtCut: 1,
  latestConsequence: latest('2026-10-06T09:00:00.000Z', 'Se repitió la grabación de una clase.'),
  dueAt: '2026-10-08T08:00:00.000Z',
  slaAtCut: 'at_risk',
  createdAt: '2026-10-05T09:00:00.000Z',
  consequenceTimeline: [mark('h1', '2026-10-06T09:00:00.000Z', 'HIGH')],
})

/** F · Fábrica: recién creado, 1 afectación. */
export const ROW_F = row({
  id: '5eedc0de-0e1f-4aaa-8aaa-000000007b25',
  title: 'Caída del wifi en la sala de edición 2',
  statusAtCut: 'OPEN',
  ageDays: 0,
  consequenceCountAtCut: 1,
  latestConsequence: latest('2026-10-07T12:30:00.000Z', 'No se pudo sincronizar el material.'),
  createdAt: '2026-10-07T13:00:00.000Z',
  consequenceTimeline: [mark('f1', '2026-10-07T12:30:00.000Z', 'MEDIUM')],
})

/** B · General: BAJA → MEDIA. */
export const ROW_B = row({
  id: '5eedc0de-0e1f-4aaa-8aaa-00000000ae06',
  title: 'Fallas intermitentes del aplicativo de matrícula',
  reportedSeverity: 'LOW',
  severityAtCut: 'MEDIUM',
  ageDays: 12,
  consequenceCountAtCut: 2,
  latestConsequence: latest('2026-10-03T20:10:00.000Z', 'Se demoró la emisión de certificados.'),
  slaAtCut: 'at_risk',
  createdAt: '2026-09-25T19:00:00.000Z',
  consequenceTimeline: [
    mark('b1', '2026-09-27T15:30:00.000Z', 'LOW'),
    mark('b2', '2026-10-03T20:10:00.000Z', 'MEDIUM'),
  ],
})

/** D · Op. Académica: fiable con 0 afectaciones → Y = 0. */
export const ROW_D = row({
  id: '5eedc0de-0e1f-4aaa-8aaa-0000000032da',
  title: 'Usuarios duplicados en ACAS',
  statusAtCut: 'OPEN',
  reportedSeverity: 'LOW',
  severityAtCut: 'LOW',
  ageDays: 2,
  createdAt: '2026-10-05T15:00:00.000Z',
})

/** G · Op. Académica: legacy, fuera del plano. */
export const ROW_G = row({
  id: '5eedc0de-0e1f-4aaa-8aaa-000000003e2a',
  title: 'Retraso en la publicación de horarios en el portal',
  ageDays: 40,
  slaAtCut: 'overdue',
  historyReliable: false,
  createdAt: '2026-08-28T13:30:00.000Z',
})

/** I · Ingenierías: antiguo y acumulando. */
export const ROW_I = row({
  id: '5eedc0de-0e1f-4aaa-8aaa-00000000a111',
  title: 'Licencias del software de simulación vencidas en laboratorios',
  severityAtCut: 'HIGH',
  ageDays: 30,
  consequenceCountAtCut: 4,
  latestConsequence: latest('2026-10-03T16:00:00.000Z', 'Un docente dictó la sesión con capturas.'),
  slaAtCut: 'overdue',
  createdAt: '2026-09-07T14:00:00.000Z',
  consequenceTimeline: [
    mark('i1', '2026-09-09T15:00:00.000Z', 'MEDIUM'),
    mark('i2', '2026-09-16T20:00:00.000Z', 'MEDIUM'),
    mark('i3', '2026-09-25T14:30:00.000Z', 'HIGH'),
    mark('i4', '2026-10-03T16:00:00.000Z', 'HIGH'),
  ],
})

/** J · Ingenierías: antiguo con pocas afectaciones. */
export const ROW_J = row({
  id: '5eedc0de-0e1f-4aaa-8aaa-00000000a222',
  title: 'Osciloscopios descalibrados en el laboratorio de física',
  reportedSeverity: 'LOW',
  severityAtCut: 'LOW',
  ageDays: 20,
  consequenceCountAtCut: 1,
  latestConsequence: latest('2026-09-22T15:00:00.000Z', 'Un grupo repitió la medición.'),
  slaAtCut: 'overdue',
  createdAt: '2026-09-17T19:30:00.000Z',
  consequenceTimeline: [mark('j1', '2026-09-22T15:00:00.000Z', 'LOW')],
})

/** K · Op. Académica: reciente y ya golpeando. */
export const ROW_K = row({
  id: '5eedc0de-0e1f-4aaa-8aaa-00000000a333',
  title: 'Notas del corte que no se reflejan en ACAS',
  reportedSeverity: 'HIGH',
  severityAtCut: 'HIGH',
  ageDays: 5,
  consequenceCountAtCut: 3,
  latestConsequence: latest('2026-10-06T16:00:00.000Z', 'Se retrasaron las alertas tempranas.'),
  slaAtCut: 'overdue',
  createdAt: '2026-10-02T13:00:00.000Z',
  consequenceTimeline: [
    mark('k1', '2026-10-03T15:00:00.000Z', 'HIGH'),
    mark('k2', '2026-10-04T21:00:00.000Z', 'HIGH'),
    mark('k3', '2026-10-06T16:00:00.000Z', 'HIGH'),
  ],
})

/** Op. Académica: antiguo (97 d), fiable y sin afectaciones. */
export const ROW_OLD = row({
  id: '5eedc0de-0e1f-4aaa-8aaa-0000000007fa',
  title: 'Demora histórica en homologaciones',
  category: { id: 'cat-acas', code: 'ACAS', name: 'ACAS' },
  reportedSeverity: 'HIGH',
  severityAtCut: 'HIGH',
  ageDays: 97,
  createdAt: '2026-07-02T14:00:00.000Z',
  slaAtCut: 'overdue',
})

const PERIOD = {
  kind: 'cycle',
  from: '2026-07-01',
  to: '2026-10-07',
  calendarEnd: '2026-12-31',
  dataTo: '2026-10-07',
  isCurrent: true,
  isPartial: true,
  cutAt: INTERNOS_CUT_AT,
}

export function problemsResponse(items: InternalProblemRow[]): InternalProblemsResponse {
  return { coordinationId: 'coord', period: PERIOD, total: items.length, truncated: false, items }
}

/** Fábrica, en el orden del backend: A · H · F. */
export const FABRICA_PROBLEMS = problemsResponse([ROW_A, ROW_H, ROW_F])

const month = (start: string, end: string, label: string, total: number | null, current = false) => ({
  start,
  end,
  calendarStart: start,
  calendarEnd: end,
  dataEnd: total === null ? null : end,
  label,
  current,
  future: total === null,
  total,
})

/** General · H2 al 7 OCT (4 meses observados). */
export const GENERAL_RECURRENCE: InternalRecurrenceResponse = {
  coordinationId: 'coord',
  period: PERIOD,
  bucket: 'month',
  buckets: [
    month('2026-07-01', '2026-07-31', 'Jul 2026', 5),
    month('2026-08-01', '2026-08-31', 'Ago 2026', 6),
    month('2026-09-01', '2026-09-30', 'Sep 2026', 6),
    { ...month('2026-10-01', '2026-10-31', 'Oct 2026', 7, true), end: '2026-10-07', dataEnd: '2026-10-07' },
    month('2026-11-01', '2026-11-30', 'Nov 2026', null),
    month('2026-12-01', '2026-12-31', 'Dic 2026', null),
  ],
  eligibleBuckets: 4,
  total: 24,
  categories: [
    { id: 'infra', code: 'INFRAESTRUCTURA', name: 'Infraestructura', selectable: true, totalCreated: 6, bucketsWithOccurrences: 4, values: [2, 2, 1, 1, null, null] },
    { id: 'equipos', code: 'EQUIPOS', name: 'Equipos', selectable: true, totalCreated: 4, bucketsWithOccurrences: 4, values: [1, 1, 1, 1, null, null] },
    { id: 'internet', code: 'INTERNET', name: 'Internet', selectable: true, totalCreated: 4, bucketsWithOccurrences: 4, values: [1, 1, 1, 1, null, null] },
    { id: 'apps', code: 'APLICATIVOS', name: 'Aplicativos', selectable: true, totalCreated: 7, bucketsWithOccurrences: 3, values: [0, 2, 2, 3, null, null] },
    { id: 'tickets', code: 'TICKETS', name: 'Tickets', selectable: true, totalCreated: 3, bucketsWithOccurrences: 3, values: [1, 0, 1, 1, null, null] },
  ],
}
