// Escala de planos visuales O.M.E.G.A. (Sprint 4.2).
// Fondo → marco → cristal → contenido grabado → plataforma → holograma.
// Solo presentación: z-index, sombras y opacidad — sin alterar layout.

/** Plano 0 — Fondo de la Sala (más lejano al operador). */
export const PLANE_ROOM = 'isolate'

/** Viñeta radial: caída de luz suave en bordes — sala amplia, no cueva oscura. */
export const ROOM_VIGNETTE =
  'pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_118%_88%_at_50%_38%,transparent_68%,rgba(14,18,24,0.12)_100%)] lg:bg-[radial-gradient(ellipse_124%_90%_at_50%_40%,transparent_72%,rgba(14,18,24,0.1)_100%)]'

/** Plano 1 — Marco (sostén físico del cristal). */
export const PLANE_FRAME = 'relative z-10'

/** Elevación del marco respecto al fondo de la sala (sombra más difusa). */
export const FRAME_PLANE_LIFT =
  'shadow-[0_8px_22px_-42px_rgba(0,0,0,0.24),inset_0_1px_0_0_rgba(203,213,225,0.1)]'

/** Cavidad interior del marco donde encaja la lámina de cristal. */
export const FRAME_INNER_CAVITY =
  'rounded-xl bg-[#05080e] shadow-[inset_0_3px_12px_-6px_rgba(0,0,0,0.58),inset_0_1px_0_0_rgba(0,0,0,0.42),inset_0_-1px_0_0_rgba(71,85,105,0.06)]'

/** Plano 2 — Cristal Maestro (lámina entre marco y contenido). */
export const PLANE_CRYSTAL = 'relative z-20'

/** Separación de la lámina respecto a la cavidad oscura — emisión opal dominante. */
export const CRYSTAL_PLANE_LIFT =
  'shadow-[0_8px_22px_-32px_rgba(226,232,240,0.34),0_0_44px_-44px_rgba(248,250,252,0.18),inset_0_2px_0_0_rgba(255,255,255,0.58),inset_0_-2px_0_0_rgba(148,163,184,0.14)]'

/** Plano 3 — Contenido grabado (inscrito en el cristal, no flotante). */
export const PLANE_ETCHED = 'relative z-[22]'

/** Campo grabado: continuidad de la losa — regla técnica visible. */
export const PLANE_ETCHED_FIELD =
  'shadow-[inset_0_1px_0_0_rgba(71,85,105,0.14)]'

/** Plano 4 — Plataforma de proyección (delante del cristal). */
export const PLANE_PLATFORM = 'relative z-40'

/** Plataforma en espera: presencia sutil pero legible sobre el cristal. */
export const PLATFORM_PLANE_IDLE =
  'max-lg:drop-shadow-[0_8px_24px_-10px_rgba(0,0,0,0.42)]'

/** Elevación de la plataforma sobre el cristal (expediente activo). */
export const PLATFORM_PLANE_LIFT =
  'max-lg:drop-shadow-[0_16px_40px_-10px_rgba(0,0,0,0.72)]'

/** Plano 5 — Holograma (más cercano al operador). */
export const PLANE_HOLOGRAM = 'relative z-50'

/** Contenedor de capa de proyección en la sala (Sprint 9.2B: primer plano flotante). */
export const PLANE_PROJECTION_STACK = 'isolate'
