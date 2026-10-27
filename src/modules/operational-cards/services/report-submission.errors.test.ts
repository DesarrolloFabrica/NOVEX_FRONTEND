import { describe, expect, it } from 'vitest'
import { describeReportSubmissionError } from '@/modules/operational-cards/services/report-submission.service'
import { ApiError } from '@/shared/api/http'

/**
 * Mensajes del alta según el código del backend. Portados de main
 * (describeRegistrationError del asistente retirado) al flujo de cartas.
 */
describe('describeReportSubmissionError', () => {
  it('explica que el registro sigue procesándose sin mostrar detalles técnicos', () => {
    const message = describeReportSubmissionError(
      new ApiError('conflict', 409, { code: 'REGISTRATION_IN_PROGRESS' }),
    )
    expect(message).toMatch(/sigue procesándose/)
    expect(message).toMatch(/no se creará un duplicado/)
  })

  it('avisa de que el intento anterior ya quedó registrado si la clave se reutilizó con otro contenido', () => {
    const message = describeReportSubmissionError(
      new ApiError('unprocessable', 422, { code: 'IDEMPOTENCY_KEY_REUSED' }),
    )
    expect(message).toMatch(/ya quedó registrado/)
    expect(message).toMatch(/registro nuevo/)
  })

  it('trata la pérdida de conexión y el timeout como resultado incierto', () => {
    for (const code of ['TIMEOUT', 'NETWORK_ERROR']) {
      const message = describeReportSubmissionError(new ApiError('x', 0, { code }))
      expect(message).toMatch(/no lo duplicará/)
    }
  })

  it('pide esperar cuando se supera el límite de intentos', () => {
    expect(describeReportSubmissionError(new ApiError('Too Many', 429))).toMatch(
      /Espere un minuto/,
    )
  })

  it('conserva el mensaje del servidor para permisos y validaciones', () => {
    expect(
      describeReportSubmissionError(
        new ApiError('Solo puede registrar situaciones de su coordinación.', 403),
      ),
    ).toBe('Solo puede registrar situaciones de su coordinación.')
  })

  it('un error que no es de la API conserva su mensaje', () => {
    expect(describeReportSubmissionError(new Error('Seleccione una categoría.'))).toBe(
      'Seleccione una categoría.',
    )
  })
})
