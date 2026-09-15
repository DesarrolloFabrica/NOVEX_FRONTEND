import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProblemDetail } from '@/modules/operational-cards/components/ProblemDetail'
import { initialProblemSectionsState } from '@/modules/operational-cards/types/problem-detail.types'
import type { OperationalCardsLevel2State } from '@/modules/operational-cards/types/operational-cards.state'
import type {
  ProblemDetail as ProblemDetailData,
  ProblemSectionId,
} from '@/modules/operational-cards/types/problem-detail.types'

/**
 * Render de servidor, como el resto de componentes del módulo: no hay jsdom ni
 * testing-library en el proyecto. Comprueba marcado, accesibilidad y ausencia
 * de acciones mutables; no verifica CSS ni animación.
 */

const DETAIL: ProblemDetailData = {
  id: 'p1',
  title: 'Aulas sin conectividad',
  severity: 'CRITICAL',
  status: 'OPEN',
  slaHealth: 'overdue',
  dueAt: '2026-08-10T10:00:00.000Z',
  summary: 'La sede norte perdió conectividad en seis aulas.',
  coordinationName: 'Coordinador Ingenierías',
  createdAt: '2026-08-01T10:00:00.000Z',
  impact: {
    summary: 'Afecta la operación docente de dos áreas.',
    areas: [
      {
        coordinationCode: 'coord-transversales',
        impactLevel: 'HIGH',
        description: 'Clases compartidas sin red.',
      },
    ],
    propagationDepth: 2,
  },
  intelligence: {
    headline: 'Riesgo concentrado en la sede norte',
    summary: 'La indisponibilidad afecta la continuidad docente.',
    keyPoints: ['Seis aulas sin red', 'Sin fecha de restablecimiento'],
    rootCause: 'Falla del enlace principal.',
    risks: [{ title: 'Incumplimiento de SLA', severity: 'HIGH' }],
  },
}

