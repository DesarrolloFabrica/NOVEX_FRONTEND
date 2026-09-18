/**
 * Temas ticket del shell operacional (fase 4).
 *
 * Estructura compartida (papel, marco, tipografía) vs identidad por coordinación
 * (tinta, watermark, adornos). Solo los codes registrados activan el marco;
 * el resto conserva el look oscuro estándar.
 */

export type TicketThemeId = 'fabrica' | 'saber-pro'

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
  /** Adornos por variante de panel; 1–2 motivos. */
  ornaments: Record<TicketPanelVariant, readonly TicketOrnamentSlot[]>
}

const FABRICA_CUT = '/assets/tickets/fabrica/cut'
const SABER_CUT = '/assets/tickets/saber-pro/cut'

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
        /* Character: un solo laurel, contenido. */
        character: [{ src: `${SABER_CUT}/ornament-laurel.png`, corner: 'bl' }],
        /* Reports: checklist + sello de verificación. */
        reports: [
          { src: `${SABER_CUT}/ornament-checklist.png`, corner: 'bl' },
          { src: `${SABER_CUT}/ornament-check-seal.png`, corner: 'br' },
        ],
        /* Problems: sello + laurel (sin conchas). */
        problems: [
          { src: `${SABER_CUT}/ornament-check-seal.png`, corner: 'bl' },
          { src: `${SABER_CUT}/ornament-laurel.png`, corner: 'br' },
        ],
        /* Action: laurel+estrella arriba, checklist abajo. */
        action: [
          { src: `${SABER_CUT}/ornament-checklist.png`, corner: 'bl' },
          { src: `${SABER_CUT}/ornament-laurel.png`, corner: 'tr' },
        ],
      },
    },
  }

/** Codes de catálogo → tema ticket. Sin entrada = sin tema. */
const TICKET_THEME_BY_CODE: Readonly<Record<string, TicketThemeId>> = {
  'coord-fabrica-contenidos': 'fabrica',
  'coord-saber-pro': 'saber-pro',
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
