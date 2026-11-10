import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { SituationEvidenceItem } from '@/modules/api/evidences.api'
import { ProblemEvidencesPanel } from '@/modules/operational-cards/components/ProblemEvidencesPanel'
import type { OperationalSubmissionState } from '@/modules/operational-cards/types/operational-cards.state'

vi.mock('@/modules/api/evidences.api', async () => {
  const actual = await vi.importActual<typeof import('@/modules/api/evidences.api')>(
    '@/modules/api/evidences.api',
  )
  return {
    ...actual,
    fetchSituationEvidences: vi.fn(),
  }
})

const idleSubmission: OperationalSubmissionState = {
  kind: null,
  status: 'idle',
  targetKey: null,
  errorMessage: null,
  confirmedButStale: false,
}

const NOTE: SituationEvidenceItem = {
  id: 'ev-1',
  situationId: 's1',
  uploadedByUserId: 'u1',
  uploadedByUserName: 'Ana Pérez',
  type: 'NOTE',
  title: 'Notas adicionales',
  description: 'Contenido de la nota.',
  fileName: null,
  storagePath: null,
  mimeType: null,
  fileSize: null,
  createdAt: '2026-08-01T12:30:00.000Z',
  status: 'ACTIVE',
}

function markup(
  over: Partial<Parameters<typeof ProblemEvidencesPanel>[0]> = {},
) {
  return renderToStaticMarkup(
    <ProblemEvidencesPanel
      situationId="s1"
      situationStatus="OPEN"
      user={{
        id: 'user-1',
        roleCode: 'COORDINADOR',
        permissions: ['SITUATIONS_UPDATE'],
      }}
      activeStatus="ready"
      activeItems={[NOTE]}
      activeErrorMessage={null}
      expanded={['notes']}
      onToggleSection={() => undefined}
      onRetryActive={() => undefined}
      canRetire
      submission={idleSubmission}
      onRetire={async () => false}
      historyRefreshKey={0}
      {...over}
    />,
  )
}

describe('ProblemEvidencesPanel', () => {
  it('lista evidencias activas con estado y acción de retiro', () => {
    const html = markup()
    expect(html).toContain('data-testid="detail-notes"')
    expect(html).toContain('data-evidence-status="ACTIVE"')
    expect(html).toContain('data-testid="retire-evidence-ev-1"')
    expect(html).toContain('Retirar evidencia')
  })

  it('oculta retiro en CLOSED o CANCELLED', () => {
    expect(markup({ situationStatus: 'CLOSED' })).not.toContain(
      'data-testid="retire-evidence-ev-1"',
    )
    expect(markup({ situationStatus: 'CANCELLED', canRetire: false })).not.toContain(
      'Retirar evidencia',
    )
  })

  it('muestra vacío cuando no hay activas', () => {
    const html = markup({ activeItems: [] })
    expect(html).toContain('data-testid="evidence-active-empty"')
  })

  it('muestra error y reintento del listado activo', () => {
    const html = markup({
      activeStatus: 'error',
      activeItems: [],
      activeErrorMessage: 'sin red',
    })
    expect(html).toContain('data-testid="detail-notes-error"')
    expect(html).toContain('data-testid="detail-notes-error-retry"')
  })

  it('al cambiar situationId el panel queda anclado al nuevo caso', () => {
    const html = markup({ situationId: 's2' })
    expect(html).toContain('data-situation="s2"')
  })
})
