// Separación de materiales de la Sala Cunmark
// Marco sólido → lámina de cristal → contenido grabado.
// Sprint 4.3: lenguaje de superficies grabadas sin cajas flotantes.

// --- Plano 1: Marco físico (estructura metálica sólida) ---------------------

/** Cuerpo del marco: opaco, pesado, sin lectura de cristal. */
export const FRAME_MATERIAL_BODY =
  'bg-gradient-to-b from-[#141a24] via-[#0d1118] to-[#080b10]'

/** Bisel metálico superior del marco. */
export const FRAME_METALLIC_HIGHLIGHT =
  'shadow-[inset_0_1px_0_0_rgba(203,213,225,0.14),inset_0_2px_0_0_rgba(148,163,184,0.06)]'

/** Borde metálico frío (no vidrio). */
export const FRAME_METALLIC_RING = 'ring-1 ring-inset ring-slate-500/42'

/** Cavidad de encastre: hueco profundo donde asienta la lámina. */
export const FRAME_CAVITY_RECESS =
  'bg-[#05080e] shadow-[inset_0_4px_16px_-4px_rgba(0,0,0,0.72),inset_0_1px_0_0_rgba(0,0,0,0.5),inset_0_-1px_0_0_rgba(71,85,105,0.08)]'

// --- Plano 2: Cristal Maestro (lámina de vidrio arquitectónico) --------------
// Sprint 7.1: vidrio opal iluminado — blanco frío, transmisión radical.

/** Tinte inferior: refracción del canto — luz fría interna, sin azul ni gris. */
export const CRYSTAL_LAMINATE_TINT =
  'bg-[linear-gradient(180deg,transparent_0%,rgba(248,250,252,0.1)_28%,rgba(241,245,249,0.16)_100%)]'

/** Borde de lámina: arista de vidrio opal — espesor físico y luz atrapada. */
export const CRYSTAL_LAMINATE_EDGE =
  'shadow-[inset_0_3px_0_0_rgba(255,255,255,0.8),inset_0_-3px_0_0_rgba(100,116,139,0.24),inset_0_0_0_10px_rgba(148,163,184,0.18),inset_0_0_0_11px_rgba(71,85,105,0.14),inset_0_0_68px_-14px_rgba(255,255,255,0.22),inset_0_0_112px_-30px_rgba(248,250,252,0.1)]'

// --- Plano 3: Contenido grabado (inscrito en la superficie del vidrio) ------
// Sprint 7.2: tinta legible sobre cristal blanco — líneas y marcos visibles.

/** Campo grabado: regla técnica sobre luminancia alta. */
export const ETCHED_FIELD_RECESS =
  'shadow-[inset_0_1px_0_0_rgba(71,85,105,0.14)]'

/** Surco entre datos: línea de fresado visible. */
export const ETCHED_GROOVE_SHADOW =
  'shadow-[inset_0_1px_0_0_rgba(71,85,105,0.18)]'

/** Fresado de estación — canal grabado legible sobre blanco. */
export const ETCH_STATION_BEFORE =
  'before:pointer-events-none before:absolute before:inset-0 before:shadow-[inset_0_1px_0_0_rgba(71,85,105,0.08)]'

/** Fresado lateral — misma placa, reglas visibles. */
export const ETCH_STATION_SUPPORT_BEFORE =
  'before:pointer-events-none before:absolute before:inset-0 before:shadow-[inset_0_1px_0_0_rgba(71,85,105,0.07)]'

/** Franja de módulos: regla superior de canal. */
export const ETCH_MODULE_STRIP_BEFORE =
  'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-slate-500/18 before:to-transparent'

/** Lista de consola: línea de registro superior. */
export const ETCH_CONSOLE_LIST_BEFORE =
  'before:pointer-events-none before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-slate-500/16 before:to-transparent sm:before:inset-x-4'

/** Zona de consola central: canal mecanizado continuo. */
export const ETCH_CONSOLE_ZONE_BEFORE =
  'before:pointer-events-none before:absolute before:inset-0 before:shadow-[inset_0_1px_0_0_rgba(71,85,105,0.07)]'

