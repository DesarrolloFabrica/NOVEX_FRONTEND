import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { SituationEvidenceItem } from '@/modules/api/evidences.api'
import type { SituationTimelineEntry } from '@/modules/api/timeline.api'
import { ProblemDetail } from '@/modules/operational-cards/components/ProblemDetail'
import { initialProblemSectionsState } from '@/modules/operational-cards/types/problem-detail.types'
import type { OperationalCardsLevel2State } from '@/modules/operational-cards/types/operational-cards.state'
import type {
  ProblemDetail as ProblemDetailData,
  ProblemSectionId,
  ProblemSectionsState,
} from '@/modules/operational-cards/types/problem-detail.types'

/**
 * Render de servidor, como el resto de componentes del módulo: no hay jsdom ni
 * testing-library en el proyecto. Comprueba marcado, orden de lectura, estados
 * de carga/vacío/error y ausencia de IA, de impacto y de códigos técnicos.
 */

const DETAIL: ProblemDetailData = {
  id: 'situation-00ab12cd',
  title: 'Aulas sin conectividad',
  severity: 'CRITICAL',
  reportedSeverity: 'CRITICAL',
  severityHistory: [],
  consequences: [],
  canAddConsequence: false,
  status: 'OPEN',
  slaHealth: 'overdue',
  dueAt: '2026-08-10T10:00:00.000Z',
  description: 'La sede norte perdió conectividad en seis aulas.',
  coordinationName: 'Coordinador Ingenierías',
  createdAt: '2026-08-01T10:00:00.000Z',
  coordinationCode: 'coord-b2b',
  affectedCoordinationCode: 'coord-b2b',
  affectedCoordinationName: 'Coordinador Ingenierías',
  reportKind: 'INTERNAL',
  affectedProcess: null,
  pendingDelivery: null,
  createdByUserName: 'Autor de prueba',
  canResolve: false,
  canAdvanceToInProgress: false,
  canUpdate: false,
  resolution: null,
}

const INTER_DETAIL: ProblemDetailData = {
  ...DETAIL,
  reportKind: 'INTER_COORDINATION',
  coordinationName: 'Coordinación B2B',
  affectedCoordinationCode: 'coord-negocios',
  affectedCoordinationName: 'Coordinación Negocios',
  affectedProcess: 'Cierre académico',
  pendingDelivery: 'Planilla de notas',
}

const NOTE: SituationEvidenceItem = {
  id: 'ev-1',
  situationId: DETAIL.id,
  uploadedByUserId: 'u1',
  uploadedByUserName: 'Ana Pérez',
  type: 'NOTE',
  title: 'Notas adicionales',
  description: 'Primera línea de la nota.\nSegunda línea de la nota.',
  fileName: null,
  storagePath: null,
  mimeType: null,
  fileSize: null,
  createdAt: '2026-08-01T12:30:00.000Z',
}

const IMAGE: SituationEvidenceItem = {
  ...NOTE,
  id: 'ev-2',
  type: 'IMAGE',
  title: 'Foto del rack',
  description: '',
  fileName: 'rack.png',
  mimeType: 'image/png',
  fileSize: 1024,
}

const TIMELINE: SituationTimelineEntry[] = [
  {
    id: 't1',
    situationId: DETAIL.id,
    userId: 'u1',
    userName: 'Ana Pérez',
    eventType: 'SITUATION_CREATED',
    title: 'Situación registrada',
    description: 'Se registró la situación "Aulas sin conectividad".',
    metadata: null,
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 't2',
    situationId: DETAIL.id,
    userId: null,
    userName: null,
    eventType: 'SLA_BREACHED',
    title: 'Plazo operativo vencido',
    description: 'La situación superó su fecha límite.',
    metadata: { dueAt: '2026-08-02T10:00:00.000Z' },
    createdAt: '2026-08-02T10:20:00.000Z',
  },
  {
    id: 't3',
    situationId: DETAIL.id,
    userId: null,
    userName: null,
    eventType: 'SOMETHING_NEW',
    title: 'Algo nuevo',
    description: 'Actividad de un tipo aún no catalogado.',
    metadata: { raw: { nested: true } },
    createdAt: 'fecha-rota',
  },
]

function sectionsWith(
  over: Partial<ProblemSectionsState> = {},
): ProblemSectionsState {
  return { ...initialProblemSectionsState, ...over }
}

const READY_NOTES = sectionsWith({
  evidences: { status: 'ready', items: [NOTE], errorMessage: null },
})

function level2(
  overrides: Partial<OperationalCardsLevel2State> = {},
): OperationalCardsLevel2State {
  return {
    status: 'ready',
    problemId: DETAIL.id,
    detail: DETAIL,
    errorMessage: null,
    sections: READY_NOTES,
    expanded: [],
    ...overrides,
  }
}

