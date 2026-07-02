// Microactividad operativa de la Sala (Sprint 5.2).
// Clases CSS para respiración institucional — solo presentación.
// Ver keyframes en src/index.css.

/** Fondo de la Sala — respiración ambiental mínima (16s / 18s). */
export const ROOM_BREATH_OVERLAY = 'omega-breath-room-overlay'
export const ROOM_BREATH_DEPTH = 'omega-breath-room-depth'

/** Cristal Maestro — reflejo y luminosidad (13–17s). */
export const CRYSTAL_BREATH_SHEEN = 'omega-breath-crystal-sheen'
export const CRYSTAL_BREATH_FACE = 'omega-breath-crystal-face'
export const CRYSTAL_BREATH_AMBIENT = 'omega-breath-crystal-ambient'
export const CRYSTAL_BREATH_BEVEL = 'omega-breath-crystal-bevel'

/** Marco físico — reflejo metálico (18s). */
export const FRAME_BREATH_HIGHLIGHT = 'omega-breath-frame'

/** Plataforma — pulso de intensidad en reposo (13s) y activa (11s). */
export const PLATFORM_BREATH_IDLE = 'omega-breath-platform-idle'
export const PLATFORM_BREATH_ACTIVE = 'omega-breath-platform-active'

/** Holograma — solo material proyectado (11–15s). */
export const HOLOGRAM_BREATH_MATERIAL_IDLE = 'omega-breath-hologram-idle'
export const HOLOGRAM_BREATH_MATERIAL_ACTIVE = 'omega-breath-hologram-active'
export const HOLOGRAM_BREATH_BEAM_IDLE = 'omega-breath-hologram-beam-idle'
export const HOLOGRAM_BREATH_BEAM_ACTIVE = 'omega-breath-hologram-beam-active'

/** Velo de halo del volumen holográfico (gradiente estático, opacidad animada). */
export const HOLOGRAM_BREATH_HALO_IDLE =
  'pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_64%_46%_at_50%_6%,rgba(165,180,252,0.16)_0%,transparent_58%)]'

export const HOLOGRAM_BREATH_HALO_ACTIVE =
  'pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_66%_48%_at_50%_6%,rgba(196,181,253,0.2)_0%,transparent_56%)]'
