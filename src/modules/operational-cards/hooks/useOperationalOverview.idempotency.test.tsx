// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/http'
import { isUuidV4 } from '@/shared/utils/uuid'

/**
 * PROTECCIÓN CONTRA DUPLICADOS EN EL FLUJO DE CARTAS (porte de main).
 *
 * Se monta el controlador real y solo se simula la red: lo que se comprueba es
 * qué clave de idempotencia acompaña a cada envío y cuándo cambia.
 */

const createSituationWithAnalysis = vi.fn()

vi.mock('@/modules/api/situations.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/api/situations.api')>()),
  createSituationWithAnalysis: (...args: unknown[]) =>
    createSituationWithAnalysis(...args),
}))

// LEVEL 0 pide el overview al montar; aquí no interesa su respuesta.
vi.mock('@/modules/operational-cards/services/operational-overview.service', () => ({
  fetchOperationalOverview: () => new Promise(() => undefined),
}))

const { useOperationalOverview } = await import(
  '@/modules/operational-cards/hooks/useOperationalOverview'
)
type Controller = ReturnType<typeof useOperationalOverview>
const { emptyReportDraft } = await import(
  '@/modules/operational-cards/state/operationalCards.reducer'
)

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const DRAFT_KEY = 'coord-fabrica-contenidos:INTERNAL'

const draft = (title = 'Internet intermitente') => ({
  ...emptyReportDraft('2026-10-26T08:30'),
  title,
  description: 'Hay conexión pero el servicio se corta.',
  categoryId: 'cat-internet',
})

const submitInput = (title?: string) => ({
  draftKey: DRAFT_KEY,
  reportKind: 'INTERNAL' as const,
  selectedCoordinationCode: 'coord-fabrica-contenidos' as never,
  selectedCoordinationId: '00000000-0000-4000-8000-000000000014',
  responsibleCoordinationCode: 'coord-fabrica-contenidos' as never,
  draft: draft(title),
})

const created = (id: string, replayed = false) => ({
  situation: { id },
  analysis: null,
  replayed,
})

/** Clave enviada en la llamada n (segundo argumento del cliente HTTP). */
const keyOfCall = (n: number) => createSituationWithAnalysis.mock.calls[n][1] as string

let root: Root | null = null
let container: HTMLDivElement | null = null

function mount(scope: string | null): { current: Controller } {
  const ref = { current: null as unknown as Controller }
  function Probe() {
    ref.current = useOperationalOverview({ persistenceScope: scope })
    return null
  }
  container = document.createElement('div')
  root = createRoot(container)
  act(() => root!.render(<Probe />))
  return ref
}

function unmount() {
  act(() => root?.unmount())
  root = null
  container = null
}

