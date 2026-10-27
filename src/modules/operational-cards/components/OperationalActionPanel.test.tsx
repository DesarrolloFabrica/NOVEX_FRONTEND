import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { OperationalActionPanel } from '@/modules/operational-cards/components/OperationalActionPanel'
import type { OperationalActionPanelProps } from '@/modules/operational-cards/components/OperationalActionPanel'
import { initialProblemSectionsState } from '@/modules/operational-cards/types/problem-detail.types'
import type { OperationalCardsLevel2State } from '@/modules/operational-cards/types/operational-cards.state'
import type { ProblemDetail } from '@/modules/operational-cards/types/problem-detail.types'
import { defaultHistoryPeriod } from '@/modules/operational-cards/data/problemHistoryPeriod'

const idleSubmission = {
  kind: null,
  status: 'idle' as const,
  targetKey: null,
  errorMessage: null,
  confirmedButStale: false,
}

const DETAIL: ProblemDetail = {
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
  coordinationCode: 'coord-general',
  coordinationName: 'Coordinación General',
  affectedCoordinationCode: null,
  affectedCoordinationName: null,
  reportKind: 'INTERNAL',
  affectedProcess: null,
  pendingDelivery: null,
  createdByUserName: 'Autor',
  canResolve: true,
  canAdvanceToInProgress: true,
  canUpdate: true,
  resolution: null,
}

function level2Ready(): OperationalCardsLevel2State {
  return {
    status: 'ready',
    problemId: 'p1',
    detail: DETAIL,
    errorMessage: null,
    sections: initialProblemSectionsState,
    expanded: ['timeline'],
  }
}

function props(
  over: Partial<OperationalActionPanelProps> = {},
): OperationalActionPanelProps {
  return {
    mode: 'idle',
    reportFormKind: null,
    hasCoordination: true,
    selectedCoordinationCode: 'coord-general',
    level2: {
      status: 'idle',
      problemId: null,
      detail: null,
      errorMessage: null,
      sections: initialProblemSectionsState,
      expanded: [],
    },
    submission: idleSubmission,
    learningDraft: '',
    history: {
      status: 'idle',
      items: [],
      total: 0,
      page: 0,
      loadingMore: false,
      errorMessage: null,
      period: defaultHistoryPeriod(),
      coordinationId: null,
      scope: 'complete',
    },
    onToggleSection: vi.fn(),
    onRetrySection: vi.fn(),
    onLearningChange: vi.fn(),
    onResolve: vi.fn(),
    onAdvanceToInProgress: vi.fn(),
    onReportInternal: vi.fn(),
    onReportDependency: vi.fn(),
    onCancelReport: vi.fn(),
    onCloseDetail: vi.fn(),
    onRetryDetail: vi.fn(),
    onOpenHistory: vi.fn(),
    onCloseHistory: vi.fn(),
    onHistoryPeriodChange: vi.fn(),
    onSelectHistoryProblem: vi.fn(),
    onLoadMoreHistory: vi.fn(),
    onRetryHistory: vi.fn(),
    reportForm: {
      reportKind: 'INTERNAL',
      affectedLabel: 'Coordinación General',
      categories: [],
      categoriesError: null,
      responsibleOptions: [],
      draft: {
        title: '',
        description: '',
        categoryId: '',
        severity: 'MEDIUM',
        occurredAt: '',
        responsibleCoordinationId: '',
        initialConsequence: '',
        affectedProcess: '',
        pendingDelivery: '',
      },
      submission: idleSubmission,
      maxOccurredAt: '2026-09-29T12:00',
      onDraftChange: vi.fn(),
      onSubmit: vi.fn(),
    },
    ...over,
  }
}

function markup(over: Partial<OperationalActionPanelProps> = {}) {
  return renderToStaticMarkup(<OperationalActionPanel {...props(over)} />)
}

describe('OperationalActionPanel · composición por modo', () => {
  it('idle con canCreate muestra título arriba y accesos compactos debajo', () => {
    const html = markup({ mode: 'idle', canCreate: true, canViewHistory: true })
    expect(html).toContain('data-mode="idle"')
    expect(html).toContain('data-can-create="true"')
    expect(html).toContain('data-testid="report-cta-group"')
    expect(html).toContain('data-testid="report-internal-button"')
    expect(html).toContain('data-testid="report-dependency-button"')
    expect(html).toContain('data-testid="history-open-button"')
    expect(html).toContain('Reportar o consultar')
    const headingIdx = html.indexOf('action-panel__idle-heading')
    const ctaIdx = html.indexOf('report-cta-group')
    expect(headingIdx).toBeGreaterThan(-1)
    expect(ctaIdx).toBeGreaterThan(headingIdx)
  })

  it('idle de solo lectura presenta consulta deliberada al historial', () => {
    const html = markup({
      mode: 'idle',
      canCreate: false,
      canViewHistory: true,
    })
    expect(html).toContain('data-can-create="false"')
    expect(html).toContain('data-consult-only="true"')
    expect(html).toContain('data-testid="history-open-button"')
    expect(html).toContain('data-testid="consult-idle-copy"')
    expect(html).not.toContain('data-testid="report-internal-button"')
  })

  it('detalle muestra expediente y acciones, sin botones de creación ni historial', () => {
    const html = markup({
      mode: 'detail',
      canCreate: true,
      canViewHistory: true,
      level2: level2Ready(),
    })
    expect(html).toContain('data-mode="detail"')
    expect(html).toContain('data-testid="problem-detail"')
    expect(html).toContain('data-testid="problem-actions"')
    expect(html).toContain('data-testid="detail-back"')
    expect(html).not.toContain('data-testid="report-internal-button"')
    expect(html).not.toContain('data-testid="history-open-button"')
  })

  it('modo history muestra lista y no CTAs de idle', () => {
    const html = markup({
      mode: 'history',
      canCreate: true,
      canViewHistory: true,
      history: {
        status: 'ready',
        items: [],
        total: 0,
        page: 1,
        loadingMore: false,
        errorMessage: null,
        period: defaultHistoryPeriod(),
        coordinationId: 'uuid',
        scope: 'complete',
      },
    })
    expect(html).toContain('data-mode="history"')
    expect(html).toContain('data-testid="problem-history"')
    expect(html).toContain('data-testid="history-back"')
    expect(html).not.toContain('data-testid="report-internal-button"')
  })

  it('modo report sin canCreate no pinta el formulario', () => {
    const html = markup({
      mode: 'report',
      reportFormKind: 'INTERNAL',
      canCreate: false,
      canViewHistory: true,
    })
    expect(html).toContain('data-mode="idle"')
    expect(html).not.toContain('data-testid="report-form"')
    expect(html).not.toContain('data-testid="report-internal-button"')
  })

  it('modo report no muestra CTAs de idle', () => {
    const html = markup({
      mode: 'report',
      reportFormKind: 'INTERNAL',
      canCreate: true,
      canViewHistory: true,
    })
    expect(html).toContain('data-mode="report"')
    expect(html).toContain('data-testid="report-form"')
    expect(html).not.toContain('data-testid="report-cta-group"')
    expect(html).not.toContain('data-testid="history-open-button"')
  })
})
