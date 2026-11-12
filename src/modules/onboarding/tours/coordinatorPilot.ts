import type { TourPredicate } from '../engine/tourPredicates'
import type { OnboardingTourStep, TourStepGate } from '../onboardingTourSteps'

/**
 * Piloto del recorrido del COORDINADOR. Es una definición independiente: no
 * sustituye ni modifica los pasos de los demás roles.
 *
 * Sigue la pantalla real del coordinador (`CoordinatorOperationalLayout`):
 *
 *   resumen ─ carta ─ estado y salud ─ situaciones ─ abrir una ─ expediente ─
 *   seguimiento ─ registrar ─ consultar ─ menú
 *
 * Todos los pasos viven en /centro-operacional. Ninguno ejecuta acciones de
 * negocio. Los que dependen de una situación abierta declaran `showWhen`: si el
 * usuario no abrió ninguna, el motor los salta sin avisos de elementos ausentes.
 */
const ROUTE = '/centro-operacional'

/** La lista de la pestaña activa (cualquiera de las tres), solo cuando tiene filas. */
const SITUATION_LIST = '[data-tour="situation-list"]'
const SITUATION_LIST_WITH_ROWS = `${SITUATION_LIST}:has(.situation-row)`

/** Expediente abierto en la columna derecha. */
const DETAIL_OPEN: TourPredicate = {
  type: 'present',
  selector: '[data-testid="action-panel"][data-mode="detail"]',
}

/** En reposo la columna derecha muestra las fichas «Registrar situación» y «Consultar». */
const ACTIONS_AT_REST: TourPredicate = {
  type: 'present',
  selector: '[data-testid="coordinator-actions"]',
}

/** Controles «Volver» reales del expediente, del historial y de las consultas. */
const PANEL_BACK_CONTROLS = [
  '[data-testid="detail-bar-back"]',
  '[data-testid="detail-back"]',
  '[data-testid="history-back"]',
  '[data-testid="admin-insight-back"]',
].join(', ')

/**
 * Pide volver a la columna derecha en reposo antes de explicar sus fichas.
 * Solo resalta el control «Volver»: nunca lo pulsa ni cambia la situación.
 */
function returnToActionsGate(purpose: string): TourStepGate {
  return {
    when: { type: 'not', predicate: ACTIONS_AT_REST },
    target: PANEL_BACK_CONTROLS,
    eyebrow: 'Volver',
    title: 'Regrese a la vista principal',
    description: `Para ver ${purpose}, cierre la vista abierta con «Volver». Cerrarla no cambia ningún dato.`,
    expectation: 'En cuanto se cierre, el recorrido continúa solo.',
    waitingLabel: 'Esperando que pulse «Volver»',
  }
}

