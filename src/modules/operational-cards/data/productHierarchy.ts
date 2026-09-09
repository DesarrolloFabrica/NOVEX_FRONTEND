import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'

/**
 * ESTRUCTURA ORGANIZACIONAL DE PRODUCTO de la Dirección de Operaciones.
 *
 * Fuente: declaración explícita del usuario (fase R3.1). **No está derivada de
 * los datos ni inferida de nada**: la base de datos sigue siendo plana —la
 * tabla `coordinations` no tiene `parent_id` ni agrupación— y el único grafo
 * que existe allí es de propagación de impacto, no de subordinación.
 *
 * Por eso conviene nombrar las dos fuentes por separado y no confundirlas:
 *
 *   BACKEND_HIERARCHY_SOURCE = ABSENT
 *   PRODUCT_HIERARCHY_SOURCE = USER_CONFIRMED
 *
 * Esta tabla es un ESPEJO TEMPORAL de esa decisión, y su destino es el
 * backend: cuando `coordinations` tenga `parent_coordination_id` y el DTO
 * exponga `parentCode`, este fichero desaparece y la jerarquía llega por HTTP.
 * Mientras tanto vive aquí, declarada y comentada, para que nadie tenga que
 * adivinarla leyendo el layout.
 *
 * Es un ÁRBOL: cada subordinación tiene exactamente un padre y la profundidad
 * es 2 (nodo principal y una capa de hijas).
 */

export interface ProductNodeDeclaration {
  /**
   * Nombre de PRODUCTO. Puede diferir del `name` técnico de la fila, y en un
   * caso difiere: ver `coord-homologaciones`.
   */
  label: string
  /** Fila técnica que aporta estado y problemas a este nodo. */
  code: string
  /** Codes de las subordinaciones declaradas, en orden institucional. */
  children: readonly string[]
  /**
   * Code del que este nodo toma prestado el ARTE, cuando el suyo contradice al
   * nombre de producto.
   *
   * Solo cambia color, icono e isla. El `code` técnico de arriba sigue siendo
   * la fuente de estado, de problemas y de la selección: esto es una decisión
   * de presentación y no puede convertirse en una de datos.
   */
  artCode?: string
}

/**
 * Los NUEVE nodos principales, en el orden declarado por el usuario. Este orden
 * sustituye al `displayOrder` de la fila técnica en la mesa de producto: el
 * `displayOrder` de la base de datos no refleja el organigrama (por ejemplo
 * Bellas Artes es 3, por delante de su propio padre Operación Académica, que
 * es 8).
 */
export const PRODUCT_TOP_LEVEL: readonly ProductNodeDeclaration[] = [
  { label: 'Coordinación General de Operaciones', code: 'coord-general', children: [] },
  { label: 'B2B', code: 'coord-b2b', children: [] },
  {
    label: 'Desarrollo Profesional',
    code: 'coord-desarrollo-profesional',
    children: [],
  },
  { label: 'Especializaciones', code: 'coord-especializaciones', children: [] },
  {
    label: 'Operación Académica',
    code: 'coord-operaciones-academicas',
    children: [
      'coord-bellas-artes',
      'coord-empresarial',
      'coord-ingenierias',
      'coord-transversales',
      'coord-negocios',
    ],
  },
  { label: 'Proyección Social', code: 'coord-proyeccion-social', children: [] },
  { label: 'Saber Pro', code: 'coord-saber-pro', children: [] },
  {
    /**
     * DECISIÓN DE PRESENTACIÓN, no de datos.
     *
     * El nodo de producto se llama «Servicio» y se apoya en la fila técnica
     * `coord-homologaciones`, que es la que tiene la operación real detrás:
     * coordinadora asignada, problemas de severidad alta y cinco referencias
     * como área afectada. El renombrado del registro llegará después.
     *
     * NO se usa `coord-servicios`: es una fila creada por migración, sin
     * coordinadora, sin ninguna referencia cruzada y con cuatro situaciones
     * activas que siguen existiendo técnicamente y cuyo destino decide el
     * usuario. Aquí no se toca, no se oculta del sistema y no se fusiona.
     */
    label: 'Servicio',
    code: 'coord-homologaciones',
    children: [],
    /*
     * El arte de `coord-homologaciones` rotula «HOMOLOGACIONES» dentro del PNG,
     * y una carta que se llama «Servicio» mostrando ese rótulo se lee como un
     * error de identidad. Hasta que exista una CoordCard propia de Servicio,
     * este nodo usa los assets de `coord-servicios`, que existen, no los usa
     * nadie y sí corresponden al concepto. Como ese code no tiene cara
     * ilustrada, la carta cae sola a la presentación legacy —isla, icono y
     * nombre visible—, que es exactamente lo que se quiere aquí.
     */
    artCode: 'coord-servicios',
  },
  {
    /** Sin subordinaciones hoy; las tendrá. Se monta como mazo vacío para que
     *  el día que existan no haya que cambiar la mesa. */
    label: 'Fábrica de Contenidos',
    code: 'coord-fabrica-contenidos',
    children: [],
  },
]

