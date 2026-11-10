// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearPersistedLearningDrafts,
  persistLearningDrafts,
  readPersistedLearningDrafts,
} from '@/modules/operational-cards/services/learning-persistence'
import { clearUserOperationalDrafts } from '@/modules/operational-cards/services/clear-user-drafts'
import { persistReportDrafts, readPersistedReportDrafts } from '@/modules/operational-cards/services/report-persistence'
import { emptyReportDraft } from '@/modules/operational-cards/state/operationalCards.reducer'
import {
  clearAllReasonDrafts,
  readReasonDraft,
  writeReasonDraft,
} from '@/modules/operational-cards/services/reason-draft-persistence'

describe('learning-persistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('guarda y restaura aprendizajes del mismo usuario', () => {
    persistLearningDrafts('user-1', { p1: 'Lección aprendida' })
    expect(readPersistedLearningDrafts('user-1')).toEqual({
      p1: 'Lección aprendida',
    })
  })

  it('no expone borradores de aprendizaje a otro usuario', () => {
    persistLearningDrafts('user-1', { p1: 'Privado' })
    expect(readPersistedLearningDrafts('user-2')).toEqual({})
  })

  it('limpia tras confirmar (mapa vacío) o logout voluntario', () => {
    persistLearningDrafts('user-1', { p1: 'Texto' })
    persistReportDrafts('user-1', {
      'coord:INTERNAL': {
        ...emptyReportDraft('2026-01-01T10:00'),
        title: 'Borrador',
        description: 'Desc',
        categoryId: 'c1',
      },
    })
    writeReasonDraft('user-1', 'cancel', 'sit-1', 'Motivo administrativo largo')

    clearPersistedLearningDrafts('user-1')
    expect(readPersistedLearningDrafts('user-1')).toEqual({})

    persistLearningDrafts('user-1', { p1: 'Otra vez' })
    clearUserOperationalDrafts('user-1')
    expect(readPersistedLearningDrafts('user-1')).toEqual({})
    expect(readPersistedReportDrafts('user-1')).toEqual({})
    expect(readReasonDraft('user-1', 'cancel', 'sit-1')).toBe('')
  })
})

describe('reason-draft-persistence', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('aísla motivos por usuario y los limpia en bloque', () => {
    writeReasonDraft('user-1', 'retire', 'ev-1', 'Motivo de retiro suficiente')
    expect(readReasonDraft('user-2', 'retire', 'ev-1')).toBe('')
    clearAllReasonDrafts('user-1')
    expect(readReasonDraft('user-1', 'retire', 'ev-1')).toBe('')
  })
})
