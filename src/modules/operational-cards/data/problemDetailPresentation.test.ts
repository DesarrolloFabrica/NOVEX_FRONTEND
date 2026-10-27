import { describe, expect, it } from 'vitest'
import type { SituationEvidenceItem } from '@/modules/api/evidences.api'
import type { SituationTimelineEntry } from '@/modules/api/timeline.api'
import {
  AUTHOR_NOT_RECORDED,
  DATE_NOT_AVAILABLE,
  SYSTEM_AUTHOR,
  formatProblemDateTime,
  splitProblemEvidences,
  toProblemTimelineEntryView,
} from '@/modules/operational-cards/data/problemDetailPresentation'

function evidence(over: Partial<SituationEvidenceItem> = {}): SituationEvidenceItem {
  return {
    id: 'ev-1',
    situationId: 'p1',
    uploadedByUserId: 'u1',
    uploadedByUserName: 'Ana Pérez',
    type: 'NOTE',
    title: 'Notas adicionales',
    description: 'Primera línea.\nSegunda línea.',
    fileName: null,
    storagePath: null,
    mimeType: null,
    fileSize: null,
    createdAt: '2026-08-01T12:30:00.000Z',
    ...over,
  }
}

function entry(over: Partial<SituationTimelineEntry> = {}): SituationTimelineEntry {
  return {
    id: 't1',
    situationId: 'p1',
    userId: null,
    userName: null,
    eventType: 'STATUS_CHANGED',
    title: 'Estado actualizado',
    description: 'El estado cambió de Abierto a En atención.',
    metadata: null,
    createdAt: '2026-08-01T12:30:00.000Z',
    ...over,
  }
}

describe('formatProblemDateTime', () => {
  it('formatea en hora de Bogotá, no en la del navegador', () => {
    // 12:30 UTC = 07:30 en Bogotá (UTC−5, sin horario de verano).
    const date = formatProblemDateTime('2026-08-01T12:30:00.000Z')
    expect(date.label).toContain('07:30')
    expect(date.label).toContain('2026')
    expect(date.iso).toBe('2026-08-01T12:30:00.000Z')
  })

  it('una fecha inválida o ausente no rompe la vista', () => {
    expect(formatProblemDateTime('no-es-fecha')).toEqual({
      label: DATE_NOT_AVAILABLE,
      iso: null,
    })
    expect(formatProblemDateTime(null).label).toBe(DATE_NOT_AVAILABLE)
  })
})

describe('splitProblemEvidences', () => {
  it('las notas conservan su contenido íntegro, autor y fecha legible', () => {
    const { notes, others } = splitProblemEvidences([evidence()])
    expect(others).toEqual([])
    expect(notes).toHaveLength(1)
    expect(notes[0].content).toBe('Primera línea.\nSegunda línea.')
    expect(notes[0].author).toBe('Ana Pérez')
    expect(notes[0].date.label).toContain('07:30')
  })

  it('sin autor se declara «Autor no registrado»', () => {
    const { notes } = splitProblemEvidences([
      evidence({ uploadedByUserName: '  ' }),
    ])
    expect(notes[0].author).toBe(AUTHOR_NOT_RECORDED)
  })

  it('los demás tipos van aparte, traducidos y con sus metadatos', () => {
    const { notes, others } = splitProblemEvidences([
      evidence({
        id: 'ev-2',
        type: 'IMAGE',
        title: 'Foto del rack',
        description: '',
        fileName: 'rack.png',
        mimeType: 'image/png',
        fileSize: 2048,
      }),
    ])
    expect(notes).toEqual([])
    expect(others[0].typeLabel).toBe('Imagen')
    expect(others[0].description).toBeNull()
    expect(others[0].facts).toEqual([
      { label: 'Archivo', value: 'rack.png' },
      { label: 'Formato', value: 'image/png' },
      { label: 'Tamaño', value: '2,0 KB' },
    ])
  })
})