function markup(state: OperationalCardsLevel2State = level2()): string {
  return renderToStaticMarkup(
    <ProblemDetail level2={state} onToggleSection={() => undefined} />,
  )
}

function countOf(html: string, needle: string): number {
  return html.split(needle).length - 1
}

const ALL_SECTIONS: ProblemSectionId[] = ['notes', 'other-evidences', 'timeline']

describe('ProblemDetail · estructura', () => {
  it('muestra folio, título, severidad, estado y SLA como texto', () => {
    const html = markup()
    expect(html).toContain('Nº 12CD')
    expect(html).toContain('Aulas sin conectividad')
    expect(html).toContain('>Crítica<')
    expect(html).toContain('>Abierto<')
    expect(html).toContain('SLA vencido')
  })

  it('orden: encabezado → contexto → descripción → notas → cronología', () => {
    const html = markup()
    const order = [
      'id="problem-detail-title"',
      'data-testid="detail-context"',
      'data-testid="detail-description"',
      'data-section="notes"',
      'data-section="timeline"',
    ].map((needle) => html.indexOf(needle))
    expect(order.every((index) => index >= 0)).toBe(true)
    expect(order).toEqual([...order].sort((left, right) => left - right))
  })

  it('la descripción se muestra íntegra, aunque repita las notas', () => {
    const legacy =
      'Texto.\n\n---\nContexto reportado por el usuario:\nNotas adicionales: Primera línea de la nota.'
    const html = markup(level2({ detail: { ...DETAIL, description: legacy } }))
    expect(html).toContain('Contexto reportado por el usuario:')
    expect(html).toContain('Notas adicionales: Primera línea de la nota.')
  })

  it('ningún acordeón lleva contador', () => {
    const html = markup(
      level2({
        sections: sectionsWith({
          evidences: { status: 'ready', items: [NOTE, IMAGE], errorMessage: null },
          timeline: { status: 'ready', items: TIMELINE, errorMessage: null },
        }),
      }),
    )
    expect(html).not.toContain('detail-section__hint')
  })

  it('no queda rastro de Impacto ni de IA', () => {
    const html = markup(level2({ expanded: ALL_SECTIONS }))
    for (const forbidden of [
      'Impacto',
      'data-section="impact"',
      'Coordinaciones relacionadas',
      'Inteligencia IA',
      'Recomendaciones',
      'Timeline',
    ]) {
      expect(html).not.toContain(forbidden)
    }
  })
})

describe('ProblemDetail · contexto', () => {
  it('un problema interno muestra solo su coordinación', () => {
    const html = markup()
    expect(html).toContain('data-context="responsible"')
    expect(html).not.toContain('data-context="affected"')
  })

  it('una dependencia muestra responsable, afectada, proceso y entrega', () => {
    const html = markup(level2({ detail: INTER_DETAIL }))
    for (const text of [
      'Coordinación responsable',
      'Coordinación B2B',
      'Coordinación afectada',
      'Coordinación Negocios',
      'Cierre académico',
      'Planilla de notas',
    ]) {
      expect(html).toContain(text)
    }
  })
})

describe('ProblemDetail · notas del reporte', () => {
  it('mientras se cargan se anuncia en una línea, sin acordeón', () => {
    const html = markup(level2({ sections: initialProblemSectionsState }))
    expect(html).toContain('data-testid="detail-notes-loading"')
    expect(html).not.toContain('data-section="notes"')
  })

  it('sin notas no aparece nada: ni acordeón vacío ni aviso', () => {
    const html = markup(
      level2({
        sections: sectionsWith({
          evidences: { status: 'ready', items: [], errorMessage: null },
        }),
      }),
    )
    expect(html).not.toContain('data-section="notes"')
    expect(html).not.toContain('detail-notes-loading')
    expect(html).not.toContain('detail-notes-error')
    expect(html).not.toContain('Notas del reporte')
  })

  it('un error no se lee como «sin notas»: avisa y ofrece reintentar', () => {
    const html = markup(
      level2({
        sections: sectionsWith({
          evidences: { status: 'error', items: [], errorMessage: 'sin red' },
        }),
      }),
    )
    expect(html).toContain('data-testid="detail-notes-error"')
    expect(html).toContain('No pudimos cargar las notas del reporte.')
    expect(html).toContain('data-testid="detail-notes-error-retry"')
    expect(html).not.toContain('data-section="notes"')
  })

  it('cada nota muestra título, contenido completo, autor y fecha; sin «NOTE»', () => {
    const html = markup(level2({ expanded: ['notes'] }))
    expect(html).toContain('Notas del reporte')
    expect(html).toContain('Notas adicionales')
    expect(html).toContain('Primera línea de la nota.\nSegunda línea de la nota.')
    expect(html).toContain('Ana Pérez')
    expect(html).toContain('dateTime="2026-08-01T12:30:00.000Z"')
    expect(html).not.toContain('NOTE')
  })

  it('una nota sin autor lo declara', () => {
    const html = markup(
      level2({
        expanded: ['notes'],
        sections: sectionsWith({
          evidences: {
            status: 'ready',
            items: [{ ...NOTE, uploadedByUserName: '' }],
            errorMessage: null,
          },
        }),
      }),
    )
    expect(html).toContain('Autor no registrado')
  })

  it('las notas son texto, no controles', () => {
    const html = markup(level2({ expanded: ['notes'] }))
    const notes = html.slice(html.indexOf('data-testid="detail-notes"'))
    const list = notes.slice(0, notes.indexOf('</ul>'))
    expect(list).not.toContain('<button')
    expect(list).not.toContain('<a ')
  })
})

