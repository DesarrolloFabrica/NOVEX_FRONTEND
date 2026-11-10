import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ProblemActions } from '@/modules/operational-cards/components/ProblemActions'
import type { ProblemDetail } from '@/modules/operational-cards/types/problem-detail.types'
import type { OperationalSubmissionState } from '@/modules/operational-cards/types/operational-cards.state'

const idleSubmission: OperationalSubmissionState = {
  kind: null,
  status: 'idle',
  targetKey: null,
  errorMessage: null,
  confirmedButStale: false,
}

function detail(over: Partial<ProblemDetail> = {}): ProblemDetail {
  return {
    id: 'p1',
    title: 'Caída del portal',
    severity: 'HIGH',
    reportedSeverity: 'HIGH',
    severityHistory: [],
    consequences: [],
    canAddConsequence: false,
    status: 'OPEN',
    slaHealth: null,
    dueAt: null,
    description: 'Resumen',
    createdAt: '2026-09-01T10:00:00.000Z',
    coordinationCode: 'coord-b2b',
    coordinationName: 'B2B',
    affectedCoordinationCode: null,
    affectedCoordinationName: null,
    reportKind: 'INTERNAL',
    affectedProcess: null,
    pendingDelivery: null,
    createdByUserName: 'Autor',
    canResolve: true,
    canAdvanceToInProgress: true,
    canUpdate: true,
    coordinationId: null,
    affectedCoordinationId: null,
    canCancel: false,
    canTransfer: false,
    cancellation: null,
    resolution: null,
    ...over,
  }
}

function markup(input: {
  detail: ProblemDetail
  submission?: OperationalSubmissionState
  onAdvance?: () => void
  allowLifecycleActions?: boolean
}) {
  return renderToStaticMarkup(
    <ProblemActions
      detail={input.detail}
      learningDraft=""
      submission={input.submission ?? idleSubmission}
      onLearningChange={() => undefined}
      onResolve={() => undefined}
      onAdvanceToInProgress={input.onAdvance ?? (() => undefined)}
      allowLifecycleActions={input.allowLifecycleActions}
    />,
  )
}

