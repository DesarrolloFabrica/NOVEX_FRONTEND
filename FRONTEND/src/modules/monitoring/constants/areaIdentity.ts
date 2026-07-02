// Identidad visual mínima por área (Sprint 7.1).
// Señales institucionales dentro del módulo operativo — sin catálogo de colores.

/** Variante de microdetalle geométrico del módulo. */
export type AreaGlyphVariant =
  | 'global'
  | 'academic'
  | 'factory'
  | 'innovation'
  | 'b2b'
  | 'service'
  | 'assessment'
  | 'social'
  | 'professional'

export interface AreaModuleIdentity {
  /** Monograma diferenciado (complementa el código, no lo reemplaza). */
  monogram: string
  /** Microdetalle geométrico grabado en el módulo. */
  glyph: AreaGlyphVariant
  /** Patrón lineal sutil en el borde inferior del módulo. */
  modulePattern: string
}

/**
 * Mapa visual por área institucional.
 * Tonos neutros (slate) — el estado operativo sigue siendo el acento principal.
 */
export const AREA_MODULE_IDENTITY: Record<string, AreaModuleIdentity> = {
  'area-vision-general': {
    monogram: 'VG',
    glyph: 'global',
    modulePattern:
      'bg-[linear-gradient(90deg,transparent_0%,rgba(148,163,184,0.2)_20%,rgba(148,163,184,0.28)_50%,rgba(148,163,184,0.2)_80%,transparent_100%)]',
  },
  'area-operacion-academica': {
    monogram: 'COA',
    glyph: 'academic',
    modulePattern:
      'bg-[repeating-linear-gradient(90deg,rgba(100,116,139,0.22)_0px,rgba(100,116,139,0.22)_6px,transparent_6px,transparent_12px)]',
  },
  'area-fabrica-desarrollo': {
    monogram: 'CFD',
    glyph: 'factory',
    modulePattern:
      'bg-[repeating-linear-gradient(90deg,rgba(100,116,139,0.18)_0px,rgba(100,116,139,0.18)_2px,transparent_2px,transparent_6px)]',
  },
  'area-innovacion-edu': {
    monogram: 'LIT',
    glyph: 'innovation',
    modulePattern:
      'bg-[linear-gradient(118deg,transparent_42%,rgba(100,116,139,0.2)_50%,transparent_58%)]',
  },
  'area-b2b': {
    monogram: 'B2B',
    glyph: 'b2b',
    modulePattern:
      'bg-[linear-gradient(90deg,transparent_8%,rgba(100,116,139,0.16)_8%,rgba(100,116,139,0.16)_12%,transparent_12%,transparent_88%,rgba(100,116,139,0.16)_88%,rgba(100,116,139,0.16)_92%,transparent_92%)]',
  },
  'area-servicio': {
    monogram: 'LSV',
    glyph: 'service',
    modulePattern:
      'bg-[radial-gradient(ellipse_80%_40%_at_50%_100%,rgba(100,116,139,0.18)_0%,transparent_70%)]',
  },
  'area-pruebas-saber': {
    monogram: 'CPS',
    glyph: 'assessment',
    modulePattern:
      'bg-[linear-gradient(90deg,transparent_0%,rgba(100,116,139,0.16)_35%,rgba(100,116,139,0.16)_50%,rgba(100,116,139,0.16)_65%,transparent_100%)]',
  },
  'area-proyeccion-social': {
    monogram: 'CPO',
    glyph: 'social',
    modulePattern:
      'bg-[repeating-radial-gradient(circle_at_50%_100%,rgba(100,116,139,0.14)_0px,rgba(100,116,139,0.14)_1px,transparent_1px,transparent_5px)]',
  },
  'area-desarrollo-profesional': {
    monogram: 'CDP',
    glyph: 'professional',
    modulePattern:
      'bg-[linear-gradient(14deg,transparent_55%,rgba(100,116,139,0.18)_56%,rgba(100,116,139,0.18)_58%,transparent_59%,transparent_72%,rgba(100,116,139,0.16)_73%,rgba(100,116,139,0.16)_75%,transparent_76%)]',
  },
}

const FALLBACK_IDENTITY: AreaModuleIdentity = {
  monogram: 'AR',
  glyph: 'academic',
  modulePattern: 'bg-gradient-to-r from-transparent via-slate-500/32 to-transparent',
}

/** Resuelve la identidad visual mínima de un área para el módulo operativo. */
export function getAreaModuleIdentity(areaId: string, areaCode: string): AreaModuleIdentity {
  const identity = AREA_MODULE_IDENTITY[areaId]
  if (identity) return identity

  return {
    ...FALLBACK_IDENTITY,
    monogram: areaCode.slice(0, 3).toUpperCase(),
  }
}
