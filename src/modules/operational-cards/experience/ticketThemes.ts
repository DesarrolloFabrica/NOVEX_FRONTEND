/**
 * Temas ticket del shell operacional (fases 4–5).
 *
 * Estructura compartida (papel, marco, tipografía) vs identidad por coordinación
 * (tinta, watermark, adornos). Solo los codes registrados activan el marco;
 * el resto conserva el look oscuro estándar.
 */

export type TicketThemeId =
  | 'fabrica'
  | 'saber-pro'
  | 'especializaciones'
  | 'desarrollo-profesional'
  | 'b2b'
  | 'general'
  | 'proyeccion-social'
  | 'servicio'
  | 'operacion-academica'

export type TicketPanelVariant =
  | 'character'
  | 'reports'
  | 'problems'
  | 'action'

export type TicketOrnamentCorner = 'bl' | 'br' | 'tl' | 'tr'

export type TicketOrnamentSlot = {
  src: string
  corner: TicketOrnamentCorner
}

export type TicketThemeDefinition = {
  id: TicketThemeId
  /** Tinta de marco/botones (presentacional; no es color de catálogo). */
  accent: string
  /** Tinta profunda para filetes, foco y énfasis. */
  accentDeep: string
  /** Marca de agua (PNG con alpha). */
  watermark: string
  /** Adornos por variante de panel; 1–3 motivos. */
  ornaments: Record<TicketPanelVariant, readonly TicketOrnamentSlot[]>
}

const FABRICA_CUT = '/assets/tickets/fabrica/cut'
const SABER_CUT = '/assets/tickets/saber-pro/cut'
const ESPECIALIZACIONES_CUT = '/assets/tickets/especializaciones/cut'
const DESARROLLO_PROFESIONAL_CUT = '/assets/tickets/desarrollo-profesional/cut'
const B2B_CUT = '/assets/tickets/b2b/cut'
const GENERAL_CUT = '/assets/tickets/general/cut'
const PROYECCION_SOCIAL_CUT = '/assets/tickets/proyeccion-social/cut'
const SERVICIO_CUT = '/assets/tickets/servicio/cut'
const OPERACION_ACADEMICA_CUT = '/assets/tickets/operacion-academica/cut'

/**
 * Identidades registradas. Ampliar aquí —no duplicar componente ni hoja CSS—
 * cuando se apruebe arte de otra coordinación.
 */
