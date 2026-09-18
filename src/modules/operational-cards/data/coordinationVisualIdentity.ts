import {
  getCoordination,
  getCoordinationCatalog,
  resolveCoordinationId,
  resolveIslandAssetPath,
  resolveIslandColor,
  type CoordinationId,
} from '@/modules/impact-network/data/coordination-islands.config'
import { getCoordinationIconAsset } from '@/modules/impact-network/data/coordination-icons.config'

/**
 * Identidad visual a partir de una fila de LEVEL 0, sin catálogo runtime.
 *
 * Es la vía que usa la experiencia de cartas: la respuesta del endpoint ya es
 * la autoridad sobre qué coordinaciones existen y cómo se llaman, así que no
 * hace falta hidratar ni consultar el estado global compartido con la Red de
 * impacto. Función pura: mismas entradas, mismas salidas, sin efectos.
 *
 * El arte sale de los tres helpers públicos de branding, todos capaces de
 * resolver a partir del code:
 * - `getCoordinationIconAsset(code)`;
 * - `resolveIslandAssetPath(imageAsset, coordinationId)`, al que se le pasa el
 *   code en ambos argumentos: el segundo es la autoridad canónica y el primero
 *   solo se usaría como valor legado si el code no tuviera arte asignado;
 * - `resolveIslandColor(code, colorDelBackend)`, que prioriza el color
 *   canónico del frontend y cae al del backend si no hubiera.
 *
 * No se importa ningún map privado ni se copia ninguna ruta de asset.
 */
export function resolveCoordinationVisualIdentity(
  row: CoordinationVisualIdentitySource,
): CoordinationVisualIdentity {
  return {
    code: row.code,
    uuid: row.id,
    name: row.name,
    shortName: row.shortName,
    displayOrder: row.displayOrder,
    color: resolveIslandColor(row.code, row.color),
    iconAsset: getCoordinationIconAsset(row.code),
    islandAsset: resolveIslandAssetPath(row.code, row.code),
  }
}

/**
 * Identidad visual con el ARTE de otro code.
 *
 * Existe para un caso concreto y declarado: el nodo de producto «Servicio» se
 * apoya en la fila técnica `coord-homologaciones`, cuyo arte ilustrado lleva
 * «HOMOLOGACIONES» rotulado. Mostrar esa cara bajo la etiqueta «Servicio» se
 * lee como un error de identidad, así que el nodo toma prestados los assets de
 * `coord-servicios` —cara `servicio.png`, color, icono e isla— que sí
 * corresponden al concepto.
 *
 * Lo que NO cambia es el `code`: sigue siendo el técnico, porque es la clave de
 * selección, del `data-code`, de la petición de LEVEL 1 y del estado. Aquí solo
 * se sustituyen color, icono e isla. Separar las dos cosas es justamente lo que
 * evita que una decisión de presentación se convierta en una de datos.
 */
export function withArtOf(
  identity: CoordinationVisualIdentity,
  artCode: CoordinationId,
): CoordinationVisualIdentity {
  return {
    ...identity,
    color: resolveIslandColor(artCode, identity.color),
    iconAsset: getCoordinationIconAsset(artCode),
    islandAsset: resolveIslandAssetPath(artCode, artCode),
  }
}

/** Forma mínima que necesita el compositor: la fila de `CoordinationOverview`. */
export interface CoordinationVisualIdentitySource {
  /** UUID de la coordinación; se expone como `uuid` en la identidad. */
  id: string
  code: CoordinationId
  name: string
  shortName: string
  color: string
  displayOrder: number
}

/**
 * Compositor sobre el CATÁLOGO RUNTIME legacy.
 *
 * NO es una nueva fuente de verdad: no declara nombres, colores ni rutas.
 * Reúne, para una sola coordinación, las piezas que ya existen repartidas en
 * tres sitios:
 *
 * - catálogo runtime (`getCoordination`), hidratado desde el backend;
 * - arte y color canónicos (`coordination-islands.config`);
 * - icono institucional (`coordination-icons.config`).
 *
 * El número de coordinaciones nunca se codifica aquí: sale del catálogo.
 */

export interface CoordinationVisualIdentity {
  /**
   * Código institucional (`coord-general`). Es la clave de unión con
   * `CoordinationOverview.code` y con el query param `?coordination=`.
   *
   * El módulo nuevo no expone `id`: en el catálogo legacy `definition.id`
   * contiene el code, mientras que en los DTO HTTP `id` es el UUID. Esa
   * ambigüedad se detiene aquí y no se propaga.
   */
  code: CoordinationId
  uuid: string
  name: string
  shortName: string
  displayOrder: number
  /** Color de identidad. Comunica pertenencia, nunca estado operacional. */
  color: string
  iconAsset: string
  islandAsset: string
}

/**
 * Estrategia explícita ante lo que no se puede resolver, en dos niveles:
 *
 * 1. Coordinación desconocida -> `null`. Se resuelve con
 *    `resolveCoordinationId`, que devuelve null para lo que no está en el
 *    catálogo, en lugar de `getCoordination`, que fabrica una definición
 *    sintética. Una carta nunca debe inventarse.
 *
 * 2. Asset ausente -> fallback canónico documentado, no cadena vacía. Los
 *    módulos de arte ya garantizan un asset por diseño
 *    (`IconoCoordGeneral.jpg` para el icono, `CoordGeneral.webp` para la
 *    isla), y esta fase no cambia esa decisión. Por tanto una identidad
 *    resuelta nunca tiene assets vacíos.
 */
export function getCoordinationVisualIdentity(
  candidate: string | null | undefined,
): CoordinationVisualIdentity | null {
  const code = resolveCoordinationId(candidate)
  if (!code) return null

  const definition = getCoordination(code)

  return {
    // `definition.id` es el campo legacy que contiene el code institucional.
    code: definition.id,
    uuid: definition.uuid,
    name: definition.name,
    shortName: definition.shortName,
    displayOrder: definition.displayOrder,
    color: resolveIslandColor(code, definition.color),
    iconAsset: getCoordinationIconAsset(code),
    islandAsset: resolveIslandAssetPath(definition.islandAsset, code),
  }
}

/**
 * Identidad de todas las coordinaciones activas del catálogo, ordenadas por
 * `displayOrder`. Es el orden estable que da memoria espacial a la baraja.
 */
export function getCoordinationVisualIdentities(): readonly CoordinationVisualIdentity[] {
  return getCoordinationCatalog()
    .filter((definition) => definition.isActive)
    .map((definition) => getCoordinationVisualIdentity(definition.id))
    .filter(
      (identity): identity is CoordinationVisualIdentity => identity !== null,
    )
    .sort((left, right) => left.displayOrder - right.displayOrder)
}