describe('useOperationalOverview: alta idempotente', () => {
  beforeEach(() => {
    window.localStorage.clear()
    createSituationWithAnalysis.mockReset()
  })
  afterEach(() => unmount())

  it('dos pulsaciones simultáneas del mismo envío producen UNA sola petición', async () => {
    let resolve: (value: unknown) => void = () => undefined
    createSituationWithAnalysis.mockReturnValue(
      new Promise((r) => {
        resolve = r
      }),
    )
    const ctrl = mount('user-1')

    let first!: Promise<boolean>
    let second!: Promise<boolean>
    await act(async () => {
      first = ctrl.current.submitReport(submitInput())
      second = ctrl.current.submitReport(submitInput())
      resolve(created('sit-1'))
      await Promise.all([first, second])
    })

    expect(createSituationWithAnalysis).toHaveBeenCalledTimes(1)
    expect(isUuidV4(keyOfCall(0))).toBe(true)
    await expect(first).resolves.toBe(true)
    await expect(second).resolves.toBe(false)
  })

  it('un reintento tras una respuesta perdida reutiliza la MISMA clave', async () => {
    createSituationWithAnalysis
      .mockRejectedValueOnce(new ApiError('sin red', 0, { code: 'NETWORK_ERROR' }))
      .mockResolvedValueOnce(created('sit-1', true))
    const ctrl = mount('user-1')

    await act(async () => {
      await ctrl.current.submitReport(submitInput())
    })
    expect(ctrl.current.submission.status).toBe('error')
    expect(ctrl.current.submission.errorMessage).toMatch(/no lo duplicará/)

    await act(async () => {
      await ctrl.current.submitReport(submitInput())
    })

    expect(createSituationWithAnalysis).toHaveBeenCalledTimes(2)
    expect(keyOfCall(1)).toBe(keyOfCall(0))
    // `replayed`: el servidor devolvió el registro existente y se da por confirmado.
    expect(ctrl.current.submission.status).toBe('idle')
  })

  it('la clave sobrevive a una recarga (desmontar y volver a montar)', async () => {
    createSituationWithAnalysis.mockRejectedValueOnce(
      new ApiError('timeout', 0, { code: 'TIMEOUT' }),
    )
    let ctrl = mount('user-1')
    await act(async () => {
      await ctrl.current.submitReport(submitInput())
    })
    unmount()

    createSituationWithAnalysis.mockResolvedValueOnce(created('sit-1', true))
    ctrl = mount('user-1')
    await act(async () => {
      await ctrl.current.submitReport(submitInput())
    })

    expect(keyOfCall(1)).toBe(keyOfCall(0))
  })

  it('un problema nuevo, tras confirmar el anterior, obtiene una clave nueva', async () => {
    createSituationWithAnalysis
      .mockResolvedValueOnce(created('sit-1'))
      .mockResolvedValueOnce(created('sit-2'))
    const ctrl = mount('user-1')

    await act(async () => {
      await ctrl.current.submitReport(submitInput('Primer problema'))
    })
    await act(async () => {
      await ctrl.current.submitReport(submitInput('Segundo problema'))
    })

    expect(keyOfCall(1)).not.toBe(keyOfCall(0))
  })

  it('IDEMPOTENCY_KEY_REUSED: se avisa y el siguiente envío lleva otra clave', async () => {
    createSituationWithAnalysis
      .mockRejectedValueOnce(
        new ApiError('reutilizada', 422, { code: 'IDEMPOTENCY_KEY_REUSED' }),
      )
      .mockResolvedValueOnce(created('sit-2'))
    const ctrl = mount('user-1')

    await act(async () => {
      await ctrl.current.submitReport(submitInput('Contenido editado'))
    })
    expect(ctrl.current.submission.errorMessage).toMatch(/ya quedó registrado/)

    await act(async () => {
      await ctrl.current.submitReport(submitInput('Contenido editado'))
    })
    expect(keyOfCall(1)).not.toBe(keyOfCall(0))
  })

  it('el borrador se conserva tras un fallo y se restaura al recargar', async () => {
    let ctrl = mount('user-1')
    act(() => ctrl.current.setReportDraft(DRAFT_KEY, draft('Texto a conservar')))
    unmount()

    ctrl = mount('user-1')
    expect(ctrl.current.reportDrafts[DRAFT_KEY]?.title).toBe('Texto a conservar')
  })

  it('el borrador se retira al confirmar el alta (también del almacenamiento)', async () => {
    createSituationWithAnalysis.mockResolvedValueOnce(created('sit-1'))
    let ctrl = mount('user-1')
    act(() => ctrl.current.setReportDraft(DRAFT_KEY, draft()))
    await act(async () => {
      await ctrl.current.submitReport(submitInput())
    })
    unmount()

    ctrl = mount('user-1')
    expect(ctrl.current.reportDrafts[DRAFT_KEY]).toBeUndefined()
  })

  it('los borradores de un usuario no aparecen en la sesión de otro', () => {
    let ctrl = mount('user-1')
    act(() => ctrl.current.setReportDraft(DRAFT_KEY, draft('Privado')))
    unmount()

    ctrl = mount('user-2')
    expect(ctrl.current.reportDrafts[DRAFT_KEY]).toBeUndefined()
  })
})
