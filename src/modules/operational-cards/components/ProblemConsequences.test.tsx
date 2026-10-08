import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProblemDetail } from '@/modules/operational-cards/components/ProblemDetail'
import { ProblemSeverityTrail } from '@/modules/operational-cards/components/ProblemSeverityTrail'
import { initialProblemSectionsState } from '@/modules/operational-cards/types/problem-detail.types'
import type {
  OperationalCardsLevel2State,
  OperationalSubmissionState,
} from '@/modules/operational-cards/types/operational-cards.state'
import type {
  ProblemConsequence,
  ProblemDetail as ProblemDetailData,
} from '@/modules/operational-cards/types/problem-detail.types'

/** Render de servidor, como el resto del módulo (sin jsdom). */

const IDLE: OperationalSubmissionState = {
  kind: null,
  status: 'idle',
  targetKey: null,
  errorMessage: null,
  confirmedButStale: false,
}

const CONSEQUENCES: ProblemConsequence[] = [
  {
    id: 'c1',
    description: 'Se retrasó la entrega de dos contenidos.',
    occurredAt: '2026-10-01T15:00:00.000Z',
    createdAt: '2026-10-01T15:25:00.000Z',
    authorName: 'Johan Daza',
    authorRole: 'Coordinador',
    severityAtOccurrence: 'MEDIUM',
  },
  {
    id: 'c2',
    description: 'No fue posible cargar archivos pesados.',
    occurredAt: '2026-10-02T20:40:00.000Z',
    // Registrada al día siguiente.
    createdAt: '2026-10-03T14:05:00.000Z',
    authorName: 'Johan Daza',
    authorRole: 'Coordinador',
    severityAtOccurrence: 'HIGH',
  },
]

function detail(over: Partial<ProblemDetailData> = {}): ProblemDetailData {
  return {
    id: 'p1',
    title: 'Intermitencia prolongada de internet',
    severity: 'CRITICAL',
    reportedSeverity: 'MEDIUM',
    severityHistory: [
      {
        id: 'h1',
        from: null,
        to: 'MEDIUM',
        source: 'REPORTED',
        effectiveAt: '2026-10-01T14:10:00.000Z',
        simulated: false,
      },
      {
        id: 'h2',
        from: 'MEDIUM',
        to: 'HIGH',
        source: 'AUTO_TIME',
        effectiveAt: '2026-10-04T14:10:00.000Z',
        simulated: true,
      },
    ],
    consequences: CONSEQUENCES,
    canAddConsequence: true,
    status: 'IN_PROGRESS',
    slaHealth: 'overdue',
    dueAt: '2026-10-08T14:10:00.000Z',
    description: 'Existe conexión pero el servicio es intermitente.',
    createdAt: '2026-10-01T14:10:00.000Z',
    coordinationCode: 'coord-fabrica-contenidos',
    coordinationName: 'Fábrica de Contenidos',
    affectedCoordinationCode: 'coord-fabrica-contenidos',
    affectedCoordinationName: 'Fábrica de Contenidos',
    reportKind: 'INTERNAL',
    affectedProcess: null,
    pendingDelivery: null,
    createdByUserName: 'Johan Daza',
    canResolve: true,
    canAdvanceToInProgress: false,
    canUpdate: true,
    resolution: null,
    ...over,
  }
}

function level2(data: ProblemDetailData): OperationalCardsLevel2State {
  return {
    problemId: data.id,
    status: 'ready',
    detail: data,
    sections: initialProblemSectionsState,
    expanded: [],
    errorMessage: null,
  } as OperationalCardsLevel2State
}

const writable = {
  submission: IDLE,
  onSubmit: () => Promise.resolve(true),
}