describe('ProblemDetail · otras evidencias', () => {
  it('solo aparecen si hay evidencias que no son notas, con tipo traducido', () => {
    expect(markup()).not.toContain('Otras evidencias')

    const html = markup(
      level2({
        expanded: ['other-evidences'],
        sections: sectionsWith({
          evidences: { status: 'ready', items: [IMAGE], errorMessage: null },
        }),
      }),
    )
    expect(html).toContain('Otras evidencias')
    expect(html).toContain('Imagen')
    expect(html).toContain('rack.png')
    expect(html).not.toContain('IMAGE')
    // Sin soporte real de archivos: ni enlaces, ni descargas, ni previsualización.
    // (La única imagen del detalle es el logo de la coordinación, fuera de la
    // lista de evidencias.)
    const evidences = html.slice(html.indexOf('data-testid="detail-other-evidences"'))
    const list = evidences.slice(0, evidences.indexOf('</ul>'))
    expect(html).not.toContain('<a ')
    expect(list).not.toContain('<img')
    expect(html).not.toContain('Descargar')
    expect(html).not.toContain('data-section="notes"')
  })
})

describe('ProblemDetail · cronología', () => {
  it('etiquetas legibles, autor o «Sistema», y sin códigos técnicos', () => {
    const html = markup(
      level2({
        expanded: ['timeline'],
        sections: sectionsWith({
          evidences: { status: 'ready', items: [], errorMessage: null },
          timeline: { status: 'ready', items: TIMELINE, errorMessage: null },
        }),
      }),
    )
    expect(html).toContain('Problema registrado')
    expect(html).toContain('Plazo operativo vencido')
    expect(html).toContain('Sistema')
    expect(html).toContain('Fecha límite:')
    // Evento desconocido: neutro, con su texto, fecha inválida controlada.
    expect(html).toContain('Actividad registrada')
    expect(html).toContain('Actividad de un tipo aún no catalogado.')
    expect(html).toContain('Fecha no disponible')
    for (const code of ['SITUATION_CREATED', 'SLA_BREACHED', 'SOMETHING_NEW', 'nested']) {
      expect(html).not.toContain(code)
    }
  })

  it('el error de la cronología se queda dentro y permite reintentar', () => {
    const html = markup(
      level2({
        expanded: ['timeline'],
        sections: sectionsWith({
          evidences: { status: 'ready', items: [], errorMessage: null },
          timeline: { status: 'error', items: [], errorMessage: 'boom' },
        }),
      }),
    )
    expect(html).toContain('data-testid="detail-section-error"')
    expect(html).toContain('data-testid="detail-section-error-retry"')
    expect(html).toContain('data-testid="detail-description"')
    expect(html).not.toContain('data-testid="detail-error"')
  })
})

describe('ProblemDetail · carga y error del detalle', () => {
  it('en carga muestra esqueleto y ya el título disponible', () => {
    const html = markup(level2({ status: 'loading', detail: null }))
    expect(html).toContain('data-testid="detail-loading"')
    expect(html).toContain('Detalle del problema')
    expect(html).not.toContain('detail-notes-loading')
  })

  it('en error la región mantiene su aviso', () => {
    const html = markup(
      level2({ status: 'error', detail: null, errorMessage: 'sin red' }),
    )
    expect(html).toContain('data-testid="detail-error"')
    expect(html).not.toContain('data-testid="detail-description"')
  })
})

