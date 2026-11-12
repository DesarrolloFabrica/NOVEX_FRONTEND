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
 * Codes que, por decisión documentada, se presentan sin arte ilustrado.
 *
 * Vacío: las quince coordinaciones tienen cara propia. Se conserva el array
 * (y su getter) para que un code futuro sin arte se declare aquí de forma
 * explícita, nunca por omisión en la tabla de abajo.
 */
const COORDINATIONS_WITHOUT_FACE: readonly string[] = []

/** 15 caras ilustradas; ninguna coordinación queda en `COORDINATIONS_WITHOUT_FACE`. */
const COORDINATION_CARD_FACE: Readonly<Record<string, string>> = {
  'coord-general': 'coordinacionGeneral.webp',
  'coord-b2b': 'b2b.webp',
  'coord-bellas-artes': 'BellasArtes.webp',
  'coord-desarrollo-profesional': 'DesarrolloProfesional.webp',
  'coord-empresarial': 'transformacionEmpresarial.webp',
  'coord-especializaciones': 'especializaciones.webp',
  'coord-fabrica-contenidos': 'fabrica.webp',
  'coord-homologaciones': 'Homologaciones.webp',
  'coord-ingenierias': 'ingenierias.webp',
  'coord-negocios': 'negocios.webp',
  'coord-operaciones-academicas': 'operacionAcademica.webp',
  'coord-proyeccion-social': 'ProyeccionSocial.webp',
  'coord-saber-pro': 'SaberPro.webp',
  'coord-servicios': 'servicio.webp',
  'coord-transversales': 'Transversales.webp',
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