describe('ProblemActions · Pasar a En atención', () => {
  it('muestra la acción en OPEN cuando canAdvanceToInProgress es true', () => {
    const html = markup({ detail: detail() })
    expect(html).toContain('data-testid="status-advance-button"')
    expect(html).toContain('Pasar a En atención')
    expect(html).toContain('data-can-advance="true"')
  })

  it('separa seguimiento y cierre con encabezados propios', () => {
    const html = markup({ detail: detail() })
    expect(html).toContain('Seguimiento del problema')
    expect(html).toContain('Cerrar con aprendizaje')
    expect(html).toContain('Aprendizaje del cierre')
    expect(html).toContain('data-testid="actions-status"')
    expect(html).toContain('>Abierto<')
    expect(html).toContain('data-surface="problem-tracking"')
    expect(html).toContain('data-surface="problem-resolution"')
    const trackingIdx = html.indexOf('Seguimiento del problema')
    const resolutionIdx = html.indexOf('Cerrar con aprendizaje')
    expect(trackingIdx).toBeGreaterThan(-1)
    expect(resolutionIdx).toBeGreaterThan(trackingIdx)
  })

  it('en IN_PROGRESS muestra seguimiento sin botón de avance', () => {
    const html = markup({
      detail: detail({ status: 'IN_PROGRESS', canUpdate: true }),
    })
    expect(html).toContain('Seguimiento del problema')
    expect(html).toContain('>En atención<')
    expect(html).not.toContain('data-testid="status-advance-button"')
    expect(html).toContain('Cerrar con aprendizaje')
    expect(html).toContain('data-testid="resolve-form"')
  })

  it('en solo lectura muestra estado sin controles de escritura', () => {
    const html = markup({
      detail: detail({
        canUpdate: false,
        canAdvanceToInProgress: false,
        canResolve: false,
      }),
    })
    expect(html).toContain('Seguimiento del problema')
    expect(html).toContain('>Abierto<')
    expect(html).not.toContain('data-testid="status-advance-button"')
    expect(html).not.toContain('Cerrar con aprendizaje')
    expect(html).not.toContain('data-testid="resolve-form"')
    expect(html).toContain('data-testid="resolve-not-allowed"')
  })

  it('en shell de consulta oculta avance y cierre aunque el DTO los conceda', () => {
    const html = markup({
      detail: detail(),
      allowLifecycleActions: false,
    })
    expect(html).toContain('data-allow-lifecycle="false"')
    expect(html).not.toContain('data-testid="status-advance-button"')
    expect(html).not.toContain('data-testid="resolve-form"')
    expect(html).not.toContain('data-testid="resolve-not-allowed"')
  })

  it('oculta la acción si canAdvanceToInProgress es false (p. ej. ADMIN/DIRECTOR)', () => {
    const html = markup({
      detail: detail({
        canUpdate: false,
        canAdvanceToInProgress: false,
        canResolve: false,
      }),
    })
    expect(html).not.toContain('data-testid="status-advance-button"')
    expect(html).toContain('data-can-advance="false"')
  })

  it('oculta avance si el ANALISTA es autor pero no puede avanzar (General solo afectada)', () => {
    const html = markup({
      detail: detail({
        reportKind: 'INTER_COORDINATION',
        canUpdate: true,
        canAdvanceToInProgress: false,
        canResolve: false,
      }),
    })
    expect(html).not.toContain('data-testid="status-advance-button"')
    expect(html).toContain('data-can-advance="false"')
    expect(html).toContain('data-can-update="true"')
  })

  it('oculta la acción cuando ya está En atención', () => {
    const html = markup({
      detail: detail({
        status: 'IN_PROGRESS',
        canUpdate: true,
        canAdvanceToInProgress: false,
      }),
    })
    expect(html).not.toContain('data-testid="status-advance-button"')
    expect(html).toContain('data-testid="resolve-form"')
  })

  it('conserva Resolver en OPEN si canResolve (sin obligar el paso intermedio)', () => {
    const html = markup({ detail: detail() })
    expect(html).toContain('data-testid="status-advance-button"')
    expect(html).toContain('data-testid="resolve-form"')
  })

  it('oculta el formulario de cierre cuando canResolve es false (p. ej. ANALISTA sin General responsable)', () => {
    const html = markup({
      detail: detail({
        reportKind: 'INTER_COORDINATION',
        canResolve: false,
        canUpdate: true,
        canAdvanceToInProgress: true,
      }),
    })
    expect(html).not.toContain('data-testid="resolve-form"')
    expect(html).not.toContain('Cerrar con aprendizaje')
    expect(html).toContain('data-testid="resolve-not-allowed"')
    expect(html).toContain('data-can-resolve="false"')
    // canAdvanceToInProgress sigue pudiendo mostrar avance; no se confunde con canResolve
    expect(html).toContain('data-testid="status-advance-button"')
  })

  it('muestra cierre para INTERNAL de General cuando canResolve es true', () => {
    const html = markup({
      detail: detail({
        coordinationCode: 'coord-general',
        coordinationName: 'Coordinación General',
        canResolve: true,
      }),
    })
    expect(html).toContain('data-testid="resolve-form"')
    expect(html).toContain('data-can-resolve="true"')
  })

  it('muestra error de avance sin cambiar el marcado de estado del detalle', () => {
    const html = markup({
      detail: detail({ status: 'OPEN' }),
      submission: {
        kind: 'status-advance',
        status: 'error',
        targetKey: 'p1',
        errorMessage: 'No autorizado.',
        confirmedButStale: false,
      },
    })
    expect(html).toContain('data-testid="status-advance-error"')
    expect(html).toContain('No autorizado.')
    expect(html).toContain('data-status="OPEN"')
    expect(html).toContain('Pasar a En atención')
  })

  it('deshabilita el botón mientras envía', () => {
    const html = markup({
      detail: detail(),
      submission: {
        kind: 'status-advance',
        status: 'sending',
        targetKey: 'p1',
        errorMessage: null,
        confirmedButStale: false,
      },
    })
    expect(html).toContain('data-testid="status-advance-sending"')
    expect(html).toContain('Actualizando…')
    expect(html).toMatch(/disabled(?:=|)/)
  })

  it('muestra avance también en dependencia INTER autorizada', () => {
    const html = markup({
      detail: detail({
        reportKind: 'INTER_COORDINATION',
        affectedCoordinationCode: 'coord-negocios',
        affectedCoordinationName: 'Negocios',
        canUpdate: true,
        canResolve: true,
      }),
    })
    expect(html).toContain('data-testid="status-advance-button"')
    expect(html).toContain('data-report-kind="INTER_COORDINATION"')
  })

  it('expone aria-label accesible en el botón de avance', () => {
    const html = markup({ detail: detail() })
    expect(html).toContain('aria-label="Pasar a En atención"')
  })

  it('acepta un handler de avance (render sin crash)', () => {
    const onAdvance = vi.fn()
    const html = markup({ detail: detail(), onAdvance })
    expect(html).toContain('status-advance-button')
    expect(onAdvance).not.toHaveBeenCalled()
  })

  it('no incluye botones de creación de reportes en el expediente', () => {
    const html = markup({ detail: detail() })
    expect(html).not.toContain('data-testid="report-situation-button"')
    expect(html).not.toContain('data-testid="report-internal-button"')
    expect(html).not.toContain('data-testid="report-dependency-button"')
    expect(html).not.toContain('Registrar situación')
  })
})