describe('Detalle · Afectaciones', () => {
  it('lista las afectaciones en orden, con autor, rol y severidad del momento', () => {
    const html = renderToStaticMarkup(
      <ProblemDetail
        level2={level2(detail())}
        onToggleSection={() => undefined}
        consequenceActions={writable}
      />,
    )
    expect(html).toContain('data-testid="detail-consequences"')
    expect(html).toContain('2 afectaciones')
    expect(html.indexOf('Se retrasó la entrega')).toBeLessThan(
      html.indexOf('No fue posible cargar'),
    )
    expect(html).toContain('Johan Daza / Coordinador')
    expect(html).toMatch(/data-testid="detail-consequence-severity"[^>]*>Media/)
    expect(html).toMatch(/data-testid="detail-consequence-severity"[^>]*>Alta/)
  })

  it('una afectación registrada bastante después de ocurrir lo dice («Registrada el…»)', () => {
    const html = renderToStaticMarkup(
      <ProblemDetail
        level2={level2(detail())}
        onToggleSection={() => undefined}
        consequenceActions={writable}
      />,
    )
    expect(html.match(/data-testid="detail-consequence-late"/g)).toHaveLength(1)
    expect(html).toContain('Registrada el')
  })

  it('el CTA aparece solo si el servidor lo permite y el shell escribe', () => {
    const withCta = renderToStaticMarkup(
      <ProblemDetail
        level2={level2(detail())}
        onToggleSection={() => undefined}
        consequenceActions={writable}
      />,
    )
    expect(withCta).toContain('data-testid="consequence-composer"')
    expect(withCta).toContain('Agregar afectación')

    const notAllowed = renderToStaticMarkup(
      <ProblemDetail
        level2={level2(detail({ canAddConsequence: false }))}
        onToggleSection={() => undefined}
        consequenceActions={writable}
      />,
    )
    expect(notAllowed).not.toContain('data-testid="consequence-composer"')

    // Shell de solo lectura (DIRECTOR / ADMIN): aunque el API dijera true.
    const readOnly = renderToStaticMarkup(
      <ProblemDetail
        level2={level2(detail())}
        onToggleSection={() => undefined}
      />,
    )
    expect(readOnly).not.toContain('data-testid="consequence-composer"')
    expect(readOnly).toContain('No fue posible cargar')
  })

  it('AGREGAR AFECTACIÓN es un subbloque propio DESPUÉS del historial, con título, ayuda y CTA', () => {
    const html = renderToStaticMarkup(
      <ProblemDetail
        level2={level2(detail())}
        onToggleSection={() => undefined}
        consequenceActions={writable}
      />,
    )
    const list = html.indexOf('data-testid="detail-consequences-list"')
    const composer = html.indexOf('data-testid="consequence-composer"')
    expect(list).toBeGreaterThan(-1)
    expect(composer).toBeGreaterThan(list)
    const block = html.slice(composer)
    expect(block).toMatch(/<h5[^>]*>Agregar afectación<\/h5>/)
    expect(block).toContain(
      'Registra una nueva consecuencia generada mientras el problema continúa activo.',
    )
    expect(block).toContain('data-testid="consequence-description"')
    expect(block).toContain('data-testid="consequence-occurred-at"')
    expect(block).toMatch(/data-testid="consequence-submit"[^>]*>Registrar afectación</)
    // El CTA es el de la subsección, no el de «Cerrar problema».
    expect(block).toContain('class="problem-consequences__submit"')
    expect(block).not.toContain('problem-actions__submit')
  })

  it('CERRADO: las afectaciones siguen visibles, sin CTA y con la historia congelada', () => {
    const html = renderToStaticMarkup(
      <ProblemDetail
        level2={level2(detail({ status: 'CLOSED', canAddConsequence: false }))}
        onToggleSection={() => undefined}
        consequenceActions={writable}
      />,
    )
    expect(html).toContain('Se retrasó la entrega')
    expect(html).not.toContain('data-testid="consequence-composer"')
    expect(html).toContain('Historia congelada al cierre')
  })

  it('sin afectaciones lo dice, y un INTER no muestra la sección', () => {
    const empty = renderToStaticMarkup(
      <ProblemDetail
        level2={level2(detail({ consequences: [] }))}
        onToggleSection={() => undefined}
        consequenceActions={writable}
      />,
    )
    expect(empty).toContain('Sin afectaciones registradas.')

    const inter = renderToStaticMarkup(
      <ProblemDetail
        level2={level2(detail({ reportKind: 'INTER_COORDINATION' }))}
        onToggleSection={() => undefined}
        consequenceActions={writable}
      />,
    )
    expect(inter).not.toContain('data-testid="detail-consequences"')
  })

  it('las afectaciones van después de la descripción', () => {
    const html = renderToStaticMarkup(
      <ProblemDetail
        level2={level2(detail())}
        onToggleSection={() => undefined}
      />,
    )
    expect(html.indexOf('data-testid="detail-description"')).toBeLessThan(
      html.indexOf('data-testid="detail-consequences"'),
    )
  })
})

describe('Detalle · Severidad reportada vs actual', () => {
  it('si nunca cambió, no añade nada al badge', () => {
    const html = renderToStaticMarkup(
      <ProblemSeverityTrail
        reportedSeverity="MEDIUM"
        severity="MEDIUM"
        history={[detail().severityHistory[0]]}
      />,
    )
    expect(html).toBe('')
  })

  it('si escaló, muestra «Reportado como · Actual» y el acceso al historial', () => {
    const html = renderToStaticMarkup(
      <ProblemDetail
        level2={level2(detail())}
        onToggleSection={() => undefined}
      />,
    )
    expect(html).toContain('data-testid="severity-trail"')
    expect(html).toMatch(/Reportado como.*Media.*Actual.*Crítica/s)
    expect(html).toContain('Ver historial')
    // El badge principal sigue siendo la severidad EFECTIVA.
    expect(html).toMatch(/data-testid="detail-severity"[^>]*>Crítica/)
  })
})