function level2(
  overrides: Partial<OperationalCardsLevel2State> = {},
): OperationalCardsLevel2State {
  return {
    status: 'ready',
    problemId: 'p1',
    detail: DETAIL,
    errorMessage: null,
    sections: initialProblemSectionsState,
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

const SECTIONS: ProblemSectionId[] = [
  'impact',
  'ai',
  'recommendations',
  'evidences',
  'timeline',
]

describe('ProblemDetail · estructura', () => {
  it('muestra título, severidad, estado y SLA como texto', () => {
    const html = markup()
    expect(html).toContain('Aulas sin conectividad')
    expect(html).toContain('>Crítica<')
    expect(html).toContain('>Registrada<')
    expect(html).toContain('SLA vencido')
  })

  it('muestra el resumen real recibido', () => {
    expect(markup()).toContain(
      'La sede norte perdió conectividad en seis aulas.',
    )
  })

  it('presenta las cinco secciones en el orden congelado', () => {
    const html = markup()
    const order = SECTIONS.map((section) =>
      html.indexOf(`data-section="${section}"`),
    )
    expect(order.every((index) => index >= 0)).toBe(true)
    expect(order).toEqual([...order].sort((left, right) => left - right))
    expect(countOf(html, 'data-testid="detail-section-toggle"')).toBe(5)
  })

  it('todas las secciones nacen cerradas', () => {
    const html = markup()
    expect(countOf(html, 'aria-expanded="false"')).toBe(5)
    expect(html).not.toContain('aria-expanded="true"')
    expect(html).not.toContain('data-testid="detail-section-panel"')
  })

  it('la coordinación aparece como contexto secundario', () => {
    const html = markup()
    expect(html).toContain('problem-detail__context')
    expect(html).toContain('Coordinador Ingenierías')
  })
})

describe('ProblemDetail · secciones desplegadas', () => {
  it('Impacto muestra áreas afectadas y propagación, sin pedir nada', () => {
    const html = markup(level2({ expanded: ['impact'] }))
    expect(html).toContain('data-testid="detail-impact-areas"')
    expect(html).toContain('coord-transversales')
    expect(html).toContain('Propagación hasta 2 nivel')
  })

  it('Inteligencia IA muestra el análisis ya cargado', () => {
    const html = markup(level2({ expanded: ['ai'] }))
    expect(html).toContain('data-testid="detail-ai"')
    expect(html).toContain('Riesgo concentrado en la sede norte')
    expect(html).toContain('Falla del enlace principal.')
  })

  it('sin análisis, IA declara la ausencia y no finge un resumen', () => {
    const html = markup(
      level2({
        detail: { ...DETAIL, intelligence: null, impact: null },
        expanded: ['ai', 'impact'],
      }),
    )
    expect(html).toContain('data-testid="detail-ai-absent"')
    expect(html).toContain('Sin evaluación de impacto registrada.')
  })

  it('una sección perezosa en carga muestra su propio estado', () => {
    const html = markup(
      level2({
        expanded: ['evidences'],
        sections: {
          ...initialProblemSectionsState,
          evidences: { status: 'loading', items: [], errorMessage: null },
        },
      }),
    )
    expect(html).toContain('data-testid="detail-section-loading"')
  })

  it('el error de una sección no reemplaza la región', () => {
    const html = markup(
      level2({
        expanded: ['evidences'],
        sections: {
          ...initialProblemSectionsState,
          evidences: { status: 'error', items: [], errorMessage: 'boom' },
        },
      }),
    )
    expect(html).toContain('data-testid="detail-section-error"')
    // La isla sigue mostrando su cabecera y su resumen.
    expect(html).toContain('Aulas sin conectividad')
    expect(html).toContain('data-testid="detail-summary"')
    expect(html).not.toContain('data-testid="detail-error"')
  })
})

describe('ProblemDetail · carga y error', () => {
  it('en carga muestra esqueleto y ya el título disponible', () => {
    const html = markup(level2({ status: 'loading', detail: null }))
    expect(html).toContain('data-testid="detail-loading"')
    expect(html).toContain('Detalle del problema')
  })

  it('en error la región mantiene su aviso, sin botón de cerrar', () => {
    const html = markup(
      level2({ status: 'error', detail: null, errorMessage: 'sin red' }),
    )
    expect(html).toContain('data-testid="detail-error"')
    expect(html).not.toContain('data-testid="detail-summary"')
  })
})

describe('ProblemDetail · accesibilidad', () => {
  it('NO es un diálogo: es una región permanente', () => {
    // El contrato invertido de F3. Mientras el detalle era una capa flotante
    // tenía sentido que fuera `dialog` con `aria-modal`, porque tapaba la
    // escena y atrapaba la atención. Una región que siempre está ahí no puede
    // anunciarse como modal: sería mentirle a un lector de pantalla.
    const html = markup()

    expect(html).not.toContain('role="dialog"')
    expect(html).not.toContain('aria-modal')
    expect(html).not.toContain('__veil')
    expect(html).not.toContain('__layer')
  })

  it('no ofrece cerrar: no hay nada que cerrar', () => {
    // Se cambia de problema eligiendo otro, o de coordinación. Un botón de
    // cerrar dejaría la región vacía sin que el usuario haya avanzado a nada.
    const html = markup()

    expect(html).not.toContain('detail-close')
    expect(html).not.toContain('Cerrar el detalle del problema')
  })

  it('tiene nombre accesible propio', () => {
    const html = markup()

    expect(html).toContain('aria-labelledby="problem-detail-title"')
    expect(html).toContain('id="problem-detail-title"')
    // h3 y no h2: el encabezado de la región lo pone el shell.
    expect(html).toContain('<h3')
  })

  it('cada sección enlaza su botón con su panel', () => {
    const html = markup(level2({ expanded: ['impact'] }))
    expect(html).toContain('aria-controls="problem-section-panel-impact"')
    expect(html).toContain('id="problem-section-panel-impact"')
    expect(html).toContain('aria-labelledby="problem-section-toggle-impact"')
  })
})

describe('ProblemDetail · solo lectura', () => {
  it('no renderiza ninguna acción mutable', () => {
    const html = markup(
      level2({ expanded: ['impact', 'ai', 'recommendations', 'evidences', 'timeline'] }),
    )

    for (const forbidden of [
      'Reanalizar',
      'Analizar',
      'Editar',
      'Guardar',
      'Eliminar',
      'Cerrar situación',
      'Cambiar estado',
      'Simular',
      'Completar',
      'Aceptar',
      'Rechazar',
      'Subir',
    ]) {
      expect(html).not.toContain(forbidden)
    }
  })

  it('los únicos botones son los cinco desplegables', () => {
    // Cinco, no siete: el botón de cerrar y el velo se fueron con la isla.
    const html = markup()
    expect(countOf(html, '<button')).toBe(5)
  })

  it('no contiene formularios ni campos de entrada', () => {
    const html = markup(level2({ expanded: SECTIONS }))
    expect(html).not.toContain('<form')
    expect(html).not.toContain('<input')
    expect(html).not.toContain('<textarea')
    expect(html).not.toContain('<select')
  })
})
