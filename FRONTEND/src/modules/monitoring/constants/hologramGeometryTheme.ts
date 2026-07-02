// Geometría física del Holograma Operativo (Sprint 12.3).
// Chamfer, capas de relieve y ancho — sin alterar cromática ni lógica.

/** Esquinas cortadas — mismo lenguaje que el Cristal Maestro, escala compacta. */
export const HOLOGRAM_CHAMFER_OUTER = 'hologram-chamfer-outer'

/** Recorte interior para marcos de revelado. */
export const HOLOGRAM_CHAMFER_INNER = 'hologram-chamfer-inner'

/** Contenedor del volumen proyectado — clip + capas; ancho lo fija el padre (12.4C). */
export const HOLOGRAM_PANEL_SHELL = 'relative h-full w-full overflow-hidden'

/** Inset del primer marco interno (relieve exterior). */
export const HOLOGRAM_INNER_REVEAL_INSET = 'inset-[3px]'

/** Inset del segundo marco interno (cavidad). */
export const HOLOGRAM_INNER_CAVITY_INSET = 'inset-[6px]'
