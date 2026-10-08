import { resolutionFixture } from '@/modules/operational-cards/charts/resolucion.fixture'
import { agingFixture, snapshotFixture } from '@/modules/operational-cards/charts/antiguedad.fixture'
// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { analysisPeriodFromWeek } from '@/modules/operational-cards/domain/analysis-period'
import {
  useDirectorEstadoState,
  type DirectorEstadoLoadStatus,
} from '@/modules/operational-cards/hooks/useDirectorEstadoState'
import { fetchOperationalKpiState } from '@/modules/operational-cards/services/operational-kpi.service'
import type { OperationalKpiStateResponse } from '@/modules/operational-cards/types/operational-kpi.types'

vi.mock(
  '@/modules/operational-cards/services/operational-kpi.service',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('@/modules/operational-cards/services/operational-kpi.service')
    >()),
    fetchOperationalKpiState: vi.fn(),
  }),
)

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const PERIOD = analysisPeriodFromWeek(
  '2026-09-28',
  new Date('2026-10-06T12:00:00-05:00'),
)

const HOOK_AGING = agingFixture({ at: '2026-10-04', isNow: false, activeCount: 0 })

const RESPONSE: OperationalKpiStateResponse = {
  scope: { type: 'coordination', coordinationId: 'c-1' },
  timezone: 'America/Bogota',
  period: {
    kind: 'week',
    from: '2026-09-28',
    to: '2026-10-04',
    calendarEnd: '2026-10-04',
    label: '2026-09-28 – 2026-10-04',
    isCurrent: false,
    isPartial: false,
    dataTo: '2026-10-04',
  },
  relations: { dependencies: 1, commitments: 0 },
  evolution: { bucket: 'day', backlog: [], created: [], closed: [], buckets: [] },
  activeAtPeriodEnd: { count: 0, at: '2026-10-04', isNow: false },
  aging: HOOK_AGING,
  snapshot: snapshotFixture(HOOK_AGING),
  resolution: resolutionFixture([]),
}

let container: HTMLDivElement
let root: Root
const seen: DirectorEstadoLoadStatus[] = []

function Probe({ coordinationId }: { coordinationId: string | null }) {
  const state = useDirectorEstadoState(coordinationId, coordinationId ? PERIOD : null)
  seen.push(state.status)
  return <span data-status={state.status} />
}

beforeEach(() => {
  seen.length = 0
  vi.mocked(fetchOperationalKpiState).mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('useDirectorEstadoState', () => {
  it('sin coordinación el estado inicial es idle y no consulta', () => {
    act(() => root.render(<Probe coordinationId={null} />))
    expect(seen[0]).toBe('idle')
    expect(seen.at(-1)).toBe('idle')
    expect(fetchOperationalKpiState).not.toHaveBeenCalled()
  })

  it('con coordinación arranca en loading (sin frame idle) y termina en success', async () => {
    vi.mocked(fetchOperationalKpiState).mockResolvedValue(RESPONSE)
    await act(async () => root.render(<Probe coordinationId="c-1" />))
    expect(seen[0]).toBe('loading')
    expect(seen).not.toContain('idle')
    expect(seen.at(-1)).toBe('success')
    expect(fetchOperationalKpiState).toHaveBeenCalledWith(
      {
        coordinationId: 'c-1',
        from: '2026-09-28',
        to: '2026-10-04',
        kind: 'week',
        calendarEnd: '2026-10-04',
      },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })
})