/** Hover sobre elemento grabado — surco de respuesta. */
export const CRYSTAL_INTERACTION_HOVER =
  'hover:shadow-[inset_0_1px_0_0_rgba(71,85,105,0.2)]'

/** Campo de control incrustado. */
export const CRYSTAL_CONTROL_FIELD =
  'appearance-none bg-transparent shadow-[inset_0_0_0_1px_rgba(71,85,105,0.28)]'

/** Módulo activo: canal grabado — acento operativo visible. */
export const CRYSTAL_MODULE_ACTIVE_ETCH =
  'shadow-[inset_0_1px_0_0_rgba(47,158,58,0.35),inset_0_0_0_1px_rgba(63,194,74,0.22),inset_0_0_20px_-14px_rgba(163,255,92,0.08)]'

/** Módulo global activo. */
export const CRYSTAL_MODULE_GLOBAL_ACTIVE_ETCH =
  'shadow-[inset_0_1px_0_0_rgba(47,158,58,0.4),inset_0_0_0_1px_rgba(63,194,74,0.28),inset_0_0_24px_-12px_rgba(163,255,92,0.1)]'

/** Expediente proyectado: surco de envío. */
export const CRYSTAL_DOSSIER_PROJECT_ETCH =
  'shadow-[inset_3px_0_0_0_rgba(47,158,58,0.32),inset_0_1px_0_0_rgba(71,85,105,0.12)]'

// --- Sprint 5.1 / 6.2: Grabado arquitectónico — tinta sobre cristal ----------

/** Celda de módulo en reposo — marco fino impreso. */
export const CRYSTAL_MODULE_CELL_IDLE =
  'shadow-[inset_0_1px_0_0_rgba(71,85,105,0.16),inset_0_0_0_1px_rgba(100,116,139,0.14)]'

/** Celda activa — estación activada, acento operativo claro. */
export const CRYSTAL_MODULE_CELL_ACTIVE =
  'shadow-[inset_0_1px_0_0_rgba(47,158,58,0.38),inset_0_0_0_1px_rgba(63,194,74,0.28),inset_3px_0_0_0_rgba(47,158,58,0.22)]'

/** Canal de activación lateral del módulo. */
export const CRYSTAL_MODULE_ACTIVE_CHANNEL =
  'bg-gradient-to-b from-emerald-600/72 via-emerald-500/58 to-emerald-600/72'

/** Registro de expediente en reposo. */
export const CRYSTAL_DOSSIER_INSCRIPTION_IDLE =
  'shadow-[inset_3px_0_0_0_rgba(100,116,139,0.22)]'

/** Campo de lectura de la consola. */
export const CRYSTAL_CONSOLE_READING_FIELD =
  'shadow-[inset_0_1px_0_0_rgba(71,85,105,0.18),inset_1px_0_0_0_rgba(100,116,139,0.1),inset_-1px_0_0_0_rgba(100,116,139,0.1)]'

/** Select mecanizado. */
export const CRYSTAL_SELECT_MECHANICAL =
  'cursor-pointer shadow-[inset_0_0_0_1px_rgba(71,85,105,0.28)]'

/** Chip de estado — marco de sello técnico. */
export const CRYSTAL_STATUS_CHIP_BASE =
  'bg-transparent shadow-[inset_0_0_0_1px_rgba(71,85,105,0.3)]'

/** Monograma seleccionado. */
export const CRYSTAL_MONOGRAM_SELECTED =
  'bg-transparent text-emerald-700 shadow-[inset_0_0_0_1px_rgba(47,158,58,0.38)]'

/** Monograma global seleccionado. */
export const CRYSTAL_MONOGRAM_GLOBAL_SELECTED =
  'bg-transparent text-emerald-700 shadow-[inset_0_0_0_1px_rgba(47,158,58,0.42)]'

// --- Sprint 6.3 / 7.2: Tinta técnica sobre cristal blanco -------------------

