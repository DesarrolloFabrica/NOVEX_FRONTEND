import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/http'
import type { SituationCaptureDraft } from '@/modules/situations/types/situation-capture.types'
import {
  describeRegistrationError,
  registerSituationWithAnalysis,
  uploadCaptureEvidences,
} from './situationRegistration.service'

const createSituationWithAnalysis = vi.fn()
const createSituationEvidence = vi.fn()

vi.mock('@/modules/api/situations.api', () => ({
  createSituationWithAnalysis: (...args: unknown[]) =>
    createSituationWithAnalysis(...args),
}))

vi.mock('@/modules/api/evidences.api', () => ({
  createSituationEvidence: (...args: unknown[]) =>
    createSituationEvidence(...args),
}))

vi.mock('@/modules/operational-events/utils/situationCaptureValidation', () => ({
  validateSituationCaptureDraft: () => ({ valid: true, missingRequirements: [] }),
}))

const SITUATION_ID = '5d1f7c2a-3b4e-4f5a-8b6c-7d8e9f001122'
const KEY = '6f1c2b1e-8d2a-4c3b-9e4f-112233445566'

const draft = {
  title: 'Caída de red',
  description: 'Sin conexión',
  coordinationId: '',
  reportedAt: '2026-10-22',
  detectionMethod: 'USUARIO',
  detectionMethodOther: 'Reporte verbal',
  affectedParties: [],
  affectedPartyOther: '',
  relatedCoordinationIds: [],
  additionalNotes: 'Revisar switch',
  categoryId: 'cat-1',
} as SituationCaptureDraft

const input = {
  draft,
  coordinations: [],
  categories: [
    {
      id: 'cat-1',
      code: 'TECH',
      name: 'Tecnología',
      description: null,
      isSelectable: true,
      icon: 'apps',
    },
  ],
  allowUnassignedCoordination: true,
  idempotencyKey: KEY,
}

describe('registerSituationWithAnalysis', () => {
  beforeEach(() => {
    createSituationWithAnalysis.mockReset()
    createSituationEvidence.mockReset().mockResolvedValue({})
  })

  it('envía la clave de idempotencia junto con el payload', async () => {
    createSituationWithAnalysis.mockResolvedValue({
      situation: { id: SITUATION_ID },
      analysis: {},
      replayed: false,
    })

    await registerSituationWithAnalysis(input)

    expect(createSituationWithAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Caída de red' }),
      KEY,
    )
  })

  it('propaga replayed para informar un registro ya completado', async () => {
    createSituationWithAnalysis.mockResolvedValue({
      situation: { id: SITUATION_ID },
      analysis: {},
      replayed: true,
    })

    const result = await registerSituationWithAnalysis(input)

    expect(result.replayed).toBe(true)
  })

  it('en un reintento envía las notas con claves estables, sin consultar evidencias previas', async () => {
    createSituationWithAnalysis.mockResolvedValue({
      situation: { id: SITUATION_ID },
      analysis: {},
      replayed: true,
    })

    const result = await registerSituationWithAnalysis(input)

    const keys = createSituationEvidence.mock.calls.map(
      (call) => (call[1] as { clientKey: string }).clientKey,
    )
    expect(keys).toEqual(
      expect.arrayContaining(['capture:detection', 'capture:notes']),
    )
    expect(result.failedEvidenceTitles).toEqual([])
  })

  it('informa las notas que no se guardaron en lugar de ocultarlas', async () => {
    createSituationWithAnalysis.mockResolvedValue({
      situation: { id: SITUATION_ID },
      analysis: {},
      replayed: false,
    })
    createSituationEvidence.mockImplementation(
      (_id: string, payload: { clientKey: string }) =>
        payload.clientKey === 'capture:notes'
          ? Promise.reject(new ApiError('fallo', 500))
          : Promise.resolve({}),
    )

    const result = await registerSituationWithAnalysis(input)

    expect(result.situation.id).toBe(SITUATION_ID)
    expect(result.failedEvidenceTitles).toEqual(['Notas adicionales'])
  })
})

