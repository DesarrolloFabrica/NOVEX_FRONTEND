import { describe, expect, it } from 'vitest'
import {
  getTicketTheme,
  resolveTicketTheme,
  TICKET_THEMES,
} from '@/modules/operational-cards/experience/ticketThemes'

describe('resolveTicketTheme', () => {
  it('activa Fábrica solo para coord-fabrica-contenidos', () => {
    expect(resolveTicketTheme('coord-fabrica-contenidos')).toBe('fabrica')
    expect(getTicketTheme('fabrica').watermark).toContain('/fabrica/cut/')
  })

  it('activa Saber Pro solo para coord-saber-pro', () => {
    expect(resolveTicketTheme('coord-saber-pro')).toBe('saber-pro')
    const theme = getTicketTheme('saber-pro')
    expect(theme.accent).toBe('#5C5E2C')
    expect(theme.accentDeep).toBe('#2D3325')
    expect(theme.watermark).toBe(
      '/assets/tickets/saber-pro/cut/watermark-meerkat.png',
    )
    expect(theme.ornaments.character).toHaveLength(1)
    expect(theme.ornaments.action.map((o) => o.src)).toEqual([
      '/assets/tickets/saber-pro/cut/ornament-checklist.png',
      '/assets/tickets/saber-pro/cut/ornament-laurel.png',
    ])
  })

  it('no asigna tema a coordinaciones sin registro', () => {
    expect(resolveTicketTheme('coord-b2b')).toBeUndefined()
    expect(resolveTicketTheme('coord-servicios')).toBeUndefined()
    expect(resolveTicketTheme('coord-general')).toBeUndefined()
  })

  it('trata selección vacía o inválida como sin tema', () => {
    expect(resolveTicketTheme(null)).toBeUndefined()
    expect(resolveTicketTheme(undefined)).toBeUndefined()
    expect(resolveTicketTheme('')).toBeUndefined()
  })

  it('solo expone los temas registrados (fabrica y saber-pro)', () => {
    expect(Object.keys(TICKET_THEMES).sort()).toEqual(['fabrica', 'saber-pro'])
  })
})