describe('ProblemActions · administración (Fase 02B)', () => {
  it('expone pistas y monta los botones de anulación y traslado cuando ambas están permitidas', () => {
    const html = renderToStaticMarkup(
      <ProblemActions
        detail={detail({ canCancel: true, canTransfer: true })}
        learningDraft=""
        submission={idleSubmission}
        onLearningChange={() => undefined}
        onResolve={() => undefined}
        onAdvanceToInProgress={() => undefined}
        allowLifecycleActions={false}
        administration={{
          allow: true,
          onCancel: () => undefined,
          onTransfer: () => undefined,
        }}
      />,
    )
    expect(html).toContain('data-can-cancel="true"')
    expect(html).toContain('data-can-transfer="true"')
    expect(html).toContain('data-testid="situation-admin-actions"')
    expect(html).toContain('Gestión administrativa')
    expect(html).toContain('data-testid="cancel-situation-button"')
    expect(html).toContain('Anular situación')
    expect(html).toContain('data-testid="transfer-coordination-button"')
    expect(html).toContain('Trasladar coordinación')
  })

  it('ofrece únicamente anulación cuando canTransfer es false', () => {
    const html = renderToStaticMarkup(
      <ProblemActions
        detail={detail({ canCancel: true, canTransfer: false })}
        learningDraft=""
        submission={idleSubmission}
        onLearningChange={() => undefined}
        onResolve={() => undefined}
        onAdvanceToInProgress={() => undefined}
        allowLifecycleActions={false}
        administration={{
          allow: true,
          onCancel: () => undefined,
          onTransfer: () => undefined,
        }}
      />,
    )
    expect(html).toContain('data-testid="cancel-situation-button"')
    expect(html).not.toContain('data-testid="transfer-coordination-button"')
  })

  it('ofrece únicamente traslado cuando canCancel es false', () => {
    const html = renderToStaticMarkup(
      <ProblemActions
        detail={detail({ canCancel: false, canTransfer: true })}
        learningDraft=""
        submission={idleSubmission}
        onLearningChange={() => undefined}
        onResolve={() => undefined}
        onAdvanceToInProgress={() => undefined}
        allowLifecycleActions={false}
        administration={{
          allow: true,
          onCancel: () => undefined,
          onTransfer: () => undefined,
        }}
      />,
    )
    expect(html).not.toContain('data-testid="cancel-situation-button"')
    expect(html).toContain('data-testid="transfer-coordination-button"')
  })

  it('no monta el host admin sin pistas del backend', () => {
    const html = renderToStaticMarkup(
      <ProblemActions
        detail={detail({ canCancel: false, canTransfer: false })}
        learningDraft=""
        submission={idleSubmission}
        onLearningChange={() => undefined}
        onResolve={() => undefined}
        onAdvanceToInProgress={() => undefined}
        allowLifecycleActions={false}
        administration={{
          allow: true,
          onCancel: () => undefined,
          onTransfer: () => undefined,
        }}
      />,
    )
    expect(html).toContain('data-can-cancel="false"')
    expect(html).not.toContain('data-testid="situation-admin-actions"')
  })

  it('muestra error de anulación reutilizando submission y botón de refresco si hay onRetryDetail', () => {
    const html = renderToStaticMarkup(
      <ProblemActions
        detail={detail({ canCancel: true })}
        learningDraft=""
        submission={{
          kind: 'cancellation',
          status: 'error',
          targetKey: 'p1',
          errorMessage: 'No tiene permiso para esta acción administrativa.',
          confirmedButStale: false,
        }}
        onLearningChange={() => undefined}
        onResolve={() => undefined}
        onAdvanceToInProgress={() => undefined}
        allowLifecycleActions={false}
        administration={{
          allow: true,
          onCancel: () => undefined,
          onTransfer: () => undefined,
        }}
        onRetryDetail={() => undefined}
      />,
    )
    expect(html).toContain('data-testid="cancellation-error"')
    expect(html).toContain('No tiene permiso para esta acción administrativa.')
    expect(html).toContain('Refrescar situación')
  })

  it('muestra estado CANCELLED con distintivo de acción excepcional', () => {
    const html = renderToStaticMarkup(
      <ProblemActions
        detail={detail({
          status: 'CANCELLED',
          cancellation: {
            reason: 'Duplicado con FOL-102',
            previousStatus: 'OPEN',
            cancelledByUserName: 'Administrador General',
            cancelledAt: '2026-10-01T12:00:00Z',
          },
        })}
        learningDraft=""
        submission={idleSubmission}
        onLearningChange={() => undefined}
        onResolve={() => undefined}
        onAdvanceToInProgress={() => undefined}
        allowLifecycleActions={false}
        administration={{
          allow: true,
          onCancel: () => undefined,
          onTransfer: () => undefined,
        }}
      />,
    )
    expect(html).toContain('data-cancelled="true"')
    expect(html).toContain('data-testid="cancellation-badge"')
    expect(html).toContain('Situación anulada')
    expect(html).toContain('Acción administrativa excepcional')
    expect(html).toContain('data-testid="cancellation-record"')
    expect(html).toContain('Anulado por Administrador General: Duplicado con FOL-102')
  })
})