describe('uploadCaptureEvidences', () => {
  beforeEach(() => {
    createSituationEvidence.mockReset().mockResolvedValue({})
  })

  it('sube cada nota con su clave estable', async () => {
    await uploadCaptureEvidences(SITUATION_ID, draft, [])

    expect(createSituationEvidence).toHaveBeenCalledWith(
      SITUATION_ID,
      expect.objectContaining({
        type: 'NOTE',
        title: 'Notas adicionales',
        clientKey: 'capture:notes',
      }),
    )
  })

  it('no hace llamadas cuando no hay notas que subir', async () => {
    await uploadCaptureEvidences(
      SITUATION_ID,
      {
        ...draft,
        detectionMethod: '',
        additionalNotes: '   ',
        affectedParties: [],
      } as SituationCaptureDraft,
      [],
    )

    expect(createSituationEvidence).not.toHaveBeenCalled()
  })

  it('una nota con título igual a otra existente se sube igual: la identidad es la clave, no el título', async () => {
    // Una evidencia manual "Notas adicionales" ya existe en el servidor. La nota de
    // captura tiene otra clave y debe guardarse, no omitirse por coincidir el título.
    await uploadCaptureEvidences(SITUATION_ID, draft, [])

    const sent = createSituationEvidence.mock.calls.map(
      (call) => call[1] as { clientKey: string },
    )
    expect(sent.some((payload) => payload.clientKey === 'capture:notes')).toBe(
      true,
    )
  })

  it('devuelve los títulos fallidos y continúa con las demás notas', async () => {
    createSituationEvidence.mockImplementation(
      (_id: string, payload: { clientKey: string }) =>
        payload.clientKey === 'capture:detection'
          ? Promise.reject(new Error('red'))
          : Promise.resolve({}),
    )

    const failed = await uploadCaptureEvidences(SITUATION_ID, draft, [])

    expect(failed).toEqual(['Método de detección'])
    expect(createSituationEvidence).toHaveBeenCalledTimes(2)
  })
})

describe('describeRegistrationError', () => {
  it('explica que el registro sigue procesándose sin mostrar detalles técnicos', () => {
    const error = new ApiError('El registro sigue procesándose.', 409, {
      code: 'REGISTRATION_IN_PROGRESS',
      requestId: 'req-1',
    })

    expect(describeRegistrationError(error)).toContain('no se creará un duplicado')
    expect(describeRegistrationError(error)).not.toContain('req-1')
  })

  it('indica que el contenido cambió cuando la clave se reutilizó con otro payload', () => {
    const error = new ApiError('clave reutilizada', 422, {
      code: 'IDEMPOTENCY_KEY_REUSED',
    })

    expect(describeRegistrationError(error)).toContain('Los datos cambiaron')
  })

  it('trata la pérdida de conexión y el timeout como resultado incierto', () => {
    const network = new ApiError('sin red', 0, { code: 'NETWORK_ERROR' })
    const timeout = new ApiError('lento', 0, { code: 'TIMEOUT' })

    expect(describeRegistrationError(network)).toContain('No fue posible confirmar')
    expect(describeRegistrationError(timeout)).toContain('No fue posible confirmar')
  })

  it('pide esperar cuando se supera el límite de intentos', () => {
    const error = new ApiError('Too Many Requests', 429)

    expect(describeRegistrationError(error)).toContain('Espere un minuto')
  })

  it('conserva el mensaje del servidor para permisos y validaciones', () => {
    const error = new ApiError(
      'No tienes permiso para ejecutar esta acción (SITUATIONS_CREATE).',
      403,
    )

    expect(describeRegistrationError(error)).toBe(
      'No tienes permiso para ejecutar esta acción (SITUATIONS_CREATE).',
    )
  })
})
