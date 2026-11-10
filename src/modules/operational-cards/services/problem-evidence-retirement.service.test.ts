import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/http'
import { AdminReasonValidationError } from '@/modules/situations/data/assertAdminReason'

const { retireSituationEvidence } = vi.hoisted(() => ({
  retireSituationEvidence: vi.fn(),
}))

vi.mock('@/modules/api/evidences.api', () => ({
  retireSituationEvidence,
}))

const { submitEvidenceRetirement } = await import(
  '@/modules/operational-cards/services/problem-evidence-retirement.service'
)
const { describeEvidenceRetirementError } = await import(
  '@/modules/operational-cards/services/evidence-retirement-errors'
)

describe('submitEvidenceRetirement', () => {
  beforeEach(() => {
    retireSituationEvidence.mockReset()
  })

  it('rechaza motivo inválido antes del API', async () => {
    await expect(
      submitEvidenceRetirement('s1', 'e1', 'corto'),
    ).rejects.toBeInstanceOf(AdminReasonValidationError)
    expect(retireSituationEvidence).not.toHaveBeenCalled()
  })

  it('envía motivo recortado y propaga la evidencia retirada', async () => {
    retireSituationEvidence.mockResolvedValue({
      id: 'e1',
      status: 'RETIRED',
      retirement: {
        retiredAt: '2026-11-10T12:00:00.000Z',
        retiredByUserId: 'u1',
        reason: 'Duplicado confirmado en revisión',
      },
    })

    const result = await submitEvidenceRetirement(
      's1',
      'e1',
      '  Duplicado confirmado en revisión  ',
    )

    expect(retireSituationEvidence).toHaveBeenCalledWith('s1', 'e1', {
      reason: 'Duplicado confirmado en revisión',
    })
    expect(result.status).toBe('RETIRED')
  })

  it('mapea 409 de retiro previo y 403/404', () => {
    expect(
      describeEvidenceRetirementError(
        new ApiError('ya', 409, { code: 'EVIDENCE_ALREADY_RETIRED' }),
      ),
    ).toMatch(/ya fue retirada/i)

    expect(
      describeEvidenceRetirementError(new ApiError('Forbidden', 403)),
    ).toMatch(/permiso/i)

    expect(
      describeEvidenceRetirementError(new ApiError('Missing', 404)),
    ).toMatch(/no se encontró/i)
  })
})