/**
 * Filas técnicas que existen en la base de datos pero NO se pintan en la mesa
 * de producto. Se declaran explícitamente para que su ausencia sea una
 * decisión visible y no un olvido, y para que las pruebas puedan vigilarla.
 *
 * `coord-servicios` conserva 4 situaciones activas. La mesa visual y los
 * totales técnicos divergen a propósito mientras dure esta reconciliación.
 */
export const LEGACY_UNMAPPED_CODES: readonly string[] = ['coord-servicios']

/** Un nodo de la mesa de producto, ya resuelto contra las filas de LEVEL 0. */
export interface ProductTableNode {
  label: string
  /** Code del que se toma el arte, si el propio contradice al nombre. */
  artCode?: string
  /** Fila técnica del nodo: de aquí salen estado, problemas e identidad. */
  coordination: CoordinationOverview
  /** Filas técnicas de sus subordinaciones, en orden declarado. */
  children: readonly CoordinationOverview[]
}

export interface ProductTable {
  /** Los nodos principales, en orden de producto. */
  nodes: ProductTableNode[]
  /** Codes declarados que LEVEL 0 no trajo. Vacío en operación normal. */
  missingCodes: string[]
  /** Filas técnicas recibidas que no pinta ningún nodo. */
  unmapped: CoordinationOverview[]
}

/**
 * Proyecta las filas técnicas de LEVEL 0 sobre la estructura de producto.
 *
 * No inventa filas: un nodo declarado cuyo `code` no venga en la respuesta
 * simplemente no se pinta y se reporta en `missingCodes`. Una carta nunca debe
 * fabricarse, y menos la de una coordinación que el backend no reconoce.
 *
 * Las subordinaciones NO aparecen como nodos principales: son hijas de su
 * padre y solo existen visualmente dentro de su mazo.
 */
export function buildProductTable(
  coordinations: readonly CoordinationOverview[],
): ProductTable {
  const byCode = new Map(coordinations.map((row) => [row.code, row]))
  const consumed = new Set<string>()
  const nodes: ProductTableNode[] = []
  const missingCodes: string[] = []

  for (const declaration of PRODUCT_TOP_LEVEL) {
    const coordination = byCode.get(declaration.code)
    if (!coordination) {
      missingCodes.push(declaration.code)
      continue
    }
    consumed.add(declaration.code)

    const children: CoordinationOverview[] = []
    for (const childCode of declaration.children) {
      const child = byCode.get(childCode)
      if (!child) {
        missingCodes.push(childCode)
        continue
      }
      consumed.add(childCode)
      children.push(child)
    }

    nodes.push({
      label: declaration.label,
      artCode: declaration.artCode,
      coordination,
      children,
    })
  }

  return {
    nodes,
    missingCodes,
    unmapped: coordinations.filter((row) => !consumed.has(row.code)),
  }
}