describe('toProblemTimelineEntryView', () => {
  it('traduce el código y la transición de estado', () => {
    const view = toProblemTimelineEntryView(
      entry({
        userName: 'Coordinadora',
        metadata: {
          field: 'status',
          previousValue: 'OPEN',
          newValue: 'IN_PROGRESS',
          statusComment: 'Se asignó al equipo de soporte.',
          commentKind: 'note',
        },
      }),
    )
    expect(view.label).toBe('Estado cambiado')
    expect(view.transition).toEqual({ from: 'Abierto', to: 'En atención' })
    expect(view.actor).toBe('Coordinadora')
    // La descripción del backend repite la transición: no se muestra.
    expect(view.details).toEqual(['Nota: Se asignó al equipo de soporte.'])
  })

  it('el cierre usa el vocabulario de la resolución', () => {
    expect(
      toProblemTimelineEntryView(entry({ eventType: 'CLOSED' })).label,
    ).toBe('Problema cerrado')
  })

  it('traduce la severidad anterior y nueva', () => {
    const view = toProblemTimelineEntryView(
      entry({
        eventType: 'SEVERITY_CHANGED',
        metadata: { field: 'severity', previousValue: 'MEDIUM', newValue: 'HIGH' },
      }),
    )
    expect(view.label).toBe('Severidad cambiada')
    expect(view.transition).toEqual({ from: 'Media', to: 'Alta' })
    // Acción humana sin usuario en el backend: no se atribuye al sistema.
    expect(view.actor).toBe(AUTHOR_NOT_RECORDED)
  })

  it('no inventa la transición si falta un valor o no se puede traducir', () => {
    const view = toProblemTimelineEntryView(
      entry({ metadata: { field: 'status', newValue: 'IN_PROGRESS' } }),
    )
    expect(view.transition).toBeNull()
    expect(
      toProblemTimelineEntryView(
        entry({
          metadata: { field: 'status', previousValue: 'X', newValue: 'Y' },
        }),
      ).transition,
    ).toBeNull()
  })

  it('el SLA es del sistema y la fecha límite va aparte de la del registro', () => {
    const view = toProblemTimelineEntryView(
      entry({
        eventType: 'SLA_BREACHED',
        title: 'Plazo operativo vencido',
        metadata: { dueAt: '2026-08-01T05:00:00.000Z', slaHealth: 'overdue' },
        createdAt: '2026-08-01T05:20:00.000Z',
      }),
    )
    expect(view.label).toBe('Plazo operativo vencido')
    expect(view.actor).toBe(SYSTEM_AUTHOR)
    expect(view.details).toEqual([
      `Fecha límite: ${formatProblemDateTime('2026-08-01T05:00:00.000Z').label}`,
    ])
    expect(view.date.iso).toBe('2026-08-01T05:20:00.000Z')
  })

  it('un evento desconocido tiene etiqueta neutra y no se atribuye al sistema', () => {
    const view = toProblemTimelineEntryView(
      entry({
        eventType: 'SOMETHING_NEW',
        title: 'Algo nuevo',
        description: 'Se registró algo nuevo.',
      }),
    )
    expect(view.label).toBe('Actividad registrada')
    expect(view.actor).toBe(AUTHOR_NOT_RECORDED)
    expect(view.details).toEqual(['Se registró algo nuevo.'])
    expect(JSON.stringify(view)).not.toContain('SOMETHING_NEW')
  })

  it('nunca muestra metadata en bruto ni códigos de evidencia', () => {
    const updated = toProblemTimelineEntryView(
      entry({
        eventType: 'UPDATED',
        metadata: {
          fields: [{ field: 'title' }, { field: 'description' }, { field: 'raro' }],
        },
      }),
    )
    expect(updated.details).toEqual(['Campos: título, descripción'])

    const attachment = toProblemTimelineEntryView(
      entry({
        eventType: 'ATTACHMENT_ADDED',
        description: 'Se agregó la evidencia "Notas" (NOTE).',
        metadata: { type: 'NOTE' },
      }),
    )
    expect(attachment.details).toEqual(['Tipo: Nota'])
    expect(JSON.stringify(attachment)).not.toContain('(NOTE)')
  })
})
