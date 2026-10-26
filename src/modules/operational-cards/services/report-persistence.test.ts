// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearReportRequestId,
  persistReportDrafts,
  readOrCreateReportRequestId,
  readPersistedReportDrafts,
  rotateReportRequestId,
} from '@/modules/operational-cards/services/report-persistence'
import { emptyReportDraft } from '@/modules/operational-cards/state/operationalCards.reducer'
import { isUuidV4 } from '@/shared/utils/uuid'

const DRAFT_KEY = 'coord-fabrica-contenidos:INTERNAL'

const draft = () => ({
  ...emptyReportDraft('2026-10-26T08:30'),
  title: 'Internet intermitente',
  description: 'Hay conexión pero el servicio se corta.',
  categoryId: 'cat-internet',
})

describe('report-persistence: clave de idempotencia por borrador', () => {
  beforeEach(() => window.localStorage.clear())

  it('crea una clave UUID v4 y la reutiliza en los reintentos del mismo reporte', () => {
    const first = readOrCreateReportRequestId('user-1', DRAFT_KEY)
    expect(isUuidV4(first)).toBe(true)
    expect(readOrCreateReportRequestId('user-1', DRAFT_KEY)).toBe(first)
  })

  it('la clave sobrevive a una recarga (vive en localStorage)', () => {
    const first = readOrCreateReportRequestId('user-1', DRAFT_KEY)
    const stored = window.localStorage.getItem('novex.cards.reportRequestIds.v1:user-1')
    expect(stored).toContain(first)
  })

  it('tras confirmar el alta se olvida: el siguiente reporte es nuevo y obtiene otra clave', () => {
    const first = readOrCreateReportRequestId('user-1', DRAFT_KEY)
    clearReportRequestId('user-1', DRAFT_KEY)
    const second = readOrCreateReportRequestId('user-1', DRAFT_KEY)
    expect(second).not.toBe(first)
  })

  it('rotar produce una clave distinta y la deja como vigente', () => {
    const first = readOrCreateReportRequestId('user-1', DRAFT_KEY)
    const rotated = rotateReportRequestId('user-1', DRAFT_KEY)
    expect(rotated).not.toBe(first)
    expect(readOrCreateReportRequestId('user-1', DRAFT_KEY)).toBe(rotated)
  })

  it('cada carta y tipo de reporte tiene su propia clave', () => {
    const internal = readOrCreateReportRequestId('user-1', DRAFT_KEY)
    const inter = readOrCreateReportRequestId('user-1', 'coord-fabrica-contenidos:INTER_COORDINATION')
    expect(inter).not.toBe(internal)
  })

  it('las claves de un usuario no se comparten con otro en el mismo navegador', () => {
    const mine = readOrCreateReportRequestId('user-1', DRAFT_KEY)
    const theirs = readOrCreateReportRequestId('user-2', DRAFT_KEY)
    expect(theirs).not.toBe(mine)
  })

  it('un valor guardado que no es UUID v4 se descarta y se crea una clave válida', () => {
    window.localStorage.setItem(
      'novex.cards.reportRequestIds.v1:user-1',
      JSON.stringify({ [DRAFT_KEY]: 'no-es-uuid' }),
    )
    expect(isUuidV4(readOrCreateReportRequestId('user-1', DRAFT_KEY))).toBe(true)
  })
})

describe('report-persistence: borradores', () => {
  beforeEach(() => window.localStorage.clear())

  it('guarda y recupera los borradores del usuario', () => {
    persistReportDrafts('user-1', { [DRAFT_KEY]: draft() })
    expect(readPersistedReportDrafts('user-1')).toEqual({ [DRAFT_KEY]: draft() })
    expect(readPersistedReportDrafts('user-2')).toEqual({})
  })

  it('un mapa vacío borra la entrada del almacenamiento', () => {
    persistReportDrafts('user-1', { [DRAFT_KEY]: draft() })
    persistReportDrafts('user-1', {})
    expect(window.localStorage.getItem('novex.cards.reportDrafts.v1:user-1')).toBeNull()
  })

  it('ignora borradores corruptos o con una severidad desconocida', () => {
    window.localStorage.setItem(
      'novex.cards.reportDrafts.v1:user-1',
      JSON.stringify({
        ok: draft(),
        sinTitulo: { ...draft(), title: 42 },
        severidad: { ...draft(), severity: 'URGENTE' },
      }),
    )
    expect(Object.keys(readPersistedReportDrafts('user-1'))).toEqual(['ok'])
  })

  it('JSON inválido no rompe la carga', () => {
    window.localStorage.setItem('novex.cards.reportDrafts.v1:user-1', '{roto')
    expect(readPersistedReportDrafts('user-1')).toEqual({})
  })

  it('sin ámbito (sin usuario) no persiste nada', () => {
    persistReportDrafts(null, { [DRAFT_KEY]: draft() })
    expect(readPersistedReportDrafts(null)).toEqual({})
    expect(window.localStorage.length).toBe(0)
  })
})

describe('report-persistence sin almacenamiento disponible', () => {
  afterEach(() => vi.restoreAllMocks())

  it('la clave se conserva en memoria durante la sesión', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    const first = readOrCreateReportRequestId('user-mem', DRAFT_KEY)
    expect(readOrCreateReportRequestId('user-mem', DRAFT_KEY)).toBe(first)
  })
})
