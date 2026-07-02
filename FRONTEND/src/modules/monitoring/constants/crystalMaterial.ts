// Material del Cristal Maestro — vidrio arquitectónico.
// Sprint 7.1: superficie óptica iluminada — panel opal retroiluminado, blanco frío.
// Sprint 10.5B: bisel mecanizado, relieve perimetral y borde interior de tres planos.
// La luz inunda casi toda la losa; los bordes conservan espesor sin volver al gris.

/** Inundación opal: luminancia de campo completo — la losa entera emite luz interna. */
export const CRYSTAL_OPAL_FLOOD =
  'bg-[radial-gradient(ellipse_160%_140%_at_50%_48%,rgba(255,255,255,0.44)_0%,rgba(252,253,255,0.38)_32%,rgba(248,250,252,0.3)_58%,rgba(245,247,250,0.22)_82%,rgba(241,245,249,0.16)_100%)]'

/** Mapa de luminancia base: superficie opal — sin gris ni slate en el cuerpo. */
export const CRYSTAL_BODY_BASE =
  'bg-[radial-gradient(ellipse_150%_125%_at_50%_46%,rgba(255,255,255,0.5)_0%,rgba(252,253,255,0.42)_28%,rgba(248,250,252,0.34)_52%,rgba(245,247,250,0.26)_76%,rgba(241,245,249,0.18)_100%)]'

/** Scattering interno: luz atrapada difundida por todo el volumen del vidrio. */
export const CRYSTAL_BODY_DEPTH =
  'bg-[radial-gradient(ellipse_145%_120%_at_50%_46%,rgba(255,255,255,0.28)_0%,rgba(252,253,255,0.22)_40%,rgba(248,250,252,0.16)_68%,rgba(245,247,250,0.1)_88%,transparent_100%)]'

/** Transmisión interna: energía que atraviesa toda la losa desde el núcleo. */
export const CRYSTAL_AMBIENT_TRANSMISSION =
  'bg-[radial-gradient(ellipse_140%_115%_at_50%_48%,rgba(255,255,255,0.36)_0%,rgba(252,253,255,0.28)_25%,rgba(248,250,252,0.2)_50%,rgba(245,247,250,0.14)_72%,rgba(241,245,249,0.08)_92%,transparent_100%)]'

/** Difusión de cara: velo opal uniforme sobre toda la superficie. */
export const CRYSTAL_FACE_EXTERIOR =
  'bg-[radial-gradient(ellipse_155%_135%_at_50%_50%,rgba(255,255,255,0.18)_0%,rgba(252,253,255,0.12)_55%,rgba(248,250,252,0.06)_85%,transparent_100%)]'

/** Núcleo emisor: máxima energía central — domina y alimenta el resto de la losa. */
export const CRYSTAL_CLEAR_CORE =
  'bg-[radial-gradient(ellipse_110%_95%_at_50%_46%,rgba(255,255,255,0.48)_0%,rgba(255,255,255,0.36)_22%,rgba(252,253,255,0.26)_42%,rgba(248,250,252,0.18)_62%,rgba(245,247,250,0.1)_80%,rgba(241,245,249,0.05)_94%,transparent_100%)]'

/** Variación de superficie mínima — integrada al campo luminoso. */
export const CRYSTAL_SPECULAR_STREAK =
  'bg-[linear-gradient(118deg,transparent_38%,rgba(255,255,255,0.08)_48%,rgba(252,253,255,0.04)_50%,transparent_58%)]'

/** Espesor de losa: aristas visibles + volumen interno de luz contenida. */
export const CRYSTAL_SLAB_THICKNESS =
  'shadow-[inset_0_3px_0_0_rgba(255,255,255,0.76),inset_0_-3px_0_0_rgba(100,116,139,0.26),inset_0_5px_14px_-10px_rgba(51,65,85,0.14),inset_0_0_76px_-26px_rgba(255,255,255,0.2)]'

/** Canto superior: highlight mecanizado — arista iluminada, no glow. */
export const CRYSTAL_EDGE_SHEEN =
  'bg-[radial-gradient(ellipse_120%_50%_at_50%_0%,rgba(255,255,255,0.46)_0%,rgba(252,253,255,0.24)_32%,rgba(248,250,252,0.08)_58%,transparent_82%)]'

/** Highlight superior de cara frontal — fresado de precisión. */
export const CRYSTAL_MACHINED_TOP_HIGHLIGHT =
  'bg-[linear-gradient(180deg,rgba(255,255,255,0.42)_0%,rgba(248,250,252,0.16)_22%,rgba(241,245,249,0.05)_40%,transparent_52%)]'