export const TICKET_THEMES: Readonly<Record<TicketThemeId, TicketThemeDefinition>> =
  {
    fabrica: {
      id: 'fabrica',
      accent: '#1a9aa6',
      accentDeep: '#0c5f68',
      watermark: `${FABRICA_CUT}/watermark-seal.png`,
      ornaments: {
        character: [
          { src: `${FABRICA_CUT}/ornament-bottom-left.png`, corner: 'bl' },
        ],
        reports: [
          { src: `${FABRICA_CUT}/ornament-bottom-left.png`, corner: 'bl' },
          { src: `${FABRICA_CUT}/ornament-bottom-right.png`, corner: 'br' },
        ],
        problems: [
          { src: `${FABRICA_CUT}/ornament-bottom-left.png`, corner: 'bl' },
          { src: `${FABRICA_CUT}/ornament-bottom-right.png`, corner: 'br' },
        ],
        action: [
          { src: `${FABRICA_CUT}/ornament-bottom-left.png`, corner: 'bl' },
          { src: `${FABRICA_CUT}/ornament-header.png`, corner: 'tr' },
        ],
      },
    },
    'saber-pro': {
      id: 'saber-pro',
      /* Oliva mate de la cara; distinto del #9ACD50 canónico y del ESTABLE. */
      accent: '#5C5E2C',
      accentDeep: '#2D3325',
      watermark: `${SABER_CUT}/watermark-meerkat.png`,
      ornaments: {
        character: [{ src: `${SABER_CUT}/ornament-laurel.png`, corner: 'bl' }],
        reports: [
          { src: `${SABER_CUT}/ornament-checklist.png`, corner: 'bl' },
          { src: `${SABER_CUT}/ornament-check-seal.png`, corner: 'br' },
        ],
        problems: [
          { src: `${SABER_CUT}/ornament-check-seal.png`, corner: 'bl' },
          { src: `${SABER_CUT}/ornament-laurel.png`, corner: 'br' },
        ],
        action: [
          { src: `${SABER_CUT}/ornament-checklist.png`, corner: 'bl' },
          { src: `${SABER_CUT}/ornament-laurel.png`, corner: 'tr' },
        ],
      },
    },
    especializaciones: {
      id: 'especializaciones',
      /*
       * Granate de la carta (#7B110D), no el canónico #FF626A ni el CRÍTICO
       * #f46068. Solo tinta de marco/CTA; aura de carta sigue en catálogo.
       */
      accent: '#7B110D',
      accentDeep: '#3A0C0A',
      watermark: `${ESPECIALIZACIONES_CUT}/watermark-falcon.png`,
      ornaments: {
        character: [
          { src: `${ESPECIALIZACIONES_CUT}/ornament-mortarboard.png`, corner: 'bl' },
        ],
        reports: [
          { src: `${ESPECIALIZACIONES_CUT}/ornament-books.png`, corner: 'bl' },
          { src: `${ESPECIALIZACIONES_CUT}/ornament-ribbon-star.png`, corner: 'br' },
        ],
        problems: [
          { src: `${ESPECIALIZACIONES_CUT}/ornament-chart-rise.png`, corner: 'bl' },
          { src: `${ESPECIALIZACIONES_CUT}/ornament-globe.png`, corner: 'br' },
        ],
        /* Action: birrete arriba, libros + gráfica abajo (sin motivos ajenos). */
        action: [
          { src: `${ESPECIALIZACIONES_CUT}/ornament-books.png`, corner: 'bl' },
          { src: `${ESPECIALIZACIONES_CUT}/ornament-chart-rise.png`, corner: 'br' },
          { src: `${ESPECIALIZACIONES_CUT}/ornament-mortarboard.png`, corner: 'tr' },
        ],
      },
    },
    'desarrollo-profesional': {
      id: 'desarrollo-profesional',
      /*
       * Púrpura de marco/CTA (#5C2E58), no el canónico #B267FF de carta/aura.
       * Distinto de CRÍTICO/ALERTA/ESTABLE/DESCONOCIDO.
       */
      accent: '#5C2E58',
      accentDeep: '#3A1C35',
      watermark: `${DESARROLLO_PROFESIONAL_CUT}/watermark-butterfly.png`,
      ornaments: {
        character: [
          {
            src: `${DESARROLLO_PROFESIONAL_CUT}/ornament-corner-star.png`,
            corner: 'bl',
          },
        ],
        reports: [
          {
            src: `${DESARROLLO_PROFESIONAL_CUT}/ornament-climber-steps.png`,
            corner: 'bl',
          },
          {
            src: `${DESARROLLO_PROFESIONAL_CUT}/ornament-sun-rays.png`,
            corner: 'br',
          },
        ],
        problems: [
          {
            src: `${DESARROLLO_PROFESIONAL_CUT}/ornament-stepped-arrow.png`,
            corner: 'bl',
          },
          {
            src: `${DESARROLLO_PROFESIONAL_CUT}/ornament-corner-star.png`,
            corner: 'br',
          },
        ],
        /* Action: sun-rays arriba, climber abajo; mariposa como watermark. */
        action: [
          {
            src: `${DESARROLLO_PROFESIONAL_CUT}/ornament-climber-steps.png`,
            corner: 'bl',
          },
          {
            src: `${DESARROLLO_PROFESIONAL_CUT}/ornament-sun-rays.png`,
            corner: 'tr',
          },
        ],
      },
    },
    b2b: {
      id: 'b2b',
      /*
       * Caoba de la carta (#551C19), no el canónico #FF5F66 ni el logo #AA0919
       * ni el CRÍTICO #f46068. Aura de carta sigue en catálogo.
       */
      accent: '#551C19',
      accentDeep: '#2E0C0B',
      watermark: `${B2B_CUT}/watermark-woodpecker.png`,
      ornaments: {
        character: [
          { src: `${B2B_CUT}/ornament-four-point-star.png`, corner: 'bl' },
        ],
        reports: [
          { src: `${B2B_CUT}/ornament-corner-quotes.png`, corner: 'bl' },
          { src: `${B2B_CUT}/ornament-globe-lines.png`, corner: 'br' },
        ],
        problems: [
          { src: `${B2B_CUT}/ornament-speech-bubbles.png`, corner: 'bl' },
          { src: `${B2B_CUT}/ornament-four-point-star.png`, corner: 'br' },
        ],
        /* Action: globo abajo, regla arriba; carpintero como watermark. */
        action: [
          { src: `${B2B_CUT}/ornament-globe-lines.png`, corner: 'bl' },
          { src: `${B2B_CUT}/ornament-rule-dot.png`, corner: 'tr' },
        ],
      },
    },
    general: {
      id: 'general',
      /*
       * Ocre de marco/CTA (#7A5708), no el amarillo del logo #EC9B07 (PNG),
       * ni ALERTA #F0B054, ni el canónico #28C8F4. Aura sigue en catálogo.
       */
      accent: '#7A5708',
      accentDeep: '#3C2A05',
      watermark: `${GENERAL_CUT}/watermark-giraffe.png`,
      ornaments: {
        character: [
          { src: `${GENERAL_CUT}/ornament-corner-star.png`, corner: 'bl' },
        ],
        reports: [
          { src: `${GENERAL_CUT}/ornament-team.png`, corner: 'bl' },
          { src: `${GENERAL_CUT}/ornament-target.png`, corner: 'br' },
        ],
        problems: [
          { src: `${GENERAL_CUT}/ornament-org-nodes.png`, corner: 'bl' },
          { src: `${GENERAL_CUT}/ornament-route.png`, corner: 'br' },
        ],
        /* Action: ruta abajo, estrella arriba; jirafa como watermark. */
        action: [
          { src: `${GENERAL_CUT}/ornament-route.png`, corner: 'bl' },
          { src: `${GENERAL_CUT}/ornament-corner-star.png`, corner: 'tr' },
        ],
      },
    },
    'proyeccion-social': {
      id: 'proyeccion-social',
      /*
       * Verde bosque de marco/CTA (#17492F), no el logo #006633 (PNG),
       * ni ESTABLE #7AC48A, ni el canónico #88AD5A. Aura sigue en catálogo.
       */
      accent: '#17492F',
      accentDeep: '#0A2E1C',
      watermark: `${PROYECCION_SOCIAL_CUT}/watermark-hummingbird.png`,
      ornaments: {
        character: [
          {
            src: `${PROYECCION_SOCIAL_CUT}/ornament-corner-star.png`,
            corner: 'bl',
          },
        ],
        reports: [
          {
            src: `${PROYECCION_SOCIAL_CUT}/ornament-leaf-vine.png`,
            corner: 'bl',
          },
          {
            src: `${PROYECCION_SOCIAL_CUT}/ornament-heart.png`,
            corner: 'br',
          },
        ],
        problems: [
          {
            src: `${PROYECCION_SOCIAL_CUT}/ornament-people-leaf.png`,
            corner: 'bl',
          },
          {
            src: `${PROYECCION_SOCIAL_CUT}/ornament-social-globe.png`,
            corner: 'br',
          },
        ],
        /* Action: people-leaf abajo, estrella arriba; colibrí como watermark. */
        action: [
          {
            src: `${PROYECCION_SOCIAL_CUT}/ornament-people-leaf.png`,
            corner: 'bl',
          },
          {
            src: `${PROYECCION_SOCIAL_CUT}/ornament-corner-star.png`,
            corner: 'tr',
          },
        ],
      },
    },
    servicio: {
      id: 'servicio',
      /*
       * Marco/CTA vino oscuro (#681030), no la tinta PNG #C11B76, ni el coral
       * Homologaciones #FF6978, ni el canónico de arte/aura #C050FF.
       * Activador: coord-homologaciones (nodo producto «Servicio»).
       * No registrar coord-servicios: es artCode/legacy, no data-code de mesa.
       */
      accent: '#681030',
      accentDeep: '#3A0A22',
      watermark: `${SERVICIO_CUT}/watermark-flamingo.png`,
      ornaments: {
        character: [
          { src: `${SERVICIO_CUT}/ornament-corner-star.png`, corner: 'bl' },
        ],
        reports: [
          { src: `${SERVICIO_CUT}/ornament-open-hand.png`, corner: 'bl' },
          { src: `${SERVICIO_CUT}/ornament-location-pin.png`, corner: 'br' },
        ],
        problems: [
          { src: `${SERVICIO_CUT}/ornament-care-heart.png`, corner: 'bl' },
          { src: `${SERVICIO_CUT}/ornament-handshake.png`, corner: 'br' },
        ],
        /* Action: handshake abajo, estrella arriba; flamenco como watermark. */
        action: [
          { src: `${SERVICIO_CUT}/ornament-handshake.png`, corner: 'bl' },
          { src: `${SERVICIO_CUT}/ornament-corner-star.png`, corner: 'tr' },
        ],
      },
    },
    'operacion-academica': {
      id: 'operacion-academica',
      /*
       * Marco/CTA índigo de campo (#1A2946), no la tinta PNG #283063, ni el
       * canónico #8FA7C8 (cerca de DESCONOCIDO). Activador solo del padre:
       * coord-operaciones-academicas. Las cinco escuelas no heredan tema.
       */
      accent: '#1A2946',
      accentDeep: '#0F1A2E',
      watermark: `${OPERACION_ACADEMICA_CUT}/watermark-wolf.png`,
      ornaments: {
        character: [
          {
            src: `${OPERACION_ACADEMICA_CUT}/ornament-five-school-fan.png`,
            corner: 'bl',
          },
        ],
        reports: [
          {
            src: `${OPERACION_ACADEMICA_CUT}/ornament-academic-hub.png`,
            corner: 'bl',
          },
        ],
        problems: [
          {
            src: `${OPERACION_ACADEMICA_CUT}/ornament-five-school-chain.png`,
            corner: 'bl',
          },
          {
            src: `${OPERACION_ACADEMICA_CUT}/ornament-five-point-rosette.png`,
            corner: 'br',
          },
        ],
        /* Action: hub TR, roseta BR; lobo watermark en BL (hocico al centro). */
        action: [
          {
            src: `${OPERACION_ACADEMICA_CUT}/ornament-academic-hub.png`,
            corner: 'tr',
          },
          {
            src: `${OPERACION_ACADEMICA_CUT}/ornament-five-point-rosette.png`,
            corner: 'br',
          },
        ],
      },
    },
  }

/** Codes de catálogo → tema ticket. Sin entrada = sin tema. */
const TICKET_THEME_BY_CODE: Readonly<Record<string, TicketThemeId>> = {
  'coord-fabrica-contenidos': 'fabrica',
  'coord-saber-pro': 'saber-pro',
  'coord-especializaciones': 'especializaciones',
  'coord-desarrollo-profesional': 'desarrollo-profesional',
  'coord-b2b': 'b2b',
  'coord-general': 'general',
  'coord-proyeccion-social': 'proyeccion-social',
  'coord-homologaciones': 'servicio',
  'coord-operaciones-academicas': 'operacion-academica',
}

/**
 * Resuelve el tema ticket a partir del code de coordinación seleccionado.
 * `null` / vacío / code no registrado → sin tema (look oscuro).
 */
export function resolveTicketTheme(
  coordinationCode: string | null | undefined,
): TicketThemeId | undefined {
  if (!coordinationCode) return undefined
  return TICKET_THEME_BY_CODE[coordinationCode]
}

export function getTicketTheme(
  themeId: TicketThemeId,
): TicketThemeDefinition {
  return TICKET_THEMES[themeId]
}