export const COORDINATOR_PILOT_STEPS: OnboardingTourStep[] = [
  {
    id: 'bienvenida',
    route: ROUTE,
    target: '[data-tour="operational-shell"]',
    highlightTarget: false,
    placement: 'center',
    eyebrow: 'Recorrido · Coordinador',
    title: 'Bienvenido a su Centro Operacional',
    description:
      'En un par de minutos verá dónde leer el estado de su coordinación, cómo atender sus situaciones y dónde registrar novedades.',
    expectation: 'El recorrido no cambia ningún dato. Puede cerrarlo y retomarlo cuando quiera.',
  },
  {
    id: 'resumen',
    route: ROUTE,
    target: '[data-tour="coordinator-intro"]',
    eyebrow: 'Resumen',
    title: 'Lo primero que debe saber',
    description:
      'Esta franja dice qué hacer ahora y cuenta sus situaciones por resolver, las críticas y las de otras áreas que afectan la suya.',
    expectation: 'La frase de orientación cambia según el estado de su coordinación.',
  },
  {
    id: 'carta',
    route: ROUTE,
    // La carta misma: su contenedor se estira con la columna y resaltaría espacio vacío.
    target: '[data-tour="own-coordination"] [data-testid="coordination-card"]',
    eyebrow: 'Su coordinación',
    title: 'Su coordinación, en una carta',
    description:
      'Esta carta representa a su coordinación. Su ilustración y su color la identifican en todo NOVEX.',
    expectation: 'Siempre verá aquí la coordinación a la que pertenece.',
  },
  {
    id: 'estado',
    route: ROUTE,
    target: '[data-tour="own-facts"]',
    eyebrow: 'Estado y salud',
    title: 'Cómo está su área',
    description:
      'El estado (Estable, En alerta o Crítico) resume sus situaciones activas. La salud, de 0 a 10, baja con la cantidad y la gravedad de lo que la afecta.',
    expectation: 'Ambos se calculan solos: usted los mejora resolviendo situaciones.',
  },
  {
    id: 'situaciones',
    route: ROUTE,
    target: '[data-tour="situation-tabs"]',
    // Se resaltan las pestañas, pero el globo no tapa la lista que hay debajo.
    placementTarget: '[data-tour="coordination-problems"]',
    eyebrow: 'Situaciones',
    title: 'Tres bandejas de trabajo',
    description:
      '«Por resolver» son las de su coordinación. «Afectan mi área», las de otras áreas que la frenan. «Mis reportes», las que usted registró.',
    expectation: 'El número de cada pestaña indica cuántas hay. Arriba puede filtrar por fecha.',
  },
  {
    id: 'abrir',
    route: ROUTE,
    target: SITUATION_LIST,
    kind: 'action',
    advanceWhen: DETAIL_OPEN,
    // Solo si hay algo que abrir y aún no hay un expediente abierto.
    showWhen: {
      type: 'all',
      predicates: [
        { type: 'present', selector: SITUATION_LIST_WITH_ROWS },
        { type: 'not', predicate: DETAIL_OPEN },
      ],
    },
    optional: true,
    skipLabel: 'Saltar paso',
    eyebrow: 'Pruébelo',
    title: 'Abra una situación',
    description:
      'Pulse cualquier fila de la lista. La etiqueta indica si es interna o para otra área, y a la derecha verá su gravedad y su estado.',
    expectation: 'Abrirla solo muestra su detalle; no cambia nada.',
    waitingLabel: 'Esperando que elija una fila',
  },
  {
    id: 'expediente',
    route: ROUTE,
    // El panel que lo muestra, no su contenido: el usuario se desplaza dentro de
    // él para leer y el foco no debe moverse ni encogerse con el scroll.
    target: '[data-testid="action-panel"][data-mode="detail"]',
    showWhen: DETAIL_OPEN,
    eyebrow: 'Detalle',
    title: 'Todo sobre la situación',
    description:
      'El detalle reúne la descripción, la gravedad, las coordinaciones involucradas y la cronología de lo ocurrido.',
    expectation: 'Desplácese dentro del panel para leerlo completo.',
  },
  {
    id: 'seguimiento',
    route: ROUTE,
    target: '[data-tour="problem-actions"]',
    showWhen: { type: 'present', selector: '[data-tour="problem-actions"]' },
    requires: ['SITUATIONS_UPDATE'],
    eyebrow: 'Seguimiento',
    title: 'Avance y cierre',
    description:
      'Si su coordinación es la responsable, desde aquí pasa la situación a «En atención» y la cierra registrando lo aprendido.',
    expectation: 'Consultar estas acciones no cambia la situación.',
  },
  {
    id: 'registrar',
    route: ROUTE,
    target: '[data-testid="coordinator-actions"] [data-tour="action-panel"]',
    eyebrow: 'Registrar',
    title: 'Registre una novedad',
    description:
      '«Registrar situación» abre un formulario corto. Elija si la situación es de su coordinación o si depende de otra área.',
    expectation: 'Su coordinación ya viene seleccionada. Durante el recorrido no se envía nada.',
    gate: returnToActionsGate('dónde registrar situaciones'),
  },
  {
    id: 'consultar',
    route: ROUTE,
    target: '[data-tour="consult"]',
    eyebrow: 'Consultar',
    title: 'Historial y gestión',
    description:
      'En «Historial» están los cierres por período con su aprendizaje; en «Gestión», las situaciones activas por prioridad y plazo.',
    expectation: 'Cada consulta se abre en esta columna y se cierra con «Volver».',
    gate: returnToActionsGate('las consultas disponibles'),
  },
  {
    id: 'menu',
    route: ROUTE,
    target: '[data-tour="center-menu"]',
    eyebrow: 'Menú',
    title: 'Listo para trabajar',
    description:
      'Desde el menú cambia de vista, abre la ayuda y puede repetir este recorrido cuando lo necesite.',
    expectation: 'Pulse «Finalizar» para cerrar el recorrido.',
  },
]

export const COORDINATOR_PILOT_STEP_COUNT = COORDINATOR_PILOT_STEPS.length
