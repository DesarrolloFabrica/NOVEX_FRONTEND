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
    expect(getTicketTheme('fabrica').accent).toBe('#1a9aa6')
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

  it('activa Especializaciones solo para coord-especializaciones', () => {
    expect(resolveTicketTheme('coord-especializaciones')).toBe(
      'especializaciones',
    )
    const theme = getTicketTheme('especializaciones')
    expect(theme.accent).toBe('#7B110D')
    expect(theme.accentDeep).toBe('#3A0C0A')
    expect(theme.watermark).toBe(
      '/assets/tickets/especializaciones/cut/watermark-falcon.png',
    )
    expect(theme.ornaments.character).toEqual([
      {
        src: '/assets/tickets/especializaciones/cut/ornament-mortarboard.png',
        corner: 'bl',
      },
    ])
    expect(theme.ornaments.reports.map((o) => o.src)).toEqual([
      '/assets/tickets/especializaciones/cut/ornament-books.png',
      '/assets/tickets/especializaciones/cut/ornament-ribbon-star.png',
    ])
    expect(theme.ornaments.problems.map((o) => o.src)).toEqual([
      '/assets/tickets/especializaciones/cut/ornament-chart-rise.png',
      '/assets/tickets/especializaciones/cut/ornament-globe.png',
    ])
    expect(theme.ornaments.action.map((o) => o.src)).toEqual([
      '/assets/tickets/especializaciones/cut/ornament-books.png',
      '/assets/tickets/especializaciones/cut/ornament-chart-rise.png',
      '/assets/tickets/especializaciones/cut/ornament-mortarboard.png',
    ])
  })

  it('activa Desarrollo Profesional solo para coord-desarrollo-profesional', () => {
    expect(resolveTicketTheme('coord-desarrollo-profesional')).toBe(
      'desarrollo-profesional',
    )
    const theme = getTicketTheme('desarrollo-profesional')
    expect(theme.accent).toBe('#5C2E58')
    expect(theme.accentDeep).toBe('#3A1C35')
    expect(theme.watermark).toBe(
      '/assets/tickets/desarrollo-profesional/cut/watermark-butterfly.png',
    )
    expect(theme.ornaments.character).toEqual([
      {
        src: '/assets/tickets/desarrollo-profesional/cut/ornament-corner-star.png',
        corner: 'bl',
      },
    ])
    expect(theme.ornaments.reports.map((o) => o.src)).toEqual([
      '/assets/tickets/desarrollo-profesional/cut/ornament-climber-steps.png',
      '/assets/tickets/desarrollo-profesional/cut/ornament-sun-rays.png',
    ])
    expect(theme.ornaments.problems.map((o) => o.src)).toEqual([
      '/assets/tickets/desarrollo-profesional/cut/ornament-stepped-arrow.png',
      '/assets/tickets/desarrollo-profesional/cut/ornament-corner-star.png',
    ])
    expect(theme.ornaments.action.map((o) => o.src)).toEqual([
      '/assets/tickets/desarrollo-profesional/cut/ornament-climber-steps.png',
      '/assets/tickets/desarrollo-profesional/cut/ornament-sun-rays.png',
    ])
    expect(theme.ornaments.action.map((o) => o.corner)).toEqual(['bl', 'tr'])
  })

  it('activa B2B solo para coord-b2b', () => {
    expect(resolveTicketTheme('coord-b2b')).toBe('b2b')
    const theme = getTicketTheme('b2b')
    expect(theme.accent).toBe('#551C19')
    expect(theme.accentDeep).toBe('#2E0C0B')
    expect(theme.watermark).toBe(
      '/assets/tickets/b2b/cut/watermark-woodpecker.png',
    )
    expect(theme.ornaments.character).toEqual([
      {
        src: '/assets/tickets/b2b/cut/ornament-four-point-star.png',
        corner: 'bl',
      },
    ])
    expect(theme.ornaments.reports.map((o) => o.src)).toEqual([
      '/assets/tickets/b2b/cut/ornament-corner-quotes.png',
      '/assets/tickets/b2b/cut/ornament-globe-lines.png',
    ])
    expect(theme.ornaments.problems.map((o) => o.src)).toEqual([
      '/assets/tickets/b2b/cut/ornament-speech-bubbles.png',
      '/assets/tickets/b2b/cut/ornament-four-point-star.png',
    ])
    expect(theme.ornaments.action.map((o) => o.src)).toEqual([
      '/assets/tickets/b2b/cut/ornament-globe-lines.png',
      '/assets/tickets/b2b/cut/ornament-rule-dot.png',
    ])
    expect(theme.ornaments.action.map((o) => o.corner)).toEqual(['bl', 'tr'])
  })

  it('activa Coordinación General solo para coord-general', () => {
    expect(resolveTicketTheme('coord-general')).toBe('general')
    const theme = getTicketTheme('general')
    expect(theme.accent).toBe('#7A5708')
    expect(theme.accentDeep).toBe('#3C2A05')
    expect(theme.watermark).toBe(
      '/assets/tickets/general/cut/watermark-giraffe.png',
    )
    expect(theme.ornaments.character).toEqual([
      {
        src: '/assets/tickets/general/cut/ornament-corner-star.png',
        corner: 'bl',
      },
    ])
    expect(theme.ornaments.reports.map((o) => o.src)).toEqual([
      '/assets/tickets/general/cut/ornament-team.png',
      '/assets/tickets/general/cut/ornament-target.png',
    ])
    expect(theme.ornaments.problems.map((o) => o.src)).toEqual([
      '/assets/tickets/general/cut/ornament-org-nodes.png',
      '/assets/tickets/general/cut/ornament-route.png',
    ])
    expect(theme.ornaments.action.map((o) => o.src)).toEqual([
      '/assets/tickets/general/cut/ornament-route.png',
      '/assets/tickets/general/cut/ornament-corner-star.png',
    ])
    expect(theme.ornaments.action.map((o) => o.corner)).toEqual(['bl', 'tr'])
  })

  it('activa Proyección Social solo para coord-proyeccion-social', () => {
    expect(resolveTicketTheme('coord-proyeccion-social')).toBe(
      'proyeccion-social',
    )
    const theme = getTicketTheme('proyeccion-social')
    expect(theme.accent).toBe('#17492F')
    expect(theme.accentDeep).toBe('#0A2E1C')
    expect(theme.watermark).toBe(
      '/assets/tickets/proyeccion-social/cut/watermark-hummingbird.png',
    )
    expect(theme.ornaments.character).toEqual([
      {
        src: '/assets/tickets/proyeccion-social/cut/ornament-corner-star.png',
        corner: 'bl',
      },
    ])
    expect(theme.ornaments.reports.map((o) => o.src)).toEqual([
      '/assets/tickets/proyeccion-social/cut/ornament-leaf-vine.png',
      '/assets/tickets/proyeccion-social/cut/ornament-heart.png',
    ])
    expect(theme.ornaments.problems.map((o) => o.src)).toEqual([
      '/assets/tickets/proyeccion-social/cut/ornament-people-leaf.png',
      '/assets/tickets/proyeccion-social/cut/ornament-social-globe.png',
    ])
    expect(theme.ornaments.action.map((o) => o.src)).toEqual([
      '/assets/tickets/proyeccion-social/cut/ornament-people-leaf.png',
      '/assets/tickets/proyeccion-social/cut/ornament-corner-star.png',
    ])
    expect(theme.ornaments.action.map((o) => o.corner)).toEqual(['bl', 'tr'])
  })

  it('activa Servicio solo para coord-homologaciones (no coord-servicios)', () => {
    expect(resolveTicketTheme('coord-homologaciones')).toBe('servicio')
    expect(resolveTicketTheme('coord-servicios')).toBeUndefined()
    const theme = getTicketTheme('servicio')
    expect(theme.accent).toBe('#681030')
    expect(theme.accentDeep).toBe('#3A0A22')
    expect(theme.watermark).toBe(
      '/assets/tickets/servicio/cut/watermark-flamingo.png',
    )
    expect(theme.ornaments.character).toEqual([
      {
        src: '/assets/tickets/servicio/cut/ornament-corner-star.png',
        corner: 'bl',
      },
    ])
    expect(theme.ornaments.reports.map((o) => o.src)).toEqual([
      '/assets/tickets/servicio/cut/ornament-open-hand.png',
      '/assets/tickets/servicio/cut/ornament-location-pin.png',
    ])
    expect(theme.ornaments.problems.map((o) => o.src)).toEqual([
      '/assets/tickets/servicio/cut/ornament-care-heart.png',
      '/assets/tickets/servicio/cut/ornament-handshake.png',
    ])
    expect(theme.ornaments.action.map((o) => o.src)).toEqual([
      '/assets/tickets/servicio/cut/ornament-handshake.png',
      '/assets/tickets/servicio/cut/ornament-corner-star.png',
    ])
    expect(theme.ornaments.action.map((o) => o.corner)).toEqual(['bl', 'tr'])
  })

  it('activa Operación Académica solo para el padre, no las cinco escuelas', () => {
    expect(resolveTicketTheme('coord-operaciones-academicas')).toBe(
      'operacion-academica',
    )
    expect(resolveTicketTheme('coord-bellas-artes')).toBeUndefined()
    expect(resolveTicketTheme('coord-empresarial')).toBeUndefined()
    expect(resolveTicketTheme('coord-ingenierias')).toBeUndefined()
    expect(resolveTicketTheme('coord-transversales')).toBeUndefined()
    expect(resolveTicketTheme('coord-negocios')).toBeUndefined()
    const theme = getTicketTheme('operacion-academica')
    expect(theme.accent).toBe('#1A2946')
    expect(theme.accentDeep).toBe('#0F1A2E')
    expect(theme.watermark).toBe(
      '/assets/tickets/operacion-academica/cut/watermark-wolf.png',
    )
    expect(theme.ornaments.character).toEqual([
      {
        src: '/assets/tickets/operacion-academica/cut/ornament-five-school-fan.png',
        corner: 'bl',
      },
    ])
    expect(theme.ornaments.reports.map((o) => o.src)).toEqual([
      '/assets/tickets/operacion-academica/cut/ornament-academic-hub.png',
    ])
    expect(theme.ornaments.problems.map((o) => o.src)).toEqual([
      '/assets/tickets/operacion-academica/cut/ornament-five-school-chain.png',
      '/assets/tickets/operacion-academica/cut/ornament-five-point-rosette.png',
    ])
    expect(theme.ornaments.action.map((o) => o.src)).toEqual([
      '/assets/tickets/operacion-academica/cut/ornament-academic-hub.png',
      '/assets/tickets/operacion-academica/cut/ornament-five-point-rosette.png',
    ])
    expect(theme.ornaments.action.map((o) => o.corner)).toEqual(['tr', 'br'])
  })

  it('no asigna tema a coordinaciones sin registro', () => {
    expect(resolveTicketTheme('coord-servicios')).toBeUndefined()
    expect(resolveTicketTheme('coord-inexistente')).toBeUndefined()
  })

  it('trata selección vacía o inválida como sin tema', () => {
    expect(resolveTicketTheme(null)).toBeUndefined()
    expect(resolveTicketTheme(undefined)).toBeUndefined()
    expect(resolveTicketTheme('')).toBeUndefined()
  })

  it('expone los nueve temas registrados sin alterar los anteriores', () => {
    expect(Object.keys(TICKET_THEMES).sort()).toEqual([
      'b2b',
      'desarrollo-profesional',
      'especializaciones',
      'fabrica',
      'general',
      'operacion-academica',
      'proyeccion-social',
      'saber-pro',
      'servicio',
    ])
    expect(TICKET_THEMES.fabrica.accent).toBe('#1a9aa6')
    expect(TICKET_THEMES['saber-pro'].accent).toBe('#5C5E2C')
    expect(TICKET_THEMES.especializaciones.accent).toBe('#7B110D')
    expect(TICKET_THEMES['desarrollo-profesional'].accent).toBe('#5C2E58')
    expect(TICKET_THEMES.b2b.accent).toBe('#551C19')
    expect(TICKET_THEMES.general.accent).toBe('#7A5708')
    expect(TICKET_THEMES['proyeccion-social'].accent).toBe('#17492F')
    expect(TICKET_THEMES.servicio.accent).toBe('#681030')
    expect(TICKET_THEMES['operacion-academica'].accent).toBe('#1A2946')
  })
})
