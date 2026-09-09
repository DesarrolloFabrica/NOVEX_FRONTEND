/**
 * Cara ilustrada de cada coordinación (CoordCards).
 *
 * Tabla EXPLÍCITA `code -> archivo`. No se deriva del nombre del fichero: los
 * assets llegaron con tres convenciones mezcladas (`b2b.png`, `SaberPro.png`,
 * `operacionAcademica.png`) y ninguno usa el code institucional, así que
 * cualquier derivación automática sería adivinación.
 *
 * Los PNG son PRESENTACIÓN. El nombre, el shortName, el code, el color
 * funcional y el estado operacional siguen viniendo del catálogo y del DTO,
 * nunca del texto horneado dentro de la imagen. Que la cara de
 * `coord-empresarial` diga «Transformación Empresarial» no renombra la
 * coordinación.
 */

const FACE_ROOT = '/CoordCards'

/**
 * EXCEPCIÓN, aislada por code y deliberadamente explícita.
 *
 * `coord-servicios` no tiene cara propia. Se intentó que compartiera la de
 * `coord-homologaciones`, y la revisión visual lo rechazó: la carta mostraba
 * «HOMOLOGACIONES» en el arte y «Servicios» en el nombre funcional, lo que se
 * lee como un error de identidad y no como una agrupación. Con las dos cartas
 * en la misma banda de la baraja en reposo, además, aparecían dos flamencos
 * idénticos a tres posiciones de distancia.
 *
 * Mientras no exista arte propio, esta coordinación cae a la presentación
 * legacy —isla, icono y nombre visible—, que sigue siendo suya y no de otra.
 * No se fabrica un PNG sustituto ni se toca el backend.
 */
const COORDINATIONS_WITHOUT_FACE: readonly string[] = ['coord-servicios']

/** 14 caras ilustradas; la coordinación 15 está en `COORDINATIONS_WITHOUT_FACE`. */
const COORDINATION_CARD_FACE: Readonly<Record<string, string>> = {
  'coord-general': 'coordinacionGeneral.png',
  'coord-b2b': 'b2b.png',
  'coord-bellas-artes': 'BellasArtes.png',
  'coord-desarrollo-profesional': 'DesarrolloProfesional.png',
  'coord-empresarial': 'transformacionEmpresarial.png',
  'coord-especializaciones': 'especializaciones.png',
  'coord-fabrica-contenidos': 'fabrica.png',
  'coord-homologaciones': 'Homologaciones.png',
  'coord-ingenierias': 'ingenierias.png',
  'coord-negocios': 'negocios.png',
  'coord-operaciones-academicas': 'operacionAcademica.png',
  'coord-proyeccion-social': 'ProyeccionSocial.png',
  'coord-saber-pro': 'SaberPro.png',
  'coord-transversales': 'Transversales.png',
}

/**
 * Ruta pública de la cara, o `null` si el code no tiene arte propio.
 *
 * `null` significa siempre «usa la presentación legacy de ESTA coordinación»,
 * nunca «usa la cara de otra». Una carta jamás debe mostrar una identidad
 * ajena: es peor que no mostrar ninguna, porque parece un error de datos.
 */
export function resolveCoordinationCardFace(code: string): string | null {
  const asset = COORDINATION_CARD_FACE[code]
  return asset ? `${FACE_ROOT}/${asset}` : null
}

/** Codes con cara ilustrada. Existe para que los tests puedan recorrerlos. */
export function getCoordinationCardFaceCodes(): readonly string[] {
  return Object.keys(COORDINATION_CARD_FACE)
}

/** Codes que, por decisión documentada, se presentan sin arte ilustrado. */
export function getCoordinationsWithoutFace(): readonly string[] {
  return COORDINATIONS_WITHOUT_FACE
}