/** Línea horizontal de dibujo técnico. */
export const INK_TECHNICAL_RULE_H =
  'bg-gradient-to-r from-transparent via-slate-500/38 to-transparent'

/** Línea vertical de dibujo técnico. */
export const INK_TECHNICAL_RULE_V =
  'bg-gradient-to-b from-transparent via-slate-500/34 to-transparent'

/** Marca de registro en retícula técnica. */
export const INK_REGISTRY_TICK =
  'bg-gradient-to-b from-slate-600/48 via-slate-500/34 to-slate-500/20'

/** Separador entre registros. */
export const INK_REGISTRY_DIVIDE =
  '[&>li]:relative [&>li+li]:shadow-[inset_0_1px_0_0_rgba(71,85,105,0.24)]'

/** Surco superior de celda de módulo. */
export const CRYSTAL_MODULE_CELL_TOP_GROOVE =
  'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-500/36 to-transparent'

/** Línea de registro superior del expediente. */
export const CRYSTAL_DOSSIER_INSCRIPTION_RULE =
  'pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-slate-500/32 to-transparent sm:inset-x-5'

/** Borde de estación lateral. */
export const CRYSTAL_STATION_EDGE_GROOVE =
  'pointer-events-none absolute inset-y-5 left-0 w-px bg-gradient-to-b from-transparent via-slate-500/34 to-transparent'

/** Monograma en reposo. */
export const CRYSTAL_MONOGRAM_IDLE =
  'bg-transparent text-slate-600 shadow-[inset_0_0_0_1px_rgba(71,85,105,0.28)]'

/** Monograma global en reposo. */
export const CRYSTAL_MONOGRAM_GLOBAL_IDLE =
  'bg-transparent text-slate-700 shadow-[inset_0_0_0_1px_rgba(71,85,105,0.32)]'

/** Acción de cabecera. */
export const CRYSTAL_HEADER_ACTION =
  'bg-transparent px-3 py-1.5 text-xs text-slate-700 shadow-[inset_0_0_0_1px_rgba(71,85,105,0.28)] transition-colors duration-200 hover:text-slate-900 hover:shadow-[inset_0_0_0_1px_rgba(51,65,85,0.38)]'

/** Acción secundaria de cabecera. */
export const CRYSTAL_HEADER_ACTION_QUIET =
  'text-xs text-slate-600 transition-colors duration-200 hover:text-slate-800'

/** Separador estructural entre expedientes — regla de registro. */
export const CRYSTAL_DOSSIER_DIVIDE = INK_REGISTRY_DIVIDE

// --- Sprint 7.3: Estación de trabajo unificada --------------------------------

/** Placa única: fresado continuo sobre toda la superficie operativa. */
export const ETCH_WORKSTATION_PLATE =
  'before:pointer-events-none before:absolute before:inset-0 before:shadow-[inset_0_1px_0_0_rgba(71,85,105,0.14),inset_1px_0_0_0_rgba(100,116,139,0.1),inset_-1px_0_0_0_rgba(100,116,139,0.1)]'

/** Retícula técnica global — geometría común, casi imperceptible. */
export const WORKSTATION_LATTICE_GRID =
  '[background-image:linear-gradient(rgba(71,85,105,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(71,85,105,0.055)_1px,transparent_1px)] [background-size:28px_28px]'

/** Canales verticales continuos — columnas de la estación (mismo tono que divisores). */
export const WORKSTATION_CHANNEL_VERTICAL =
  'lg:border-x lg:border-slate-500/12'

/** Canal mecanizado módulos → consola. */
export const WORKSTATION_MODULE_CONSOLE_CHANNEL =
  'relative h-px w-full shrink-0 bg-gradient-to-r from-transparent via-slate-500/42 to-transparent shadow-[inset_0_1px_0_0_rgba(71,85,105,0.2)]'

/** Pulso de carga: surco grabado, no bloque de relleno. */
export const CRYSTAL_SKELETON_PULSE =
  'cunmark-scan-skeleton__bar shadow-[inset_0_1px_0_0_rgba(203,213,225,0.1)]'