/** Atenuación periférica — bisel exterior mecanizado (Plano 1). */
export const CRYSTAL_EDGE_VEIL =
  'bg-[radial-gradient(ellipse_128%_112%_at_50%_50%,transparent_58%,rgba(148,163,184,0.1)_82%,rgba(100,116,139,0.18)_100%)]'

/** Bisel exterior: anillo mecanizado alrededor del cristal (solo espesor visual). */
export const CRYSTAL_EXTERIOR_BEVEL =
  'shadow-[inset_0_0_0_9px_rgba(148,163,184,0.22),inset_0_0_0_10px_rgba(71,85,105,0.18),inset_0_1px_0_0_rgba(226,232,240,0.28),inset_0_-2px_0_0_rgba(51,65,85,0.26),inset_2px_0_0_0_rgba(226,232,240,0.14),inset_-2px_0_0_0_rgba(71,85,105,0.2)]'

/** Relieve perimetral: cara frontal elevada respecto al bisel (Plano 2). */
export const CRYSTAL_FACE_PLANE_RELIEF =
  'shadow-[inset_0_2px_0_0_rgba(255,255,255,0.48),inset_0_-2px_0_0_rgba(100,116,139,0.2),inset_0_6px_16px_-14px_rgba(51,65,85,0.1)]'

/** Borde interior: transición fina entre bisel y superficie útil (Plano 3). */
export const CRYSTAL_INNER_REVEAL_LINE =
  'ring-1 ring-inset ring-slate-500/52 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.36),inset_0_-1px_0_0_rgba(71,85,105,0.14)]'

/** Sombra interior de cavidad — profundidad mecanizada bajo la cara frontal. */
export const CRYSTAL_INNER_CAVITY_SHADOW =
  'shadow-[inset_0_4px_18px_-12px_rgba(51,65,85,0.16)]'

/** Clip de esquinas cortadas — forma 10.5A (solo geometría, sin cambiar caja). */
export const CRYSTAL_CHAMFER_CLIP = 'crystal-chamfer-outer'

/** Clip interior para el borde de revelado (chamfer ligeramente menor). */
export const CRYSTAL_CHAMFER_CLIP_INNER = 'crystal-chamfer-inner'

// --- Surcos mecanizados (relieve integrado, no líneas repetidas) --------------

/** Labio superior del surco (micro-reflejo en el material). */
export const CRYSTAL_GROOVE_LIP =
  'bg-gradient-to-r from-transparent via-slate-300/22 to-transparent'

/** Lecho del surco (sombra interior del fresado). */
export const CRYSTAL_GROOVE_BED =
  'bg-gradient-to-r from-transparent via-slate-500/26 to-transparent shadow-[0_1px_2px_-1px_rgba(30,41,59,0.16)]'

/** Pared sombra bajo el surco. */
export const CRYSTAL_GROOVE_SHADOW =
  'bg-gradient-to-r from-transparent via-slate-600/22 to-transparent'

/** Surco vertical: labio iluminado. */
export const CRYSTAL_GROOVE_V_LIP =
  'bg-gradient-to-b from-transparent via-slate-300/20 to-transparent'

/** Surco vertical: lecho. */
export const CRYSTAL_GROOVE_V_BED =
  'bg-gradient-to-b from-transparent via-slate-500/24 to-transparent'

/** Surco vertical: pared de sombra. */
export const CRYSTAL_GROOVE_V_SHADOW =
  'bg-gradient-to-b from-transparent via-slate-600/20 to-transparent'

/** Remate de esquina mecanizado (no borde dibujado). */
export const CRYSTAL_CORNER_MACHINED_LIGHT =
  'bg-[linear-gradient(135deg,rgba(248,250,252,0.5)_0%,rgba(226,232,240,0.18)_32%,transparent_52%)]'

export const CRYSTAL_CORNER_MACHINED_SHADOW =
  'bg-[linear-gradient(315deg,rgba(51,65,85,0.2)_0%,rgba(71,85,105,0.1)_28%,transparent_50%)]'

/** Tick de unión grabado en el material. */
export const CRYSTAL_JOINT_TICK =
  'bg-gradient-to-b from-slate-400/36 via-slate-500/28 to-slate-600/18 shadow-[0_0_1px_0_rgba(30,41,59,0.2)]'
