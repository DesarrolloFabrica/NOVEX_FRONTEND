import { describe, expect, it } from 'vitest'
import {
  activeEvidencesOf,
  canOfferEvidenceRetirement,
  mayRequestRetiredEvidenceHistory,
  retiredEvidencesOf,
} from '@/modules/operational-cards/data/evidenceAccess'
import type { SituationEvidenceItem } from '@/modules/api/evidences.api'

const item = (
  over: Partial<SituationEvidenceItem> = {},
): SituationEvidenceItem => ({
  id: 'e1',
  situationId: 's1',
  uploadedByUserId: 'u1',
  uploadedByUserName: 'Autor',
  type: 'NOTE',
  title: 'Nota',
  description: 'texto',
  fileName: null,
  storagePath: null,
  mimeType: null,
  fileSize: null,
  createdAt: '2026-09-01T10:00:00.000Z',
  status: 'ACTIVE',
  retirement: null,
  ...over,
})

describe('evidenceAccess', () => {
  it('permite pedir historial a ADMIN o quien tenga SITUATIONS_UPDATE', () => {
    expect(
      mayRequestRetiredEvidenceHistory({
        roleCode: 'ADMIN',
        permissions: ['SITUATIONS_VIEW'],
      }),
    ).toBe(true)
    expect(
      mayRequestRetiredEvidenceHistory({
        roleCode: 'COORDINADOR',
        permissions: ['SITUATIONS_UPDATE'],
      }),
    ).toBe(true)
    expect(
      mayRequestRetiredEvidenceHistory({
        roleCode: 'DIRECTOR',
        permissions: ['SITUATIONS_VIEW'],
      }),
    ).toBe(false)
  })

  it('ofrece retiro solo con UPDATE, shell operativo y caso workable', () => {
    expect(
      canOfferEvidenceRetirement({
        user: { permissions: ['SITUATIONS_UPDATE'] },
        situationStatus: 'OPEN',
        allowOperationalWrites: true,
      }),
    ).toBe(true)

    expect(
      canOfferEvidenceRetirement({
        user: { permissions: ['SITUATIONS_UPDATE'] },
        situationStatus: 'CLOSED',
        allowOperationalWrites: true,
      }),
    ).toBe(false)

    expect(
      canOfferEvidenceRetirement({
        user: { permissions: ['SITUATIONS_UPDATE'] },
        situationStatus: 'CANCELLED',
        allowOperationalWrites: true,
      }),
    ).toBe(false)

    expect(
      canOfferEvidenceRetirement({
        user: { permissions: ['SITUATIONS_VIEW'] },
        situationStatus: 'OPEN',
        allowOperationalWrites: true,
      }),
    ).toBe(false)

    expect(
      canOfferEvidenceRetirement({
        user: { permissions: ['SITUATIONS_UPDATE'] },
        situationStatus: 'OPEN',
        allowOperationalWrites: false,
      }),
    ).toBe(false)
  })

  it('separa activas y retiradas sin inventar estados', () => {
    const items = [
      item({ id: 'a', status: 'ACTIVE' }),
      item({
        id: 'r',
        status: 'RETIRED',
        retirement: {
          retiredAt: '2026-11-10T12:00:00.000Z',
          retiredByUserId: 'u2',
          reason: 'Motivo suficientemente largo',
        },
      }),
      item({ id: 'legacy' }),
    ]
    expect(activeEvidencesOf(items).map((i) => i.id)).toEqual(['a', 'legacy'])
    expect(retiredEvidencesOf(items).map((i) => i.id)).toEqual(['r'])
  })
})