describe('ProblemDetail · accesibilidad y solo lectura', () => {
  it('NO es un diálogo y no ofrece cerrar', () => {
    const html = markup()
    expect(html).not.toContain('role="dialog"')
    expect(html).not.toContain('aria-modal')
    expect(html).not.toContain('detail-close')
  })

  it('tiene nombre accesible propio', () => {
    const html = markup()
    expect(html).toContain('aria-labelledby="problem-detail-title"')
    expect(html).toContain('<h3')
  })

  it('todas las secciones nacen cerradas', () => {
    const html = markup()
    expect(countOf(html, 'aria-expanded="false"')).toBe(2)
    expect(html).not.toContain('aria-expanded="true"')
  })

  it('sin errores, los únicos botones son los desplegables', () => {
    expect(countOf(markup(), '<button')).toBe(2)
  })

  it('no hay acciones mutables ni de IA, ni campos de entrada', () => {
    const html = markup(level2({ expanded: ALL_SECTIONS }))
    for (const forbidden of [
      'Reanalizar',
      'Analizar',
      'Generar',
      'Editar',
      'Guardar',
      'Eliminar',
      'Subir',
      '<form',
      '<input',
      '<textarea',
      '<select',
    ]) {
      expect(html).not.toContain(forbidden)
    }
  })
})

describe('ProblemDetail · expediente', () => {
  const withBack = (state: OperationalCardsLevel2State = level2()) =>
    renderToStaticMarkup(
      <ProblemDetail
        level2={state}
        onToggleSection={() => undefined}
        onBack={() => undefined}
      />,
    )

  it('primera línea: flecha de regreso, folio y tipo, antes del título', () => {
    const html = withBack()
    const order = [
      'data-testid="detail-back"',
      'data-testid="detail-folio"',
      'data-testid="detail-report-kind"',
      'id="problem-detail-title"',
    ].map((needle) => html.indexOf(needle))
    expect(order.every((index) => index >= 0)).toBe(true)
    expect(order).toEqual([...order].sort((left, right) => left - right))
  })

  it('la flecha no lleva texto visible pero sí nombre accesible', () => {
    const html = withBack()
    const back = html.slice(html.indexOf('<button'), html.indexOf('</button>'))
    expect(back).toContain('aria-label="Volver a problemas"')
    expect(back).toContain('<svg')
    expect(back).not.toMatch(/>\s*Volver\s*</)
  })

  it('sin `onBack` no hay flecha', () => {
    expect(markup()).not.toContain('data-testid="detail-back"')
  })

  it('la flecha sigue disponible mientras carga o si el detalle falla', () => {
    expect(withBack(level2({ status: 'loading', detail: null }))).toContain(
      'data-testid="detail-back"',
    )
    expect(withBack(level2({ status: 'error', detail: null }))).toContain(
      'data-testid="detail-back"',
    )
  })

  it('distintivo de tipo: INTERNO o DEPENDENCIA', () => {
    expect(markup()).toMatch(/data-dossier-type="internal"[^>]*>Interno</)
    expect(markup(level2({ detail: INTER_DETAIL }))).toMatch(
      /data-dossier-type="dependency"[^>]*>Dependencia</,
    )
  })

  it('IN_PROGRESS se presenta como «En revisión» sin cambiar el valor', () => {
    const html = markup(
      level2({ detail: { ...DETAIL, status: 'IN_PROGRESS' } }),
    )
    expect(html).toContain('data-status="IN_PROGRESS"')
    expect(html).toContain('>En revisión<')
    expect(html).not.toContain('En atención')
  })

  it('CLOSED se presenta como «Cerrado»', () => {
    const html = markup(level2({ detail: { ...DETAIL, status: 'CLOSED' } }))
    expect(html).toContain('>Cerrado<')
  })

  it('interno: «Coordinación responsable» con su nombre completo, nunca solo «Coordinación»', () => {
    const html = markup()
    expect(html).toContain('<dt>Coordinación responsable</dt>')
    expect(html).toContain('Coordinador Ingenierías')
    expect(html).not.toContain('<dt>Coordinación</dt>')
  })

  it('dependencia: la afectada nunca se presenta como responsable', () => {
    const html = markup(level2({ detail: INTER_DETAIL }))
    const responsible = html.slice(html.indexOf('data-context="responsible"'))
    const affected = html.slice(html.indexOf('data-context="affected"'))
    expect(responsible.slice(0, responsible.indexOf('</div>'))).toContain(
      'Coordinación B2B',
    )
    expect(affected.slice(0, affected.indexOf('</div>'))).toContain(
      'Coordinación Negocios',
    )
    expect(responsible.slice(0, responsible.indexOf('</div>'))).not.toContain(
      'Coordinación Negocios',
    )
  })

  it('la descripción conserva sus saltos de línea', () => {
    const html = markup(
      level2({ detail: { ...DETAIL, description: 'Línea uno.\nLínea dos.' } }),
    )
    expect(html).toContain('Línea uno.\nLínea dos.')
    expect(html).toContain('>Descripción</h4>')
  })
})
